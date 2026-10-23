# Delivery status

This file records evidence, not assumed completion. The full acceptance contract remains in GOAL.md.

## Functionality-only revision — October 22, 2026

- Removed machine setup walkthroughs, technique tutorials, common-mistake sections, and the extra readiness step. Workouts open directly on the current set, with machine visuals and saved settings still available.
- Retained explicit set/rest/next-exercise transitions, pause/resume, undo, equipment replacement, and full workout editing.
- Replaced descriptive headings and motivational copy with plain labels across onboarding, Today, workouts, programs, machines, progress, nutrition, and settings. Optional protein references and iPhone installation help are collapsed.
- Compact mobile spacing keeps Set complete above the bottom navigation in the tested iPhone viewport. The browser suite now asserts this placement.
- Existing setup-stage sessions resolve to their saved set without modifying logged data or the backup schema. All 33 unit tests and the production type/build checks passed.
- All 27 browser tests passed locally across desktop Chromium, iPhone-sized Chromium, and iPhone-sized WebKit (1.9 minutes), including direct set entry, uninterrupted set/rest transitions, machine settings, replacement, offline resume, backups, both themes, cross-tab state, and accessibility scans. Visual inspection covered the simplified Today and workout screens on desktop and iPhone layouts.
- Updated the manual production-update script to wait for route rendering before selecting the full editor, and to accept both old and new button labels.

## Simplicity revision — October 22, 2026

