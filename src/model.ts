import { z } from "zod";
const id = z.string().min(1).max(100);
const text = z.string().max(5000);
const num = z.number().finite().nonnegative();
const timestamp = num.max(8_640_000_000_000_000);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const machineVisuals = [
  "auto",
  "press",
  "pulldown",
  "row",
  "legpress",
  "legcurl",
  "cable",
  "dumbbell",
] as const;
export const setupSchema = z.object({
  seat: text,
  pad: text,
  handle: text,
  pin: text,
  attachment: text,
  resistance: text,
  notes: text,
});
export const emptySetup = () => ({
  seat: "",
  pad: "",
  handle: "",
  pin: "",
  attachment: "",
  resistance: "",
  notes: "",
});
export const machineSchema = z.object({
  id,
  name: z.string().min(1).max(120),
  type: text,
  area: text,
  muscles: z.array(text),
  brand: text,
  model: text,
  setup: setupSchema,
  favorite: z.boolean(),
  archived: z.boolean(),
  photo: z
    .string()
    .max(2_000_000)
    .refine(
      (v) =>
        v === "" ||
        /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v),
      "Photos must be local JPEG, PNG, or WebP data.",
    ),
  incrementKg: z.number().positive().max(100),
  visual: z.enum(machineVisuals).optional(),
});
export const exerciseSchema = z.object({
  id,
  name: z.string().min(1).max(120),
  muscles: z.array(text).min(1),
  secondary: z.array(text),
  equipment: text,
  instructions: text,
  mistakes: text,
  alternatives: z.array(id),
  notes: text,
});
export const prescriptionSchema = z
  .object({
    id,
    exerciseId: id,
    machineId: text,
    sets: z.number().int().min(1).max(20),
    min: z.number().int().min(1).max(100),
    max: z.number().int().min(1).max(100),
    rest: z.number().int().min(0).max(900),
  })
  .refine(
    (p) => p.max >= p.min,
    "Maximum repetitions must be at least the minimum.",
  );
export const programSchema = z.object({
  id,
  name: z.string().min(1).max(120),
  days: z.array(z.number().int().min(0).max(6)),
  items: z.array(prescriptionSchema),
  archived: z.boolean(),
});
export const setSchema = z.object({
  id,
  kg: num.max(2000),
  reps: z.number().int().min(0).max(200),
  rir: z.number().min(0).max(10).nullable(),
  kind: z.enum(["work", "warmup"]),
  done: z.boolean(),
});
export const entrySchema = z.object({
  id,
  exerciseId: id,
  exerciseName: text,
  muscles: z.array(text),
  machineId: text,
  machineName: text,
  setup: setupSchema,
  sets: z.array(setSchema),
  min: num,
  max: num,
  rest: num,
  targetSets: num,
  decision: z.enum(["pending", "accepted", "rejected"]),
  suggestionKg: num.nullable(),
  fatigue: z.enum(["normal", "high"]),
  notes: text,
});
export const workoutSchema = z.object({
  id,
  programId: text,
  name: text,
  started: timestamp,
  finished: timestamp.nullable(),
  pausedAt: timestamp.nullable(),
  pausedMs: num,
  restUntil: timestamp.nullable(),
  entries: z.array(entrySchema),
  notes: text,
  guide: z
    .object({
      entryId: id,
      stage: z.enum(["setup", "train"]),
      lastSetId: id.optional(),
    })
    .optional(),
});
export const profileSchema = z.object({
  name: text,
  heightCm: z.number().finite().positive(),
  units: z.enum(["kg", "lb"]),
  experience: z.enum(["beginner", "returning", "experienced"]),
  days: z.array(z.number().int().min(0).max(6)).min(1),
  minutes: z.number().min(15).max(180),
  targetKg: num.nullable(),
  limitations: text,
  intro: z.boolean(),
  createdAt: timestamp,
  proteinGoal: num.nullable(),
  calorieGoal: num.nullable(),
  tracking: z.boolean(),
  theme: z.enum(["dark", "light"]),
  rest: num,
  onboarded: z.boolean(),
  equipmentGroup: z.enum(["none", "area", "type", "muscle"]).default("none"),
});
export const stateSchema = z.object({
  schema: z.literal(2),
  profile: profileSchema,
  machines: z.array(machineSchema),
  exercises: z.array(exerciseSchema).min(1),
  programs: z.array(programSchema),
  active: workoutSchema.nullable(),
  history: z.array(workoutSchema),
  weights: z.array(
    z.object({ id, date: day, kg: z.number().positive().max(500) }),
  ),
  nutrition: z.array(
    z.object({
      id,
      date: day,
      name: text,
      protein: num.max(1000),
      calories: num.max(20000),
    }),
  ),
  meals: z.array(
    z.object({
      id,
      name: z.string().min(1),
      protein: num.max(1000),
      calories: num.max(20000),
    }),
  ),
  measurements: z.array(
    z.object({
      id,
      date: day,
      part: z.enum(["Chest", "Shoulders", "Arms", "Waist", "Thighs"]),
      cm: z.number().positive().max(500),
    }),
  ),
});
export type Setup = z.infer<typeof setupSchema>;
export type Machine = z.infer<typeof machineSchema>;
export type Exercise = z.infer<typeof exerciseSchema>;
export type Prescription = z.infer<typeof prescriptionSchema>;
export type Program = z.infer<typeof programSchema>;
export type WorkoutSet = z.infer<typeof setSchema>;
export type Entry = z.infer<typeof entrySchema>;
export type Workout = z.infer<typeof workoutSchema>;
export type Profile = z.infer<typeof profileSchema>;
export type State = z.infer<typeof stateSchema>;
export const uid = () => crypto.randomUUID();
export const localDay = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const fromKg = (kg: number, unit: Profile["units"]) =>
  Math.round(kg * (unit === "lb" ? 2.2046226218 : 1) * 10) / 10;
export const toKg = (value: number, unit: Profile["units"]) =>
  value / (unit === "lb" ? 2.2046226218 : 1);
export const formatDate = (value: number | string) =>
  new Date(
    typeof value === "string" ? value + "T12:00:00" : value,
  ).toLocaleDateString(undefined, { month: "short", day: "numeric" });
export const days = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
