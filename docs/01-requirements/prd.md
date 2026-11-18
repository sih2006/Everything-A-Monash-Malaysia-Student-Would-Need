# Product requirements (PRD)

**Status:** Draft, 16 November 2026, updated 18 November. The grades requirements come from the [product backlog](product-backlog.md), which the owner shaped in an interview. The requirements for budget, food, health, the map and the app were **written after the code**, from what the owner asked for, and the owner has not reviewed them. Every requirement here is also an issue on the [project board](https://github.com/users/sih2006/projects/1).

This document answers: what must each part of the app do?

## How requirements are written

- Each requirement has a permanent ID: a prefix for the module and a number.
- "Must" means the app is wrong without it. "Should" means important but the app still works. "Could" means only if time allows.
- "Version" is the version of the [roadmap](../03-plan/roadmap.md) it belongs to. The last column says where it stands today.

| Prefix | Module |
|---|---|
| `ACA`, `GPA`, `ENG` | Grades and engineering. These live in the [product backlog](product-backlog.md) with full acceptance criteria. They are not repeated here. |
| `BUD` | Budget |
| `NUT` | Food |
| `HEA` | Health |
| `MAP` | The map |
| `APP` | The whole app |
| `ADV` | The AI helper |

## Grades

See the [product backlog](product-backlog.md): 37 stories with acceptance criteria, priorities and sizes. Which test proves each one is in the [test plan](../03-plan/test-plan.md#3-traceability-which-test-proves-which-story).

## Budget

| ID | Requirement | Priority | Version | State |
|---|---|---|---|---|
| BUD-01 | The user sets a monthly limit in MYR. With no limit set, the category limits are added up. With neither, the app shows spending and gives no verdict. | Must | 0.2 | Built, tested |
| BUD-02 | The user makes their own categories, each with an optional monthly limit. A category name cannot be used twice. | Must | 0.2 | Built, tested |
| BUD-03 | The user records spending: what, how much, which category, which day. The amount must be above 0. The day cannot be in the future. | Must | 0.2 | Built, tested |
| BUD-04 | The app shows spent, left, and how much can be spent per day to stay inside the limit. | Must | 0.2 | Built, tested |
| BUD-05 | The app gives a verdict: on pace, ahead of pace (more than 5 points ahead of the calendar), or over the limit. | Must | 0.2 | Built, tested. **The 5 points is a starting value, not the owner's choice yet.** |
| BUD-06 | A category over its own limit is flagged, with the amount over. | Must | 0.2 | Built, tested |
| BUD-07 | Spending can be removed. | Must | 0.2 | Built, tested |
| BUD-08 | Another month can be viewed. | Should | 0.2 | Built, tested |
| BUD-09 | Spending is shown week by week. | Could | 0.2 | Built (used by the map), tested |

Added on 17 and 18 November 2026, from what the owner asked for. Written after the code; not reviewed by the owner yet.

| ID | Requirement | Priority | Version | State |
|---|---|---|---|---|
| BUD-10 | The user keeps money accounts (bank, e-wallet, investing, cash) and sees the total, the money to spend and the money invested. | Must | 0.3 | Built, tested |
| BUD-11 | The user can say what an account held on a day. Moves before that day stop counting; moves after it still count, whatever order they were typed in. | Must | 0.3 | Built, tested |
| BUD-12 | Spending can be paid from an account, which then goes down. Money moved between two of your own accounts is neither spending nor income. | Must | 0.3 | Built, tested |
| BUD-13 | The user records money in. The month shows money in by source and what is left after spending. | Must | 0.3 | Built, tested |
| BUD-14 | Budget is split into tabs: Overview, Banking, Investing and Expenses. Banking and Investing show one account at a time; the others stay hidden until picked. | Should | 0.3 | Built, tested |
| BUD-15 | A category can be marked essential (such as rent or fees). | Should | 0.3 | Built, tested |
| BUD-16 | "Could cut" shows spending outside essential categories over the last 3 months: per month, by category, and the places paid most, with how often and the usual amount. | Should | 0.3 | Built, tested. **3 months is a starting value, not the owner's choice yet.** |
| BUD-17 | The Expenses tab shows advice. For now it is text written by hand; later the AI helper writes it from the numbers. | Could | 0.3 | Built, tested. The AI part is task D7 |
| BUD-18 | A bank or e-wallet statement can be imported from a file. | Should | 0.7 | **Not built.** Task C16 |
| BUD-20 | The Expenses tab looks back over this month, 3 months, a year or all time. For the period it shows the total spent (essential included), the essential part and what could be cut, and the spending map and could-cut list follow it. A period never reaches back before the first spending. | Should | 0.3 | Built, tested |
| BUD-21 | A month-by-month table of what was spent on each category, for the period chosen. | Should | 0.3 | Built, tested |
| BUD-22 | A converter shows an amount in ringgit, US dollars, Omani rials, Czech koruna, Canadian dollars and Indonesian rupiah ([ADR-0008](../adr/0008-exchange-rates.md)). | Should | 0.3 | Built, tested |
| BUD-23 | Every amount in the app can be shown in one of those currencies, at a live rate fetched once a day or a rate typed by hand. Amounts are still typed and stored in ringgit. | Should | 0.3 | Built, tested |
| BUD-19 | A spending map on the Expenses tab: one block per category outside the essential ones, sized by the average month, with the places inside it. A legend, a hover tip on every block and a table view. | Should | 0.3 | Built, tested. Checked in light, dark and at phone width |

## Food

| ID | Requirement | Priority | Version | State |
|---|---|---|---|---|
| NUT-01 | The user sets a daily calorie target and an optional protein target. With no target, the app shows totals and gives no verdict. | Must | 0.2 | Built, tested |
| NUT-02 | The user logs a food with calories, optional protein, and a meal (breakfast, lunch, dinner or snack). | Must | 0.2 | Built, tested |
| NUT-03 | The app shows eaten, left, and whether the day is on or over target. Exactly on target is not over. | Must | 0.2 | Built, tested |
| NUT-04 | A food can be remembered and logged again with one press, and removed from that list. | Should | 0.2 | Built, tested |
| NUT-05 | A log entry can be removed. | Must | 0.2 | Built, tested |
| NUT-06 | A lookup of Malaysian foods with their calories. | Could | 0.5 | **Not built.** The capability map names it. Foods are typed in once instead. |
| NUT-08 | The owner's usual meals are ready for quick add (Burger King value meal and fries, kebab and shawarma, nasi lemak, nasi goreng ayam, ayam gepuk, chicken tandoori, fast food, eggs, a protein shake with milk, cheesy garlic bread), with no noodles, oats, Milo or teh tarik. Their numbers are rough estimates and say so; a meal the user saves with their own numbers replaces it. | Should | 0.5 | Built, tested |
| NUT-09 | Every meal the user logs is saved to their meals by default, so it is one press next time. | Should | 0.5 | Built, tested |
| NUT-10 | Progress shows today, this week and this month: average calories and protein, days logged, and days on target when targets are set. Days with nothing logged are not counted. | Should | 0.5 | Built, tested |
| NUT-11 | Advice on how the eating is going and what to do next. For now written by hand; later the AI helper writes it from food, workouts and health. | Should | 0.5 | Built, tested. The AI part is v0.6 |
| NUT-12 | A photo of a meal, or its nutrition label, is read by the AI helper into food, calories and protein. The user checks every row before anything is logged. | Should | 0.5 | Built. Tested with a fake AI service only; the real run is v0.6 |
| NUT-13 | The user records the equipment they have (air fryer, rice cooker and so on) and the ingredients they usually keep. | Should | 0.5 | Built, tested |
| NUT-14 | "What to eat today": quick home-cooked recipes only (20 minutes or less, no takeout, no noodles or oats) with calories, protein, time, equipment and an estimated cost per ingredient, ranked by what is left of the day's targets, with protein first after a workout; recipes the kitchen cannot make are set aside, and missing ingredients are listed with their cost. | Should | 0.5 | Built, tested. Costs are estimates |
| NUT-07 | Another day can be viewed, and food can be logged on it. | Should | 0.2 | Built, tested |

## Health

| ID | Requirement | Priority | Version | State |
|---|---|---|---|---|
| HEA-01 | The user sets targets for steps a day, sleep a night and workouts a week. Any can be left unset. | Must | 0.2 | Built, tested |
| HEA-02 | The user enters the day's steps, sleep and resting heart rate. A box left empty never wipes a saved value. | Must | 0.2 | Built, tested |
| HEA-03 | The app shows today against the targets, and the week as two charts. "Nothing logged" is shown as no data, not as zero. | Must | 0.2 | Built, tested |
| HEA-04 | The user logs a workout by name. Workouts are counted per week, Monday to Sunday. | Must | 0.2 | Built, tested |
| HEA-05 | Steps, sleep and heart rate are read from Health Connect on Android. | Should | 0.8 | **Not built.** Needs a native Android app ([android-setup.md](../handoff/android-setup.md)) |
| HEA-06 | A mascot for health. | Could | 0.4 | **Not designed.** The owner has not named one. |
| HEA-07 | The user logs body weight and sees the 30-day change against a goal weight they set. With a height, the app shows BMI. | Should | 0.3 | Built, tested |
| HEA-08 | The user logs water against a daily target. | Could | 0.3 | Built, tested |
| HEA-09 | A workout has a kind and a length, and exercises with sets, reps and weight. The app shows the best lift for each exercise. | Should | 0.3 | Built, tested |

## The map

| ID | Requirement | Priority | Version | State |
|---|---|---|---|---|
| MAP-01 | For each area, a path of stops from finished work, through "you are here", to the goal. | Must | 0.2 | Built, tested (presenters) |
| MAP-02 | The path runs left to right. It can be dragged, zoomed in and out, and moved with the keyboard. | Must | 0.2 | Built. Dragging and zoom buttons checked by hand; pinch on a real phone not checked |
| MAP-03 | Picking a stop shows its details. "You are here" lists every task as done or still to do, with what each one needs. | Must | 0.2 | Built, tested (presenters) |
| MAP-04 | The map still makes sense when no target is set: the goal stop says so and points to where to set one. | Must | 0.2 | Built, tested |
| MAP-05 | A life tree: years down the left, and for each year (past ones too) studies, money, food and health branching to the right, down to semesters, units, months and days. It can fill the whole page. | Should | 0.3 | Built, tested. Added 17 November, after the code |

## The whole app

| ID | Requirement | Priority | Version | State |
|---|---|---|---|---|
| APP-01 | A home screen with a headline verdict, one card per area and a list of what needs attention. | Must | 0.2 | Built, tested (presenters) |
| APP-02 | One press ("Hide numbers") hides every mark, grade, target and money amount. The choice is remembered. | Must | 0.2 | Built, tested |
| APP-03 | Works on a phone-sized and a laptop-sized screen with no sideways scrolling. | Must | 0.2 | Built. Checked at 390 px and 1360 px |
| APP-04 | Light and dark mode. | Should | 0.2 | Built |
| APP-05 | An empty app explains how to start, and offers example data that can be deleted again. | Must | 0.2 | Built, tested |
| APP-06 | A wrong entry shows a plain message and keeps what was typed. | Must | 0.2 | Built, checked by hand |
| APP-07 | The user can delete all their data. It asks for confirmation. | Must | 0.2 | Built, tested |
| APP-08 | Text is large and easy to read: body text at least 18 px. Meaning is never shown by colour alone. | Must | 0.2 | Built and checked on 42 pages ([accessibility.md](../proofs/accessibility.md)). Not checked with a real screen reader |
| APP-09 | Each area's mascot shows the verdict as a mood, in words as well as in art. | Must | 1.0 | Mood in words: built. Art: **waiting for the artist** |
| APP-10 | The app opens with no internet connection. | Should | 0.7 | Partly. The screens open offline; the data needs the server. Full offline use needs sync. |
| APP-11 | Money is shown in MYR, dates in Malaysian time. | Must | 0.2 | Built, tested |
| APP-12 | Movement on screen has a purpose and is turned off when the device asks for less motion. | Should | 0.2 | Built |
| APP-13 | The user's data can be exported to one file, and loaded back into an empty app. | Should | 0.2 | Built, tested |
| APP-14 | One press hides every money amount on every screen. | Should | 0.3 | Built, tested. Since 18 November part of APP-02: one Hide numbers switch for marks and money |

## The AI helper

| ID | Requirement | Priority | Version | State |
|---|---|---|---|---|
| ADV-01 | The API key is only ever on the backend. | Must | 0.2 | Built, tested |
| ADV-02 | On request, a short study plan is written from a summary of the units. Only codes, targets, averages and verdicts are sent. | Should | 0.6 | Built. Tested with a fake service only |
| ADV-03 | Without a key, every other part of the app works, and the AI features explain how to turn them on. | Must | 0.2 | Built, tested |
| ADV-04 | The AI never changes data. | Must | 0.2 | Built, tested |
| ADV-05 | YouTube suggestions for a unit. | Could | 0.6 | **Not built.** In the capability map; the owner has not asked for it since. |
| ADV-06 | Spending advice from the Could cut numbers. Only totals, categories and shop names are sent, never the names of people paid. | Should | 0.6 | **Not built.** A placeholder written by hand shows the shape (BUD-17). Task D7 |

## Requirements that are not about features

| ID | Requirement | State |
|---|---|---|
| NFR-01 | Costs RM 0 a month to run. | Met: it runs on the laptop |
| NFR-02 | No personal data leaves the device unless the user uses an AI feature. | Met. One exception to know about: fonts are loaded from Google Fonts |
| NFR-03 | Every rule with numbers has a test with a hand-worked example. | Met for grades, budget, food and health |
| NFR-04 | A screen appears in under a second on the laptop. | Not measured. It feels instant; nothing was timed. |
| NFR-05 | The project builds and its tests run with one command. | Met on Windows |

## Versions

Each requirement above names the version it belongs to. What each version is about, and which ones are done, is in the [roadmap](../03-plan/roadmap.md). Every requirement is also an issue on the [project board](https://github.com/users/sih2006/projects/1), filed under its version.
