# Backend: data and API

**Status:** Draft. It describes what was built on 16 November 2026.

This document answers: what is stored, how is it laid out, and which addresses does the web app call?

## 1. What is stored

```mermaid
erDiagram
  units ||--o{ assessments : has
  budget_categories ||--o{ transactions : has
  accounts ||--o{ account_moves : has
  transactions |o--o| account_moves : "paid from"
  workouts ||--o{ exercises : has

  units {
    text code PK "FIT2004"
    text name
    text term "S1 2027"
    real credit "6"
    real target "unit mark aimed for, or empty"
    int pass_fail "1 = pass or fail only; never counts in GPA, CGPA or WAM"
  }
  assessments {
    int id PK
    text unit_code FK
    text name
    real weight "percent of the unit"
    real score "marks received, or empty = not done"
    real max "marks available"
    real hurdle "lowest percent that passes, or empty"
  }
  results {
    int id PK
    text code "a finished unit"
    text name
    real credit
    real mark "final mark"
    text grade "only for NP, NH, WN; else empty"
    text term
  }
  budget_categories {
    int id PK
    text name UK
    real monthly_limit
    int essential "1 = rent, fees: never listed as could cut"
  }
  transactions {
    int id PK
    int category_id FK
    text what
    real amount "MYR"
    text spent_on "YYYY-MM-DD"
  }
  accounts {
    int id PK
    text name UK "Maybank"
    text kind "bank, ewallet, investment, cash"
  }
  account_moves {
    int id PK
    int account_id FK
    text kind "set, in, out"
    real amount
    text moved_on "YYYY-MM-DD"
    text note
    int transaction_id FK "the spending that made it, or empty"
    int transfer "1 = between your own accounts"
  }
  foods {
    int id PK
    text name UK "remembered for quick add"
    real kcal
    real protein
  }
  food_log {
    int id PK
    text eaten_on "YYYY-MM-DD"
    text meal "Breakfast, Lunch, Dinner, Snack"
    text food
    real kcal
    real protein
  }
  health_days {
    text day PK "YYYY-MM-DD"
    int steps
    int sleep_minutes
    int resting_hr
    real weight_kg
    int water_ml
  }
  workouts {
    int id PK
    text done_on
    text name
    text notes
    text kind "gym, run, walk, cycle, swim, sport, other"
    int minutes
  }
  exercises {
    int id PK
    int workout_id FK
    text name
    int sets
    int reps
    real weight_kg
  }
  settings {
    text key PK
    text value "JSON"
  }
```

Notes:

- **Nothing worked out is stored.** GPA, verdicts, totals and summaries are calculated when asked for. So they can never be out of step with the marks.
- **Deleting a unit deletes its assessments.** Deleting a budget category deletes its spending. The database enforces this (`ON DELETE CASCADE`).
- **Days are text** in the form `YYYY-MM-DD`, worked out in Malaysian time. Text in that form sorts and compares correctly.
- **`settings` keys:** `academics.currentTerm`, `academics.margin`, `academics.goal`, `academics.termDates`, `budget.limit`, `budget.advice`, `currency.rates` (the last rates fetched, "1 MYR = x"), `currency.manual` (rates typed by hand, "1 x = y MYR"), `food.targets`, `food.advice`, `food.kitchen` (equipment and ingredients the user has), `health.targets`.
- **An account's balance is not stored.** It is worked out from its moves, by day and then in the order entered. A `set` move means "it held exactly this much on this day": moves before it stop counting. A move between two of your own accounts is marked `transfer`, so it is never income or spending.
- **There is one user**, so no table has a user column. Adding more users means adding one to every table (see section 4).
- **Changes to the layout** are added as a new step at the end of `MIGRATIONS` in `backend/src/db.js`. The database remembers which steps it has run.

## 2. The API

Every address returns JSON. An error looks like this, with a status code of 400 or above:

```json
{ "error": { "code": "invalid", "message": "The amount must be from 0.01 to 1000000.", "field": "amount" } }
```

A change to grades returns the whole new grades report, so the screen can redraw from one answer. The same goes for budget, food and health.

### Everything

| Method and address | What it does |
|---|---|
| `GET /api/status` | Is the engine built, is the AI helper on, is the app empty |
| `GET /api/overview` | Grades, budget, food and health in one answer. Used when the app opens |
| `POST /api/demo` | Loads the example data. Only into an empty app |
| `DELETE /api/data` | Deletes everything. The body must be `{"confirm": "delete everything"}` |

### Grades

