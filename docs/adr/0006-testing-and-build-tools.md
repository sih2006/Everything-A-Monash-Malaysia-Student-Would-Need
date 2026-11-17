# ADR-0006: Testing and build tools

## Status

Proposed. Taken during the build sprint on 16 November 2026. Waiting for the owner's review. It answers open question 4 in the product backlog (testing library and build tool) and open question 5 (file format).

## Date

2026-11-16

## Context

The backlog asked for white-box tests, black-box tests, a memory check and CI, with as few libraries as possible. ADR-0001 allowed "one small testing library" for the C++ core.

## Decision

| Need | Choice |
|---|---|
| Build the C++ core | **CMake**, with warnings treated as errors |
| White-box tests for the core | **A test helper written for this project** (`core/tests/mini.hpp`, about 70 lines) |
| Memory check | **Two ways.** The test runner counts every allocation and fails a test that does not free what it took. In CI the tests also run under the address and undefined-behaviour sanitizers. |
| Black-box tests for the terminal program | **A Python script** (`core/tests/blackbox.py`) that types into the real program and reads what it prints |
| Backend and web tests | **`node:test`**, which comes with Node |
| Run everything | **`python tools/check.py`**, used by people and by CI |
| Save file of the terminal program | **Plain text, one record per line, tabs between fields.** The same format is what the backend sends to the engine. |

## Alternatives considered

### Catch2, GoogleTest or doctest for the core

- Pros: well known, with many features.
- Cons: a download from the internet to read, pin and keep. The project's supply-chain rule says third-party code is read before it is added. The features the tests need are "check this is true" and "check these numbers are close".
- Rejected: 70 lines of our own cover it, and the owner can explain every one. If the tests outgrow it, doctest (one header) is the first candidate.

### Valgrind for the memory check

- Pros: the standard tool.
- Cons: it does not run on Windows, which is where the owner works.
- Rejected locally. The sanitizers in CI do the same job on Linux, and the allocation counter works everywhere.

### A Makefile or a build script instead of CMake

- Pros: simpler to read.
- Cons: `make` is not installed on the laptop, and CMake is what most C++ jobs use.
- Rejected.

### JSON for the save file

- Pros: a common format.
- Cons: the core would need a JSON parser, written by hand because of the no-library rule. A tab-separated line needs only "split at each tab".
- Rejected: the core writes JSON (easy) but never has to read it.

### Jest, Vitest or Playwright Test for the JavaScript

- Pros: richer output, and Playwright can drive a browser.
- Cons: packages to install. `node:test` is enough for pure functions and API calls.
- Rejected for unit and API tests. Browser tests are still missing (task C1 in [next-tasks.md](../handoff/next-tasks.md)); Playwright is the likely choice there, and that will need its own approval because it is a package.

## Consequences

- Nothing is downloaded to build or test the project.
- The test helper has no fixtures, no test filtering and no parallel runs. At 72 fast tests none of these is missed.
- On Windows with MinGW, the test program and `tracker.exe` are linked statically. Without that, the allocation counter cannot see allocations made inside the C++ library, and it reports false leaks. This is set in `core/CMakeLists.txt` with a comment.
- The sanitizer build runs only in CI, on Linux. It has passed on every pull request since 18 November 2026.
- The browser itself is tested by hand so far. What was checked is listed in [test-plan.md](../03-plan/test-plan.md).
