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
| A3 | **Done (18 November).** Branches merged through pull requests #1 to #7; CI green on Linux. | `main` on GitHub has everything and the Actions tab shows a green run |
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
| B7 | **What are the two "ask" shops?** They show up again and again in your records (names are in your local app). | Their spending sits in "ask" categories, so Could cut cannot say if they are avoidable |
| B8 | **The advice source.** Gemini (the key is already planned for) or the Claude API. Either way the key stays on the backend. | Task D7 |
| B6 | **Hurdle kinds.** The app supports "a minimum on one assessment". Do your units have other kinds, such as a minimum across all exams together? | Open question 2 in the backlog |

## C. Agent tasks that need nothing from the owner

In rough order of value. Each one is a small pull request.

**Done on 17 November 2026, on the branch `feat/next-tasks`:** C2, C3, C4, C5, C6, C7, C8, C9 and C10. Each row below says where. Only C1 is left, and it needs the owner's approval because it installs a package.

| # | Task | Where | Done when |
|---|---|---|---|
| C1 | **Browser tests in CI.** Needs the `@playwright/test` package: ask the owner first. Turn the hand-run browser checks (add a unit, a mark, a target, a refused weight, spending, reload) into a Playwright script. | new `web/e2e/`, `ci.yml` | The script passes locally and in CI, and fails if a button's action is unwired |
| C2 | **Done.** **Edit a unit's name, credit points and semester** from the screen. The API (`PATCH /api/units/:code`) already supports it. | `web/js/` | A form in "Target and unit settings" saves all three; a ViewModel test covers it |
| C3 | **Done.** **Look at other days and months.** The API takes `?date=` and `?month=`. Add previous and next buttons to Budget, Food and Health. | `web/js/` | You can see last month's budget and yesterday's food |
| C4 | **Done.** **Manage the quick-add food list** (remove and edit a remembered food). | `store.js`, `api.js`, `web/js/` | A remembered food can be removed; tests at each layer |
| C5 | **Done.** **Export and import all data** as one JSON file. | `api.js`, `web/js/` | Export, delete everything, import gives the same app back; a test proves the round trip |
| C6 | **Done.** **Limit wrong token guesses.** After 5 wrong tokens from one address, refuse for 15 minutes. | `backend/src/api.js` | A test shows the sixth wrong guess gets a 429 |
| C7 | **Done.** **Benchmarks for the data structures** (story ENG-07). Results: [core/README.md](../../core/README.md#measured-do-the-costs-hold). Time each operation at growing sizes and record the results next to the stated complexity. | new `core/bench/` | A table in `core/README.md` shows the measured growth matches O(1), O(n), O(n log n) |
| C8 | **Done.** **Accessibility pass.** Results: [accessibility.md](../proofs/accessibility.md). Keyboard-only run through every screen, screen-reader labels, colour contrast in all four looks and both modes. | `web/` | A short report in `docs/proofs/` with what was checked, what failed and what was fixed |
| C9 | **Done.** **Sort and filter spending and units** (by date, by category, by verdict). | `web/js/viewmodels/` | Presenter tests cover each order |
| C10 | **Done.** **Demo mode** (`node backend/src/server.js --demo`) and a [walkthrough](demo-script.md). | `tools/` | One command gives a clean demo state |

| C11 | **Done.** Money accounts, the life tree, semester dates, more grade sorting and more health. See [STATUS.md](STATUS.md). | `backend/`, `web/` | Tests at each layer |
| C15 | **Done (18 November).** Pass/fail units, what-if totals, money in, height and BMI, Hide money, Budget tabs, essential categories, Could cut, advice, and the fix for balances by date. See [STATUS.md](STATUS.md). | `core/`, `backend/`, `web/` | Tests at each layer |
| C16 | **Import a bank statement from a file** (CSV first). Today statements were read by a one-off script outside the repository. Make it a feature: pick the file, check the rows, sort them into categories, skip moves between your own accounts. | `backend/`, `web/` | A test file with known rows gives the right totals, and running it twice adds nothing twice |
| C17 | **Rules that sort spending by shop name** (for example "GRAB" goes to Eating out), kept in the app and editable, so new spending sorts itself | `backend/`, `web/` | Tests for matching and for a rule that changes |
| C12 | **Android: port the budget, food and health rules to Kotlin**, with the same worked examples as `backend/test/domain.test.js`. | `android/` on `feat/android` | JUnit tests pass with the same numbers |
| C13 | **Android: a database on the phone** (Room or plain SQLite) with the same tables as `backend/src/db.js`. | `android/` | Data stays after the app is closed |
| C14 | **Android: screens in Compose, MVVM**, starting with Grades. | `android/` | The phone shows the same report as the laptop for the same data |

## D. Agent tasks that wait for an owner decision

| # | Task | Waits for |
|---|---|---|
| D1 | Put the name everywhere it belongs, and write the app's public description | B1 |
| D2 | Remove the unused looks, or polish all four to the same level | B2 |
| D3 | The DynamoDB store, the Lambda entry point, Cognito login and the CDK code ([aws-setup.md](aws-setup.md), the table of 8 tasks) | B3, and the AWS account |
| D4 | Show the mascot art, with one picture per mood, and add the app icons to the manifest | B4 |
| D5 | Run the two AI features against the real Gemini API and fix whatever the first real run shows | The Gemini key ([gemini-setup.md](gemini-setup.md)) |
| D6 | Health Connect in the native Android app ([ADR-0007](../adr/0007-native-android-app.md)), so steps, sleep and heart rate arrive without typing | C12 to C14 |
| D7 | **AI advice on the Expenses tab**: the backend sends the Could cut numbers (never names of people) to the AI and saves the answer with `PUT /api/budget/advice`. The placeholder text shows what it should look like | B8 and a key |

## E. Later releases from the backlog

These are epics in [the product backlog](../01-requirements/product-backlog.md) that are not broken into stories yet. Each one starts with an interview of the owner, not with code.

- **Handbook lookup:** type a unit code and get its details and a link to its handbook page.
- **Future goals:** the WAM, GPA or CGPA needed for a goal such as a master's in Australia, from researched entry requirements with sources and dates.
- **What people say about a unit:** a summary of recent public discussion, with links.
- **Offline first with sync:** the phone keeps working with no signal and catches up later. This needs the hosting decision first.

## How to hand a task to an agent

Give it this, filled in:

> Read AGENTS.md and docs/handoff/STATUS.md. Then do task **C2** from docs/handoff/next-tasks.md. Work in small commits on a new branch named for the task. Run `python tools/check.py` before each commit. When you finish, update STATUS.md and tell me exactly what you tested and what you did not.
