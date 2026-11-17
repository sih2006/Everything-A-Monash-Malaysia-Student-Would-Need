# Planning hub

Every planning document for the app lives here. This page is the index.

## How these documents were made

The plan was to write each document from an interview with the owner, one at a time, and to approve the whole set before any code. That is how the first three were made: the capability map, the engineering principles and the product backlog.

On 16 November 2026 the owner chose to build first, so most of the other documents were written during or after the build, from what the owner had said and from the code as built. They are marked **Draft**. A draft becomes **Approved** when the owner has read it, changed what is wrong, and can explain every decision in it without notes. Decisions taken during the build without the owner are ADRs with the status **Proposed**.

## Document map

| Stage | Document | Answers | Diagrams | Status |
|---|---|---|---|---|
| Concept | [concept-brief.md](00-concept/concept-brief.md) | What problem, for whom, what success looks like, what is left out | | Draft |
| Concept | [capability-map.md](00-concept/capability-map.md) | Which modules exist, how they depend on each other | Planned and as-built module graphs | Approved on 2 October 2026 |
| Requirements | [prd.md](01-requirements/prd.md) | What each part must do, which version it belongs to, and where it stands | | Draft |
| Requirements | [product-backlog.md](01-requirements/product-backlog.md) | The grades tracker as epics and stories with acceptance criteria | | Draft, shaped with the owner |
| Requirements | [use-cases.md](01-requirements/use-cases.md) | Who does what with the system | Use-case diagram | Draft |
| Design | [app-flow.md](02-design/app-flow.md) | How a user moves through the app | Screen map, flowcharts | Draft |
| Design | [ui-ux-brief.md](02-design/ui-ux-brief.md) and [/DESIGN.md](../DESIGN.md) | Look, feel, tone, mascots, accessibility | The prototype in [/prototype](../prototype/) | Draft |
| Design | [trd.md](02-design/trd.md) | How it is built and why | C4 context, containers, components; a sequence diagram | Draft |
| Design | [uml.md](02-design/uml.md) | The detailed design | Class, state, sequence, activity, deployment | Draft |
| Design | [backend-schema.md](02-design/backend-schema.md) | What is stored and which addresses the app calls | Entity-relationship diagram | Draft |
| Design | [security-privacy.md](02-design/security-privacy.md) | What could go wrong with grade, money and health data, and the defences | Data-flow diagram, STRIDE table | Draft |
| Design | [grade-rules.md](02-design/grade-rules.md) | Every grade rule, with sources and worked examples | | Draft; GPA and WAM match the owner's transcript |
| Plan | [roadmap.md](03-plan/roadmap.md) | Versions 0.1 to 1.0, each with one theme | | The owner's plan |
| Plan | [implementation-plan.md](03-plan/implementation-plan.md) | How work is done, definition of done, risks, costs | | Draft |
| Plan | [test-plan.md](03-plan/test-plan.md) | How we know it works, and which test proves which story | | Draft |
| All | [engineering-principles.md](engineering-principles.md) | Which engineering principles the project follows, where and why | | In review |

## Other places

| Place | What it holds |
|---|---|
| [handoff/](handoff/) | What is built ([STATUS](handoff/STATUS.md)), what is next ([next-tasks](handoff/next-tasks.md)), and guides for Gemini, GitHub, AWS, Android, demos and MVVM |
| [proofs/](proofs/) | The saved output of a full test run, the accessibility report, and screenshots |
| [Project board](https://github.com/users/sih2006/projects/1) | Every story and requirement as an issue, under its version |
| [Releases](https://github.com/sih2006/Everything-A-Monash-Malaysia-Student-Would-Need/releases) | Each finished version, with notes |

## Decision records

| ADR | Decision | Status |
|---|---|---|
| [0001](adr/0001-cpp-core-for-academics-tracker.md) | The grades core is written in C++ with hand-built data structures | Proposed, from the owner's answers |
| [0002](adr/0002-local-first-stack.md) | Run locally first: a Node backend with no packages, SQLite, the core as a separate program | Proposed |
| [0003](adr/0003-web-app-without-a-build-step.md) | The screens are a web app in MVVM, with no framework and no build step | Proposed |
| [0004](adr/0004-grade-scales-and-rules.md) | Two grade scales, GPA and Malaysia CGPA, kept apart | Proposed, from Monash's pages |
| [0005](adr/0005-hosting.md) | Where the app is hosted | **No decision yet** |
| [0006](adr/0006-testing-and-build-tools.md) | Testing and build tools | Proposed |
| [0007](adr/0007-native-android-app.md) | A native Android app in Kotlin | Accepted in part: the owner chose native and data on the phone |
| [0008](adr/0008-exchange-rates.md) | Exchange rates for other currencies: free live rates, or typed by hand | Accepted |

## How planning connects to testing

Each planning document drives a level of testing (the V-model).

| Planning document | Test level it drives | Where the tests are |
|---|---|---|
| Backlog and PRD acceptance criteria | Black-box system tests | `core/tests/blackbox.py`, written from the acceptance criteria |
| TRD and backend schema | Integration tests | `backend/test/api.test.js`, `export.test.js` |
| UML and grade rules | Unit tests (white-box) | `core/tests/test_*.cpp`, `backend/test/domain.test.js`, `life.test.js`, `web/test/*.test.js` |

One thing did not follow the V-model: the black-box tests were written on the same day as the code, not before it. They were still written from the backlog's acceptance criteria, not from the code.

## Diagram conventions

- **Mermaid** inside Markdown for every diagram. GitHub draws it directly, and it changes with the text in the same commit.
- **draw.io** (`.drawio.svg` in `diagrams/`) was planned for the use-case, deployment and AWS diagrams. The Mermaid versions stand in until then.
- **Wireframes and mockups:** the working prototype in [/prototype](../prototype/) takes the place of static mockups.
