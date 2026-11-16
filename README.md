# Student companion

A personal app for one Monash University Malaysia student. It tracks grades, money, food and health, and tells you plainly whether you are on course for the targets you set.

The name is not chosen yet, so the app shows `[APP NAME]`.

## What works today

| Part | What it does |
|---|---|
| **Grades** | Units, assessments, marks, hurdles and targets. For each unit: what you need on the rest, whether that is *possible*, and whether it is *realistic*. GPA, CGPA (Malaysia scale) and WAM. A final goal that sets default targets. A what-if slider. |
| **Map** | A path from finished work, through today's tasks, to your goal. One map each for studies, budget, food and health. Drag and zoom. |
| **Budget** | A monthly limit in MYR, categories, spending, and whether you are ahead of pace. |
| **Food** | Daily calorie and protein targets, a food log and quick add. |
| **Health** | Steps, sleep, resting heart rate and workouts, typed in by hand. |
| **Terminal program** | The grades part also runs as a menu in a terminal, with its own save file. |

Not built yet: mascot art, the Android app, cloud sync and login, reading steps from the phone. See [docs/handoff/STATUS.md](docs/handoff/STATUS.md).

## Run it

You need a C++17 compiler, CMake, and Node 22.13 or newer. Nothing else is installed.

```
cmake -S core -B core/build
cmake --build core/build
node backend/src/server.js
```

Then open <http://127.0.0.1:8080>. Press **Load example data** on the home screen to look around with made-up data.

The terminal program: `core/build/tracker` (on Windows: `core\build\tracker.exe`).

## Test it

```
python tools/check.py
```

This builds the core and runs all 184 tests. The output of the last run is in [docs/proofs/test-run.txt](docs/proofs/test-run.txt), and screenshots of every screen are in [docs/proofs/screens/](docs/proofs/screens/).

## How it is built

```
web/       the screens      HTML, CSS and JavaScript modules in MVVM. No build step.
backend/   the server       Node, no packages. SQLite database in one file. JSON API.
core/      the grade rules  C++17 with hand-built data structures. Runs as a terminal
                            program, and as an "engine" the backend calls.
```

Every grade rule lives in the C++ core and nowhere else. The backend sends the stored data to the core and gets back one report. The picture and the reasons are in [docs/02-design/trd.md](docs/02-design/trd.md).

## Where things are

| You want | Go to |
|---|---|
| What is built and what is next | [docs/handoff/STATUS.md](docs/handoff/STATUS.md) |
| Instructions for an AI agent working on this | [AGENTS.md](AGENTS.md) |
| Turning on the AI helper (Gemini) | [docs/handoff/gemini-setup.md](docs/handoff/gemini-setup.md) |
| Putting it online (AWS) | [docs/handoff/aws-setup.md](docs/handoff/aws-setup.md) |
| Using it on an Android phone | [docs/handoff/android-setup.md](docs/handoff/android-setup.md) |
| GitHub: pushing, CI and the project board | [docs/handoff/github-setup.md](docs/handoff/github-setup.md) |
| How to add a feature the MVVM way | [docs/handoff/mvvm-guide.md](docs/handoff/mvvm-guide.md) |
| All planning documents | [docs/README.md](docs/README.md) |
| The clickable design prototype (made-up data) | [prototype/](prototype/) |

## Privacy

Everything you enter stays in one file on your computer (`backend/data/app.db`). Nothing is sent anywhere unless you turn on the AI helper, which sends a short summary to Google's Gemini. Details: [docs/02-design/security-privacy.md](docs/02-design/security-privacy.md).
