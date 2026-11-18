# Student companion

A personal app for one Monash University Malaysia student. It tracks grades, money, food and health, and tells you plainly whether you are on course for the targets you set.

The name is not chosen yet, so the app shows `[APP NAME]`.

**Version 0.3** ([releases](https://github.com/sih2006/Everything-A-Monash-Malaysia-Student-Would-Need/releases), [roadmap](docs/03-plan/roadmap.md), [project board](https://github.com/users/sih2006/projects/1)).

## What works today

| Part | What it does |
|---|---|
| **Grades** | Units, assessments, marks, hurdles and targets. For each unit: what you need on the rest, whether that is *possible*, and whether it is *realistic*. GPA, CGPA (Malaysia scale) and WAM, kept apart. Pass/fail units that never count. A what-if slider that moves the totals. A final goal that sets default targets. |
| **Budget** | Bank, e-wallet, investing and cash accounts with a total. Money in, moves between accounts, a monthly limit and categories. An Expenses tab that looks back over a month, 3 months, a year or all time: what could be cut, a map of where the money goes, a month-by-month table, and advice. Amounts can be shown in USD, OMR, CZK, CAD or IDR. |
| **Food** | Daily calorie and protein targets and a food log. One-press quick add for your meals and your usual takeaways (Burger King, kebab and shawarma, nasi lemak).  Today, this week and this month. A kitchen, and quick home-cooked recipes with costs for what to eat today. Reading a meal photo or label (with the AI helper). |
| **Health** | Steps, sleep, heart rate, water, body weight with BMI, and workouts with exercises and best lifts, typed in by hand. |
| **Map** | A life tree (years down the left, each area branching right, down to single days), and a path to the goal for each area. |
| **Privacy** | Hide every number (marks and money) with one press. Download all your data to one file, load it back, or delete everything. |
| **Terminal program** | The grades part also runs as a menu in a terminal, with its own save file. |

Not built yet: mascot art, the AI features with a real key, hosting and login, the Android app beyond its first screen, reading steps from the phone. The order is in the [roadmap](docs/03-plan/roadmap.md).

## Run it

You need a C++17 compiler, CMake, and Node 22.13 or newer. Nothing else is installed.

```
cmake -S core -B core/build
cmake --build core/build
node backend/src/server.js
```

Then open <http://127.0.0.1:8080>. To look around with made-up data and without touching your own: `node backend/src/server.js --demo`.

The terminal program: `core/build/tracker` (on Windows: `core\build\tracker.exe`).

## Test it

```
python tools/check.py
```

This builds the core and runs all 320 tests: 106 for the C++ core (75 white-box with a leak check on each, 31 black-box), 133 for the backend and 81 for the web app. CI runs the same command on Linux for every pull request. The output of the last run is in [docs/proofs/test-run.txt](docs/proofs/test-run.txt).

## How it is built

```
web/       the screens      HTML, CSS and JavaScript modules in MVVM. No build step.
backend/   the server       Node, no packages. SQLite database in one file. JSON API.
core/      the grade rules  C++17 with hand-built data structures. Runs as a terminal
                            program, and as an "engine" the backend calls.
android/   the phone app    Kotlin and Jetpack Compose, with the same C++ core inside. Started.
```

Every grade rule lives in the C++ core and nowhere else. The backend sends the stored data to the core and gets back one report. The pictures and the reasons are in the [technical design](docs/02-design/trd.md).

## Where things are

| You want | Go to |
|---|---|
| What is built and what is known to be wrong | [docs/handoff/STATUS.md](docs/handoff/STATUS.md) |
| What is next | [docs/handoff/next-tasks.md](docs/handoff/next-tasks.md) and the [roadmap](docs/03-plan/roadmap.md) |
| All planning documents | [docs/README.md](docs/README.md) |
| How changes, CI, the board and releases work | [docs/handoff/github-setup.md](docs/handoff/github-setup.md) |
| How to add a feature the MVVM way | [docs/handoff/mvvm-guide.md](docs/handoff/mvvm-guide.md) |
| Turning on the AI helper (Gemini) | [docs/handoff/gemini-setup.md](docs/handoff/gemini-setup.md) |
| Putting it online (AWS) | [docs/handoff/aws-setup.md](docs/handoff/aws-setup.md) |
| Using it on an Android phone | [docs/handoff/android-setup.md](docs/handoff/android-setup.md) |
| Showing the app to someone | [docs/handoff/demo-script.md](docs/handoff/demo-script.md) |
| Instructions for an AI agent working on this | [AGENTS.md](AGENTS.md) |
| The clickable design prototype (made-up data) | [prototype/](prototype/) |

## Privacy

Everything you enter stays in one file on your computer (`backend/data/app.db`), which git ignores. Nothing about you is sent anywhere unless you turn on the AI helper, which sends a short summary to Google's Gemini. Once a day the app asks a free service for exchange rates; that request carries only the currency code. Details: [docs/02-design/security-privacy.md](docs/02-design/security-privacy.md).
