import {
  type State,
  type Workout,
  type Entry,
  type Program,
  type Prescription,
  uid,
  emptySetup,
  localDay,
} from "./model";
export const working = (e: Entry) =>
  e.sets.filter((s) => s.done && s.kind === "work" && s.reps > 0);
export const volume = (w: Workout) =>
  w.entries.reduce(
    (n, e) => n + working(e).reduce((n, s) => n + s.kg * s.reps, 0),
    0,
  );
export const setCount = (w: Workout) =>
  w.entries.reduce((n, e) => n + working(e).length, 0);
export const duration = (w: Workout, now = Date.now()) =>
  Math.max(0, (w.finished ?? w.pausedAt ?? now) - w.started - w.pausedMs);
export function previous(
  state: State,
  exerciseId: string,
  machineId: string,
): Entry | undefined {
  return [...state.history]
    .sort((a, b) => (b.finished ?? 0) - (a.finished ?? 0))
    .flatMap((w) => w.entries)
    .find(
      (e) =>
        e.exerciseId === exerciseId &&
        e.machineId === machineId &&
        working(e).length > 0,
    );
}
export function progression(
  e: Entry | undefined,
  increment = 2.5,
  context: {
    fatigue?: Entry["fatigue"];
    max?: number;
    targetSets?: number;
  } = {},
): { kg: number | null; increase: boolean; reason: string } {
  if (!e)
    return {
      kg: null,
      increase: false,
      reason: "Start with a manageable load and learn the movement.",
    };
  const sets = working(e),
    last = sets.at(-1),
    base = last?.kg ?? null;
  if (e.fatigue === "high" || context.fatigue === "high")
    return {
      kg: base,
      increase: false,
      reason:
        "Fatigue is elevated. Keep the load manageable and reassess recovery.",
    };
  if (
    !sets.length ||
    sets.length < Math.max(e.targetSets, context.targetSets ?? e.targetSets)
  )
    return {
      kg: base,
      increase: false,
      reason:
        "Some working sets were incomplete. Build consistency before adding weight.",
    };
  if (sets.some((s) => s.rir !== null && s.rir < 1))
    return {
      kg: base,
      increase: false,
      reason:
        "The last session reached your limit. Keep this load and leave a little more in reserve.",
    };
  const upper = context.max ?? e.max;
  if (sets.every((s) => s.reps >= upper) && sets.every((s) => s.kg === base))
    return {
      kg: (base ?? 0) + increment,
      increase: true,
      reason: `Every working set reached ${upper} reps. A small increase is an option if you feel recovered.`,
    };
  return {
    kg: base,
    increase: false,
    reason: `Keep the load and work toward ${upper} controlled reps on each set.`,
  };
}
export function newEntry(state: State, p: Prescription): Entry {
  const ex = state.exercises.find((e) => e.id === p.exerciseId)!;
  const m = state.machines.find((m) => m.id === p.machineId && !m.archived);
  const prior = previous(state, ex.id, m?.id ?? "");
  const count = state.profile.intro ? Math.min(p.sets, 2) : p.sets;
  const suggestion = progression(prior, m?.incrementKg, {
    max: p.max,
    targetSets: count,
  });
  const last = prior ? working(prior) : [];
  return {
    id: uid(),
    exerciseId: ex.id,
    exerciseName: ex.name,
    muscles: ex.muscles,
    machineId: m?.id ?? "",
    machineName: m?.name ?? "Choose equipment",
    setup: structuredClone(prior?.setup ?? m?.setup ?? emptySetup()),
    sets: Array.from({ length: count }, (_, i) => ({
      id: uid(),
      kg: last[i]?.kg ?? last.at(-1)?.kg ?? 0,
      reps: last[i]?.reps ?? p.min,
      rir: null,
      kind: "work" as const,
      done: false,
    })),
    min: p.min,
    max: p.max,
    rest: p.rest,
    targetSets: count,
    decision: "pending",
    suggestionKg: suggestion.kg,
    fatigue: "normal",
    notes: "",
  };
}
export function startWorkout(state: State, p: Program): Workout {
  return {
    id: uid(),
    programId: p.id,
    name: p.name,
    started: Date.now(),
    finished: null,
    pausedAt: null,
    pausedMs: 0,
    restUntil: null,
    entries: p.items.map((i) => newEntry(state, i)),
    notes: "",
  };
}
export function machineStats(
  state: State,
  id: string,
  history = state.history,
) {
  const ws = history.filter((w) =>
    w.entries.some((e) => e.machineId === id && working(e).length),
  );
  const es = ws.flatMap((w) => w.entries.filter((e) => e.machineId === id));
  const sets = es.flatMap(working);
  return {
    sessions: ws.length,
    sets: sets.length,
    reps: sets.reduce((n, s) => n + s.reps, 0),
    volume: sets.reduce((n, s) => n + s.kg * s.reps, 0),
    last: ws.length
      ? Math.max(...ws.map((w) => w.finished ?? w.started))
      : null,
    exercises: [
      ...new Set(
        es.filter((e) => working(e).length).map((e) => e.exerciseName),
      ),
    ],
  };
}
export function records(state: State, w: Workout) {
  return w.entries.flatMap((e) => {
    const done = working(e);
    if (!done.length) return [];
    const historical = state.history
      .filter(
        (h) => h.id !== w.id && (h.finished ?? 0) < (w.finished ?? Date.now()),
      )
      .flatMap((h) =>
        h.entries.filter(
          (x) => x.exerciseId === e.exerciseId && x.machineId === e.machineId,
        ),
      )
      .flatMap(working);
    const max = Math.max(...done.map((s) => s.kg));
    return max > 0 &&
      (!historical.length || max > Math.max(...historical.map((s) => s.kg)))
      ? [
          {
            name: e.exerciseName,
            machine: e.machineName,
            machineId: e.machineId,
            exerciseId: e.exerciseId,
            kg: max,
            first: !historical.length,
          },
        ]
      : [];
  });
}
export function weekStart(now = new Date()) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}
export const weekHistory = (s: State) => {
  const start = weekStart();
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return s.history.filter(
    (w) =>
      (w.finished ?? 0) >= start.getTime() && (w.finished ?? 0) < end.getTime(),
  );
};
export function plannedCompletion(s: State) {
  const start = weekStart();
  const slots = s.programs
    .filter((p) => !p.archived)
    .flatMap((p) =>
      p.days.map((day) => {
        const date = new Date(start);
        date.setDate(date.getDate() + ((day + 6) % 7));
        return { programId: p.id, date: localDay(date) };
      }),
    );
  const matched = slots.filter((slot) =>
    s.history.some(
      (w) =>
        w.programId === slot.programId &&
        localDay(new Date(w.finished ?? w.started)) === slot.date,
    ),
  ).length;
  return {
    planned: slots.length,
    matched,
    extra: Math.max(0, weekHistory(s).length - matched),
  };
}
export function trainingFrequency(history: Workout[]) {
  const weeks = new Map<string, number>();
  for (const w of history) {
    const key = localDay(weekStart(new Date(w.finished ?? w.started)));
    weeks.set(key, (weeks.get(key) ?? 0) + 1);
  }
  return [...weeks]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, value }));
}
export function nextProgram(s: State, offset = 0) {
  for (let i = offset; i < offset + 8; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const programs = s.programs.filter(
      (p) => !p.archived && p.days.includes(d.getDay()),
    );
    const p = programs.find(
      (p) =>
        !s.history.some(
          (w) =>
            w.programId === p.id &&
            localDay(new Date(w.finished ?? w.started)) === localDay(d),
        ),
    );
    if (p) return { program: p, date: d };
  }
  const p = s.programs.find((p) => !p.archived);
  return p ? { program: p, date: new Date() } : null;
}