| Method and address | Body | What it does |
|---|---|---|
| `GET /api/academics` | | The full report from the engine |
| `POST /api/units` | `code`, `name`, `credit`, `term` | Adds a unit |
| `PATCH /api/units/:code` | any of `name`, `term`, `credit`, `target` (a number, or `null` to remove) | Changes a unit |
| `DELETE /api/units/:code` | | Removes a unit and its assessments |
| `POST /api/units/:code/assessments` | `name`, `weight`, and optionally `score`, `max`, `hurdle` | Adds an assessment |
| `PATCH /api/assessments/:id` | any of `name`, `weight`, `score` (`null` = not done), `max`, `hurdle` (`null` = none) | Changes an assessment |
| `DELETE /api/assessments/:id` | | Removes an assessment |
| `POST /api/results` | `code`, `name`, `credit`, `mark`, `grade`, `term` | Adds a finished unit |
| `DELETE /api/results/:id` | | Removes a finished unit |
| `PUT /api/academics/settings` | any of `currentTerm`, `margin`, `goal` (`{measure, value, totalCredits}` or `null`) | Saves the goal and settings |
| `GET /api/academics/whatif?unit=CODE&score=N` | | The final mark and grade for scoring N% on what is left. Saves nothing |
| `GET /api/academics/predict?u=CODE:N&u=…` | | The semester's GPA, CGPA and WAM if each unit named scores N% on what is left. Saves nothing |

`POST /api/units` and `PATCH /api/units/:code` also take `passFail` (true or false).

### Budget

