# Build status

This file says what is built, what is tested and what is still to do. **Read it first.** Update it at the end of every piece of work.

**Last updated:** 17 November 2026, after the session that added money accounts, the life tree, more grade sorting and more health, and started the Android app.

## In one paragraph

The app works on a laptop. Grades, budget, food, health and the map all run on real data that you type in, with 259 automated tests passing (103 core, 102 backend, 54 web). A native Android app has been started on its own branch. Nothing is on GitHub yet, nothing is online, and nothing has run on a real phone. Five decisions were made by Claude alone and wait for the owner's review.

## How to run and check it

```
cmake -S core -B core/build          build the C++ core (once, and after changing it)
cmake --build core/build
node backend/src/server.js           start the app, then open http://127.0.0.1:8080
node backend/src/server.js --demo    the same, with example data kept in memory only
python tools/check.py                build and run every test
```

## Done and tested

| Part | Where | Automated tests |
|---|---|---|
| Hand-built data structures: growable array, linked list with merge sort, hash map | `core/include/ds/` | 24, with a leak check on each |
| Grade rules: bands, the GPA and CGPA scales, WAM, standing, possible, realistic, hurdles, what-if, final goal | `core/src/lib/` | 35 |
| Save files, the text format, the JSON report | `core/src/lib/codec.cpp`, `report.cpp` | 13 |
| The terminal program | `core/src/cli.cpp` | 31 black-box |
| Budget, food and health rules | `backend/src/domain.js` | 22 |
| Database, API, engine bridge, AI helper, access token with a guess limit, static files | `backend/src/` | 40, against the real engine |
| Export to one file and import into an empty app | `backend/src/api.js`, `store.js` | 17, including a full round trip and 13 kinds of damaged file |
| Web app: presenters and commands (MVVM) | `web/js/viewmodels/` | 39 |
| Web app: screens, map, looks, hide grades, dark mode | `web/js/views/`, `web/css/` | Checked by hand in a browser, see the [test plan](../03-plan/test-plan.md#5-checked-by-hand-in-a-browser) |
| One command for all tests | `tools/check.py` | It is the proof: [test-run.txt](../proofs/test-run.txt) |
| Benchmarks of the data structures | `core/bench/` | Results in [core/README.md](../../core/README.md#measured-do-the-costs-hold) |
| Accessibility: contrast, names, sizes, keyboard | `tools/a11y-check.js` | 42 pages checked: [accessibility.md](../proofs/accessibility.md) |

## Added on 17 November (branch `feat/more-features`)

| Part | What it does | Tests |
|---|---|---|
| Money accounts | Bank, e-wallet, investing and cash accounts, a total, balances set by hand, money in, moves between accounts, spending paid from an account | API and rule tests, export round trip |
| Life tree (Map → Life) | Your life by year, then studies, money, food and health, then semesters, units and assessments, months, weeks and days. Rings show how much is done and how much time has gone. Opens to full page. | `backend/test/life.test.js`, `web/test/lifeTree.test.js` |
| Semester dates | The current semester's first and last day, for the "time gone" rings | API test |
| More grade sorting | Units by code, name, attention, mark needed, best average or work left; finished units by semester, mark, grade, code or year level | ViewModel tests |
| More health | Body weight with a 30-day change and a chart, water with quick buttons, workout kind and length, exercises with sets, reps and kg, best lifts, weekly averages, a goal weight the owner sets | Rule, API and ViewModel tests |

The owner's real transcript is loaded into the local data file `backend/data/app.db`, which git ignores. It is not in the repository.

## Android app (branch `feat/android`)

A Kotlin and Jetpack Compose app with the C++ core built in through the NDK. See [ADR-0007](../adr/0007-native-android-app.md). So far it only runs the engine and shows its report. It builds into an APK for the phone and the emulator, but it has **not run** on either yet. To try it: open `android/` in Android Studio, start the emulator, and tap "Allow" when the emulator asks about debugging.

## Written but never run

Be honest about these. Each could fail the first time.

| Thing | Why it has not run | First run happens when |
|---|---|---|
| The CI workflow (`.github/workflows/ci.yml`) | Nothing is pushed | The owner pushes `feat/app` |
| The build with memory checkers (sanitizers) | Linux only; the laptop is Windows | CI runs |
| Everything on Linux or macOS | Built and tested on Windows only | CI runs |
| The two AI features against the real Gemini | No API key | The owner adds a key ([gemini-setup.md](gemini-setup.md)) |
| The backlog-to-issues script, beyond its dry run | Needs a GitHub login | The owner follows [github-setup.md](github-setup.md) |
| Reaching the app from a second device over Wi-Fi | Only this laptop was used. The token screen itself was checked in a browser on 17 November: a wrong token is refused, the right one opens the app. | The owner tries the phone on Wi-Fi ([android-setup.md](android-setup.md)) |
| Touch, pinch and "Add to Home screen" on a real phone | No phone was used | The owner tries it |

Checked by hand on 17 November and working: with the server stopped, the app's own screens still open from the offline copy and show a clear "could not reach its server" message. API answers are never kept in that copy.

## Not built

| Thing | Notes |
|---|---|
| Mascot art, the app icon, the app's name | Wait for the artist and the owner. Empty labelled spaces are in place. |
| Login and hosting | No decision yet: [ADR-0005](../adr/0005-hosting.md) |
| Cloud sync and working offline with data | Needs hosting first |
| Reading steps, sleep and heart rate from the phone | Needs a native Android app |
| Automated browser tests | Task C1. Needs the `@playwright/test` package, which needs the owner's approval |
| Handbook lookup, future goals, unit reviews, YouTube suggestions, a Malaysian food database | Later epics; each starts with an interview |

## Waiting for the owner

1. **Review ADRs 0002 to 0007** in [docs/adr/](../adr/). Claude made these choices alone, except the parts of ADR-0007 that were yours.
2. **Check the CGPA** against Monash's CGPA calculator. GPA and WAM already match your transcript exactly.
3. **Push and merge** the five branches, in order ([github-setup.md](github-setup.md)).
4. **Decide:** the name, the look, hosting. See section B of [next-tasks.md](next-tasks.md).
5. **Read the drafts.** Every document marked "Draft" in the [planning hub](../README.md) was written by Claude and is not yours until you have changed what is wrong in it.

## Known problems

| Problem | Effect | Fix |
|---|---|---|
| Fonts load from Google Fonts | Google learns the page was opened; with no internet the app falls back to a system font | Save the fonts into `web/` |
| Backups are by hand | One lost file is all your data | Press **Download all my data** on Home now and then, and keep the file somewhere safe |
| Four looks are loaded | Four font families downloaded; only one is used at a time | Decide the look, remove the rest |
| The phone menu has six items | One more than the usual limit; tight at 390 px | Decide whether Map moves into Home |
| Node prints an "ExperimentalWarning" for SQLite when the server starts | Harmless noise | Goes away when Node marks it stable |
| Git on this laptop sometimes has unrelated `.claude/` files staged (line-ending changes only) | A plain `git commit` would include them | Commit with paths named: `git commit -m "..." -- path` |

## Branches

None is pushed. Each is built on the one before.

| Branch | Holds |
|---|---|
| `docs/engineering-principles` | Principles, ADR-0001, capability map, first backlog |
| `feat/prototype` | The design prototype |
| `chore/backlog-board` | Updated backlog, the board script |
| `feat/app` | The build sprint: core, backend, web app, CI, documents |
| `feat/next-tasks` | Tasks C2 to C10, and the updated engineering principles. **You are here.** |

## Where to go next

- For the next thing to do: [next-tasks.md](next-tasks.md)
- If you are an AI agent: [/AGENTS.md](../../AGENTS.md)
