import type { State } from "./model";
import { seed } from "./seed";

/** One-time plan revision. Logged and active workouts retain their original snapshots. */
export function updateTrainingPlan(s: State): State {
  const defaults = seed();
  for (const exercise of defaults.exercises) {
    if (!s.exercises.some((e) => e.id === exercise.id))
      s.exercises.push(exercise);
  }
  for (const machine of defaults.machines) {
    if (!s.machines.some((m) => m.id === machine.id)) s.machines.push(machine);
  }
  for (const e of s.exercises) {
    if (e.id === "lateral" || e.id === "curl") e.archived = true;
  }
  const cable = s.machines.find((m) => m.id === "m-cable");
  if (cable) {
    if (cable.name === "Cable station") cable.name = "Triceps cable";
    cable.muscles = ["Triceps"];
    cable.visual = "triceps";
  }
  const dumbbells = s.machines.find((m) => m.id === "m-dumbbell");
  if (dumbbells)
    dumbbells.muscles = [
      ...new Set([...dumbbells.muscles, "Biceps", "Shoulders"]),
    ];
  for (const program of s.programs) {
    const replacement = defaults.programs.find((p) => p.id === program.id);
    if (replacement) {
      const oldItems = program.items;
      program.items = replacement.items.map((item) => {
        const old = oldItems.find((i) => i.exerciseId === item.exerciseId);
        // Keep intentional unassigned/custom equipment on unchanged exercises.
        return { ...item, machineId: old?.machineId ?? item.machineId };
      });
    }
    for (const item of program.items) {
      if (item.exerciseId === "lateral" || item.exerciseId === "curl") {
        item.exerciseId =
          item.exerciseId === "lateral" ? "dblateral" : "dbcurl";
        item.machineId = "m-dumbbell";
      }
      item.sets = 4;
      item.min = item.max = 10;
      if (item.machineId === "m-cable" && item.exerciseId !== "pushdown") {
        item.machineId =
          defaults.programs
            .flatMap((p) => p.items)
            .find((i) => i.exerciseId === item.exerciseId)?.machineId ?? "";
      }
    }
  }
  s.profile.intro = false;
  return s;
}
