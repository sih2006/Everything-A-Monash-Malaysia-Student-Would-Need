# UML diagrams

**Status:** Draft, 16 November 2026, updated 18 November. The diagrams show the code as built at version 0.3.

Each diagram answers one question. The architecture-level pictures (context, containers, components) are in the [technical design](trd.md).

## 1. Class diagram: what are the main types in the core?

```mermaid
classDiagram
  class Tracker {
    +margin: double
    +current_term: string
    +goal: Goal
    +add_unit(code, name, credit, term) Status
    +set_target(code, mark) Status
    +set_pass_fail(code, pass_fail) Status
    +add_assessment(code, id, name, weight) Status
    +set_mark(code, id, score, max) Status
    +set_hurdle(code, id, percent) Status
    +add_result(code, name, credit, mark, grade, term) Status
    +set_goal(measure, value, total) Status
    +find_unit(code) Unit
    +sorted_codes() LinkedList~string~
    -units_: HashMap~Unit~
    -results_: DynArray~Result~
  }
  class Unit {
    +code: string
    +name: string
    +term: string
    +credit: double
    +has_target: bool
    +target: double
    +pass_fail: bool
    +assessments: LinkedList~Assessment~
    +total_weight() double
  }
  class Assessment {
    +id: string
    +name: string
    +weight: double
    +done: bool
    +score: double
    +max: double
    +has_hurdle: bool
    +hurdle: double
    +percent() double
  }
  class Result {
    +code: string
    +credit: double
    +mark: double
    +has_grade: bool
    +grade: Grade
    +final_grade() Grade
  }
  class Goal {
    +set: bool
    +measure: string
    +value: double
    +total_credits: double
  }
  class Standing {
    +earned: double
    +average: double
    +need: double
    +possible: bool
    +realistic: bool
    +on_course: bool
    +verdict: string
  }
  class Totals {
    +credits: double
    +add(code, credit, mark, grade)
    +gpa() double
    +cgpa() double
    +wam() double
  }
  class Scheme {
    +id: string
    +points: double[8]
  }
  class Grade {
    <<enumeration>>
    HD
    D
    C
    P
    NP
    N
    NH
    WN
  }

  Tracker "1" *-- "0..*" Unit : owns, by code
  Tracker "1" *-- "0..*" Result : owns
  Tracker "1" *-- "1" Goal
  Unit "1" *-- "0..*" Assessment : owns, in order
  Result --> Grade
  Totals ..> Scheme : uses both scales
  Standing ..> Unit : worked out from
```

How to read it:

- A filled diamond means "owns": when a `Unit` is removed, its assessments go with it.
- A dotted arrow means "uses": `Standing` is a result worked out from a `Unit`. It is not stored.
- Every method on `Tracker` that changes something returns a `Status`: empty when it worked, or a sentence saying what was wrong. This is **encapsulation**: no other code can put the tracker into an invalid state, because the fields that matter are private.
- `Scheme` is the **Strategy** idea in its simplest form: the same sum works for either scale, because the scale is passed in as data.
- A unit with `pass_fail` set is left out of `Totals` entirely, so it can never change GPA, CGPA or WAM.

## 2. State diagram: what states can a unit's target be in?

```mermaid
stateDiagram-v2
  [*] --> NoTarget: unit added
  NoTarget --> OnCourse: target set, need is within average + 10
  NoTarget --> NotRealistic: target set, need is higher than that
  NoTarget --> OutOfReach: target set, need is above 100%

  OnCourse --> NotRealistic: a low mark raises the need
  NotRealistic --> OnCourse: a high mark lowers the need
  NotRealistic --> OutOfReach: need passes 100%
  OnCourse --> OutOfReach: need passes 100%
  OnCourse --> Secured: marks earned reach the target, no hurdle open

  OnCourse --> HurdleFailed: a mark is below its hurdle
  NotRealistic --> HurdleFailed: a mark is below its hurdle
  OutOfReach --> HurdleFailed: a mark is below its hurdle
  Secured --> [*]: unit finished

  OutOfReach --> OnCourse: the user lowers the target
  NotRealistic --> OnCourse: the user lowers the target
  OnCourse --> NoTarget: target removed
  HurdleFailed --> OnCourse: the mark is corrected
```

These are the same states the presenter names: `no-target`, `on-course`, `not-realistic`, `out-of-reach` and `failed`. "Secured" is shown as a chip on an on-course unit. A unit marked pass or fail only has none of these states: its verdict is just pass or fail on the average so far.

The app never stores the state. It is worked out from the marks every time, so it cannot be stale.

## 3. State diagram: a screenshot import

```mermaid
stateDiagram-v2
  [*] --> Idle
  Idle --> Reading: user picks a picture and presses Read
  Reading --> Reviewing: the AI returned a list
  Reading --> Idle: the AI failed. A message is shown, nothing changed
  Reviewing --> Idle: user presses Cancel. Nothing saved
  Reviewing --> Saving: user ticks rows, corrects them, presses Save
  Saving --> Idle: the kept rows are saved as assessments
  Saving --> Reviewing: a row was refused. The message says which
```

The point of this diagram: there is **no arrow from Reading to Saving**. What the AI reads can only be saved by going through the user.

