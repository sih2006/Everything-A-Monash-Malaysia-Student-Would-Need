# Roadmap: versions 0.1 to 1.0

**Status:** The owner's plan, set on 18 November 2026. Versions 0.1 to 0.3 are done and tagged; the rest are planned.

Each version has one main theme. A version is finished when its theme works, its tests pass in CI, and it is tagged with a GitHub Release. Work does not always fall neatly into one theme: when a version also holds work from another theme, its release notes say so.

| Version | Theme | State |
|---|---|---|
| **0.1** | **Terminal grade tracker.** The C++ core with the grade rules and hand-built data structures, used from the terminal. | Done: [v0.1.0](https://github.com/sih2006/Everything-A-Monash-Malaysia-Student-Would-Need/releases/tag/v0.1.0) |
| **0.2** | **Study app.** The backend and the web app, with grades at the centre: GPA, CGPA and WAM, targets, what-if, screenshot import, export. | Done: [v0.2.0](https://github.com/sih2006/Everything-A-Monash-Malaysia-Student-Would-Need/releases/tag/v0.2.0) |
| **0.3** | **Money.** Accounts, money in, budget tabs, Could cut, the spending map, Hide money. | Done: [v0.3.0](https://github.com/sih2006/Everything-A-Monash-Malaysia-Student-Would-Need/releases/tag/v0.3.0) |
| **0.4** | **Health.** Builds on the start in 0.3 (weight, BMI, water, workouts with exercises): steps, sleep and heart rate made complete, trends, and the health mascot. | Next |
| **0.5** | **Food.** Builds on the simple food log: a Malaysian food list, meals, protein, and Joel's moods. | Planned |
| **0.6** | **API integration.** The AI helper for real (study plan, screenshot import, spending advice on the Expenses tab), handbook lookup, future goals, and what people say about a unit. | Planned |
| **0.7** | **Database and integration.** The data moves to a hosted database with a login, the parts are joined up, and the app works from the phone away from the laptop. Needs the hosting decision ([ADR-0005](../adr/0005-hosting.md)). | Planned |
| **0.8** | **The phone app.** The native Android app ([ADR-0007](../adr/0007-native-android-app.md)) with every screen, and Health Connect. | Planned. Started in 0.3 |
| **0.9** | **Full testing.** Browser tests in CI, tests on a real phone, a security review, and two weeks of daily use with a list of what to fix. | Planned |
| **1.0** | **UI and UX polish.** The final look, the app's name, the mascot art and icon from the artist, and fixing everything found in 0.9. | Planned |

## How versions are numbered

- A tag looks like `v0.3.0`. The middle number is the version in the table. The last number is for fixes after a release (`v0.3.1`).
- Each release on GitHub is marked as a pre-release until 1.0.
- On the project board, each planned version is a milestone, so every issue shows which version it belongs to.

## Where the details live

- What each version must do: the [PRD](../01-requirements/prd.md) (IDs such as `BUD-16`) and the [product backlog](../01-requirements/product-backlog.md).
- The task list for the next steps: [next-tasks.md](../handoff/next-tasks.md).
- What is built now: [STATUS.md](../handoff/STATUS.md).
