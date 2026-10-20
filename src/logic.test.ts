import { describe, it, expect } from "vitest";
import { seed } from "./seed";
import {
  startWorkout,
  progression,
  volume,
  machineStats,
  duration,
  records,
  previous,
  plannedCompletion,
  weekStart,
  trainingFrequency,
} from "./logic";
import { toKg, fromKg } from "./model";
function completed() {
  const s = seed();
  s.profile.intro = false;
  const w = startWorkout(s, s.programs[0]);
  const e = w.entries[0];
  e.sets.forEach((set) =>
    Object.assign(set, { kg: 30, reps: 12, rir: 2, done: true }),
  );
  w.finished = Date.now();
  return { s, w, e };
}
describe("double progression", () => {
  it("uses current fatigue and the current prescription before offering an increase", () => {
    const { e } = completed();
    expect(progression(e, 2.5, { fatigue: "high" }).increase).toBe(false);
    expect(progression(e, 2.5, { max: 15 }).increase).toBe(false);
    expect(progression(e, 2.5, { targetSets: 4 }).increase).toBe(false);
  });
  it("increases only when every prescribed working set reaches the top with reserve", () => {
    const { e } = completed();
    expect(progression(e, 2.5)).toMatchObject({ kg: 32.5, increase: true });
  });
  it("does not promote incomplete sessions, fatigue, or failure", () => {
    const { e } = completed();
    e.sets[0].done = false;
    expect(progression(e).increase).toBe(false);
    e.sets[0].done = true;
    e.fatigue = "high";
    expect(progression(e).increase).toBe(false);
    e.fatigue = "normal";
    e.sets[0].rir = 0;
    expect(progression(e).increase).toBe(false);
  });
  it("does not promote mixed loads or below-range sets", () => {
    const { e } = completed();
    e.sets[0].kg = 20;
    expect(progression(e).increase).toBe(false);
    e.sets[0].kg = 30;
    e.sets[0].reps = 10;
    expect(progression(e).increase).toBe(false);
  });
  it("ignores warmups and explains no-history state", () => {
    expect(progression(undefined).kg).toBe(null);
    const { e } = completed();
    e.sets[0].kind = "warmup";
    expect(progression(e).increase).toBe(false);
  });
});
describe("workout calculations and machine isolation", () => {
  it("does not count repeating one day as completing other scheduled days", () => {
    const { s, w } = completed();
    const monday = weekStart();
    monday.setHours(12);
    w.started = monday.getTime() - 60000;
    w.finished = monday.getTime();
    s.history = [
      w,
      { ...structuredClone(w), id: "extra", finished: w.finished + 60000 },
    ];
    expect(plannedCompletion(s)).toEqual({ planned: 3, matched: 1, extra: 1 });
    expect(trainingFrequency(s.history)[0].value).toBe(2);
  });
  it("excludes unfinished and warmup sets from working volume", () => {
    const { w, e } = completed();
    e.sets[0].kind = "warmup";
    e.sets[1].done = false;
    expect(volume(w)).toBe(360);
  });
  it("counts machine sessions once, even for several exercises", () => {
    const { s, w, e } = completed();
    w.entries.push({ ...structuredClone(e), id: "other", exerciseId: "row" });
    s.history.push(w);
    expect(machineStats(s, "m-press")).toMatchObject({
      sessions: 1,
      sets: 6,
      reps: 72,
      volume: 2160,
    });
  });
  it("does not transfer history or records to another machine", () => {
    const { s, w, e } = completed();
    s.history.push(w);
    expect(previous(s, e.exerciseId, "m-cable")).toBeUndefined();
    expect(records(s, w)[0].first).toBe(true);
    const w2 = structuredClone(w);
    w2.id = "next";
    w2.finished = w.finished! + 1000;
    w2.entries[0].sets.forEach((set) => (set.kg = 32.5));
    expect(records(s, w2)[0]).toMatchObject({ first: false, kg: 32.5 });
  });
  it("prefills the matching machine setup and keeps first sessions reduced", () => {
    const { s, w, e } = completed();
    e.setup.seat = "4";
    s.history.push(w);
    s.profile.intro = true;
    const next = startWorkout(s, s.programs[0]);
    expect(next.entries[0].sets.length).toBe(2);
    expect(next.entries[0].sets[0].kg).toBe(30);
    expect(next.entries[0].setup.seat).toBe("4");
  });
  it("excludes paused duration and preserves canonical units", () => {
    const { w } = completed();
    w.started = 1000;
    w.finished = null;
    w.pausedAt = 11000;
    w.pausedMs = 3000;
    expect(duration(w, 99000)).toBe(7000);
    expect(fromKg(toKg(135, "lb"), "lb")).toBe(135);
  });
});
