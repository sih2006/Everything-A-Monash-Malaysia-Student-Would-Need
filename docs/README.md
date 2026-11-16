# Planning hub

Every planning document for the app lives here. This page is the index.

## Read this first: how these documents were made

The plan was to write each document from an interview with the owner, one at a time, and to approve the whole set before any code.

That is how the first three were made: the capability map, the engineering principles and the product backlog.

On 16 November 2026 the owner chose to build first: one day, everything that could be built without accounts. So **most documents below were written by Claude during or after the build**, from what the owner had said and from the code as built. They are marked **Draft**. A draft becomes **Approved** only when the owner has read it, changed what is wrong, and can explain every decision in it without notes.

Decisions Claude made alone are recorded as ADRs with the status "Proposed".

## Document map

| Stage | # | Document | Answers | Diagrams | Status |
|---|---|---|---|---|---|
| Concept | 1 | [00-concept/concept-brief.md](00-concept/concept-brief.md) | What problem, for whom, what success looks like, what is left out | | Draft |
| Concept | 2 | [00-concept/capability-map.md](00-concept/capability-map.md) | Which modules exist, how they depend on each other, build order | Module dependency graph | Approved on 2 October 2026; assumptions updated since |
| Concept | 3 | `00-concept/research.md` (optional) | What already exists, what other Monash students want | | Not started |
| Requirements | 4 | [01-requirements/prd.md](01-requirements/prd.md) | What each module must do, and where each requirement stands | | Draft |
| Requirements | | [01-requirements/product-backlog.md](01-requirements/product-backlog.md) | The grades tracker as epics and stories with acceptance criteria | | Draft, shaped with the owner |
| Requirements | 5 | [01-requirements/use-cases.md](01-requirements/use-cases.md) | Who does what with the system | Use-case diagram | Draft |
| Design | 6 | [02-design/app-flow.md](02-design/app-flow.md) | How a user moves through the app | Flowcharts, screen map | Draft |
| Design | 7 | [02-design/ui-ux-brief.md](02-design/ui-ux-brief.md) and [/DESIGN.md](../DESIGN.md) | Look, feel, tone, mascot behaviour, accessibility | The prototype in [/prototype](../prototype/) | Draft |
| Design | 8 | [02-design/trd.md](02-design/trd.md) | How it is built and why | C4 context, containers, components; a sequence diagram | Draft |
| Design | 9 | [02-design/uml.md](02-design/uml.md) | The detailed design | Class, state, sequence, activity, deployment | Draft |
| Design | 10 | [02-design/backend-schema.md](02-design/backend-schema.md) | What is stored and which addresses the app calls | ERD, API list, DynamoDB sketch | Draft |
| Design | 11 | [02-design/security-privacy.md](02-design/security-privacy.md) | What could go wrong with grade, money and health data, and the defences | Data-flow diagram, STRIDE table | Draft |
| Design | | [02-design/grade-rules.md](02-design/grade-rules.md) | Every grade rule, with sources and worked examples | | Draft; needs checking against the owner's own results |
| Plan | 12 | [03-plan/test-plan.md](03-plan/test-plan.md) | How we know it works, and which test proves which story | Traceability table | Draft |
| Plan | 13 | [03-plan/implementation-plan.md](03-plan/implementation-plan.md) | Order of work, definition of done, risks, costs | Roadmap | Draft, written after the build |
| All | | [engineering-principles.md](engineering-principles.md) | Which engineering principles the project follows, where and why | | In review; parts are out of date, see the note at its top |
| All | | [adr/](adr/) | Why each big decision was made | | 0001 proposed with the owner; 0002 to 0006 proposed by Claude |

## Other places

| Folder | What it holds |
|---|---|
| [handoff/](handoff/) | What is built, what is next, and step-by-step guides for Gemini, GitHub, AWS, Android and MVVM |
| [proofs/](proofs/) | The saved output of a full test run, and screenshots of every screen |

## Decision records

| ADR | Decision | Status |
|---|---|---|
| [0001](adr/0001-cpp-core-for-academics-tracker.md) | The grades core is written in C++ with hand-built data structures | Proposed, from the owner's answers |
| [0002](adr/0002-local-first-stack.md) | Run locally first: a Node backend with no packages, SQLite, the core as a separate program | Proposed by Claude |
| [0003](adr/0003-web-app-without-a-build-step.md) | The screens are a web app in MVVM, with no framework and no build step | Proposed by Claude |
| [0004](adr/0004-grade-scales-and-rules.md) | Two grade scales, GPA and Malaysia CGPA, kept apart | Proposed by Claude, from Monash's pages |
| [0005](adr/0005-hosting.md) | Where the app is hosted | **No decision yet** |
| [0006](adr/0006-testing-and-build-tools.md) | Testing and build tools | Proposed by Claude |

## How planning connects to testing

Each planning document drives a level of testing (the V-model).

| Planning document | Test level it drives | Where the tests are |
|---|---|---|
| Backlog and PRD acceptance criteria | Black-box system tests | `core/tests/blackbox.py`, written from the acceptance criteria |
| TRD and backend schema | Integration tests | `backend/test/api.test.js` |
| UML and grade rules | Unit tests (white-box) | `core/tests/test_*.cpp`, `backend/test/domain.test.js`, `web/test/viewmodel.test.js` |

One thing did not follow the V-model: the black-box tests were written on the same day as the code, not before it. They were still written from the backlog's acceptance criteria, not from the code.

## Diagram conventions

- **Mermaid** inside Markdown for every diagram so far. GitHub draws these directly.
- **draw.io** (`.drawio.svg`) in `diagrams/` was planned for use-case, deployment and AWS diagrams. None has been drawn yet; the Mermaid versions stand in.
- **Wireframes and mockups:** the working prototype in [/prototype](../prototype/) took the place of static mockups.
