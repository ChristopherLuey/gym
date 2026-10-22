# GYM — complete product goal and acceptance contract

Status: implemented and deployed; production verification completed on October 21, 2026 (Pacific time). See [STATUS.md](STATUS.md) for evidence and the physical-iPhone verification limit.

## Simplicity revision — October 22, 2026

The user's next priority is simplicity, recognizable machine visuals, and a workout that walks them through training. The default experience should present one exercise and one set at a time: find the machine, understand setup and technique, perform and confirm a set, rest, and continue. Keep a clear next action, a recoverable position after interruptions, easy equipment replacement, and undo for a mistaken set completion. Existing history, backups, and full editing capabilities must survive the redesign.

Use a visual machine plan and distinct equipment illustrations, with personal machine photos overriding generic artwork. Reduce Today to the useful starting point and keep secondary statistics behind an expandable section. Put program/nutrition administration in More and advanced workout controls in Edit workout or expandable options. This refines the presentation of the requirements below; it does not remove data, privacy, offline, or deployment requirements.

## 1. Mission and completion standard

Build, test, document, and deploy a production-quality personal fitness operating system named **GYM**. It must help Christopher plan gym machines, train consistently, log sets and equipment settings quickly, gain strength, and support gradual muscle and bodyweight gain. Success means opening the production site on an iPhone, seeing the planned machines, starting a workout, logging sets and setup settings in seconds, and confidently using saved history every week.

- Production: https://christopherluey.github.io/gym/
- Source: https://github.com/ChristopherLuey/gym
- Owner: ChristopherLuey.
- Authorized: inspect this account and repository, create `gym` if absent, preserve valuable existing work, implement, test, configure GitHub Pages and Actions, commit, push, and deploy.
- Boundary: do not modify unrelated repositories or publish personal workout history.
- Deliver an implemented, usable application. A specification, mockup, screenshot, starter code, or development server alone does not fulfill this goal.
- Continue autonomously with reasonable decisions, repairing issues until done or a genuine permission/infrastructure blocker prevents progress. Identify blockers accurately; never claim an unverified deployment.

## 2. Product priorities and design

Priority order: reliable persistent workout logging; machine planning and settings; polished mobile usability; programs and truthful progress; nutrition; refinements. This sequencing does not remove any required acceptance criteria.

- Apple Fitness, Hevy, and Linear are quality references, not templates to copy.
- Premium, calm, spacious, and useful: beautiful typography, restrained colors, high quality icons, strong hierarchy, subtle motion, and motivating summaries.
- Dark by default; editable light option. Honor reduced-motion preferences.
- Responsive iPhone, tablet, and desktop; optimize Safari and home-screen standalone use.
- Large touch targets and one-handed operation, fast navigation, few taps per completed set.
- Respect safe areas, notches, software keyboards, and home indicators.
- Accessible focus states, labels, dialogs, validation, keyboard operation, and screen-reader announcements.
- Charts and indicators must be legible and based on real data. Empty states must provide a meaningful next action.
- No generic administrative dashboard, unfinished placeholders, childish gamification, advertisements, subscriptions, fake social features, or unnecessary accounts.

## 3. Profile and onboarding

Established defaults only: height 165 cm / 5 ft 5 in; hypertrophy and sustainable gradual weight gain; emphasis on shoulders, upper chest, back, arms, and proportionate legs; beginner or returning lifter until changed; three sessions weekly, initially Monday/Wednesday/Friday.

Current bodyweight is unknown. Ask rather than inventing or using an old measurement. No medical restrictions have been reported. Do not invent medical conditions, vertebral injuries, or clearance requirements. Future limitations and preferences are optional, editable user input.

Onboarding should take roughly two minutes and collect:

- Current bodyweight, preferred lb/kg units, and optional target weight.
- Experience and preferred training days.
- Desired session length.
- Available equipment and gym machines.
- Optional areas and machine organization preferences.
- A skip path for machine setup; machines can be added later.

Show a preview of the initial exercises and planned machines before the first workout. Every default remains editable. No sign-up required. If weight is skipped, weight-dependent recommendations remain unavailable rather than fabricated.

## 4. Today

Immediately answer: what am I doing today, which machines should I use, and am I making progress?

- Personalized greeting and current local date.
- Today's scheduled session and its exercise/machine checklist.
- Prominent Start Workout or Resume Workout action.
- Weekly scheduled-versus-completed progress and simple consistency indicators.
- Last completed workout and one-tap repeat.
- Current bodyweight and trend when recorded.
- Recent actual strength improvements.
- Next scheduled workout and sensible recovery guidance.
- Quick access to recently used machines.
- Honest first-use and rest-day states; no invented achievements.