| Method and address | Body | What it does |
|---|---|---|
| `GET /api/budget?month=YYYY-MM` | | The summary for a month (this month if left out). It includes `money` (accounts and total, always as of now), `income` (money in that month), `spans` (for this month, 3 months, a year and all time: everything spent, and the spending outside essential categories with the places paid most), `reducible` (the same for 3 months), `byMonth` (each month's total by category) and `advice` |
| `PUT /api/budget/settings` | `limit` (a number or `null`) | Sets the monthly limit |
| `POST /api/budget/categories` | `name`, `limit`, `essential` | Adds a category |
| `PATCH /api/budget/categories/:id` | any of `name`, `limit`, `essential` (true or false) | Changes a category |
| `PUT /api/budget/advice` | `text` (or `null` to remove), `by` | Saves the advice shown on the Expenses tab. For now it is written by hand; later the AI helper fills it |
| `DELETE /api/budget/categories/:id` | | Removes a category and its spending |
| `POST /api/transactions` | `what`, `amount`, `category` (its name), `date`, `accountId` (optional) | Adds spending. The date cannot be in the future. With `accountId`, the account goes down too |
| `DELETE /api/transactions/:id` | | Removes spending |

### Other currencies

| Method and address | Body | What it does |
|---|---|---|
| `GET /api/currency` | | The rates for USD, OMR, CZK, CAD and IDR, and where each came from. Fetches today's rates first if the saved ones are older ([ADR-0008](../adr/0008-exchange-rates.md)) |
| `POST /api/currency/refresh` | | Fetches the rates again now |
| `PUT /api/currency/manual` | `code`, `myrPerUnit` (or `null` to remove) | A rate typed by hand, "1 USD = 4.25 MYR". It wins over the live rate |

### Money accounts

| Method and address | Body | What it does |
|---|---|---|
| `POST /api/accounts` | `name`, `kind`, `balance` (optional) | Adds an account |
| `PATCH /api/accounts/:id` | any of `name`, `kind` | Changes an account |
| `DELETE /api/accounts/:id` | | Removes an account and its moves. Spending paid from it stays |
| `PUT /api/accounts/:id/balance` | `balance`, `date` (optional), `note` | "It held exactly this much on this day" |
| `POST /api/accounts/:id/income` | `amount`, `note`, `date` | Money in |
| `POST /api/accounts/transfer` | `from`, `to`, `amount`, `date` | Moves money between two of your own accounts. Not spending, not income |
| `DELETE /api/account-moves/:id` | | Removes a move. A move made by spending is removed by removing the spending |

### Food

| Method and address | Body | What it does |
|---|---|---|
| `GET /api/food?date=YYYY-MM-DD` | | The summary for a day (today if left out), with `periods` (the day, its week and its month), `presets` (common meals for quick add), `plan` (the kitchen, and home-cooked recipes ranked for what is left) and `advice` |
| `PUT /api/food/settings` | `targetKcal`, `targetProtein` | Sets the daily targets |
| `POST /api/food/log` | `food`, `kcal`, `protein`, `meal`, `date`, `remember` | Logs a food. `remember: true` also saves it for quick add |
| `DELETE /api/food/items/:id` | | Forgets a remembered food. What was logged with it stays |
| `PUT /api/food/kitchen` | `equipment`, `pantry` (lists of names) | Saves the kitchen. Unknown names are dropped |
| `PUT /api/food/advice` | `text` (or `null`), `by` | Saves the advice shown under Progress |
| `POST /api/food/read-picture` | `image` (base64), `mimeType` | Food, calories and protein read from a photo or label by the AI helper. Saves nothing |
| `DELETE /api/food/log/:id` | | Removes an entry |

### Health

| Method and address | Body | What it does |
|---|---|---|
| `GET /api/health?date=YYYY-MM-DD` | | The week that holds the day |
| `PUT /api/health/settings` | `stepTarget`, `sleepTargetMinutes`, `workoutTarget` | Sets the targets |
| `PUT /api/health/settings` (more) | also `waterTarget` (ml), `weightGoalKg`, `heightCm` | Water target, goal weight and height (for BMI) |
| `PUT /api/health/days/:day` | any of `steps`, `sleepMinutes`, `restingHr`, `weightKg`, `waterMl` | Saves a day. Values left out are kept |
| `POST /api/workouts` | `name`, `date`, `notes`, `kind`, `minutes` | Adds a workout |
| `POST /api/workouts/:id/exercises` | `name`, `sets`, `reps`, `weightKg` | Adds an exercise to a workout |
| `DELETE /api/exercises/:id` | | Removes an exercise |
| `DELETE /api/workouts/:id` | | Removes a workout and its exercises |

### Map and your data

| Method and address | What it does |
|---|---|
| `GET /api/life` | The life tree: years, then studies, money, food and health, down to days |
| `GET /api/export` | Everything in one JSON file |
| `POST /api/import` | Puts an exported file back, only into an empty app |

### The AI helper

| Method and address | Body | What it does |
|---|---|---|
| `POST /api/advisor/plan` | | A study plan from Gemini. Answers 503 with a how-to message when no key is set |
| `POST /api/import/screenshot` | `image` (base64), `mimeType` | A list of assessments read from a picture. Saves nothing |

### Limits and checks

- A normal request body can be at most 64 KB; a screenshot at most 8 MB.
- Text is trimmed and may not contain control characters. Numbers must be finite and inside a stated range.
- When `APP_TOKEN` is set, every `/api/` call needs the header `Authorization: Bearer <token>`.

## 3. The questions the app asks its data

For a move to DynamoDB, the table is designed from this list, not from the tables above.

| # | Question | Asked by |
|---|---|---|
| Q1 | All units, each with its assessments, and all finished results, and the academics settings | Every grades screen and every grades change |
| Q2 | One unit by its code | Checks before a change |
| Q3 | One assessment by its id | Checks before a change |
| Q4 | All budget categories, and all spending in one month, newest first | Budget screen |
| Q5 | One category by name, ignoring upper and lower case | Adding spending |
| Q6 | The food log of one day, in the order it was logged | Food screen |
| Q7 | All remembered foods, by name | Food screen |
| Q8 | Health days and workouts in one week | Health screen |
| Q9 | One setting by key | Everywhere |

**A first sketch for one DynamoDB table** (to be reviewed in the hosting work, not built):

| Partition key (`PK`) | Sort key (`SK`) | Holds | Answers |
|---|---|---|---|
| `USER#<id>` | `ACA#UNIT#<code>` | a unit | Q1, Q2 |
| `USER#<id>` | `ACA#UNIT#<code>#A#<id>` | an assessment | Q1, Q3 |
| `USER#<id>` | `ACA#RESULT#<id>` | a finished unit | Q1 |
| `USER#<id>` | `BUD#CAT#<name in lower case>` | a category | Q4, Q5 |
| `USER#<id>` | `BUD#TX#<date>#<id>` | spending | Q4: "begins with `BUD#TX#2026-11`" |
| `USER#<id>` | `FOOD#LOG#<date>#<id>` | a food entry | Q6 |
| `USER#<id>` | `FOOD#ITEM#<name>` | a remembered food | Q7 |
| `USER#<id>` | `HEALTH#DAY#<date>` | a health day | Q8: a range between two dates |
| `USER#<id>` | `HEALTH#WORKOUT#<date>#<id>` | a workout | Q8 |
| `USER#<id>` | `SET#<key>` | a setting | Q9 |

Q1 becomes one query: everything that begins with `ACA#`. Every question is a query on one partition, with no scans.

## 4. If there are ever more users

- Add a user id to every table (or use the `USER#<id>` key above).
- Every query must filter by the signed-in user. The safest place is inside the store, so no route can forget it.
- The engine needs no change: it is given one user's data at a time.
