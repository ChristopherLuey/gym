import Dexie, { type Table } from "dexie";
import { stateSchema, type State } from "./model";
import { seed } from "./seed";
import { updateTrainingPlan } from "./training-update";
export class GymDB extends Dexie {
  state!: Table<{ id: string; value: State; revision: number }, string>;
  recovery!: Table<{ id: string; value: State; created: number }, string>;
  constructor(name = "gym-local") {
    super(name);
    this.version(1).stores({ state: "id", recovery: "id,created" });
    this.version(2)
      .stores({ state: "id", recovery: "id,created" })
      .upgrade((tx) =>
        tx
          .table("state")
          .toCollection()
          .modify((row) => {
            if (row.value.schema === 1) {
              row.value.schema = 2;
              row.value.measurements ??= [];
              row.value.meals ??= [];
            }
            row.revision = row.revision ?? 0;
          }),
      );
    this.version(3)
      .stores({ state: "id", recovery: "id,created" })
      .upgrade(async (tx) => {
        const rows = await tx.table("state").toArray();
        for (const row of rows) {
          // Preserve the complete pre-update data before revising future plans.
          await tx
            .table("recovery")
            .put({
              id: crypto.randomUUID(),
              value: row.value,
              created: Date.now(),
            });
          await tx
            .table("state")
            .put({
              ...row,
              value: migrate(row.value),
              revision: row.revision ?? 0,
            });
        }
      });
  }
}
export function migrate(input: unknown): State {
  const v = structuredClone(input) as Record<string, unknown>;
  if (v?.schema === 1) {
    v.schema = 2;
    v.measurements ??= [];
    v.meals ??= [];
  }
  if (v?.schema === 2) {
    return validateState(
      updateTrainingPlan(validateState({ ...v, schema: 3 })),
    );
  }
  return validateState(v);
}
export function validateState(input: unknown): State {
  const s = stateSchema.parse(input);
  for (const items of [
    s.exercises,
    s.machines,
    s.programs,
    s.history,
    s.weights,
    s.nutrition,
    s.meals,
    s.measurements,
  ])
    if (new Set(items.map((i) => i.id)).size !== items.length)
      throw new Error("Duplicate record IDs in backup.");
  const ex = new Set(s.exercises.map((e) => e.id)),
    machines = new Set(s.machines.map((m) => m.id));
  const unique = (ids: string[]) => new Set(ids).size === ids.length;
  for (const p of s.programs) {
    if (
      !unique(p.items.map((i) => i.id)) ||
      new Set(p.days).size !== p.days.length
    )
      throw new Error("Duplicate program items or training days.");
  }
  for (const p of s.programs)
    for (const i of p.items)
      if (!ex.has(i.exerciseId) || (i.machineId && !machines.has(i.machineId)))
        throw new Error("A program references missing equipment or exercises.");
  for (const w of [...s.history, ...(s.active ? [s.active] : [])]) {
    if (
      !unique(w.entries.map((e) => e.id)) ||
      w.started < 0 ||
      (w.finished !== null && w.finished < w.started) ||
      (w.pausedAt !== null && w.pausedAt < w.started)
    )
      throw new Error("Invalid workout timeline or duplicate exercises.");
    for (const e of w.entries)
      if (!ex.has(e.exerciseId) || (e.machineId && !machines.has(e.machineId)))
        throw new Error("A workout references missing equipment or exercises.");
      else if (!unique(e.sets.map((set) => set.id)) || e.max < e.min)
        throw new Error("Invalid exercise prescription or duplicate sets.");
  }
  if (s.active && s.history.some((w) => w.id === s.active!.id))
    throw new Error("The active session is duplicated in history.");
  for (const entry of [...s.weights, ...s.nutrition, ...s.measurements]) {
    const parsed = new Date(`${entry.date}T12:00:00Z`);
    if (
      !Number.isFinite(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== entry.date
    )
      throw new Error("Invalid calendar date.");
  }
  if (s.history.some((w) => w.finished === null))
    throw new Error("Completed history contains unfinished workouts.");
  if (s.active?.finished !== null && s.active)
    throw new Error("Active workout is already finished.");
  return s;
}
export const encodeBackup = (s: State) =>
  JSON.stringify(
    {
      app: "GYM",
      version: 3,
      exportedAt: new Date().toISOString(),
      data: validateState(s),
    },
    null,
    2,
  );
export function decodeBackup(raw: string): State {
  if (raw.length > 30_000_000) throw new Error("Backup exceeds 30 MB.");
  const v = JSON.parse(raw);
  if (v.app !== "GYM" || ![1, 2, 3].includes(v.version))
    throw new Error("This is not a supported GYM backup.");
  return migrate(v.data);
}
export async function restore(db: GymDB, s: State) {
  s = migrate(s);
  await db.transaction("rw", db.state, db.recovery, async () => {
    const before = await db.state.get("main");
    if (before?.value.active)
      throw new Error(
        "Finish or discard the active workout before restoring a backup.",
      );
    if (before)
      await db.recovery.put({
        id: crypto.randomUUID(),
        value: before.value,
        created: Date.now(),
      });
    await db.state.put({
      id: "main",
      value: s,
      revision: (before?.revision ?? 0) + 1,
    });
  });
}
export const db = new GymDB();
let current: State = seed();
let loaded = false;
let error = "";
let pendingSaves = 0;
const listeners = new Set<() => void>();
let snapshot = { state: current, loaded, error, saving: false };
const channel =
  typeof BroadcastChannel !== "undefined"
    ? new BroadcastChannel("gym-changes")
    : null;
function emit() {
  snapshot = { state: current, loaded, error, saving: pendingSaves > 0 };
  listeners.forEach((f) => f());
}
export const subscribe = (f: () => void) => {
  listeners.add(f);
  return () => {
    listeners.delete(f);
  };
};
export const getSnapshot = () => snapshot;
export async function load() {
  try {
    // Initialization is transactional so two new tabs cannot overwrite one another.
    await db.transaction("rw", db.state, async () => {
      const row = await db.state.get("main");
      current = row ? migrate(row.value) : seed();
      if (!row || row.value.schema !== current.schema)
        await db.state.put({
          id: "main",
          value: current,
          revision: row ? row.revision + 1 : 0,
        });
    });
    loaded = true;
    error = "";
    emit();
  } catch (e) {
    error =
      "Storage could not be opened. Your existing data has not been replaced. " +
      String(e);
    loaded = true;
    emit();
  }
}
let queue = Promise.resolve();
export function change(fn: (s: State) => void): Promise<void> {
  pendingSaves++;
  emit();
  const task = queue.then(async () => {
    try {
      await db.transaction("rw", db.state, async () => {
        const row = await db.state.get("main");
        if (!row)
          throw new Error(
            "Storage is unavailable. Export your data before reloading.",
          );
        const next = migrate(row.value);
        fn(next);
        validateState(next);
        await db.state.put({
          id: "main",
          value: next,
          revision: row.revision + 1,
        });
        current = next;
      });
      error = "";
      emit();
      channel?.postMessage("changed");
    } catch (e) {
      error =
        "Could not save this change. Please retry or export a backup. " +
        (e instanceof Error ? e.message : String(e));
      emit();
      throw e;
    } finally {
      pendingSaves--;
      emit();
    }
  });
  queue = task.catch(() => {});
  return task;
}
export async function importState(s: State) {
  await queue;
  await restore(db, s);
  await load();
  channel?.postMessage("changed");
}
if (channel)
  channel.onmessage = () => {
    void queue.then(load);
  };