## 5. Live workout — highest-priority interaction

Lifecycle: start, pause, resume, finish, discard, and resume after browser interruption. Continuously save changes and distinguish saved, saving, and storage failure states. Prevent accidental discarding of completed work.

For each exercise:

- Show assigned machine, target sets/reps/rest, prior results, and simple technique access.
- Log the actual machine used, including custom names and equivalent replacements.
- Store setup snapshots: seat, pad, handle, pin, attachment, resistance profile, and notes as applicable.
- Prefill last successful weight, repetitions, and settings for this exercise/machine combination.
- Log working and warm-up sets, load, repetitions, optional RIR, completion, and fatigue where relevant.
- Add, edit, delete, and reorder sets/exercises; change exercise or machine without corrupting completed history.
- Make completion a quick, large tap; support decimal loads and appropriate numeric keyboards.
- Show workout progress and editable notes.
- Offer a configurable rest timer that remains accurate after backgrounding and resuming.
- Offer concise, transparent progression suggestions with manual override and recorded accepted/rejected choices.
- Handle an occupied machine with a quick replacement flow.

Finishing saves an immutable-enough historical snapshot of the performed names/prescriptions/machine/settings, while retaining stable IDs for analytics. Summary shows actual sets, reps, volume, duration, machines, and real personal records, with subtle celebration only when supported. Track machine last-used dates, session frequency, sets, reps, and volume. Paused time must not inflate active duration. All timer and session behavior should survive reload.

## 6. Programs and exercise library

Initial schedule: Monday Full Body A, Wednesday Full Body B, Friday Full Body C. Organize balanced sessions around this starting library:

| Exercise | Suggested equipment | Standard working sets | Repetitions |
| --- | --- | ---: | --- |
| Incline machine chest press | Incline chest press machine | 3 | 8–12 |
| Lat pulldown | Lat pulldown machine | 3 | 8–12 |
| Chest-supported row | Chest-supported row machine | 2 | 8–12 |
| Leg press | Leg press machine | 2 | 8–12 |
| Seated leg curl | Seated leg curl machine | 2 | 10–15 |
| Cable lateral raises | Cable station | 3 | 12–20 |
| Bicep curls | Cable station or curl machine | 2 | 10–15 |
| Tricep pushdowns | Cable station | 2 | 10–15 |

First two weeks: approximately one to two sets per exercise, with volume increases dependent on tolerance and recovery rather than mandatory calendar escalation. Clearly show the introductory prescription and how to adjust it. Choose sensible A/B/C variations, substitutions, order, and per-session volumes; expose weekly muscle coverage and machine-use plans.

Each exercise includes name, primary/secondary muscles, machine/equipment, set/rep/rest prescription, simple technique, common mistakes, alternatives, history, records, machine notes, and setup instructions. Optional demonstrations must come from trustworthy properly licensed resources; do not embed unlicensed content or make external videos an offline dependency.

Allow custom programs, changed days, rearranged exercises, assigned machines, custom exercises, and machine-specific variations. Program edits affect future sessions without rewriting old workouts. Archived equipment must not silently become a future assignment.

## 7. Machines

- Add, edit, archive, search, and filter equipment.
- Group by muscle, equipment type, and gym area.
- Custom names, brand/model, photo or visual reference support where feasible.
- Setup notes plus seat/pad/handle/pin/attachment/resistance settings.
- Favorites and quick access.
- Assign to programs/exercises and show next-workout assignments.
- Last used, usage frequency, total completed working sets/reps/load-volume, and machine records.
- Most-used, recent, and not-recently-used views.
- Exercises performed on each machine and usage over time.
- Quick occupied/unavailable replacement.
- Preserve history across replacements and archiving; maintain distinct histories across machines even when exercise names match.
- Equivalent-machine comparisons must be explicitly labeled and must not imply identical resistance or transfer records automatically.

Suggested areas: chest/shoulders, back/pulldowns, legs, cables, free weights, cardio. An exact gym map is optional and never required.

## 8. Progress and trustworthy analytics

Interactive weekly, monthly, three-month, and all-time views, with accessible text summaries and useful empty states:

