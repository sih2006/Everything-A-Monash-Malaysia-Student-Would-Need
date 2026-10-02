# CLAUDE.md

Guidance for Claude Code in this repository.

## Project

A personal companion app for one Monash University Malaysia student (working title; final name still to be picked). Modules: grades and Monash GPA, budget, calories, and later health (steps, heart rate, sleep). Each module has a mascot whose mood shows whether the user is on target: a penguin egg (grades), a crab (budget) and Joel the gym-bro (calories). The mascot art is drawn by the user's artist friend. The user sets every target; the app never hardcodes what "good" means.

Runs on Android (Samsung Galaxy S24 Ultra) and in a desktop browser. Free tiers only.

## Current stage: planning

There is no app code yet. The planning hub is [docs/README.md](docs/README.md). Do not write application code until the implementation plan is approved.

- The user owns every decision. Interview one question at a time, draft from the answers, then let the user review and edit. Never present a Claude decision as the user's.
- Every significant decision gets an ADR in `docs/adr/` listing the options considered.
- Requirements get stable IDs (for example `ACA-01`) so tests and issues can trace back to them.
- Diagrams: Mermaid inside Markdown. draw.io (`.drawio.svg`) in `docs/diagrams/` for use-case, deployment and AWS diagrams. Wireframes and mockups in Claude Design artifacts.

## Skill routing

Use the matching skill whenever a task fits. Don't wait to be asked.

| Task | Skill |
|---|---|
| Shaping the idea, concept brief | `idea-refine`, `interview-me` |
| PRD, specs, capability map | `spec-driven-development`, `interview-me` |
| Co-writing any planning doc | `doc-coauthoring` |
| Architecture decisions, ADRs | `documentation-and-adrs` |
| API and module boundaries, backend schema | `api-and-interface-design` |
| Threat model, privacy, auth | `security-and-hardening` |
| Implementation plan, task breakdown | `planning-and-task-breakdown` |
| CI/CD, branching, commits | `ci-cd-and-automation`, `git-workflow-and-versioning` |
| App UI/UX decisions, design system | `ui-ux-pro-max` (leads), `design-references`, Claude Design artifacts |
| Critique, audit or polish a UI | `impeccable`, `web-design-guidelines` |
| Landing or portfolio page | `design-taste-frontend` |
| Charts | `dataviz` |
| Animation | `motion` |
| 3D mascots | `r3f-*`, `img2threejs` |
| Building features | `incremental-implementation`, `test-driven-development`, `react-best-practices` |
| Debugging | `debugging-and-error-recovery` |
| Code review | `code-review-and-quality`, then `ponytail-review` for over-engineering |
| Browser and end-to-end testing | `playwright-cli` |
| Logging and monitoring | `observability-and-instrumentation` |
| Explainer images for README or devlog | `ian-xiaohei-illustrations` (ask for English labels) |

When design skills disagree: `ui-ux-pro-max` and `DESIGN.md` win for app screens, `design-taste-frontend` wins only on the landing or portfolio page, and the user's mascot art beats everything.

Third-party skill sources and versions: [.claude/skills/SOURCES.md](.claude/skills/SOURCES.md).

## Conventions

- Docs live in `docs/` as short, linked Markdown files.
- Conventional commits, for example `docs(prd): add budget requirements` or `feat(budget): add monthly limit`.
- Currency MYR, timezone Asia/Kuala_Lumpur, locale en-MY.
- Never commit secrets. API keys (Gemini, YouTube) live only on the backend, never in the app.
