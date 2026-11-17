# Third-party skill sources

Every skill was read before install. Only the folders listed here were copied. No hooks, plugins or MCP servers were installed.

| Skills | Source | Commit | Stars (checked 2026-10-02) | License |
|---|---|---|---|---|
| `r3f-fundamentals`, `r3f-animation`, `r3f-loaders`, `r3f-materials`, `r3f-lighting`, `r3f-textures`, `r3f-shaders`, `r3f-interaction` | [EnzeD/r3f-skills](https://github.com/EnzeD/r3f-skills) | 4a11805 | 121 | MIT |
| `ian-xiaohei-illustrations` | [helloianneo/ian-xiaohei-illustrations](https://github.com/helloianneo/ian-xiaohei-illustrations) | 4102eb8 | 12k | MIT |
| `ui-ux-pro-max` | [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | 09170ee | 131k | MIT |
| `impeccable` | [pbakaus/impeccable](https://github.com/pbakaus/impeccable) | 4adabaf | 74k | Apache-2.0 |
| `design-taste-frontend` | [Leonxlnx/taste-skill](https://github.com/leonxlnx/taste-skill) (`skills/taste-skill`) | ce26fc2 | 91k | MIT |
| `design-references` (local wrapper) + `.claude/references/awesome-design-md/` | [VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md) | f696123 | 119k | MIT |
| `img2threejs` | [img2threejs/img2threejs](https://github.com/img2threejs/img2threejs) | 6e60b5e | 17k | Apache-2.0 |
| `motion` | [motiondivision/ai-kit](https://github.com/motiondivision/ai-kit) (official Motion, formerly Framer Motion) | d1c5c26 | 13 (official Motion org) | MIT |
| `ponytail-review` | [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail) | e3ba2aa | 148k | MIT |
| `web-design-guidelines`, `react-best-practices` | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) (official Vercel) | 063bee9 | 32k | see repo |
| `playwright-cli` | [microsoft/playwright-cli](https://github.com/microsoft/playwright-cli) (official Microsoft) | b85c7a7 (matches CLI 0.1.22) | 14k | Apache-2.0 |
| `graphify` (added 2026-11-18) | [Graphify-Labs/graphify](https://github.com/safishamsi/graphify), PyPI package `graphifyy` 0.9.112 | installed by its own CLI (`graphify install --platform claude --project`) | not checked | Apache-2.0 and MIT |
| `spec-driven-development`, `planning-and-task-breakdown`, `incremental-implementation`, `test-driven-development`, `code-review-and-quality`, `debugging-and-error-recovery`, `documentation-and-adrs`, `git-workflow-and-versioning`, `ci-cd-and-automation`, `security-and-hardening`, `api-and-interface-design`, `observability-and-instrumentation`, `interview-me`, `idea-refine` (plus `../references/`) | [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) | 2686b62 | 100k | MIT |

## Local modifications
- `ian-xiaohei-illustrations`: removed `assets/examples/` (14 MB of calibration PNGs, see upstream).
- `ui-ux-pro-max`: removed `scripts/tests/`.
- `img2threejs`: removed `forge/tests/` (1.7 MB).
- `impeccable`: skill payload only. Its optional hooks (SessionStart, PostToolUse on Edit/Write, Stop) were NOT installed. They can be added during the UI build stage if wanted.
- `awesome-design-md`: only the 74 `DESIGN.md` files plus README and LICENSE.
- `graphify`: skill payload only. Its installer also added a section to `CLAUDE.md`, a new `.claude/CLAUDE.md` and PreToolUse and SessionStart hooks in `.claude/settings.json`. All three were removed the same day: they were not asked for, and the hooks called a `graphify` command that is not on the PATH. `.graphifyignore` keeps build output, `.claude/` and `prototype/` out of the graph.

## Runtime notes
- `playwright-cli` needs the global CLI (`npm install -g @playwright/cli@latest`). Installed 2026-10-02; uses the local Chrome.
- `impeccable` downloads its engine binary (pinned version, SHA-256 checked) from its GitHub releases on first use, into `~/.impeccable/`.
- `ui-ux-pro-max` and `img2threejs` scripts need Python 3 (standard library only, local, no network).
- `web-design-guidelines` fetches Vercel's current guideline list from GitHub on each run.
- `graphify` runs from its own Python 3.13 environment: `~/.venvs/graphify/Scripts/graphify.exe` (Windows Python, not the MSYS2 one, which cannot install its tree-sitter parts). `graphify update .` rebuilds the code graph into `graphify-out/` (ignored by git) with no network and no key. Only `/graphify` on docs or images uses a model: Gemini if `GEMINI_API_KEY` or `GOOGLE_API_KEY` is set in the shell, otherwise Claude itself. Query log: `~/.cache/graphify-queries.log` (turn off with `GRAPHIFY_QUERY_LOG_DISABLE=1`).
- `motion`: docs search is free. Audits and spring tools need Motion+ (paid) and are optional.

## Licence texts
Full licence and notice files for every vendored source are in [../licenses/](../licenses/). Three sources declare MIT but ship no licence file upstream, so there is no text to copy:
- EnzeD/r3f-skills: MIT, declared in its README.
- vercel-labs/agent-skills: MIT, declared in its README and in the `react-best-practices` skill header.
- motiondivision/ai-kit: MIT, declared in its `package.json`.
