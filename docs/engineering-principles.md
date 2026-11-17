# Engineering principles

This document lists the principles and practices this project follows, where each one shows up in the app, and why it was chosen. Every entry has a status:

- **Applied**: visible in the repository now, with a link to the evidence.
- **Planned**: the intended approach, confirmed or changed in the document named next to it.

When a Planned entry is put into practice, its status changes to Applied with a link to the commit, pull request or file that shows it. The app now exists (versions 0.1 to 0.3), so most entries are Applied.

**Status of this document:** In review.

> **Note added on 17 November 2026: parts of this document are out of date.** It was written when the plan was Expo with TypeScript on AWS. The app was then built differently, in one day:
>
> | This document says | What was built |
> |---|---|
> | The core is pure TypeScript | The grade core is C++17 ([ADR-0001](adr/0001-cpp-core-for-academics-tracker.md)) |
> | React components with a state library | A web app with no framework, MVVM by hand ([ADR-0003](adr/0003-web-app-without-a-build-step.md)) |
> | AWS Lambda, DynamoDB, Cognito, CDK | A local Node backend with SQLite. AWS is not built ([ADR-0002](adr/0002-local-first-stack.md), [ADR-0005](adr/0005-hosting.md)) |
> | Offline-first with sync | Not built. The screens open offline; the data needs the server |
> | Grades use HD 4, D 3, C 2, P 1, N 0 | Two scales, both different from that ([ADR-0004](adr/0004-grade-scales-and-rules.md)) |
> | `GradingScheme`, `MoodRule`, `AdviceProvider`, `HealthSource` interfaces | Only the grade scale is swappable (as data). The AI helper is swappable by handing a different object to the app. The others were not needed and were not built. |
>
> The principles themselves still hold, and most are now **Applied** with evidence: layered design, MVVM, pure functions for rules, repository, dependency injection, a composition root, checks at the edge, the test pyramid, black-box test design, least data to the AI, secrets out of the repository. Where each one shows in the code is listed in the [technical design](02-design/trd.md) and the [UML set](02-design/uml.md#8-patterns-used-and-where).
>
> On 17 and 18 November 2026 every entry below was updated to say what was built, with links. Where the text of a principle still describes the old plan (TypeScript, AWS), its status line says what changed.

## Contents

1. [Planning and requirements](#1-planning-and-requirements)
2. [Modelling and diagrams](#2-modelling-and-diagrams)
3. [Architecture](#3-architecture)
4. [Object-oriented design (SOLID)](#4-object-oriented-design-solid)
5. [Other design principles](#5-other-design-principles)
6. [Design patterns](#6-design-patterns)
7. [Testing](#7-testing)
8. [Security and privacy](#8-security-and-privacy)
9. [Workflow and version control](#9-workflow-and-version-control)
10. [UX and accessibility](#10-ux-and-accessibility)
11. [Cost and operations](#11-cost-and-operations)
12. [AI-assisted development](#12-ai-assisted-development)
13. [When principles conflict](#13-when-principles-conflict)

## 1. Planning and requirements

### Spec before code
Write down what to build, for whom, and how to tell it is done, before writing any code.
- **Here:** a 13-document planning stage, listed in the [planning hub](README.md). The plan was to write no code until it was approved; on 16 November 2026 the owner chose to build first, and the documents were then brought up to date with the code.
- **Why:** misunderstandings are cheapest to fix on paper, and every later test needs a written requirement to check against.
- **Status:** Applied ([planning hub](README.md)).

### Modular decomposition
Split the system into modules with one responsibility each and one-way dependencies, before specifying any of them.
- **Here:** ten modules with permanent ids in the [capability map](00-concept/capability-map.md).
- **Why:** boundaries decided up front keep modules independently buildable and testable, allow building in slices, and stop dependency cycles from forming.
- **Status:** Applied ([capability map](00-concept/capability-map.md)).

### Explicit assumptions
List every assumption and get it approved, instead of filling gaps silently.
- **Here:** the eleven assumptions in the capability map were proposed, reviewed and approved on 2 October 2026. From the concept brief onwards, each planning document starts with an interview, one question at a time.
- **Why:** unstated assumptions are the most common way of building the wrong thing.
- **Status:** Applied ([assumptions](00-concept/capability-map.md#assumptions-this-map-rests-on)).

### Requirement IDs and traceability
Every requirement gets a stable ID that tests, issues and commits refer back to.
- **Here:** IDs such as `ACA-01` (academics) and `BUD-03` (budget) in the PRD. The test plan's traceability matrix maps every ID to its test cases.
- **Why:** proves that every requirement is tested and every test has a reason to exist, and makes scope creep visible.
- **Status:** Applied. Black-box tests and commits name the story they check ([test plan, traceability table](03-plan/test-plan.md#3-traceability-which-test-proves-which-story), [core/tests/blackbox.py](../core/tests/blackbox.py)).

### Architecture Decision Records (ADRs)
A short record for each significant decision: the context, the options considered, the decision and its consequences.
- **Here:** `docs/adr/`, starting with ADR-0001 on the stack (Expo vs Kotlin Multiplatform vs Flutter). Later ADRs cover AWS vs Supabase, web hosting and state management.
- **Why:** records why, including the rejected options, so a decision can be revisited with its context instead of being argued again from memory.
- **Status:** Applied ([docs/adr/](adr/): eight records). Numbers 0002 to 0006, and part of 0007, were taken during the build without the owner and are marked Proposed. The comparison named above (Expo vs Kotlin Multiplatform vs Flutter) is in ADR-0001 and ADR-0003.

### Docs as code, kept alive
Documentation lives in the repository as Markdown, is reviewed in pull requests like code, and is updated with a change log when reality changes.
- **Here:** everything in `docs/`. Approved documents end with a change log.
- **Why:** the docs stay in step with the code, and the history shows how the thinking developed.
- **Status:** Applied ([capability map change log](00-concept/capability-map.md#change-log)).

## 2. Modelling and diagrams

Every diagram is drawn to answer one question, and a diagram type is only used once there is a question for it.

| Diagram | Question it answers | In this app | Where | Status |
|---|---|---|---|---|
| Module dependency graph | What depends on what? | The ten modules and their one-way dependencies | [Capability map](00-concept/capability-map.md#dependency-graph) | Applied |
| UML use-case diagram | Who does what with the system? | The student and Gemini, and 18 use cases | [Use cases](01-requirements/use-cases.md) | Applied (drawn in Mermaid; the draw.io version is not done) |
| Flowchart (UML activity diagram) | Which steps does a task take, including the branches? | First run, a new mark, adding spending, the map; entering a mark in the terminal | [App flow](02-design/app-flow.md), [UML set](02-design/uml.md#5-activity-diagram-what-happens-when-a-mark-is-entered-in-the-terminal-program) | Applied |
| C4 context, container and component diagrams | How is the system put together, at each zoom level? | Browser, Node backend, C++ engine, SQLite, Gemini | [TRD](02-design/trd.md) | Applied |
| UML class diagram | What are the main types and how do they relate? | Tracker, Unit, Assessment, Result, Goal, Standing, Totals, Scheme | [UML set](02-design/uml.md#1-class-diagram-what-are-the-main-types-in-the-core) | Applied |
| UML sequence diagram | In what order do the parts talk to each other? | Recording a mark, opening the app | [TRD](02-design/trd.md#4-how-one-action-travels-recording-a-mark), [UML set](02-design/uml.md) | Applied |
| UML state machine diagram | Which states can something be in, and what moves it between them? | A unit's target; a screenshot import | [UML set](02-design/uml.md#2-state-diagram-what-states-can-a-units-target-be-in) | Applied. Mascot moods and sync wait for the art and for hosting |
| UML deployment diagram | What runs where? | The laptop today; AWS planned | [UML set](02-design/uml.md#6-deployment-diagram-what-runs-where-today), [aws-setup.md](handoff/aws-setup.md) | Applied |
| Entity-relationship diagram | How is the data structured and related? | The SQLite tables; a DynamoDB sketch | [Backend schema](02-design/backend-schema.md) | Applied |
| Data-flow diagram | Where does sensitive data travel? | Laptop, browser, engine and Gemini | [Security and privacy](02-design/security-privacy.md#2-where-data-travels) | Applied |

- **Why UML:** it is a standard notation. A reviewer who has never seen the project can read a sequence diagram without a walkthrough, and drawing one often exposes a design flaw, such as a missing step or a circular call, before any code exists.
- **Why C4 for architecture:** UML has no standard way to zoom in and out. C4 gives fixed levels (system context, containers, components, code), so each architecture diagram stays readable.
- **Why Mermaid and draw.io:** Mermaid diagrams are plain text, so they can be reviewed line by line in pull requests and render directly on GitHub. draw.io covers what Mermaid draws poorly (use-case and deployment diagrams, AWS icons), and its `.drawio.svg` files stay editable while displaying as images.

## 3. Architecture

### Layered (clean) architecture
The code is split into layers and dependencies only point inwards: UI -> ViewModels -> domain <- data. The domain layer holds the business rules and imports nothing from React, Expo, AWS or the database.
- **Here:** `gpa` and `mood-engine` are pure TypeScript. The data layer implements interfaces that the domain defines.
- **Why:** the rules that matter most (GPA maths, mood rules) can be tested in milliseconds without a phone, and the UI or database can change without touching them.
- **Status:** Applied, with a change: the domain is C++ (`core/`) and the backend's pure rules (`backend/src/domain.js`), not TypeScript. Nothing in either imports a web framework or a database ([trd.md](02-design/trd.md#3-inside-each-part-c4-level-3-components)).

### MVVM (Model-View-ViewModel)
Views only display state and pass on user actions. ViewModels hold each screen's state and logic. The Model is the domain and data layers.
- **Here:** React components are the Views. Each screen gets a ViewModel written as plain TypeScript with no React imports, connected to its component through a small hook. The state-management library is chosen in an ADR.
- **Why:** screens stay thin, and a ViewModel can be unit-tested without rendering anything. It is also the architecture Google recommends for Android apps, so the reasoning carries over to native work.
- **Status:** Applied, with no state library: the ViewModel is plain JavaScript in `web/js/viewmodels/` and is drawn by `web/js/app.js` ([mvvm-guide.md](handoff/mvvm-guide.md), [ADR-0003](adr/0003-web-app-without-a-build-step.md)). 40 ViewModel tests run with no browser.

### Contract-first module boundaries
The interface between two modules (types and expected behaviour) is written before either side is built, and it belongs to the module that provides it.
- **Here:** the `gpa` section of the PRD defines what `academics` may call. The rule is already part of the [capability map](00-concept/capability-map.md#rules-for-module-boundaries).
- **Why:** both sides can be built and tested independently against the same contract, and breaking changes show up as contract changes.
- **Status:** Applied. The engine's text format and JSON report are the contract between the C++ core and the backend ([codec.hpp](../core/include/tracker/codec.hpp)), and the API is listed in [backend-schema.md](02-design/backend-schema.md#2-the-api).

### Offline-first
The phone's local database is the source of truth for the UI. The network is used to sync, not to function.
- **Here:** logging a mark or an expense works with no signal, and `sync` catches up with the cloud later.
- **Why:** campus Wi-Fi and mobile data are unreliable, and the app must never lose an entry or block on a loading spinner.
- **Status:** Not built. The app's screens open offline through a service worker, but its data needs the server. Waits for the hosting decision ([ADR-0005](adr/0005-hosting.md)).

### Backend proxy for third-party APIs
The app never calls Gemini or YouTube directly. It calls this project's backend, which holds the API keys.
- **Here:** an AWS Lambda function behind `advisor`.
- **Why:** anything shipped inside an app or website can be extracted, so keys in the client would leak. The proxy also allows rate limiting, caching and switching AI provider without releasing a new version of the app.
- **Status:** Applied, locally: `backend/src/gemini.js` holds the key; the browser never sees it, and a test checks this. Not yet on AWS Lambda.

### Serverless backend
Managed services billed per request (Lambda, DynamoDB, Cognito) instead of servers that run all the time.
- **Here:** one user makes a few thousand requests a month, far inside the free tiers.
- **Why:** about RM0 a month at this scale, no servers to patch, and no redesign needed if more users ever join.
- **Status:** Not built. The backend runs on the laptop ([ADR-0002](adr/0002-local-first-stack.md)); hosting is [ADR-0005](adr/0005-hosting.md), with no decision yet.

### Access-pattern-first data design
With DynamoDB, list the queries the app needs first, then design the keys around them.
- **Here:** queries such as "all assessments for a unit this semester" and "spending by category this month" decide the key structure.
- **Why:** DynamoDB is fast and cheap only when its keys match the queries. Designing tables first, the relational-database habit, leads to slow and expensive scans.
- **Status:** Planned, and prepared: the questions the app asks of its data and a one-table DynamoDB sketch are in [backend-schema.md](02-design/backend-schema.md#3-the-questions-the-app-asks-its-data).

## 4. Object-oriented design (SOLID)

The UI uses React's functional style, which is the idiomatic way to write React. Object-oriented design is used where state and behaviour belong together and where the system is expected to grow: the domain, data and ViewModel layers. The SOLID principles apply to both styles.

### Single responsibility principle
Each class or module has one reason to change.
- **Here:** `gpa` only knows grading rules. It does not store marks or draw anything. A transaction repository only stores and loads transactions; categorising them is a separate service.
- **Why:** changes stay local. When Monash changes a grading rule, one module changes and its tests show that nothing else broke.
- **Status:** Applied at module and file level: `grades.cpp` only knows grade rules, `store.js` only stores, `domain.js` only works things out ([uml.md](02-design/uml.md)).

### Open/closed principle
Open for extension, closed for modification: adding behaviour means adding new code, not editing code that already works and is tested.
- **Here:** extension points sit only where variation is expected:
  - `GradingScheme`: Monash GPA, WAM and any future grading scale are separate implementations of one interface.
  - `MoodRule`: each module gives the shared mood engine its own rules, so adding nutrition moods never touches budget moods.
  - `AdviceProvider`: Gemini today, another AI model later.
  - `HealthSource`: Health Connect now, other sources later.
- **Why:** this is what "leaving it open for improvement" means in practice. New features plug in without risking existing behaviour.
- **Status:** Partly applied. Only two extension points were needed: the grade scale (`Scheme`, swapped as data) and the AI helper (any object with `plan` and `readScreenshot`). `MoodRule` and `HealthSource` were not needed yet, so by YAGNI they were not built.

### Liskov substitution principle
Any implementation of an interface must work wherever that interface is expected, without surprises.
- **Here:** the in-memory repository used in tests must behave exactly like the real database one: same ordering, same errors. One shared set of contract tests runs against every implementation.
- **Why:** if a test double behaves differently from the real thing, the tests pass while the app breaks.
- **Status:** Not applied yet. There is only one store, so there is nothing to compare. The contract tests are planned with the DynamoDB store ([aws-setup.md](handoff/aws-setup.md)). segregation principle
Depend on small, focused interfaces, not large ones full of methods you don't use.
- **Here:** `advisor` receives a read-only summary interface from each module, not the full repositories with their write and delete methods.
- **Why:** small interfaces are easier to replace in tests, and they limit what a module can do by accident. The AI module has no way to delete a transaction.
- **Status:** Applied in spirit: the AI helper receives only a short summary built in `api.js`, not the store. It has no way to write data.

### Dependency inversion principle
High-level logic depends on abstractions, not on concrete technology. The concrete implementations are passed in from outside (dependency injection).
- **Here:** ViewModels and domain services depend on interfaces such as `UnitRepository` and `AdviceProvider`. One composition root wires in the real database, AWS and Gemini implementations when the app starts.
- **Why:** tests swap in fakes, the AWS vs Supabase decision can change without touching business logic, and each part can be built on its own.
- **Status:** Applied: `createApp({ db, store, engine, gemini, today, now })` and `createAppViewModel({ api, storage })` receive their parts, and `backend/src/server.js` and `web/js/app.js` are the composition roots. Tests pass in an in-memory database, a fake clock and a fake AI service.

## 5. Other design principles

**Separation of concerns.** Display lives in the UI, screen logic in ViewModels, rules in the domain and storage in the data layer, so each can be understood, tested and replaced on its own. *Applied ([trd.md](02-design/trd.md)).*

**Encapsulation.** Objects protect their own rules. A `Unit` only accepts assessments through a method that checks the weights add up to at most 100%, so an invalid unit cannot exist. Each rule is enforced in one place instead of being checked everywhere. *Applied: every change to a `Tracker` goes through a method that checks it ([model.cpp](../core/src/lib/model.cpp)), and the backend rolls a change back if the engine rejects it.*

**Composition over inheritance.** Each mascot is assembled from parts (an art set, a mood mapping, a set of reactions) instead of a `Mascot` base class that the penguin egg, crab and Joel override. Hierarchies become fragile as they grow, while parts can be mixed freely. *Planned: there is no mascot art yet, so nothing was built.*

**Pure functions in the core.** GPA calculation and mood evaluation depend only on their inputs and change nothing outside themselves. Same input, same output: easy to test, safe to run on the phone or the server, and easy to reason about. *Applied ([calc.cpp](../core/src/lib/calc.cpp), [domain.js](../backend/src/domain.js)): even "today" is passed in.*

**DRY (don't repeat yourself), with the rule of three.** Each rule has one source of truth. Monash's grade bands are defined once and used by the calculator, the UI and the tests. Similar-looking code is only merged once a third case shows what the real abstraction is, because the wrong abstraction costs more than a little duplication. *Applied: every grade rule lives only in the C++ core, and the backend and web app ask it ([AGENTS.md](../AGENTS.md)).*

**KISS (keep it simple).** Choose the simplest design that meets the requirement. For example, there is one user, so there is no permission system for multiple users. *Applied ([assumptions](00-concept/capability-map.md#assumptions-this-map-rests-on)).*

**YAGNI (you aren't gonna need it).** Nothing is built for an imagined future. Extension points exist only where the open/closed section lists them, and possible extra modules (timetable, deadlines, reminders) wait until the concept brief decides on them. Every code review includes an over-engineering check. *Applied ([capability map](00-concept/capability-map.md#candidates-not-yet-in-scope)).*

**Validate at the boundaries, fail fast.** Input is checked where it enters the system (forms, API handlers) against a schema, and rejected with a clear error near its source. Inside the core, data can then be trusted. *Applied ([http.js](../backend/src/http.js) `check`, and the import checks every row of a file).*

## 6. Design patterns

Patterns are used only where they solve a problem this app actually has.

| Pattern | Problem it solves here | Where |
|---|---|---|
| Strategy | Swap one set of rules for another behind a single interface | Grading schemes, mood rules |
| Repository | Hide where data is stored (local database, DynamoDB, in memory for tests) | The data layer of every module |
| Adapter | Wrap an outside service in an interface this app owns | Gemini, YouTube, Health Connect, the food database |
| Observer | Let one part react to changes in another without knowing its details | Mood changes reaching the mascot; ViewModels updating the UI |
| State | Behaviour depends on the current state, with explicit transitions | The penguin egg's life cycle, sync status |
| Factory | Create the right object without callers knowing the concrete type | Building mascots, picking a grading scheme |
| Composition root | Wire every concrete implementation together in one place | App start-up |

All patterns are Planned and get confirmed in the UML design set.

## 7. Testing

### V-model
Each planning document drives one level of testing, so tests are designed from requirements, not reverse-engineered from code.
- **Here:** PRD acceptance criteria drive black-box system tests, the TRD drives integration tests, and the UML set and schema drive unit tests.
- **Status:** Applied as the plan ([planning hub](README.md#how-planning-connects-to-testing)).

### Test pyramid
Many fast unit tests, fewer integration tests, and a handful of end-to-end tests for the critical journeys.
- **Why:** unit tests give feedback in seconds. End-to-end tests are slow and more brittle, so they cover only what matters most, such as logging a mark and seeing the egg react.
- **Status:** Applied: about 120 fast unit tests, about 60 integration tests and a small set of browser checks ([test-plan.md](03-plan/test-plan.md#1-the-levels-of-testing)).

### Test-driven development (white-box)
Write a failing test, make it pass, then tidy the code (red, green, refactor).
- **Here:** mandatory for `gpa` and `mood-engine`, where correctness is the whole point.
- **Why:** the tests become a precise, executable statement of the rules, and refactoring is safe.
- **Status:** Partly applied. The core has 75 white-box tests, each with hand-worked numbers. They were written in the same sitting as the code, not always strictly before it.

### Black-box test design
Test cases come from the requirements alone, without looking at the code:
- **Equivalence partitioning:** one test per group of inputs that should behave the same, for example any mark from 80 to 100 is an HD.
- **Boundary value analysis:** tests at the edges where behaviour changes, for example marks of 49 and 50, 59 and 60, 69 and 70, 79 and 80, and spending exactly at the budget limit.
- **Decision tables:** every combination of conditions that affects a result, for example over or under budget, early or late in the month, and the resulting mood.
- **State transition testing:** every valid and invalid move in the penguin egg's life cycle.
- **Status:** Applied: 31 black-box tests of the terminal program, each named by story and method ([test-plan.md](03-plan/test-plan.md#2-how-black-box-test-cases-were-designed)). The grade boundaries come from Monash's pages ([grade-rules.md](02-design/grade-rules.md)) but still need checking against a real result.

### Contract tests
One set of tests runs against every implementation of an interface (see the Liskov substitution principle), so fakes cannot drift from the real thing. *Planned with the second store.*

### User acceptance testing
Two weeks of real daily use, checked against the PRD's success criteria, before the first release. *Planned (test plan).*

### Continuous integration quality gates
Every pull request runs the tests, and cannot be merged while any of them fail. *Applied: [ci.yml](../.github/workflows/ci.yml) runs every suite on Linux, with the memory checkers on, on every pull request and every push to `main` ([runs](https://github.com/sih2006/Everything-A-Monash-Malaysia-Student-Would-Need/actions)). Blocking a merge on a red run needs the owner to protect `main` (task A7). There is no linter or type checker, because the project has no packages.*

## 8. Security and privacy

**Secrets never in the app or the repository.** API keys live only on the backend, in AWS Systems Manager Parameter Store (free, unlike Secrets Manager). `.env` files are ignored by git from day one. *Applied ([.gitignore](../.gitignore), [.env.example](../.env.example), a secret check in [ci.yml](../.github/workflows/ci.yml)). On a laptop the key is in `.env`; Parameter Store is for the cloud.*

**Least privilege.** Each AWS function gets only the permissions it needs. For example, the advice function can read summaries but cannot write or delete anything. *Planned for AWS. Locally, the AI helper has no write path at all.*

**Data minimisation.** The AI receives summaries, not raw records, because Gemini's free tier may use prompts to improve Google's products. *Applied: a test reads what is sent ([api.test.js](../backend/test/api.test.js)).*

**Threat modelling with STRIDE.** Each data flow is checked for spoofing, tampering, repudiation, information disclosure, denial of service and elevation of privilege. *Applied ([security-privacy.md](02-design/security-privacy.md#3-what-could-go-wrong-and-what-stops-it-stride)).*

**Privacy by design.** Grades, spending and health data are sensitive, so the principles of Malaysia's Personal Data Protection Act 2010 (clear purpose, limited retention, user control) are followed even though the only user is the developer. *Applied: data stays on the laptop, hide grades, delete everything, and export ([security-privacy.md](02-design/security-privacy.md#4-the-user-stays-in-control)).*

**Supply-chain hygiene.** Third-party code is read before it is added, pinned to a specific commit, and its licence recorded. Dependency audits will run in CI. *Applied ([skill sources](../.claude/skills/SOURCES.md), [licences](../.claude/licenses/)). The app itself has no dependencies to audit.*

## 9. Workflow and version control

**Trunk-based development.** `main` is always in a good state. Work happens on short-lived branches that merge through pull requests. *Applied: every change since the first one has arrived through a pull request with a green CI run ([pull requests](https://github.com/sih2006/Everything-A-Monash-Malaysia-Student-Would-Need/pulls?q=is%3Apr)).*

**Atomic, conventional commits.** One logical change per commit, with a typed message (`feat`, `fix`, `docs`, `chore`) that explains why. *Applied ([commit history](https://github.com/sih2006/Everything-A-Monash-Malaysia-Student-Would-Need/commits/main)).*

**Review before merge.** Every change is reviewed before it reaches `main`: correctness first, then a separate check for over-engineering. *Applied for docs. For code, the tests are the review so far; the owner's own review of the build sprint is still to do.*

**Semantic versioning and a changelog.** Releases are tagged `vMAJOR.MINOR.PATCH` and come with a human-written changelog. *Applied: v0.1.0, v0.2.0 and v0.3.0, each with release notes ([releases](https://github.com/sih2006/Everything-A-Monash-Malaysia-Student-Would-Need/releases)). Each version's theme is in the [roadmap](03-plan/roadmap.md).*

**Clean repository from day one.** A `.gitignore` before the first code, and vendored tooling marked so GitHub's language statistics reflect the app itself. *Applied ([.gitignore](../.gitignore), [.gitattributes](../.gitattributes)).*

## 10. UX and accessibility

**Accessibility (WCAG 2.2 AA).** Text contrast of at least 4.5:1, touch targets of at least 48 dp (Android's guideline), labels for screen readers, and never colour alone: a mascot's mood is also shown in words. *Applied and checked on 42 pages ([accessibility.md](proofs/accessibility.md)). Not checked with a real screen reader.*

**One design system.** Colours, type and spacing are defined once as design tokens (in `DESIGN.md` and `web/css/styles.css`) and referenced everywhere, which keeps screens consistent and makes dark mode straightforward. *Applied ([DESIGN.md](../DESIGN.md)): four looks change only tokens.*

**Mobile-first, responsive.** Designed for the phone first, then expanded for the laptop browser. *Applied: checked at 390 px and 1360 px with no sideways scroll.*

**Purposeful motion.** Mascot animations communicate a change in state rather than decorate, and users who turn on reduced motion get still images instead. *Applied for the screens; no mascot animation exists yet.*

**User-owned goals.** Every target and final goal is set by the user. The app may offer a default target worked out from the user's own final goal, and it gives the verdict on progress against a target (on track or not, realistic or not), but it never chooses the goal itself. *Applied ([assumption 8](00-concept/capability-map.md#assumptions-this-map-rests-on)).*

## 11. Cost and operations

**Cost awareness.** Everything is designed for free tiers, an AWS budget alert at USD 1 is set on day one, and always-on resources (EC2 servers, RDS databases, NAT gateways) are avoided. *Applied: it costs nothing today. The AWS rules are in [aws-setup.md](handoff/aws-setup.md).*

**Infrastructure as code.** AWS resources are defined in code with the AWS CDK, reviewed and versioned like the app, so the whole backend can be rebuilt or torn down with one command. *Planned: waits for the hosting decision.*

**Observability.** Structured logs, basic metrics and alerts in CloudWatch, so a problem shows up with evidence instead of guesswork. *Partly applied: one JSON log line per API call, with no personal data. No metrics or alerts.*

## 12. AI-assisted development

**The author owns every decision.** The AI interviews, drafts and reviews; the author decides, edits and approves. A document is approved only when its author can explain every decision in it without notes. *Applied ([CLAUDE.md](../CLAUDE.md), [planning hub](README.md#how-these-documents-were-made)).*

**Vetted, pinned AI tooling.** Every skill added to the coding assistant was read before it was added, is pinned to a commit, and has its source and licence recorded. Hooks that would run code automatically were left out. *Applied ([skill sources](../.claude/skills/SOURCES.md)).*

**Shared context for the AI.** `CLAUDE.md` gives every AI session the same project context, rules and skill routing, so its output is consistent from one session to the next. *Applied ([CLAUDE.md](../CLAUDE.md)).*

**Open about AI use, once.** The project is built with an AI coding assistant, and this section says so plainly. Individual documents, commits and pull requests do not each carry an AI stamp: every change, whoever drafted it, goes through the same tests, the same review and the owner's decision. *Applied (owner's decision, 18 November 2026).*

## 13. When principles conflict

- **Open/closed vs YAGNI.** Extension points only where variation is already expected: the four interfaces in the open/closed section. Everywhere else, plain concrete code, refactored when a second real case appears.
- **DRY vs coupling.** Similar code in two modules may stay separate if merging it would tie together modules that change for different reasons.
- **Object-oriented vs functional.** Classes where state and behaviour belong together (entities, repositories, ViewModels), pure functions for calculations, and functional components for the UI. Picking the right tool for each part is the point, not loyalty to one paradigm.
- **Showing off vs simplicity.** This is a portfolio project, so there is a temptation to add patterns just to display them. Every pattern here has to solve a real problem in this app, and the over-engineering review checks for the rest.