- Bodyweight history, weekly average, and trend.
- Strength progression per exercise and per exercise/machine combination.
- Completed training volume, weekly frequency, and completed-versus-planned sessions.
- Muscle-group training volume with a documented treatment of secondary muscles.
- Machine frequency, last/recent use, sets, repetitions, volume, records, and exercises used.
- Personal records with clear definitions and units.
- Optional chest, shoulders, arms, waist, and thigh measurements.
- Weekly workout review and meaningful consistency indicators.

Muscle Growth overview summarizes consistency, progressive overload, machine usage, and bodyweight trend. It must never claim direct measurement of muscle mass or predict exact growth. Machine Usage overview shows most/recent machines, muscle coverage, use over time, totals, exercises, and records.

Document calculations. Exclude uncompleted and warm-up sets from working-volume/progression metrics unless clearly labeled otherwise. Handle zero baselines, sparse data, timezone boundaries, unit conversions, archived machines, renamed exercises, and replaced equipment honestly.

## 9. Nutrition

- Current and optional target weight.
- Adjustable protein goal based on established sports nutrition guidance, with source and explanation.
- Optional manual calorie target and daily calorie intake.
- Fast daily protein logging.
- Weekly bodyweight average and trend relative to the target.
- Simple reusable meals/frequent foods and quick repeat.
- Skip detailed food tracking without impairing training features.
- Respect optional user-entered restrictions.
- Do not derive aggressive calories from height alone. Any automated calorie calculation requires sufficient weight/activity/age/trend/preference context; manual calorie targets are acceptable.

## 10. Transparent progression

Conventional double progression is the initial strategy. Evaluate each exercise/machine combination separately:

1. Find the last successfully completed working sets.
2. Compare every relevant set with the prescribed rep range and target set count.
3. Suggest maintaining load while building reps, or a modest equipment-appropriate increase after all prescribed sets reach the top of the range with manageable effort.
4. Do not reward incomplete sets or ignore elevated fatigue/low RIR/recovery concerns.
5. Explain why the suggestion was made.
6. Allow manual load override and record acceptance/rejection.
7. Keep distinct machine histories; never pretend equivalent machines provide identical resistance.
8. Never force increases or equipment changes; never recommend training through pain.

Insights must be computed from real logs, for example all sets reaching 12 reps, four-week volume change, three planned workouts completed, machine used four times this month, a machine planned today, or equipment unused for three weeks. Avoid such claims when evidence is absent.

## 11. Persistence, privacy, and recovery

Use browser-local IndexedDB with a versioned schema, explicit migrations, and typed models. Persist profile/settings, exercises, equipment, setup defaults/history, programs and assignments, active/completed workouts, sets, body metrics, nutrition/templates, and progression decisions.

- Persist through refreshes, browser restarts, installed-PWA use, and ordinary application updates.
- Continuously save active sessions and recover them on reopening.
- Handle failed writes, quota, unavailable APIs, and malformed data visibly and gracefully; never claim a failed write was saved.
- Validated versioned JSON export/import includes machines/settings/programs/history and other personal data.
- Preview imports, reject malformed/unsupported input, back up current state before replacement, and support recovery.
- Import changes must be atomic or rollback-safe; preserve referential integrity.
- Avoid stale multi-tab writes and accidental destructive resets.
- Request persistent storage where supported and explain browser storage limitations without pretending backups are unnecessary.
- No third-party analytics or personal-data transmission by default.
- Never commit real personal workout history, exports, credentials, tokens, or test runs containing user data.

GitHub Pages is static. The default app must be fully functional locally with no backend. Clearly disclose that data does not automatically sync between iPhone and laptop and that browser/PWA storage contexts can differ. Optional cloud sync is conditional on a real configured authenticated backend with per-user policies, conflict resolution, and secure auth. Never fake sync or put backend secrets/GitHub tokens in the browser. Design data IDs/versioning so future sync is possible; local JSON transfer is the initial cross-device path.

## 12. PWA and updates

- Web app manifest, GYM identity, professional 192/512 icons and Apple touch icon.
- Standalone display and polished launch/background appearance.
- Offline shell and all essential training assets cached after initial load.
- Correct `/gym/` base, manifest start URL/scope, service-worker registration/scope, icons, fonts, navigation, and hashed assets.
- Reliable versioned caching and obsolete-cache cleanup without deleting personal data.
- Updates should be user-visible and defer disruptive activation during active workouts.
- Graceful fallback where install/storage/service-worker APIs are unavailable.
- iPhone Safari installation instructions: Share → Add to Home Screen → Add; verify as far as available hardware allows.

