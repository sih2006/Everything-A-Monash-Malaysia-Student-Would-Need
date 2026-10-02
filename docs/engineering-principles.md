# Engineering principles

This document lists the principles and practices this project follows, where each one shows up in the app, and why it was chosen. Every entry has a status:

- **Applied**: visible in the repository now, with a link to the evidence.
- **Planned**: the intended approach, confirmed or changed in the document named next to it.

No application code exists yet, so code-level principles are Planned, and the class and interface names below are provisional until the UML design set. When a Planned entry is put into practice, its status changes to Applied with a link to the commit, pull request or file that shows it.

**Status of this document:** In review.

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
- **Here:** a 13-document planning stage, listed in the [planning hub](README.md). No application code is written until the implementation plan is approved.
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
- **Status:** Planned (PRD, test plan).

### Architecture Decision Records (ADRs)
A short record for each significant decision: the context, the options considered, the decision and its consequences.
- **Here:** `docs/adr/`, starting with ADR-0001 on the stack (Expo vs Kotlin Multiplatform vs Flutter). Later ADRs cover AWS vs Supabase, web hosting and state management.
- **Why:** records why, including the rejected options, so a decision can be revisited with its context instead of being argued again from memory.
- **Status:** Planned (first ADR during the TRD).

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
| UML use-case diagram | Who does what with the system? | The student, the AI service, Health Connect | Use cases (doc 5) | Planned |
| Flowchart (UML activity diagram) | Which steps does a task take, including the branches? | Logging a mark, adding an expense, first-run setup | App flow (doc 6) | Planned |
| C4 context, container and component diagrams | How is the system put together, at each zoom level? | Phone app, web app, AWS backend, Gemini, YouTube | TRD (doc 8) | Planned |
| UML class diagram | What are the main types and how do they relate? | Unit, Assessment, GradingScheme, Transaction, Budget, Mood | UML set (doc 9) | Planned |
| UML sequence diagram | In what order do the parts talk to each other? | Logging a mark through to the mascot reacting, syncing, asking for AI advice | UML set (doc 9) | Planned |
| UML state machine diagram | Which states can something be in, and what moves it between them? | Mascot moods, the penguin egg's life cycle, sync status | UML set (doc 9) | Planned |
| UML deployment diagram | What runs where? | Phone, browser, AWS services | UML set (doc 9) | Planned |
| Entity-relationship diagram | How is the data structured and related? | The phone's local database and the DynamoDB items | Backend schema (doc 10) | Planned |
| Data-flow diagram | Where does sensitive data travel? | Grade, money and health data between phone, cloud and AI | Security and privacy (doc 11) | Planned |

- **Why UML:** it is a standard notation. A reviewer who has never seen the project can read a sequence diagram without a walkthrough, and drawing one often exposes a design flaw, such as a missing step or a circular call, before any code exists.
- **Why C4 for architecture:** UML has no standard way to zoom in and out. C4 gives fixed levels (system context, containers, components, code), so each architecture diagram stays readable.
- **Why Mermaid and draw.io:** Mermaid diagrams are plain text, so they can be reviewed line by line in pull requests and render directly on GitHub. draw.io covers what Mermaid draws poorly (use-case and deployment diagrams, AWS icons), and its `.drawio.svg` files stay editable while displaying as images.

## 3. Architecture

### Layered (clean) architecture
The code is split into layers and dependencies only point inwards: UI -> ViewModels -> domain <- data. The domain layer holds the business rules and imports nothing from React, Expo, AWS or the database.
- **Here:** `gpa` and `mood-engine` are pure TypeScript. The data layer implements interfaces that the domain defines.
- **Why:** the rules that matter most (GPA maths, mood rules) can be tested in milliseconds without a phone, and the UI or database can change without touching them.
- **Status:** Planned (TRD).

### MVVM (Model-View-ViewModel)
Views only display state and pass on user actions. ViewModels hold each screen's state and logic. The Model is the domain and data layers.
- **Here:** React components are the Views. Each screen gets a ViewModel written as plain TypeScript with no React imports, connected to its component through a small hook. The state-management library is chosen in an ADR.
- **Why:** screens stay thin, and a ViewModel can be unit-tested without rendering anything. It is also the architecture Google recommends for Android apps, so the reasoning carries over to native work.
- **Status:** Planned (TRD).

