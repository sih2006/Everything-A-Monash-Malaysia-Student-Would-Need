# Planning hub

Every planning document for the app lives here, in the order it gets written. The planning stage decides what to build, how to build it and how to prove it works, before any code is written.

## How each document gets made

1. **Interview.** Claude asks one question at a time until the requirements are clear.
2. **Draft.** Claude turns the answers into the document.
3. **Review.** The author edits it in their own words and challenges anything they couldn't defend in an interview.
4. **Approve and commit.** One commit per document, for example `docs(prd): add budget requirements`.
5. **Record decisions.** Any real choice between options becomes an ADR in [adr/](adr/), including the options rejected and why.

A document counts as approved only when its author can explain every decision in it without notes.

## Document map

| Stage | # | Document | Answers | Diagrams | Status |
|---|---|---|---|---|---|
| Concept | 1 | `00-concept/concept-brief.md` | What problem, for whom, what success looks like, what is out of scope | | Not started |
| Concept | 2 | `00-concept/capability-map.md` | Which modules exist, how they depend on each other, build order | Module dependency graph | In review |
| Concept | 3 | `00-concept/research.md` (optional, recommended) | What already exists, what other Monash students want | | Not started |
| Requirements | 4 | `01-requirements/prd.md` | What each module must do: user stories, acceptance criteria, non-functional requirements, release slices | | Not started |
| Requirements | 5 | `01-requirements/use-cases.md` | Who does what with the system | UML use-case diagram | Not started |
| Design | 6 | `02-design/app-flow.md` | How a user moves through the app | Flowcharts, navigation map, screen inventory | Not started |
| Design | 7 | `02-design/ui-ux-brief.md` and `/DESIGN.md` | Look, feel, tone, mascot behaviour, accessibility | Wireframes and mockups (Claude Design) | Not started |
| Design | 8 | `02-design/trd.md` | How it is built: stack, architecture, MVVM layers, offline sync, AI proxy, Health Connect | C4 context, container and component | Not started |
| Design | 9 | `02-design/uml.md` | The detailed design | Class, sequence, state machine, activity, deployment | Not started |
| Design | 10 | `02-design/backend-schema.md` | How data is stored and served | ERD, DynamoDB access patterns, OpenAPI contract | Not started |
| Design | 11 | `02-design/security-privacy.md` | What could go wrong with grade, money and health data, and the defences | Data-flow diagram, threat model | Not started |
| Plan | 12 | `03-plan/test-plan.md` | How we prove it works, including black-box test cases | Requirements traceability matrix | Not started |
| Plan | 13 | `03-plan/implementation-plan.md` | Order of work: milestones, tasks, definition of done, risks, running costs | Roadmap | Not started |
| All | | `adr/NNNN-title.md` | Why each big decision was made | | Ongoing |

## How planning connects to testing

Each planning document drives a level of testing (the V-model). Black-box tests are designed during planning, from the requirements alone, and run once the app exists.

| Planning document | Test level it drives | Tests written | Tests run |
|---|---|---|---|
| PRD acceptance criteria | Black-box system and acceptance tests | In the test plan (planning stage) | After the build |
| TRD and architecture | Integration tests | During the build | Every CI run |
| UML and backend schema | Unit tests (white-box, test-first) | During the build | Every CI run |

## After planning

Build in thin slices with tests first, then black-box system testing, then two weeks of real daily use (user acceptance testing), then release, then a retrospective and a portfolio case study.

## Diagram conventions

- **Mermaid** inside Markdown for flowcharts and for sequence, class, state and ER diagrams. GitHub renders these directly.
- **draw.io** (`.drawio.svg`, editable and viewable on GitHub) in `diagrams/` for use-case, deployment and AWS architecture diagrams.
- **Claude Design** for wireframes and mockups. Exported images go in `diagrams/`.
