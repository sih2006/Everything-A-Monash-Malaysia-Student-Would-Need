# CLAUDE.md

Guidance for Claude Code in this repository.

## Project

A personal companion app for one Monash University Malaysia student (working title; final name still to be picked). Modules: grades and Monash GPA, budget, calories, and later health (steps, heart rate, sleep). Each module has a mascot whose mood shows whether the user is on target: a penguin egg (grades), a crab (budget) and Joel the gym-bro (calories). The mascot art is drawn by the user's artist friend. The user sets every target and final goal. The app gives the verdict on progress against a target (on track or not, realistic or not) and may offer a default target worked out from the user's own final goal, but it never chooses the goal itself.

Runs on Android (Samsung Galaxy S24 Ultra) and in a desktop browser. Free tiers only.

## Current stage: version 0.3 released, building by versions

The app exists and runs on a laptop: a C++ core (`core/`), a Node backend (`backend/`), a web app in MVVM (`web/`) and the start of an Android app (`android/`). Work now follows the versions in [docs/03-plan/roadmap.md](docs/03-plan/roadmap.md), tracked on the [project board](https://github.com/users/sih2006/projects/1).

**Start every session by reading [docs/handoff/STATUS.md](docs/handoff/STATUS.md)**, then [AGENTS.md](AGENTS.md), which holds the working rules and the map of the code. Run `python tools/check.py` before changing anything.

- Documents the user has not reviewed are marked Draft in the [planning hub](docs/README.md); ADRs taken without the user are marked Proposed. Treat none of them as the user's decision until the user has reviewed it.
- No AI stamps: no "written by" lines in documents, no AI co-author line in commits, no "generated with" line in pull requests. The project says once, in the engineering principles, that it is built with an AI coding assistant.
- The repository is public. The user's real data lives only in `backend/data/app.db`; tests, examples and documents use made-up numbers.
- Write simple English, about B2 level, in documents, comments, commit messages and on screen.
- Never create images, not even placeholders. Mascot art comes from the user's artist friend.
- Every grade rule lives in the C++ core only. GPA and CGPA are different scales and are never mixed.
- No packages and no build step in `backend/` or `web/` without an ADR.
- The user owns every decision. Interview one question at a time, draft from the answers, then let the user review and edit. Never present a decision the user did not make as theirs.
- Every significant decision gets an ADR in `docs/adr/` listing the options considered.
- Requirements get stable IDs (for example `ACA-01`) so tests and issues can trace back to them.
- Diagrams: Mermaid inside Markdown. draw.io (`.drawio.svg`) in `docs/diagrams/` for use-case, deployment and AWS diagrams. Wireframes and mockups in Claude Design artifacts.

## Engineering principles

The project follows [docs/engineering-principles.md](docs/engineering-principles.md). When a principle or practice is put into practice, change its status there from Planned to Applied and link the evidence. Only create extension points (interfaces meant for future variation) where that document lists them.

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
