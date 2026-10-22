# Delivery status

This file records evidence, not assumed completion. The full acceptance contract remains in GOAL.md.

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
