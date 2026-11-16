# Build status

This file says what is built, what is tested and what is still to do. Read it first. It is updated at the end of every piece of work.

**Last updated:** 16 November 2026, during the one-day build sprint.

## Done and tested

| Part | Where | Tests |
|---|---|---|
| C++ core: hand-built data structures, grade rules, calculations, save files | `core/` | 72 white-box tests, 0 leaks |
| Terminal program (`tracker`) and engine mode (`tracker --engine`) | `core/src/` | 31 black-box tests |

## In progress

- Backend (`backend/`): local server with a database, calls the C++ engine.
- Web app (`web/`): the screens, built from the prototype, in MVVM.

## Not started

- The planning documents in `docs/`.
- Handoff guides for Gemini, AWS and Android.

## How to build and test the core

```
cmake -S core -B core/build -G Ninja
cmake --build core/build
core/build/tracker_tests
python core/tests/blackbox.py core/build/tracker
```
