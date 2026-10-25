import {
  emptySetup,
  type Exercise,
  type State,
  type Profile,
  type Machine,
} from "./model";
const library = [
  [
    "bench",
    "Bench press",
    "Chest",
    "Shoulders,Triceps",
    "Bench & barbell",
    "",
    "",
  ],
  ["dbcurl", "Dumbbell biceps curl", "Biceps", "", "Dumbbells", "", ""],
  ["dblateral", "Dumbbell lateral raise", "Shoulders", "", "Dumbbells", "", ""],
  ["chestfly", "Chest fly", "Chest", "", "Chest fly machine", "", ""],
  [
    "rearfly",
    "Reverse fly",
    "Rear shoulders",
    "Upper back",
    "Reverse fly machine",
    "",
    "",
  ],
  ["abs", "Ab crunch", "Core", "", "Ab crunch machine", "", ""],
  [
    "press",
    "Incline machine chest press",
    "Upper chest",
    "Shoulders,Triceps",
    "Incline chest press machine",
    "Set handles at upper-chest height. Keep feet planted and shoulder blades supported. Press smoothly and lower with control.",
    "Avoid shrugging, bouncing at the bottom, or locking your elbows forcefully.",
  ],
  [
    "pulldown",
    "Lat pulldown",
    "Back",
    "Biceps",
    "Lat pulldown machine",
    "Secure thighs under the pad. Pull elbows down toward your ribs and the bar toward your upper chest. Return slowly.",
    "Avoid pulling behind your neck, swinging, or leaning far backward.",
  ],
  [
    "row",
    "Chest-supported row",
    "Back",
    "Biceps,Rear shoulders",
    "Chest-supported row machine",
    "Adjust the chest pad so you can reach without rounding. Pull elbows back with your chest supported, then reach forward under control.",
    "Avoid lifting your chest off the pad or jerking the weight.",
  ],
  [
    "legpress",
    "Leg press",
    "Quads",
    "Glutes",
    "Leg press machine",
    "Place feet about shoulder-width apart. Lower only as far as your pelvis stays supported. Press through the whole foot.",
    "Avoid knees collapsing inward, lifting the pelvis, or snapping knees straight.",
  ],
  [
    "legcurl",
    "Seated leg curl",
    "Hamstrings",
    "",
    "Seated leg curl machine",
    "Align the machine pivot with your knees. Secure the thigh pad. Curl smoothly through a comfortable range.",
    "Avoid lifting your hips or using momentum.",
  ],
  [
    "lateral",
    "Cable lateral raises",
    "Shoulders",
    "",
    "Cable station",
    "Set the cable low and stand tall. With a slight elbow bend, raise your arm toward shoulder height. Lower slowly.",
    "Avoid shrugging, swinging, or using a painful range.",
  ],
  [
    "curl",
    "Bicep curls",
    "Biceps",
    "",
    "Cable station or curl machine",
    "Keep elbows comfortably beside your torso. Curl without swinging, then lower with control.",
    "Avoid leaning back or moving your upper arms to lift the weight.",
  ],
  [
    "pushdown",
    "Tricep pushdowns",
    "Triceps",
    "",
    "Cable station",
    "Set the cable high. Keep elbows near your sides, extend the arms, and return under control.",
    "Avoid throwing your torso into the movement or flaring your elbows.",
  ],
  [
    "dbpress",
    "Incline dumbbell press",
    "Upper chest",
    "Shoulders,Triceps",
    "Dumbbells",
    "Use a modest incline. Keep feet planted and shoulder blades supported. Lower comfortably and press smoothly.",
    "Avoid flaring elbows excessively or bouncing the dumbbells.",
  ],
  [
    "goblet",
    "Goblet squat",
    "Quads",
    "Glutes",
    "Dumbbells",
    "Hold a dumbbell at your chest. Sit down between your hips with feet planted, then stand smoothly.",
    "Avoid collapsing knees or forcing uncomfortable depth.",
  ],
  [
    "dbrow",
    "Supported dumbbell row",
    "Back",
    "Biceps",
    "Dumbbells",
    "Support your free hand on a bench. Keep your trunk steady and pull your elbow toward your hip.",
    "Avoid twisting or jerking the dumbbell.",
  ],
];
export const exercises: Exercise[] = library.map(
  ([id, name, muscle, secondary, equipment, instructions, mistakes]) => ({
    id,
    name,
    muscles: [muscle],
    secondary: secondary ? secondary.split(",") : [],
    equipment,
    instructions,
    mistakes,
    alternatives:
      id === "press"
        ? ["dbpress"]
        : id === "row"
          ? ["dbrow", "pulldown"]
          : id === "legpress"
            ? ["goblet"]
            : id === "dbpress"
              ? ["press"]
              : id === "goblet"
                ? ["legpress"]
                : id === "dbrow"
                  ? ["row"]
                  : [],
    notes: "",
    archived: id === "lateral" || id === "curl",
  }),
);
export const defaultProfile: Profile = {
  name: "Christopher",
  heightCm: 165,
  units: "lb",
  experience: "returning",
  days: [1, 3, 5],
  minutes: 60,
  targetKg: null,
  limitations: "",
  intro: false,
  createdAt: Date.now(),
  proteinGoal: null,
  calorieGoal: null,
  tracking: true,
  theme: "dark",
  rest: 90,
  onboarded: false,
  equipmentGroup: "none",
};
export function seed(): State {
  const machines: Machine[] = [
    [
      "m-press",
      "Incline chest press",
      "Machine",
      "Chest & shoulders",
      "Upper chest",
    ],
    ["m-pulldown", "Lat pulldown", "Machine", "Back", "Back"],
    ["m-row", "Chest-supported row", "Machine", "Back", "Back"],
    ["m-legpress", "Leg press", "Machine", "Legs", "Quads"],
    ["m-legcurl", "Seated leg curl", "Machine", "Legs", "Hamstrings"],
    ["m-cable", "Triceps cable", "Cable", "Cables", "Triceps"],
    ["m-bench", "Bench & barbell", "Free weights", "Free weights", "Chest"],
    [
      "m-chestfly",
      "Chest fly machine",
      "Machine",
      "Chest & shoulders",
      "Chest",
    ],
    [
      "m-rearfly",
      "Reverse fly machine",
      "Machine",
      "Back",
      "Rear shoulders,Upper back",
    ],
    ["m-abs", "Ab crunch machine", "Machine", "Core", "Core"],
    [
      "m-dumbbell",
      "Dumbbells",
      "Free weights",
      "Free weights",
      "Biceps,Shoulders,Upper chest,Back,Quads",
    ],
  ].map(([id, name, type, area, muscles]) => ({
    id,
    name,
    type,
    area,
    muscles: muscles.split(","),
    brand: "",
    model: "",
    setup: emptySetup(),
    favorite: false,
    archived: false,
    photo: "",
    incrementKg: type === "Cable" ? 1 : type === "Free weights" ? 1 : 2.5,
    visual:
      id === "m-cable"
        ? "triceps"
        : id === "m-bench"
          ? "bench"
          : id === "m-chestfly"
            ? "chestfly"
            : id === "m-rearfly"
              ? "rearfly"
              : id === "m-abs"
                ? "abs"
                : "auto",
  }));
  const mapping: Record<string, string> = {
    press: "m-press",
    pulldown: "m-pulldown",
    row: "m-row",
    legpress: "m-legpress",
    legcurl: "m-legcurl",
    bench: "m-bench",
    dblateral: "m-dumbbell",
    dbcurl: "m-dumbbell",
    chestfly: "m-chestfly",
    rearfly: "m-rearfly",
    abs: "m-abs",
    pushdown: "m-cable",
  };
  const orders = [
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
  ];
  return {
    schema: 3,
    profile: { ...defaultProfile, createdAt: Date.now() },
    exercises: structuredClone(exercises),
    machines,
    programs: orders.map((order, i) => ({
      id: `p-${i}`,
      name: `Full Body ${"ABC"[i]}`,
      days: [[1], [3], [5]][i],
      archived: false,
      items: order.map((exerciseId, j) => ({
        id: `p-${i}-${j}`,
        exerciseId,
        machineId: mapping[exerciseId],
        sets: 4,
        min: 10,
        max: 10,
        rest: ["bench", "pulldown", "row", "legpress"].includes(exerciseId)
          ? 120
          : 90,
      })),
    })),
    active: null,
    history: [],
    weights: [],
    nutrition: [],
    meals: [
      {
        id: "meal-yogurt",
        name: "Greek yogurt bowl",
        protein: 20,
        calories: 0,
      },
      { id: "meal-shake", name: "Protein shake", protein: 25, calories: 0 },
    ],
    measurements: [],
  };
}