- Added a default guided workout with machine/setup cues, one-set logging, a dedicated rest screen, explicit continuation, undo, and a final review. Existing full editing remains accessible through Edit workout.
- Added original offline illustrations for incline press, pulldown, supported row, leg press, seated leg curl, cables, and dumbbells. Personal photos override diagrams, and custom machines can select a matching illustration.
- Simplified Today into a workout start/resume card, weekly consistency, and a visual machine plan. Secondary insights and machine filters expand when needed. More contains Programs, Nutrition, and Settings.
- Kept backward-compatible optional data fields. Older workouts and backups do not require a guide position or illustration selection; new exports retain both.
- 32 unit tests passed, including guided advancement, paused/rest guards, undo, completed-history preservation, and backup round trips.
- 27 browser tests passed locally across desktop Chromium, iPhone-sized Chromium, and iPhone-sized WebKit. New scenarios complete all 12 sets in a guided session, reload and continue offline, preserve machine setup, pause/resume, undo, switch occupied equipment, navigate the plan, and scan guided setup/set/rest screens for accessibility issues in both themes. Existing full-editor, backup, nutrition, and analytics checks continue to pass.
- Physical iPhone testing remains unavailable. The release workflow gates deployment on the full test suite; current run status is available in [GitHub Actions](https://github.com/ChristopherLuey/gym/actions).

## Delivered and verified

**Live application:** https://christopherluey.github.io/gym/

**Source repository:** https://github.com/ChristopherLuey/gym

**Production acceptance completed:** October 21, 2026, Pacific time.

- Detailed product goal and acceptance contract saved in GOAL.md.
- Connected GitHub account verified as ChristopherLuey.
- Repository absence was confirmed through authenticated administration access. The public `ChristopherLuey/gym` repository was created and source pushed to `main`; no existing remote work was overwritten.
- Today, live workouts, programs/exercise library, machines, progress, nutrition, and settings implemented with persistent local data.
- Production TypeScript check and Vite build passed. PWA shell precaches all application chunks and icons under `/gym/`.
- 26 unit tests passed: progression, current fatigue/prescription changes, working volume, machine isolation, deduplicated records, scheduled completion, inactive weeks, calendar-based weight trends, pause duration, units, persistence, a real IndexedDB version-one upgrade, backup validation, recovery, transactional rollback after a simulated storage failure, protection against importing over an active session, and rejection of empty exercise libraries/non-renderable timestamps.
- Dependency audit reported zero known vulnerabilities after dependency updates.
- 18 end-to-end browser tests passed against the public production URL across desktop Chromium, iPhone 13-sized Chromium, and iPhone 13-sized WebKit (six workflows per browser configuration; 1.1 minutes). The same suite passed in GitHub Actions on Linux (1.4 minutes).
- Browser scenarios cover onboarding and skipped weight/equipment, onboarding unit conversion, equipment grouping, direct links to machine details, saved exercise notes, machine creation/edit/favorite/archive and photos, program assignment and custom programs, start/pause/resume/finish/discard/repeat, warm-ups, exercise addition/removal/reordering, set editing/deletion, setup snapshots, notes/fatigue, reload recovery, machine and exercise replacement, records/charts/history, protein/calorie/weight/measurement logging, reusable meals, optional tracking, theme switching, export/import of completed history and machines, malformed import rejection, recovery copies, and offline reopening.
- Automated WCAG A/AA checks found no violations on the scanned main screens in dark and light themes and the scanned live workout form. This is automated evidence, not a complete accessibility certification.
- Browser-error assertions passed; narrow 375px and tablet 768px layouts have no horizontal overflow in the tested main screens.
- Visual review covered desktop/tablet Today, mobile Today/workout/equipment groups, and light-mode Settings, including fresh screenshots from the live site. Contrast, labeling, and first-use scroll defects discovered during QA were repaired.
- Cross-tab persistence was tested. Individual updates run against current IndexedDB state inside transactions; the UI distinguishes saving from saved and reports storage failures.
- Original app icons, iPhone installation guidance, calculation/privacy documentation, and the gated GitHub Pages workflow are included.
- Follow-up acceptance audit added persistent area/type/muscle grouping, direct machine access, an active-session-aware Today plan, explicit strength improvements, exercise records/notes/setup history, and weekly weight trends. Baseline records are separated from improvements, and revisiting a setup does not double-count its record.

## Deployment

The GitHub CLI is authenticated as ChristopherLuey using the operating system credential store. Authentication was completed through GitHub's device flow. No device codes or credentials are committed. The repository-local Git helper uses that authenticated CLI.

GitHub Pages uses `build_type: workflow`, with HTTPS enforced. The first [Actions run](https://github.com/ChristopherLuey/gym/actions/runs/39720100500) passed its checks and deployment for commit `0926311`. The subsequent push of application commit `e79e53e` triggered [run 39720757504](https://github.com/ChristopherLuey/gym/actions/runs/39720757504), which also passed all checks and deployed successfully. The production URL returns HTTP 200 and serves the new bundle. Every push to `main` runs this test/build/deployment workflow; no additional approval or manual Pages publication is required.

Production verification used `GYM_BASE_URL=https://christopherluey.github.io/gym/` with `npm run test:e2e`. The tests use isolated synthetic profiles, never the user's actual browser records. The manifest's `/gym/` start URL/scope, standalone mode, icon responses, navigation, lazy chart assets, and offline reload passed. System fonts require no external font downloads.

## Real deployment-update evidence

`node scripts/verify-production-update.mjs` held an isolated production browser open across the two deployments. Before the update, it saved an active workout, a completed set, and machine setup details and verified them after refresh. After the second deployment it verified:

- A new version was detected, but the update action stayed unavailable while the workout was active.
- The completed set and machine settings remained intact.
- Finishing and saving the workout enabled the update action.
- Accepting the update reloaded the application with a different production JavaScript bundle.
- Completed history survived, and repeating the workout prefilled its previous load and setup.
- Offline reload, new offline set completion, and another reload retained the saved data.
- No JavaScript page errors or console errors occurred.

The check completed at `2026-10-22T04:14:27.243Z`, changing from `/gym/assets/index-wx8zGHcj.js` to `/gym/assets/index-BLINXqt0.js`. Its local JSON report and screenshot are in ignored `test-results/production-update.json` and `test-results/production-update-offline.png`. These are QA artifacts, not committed personal history.

## Verification limits

- Desktop Chromium, iPhone-sized Chromium, and WebKit are available for automated testing.
- A physical iPhone/Safari installation is not available in this Windows environment.
- Automated accessibility scans and semantic/native controls do not replace a manual screen-reader audit.
- Automatic cross-device sync is not configured. The implemented default is browser-local storage with JSON transfer. Import replaces the destination after creating a recovery snapshot; it does not merge independently edited histories.
- iOS may suspend the application in the background. Rest timers recover from timestamps, but background alarms are not promised.
- Native browser storage can be cleared or evicted. Export backups outside the browser; persistent-storage requests are best effort.

## User setup

No further repository, deployment, or account authorization is required. Open the live URL in Safari, choose **Share → Add to Home Screen → Add**, launch GYM online once, and wait for **Offline ready**. Onboard with current bodyweight and actual equipment; weight and equipment setup may be skipped and edited later. Use the installed app consistently, since browser and home-screen storage contexts may differ. Back up from Settings before transferring between devices.