### Contract-first module boundaries
The interface between two modules (types and expected behaviour) is written before either side is built, and it belongs to the module that provides it.
- **Here:** the `gpa` section of the PRD defines what `academics` may call. The rule is already part of the [capability map](00-concept/capability-map.md#rules-for-module-boundaries).
- **Why:** both sides can be built and tested independently against the same contract, and breaking changes show up as contract changes.
- **Status:** Applied as a rule; Planned in the PRD and TRD.

### Offline-first
The phone's local database is the source of truth for the UI. The network is used to sync, not to function.
- **Here:** logging a mark or an expense works with no signal, and `sync` catches up with the cloud later.
- **Why:** campus Wi-Fi and mobile data are unreliable, and the app must never lose an entry or block on a loading spinner.
- **Status:** Planned (TRD: sync design and conflict rules).

### Backend proxy for third-party APIs
The app never calls Gemini or YouTube directly. It calls this project's backend, which holds the API keys.
- **Here:** an AWS Lambda function behind `advisor`.
- **Why:** anything shipped inside an app or website can be extracted, so keys in the client would leak. The proxy also allows rate limiting, caching and switching AI provider without releasing a new version of the app.
- **Status:** Planned (TRD).

### Serverless backend
Managed services billed per request (Lambda, DynamoDB, Cognito) instead of servers that run all the time.
- **Here:** one user makes a few thousand requests a month, far inside the free tiers.
- **Why:** about RM0 a month at this scale, no servers to patch, and no redesign needed if more users ever join.
- **Status:** Planned (ADR: AWS vs Supabase).

### Access-pattern-first data design
With DynamoDB, list the queries the app needs first, then design the keys around them.
- **Here:** queries such as "all assessments for a unit this semester" and "spending by category this month" decide the key structure.
- **Why:** DynamoDB is fast and cheap only when its keys match the queries. Designing tables first, the relational-database habit, leads to slow and expensive scans.
- **Status:** Planned (backend schema).

## 4. Object-oriented design (SOLID)

The UI uses React's functional style, which is the idiomatic way to write React. Object-oriented design is used where state and behaviour belong together and where the system is expected to grow: the domain, data and ViewModel layers. The SOLID principles apply to both styles.

### Single responsibility principle
Each class or module has one reason to change.
- **Here:** `gpa` only knows grading rules. It does not store marks or draw anything. A transaction repository only stores and loads transactions; categorising them is a separate service.
- **Why:** changes stay local. When Monash changes a grading rule, one module changes and its tests show that nothing else broke.
- **Status:** Applied at module level ([capability map](00-concept/capability-map.md#modules)); Planned at class level (UML set).

### Open/closed principle
Open for extension, closed for modification: adding behaviour means adding new code, not editing code that already works and is tested.
- **Here:** extension points sit only where variation is expected:
  - `GradingScheme`: Monash GPA, WAM and any future grading scale are separate implementations of one interface.
  - `MoodRule`: each module gives the shared mood engine its own rules, so adding nutrition moods never touches budget moods.
  - `AdviceProvider`: Gemini today, another AI model later.
  - `HealthSource`: Health Connect now, other sources later.
- **Why:** this is what "leaving it open for improvement" means in practice. New features plug in without risking existing behaviour.
- **Status:** Planned (UML set).

### Liskov substitution principle
Any implementation of an interface must work wherever that interface is expected, without surprises.
- **Here:** the in-memory repository used in tests must behave exactly like the real database one: same ordering, same errors. One shared set of contract tests runs against every implementation.
- **Why:** if a test double behaves differently from the real thing, the tests pass while the app breaks.
- **Status:** Planned (test plan).

### Interface segregation principle
Depend on small, focused interfaces, not large ones full of methods you don't use.
- **Here:** `advisor` receives a read-only summary interface from each module, not the full repositories with their write and delete methods.
- **Why:** small interfaces are easier to replace in tests, and they limit what a module can do by accident. The AI module has no way to delete a transaction.
- **Status:** Planned (TRD).

### Dependency inversion principle
High-level logic depends on abstractions, not on concrete technology. The concrete implementations are passed in from outside (dependency injection).
- **Here:** ViewModels and domain services depend on interfaces such as `UnitRepository` and `AdviceProvider`. One composition root wires in the real database, AWS and Gemini implementations when the app starts.
- **Why:** tests swap in fakes, the AWS vs Supabase decision can change without touching business logic, and each part can be built on its own.
- **Status:** Planned (TRD).

## 5. Other design principles

**Separation of concerns.** Display lives in the UI, screen logic in ViewModels, rules in the domain and storage in the data layer, so each can be understood, tested and replaced on its own. *Applied at module level; Planned in code.*

**Encapsulation.** Objects protect their own rules. A `Unit` only accepts assessments through a method that checks the weights add up to at most 100%, so an invalid unit cannot exist. Each rule is enforced in one place instead of being checked everywhere. *Planned (UML set).*

**Composition over inheritance.** Each mascot is assembled from parts (an art set, a mood mapping, a set of reactions) instead of a `Mascot` base class that the penguin egg, crab and Joel override. Hierarchies become fragile as they grow, while parts can be mixed freely. *Planned (UML set).*

**Pure functions in the core.** GPA calculation and mood evaluation depend only on their inputs and change nothing outside themselves. Same input, same output: easy to test, safe to run on the phone or the server, and easy to reason about. *Planned (TRD).*

**DRY (don't repeat yourself), with the rule of three.** Each rule has one source of truth. Monash's grade bands are defined once and used by the calculator, the UI and the tests. Similar-looking code is only merged once a third case shows what the real abstraction is, because the wrong abstraction costs more than a little duplication. *Planned (build).*

**KISS (keep it simple).** Choose the simplest design that meets the requirement. For example, there is one user, so there is no permission system for multiple users. *Applied ([assumptions](00-concept/capability-map.md#assumptions-this-map-rests-on)).*

**YAGNI (you aren't gonna need it).** Nothing is built for an imagined future. Extension points exist only where the open/closed section lists them, and possible extra modules (timetable, deadlines, reminders) wait until the concept brief decides on them. Every code review includes an over-engineering check. *Applied ([capability map](00-concept/capability-map.md#candidates-not-yet-in-scope)).*

**Validate at the boundaries, fail fast.** Input is checked where it enters the system (forms, API handlers) against a schema, and rejected with a clear error near its source. Inside the core, data can then be trusted. *Planned (TRD).*

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
- **Status:** Planned (test plan).

### Test-driven development (white-box)
Write a failing test, make it pass, then tidy the code (red, green, refactor).
- **Here:** mandatory for `gpa` and `mood-engine`, where correctness is the whole point.
- **Why:** the tests become a precise, executable statement of the rules, and refactoring is safe.
- **Status:** Planned (build).

### Black-box test design
Test cases come from the requirements alone, without looking at the code:
- **Equivalence partitioning:** one test per group of inputs that should behave the same, for example any mark from 80 to 100 is an HD.
- **Boundary value analysis:** tests at the edges where behaviour changes, for example marks of 49 and 50, 59 and 60, 69 and 70, 79 and 80, and spending exactly at the budget limit.
- **Decision tables:** every combination of conditions that affects a result, for example over or under budget, early or late in the month, and the resulting mood.
- **State transition testing:** every valid and invalid move in the penguin egg's life cycle.
- **Status:** Planned (test plan). The grade boundaries will be checked against the current Monash handbook first.

### Contract tests
One set of tests runs against every implementation of an interface (see the Liskov substitution principle), so fakes cannot drift from the real thing. *Planned (test plan).*

### User acceptance testing
Two weeks of real daily use, checked against the PRD's success criteria, before the first release. *Planned (test plan).*

### Continuous integration quality gates
Every pull request runs linting, type checks and tests, and cannot be merged while any of them fail. *Planned (implementation plan).*

## 8. Security and privacy

**Secrets never in the app or the repository.** API keys live only on the backend, in AWS Systems Manager Parameter Store (free, unlike Secrets Manager). `.env` files are ignored by git from day one. *Applied ([.gitignore](../.gitignore)); Planned for the backend (TRD).*

**Least privilege.** Each AWS function gets only the permissions it needs. For example, the advice function can read summaries but cannot write or delete anything. *Planned (TRD).*

**Data minimisation.** The AI receives summaries, not raw records, because Gemini's free tier may use prompts to improve Google's products. *Planned (TRD).*

**Threat modelling with STRIDE.** Each data flow is checked for spoofing, tampering, repudiation, information disclosure, denial of service and elevation of privilege. *Planned (security and privacy, doc 11).*

**Privacy by design.** Grades, spending and health data are sensitive, so the principles of Malaysia's Personal Data Protection Act 2010 (clear purpose, limited retention, user control) are followed even though the only user is the developer. *Planned (security and privacy, doc 11).*

**Supply-chain hygiene.** Third-party code is read before it is added, pinned to a specific commit, and its licence recorded. Dependency audits will run in CI. *Applied ([skill sources](../.claude/skills/SOURCES.md), [licences](../.claude/licenses/)); Planned for app dependencies.*

## 9. Workflow and version control

**Trunk-based development.** `main` is always in a good state. Work happens on short-lived branches that merge through pull requests. *Applied: this document is the first change to arrive through a pull request.*

**Atomic, conventional commits.** One logical change per commit, with a typed message (`feat`, `fix`, `docs`, `chore`) that explains why. *Applied ([commit history](https://github.com/sih2006/Everything-A-Monash-Malaysia-Student-Would-Need/commits/main)).*

**Review before merge.** Every change is reviewed before it reaches `main`: correctness first, then a separate check for over-engineering. *Applied for docs; Planned for code.*

**Semantic versioning and a changelog.** Releases are tagged `vMAJOR.MINOR.PATCH` and come with a human-written changelog. *Planned (first release).*

**Clean repository from day one.** A `.gitignore` before the first code, and vendored tooling marked so GitHub's language statistics reflect the app itself. *Applied ([.gitignore](../.gitignore), [.gitattributes](../.gitattributes)).*

## 10. UX and accessibility

**Accessibility (WCAG 2.2 AA).** Text contrast of at least 4.5:1, touch targets of at least 48 dp (Android's guideline), labels for screen readers, and never colour alone: a mascot's mood is also shown in words. *Planned (UI/UX brief).*

**One design system.** Colours, type and spacing are defined once as design tokens (in `DESIGN.md` and a Claude Design system) and referenced everywhere, which keeps screens consistent and makes dark mode straightforward. *Planned (UI/UX brief).*

**Mobile-first, responsive.** Designed for the phone first, then expanded for the laptop browser. *Planned (app flow, UI/UX brief).*

**Purposeful motion.** Mascot animations communicate a change in state rather than decorate, and users who turn on reduced motion get still images instead. *Planned (UI/UX brief).*

**User-owned goals.** The app never decides what "good" means. Every target is set by the user, and the app only suggests defaults. *Applied ([assumption 8](00-concept/capability-map.md#assumptions-this-map-rests-on)).*

## 11. Cost and operations

**Cost awareness.** Everything is designed for free tiers, an AWS budget alert at USD 1 is set on day one, and always-on resources (EC2 servers, RDS databases, NAT gateways) are avoided. *Planned (implementation plan).*

**Infrastructure as code.** AWS resources are defined in code with the AWS CDK, reviewed and versioned like the app, so the whole backend can be rebuilt or torn down with one command. *Planned (TRD).*

**Observability.** Structured logs, basic metrics and alerts in CloudWatch, so a problem shows up with evidence instead of guesswork. *Planned (build).*

## 12. AI-assisted development

**The author owns every decision.** The AI interviews, drafts and reviews; the author decides, edits and approves. A document is approved only when its author can explain every decision in it without notes. *Applied ([CLAUDE.md](../CLAUDE.md), [planning hub](README.md#how-each-document-gets-made)).*

**Vetted, pinned AI tooling.** Every Claude Code skill was read before it was added, is pinned to a commit, and has its source and licence recorded. Hooks that would run code automatically were left out. *Applied ([skill sources](../.claude/skills/SOURCES.md)).*

**Shared context for the AI.** `CLAUDE.md` gives every AI session the same project context, rules and skill routing, so its output is consistent from one session to the next. *Applied ([CLAUDE.md](../CLAUDE.md)).*

**Transparent credit.** Commits where the AI contributed carry a `Co-Authored-By` trailer, and AI output goes through the same review as any other change. *Applied ([commit history](https://github.com/sih2006/Everything-A-Monash-Malaysia-Student-Would-Need/commits/main)).*

## 13. When principles conflict

- **Open/closed vs YAGNI.** Extension points only where variation is already expected: the four interfaces in the open/closed section. Everywhere else, plain concrete code, refactored when a second real case appears.
- **DRY vs coupling.** Similar code in two modules may stay separate if merging it would tie together modules that change for different reasons.
- **Object-oriented vs functional.** Classes where state and behaviour belong together (entities, repositories, ViewModels), pure functions for calculations, and functional components for the UI. Picking the right tool for each part is the point, not loyalty to one paradigm.
- **Showing off vs simplicity.** This is a portfolio project, so there is a temptation to add patterns just to display them. Every pattern here has to solve a real problem in this app, and the over-engineering review checks for the rest.
