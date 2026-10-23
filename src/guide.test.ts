import { describe, it, expect } from "vitest";
import { seed } from "./seed";
import { startWorkout } from "./logic";
import {
  completeGuidedSet,
  continueGuide,
  guidePosition,
  undoGuidedSet,
} from "./guide";
import { decodeBackup, encodeBackup } from "./db";

const workout = () => {
  const s = seed();
  return startWorkout(s, s.programs[0]);
};
describe("guided workout", () => {
  it("resumes an older setup-stage backup directly at the saved set without changing its data", () => {
    const w = workout();
    const e = w.entries[1];
    e.setup.seat = "4";
    e.sets[0].done = true;
    e.sets[1].kg = 20;
    w.guide = { entryId: e.id, stage: "setup" };
    const before = structuredClone(w);
    expect(guidePosition(w)).toMatchObject({
      stage: "train",
      entry: { id: e.id },
      set: { id: e.sets[1].id, kg: 20 },
    });
    expect(w).toEqual(before);
  });
  it("opens existing workouts without guide data at their first unfinished exercise", () => {
    const w = workout();
    w.entries[0].sets.forEach((s) => (s.done = true));
    expect(guidePosition(w).entry?.id).toBe(w.entries[1].id);
    expect(guidePosition(w).stage).toBe("train");
  });
  it("completes only the selected set and carries the chosen load forward", () => {
    const w = workout(),
      e = w.entries[0];
    e.sets[0].kg = 25;
    completeGuidedSet(w, e.id, e.sets[0].id, 10000);
    expect(e.sets[0].done).toBe(true);
    expect(e.sets[1]).toMatchObject({ done: false, kg: 25 });
    expect(w.entries[1].sets[0]).toMatchObject({ done: false, kg: 0 });
    expect(w.restUntil).toBe(10000 + e.rest * 1000);
    completeGuidedSet(w, e.id, e.sets[1].id, 11000);
    expect(e.sets[1].done).toBe(false);
  });
  it("returns to the next set, then the next machine, only after rest is ended", () => {
    const w = workout(),
      e = w.entries[0];
    completeGuidedSet(w, e.id, e.sets[0].id, 1000);
    continueGuide(w);
    expect(guidePosition(w)).toMatchObject({
      stage: "train",
      set: { id: e.sets[1].id },
    });
    completeGuidedSet(w, e.id, e.sets[1].id, 2000);
    expect(guidePosition(w).entry?.id).toBe(e.id);
    continueGuide(w);
    expect(guidePosition(w)).toMatchObject({
      stage: "train",
      entry: { id: w.entries[1].id },
    });
  });
  it("can undo a mistaken completion without changing earlier sets", () => {
    const w = workout(),
      e = w.entries[0];
    e.sets[0].done = true;
    completeGuidedSet(w, e.id, e.sets[1].id, 1000);
    undoGuidedSet(w);
    expect(e.sets.map((s) => s.done)).toEqual([true, false]);
    expect(w.restUntil).toBeNull();
  });
  it("does not log while paused or with zero reps, or reopen completed work at the end", () => {
    const w = workout(),
      e = w.entries[0];
    w.pausedAt = 1000;
    completeGuidedSet(w, e.id, e.sets[0].id, 2000);
    expect(e.sets[0].done).toBe(false);
    w.pausedAt = null;
    e.sets[0].reps = 0;
    completeGuidedSet(w, e.id, e.sets[0].id, 3000);
    expect(e.sets[0].done).toBe(false);
    w.entries.forEach((e) => e.sets.forEach((s) => (s.done = true)));
    continueGuide(w);
    expect(guidePosition(w).entry).toBeUndefined();
  });
  it("preserves the guide position, rest deadline and machine visual through backups", () => {
    const s = seed();
    s.active = startWorkout(s, s.programs[0]);
    const e = s.active.entries[0];
    s.machines[0].visual = "press";
    completeGuidedSet(s.active, e.id, e.sets[0].id, Date.now());
    const restored = decodeBackup(encodeBackup(s));
    expect(restored.active?.guide).toEqual(s.active.guide);
    expect(restored.active?.restUntil).toBe(s.active.restUntil);
    expect(restored.machines[0].visual).toBe("press");
  });
});
