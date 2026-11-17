# Technical design (TRD)

**Status:** Draft, 16 November 2026, updated 18 November (version 0.3). The decisions in it are recorded in ADR-0001 to ADR-0007; those marked Proposed still need the owner's review.

This document answers: how is the app built, and why that way?

## 1. The system from outside (C4 level 1: context)

```mermaid
flowchart TB
  student([Student<br/>the only user])
  app[Student companion<br/>grades, budget, food, health]
  gemini[Google Gemini<br/>writes a study plan,<br/>reads a screenshot]
  rates[Exchange-rate service<br/>one request a day]
  monash[Monash pages<br/>grade rules, read by hand]

  student -->|enters marks, spending,<br/>meals, health numbers| app
  app -->|shows standing, verdicts<br/>and the path to the goal| student
  app -.->|only if a key is set:<br/>a short summary or a picture| gemini
  app -.->|the code MYR, nothing else| rates
  monash -.->|rules copied into the code,<br/>with sources| app
```

The dotted lines are optional or manual. With no Gemini key, the only outside request is the daily one for exchange rates, which carries no personal data ([ADR-0008](../adr/0008-exchange-rates.md)).

## 2. The parts (C4 level 2: containers)

```mermaid
flowchart LR
  student([Student])
  browser[Web app<br/>HTML, CSS, JavaScript modules<br/>runs in the browser]
  server[Backend<br/>Node, no packages<br/>one process]
  engine[tracker<br/>C++17 program<br/>started for each grade request]
  db[(SQLite file<br/>backend/data/app.db)]
  cli[tracker, terminal mode<br/>same C++ program<br/>its own save file]
  android[Android app, started<br/>Kotlin and Compose<br/>the same C++ core inside]

  student --> browser
  student --> cli
  student -.-> android
  browser -->|JSON over HTTP<br/>same address| server
  server -->|SQL| db
  server -->|text in, JSON out<br/>over standard input and output| engine
```

The Android app is dotted because it is only started: it runs the engine and shows its report, and has not yet run on a phone ([ADR-0007](../adr/0007-native-android-app.md)).

| Part | Language | Why this part exists |
|---|---|---|
| Web app | JavaScript, no framework | The screens. Phone and laptop from one codebase. |
| Backend | JavaScript on Node | Stores data, checks input, serves the web app, holds the AI key. |
| Core (`tracker`) | C++17 | Every grade rule, with hand-built data structures. |
| Database | SQLite | One file, with transactions. |
| Android app | Kotlin, with the C++ core through the NDK | The phone version, with data on the phone (v0.8). |

## 3. Inside each part (C4 level 3: components)

### Core

```mermaid
flowchart TB
  main[main.cpp<br/>picks the mode] --> cli[cli.cpp<br/>terminal menu]
  main --> report
  cli --> model
  cli --> calc
  cli --> codec
  report[report.cpp<br/>JSON report] --> calc
  report --> codec
  calc[calc.cpp<br/>standing, verdicts, GPA, CGPA, WAM, goal] --> model
  codec[codec.cpp<br/>read and write the text format] --> model
  model[model.cpp<br/>Tracker: stores and checks] --> grades[grades.cpp<br/>bands and scales]
  model --> ds[ds/<br/>DynArray, LinkedList, HashMap]
```

Arrows point from a file to what it uses. Nothing points upward, so the rules (`calc`, `model`, `grades`) do not know that a menu, a file or a web app exists.

### Backend

```mermaid
flowchart TB
  server[server.js<br/>composition root] --> config[config.js<br/>settings from the environment]
  server --> db[db.js<br/>opens SQLite, runs migrations]
  server --> store[store.js<br/>all SQL]
  server --> gemini[gemini.js<br/>the AI helper]
  server --> rates[rates.js<br/>exchange rates]
  server --> api
  api[api.js<br/>routes, input checks] --> http[http.js<br/>router, JSON, checks, static files]
  api --> domain[domain.js<br/>budget, food, health rules]
  api --> life[life.js<br/>the life tree]
  api --> engine[engine.js<br/>runs tracker --engine]
  api --> seed[seed.js<br/>example data]
  life --> domain
  seed --> domain
```

`api.js` receives the store, the engine and the AI helper as arguments. Tests hand it an in-memory database and a fake AI service. This is dependency injection, and `server.js` is the composition root.

### Web app (MVVM)

```mermaid
flowchart LR
  app[app.js<br/>start-up, events, drawing] --> screens[views/screens.js<br/>Home, Grades, Budget,<br/>Food, Health]
  app --> mapv[views/mapView.js<br/>path maps]
  mapv --> lifev[views/lifeView.js<br/>life tree]
  screens --> parts[views/parts.js<br/>shared pieces]
  app --> vm[viewmodels/appViewModel.js<br/>state and commands]
  screens --> present[viewmodels/present.js<br/>presenters]
  screens --> smap[viewmodels/spendingMap.js<br/>treemap layout]
  screens --> exp[viewmodels/expenses.js<br/>periods, month table]
  app --> cur[viewmodels/currency.js<br/>other currencies]
  lifev --> ltree[viewmodels/lifeTree.js<br/>tree layout]
  vm --> apijs[api.js<br/>the only fetch]
  vm --> ltree
```