## 4. Sequence diagram: opening the app

```mermaid
sequenceDiagram
  actor S as Student
  participant B as Browser
  participant A as Backend
  participant DB as SQLite
  participant E as tracker --engine

  S->>B: opens the address
  B->>A: GET / and the scripts and styles
  A-->>B: the web app
  B->>A: GET /api/overview
  A->>DB: read academics data
  A->>E: the data as text
  E-->>A: the grades report
  A->>DB: read this month's spending, today's food, this week's health
  A->>A: work out the budget, food and health summaries
  A-->>B: one answer with all four parts
  B->>B: presenters turn it into text, the view draws the home screen
  B-->>S: "Two of your four units are on course."
```

Recording a mark is drawn in the [technical design](trd.md#4-how-one-action-travels-recording-a-mark).

## 5. Activity diagram: what happens when a mark is entered in the terminal program

```mermaid
flowchart TD
  start([Choose 4: Record a mark]) --> hasUnits{Any units?}
  hasUnits -- no --> tell1[Say: add a unit first] --> menu([Back to the menu])
  hasUnits -- yes --> pickUnit[Show the units, ask for one]
  pickUnit --> validUnit{A number in the list<br/>or a known code?}
  validUnit -- empty --> menu
  validUnit -- no --> pickUnit
  validUnit -- yes --> hasA{Any assessments?}
  hasA -- no --> tell2[Say: add an assessment first] --> menu
  hasA -- yes --> pickA[Show them, ask for a number]
  pickA --> askMax[Ask: marks available, Enter for 100]
  askMax --> askScore[Ask: your mark]
  askScore --> inRange{From 0 to the<br/>marks available?}
  inRange -- no --> askScore
  inRange -- empty --> menu
  inRange -- yes --> store[Tracker.set_mark]
  store --> save[Write the file safely,<br/>keep the old one as a backup]
  save --> show[Show the new standing and verdict] --> menu
```

Every "no" loops back to the same question, and an empty answer always cancels. That is why wrong input cannot crash the program or leave half an action done.

## 6. Deployment diagram: what runs where today

```mermaid
flowchart TB
  subgraph laptop [The owner's laptop, Windows]
    subgraph browser [Browser]
      web[Web app<br/>+ service worker]
    end
    subgraph node [Node process, 127.0.0.1:8080]
      backend[Backend]
    end
    engine[tracker.exe<br/>started per request]
    file[(backend/data/app.db<br/>the owner's real data)]
    envf[.env]
    web <-->|HTTP| backend
    backend <--> file
    backend <-->|pipes| engine
    envf -.-> backend
  end
  backend -.->|HTTPS, optional| g[Google Gemini]
  subgraph github [GitHub: code only, no personal data]
    repo[Repository]
    ci[Actions: CI<br/>builds and tests on Linux]
    sync[Actions: backlog sync<br/>PRD and backlog to issues]
    board[Project board<br/>and releases]
    repo --> ci
    repo --> sync --> board
  end
  laptop -->|git push, pull requests| repo
```

Only code and documents go to GitHub. The database, the `.env` file and anything read from the owner's statements stay on the laptop; git ignores them. The planned cloud layout is drawn in [aws-setup.md](../handoff/aws-setup.md).

## 7. Activity diagram: how an account balance is worked out

```mermaid
flowchart TD
  start([Work out an account]) --> sort[Take its moves in order:<br/>by day, then in the order typed]
  sort --> next{Another move?}
  next -- no --> done([The balance])
  next -- yes --> kind{What kind?}
  kind -- set --> set[Balance = the amount typed.<br/>Everything before it stops counting]
  kind -- in --> add[Balance + amount]
  kind -- out --> sub[Balance - amount]
  set --> next
  add --> next
  sub --> next
```

The balance is never stored; it is worked out from the moves every time. Spending paid from an account adds an `out` move, and a move between two of your own accounts adds an `out` and an `in`, both marked as a transfer so they never count as spending or income.

This rule once took the moves in the order they were typed instead of by day. A balance set for 1 January, typed after the January top-ups, then wiped those top-ups out. It was found by loading real bank statements, and a test now covers it.

## 8. Patterns used, and where

| Pattern | Problem it solves here | Where |
|---|---|---|
| **Repository** | Hide where data is stored | `backend/src/store.js`: every SQL statement, behind plain function names |
| **Strategy** | Swap one set of values for another behind one calculation | `Scheme` in `grades.hpp`: the standard and Malaysia scales |
| **Adapter** | Wrap an outside thing in an interface the app owns | `engine.js` wraps the C++ program; `gemini.js` wraps Google's API |
| **Observer** | Let the screen react to a change without the changer knowing about the screen | `onChange` in `appViewModel.js`, drawn by `app.js` |
| **Composition root** | Put the real parts together in one place | `backend/src/server.js` and `web/js/app.js` |
| **MVVM** | Keep screen logic testable without a screen | `web/js/` |
| **Dependency injection** | Let tests swap a part for a fake | `createApp({ db, store, engine, gemini, today })`, `createAppViewModel({ api, storage })` |

Patterns from the engineering principles that were **not** needed and so were not built: a State class for the penguin egg (there is no mascot art yet), and a Factory for mascots.