## 13. Engineering and delivery architecture

Preferred: React, TypeScript, Vite, Tailwind or equivalent maintainable styling, accessible components, Lucide, Recharts or equivalent, Dexie or equivalent IndexedDB abstraction, PWA tooling, Vitest, Playwright. Choose alternatives only where justified.

- Modular understandable code, reusable primitives, strong domain types, clear storage boundaries.
- Stable IDs plus historical snapshots for machine/exercise rename/archive safety.
- Canonical internal units with consistent display/conversion and no double conversion.
- Deterministic calculations testable independently from UI.
- No unnecessary dependencies, browser console errors, remote font requirements, or needless architectural complexity.
- Fast initial render, smooth logging, reasonable bundle sizes and lazy charts where useful.
- Document development, tests, deployment, backups/privacy, calculation definitions, and known limits.

## 14. Deployment checklist

- [x] Inspect account and `ChristopherLuey/gym`; determine absence versus access restriction.
- [x] Preserve valuable pre-existing work; create the repository only if absent (authenticated inspection confirmed absence).
- [x] Configure Vite base `/gym/` and resilient static-site navigation (verified in local production builds).
- [x] Configure GitHub Actions for install, type/build checks, unit and end-to-end tests, build, artifact upload, and Pages deployment.
- [x] Configure Pages to publish through Actions with necessary least-privilege workflow permissions.
- [x] Commit and push reviewed source without personal workout history or secrets.
- [x] Confirm passing workflow and successful deployment (first run 39720100500).
- [x] Open and test the live production URL, assets, navigation, PWA resources, and offline behavior (18 production browser tests and a real version-update check passed).
- [x] Confirm future pushes to the deployment branch trigger redeployment (successive push-triggered runs 39720100500 and 39720757504 deployed successfully).

## 15. Verification matrix

Every required scenario must have recorded evidence or an explicit verification limitation:

- [x] First-time onboarding, skips, validation, program preview.
- [x] Create/edit/archive/search/favorite machines and record settings, including local photos.
- [x] Assign machines and plan a workout around them.
- [x] Start/pause/resume/finish/discard/repeat workouts.
- [x] Add/edit/delete sets; add/edit/reorder/remove exercises; warmups and RIR.
- [x] Complete sets, run rest timer, prefill prior results/settings.
- [x] Recover interrupted sessions and refresh without data loss.
- [x] Replace unavailable equipment/exercises while preserving existing logs.
- [x] Record truthful personal records and completion summary (unit tests distinguish baselines from improvements).
- [x] Exercise/machine progression charts and machine-use analytics.
- [x] Bodyweight, measurements, protein/calorie logs and reusable meals.
- [x] Export/import/recover all personal data; reject malformed backups safely.
- [x] Offline reopening and workout logging after initial cache.
- [x] PWA manifest/icons/service worker/update behavior and `/gym/` paths; native iPhone installation has the device limit below.
- [x] Light/dark modes, reduced motion, accessible names and native controls; automated WCAG scans passed. Manual assistive-technology testing is not claimed.
- [x] Narrow modern-iPhone emulation, tablet, and desktop layouts.
- [ ] Physical iPhone Safari and Add to Home Screen installation: hardware unavailable in this Windows environment. iPhone-sized Chromium and WebKit passed; these do not substitute for a physical-device test. This conditional verification limit remains explicit.
- [x] Empty states, malformed numbers, storage failure, missing equipment, sparse history.
- [x] Unit tests: progression, calculations, machine use, persistence/migrations, backup validation/import/export (26 passing).
- [x] Full production browser workflows passed (18 tests); no unexpected browser errors. Update activation was deferred until the workout finished, then history/settings and offline logging survived the changed application build.

## 16. Final definition of done and report

Done requires an implemented polished app whose main features use real persistent data; pre-workout machine planning; fast in-session machine/set/setup logging; reliable history and offline operation; installable PWA; safe ordinary updates; documented working repository; passing automated checks; successful Pages deployment; verified production URL.

The final report must include:

1. Live app URL.
2. GitHub repository URL.
3. Implemented features.
4. Test results and exact verification limits.
5. Deployment status.
6. Limitations, especially no automatic cross-device synchronization when no backend is configured.
7. iPhone installation steps and backup guidance.
8. Any remaining setup requiring user action/authorization, with the concrete blocker.

An incomplete requirement must remain visible rather than being silently removed from this contract. No success claim until the production app is actually verified.