Views turn state into HTML. Everything under `viewmodels/` is plain functions and state with no page in it, which is why it can be tested in Node without a browser. `format.js` (money, dates, escaping) is shared by both sides and left out of the picture.

The step-by-step guide is [mvvm-guide.md](../handoff/mvvm-guide.md).

## 4. How one action travels: recording a mark

```mermaid
sequenceDiagram
  actor S as Student
  participant V as View
  participant VM as ViewModel
  participant A as Backend api.js
  participant DB as SQLite
  participant E as tracker --engine

  S->>V: types 17 out of 20, presses Save
  V->>VM: saveMark(id, {score: "17", max: "20"})
  VM->>VM: turns the text into numbers
  VM->>A: PATCH /api/assessments/7
  A->>A: checks the input
  A->>DB: BEGIN, UPDATE the assessment
  A->>DB: read all academics data
  A->>E: the data as text
  E-->>A: one JSON report (standing, verdicts, GPA...)
  alt the engine found a broken rule
    A->>DB: ROLLBACK
    A-->>VM: 400 with a plain message
    VM-->>V: show the message, keep the form
  else all good
    A->>DB: COMMIT
    A-->>VM: 200 with the new report
    VM-->>V: state changed, draw again
    V-->>S: new standing and verdict
  end
```

The important part is the middle: **the change is saved only if the C++ engine accepts the result.** The backend does not know that weights cannot pass 100% or that a mark cannot be above its maximum. It asks, and rolls back if the answer is no.

## 5. Design choices and their reasons

| Choice | Reason | Cost |
|---|---|---|
| Grade rules only in C++ | One source of truth. A rule cannot drift between the terminal program and the web app. | A program is started for each grade request (a few milliseconds). |
| Engine as a separate program, not a library | No native build tooling in Node. A crash in the engine cannot take the server down. | Slower than a function call. |
| Text in, JSON out | The core needs no JSON parser. The same text is the terminal program's save file, so one parser is tested twice. | Names cannot contain tabs or line breaks (checked at the edge). |
| Pure functions for rules | Same input, same output. Tests need no database and no clock. | "Today" has to be passed in everywhere. |
| Check input at the edge | `api.js` checks types and ranges once. Code inside can trust its data. | A few range checks exist in both the API and the core. The core is the one that counts. |
| Full redraw of a screen | No framework, easy to follow. | A failed command must not redraw, or typed text is lost. |
| No packages | Nothing to install, read, pin or update. | Some code that a library would give is written by hand (router, test helper). |

## 6. The data structures

All three are in `core/include/ds/`. Each file starts with its own complexity table.

| Structure | Used for | Why this one | Main costs |
|---|---|---|---|
| `HashMap` (separate chaining, FNV-1a hash, doubles at 75% full) | Units by code. Semesters by name when grouping results. | The most common action is "find the unit with this code". | Find, add, remove: O(1) on average, O(n) worst case. Space O(n + buckets). |
| `LinkedList` (singly linked, with a tail pointer and merge sort) | A unit's assessments. Sorted lists of unit codes. | Kept in the order they were added. Adding is O(1). Merge sort relinks nodes without copying. | Add: O(1). Find, remove: O(n). Sort: O(n log n), stable. |
| `DynArray` (doubles when full) | Finished results. Fields of a split line. The JSON writer's nesting. | Only added to and read from start to end. Items sit together in memory. | Read: O(1). Add: O(1) amortised. Remove: O(n). At most 2x the space. |

At real sizes (a few dozen units) no choice here changes what the user feels. The point is that each choice can be stated and defended. Measured costs on large generated data are in [core/README.md](../../core/README.md#measured-do-the-costs-hold).

## 7. What is not built

| Planned | State | Version |
|---|---|---|
| Real AI features (study plan, screenshot import, spending advice) | Built and tested with a fake AI service; never run against the real one | 0.6 |
| Hosting, login and cloud storage (AWS: Lambda, DynamoDB, Cognito, CDK) | Not built. A single access token exists for use on a home network. Guide: [aws-setup.md](../handoff/aws-setup.md) | 0.7 |
| Offline-first with sync | Not built. The service worker opens the app offline, but data needs the server. | 0.7 |
| Importing bank statements | Not built. Statements were read once by scripts kept outside the repository. | 0.7 |
| The Android app and Health Connect | Started (see section 2). Health numbers are typed in. | 0.8 |
| Structured logs and alerts | Partly: one JSON line per API call, with no request bodies. No metrics or alerts. | 0.7 |

## 8. How to run, build and test

See the [README](../../README.md). One command checks everything: `python tools/check.py`.
