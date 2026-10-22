import type { Workout } from "./model";

export function guidePosition(w: Workout) {
  const selected = w.entries.find((e) => e.id === w.guide?.entryId);
  const entry =
    selected && (w.restUntil !== null || selected.sets.some((s) => !s.done))
      ? selected
      : w.entries.find((e) => e.sets.some((s) => !s.done));
  const stage =
    w.guide && entry?.id === w.guide.entryId ? w.guide.stage : "setup";
  return { entry, set: entry?.sets.find((s) => !s.done), stage };
}
/** Only advances after the user ends rest; timestamps survive backgrounding. */
export function continueGuide(w: Workout) {
  const current = w.entries.find((e) => e.id === w.guide?.entryId);
  const next = current?.sets.some((s) => !s.done)
    ? current
    : w.entries.find((e) => e.sets.some((s) => !s.done));
  w.restUntil = null;
  if (next)
    w.guide = {
      entryId: next.id,
      stage: next.id === current?.id ? "train" : "setup",
    };
  else w.guide = undefined;
}
export function completeGuidedSet(
  w: Workout,
  entryId: string,
  setId: string,
  now: number,
) {
  if (w.pausedAt !== null || w.restUntil !== null) return;
  const entry = w.entries.find((e) => e.id === entryId);
  const set = entry?.sets.find((s) => s.id === setId);
  if (!entry || !set || set.done || set.reps < 1) return;
  set.done = true;
  // Carry today's chosen load into the remaining sets, without changing history.
  for (const upcoming of entry.sets) {
    if (!upcoming.done && upcoming.kind === set.kind) upcoming.kg = set.kg;
  }
  w.guide = { entryId, stage: "train", lastSetId: setId };
  w.restUntil = now + entry.rest * 1000;
}
export function undoGuidedSet(w: Workout) {
  const entry = w.entries.find((e) => e.id === w.guide?.entryId);
  const set = entry?.sets.find((s) => s.id === w.guide?.lastSetId);
  if (!entry || !set || w.pausedAt !== null) return;
  set.done = false;
  w.restUntil = null;
  w.guide = { entryId: entry.id, stage: "train" };
}
