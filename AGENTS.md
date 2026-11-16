# Instructions for AI agents

Read this file first if you are an AI assistant (any chatbot or coding agent) asked to work on this project. It tells you how the project works, what the owner expects, and what to do next. Claude Code also reads [CLAUDE.md](CLAUDE.md), which has more detail on skills.

## 1. Start here, every time

1. Read [docs/handoff/STATUS.md](docs/handoff/STATUS.md). It says what is built, what is tested and what is not.
2. Run `python tools/check.py`. All tests must pass before you change anything. If they do not, fix that first or tell the owner.
3. Pick the next task from [docs/handoff/next-tasks.md](docs/handoff/next-tasks.md), or do what the owner asked.

## 2. The project in five lines

- A personal companion app for one Monash University Malaysia student: grades, budget, food, health.
- `core/` is C++17 with hand-built data structures. It holds **every grade rule**. It is a terminal program and also an engine (`tracker --engine`).
- `backend/` is Node with **no packages**. It stores data in SQLite, calls the engine for grade maths, and serves a JSON API and the web app.
- `web/` is plain HTML, CSS and JavaScript modules in **MVVM**, with **no build step**.
- It is a portfolio project. The owner must be able to explain every part of it in an interview.

## 3. Rules from the owner

These are not suggestions. The owner stated each one.

1. **Write simple English, about B2 level.** Short sentences, common words. This covers documents, code comments, commit messages and messages on screen.
2. **Never create images.** No generated or drawn pictures, not even placeholders. Mascot art comes from the owner's artist friend. Leave a labelled empty space. Small line icons in the interface are fine.
3. **The owner makes the decisions.** If a choice is not already recorded, ask. If you cannot ask, choose, and record the choice as an ADR in `docs/adr/` with status "Proposed" and the options you turned down.
4. **The user sets every target and goal.** The app gives the verdict (on course, possible, realistic) and may suggest a default target worked out from the user's own final goal. It never invents a goal.
5. **GPA and CGPA are different numbers.** Monash Malaysia's CGPA uses its own scale. Never mix them or label one as the other. See [docs/02-design/grade-rules.md](docs/02-design/grade-rules.md).
6. **Explain before you install or spend.** Do not add a package, a tool, a cloud service or anything that can cost money without telling the owner first. Free tiers only.
7. **Never commit secrets.** API keys go in `.env` (ignored by git) or the host's secret store. CI fails if a Google key or a `.env` file is committed.
8. **Currency is MYR, the time zone is Asia/Kuala_Lumpur, the locale is en-MY.**

## 4. How to work

- **Small steps.** Change one thing, test it, commit it.
- **Tests first for rules.** Any rule with numbers (a grade rule, a budget rule) gets a test with a hand-worked example before or with the code.
- **Commits:** conventional commits in plain English, for example `feat(budget): add a weekly view`. One logical change per commit. Mention the story ID (`Refs: ACA-09`) when there is one.
- **Never push, open a pull request or change GitHub settings unless the owner asks.**
- **When you finish a piece of work,** update [docs/handoff/STATUS.md](docs/handoff/STATUS.md) and, if the design changed, the matching document in `docs/`.

## 5. Where each kind of change goes

| You want to change | Change it in | Then test with |
|---|---|---|
| A grade rule, GPA, CGPA, WAM, a verdict | `core/src/lib/` and `core/include/tracker/` only | `core/build/tracker_tests`, `core/tests/blackbox.py` |
| A budget, food or health rule | `backend/src/domain.js` (pure functions) | `backend/test/domain.test.js` |
| What is stored | a new entry at the end of `MIGRATIONS` in `backend/src/db.js`, then `backend/src/store.js` | `backend/test/api.test.js` |
| An API address | `backend/src/api.js`, and list it in `docs/02-design/backend-schema.md` | `backend/test/api.test.js` |
| What a screen says or shows | a presenter in `web/js/viewmodels/present.js` | `web/test/viewmodel.test.js` |
| What happens when the user does something | a command in `web/js/viewmodels/appViewModel.js`, wired in `web/js/app.js` | `web/test/viewmodel.test.js` |
| The HTML of a screen | `web/js/views/` | in a browser |
| Colours, fonts, shapes | tokens in `web/css/styles.css` and `web/css/looks.css` | in a browser, light and dark |

The step-by-step version, with a worked example, is [docs/handoff/mvvm-guide.md](docs/handoff/mvvm-guide.md).

## 6. Things that will go wrong if you ignore them

- **Do not repeat a grade rule outside the C++ core.** The backend and the web app must ask the engine. A second copy of a rule will drift.
- **Do not add a standard-library container (`std::vector`, `std::map`, ...) to `core/`.** The hand-built structures in `core/include/ds/` are the point of the project. `std::string` and streams are allowed.
- **Do not add npm packages or a build step** without an ADR. "No packages, no build" is a recorded decision ([ADR-0002](docs/adr/0002-local-first-stack.md), [ADR-0003](docs/adr/0003-web-app-without-a-build-step.md)).
- **Escape everything a user typed** before putting it in HTML. Use `esc()` from `web/js/format.js`.
- **Do not put raw marks into the page when grades are hidden.** The presenters mask them; a test checks this.
- **`git commit` with nothing after it commits everything staged.** The owner's editor sometimes stages unrelated files. Commit with the paths named: `git commit -m "..." -- path1 path2`.

## 7. What needs the owner (you cannot do these)

| Task | Why it needs the owner | Guide |
|---|---|---|
| Get a Gemini API key | Needs their Google account | [gemini-setup.md](docs/handoff/gemini-setup.md) |
| Push branches, open pull requests, set up the board | Needs their GitHub login | [github-setup.md](docs/handoff/github-setup.md) |
| Create an AWS account and deploy | Needs their identity and a payment card | [aws-setup.md](docs/handoff/aws-setup.md) |
| Install on the phone | Needs their phone | [android-setup.md](docs/handoff/android-setup.md) |
| Mascot art, the app name, the look | Their choices | [next-tasks.md](docs/handoff/next-tasks.md) |

## 8. Honesty

Say what you tested and what you did not. If a test fails, show the output. If you guessed, say it was a guess. The owner would rather read "I could not check this" than find out later.
