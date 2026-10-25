import Dexie from "dexie";
import { describe, expect, it } from "vitest";
import { seed } from "./seed";
import { GymDB, migrate, decodeBackup, encodeBackup, restore } from "./db";
import { newEntry, previous, startWorkout, repeatProgram } from "./logic";
import { visualKind } from "./MachineVisual";

function legacy() {
  const s = seed();
  const oldExercises = new Set([
    "press",
    "pulldown",
    "row",
    "legpress",
    "legcurl",
    "lateral",
    "curl",
    "pushdown",
    "dbpress",
    "goblet",
    "dbrow",
  ]);
  s.exercises = s.exercises
    .filter((e) => oldExercises.has(e.id))
    .map(({ archived: _, ...e }) => e);
  s.machines = s.machines.filter(
    (m) => !["m-bench", "m-chestfly", "m-rearfly", "m-abs"].includes(m.id),
  );
  const cable = s.machines.find((m) => m.id === "m-cable")!;
  Object.assign(cable, {
    name: "Cable station",
    visual: "auto",
    muscles: ["Biceps", "Shoulders", "Triceps"],
  });
  s.programs[0].days = [2];
  s.programs.forEach((p) => {
    p.items = ["press", "curl", "lateral"].map((exerciseId, i) => ({
      id: p.id + "-" + i,
      exerciseId,
      machineId: exerciseId === "press" ? "m-press" : "m-cable",
      sets: 2,
      min: 8,
      max: 12,
      rest: 90,
    }));
  });
  s.profile.intro = true;
  s.active = startWorkout(s, s.programs[0]);
  s.active.entries[0].sets[0].done = true;
  s.active.entries[0].setup.seat = "My seat";
  const finished = structuredClone(s.active);
  finished.id = "completed-before-update";
  finished.finished = Date.now();
  finished.entries[1].sets.forEach((set) =>
    Object.assign(set, { done: true, kg: 25, reps: 12 }),
  );
  s.history.push(finished);
  return { ...s, schema: 2 };
}

describe("four-by-ten training revision", () => {
  it("updates a real version-two database once and backs up untouched history and active work", async () => {
    const name = `training-${crypto.randomUUID()}`;
    const old = new Dexie(name);
    const before = legacy();
    old.version(2).stores({ state: "id", recovery: "id,created" });
    await old.table("state").put({ id: "main", value: before, revision: 8 });
    old.close();
    const db = new GymDB(name);
    try {
      const row = await db.state.get("main");
      const after = row!.value;
      expect(after.schema).toBe(3);
      expect(row!.revision).toBe(8);
      expect(after.active).toEqual(before.active);
      expect(after.history).toEqual(before.history);
      expect(after.programs[0].days).toEqual([2]);
      expect(
        after.programs
          .flatMap((p) => p.items)
          .every((i) => i.sets === 4 && i.min === 10 && i.max === 10),
      ).toBe(true);
      expect((await db.recovery.toArray())[0].value).toEqual(before);
      expect(previous(after, "dbcurl", "m-dumbbell")).toBeUndefined();
      expect(previous(after, "curl", "m-cable")?.sets[0].kg).toBe(25);
      const repeated = startWorkout(after, repeatProgram(after.history[0]));
      expect(
        repeated.entries.every(
          (e) => e.sets.length === 4 && e.sets.every((set) => set.reps === 10),
        ),
      ).toBe(true);
      expect(repeated.entries[1]).toMatchObject({
        exerciseId: "dbcurl",
        machineId: "m-dumbbell",
      });
      expect(repeated.entries[1].sets[0].kg).toBe(0);
      expect(after.exercises.find((e) => e.id === "curl")?.archived).toBe(true);
      after.programs[0].items[0].sets = 5;
      expect(migrate(after).programs[0].items[0].sets).toBe(5);
      expect(decodeBackup(encodeBackup(after))).toEqual(after);
      db.close();
      await db.open();
      expect(await db.recovery.count()).toBe(1);
    } finally {
      await db.delete();
    }
  });

  it("imports old backups and recovery snapshots without losing custom equipment, days or records", async () => {
    const before = legacy();
    before.active = null;
    before.machines.find((m) => m.id === "m-cable")!.name = "Cable by windows";
    before.programs.push({
      ...structuredClone(before.programs[0]),
      id: "custom",
      name: "My session",
      days: [6],
    });
    const after = decodeBackup(
      JSON.stringify({ app: "GYM", version: 2, data: before }),
    );
    expect(after.machines.find((m) => m.id === "m-cable")?.name).toBe(
      "Cable by windows",
    );
    expect(after.programs.find((p) => p.id === "custom")).toMatchObject({
      name: "My session",
      days: [6],
      items: [
        { exerciseId: "press", sets: 4, min: 10, max: 10 },
        { exerciseId: "dbcurl", machineId: "m-dumbbell" },
        { exerciseId: "dblateral", machineId: "m-dumbbell" },
      ],
    });
    const db = new GymDB(`restore-${crypto.randomUUID()}`);
    try {
      await restore(db, before as unknown as ReturnType<typeof seed>);
      expect((await db.state.get("main"))?.value).toEqual(after);
    } finally {
      await db.delete();
    }
  });

  it("keeps compound lifts before accessories, cable work triceps-only, and every new set at ten", () => {
    const s = seed();
    expect(s.programs.map((p) => p.items.map((i) => i.exerciseId))).toEqual([
      ["bench", "pulldown", "legpress", "dblateral", "dbcurl", "abs"],
      ["row", "legpress", "chestfly", "legcurl", "pushdown", "abs"],
      [
        "bench",
        "pulldown",
        "legcurl",
        "rearfly",
        "dblateral",
        "dbcurl",
        "pushdown",
      ],
    ]);
    for (const p of s.programs)
      for (const item of p.items) {
        if (item.machineId === "m-cable")
          expect(item.exerciseId).toBe("pushdown");
        const entry = newEntry(s, item);
        expect(entry.sets).toHaveLength(4);
        expect(entry.sets.every((set) => set.reps === 10)).toBe(true);
      }
    for (const [id, kind] of [
      ["m-bench", "bench"],
      ["m-chestfly", "chestfly"],
      ["m-rearfly", "rearfly"],
      ["m-abs", "abs"],
      ["m-cable", "triceps"],
    ]) {
      expect(visualKind(s.machines.find((m) => m.id === id))).toBe(kind);
    }
  });
});
