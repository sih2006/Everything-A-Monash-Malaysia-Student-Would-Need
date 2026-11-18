# What to do next

The open work, so that the owner or an AI agent can pick up a task and know when it is done. Finished work is in [STATUS.md](STATUS.md) and in the [releases](https://github.com/sih2006/Everything-A-Monash-Malaysia-Student-Would-Need/releases); task IDs are kept, so a missing number means the task is done.

Who can do each task:

- **Owner:** needs the owner's accounts, devices or taste.
- **Agent:** an AI agent can do it alone and prove it with tests.
- **Both:** the agent prepares, the owner decides or supplies something.

The **Version** column says which version of the [roadmap](../03-plan/roadmap.md) the task belongs to.

## A. For the owner

| # | Task | Version | Done when |
|---|---|---|---|
| A2 | **Review ADRs 0002 to 0007** in [docs/adr/](../adr/). They are marked "Proposed": for each one, accept it or say what to change. | now | Each ADR is "Accepted" or replaced |
| A4 | **Check the CGPA** against Monash's own CGPA calculator. GPA and WAM already match your transcript. | 0.9 | The numbers match, or the difference is reported |
| A5 | **Do the worked example** in [mvvm-guide.md](mvvm-guide.md) yourself: show notes on workouts. It is small on purpose and takes you through every layer once. | any time | The note shows on the Health screen and the new test passes |
| A6 | **Turn on auto-add on the board:** on the [project board](https://github.com/users/sih2006/projects/1), open **Workflows**, then **Auto-add to project**, pick this repository, filter `is:issue`, turn it on. GitHub does not let a script do this. | now | A new issue appears on the board by itself |
| A7 | **Protect `main`:** in the repository **Settings**, **Branches**, add a rule for `main` with **Require status checks to pass** and the check named `test`. | now | A pull request with a failing test cannot be merged |
| A8 | **The health interview** for v0.4: what "complete" health means to you, and the health mascot. | 0.4 | New HEA requirements are in the PRD and on the board |
| A9 | **Fill in your kitchen and correct the common meals.** Tick your equipment and ingredients on Food, Kitchen. When you next eat a common meal (Burger King and so on), log it with the real numbers from the receipt or app, once; your version then replaces the estimate. | 0.5 | What to eat matches your kitchen, and your usual meals have real numbers |
| A10 | **Set your food targets** on Food, Today. The app never picks them for you. | 0.5 | Progress gives a verdict for each day, week and month |

## B. Decisions only the owner can make

| # | Decision | Version | Why it blocks work |
|---|---|---|---|
| B1 | **The app's name** | 1.0 | It shows as `[APP NAME]` in the menu, the page title and the manifest |
| B2 | **The look.** The app carries four (tropical print, sticker book, night market, classic). Pick one, or keep the switcher as a feature. | 1.0 | Three sets of colours and fonts are loaded that may never be used |
| B3 | **Hosting:** Route A or Route B in [aws-setup.md](aws-setup.md), or Supabase ([ADR-0005](../adr/0005-hosting.md)) | 0.7 | Decides what storage and login look like |
| B4 | **Mascot art from your artist:** a penguin egg, a crab and Joel, each in a few moods, plus an app icon | 1.0 | The app has labelled empty spaces where they go |
| B5 | **How "realistic" treats a unit with no marks yet.** Now it compares with the average of your finished units. | any time | Open question 3 in the backlog |
| B6 | **Hurdle kinds.** The app supports "a minimum on one assessment". Do your units have other kinds, such as a minimum across all exams together? | any time | Open question 2 in the backlog |
| B7 | **The one "ask" shop** left in your records (its name is in your local app) | now | Its spending sits in an "ask" category, so Could cut cannot say if it is avoidable |
| B8 | **The AI service for advice:** Gemini (already planned for) or another API. Either way the key stays on the backend. | 0.6 | Task D7 |

## C. Agent tasks that need nothing from the owner

Each one is a small pull request.

| # | Task | Version | Where | Done when |
|---|---|---|---|---|
| C1 | **Browser tests in CI.** Needs the `@playwright/test` package, so ask the owner first. Turn the hand-run browser checks into a script. | 0.9 | new `web/e2e/`, `ci.yml` | The script passes locally and in CI, and fails if a button's action is unwired |
| C16 | **Import a bank statement from a file** (CSV first): pick the file, check the rows, sort them into categories, skip moves between your own accounts (BUD-18) | 0.7 | `backend/`, `web/` | A test file with known rows gives the right totals, and running it twice adds nothing twice |
| C17 | **Rules that sort spending by shop name** (for example "GRAB" goes to Eating out), editable in the app | 0.7 | `backend/`, `web/` | Tests for matching and for a rule that changes |
| C12 | **Android: port the budget, food and health rules to Kotlin**, with the same worked examples as `backend/test/domain.test.js` | 0.8 | `android/` | JUnit tests pass with the same numbers |
| C13 | **Android: a database on the phone** with the same tables as `backend/src/db.js` | 0.8 | `android/` | Data stays after the app is closed |
| C14 | **Android: screens in Compose, MVVM**, starting with Grades | 0.8 | `android/` | The phone shows the same report as the laptop for the same data |

## D. Agent tasks that wait for an owner decision

| # | Task | Version | Waits for |
|---|---|---|---|
| D5 | Run the AI features against the real Gemini API and fix what the first real run shows | 0.6 | A Gemini key ([gemini-setup.md](gemini-setup.md)) |
| D8 | **AI food advice and reading food pictures with the real key:** the backend sends the week's food totals, targets and workouts (no names) and saves the answer as the food advice; check the picture reader on a real photo and label | 0.6 | A key |
| D7 | **AI advice on the Expenses tab:** the backend sends the Could cut numbers (never the names of people paid) to the AI and saves the answer with `PUT /api/budget/advice` | 0.6 | B8 and a key |
| D3 | The DynamoDB store, the Lambda entry point, Cognito login and the CDK code ([aws-setup.md](aws-setup.md)) | 0.7 | B3, and the AWS account |
| D6 | Health Connect in the Android app, so steps, sleep and heart rate arrive without typing | 0.8 | C12 to C14 |
| D1 | Put the name everywhere it belongs, and write the app's public description | 1.0 | B1 |
| D2 | Remove the unused looks, or polish all four to the same level | 1.0 | B2 |
| D4 | Show the mascot art, one picture per mood, and add the app icons to the manifest | 1.0 | B4 |

## How to hand a task to an agent

> Read AGENTS.md and docs/handoff/STATUS.md. Then do task **C16** from docs/handoff/next-tasks.md. Work in small commits on a new branch named for the task. Run `python tools/check.py` before each commit. When you finish, update STATUS.md and tell me exactly what you tested and what you did not.
