# Product requirements (PRD)

**Status:** Draft. Written by Claude on 16 November 2026. The grades requirements come from the [product backlog](product-backlog.md), which the owner shaped in an interview. The requirements for budget, food and health were **written after the code**, from what the owner asked for in the prototype, and the owner has not reviewed them.

This document answers: what must each part of the app do?

## How requirements are written

- Each requirement has a permanent ID: a prefix for the module and a number.
- "Must" means the app is wrong without it. "Should" means important but the app still works. "Could" means only if time allows.
- The last column says where it stands today.

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

| ID | Requirement | Priority | State |
|---|---|---|---|
| BUD-01 | The user sets a monthly limit in MYR. With no limit set, the category limits are added up. With neither, the app shows spending and gives no verdict. | Must | Built, tested |
| BUD-02 | The user makes their own categories, each with an optional monthly limit. A category name cannot be used twice. | Must | Built, tested |
| BUD-03 | The user records spending: what, how much, which category, which day. The amount must be above 0. The day cannot be in the future. | Must | Built, tested |
| BUD-04 | The app shows spent, left, and how much can be spent per day to stay inside the limit. | Must | Built, tested |
| BUD-05 | The app gives a verdict: on pace, ahead of pace (more than 5 points ahead of the calendar), or over the limit. | Must | Built, tested. **The 5 points is Claude's number.** |
| BUD-06 | A category over its own limit is flagged, with the amount over. | Must | Built, tested |
| BUD-07 | Spending can be removed. | Must | Built, tested |
| BUD-08 | Another month can be viewed. | Should | Built, tested |
| BUD-09 | Spending is shown week by week. | Could | Built (used by the map), tested |

## Food

| ID | Requirement | Priority | State |
|---|---|---|---|
| NUT-01 | The user sets a daily calorie target and an optional protein target. With no target, the app shows totals and gives no verdict. | Must | Built, tested |
| NUT-02 | The user logs a food with calories, optional protein, and a meal (breakfast, lunch, dinner or snack). | Must | Built, tested |
| NUT-03 | The app shows eaten, left, and whether the day is on or over target. Exactly on target is not over. | Must | Built, tested |
| NUT-04 | A food can be remembered and logged again with one press, and removed from that list. | Should | Built, tested |
| NUT-05 | A log entry can be removed. | Must | Built, tested |
| NUT-06 | A lookup of Malaysian foods with their calories. | Could | **Not built.** The capability map names it. Foods are typed in once instead. |
| NUT-07 | Another day can be viewed, and food can be logged on it. | Should | Built, tested |

## Health

| ID | Requirement | Priority | State |
|---|---|---|---|
| HEA-01 | The user sets targets for steps a day, sleep a night and workouts a week. Any can be left unset. | Must | Built, tested |
| HEA-02 | The user enters the day's steps, sleep and resting heart rate. A box left empty never wipes a saved value. | Must | Built, tested |
| HEA-03 | The app shows today against the targets, and the week as two charts. "Nothing logged" is shown as no data, not as zero. | Must | Built, tested |
| HEA-04 | The user logs a workout by name. Workouts are counted per week, Monday to Sunday. | Must | Built, tested |
| HEA-05 | Steps, sleep and heart rate are read from Health Connect on Android. | Should | **Not built.** Needs a native Android app ([android-setup.md](../handoff/android-setup.md)) |
| HEA-06 | A mascot for health. | Could | **Not designed.** The owner has not named one. |

## The map

| ID | Requirement | Priority | State |
|---|---|---|---|
| MAP-01 | For each area, a path of stops from finished work, through "you are here", to the goal. | Must | Built, tested (presenters) |
| MAP-02 | The path runs left to right. It can be dragged, zoomed in and out, and moved with the keyboard. | Must | Built. Dragging and zoom buttons checked by hand; pinch on a real phone not checked |
| MAP-03 | Picking a stop shows its details. "You are here" lists every task as done or still to do, with what each one needs. | Must | Built, tested (presenters) |
| MAP-04 | The map still makes sense when no target is set: the goal stop says so and points to where to set one. | Must | Built, tested |

## The whole app

| ID | Requirement | Priority | State |
|---|---|---|---|
| APP-01 | A home screen with a headline verdict, one card per area and a list of what needs attention. | Must | Built, tested (presenters) |
| APP-02 | One press hides every mark, grade and target. The choice is remembered. | Must | Built, tested |
| APP-03 | Works on a phone-sized and a laptop-sized screen with no sideways scrolling. | Must | Built. Checked at 390 px and 1360 px |
| APP-04 | Light and dark mode. | Should | Built |
| APP-05 | An empty app explains how to start, and offers example data that can be deleted again. | Must | Built, tested |
| APP-06 | A wrong entry shows a plain message and keeps what was typed. | Must | Built, checked by hand |
| APP-07 | The user can delete all their data. It asks for confirmation. | Must | Built, tested |
| APP-08 | Text is large and easy to read: body text at least 18 px. Meaning is never shown by colour alone. | Must | Built and checked on 42 pages ([accessibility.md](../proofs/accessibility.md)). Not checked with a real screen reader |
| APP-09 | Each area's mascot shows the verdict as a mood, in words as well as in art. | Must | Mood in words: built. Art: **waiting for the artist** |
| APP-10 | The app opens with no internet connection. | Should | Partly. The screens open offline; the data needs the server. Full offline use needs sync. |
| APP-11 | Money is shown in MYR, dates in Malaysian time. | Must | Built, tested |
| APP-12 | Movement on screen has a purpose and is turned off when the device asks for less motion. | Should | Built |
| APP-13 | The user's data can be exported to one file, and loaded back into an empty app. | Should | Built, tested |

## The AI helper

| ID | Requirement | Priority | State |
|---|---|---|---|
| ADV-01 | The API key is only ever on the backend. | Must | Built, tested |
| ADV-02 | On request, a short study plan is written from a summary of the units. Only codes, targets, averages and verdicts are sent. | Should | Built. Tested with a fake service only |
| ADV-03 | Without a key, every other part of the app works, and the AI features explain how to turn them on. | Must | Built, tested |
| ADV-04 | The AI never changes data. | Must | Built, tested |
| ADV-05 | YouTube suggestions for a unit. | Could | **Not built.** In the capability map; the owner has not asked for it since. |

## Requirements that are not about features

| ID | Requirement | State |
|---|---|---|
| NFR-01 | Costs RM 0 a month to run. | Met: it runs on the laptop |
| NFR-02 | No personal data leaves the device unless the user uses an AI feature. | Met. One exception to know about: fonts are loaded from Google Fonts |
| NFR-03 | Every rule with numbers has a test with a hand-worked example. | Met for grades, budget, food and health |
| NFR-04 | A screen appears in under a second on the laptop. | Not measured. It feels instant; nothing was timed. |
| NFR-05 | The project builds and its tests run with one command. | Met on Windows |

## Release plan

| Release | Contents | State |
|---|---|---|
| 0.1 | The grades tracker as a terminal program | Built and tested |
| 0.2 | Screenshot import | Built, tested with a fake AI service |
| 0.3 | The web app: all four areas, the map, the looks | Built. **This was not in the backlog's release plan.** The owner asked for everything at once on 16 November 2026. |
| Next | Online with a login; Android with Health Connect; mascot art; handbook lookup; future goals | See [next-tasks.md](../handoff/next-tasks.md) |
