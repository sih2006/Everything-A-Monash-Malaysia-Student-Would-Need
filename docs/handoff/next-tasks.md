# What to do next

An ordered list of work, written so that the owner or any AI agent can pick up a task and know when it is done. Each task says who can do it:

- **Owner:** needs the owner's accounts, devices or taste.
- **Agent:** an AI agent can do it alone and prove it with tests.
- **Both:** the agent prepares, the owner decides or supplies something.

When a task is finished, move it to the "Done" table in [STATUS.md](STATUS.md).

## A. First, by the owner (nothing else depends on an agent here)

| # | Task | Done when |
|---|---|---|
| A1 | **Run the app and try everything.** `node backend/src/server.js`, open the address, load the example data, click through every screen, then delete the data and enter two of your own units. | You have used every screen once and written down anything that felt wrong |
| A2 | **Read the five ADRs** in [docs/adr/](../adr/). Numbers 0002 to 0006 were decided by Claude during the build sprint and are marked "Proposed". For each one: accept it, or say what to change. | Each ADR's status is "Accepted" or it has been replaced |
| A3 | **Push the four branches and merge them** ([github-setup.md](github-setup.md), parts 1 to 4). | `main` on GitHub has everything and the Actions tab shows a green run |
| A4 | **Check the grade rules against your own results.** Enter one finished semester and compare the CGPA with Monash's own CGPA calculator. | The numbers match, or you have reported the difference |
| A5 | **Do the worked example** in [mvvm-guide.md](mvvm-guide.md) yourself: add notes to workouts. It is small on purpose, and it takes you through every layer once. | The note shows on the Health screen and the new test passes |

## B. Decisions only the owner can make

| # | Decision | Why it blocks work |
|---|---|---|
| B1 | **The app's name.** | It shows as `[APP NAME]` in the menu, the page title and the manifest |
| B2 | **The look.** The app carries four (tropical print, sticker book, night market, classic). Pick one, or keep the switcher as a feature. | Three sets of colours and fonts are loaded that may never be used |
| B3 | **Hosting:** Route A or Route B in [aws-setup.md](aws-setup.md), or Supabase. | Decides what the storage and login work looks like |
| B4 | **Mascot art from your artist:** a penguin egg, a crab and Joel, each in a few moods, plus an app icon. | The app has labelled empty spaces where they go |
| B5 | **How "realistic" should treat a unit with no marks yet.** Now it compares with the average of your finished units. | Open question 3 in the backlog |
| B6 | **Hurdle kinds.** The app supports "a minimum on one assessment". Do your units have other kinds, such as a minimum across all exams together? | Open question 2 in the backlog |

## C. Agent tasks that need nothing from the owner

In rough order of value. Each one is a small pull request.

| # | Task | Where | Done when |
|---|---|---|---|
| C1 | **Browser tests in CI.** Turn the hand-run browser checks (add a unit, a mark, a target, a refused weight, spending, reload) into a Playwright script. | new `web/e2e/`, `ci.yml` | The script passes locally and in CI, and fails if a button's action is unwired |
| C2 | **Edit a unit's name, credit points and semester** from the screen. The API (`PATCH /api/units/:code`) already supports it. | `web/js/` | A form in "Target and unit settings" saves all three; a ViewModel test covers it |
| C3 | **Look at other days and months.** The API takes `?date=` and `?month=`. Add previous and next buttons to Budget, Food and Health. | `web/js/` | You can see last month's budget and yesterday's food |
| C4 | **Manage the quick-add food list** (remove and edit a remembered food). | `store.js`, `api.js`, `web/js/` | A remembered food can be removed; tests at each layer |
| C5 | **Export and import all data** as one JSON file. | `api.js`, `web/js/` | Export, delete everything, import gives the same app back; a test proves the round trip |
| C6 | **Limit wrong token guesses.** After 5 wrong tokens from one address, refuse for 15 minutes. | `backend/src/api.js` | A test shows the sixth wrong guess gets a 429 |
| C7 | **Benchmarks for the data structures** (story ENG-07). Time each operation at growing sizes and record the results next to the stated complexity. | new `core/bench/` | A table in `core/README.md` shows the measured growth matches O(1), O(n), O(n log n) |
| C8 | **Accessibility pass.** Keyboard-only run through every screen, screen-reader labels, colour contrast in all four looks and both modes. | `web/` | A short report in `docs/proofs/` with what was checked, what failed and what was fixed |
| C9 | **Sort and filter spending and units** (by date, by category, by verdict). | `web/js/viewmodels/` | Presenter tests cover each order |
| C10 | **A "reset to example data" script for demos**, and a short screen recording script. | `tools/` | One command gives a clean demo state |

## D. Agent tasks that wait for an owner decision

| # | Task | Waits for |
|---|---|---|
| D1 | Put the name everywhere it belongs, and write the app's public description | B1 |
| D2 | Remove the unused looks, or polish all four to the same level | B2 |
| D3 | The DynamoDB store, the Lambda entry point, Cognito login and the CDK code ([aws-setup.md](aws-setup.md), the table of 8 tasks) | B3, and the AWS account |
| D4 | Show the mascot art, with one picture per mood, and add the app icons to the manifest | B4 |
| D5 | Run the two AI features against the real Gemini API and fix whatever the first real run shows | The Gemini key ([gemini-setup.md](gemini-setup.md)) |
| D6 | The Android wrapper and the Health Connect plugin ([android-setup.md](android-setup.md), way 3) | B3 (it needs the app online) and Android Studio |

## E. Later releases from the backlog

These are epics in [the product backlog](../01-requirements/product-backlog.md) that are not broken into stories yet. Each one starts with an interview of the owner, not with code.

- **Handbook lookup:** type a unit code and get its details and a link to its handbook page.
- **Future goals:** the WAM, GPA or CGPA needed for a goal such as a master's in Australia, from researched entry requirements with sources and dates.
- **What people say about a unit:** a summary of recent public discussion, with links.
- **Offline first with sync:** the phone keeps working with no signal and catches up later. This needs the hosting decision first.

## How to hand a task to an agent

Give it this, filled in:

> Read AGENTS.md and docs/handoff/STATUS.md. Then do task **C2** from docs/handoff/next-tasks.md. Work in small commits on a new branch named for the task. Run `python tools/check.py` before each commit. When you finish, update STATUS.md and tell me exactly what you tested and what you did not.
