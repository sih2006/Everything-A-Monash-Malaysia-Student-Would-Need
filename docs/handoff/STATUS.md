# Build status

This file says what is built, what is tested and what is still to do. **Read it first.** Update it at the end of every piece of work.

**Last updated:** 17 November 2026, at the end of the one-day build sprint.

## In one paragraph

The app works on a laptop. Grades, budget, food, health and the map all run on real data that you type in, with 185 automated tests passing. Nothing is on GitHub yet, nothing is online, and nothing has run on a real phone. Five decisions were made by Claude alone and wait for the owner's review.

## How to run and check it

```
cmake -S core -B core/build          build the C++ core (once, and after changing it)
cmake --build core/build
node backend/src/server.js           start the app, then open http://127.0.0.1:8080
python tools/check.py                build and run every test
```

## Done and tested

| Part | Where | Automated tests |
|---|---|---|
| Hand-built data structures: growable array, linked list with merge sort, hash map | `core/include/ds/` | 24, with a leak check on each |
| Grade rules: bands, the GPA and CGPA scales, WAM, standing, possible, realistic, hurdles, what-if, final goal | `core/src/lib/` | 35 |
| Save files, the text format, the JSON report | `core/src/lib/codec.cpp`, `report.cpp` | 13 |
| The terminal program | `core/src/cli.cpp` | 31 black-box |
| Budget, food and health rules | `backend/src/domain.js` | 21 |
| Database, API, engine bridge, AI helper, access token, static files | `backend/src/` | 34, against the real engine |
| Web app: presenters and commands (MVVM) | `web/js/viewmodels/` | 27 |
| Web app: screens, map, looks, hide grades, dark mode | `web/js/views/`, `web/css/` | Checked by hand in a browser, see the [test plan](../03-plan/test-plan.md#5-checked-by-hand-in-a-browser) |
| One command for all tests | `tools/check.py` | It is the proof: [test-run.txt](../proofs/test-run.txt) |

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
| Automated browser tests | Task C1 |
| Editing a unit's name and credit points from the screen; viewing other days and months; removing a remembered food; export | The API supports the first two. Tasks C2 to C5 |
| Benchmarks for the data structures | Task C7 |
| Handbook lookup, future goals, unit reviews, YouTube suggestions, a Malaysian food database | Later epics; each starts with an interview |

## Waiting for the owner

1. **Review ADRs 0002 to 0006** in [docs/adr/](../adr/). Claude made these choices alone.
2. **Check the grade numbers** against Monash's CGPA calculator with a real semester.
3. **Push and merge** the four branches, in order ([github-setup.md](github-setup.md)).
4. **Decide:** the name, the look, hosting. See section B of [next-tasks.md](next-tasks.md).
5. **Read the drafts.** Every document marked "Draft" in the [planning hub](../README.md) was written by Claude and is not yours until you have changed what is wrong in it.

## Known problems

| Problem | Effect | Fix |
|---|---|---|
| Fonts load from Google Fonts | Google learns the page was opened; with no internet the app falls back to a system font | Save the fonts into `web/` |
| No limit on wrong access-token guesses | Not safe on the open internet | Task C6 |
| No backup of `backend/data/app.db` | One lost file is all your data | Copy the file by hand until task C5 |
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
| `feat/app` | Everything else: core, backend, web app, CI, documents. **You are here.** |

## Where to go next

- For the next thing to do: [next-tasks.md](next-tasks.md)
- If you are an AI agent: [/AGENTS.md](../../AGENTS.md)
