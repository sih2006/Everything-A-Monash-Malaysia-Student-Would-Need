# Build status

What is built, what is tested, and what is known to be wrong. **Read it first**, and update it at the end of every piece of work.

**Last updated:** 18 November 2026, at version 0.3.

## In one paragraph

The app works on a laptop and is in daily use with the owner's real grades and money records, which are kept only in the local database (git ignores it). Grades, budget, food, health and the map all work. 320 automated tests pass on Windows and in CI on Linux. Versions 0.1 to 0.3 are released; the next versions are in the [roadmap](../03-plan/roadmap.md). Nothing is online yet, and nothing has run on a real phone.

## How to run and check it

```
cmake -S core -B core/build          build the C++ core (once, and after changing it)
cmake --build core/build
node backend/src/server.js           start the app, then open http://127.0.0.1:8080
node backend/src/server.js --demo    the same, with made-up data kept in memory only
python tools/check.py                build and run every test
```

## What is built, by version

### v0.1: terminal grade tracker

| Part | Where | Tests |
|---|---|---|
| Hand-built data structures: growable array, linked list with merge sort, hash map | `core/include/ds/` | 24 white-box, each with a leak check |
| Grade rules: bands, the GPA and CGPA scales, WAM, standing, possible, realistic, hurdles, what-if, final goal, pass/fail units | `core/src/lib/` | 35 white-box |
| Save files, the text format, the JSON report | `core/src/lib/codec.cpp`, `report.cpp` | 16 white-box |
| The terminal program | `core/src/cli.cpp` | 31 black-box |
| Benchmarks of the data structures | `core/bench/` | Results in [core/README.md](../../core/README.md#measured-do-the-costs-hold) |

### v0.2: study app

| Part | Where | Tests |
|---|---|---|
| Backend: database, API, engine bridge, AI helper, access token with a guess limit, static files | `backend/src/` | 53 API tests, against the real engine |
| Export to one file, and import into an empty app | `backend/src/api.js`, `store.js` | 20, including a full round trip and damaged files |
| Budget, food and health rules | `backend/src/domain.js` | part of the 31 rule tests |
| Web app in MVVM: Grades, Budget, Food, Health, Home, the path maps; other days and months; sorting; demo mode | `web/` | 49 view-model tests, and checks by hand ([test plan](../03-plan/test-plan.md#5-checked-by-hand-in-a-browser)) |
| Accessibility: contrast, names, sizes, keyboard | `tools/a11y-check.js` | 42 pages checked ([accessibility.md](../proofs/accessibility.md)) |
| One command for all tests, and CI on every pull request | `tools/check.py`, `.github/workflows/ci.yml` | Green on Linux, with the memory checkers on |

### v0.3: money

| Part | What it does | Tests |
|---|---|---|
| Money accounts | Bank, e-wallet, investing and cash accounts; a total; money in; moves between your own accounts; spending paid from an account. A balance set for a day keeps every move after that day. | Rule and API tests |
| Budget tabs | **Overview**, **Banking** and **Investing** (one account at a time), **Expenses** | View-model test, browser check |
| Could cut and essential categories | Spending outside essential categories (such as rent) over the last 3 months, by category and by the places paid most | Rule and API tests |
| Spending map | A treemap of that spending, with a legend, hover tips and a table view | 5 layout tests, browser check |
| Advice | Text on the Expenses tab, saved with `PUT /api/budget/advice`. A placeholder for now; the AI helper writes it in v0.6. | API test |
| Hide numbers | One switch hides every mark, grade, target and amount on every screen (it replaced Hide grades and Hide money) | View-model tests |
| Looking back | The Expenses tab switches between this month, 3 months, a year and all time: total spent, essential, could cut, and a month-by-month table of what went where | Rule, API and view-model tests, browser check |
| Regular expenses | One-press Quick add on the Expenses tab (rent or a usual meal, for example), with suggestions from repeated spending | Rule, API and view-model tests, browser check |
 A converter, and a switch that shows every amount in USD, OMR, CZK, CAD or IDR. Live rates once a day, or a rate typed by hand ([ADR-0008](../adr/0008-exchange-rates.md)) | API tests with a fake rate service, view-model tests, browser check |
| Life tree | The Map's Life view: years down the left; studies, money, food and health branching right, down to single days | 8 rule tests, 10 view-model tests |
| Also in this version | Pass/fail units; GPA, CGPA and WAM that follow the what-if sliders; more grade sorting; body weight with BMI, water, workouts with exercises and best lifts | Core, rule, API and view-model tests |

The owner's real data (the transcript, bank statements, the e-wallet record, height, weight, the advice) is only in `backend/data/app.db`. None of it is in the repository, and the scripts that read the statements stay outside it too. Tests use made-up numbers.

### v0.5 in progress: food

| Part | What it does | Tests |
|---|---|---|
| Four Food tabs | **Today** (numbers, quick add, logging, reading a picture), **Progress**, **What to eat**, **Kitchen** | View-model and presenter tests, browser check |
| Quick add | Your saved meals, then the owner's 17 usual meals in groups (Burger King, kebab and shawarma, Malaysian, fast food, breakfast and snacks). Every meal you log is saved by default | Rule, API and view-model tests |
| Progress | Today, this week and this month: averages, days logged, days on target | Rule and presenter tests |
| What to eat | 18 quick, halal home-cooked recipes (20 minutes or less, for a stove, an air fryer and a toaster), shown by meal: breakfast, lunch, dinner or snack, with estimated costs, ranked by what is left of the day and by protein after a workout; set aside when the kitchen lacks the equipment. No takeout suggestions | Rule and API tests |
| Preferences | Foods you do not eat (cucumber, pickles and noodles for the owner) and what counts most: high protein, cheapest or quickest | Rule, API and view-model tests |
| Targets from your goal | Calories and protein worked out from the goal weight, weeks, age, sex and activity, with a verdict on the pace and a safe floor; used only when you press "Use these" | Rule, API and view-model tests |
 API and view-model tests |
| Food advice | A placeholder for now; the AI helper writes it in v0.6 | API test |
| Read a food picture | The AI helper reads a meal photo or a label; you check each row first | API test with a fake AI service |

Also fixed: a backup now keeps the budget and food advice, the kitchen and rates typed by hand. Before, loading a backup dropped them.

### Started for v0.8: the Android app

A Kotlin and Jetpack Compose app with the C++ core built in through the NDK ([ADR-0007](../adr/0007-native-android-app.md)). It runs the engine and shows its report. It builds into an APK, but it has **not run** on a phone or the emulator yet. To try it: open `android/` in Android Studio, start the emulator, and tap "Allow" when it asks about debugging.

## Not tested yet

| Thing | Why | When |
|---|---|---|
| The AI features against the real Gemini | No API key yet; tested with a fake service | v0.6 ([gemini-setup.md](gemini-setup.md)) |
| CGPA against Monash's own calculator | GPA and WAM match the owner's transcript exactly; CGPA has not been compared | v0.9 |
| Touch, pinch and "Add to Home screen" on a real phone | No phone was used | v0.8 and v0.9 |
| Reaching the app from a second device over Wi-Fi | Only the laptop was used. The token screen works in a browser. | When the owner tries it ([android-setup.md](android-setup.md)) |
| macOS, and browsers other than Chromium | Not available | v0.9 |

## Known problems

| Problem | Effect | Fix |
|---|---|---|
| Fonts load from Google Fonts | Google learns the page was opened; with no internet the app falls back to a system font | Save the fonts into `web/` |
| Backups are by hand | One lost file is all your data | Press **Download all my data** on Home now and then, and keep the file somewhere safe |
| Four looks are loaded | Four font families are downloaded; only one is used at a time | Decide the look (decision B2), remove the rest |
| The phone menu has six items | One more than the usual limit; tight at 390 px | Decide whether Map moves into Home |
| Node prints an "ExperimentalWarning" for SQLite at start-up | Harmless noise | Goes away when Node marks it stable |
| Git on this laptop sometimes has unrelated `.claude/` files staged (line endings only) | A plain `git commit` would include them | Commit with the paths named: `git commit -m "..." -- path` |

## Where to go next

- What to do next, and what waits for the owner: [next-tasks.md](next-tasks.md)
- What each version is about: [roadmap.md](../03-plan/roadmap.md)
- Every requirement and its state: the [project board](https://github.com/users/sih2006/projects/1)
- If you are an AI agent: [/AGENTS.md](../../AGENTS.md)
