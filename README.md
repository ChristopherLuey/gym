# GYM

A local-first, mobile workout and gym-machine planner. Built for quick sets, familiar equipment, and consistent training.

**Live app:** https://christopherluey.github.io/gym/

**Repository:** https://github.com/ChristopherLuey/gym

The complete requirements and acceptance contract are in [GOAL.md](GOAL.md). GitHub Pages deployment and the live application have been verified. See [STATUS.md](STATUS.md) for test evidence and verification limits.

## Run locally

Use Node.js 24 LTS and npm.

```sh
npm ci
npm run dev
```

Open the displayed URL with `/gym/`. For the offline-enabled production build:

```sh
npm test
npm run build
npx playwright install chromium webkit
npm run test:e2e
npm run preview
```

The service worker is built for production previews/deployments, not development mode. Playwright uses disposable browser profiles and synthetic data. Tests cover desktop Chromium, iPhone-sized Chromium, and iPhone-sized WebKit. WebKit emulation is not a physical iPhone test.

For a real production-update check, run `node scripts/verify-production-update.mjs` before publishing a changed application build. It saves a synthetic active workout in an isolated browser, then waits. After deployment succeeds, press Enter. The check verifies deferred update activation, retained history/settings, the changed JavaScript bundle, and persistent offline logging. Its report and screenshot are written under ignored `test-results/`.

## Features

- Workouts open directly on the current set: machine visual, weight, repetitions, and Set complete. Rest leads to Next set or Next exercise. Progress resumes after refresh, and a mistaken completion can be undone during rest. There are no machine tutorials or extra readiness steps.
- Distinct original equipment illustrations appear in Today, Machines, and the workout guide. Saved machine photos take precedence; custom equipment can select an illustration in its editor. Illustrations show a generic equipment type, not the exact brand/model or an exercise demonstration.
- Today focuses on the next workout and visual machine plan. Progress details and machine filters expand on demand. Programs, Nutrition, and Settings are accessible through More.
- Onboarding with current weight, units, experience, days, session target, available machines, optional equipment grouping, and program preview. Weight and machine setup can be skipped; changing units converts entered values.
- Today view with a real machine plan, session progress, direct access to recent/planned machines, actual strength improvements, and repeat-last-workout. The plan follows the active session and its equipment substitutions.
- Live workouts with pause/resume, persistent active sessions, warm-up/working sets, RIR, configurable rest, notes, setup details, conservative progression, and completion summaries.
- Edit workout opens the full session editor for adding/reordering exercises, warm-ups, set corrections, and notes. Back to workout returns to the current set. Optional RIR, fatigue, progression suggestions, and rest duration are available in the full editor. The guided set card has only weight, reps, and Set complete. Machine setup edits saved seat/pad/handle settings without a tutorial.
- Equipment replacement preserves completed sets on the original equipment. The replacement begins a distinct history.
- Editable/custom programs and exercises, muscle coverage, personal exercise notes, per-machine records/setup history, machine assignments, and introductory volume.
- Machines with custom names, area/type/muscle grouping, brand/model, settings, local photos, favorites, archiving, and usage totals.
- Weight, training volume, machine/exercise strength, machine usage, records, optional measurements, and history.
- Simple protein/calorie entries, reusable meals, weekly weight averages and direction relative to a target, adjustable goals, and optional detailed tracking.
- Dark/light themes, installable PWA, offline shell, responsive layouts, local storage, validated export/import, and recovery snapshots.

## Privacy and backups

Personal data is stored in IndexedDB on the current device/browser. There is no account, telemetry, remote data API, or configured cloud sync. GitHub Pages serves application files only. The external protein-guidance link is opened only when selected.

**iPhone, laptop, Safari, and home-screen storage can be separate.** They do not automatically synchronize. Export a JSON backup in Settings and import it on the other device to transfer data. Import replaces the destination data rather than merging independent edits. It saves a pre-import recovery snapshot first and is disabled during an active workout.

Keep backups outside the browser. Clearing browser data, private browsing, device loss, and storage eviction can remove local records. Persistent storage is requested when supported, but it is not a substitute for backups. Exported files contain private health/training information and any equipment photos; do not commit them.

## iPhone installation

1. Open the deployed URL in Safari.
2. Tap **Share → Add to Home Screen → Add**.
3. Open GYM from its icon online once and wait for **Offline ready**.
4. Set up your profile in the context you intend to use. Transfer existing data with export/import if necessary.

Timers use absolute timestamps and recover after backgrounding. iOS can suspend background execution; the app does not promise background alarms. Updates prompt the user and cannot be activated through the UI while a workout is active.

