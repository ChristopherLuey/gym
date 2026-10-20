import { afterEach, describe, it, expect } from "vitest";
import {
  GymDB,
  encodeBackup,
  decodeBackup,
  restore,
  migrate,
  validateState,
} from "./db";
import { seed } from "./seed";
import { startWorkout } from "./logic";
const databases: GymDB[] = [];
function database() {
  const db = new GymDB(`test-${crypto.randomUUID()}`);
  databases.push(db);
  return db;
}
afterEach(async () => {
  for (const db of databases.splice(0)) await db.delete();
});
describe("persistence and recovery", () => {
  it("prevents an import from replacing an active workout started in another tab", async () => {
    const db = database(),
      s = seed();
    s.active = startWorkout(s, s.programs[0]);
    await db.state.put({ id: "main", value: s, revision: 1 });
    await expect(restore(db, seed())).rejects.toThrow("active workout");
    expect((await db.state.get("main"))?.value.active?.id).toBe(s.active.id);
  });
  it("round-trips active sessions, machine setups, and all tables", () => {
    const s = seed();
    s.active = startWorkout(s, s.programs[0]);
    s.active.entries[0].setup.seat = "7";
    s.active.entries[0].sets[0].done = true;
    expect(decodeBackup(encodeBackup(s))).toEqual(s);
  });
  it("survives closing and reopening IndexedDB", async () => {
    const db = database(),
      s = seed();
    s.active = startWorkout(s, s.programs[0]);
    await db.state.put({ id: "main", value: s, revision: 0 });
    db.close();
    await db.open();
    expect((await db.state.get("main"))?.value).toEqual(s);
  });
  it("preserves a recovery copy and restores transactionally", async () => {
    const db = database(),
      original = seed();
    await db.state.put({ id: "main", value: original, revision: 1 });
    const imported = seed();
    imported.profile.name = "Restored";
    await restore(db, imported);
    expect((await db.state.get("main"))?.value.profile.name).toBe("Restored");
    expect((await db.recovery.toArray())[0].value).toEqual(original);
  });
  it("rejects malformed data before replacing existing state", async () => {
    const db = database(),
      s = seed();
    await db.state.put({ id: "main", value: s, revision: 0 });
    expect(() => decodeBackup("{broken")).toThrow();
    expect(() =>
      decodeBackup('{"app":"GYM","version":99,"data":{}}'),
    ).toThrow();
    const bad = structuredClone(s);
    bad.programs[0].items[0].machineId = "missing";
    await expect(restore(db, bad)).rejects.toThrow();
    expect((await db.state.get("main"))?.value).toEqual(s);
    expect(await db.recovery.count()).toBe(0);
  });
  it("rejects duplicate records and invalid numeric values", () => {
    const s = seed();
    s.machines.push(s.machines[0]);
    expect(() => validateState(s)).toThrow();
    const bad = seed();
    bad.machines[0].incrementKg = NaN;
    expect(() => validateState(bad)).toThrow();
  });
  it("rejects invalid dates, duplicate sets, and remote photo URLs", () => {
    const date = seed();
    date.weights.push({ id: "bad-date", date: "2026-02-31", kg: 60 });
    expect(() => validateState(date)).toThrow();
    const duplicate = seed();
    duplicate.active = startWorkout(duplicate, duplicate.programs[0]);
    duplicate.active.entries[0].sets.push(duplicate.active.entries[0].sets[0]);
    expect(() => validateState(duplicate)).toThrow();
    const remote = seed();
    remote.machines[0].photo = "https://example.com/tracker.jpg";
    expect(() => validateState(remote)).toThrow();
  });
  it("migrates schema 1 without discarding user records", () => {
    const s = seed();
    s.profile.name = "Existing profile";
    const v = { ...s, schema: 1, measurements: undefined, meals: undefined };
    const result = migrate(v);
    expect(result.schema).toBe(2);
    expect(result.profile.name).toBe("Existing profile");
    expect(result.measurements).toEqual([]);
  });
  it("retains referential integrity when equipment is archived", () => {
    const s = seed();
    s.machines[0].archived = true;
    expect(validateState(s)).toBeTruthy();
  });
});
