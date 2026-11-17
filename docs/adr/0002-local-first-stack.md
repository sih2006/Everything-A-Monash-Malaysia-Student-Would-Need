# ADR-0002: Run locally first, with a Node backend and SQLite

## Status

Proposed. Decided by Claude during the one-day build sprint on 16 November 2026, when the owner asked for everything to be built without questions. The owner has not reviewed it yet.

## Date

2026-11-16

## Context

The owner asked for a working app (database, backend, frontend) before any cloud account exists. So the first version had to run on one laptop with nothing to sign up for.

What mattered:

- No accounts and no cost. AWS, Supabase and similar all need a sign-up.
- Nothing to install beyond what the laptop already has: a C++ compiler, CMake, Python and Node 24.
- The C++ core must hold the grade rules ([ADR-0001](0001-cpp-core-for-academics-tracker.md)), so the backend needs a way to call C++.
- The earlier plan was AWS Lambda with DynamoDB. The local version should not make that move harder.
- The owner must be able to read and explain every line. Fewer moving parts is better.

## Decision

1. **The backend is one Node program with no packages.** It uses only what comes with Node: `node:http` for the server, `node:sqlite` for the database and `node:test` for tests.
2. **Data is kept in one SQLite file** (`backend/data/app.db`).
3. **The backend calls the C++ core as a separate program.** It writes the stored data as text, runs `tracker --engine`, and reads one JSON report back.
4. **All SQL is in one file** (`backend/src/store.js`) and **all rules are pure functions** (`backend/src/domain.js`), so the storage can be swapped later without touching the rules or the API.

## Alternatives considered

### AWS Lambda and DynamoDB from the start

- Pros: it is the target in the engineering principles, and it costs almost nothing at one user.
- Cons: it needs an account and a card before a single line can be tested. Nothing could have been built or proven during the sprint.
- Rejected for now. It is the next step, described in [aws-setup.md](../handoff/aws-setup.md) and [ADR-0005](0005-hosting.md).

### A backend written in C++

- Pros: one language for core and backend.
- Cons: a hand-written web server, JSON parser and database layer in C++ is weeks of work and a large area for security bugs. None of it would show the data-structure skills the C++ part is for.
- Rejected: the C++ effort is better spent on the core.

### Express, Fastify or another web framework

- Pros: less code for routing and input checking.
- Cons: dozens of packages from strangers, each one to read, pin and keep updated. The whole API is about 40 routes, which a 100-line router handles.
- Rejected: the cost of the dependency is larger than the code it saves here.

### Compile the core to WebAssembly and run it in the browser

- Pros: no separate program to start, and the rules could run offline in the browser.
- Cons: the Emscripten toolchain is not installed and is large. The backend would still need the rules to check changes before saving them.
- Rejected for now. Still a good option for an offline phone app later.

### Linking the core into Node as a native add-on

- Pros: faster than starting a program for each request.
- Cons: needs `node-gyp` and build tooling per platform, and a crash in the add-on takes the whole server down.
- Rejected: starting the program takes a few milliseconds, which one user will never notice.

### A JSON file instead of SQLite

- Pros: nothing to learn.
- Cons: no transactions. A change that the engine rejects could not be rolled back cleanly, and a crash mid-write could damage the file.
- Rejected: transactions are what make "the engine decides what is valid" safe.

## Consequences

- The app runs with three commands and no sign-up.
- `node:sqlite` is still marked experimental in Node 24, so Node prints a warning when the server starts. If its interface changes in a later Node version, only `backend/src/db.js` and `store.js` need attention.
- Starting a program per request would be too slow for many users. For one user it is fine. If that ever changes, the engine can be kept running and fed requests one line at a time; the text format already allows it.
- Moving to DynamoDB means rewriting `store.js` only. The SQL design does not carry over, because DynamoDB is designed from the queries, so that work starts from the list of queries in [backend-schema.md](../02-design/backend-schema.md).
- There is no login. The server only answers the laptop itself unless `HOST` is changed, and then `APP_TOKEN` is required. A real login is part of the hosting work.