## Data and calculation definitions

- Loads are stored in kilograms and converted for display. Body measurements use centimeters.
- Working volume = sum of load × repetitions for checked working sets with at least one repetition. Warm-ups and unfinished sets are excluded.
- Machine usage frequency counts completed workouts containing at least one completed working set for that equipment. Multiple exercises on one machine count as one session.
- A load record is the heaviest completed working set on the same exercise and machine. First logged bests are labeled as baselines, not improvement over nonexistent history.
- Revisiting the same exercise and machine in one session produces one load record. Improvement summaries compare against earlier completed sessions and exclude first baselines.
- Weekly frequency charts retain inactive weeks. Weight trends compare the current seven calendar days (including today) with the preceding seven; they exclude future entries and require measurements in both periods. Target direction compares each average's distance from the target. Sparse or uneven weigh-ins can limit interpretation.
- Different machines are not interchangeable resistance measurements. Historical names and setup values are snapshots; IDs retain association after renaming or archiving.
- Muscle coverage counts direct sets. Secondary muscles are documented but excluded from coverage totals to avoid double-counting.
- Double progression requires all prescribed working sets to reach the upper rep bound at one load, without high fatigue or recorded zero RIR. It suggests the machine's configured increment; the user must accept or manually override it.
- Introductory volume caps each exercise at two working sets until the user elects to increase it. This is intentionally recovery-driven rather than a mandatory increase after 14 days.
- Protein defaults to 1.6 g/kg of the latest weight, editable by the user. This falls within the ISSN 1.4–2.0 g/kg/day guidance for most exercising adults: [ISSN position stand](https://pmc.ncbi.nlm.nih.gov/articles/PMC5477153/).
- Calories are optional and entered by the user. Height is not used to invent a calorie prescription.
- The progress overview summarizes recorded sessions, machines, and improved load records. It does not measure muscle mass or predict exact gains.

## Architecture

React + TypeScript + Vite, accessible native form controls and dialogs, Lucide icons, Recharts, Dexie IndexedDB, Zod validation, and vite-plugin-pwa. Styling is a small purpose-built CSS system instead of a template or large component framework. System typography avoids remote font dependencies. Charts are in a separate bundle and precached for offline use.

- `src/model.ts`: typed, validated domain schema and unit/date utilities.
- `src/seed.ts`: exercise/equipment library and initial programs; no personal history.
- `src/logic.ts`: pure progression, records, timing, planning, and calculations.
- `src/guide.ts` and `src/GuidedWorkout.tsx`: persistent set/rest transitions. Completion never happens automatically; the user confirms each set and chooses when to end rest. Older backups containing a setup stage open directly on their saved set, without changing logged data.
- `src/MachineVisual.tsx`: offline equipment illustrations and user-photo display, shared across the core screens.
- `src/db.ts`: versioned storage, migration, transactional updates, cross-tab notification, backup validation, and recovery.
- Individual screen modules own their UI; `src/ui.tsx` provides accessible primitives.
- Stable IDs and schema/revision metadata leave room for future authenticated sync. A future backend must add per-user access policies, explicit conflict handling, and secure authentication; no sync behavior is simulated now.

## GitHub Pages deployment

The application is configured specifically for `/gym/`, including manifest scope, start URL, icons, hashed assets, and service-worker fallback. Hash-based navigation avoids static-host deep-link failures.

`ChristopherLuey/gym` is configured with **Settings → Pages → Source: GitHub Actions** and HTTPS enforced. `.github/workflows/deploy.yml` runs unit tests, type checks/build, and browser tests before uploading and deploying. Pull requests run checks without deployment. Every push to `main` triggers the same gate and deployment.

After a successful workflow, verify the live URL, `/gym/manifest.webmanifest`, icons, offline reload, navigation, and a saved workout. Never put personal access tokens or backend secrets in this client application.

If a connected GitHub integration cannot create repositories or manage Pages, authenticate the official GitHub CLI on the deployment machine with `gh auth login --hostname github.com --git-protocol https --web --skip-ssh-key --scopes workflow`. Complete the one-time device authorization in your usual browser as ChristopherLuey. This is separate from connector authentication. Keep credentials in the operating system credential store, outside this repository. After authentication, repository creation and Pages configuration can be completed through `gh`; source pushes and the checked-in workflow handle subsequent deployments.

## Development conventions

Use `npm run check` for typing and `npm test` for domain/storage tests. `npx prettier --write src e2e` formats source. Icons are original vector artwork in `public/icon.svg`; regenerate PNG sizes with `node scripts/icons.mjs`. No third-party exercise imagery is bundled.
