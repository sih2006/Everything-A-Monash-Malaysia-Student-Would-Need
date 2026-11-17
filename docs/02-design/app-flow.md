# App flow

**Status:** Draft. Written by Claude on 16 November 2026 from the app as built.

This document answers: how does a user move through the app?

## 1. The screens

```mermaid
flowchart TB
  home[Home<br/>headline, four cards,<br/>needs attention]
  map[Map<br/>studies, budget,<br/>food, health]
  grades[Grades]
  budget[Budget]
  food[Food]
  health[Health]

  home <--> map
  home <--> grades
  home <--> budget
  home <--> food
  home <--> health
  map -.->|"set a goal / target"| grades
  map -.-> budget
  map -.-> food
  map -.-> health
```

- Six screens, all one press away from each other. On a phone the menu is a bar at the bottom. On a laptop it is a list at the side.
- Each screen has its own address (`#grades`, `#map` and so on), so the browser's back button works and a screen can be bookmarked.
- Three controls are always in reach: the look, hide grades, and dark mode.
- There are no pop-up windows. Forms open in place, inside the card they belong to.

| Screen | Sections, top to bottom |
|---|---|
| **Home** | Headline verdict with the penguin egg's mood. Start card (only when empty). Four area cards. Needs attention. Your data (delete everything). |
| **Map** | Path switch. How a task reaches the goal. The map. Details of the chosen stop. |
| **Grades** | CGPA, GPA, WAM. Final goal. CGPA by semester. One card per unit. Add a unit. Study plan. Finished units. |
| **Budget** | Spent, left, per day. Pace. Monthly limit. Categories. Add spending and the latest spending. |
| **Food** | Calories and protein. Daily targets. Log food and quick add. Logged today. |
| **Health** | Steps, sleep, heart rate. Today's numbers. Steps and sleep this week. Workouts. Targets. |

## 2. First run

```mermaid
flowchart TD
  open([Open the app]) --> empty{Any data?}
  empty -- yes --> home[Home with the real summary]
  empty -- no --> start[Home with the Start here card]
  start --> choice{The user picks}
  choice -- Add my first unit --> gradesEmpty[Grades:<br/>the add-unit form is already open]
  choice -- Load example data --> demo[Every screen filled<br/>with made-up data]
  demo --> look[Look around]
  look --> wipe[Home: Delete all my data]
  wipe --> start
  gradesEmpty --> unit[Unit added]
  unit --> assess[Its card opens with<br/>Add an assessment showing]
  assess --> mark[Enter a mark]
  mark --> target[Set a target]
  target --> verdict([Standing and both verdicts])
```

The app never starts with data the user did not enter. The example data is offered, labelled as made up, and can be removed.

Every screen also explains itself when empty. Budget asks for a limit and a first category. Food and Health ask for targets. Without targets they still show totals, but give no verdict.

## 3. The most common task: a new mark arrives

```mermaid
flowchart TD
  start([A result is released]) --> g[Open Grades]
  g --> u[Find the unit's card]
  u --> e[Press Enter mark on the assessment]
  e --> t[Type the mark and what it is out of]
  t --> s[Press Save mark]
  s --> ok{Accepted?}
  ok -- no --> msg[A message at the top says why.<br/>The form keeps what was typed] --> t
  ok -- yes --> show[The card redraws:<br/>earned, average, needed, verdicts]
  show --> q{On course?}
  q -- yes --> done([Done])
  q -- no --> why[The verdict says why, and names<br/>the highest realistic grade]
  why --> act{What now?}
  act -- "Try numbers" --> slider[Move the what-if slider]
  act -- "Change the aim" --> lower[Set a new target]
  act -- "Ask for help" --> plan[Write me a plan]
  slider --> done
  lower --> done
  plan --> done
```

Three presses and two numbers from opening the app to seeing the new verdict.

## 4. Adding spending

```mermaid
flowchart TD
  a([Bought something]) --> b[Open Budget]
  b --> c{Any category?}
  c -- no --> d[Add a category first] --> e
  c -- yes --> e[Type what, the amount, pick the category]
  e --> f[Press Add]
  f --> g{Amount above 0<br/>and a number?}
  g -- no --> h[Message; the form is kept] --> e
  g -- yes --> i[Totals, pace and the list update]
  i --> j{Category over its limit?}
  j -- yes --> k[Flagged here and on Home]
  j -- no --> l([Done])
  k --> l
```

## 5. When something goes wrong

| Situation | What the user sees | What happens to the data |
|---|---|---|
| A wrong entry | A message at the top in plain words, naming what to fix. The form keeps what was typed. | Nothing is saved |
| The server is not running | "The app could not reach its server", with the command to start it | Nothing is lost |
| The grade engine is not built | Grades says so and gives the build command. Budget, Food and Health still work. | Untouched |
| The AI helper has no key | The plan card explains how to turn it on. Everything else works. | Untouched |
| The AI helper fails | A message says whether it was the connection, the daily limit or the answer | Untouched |
| An access token is needed | A form asks for it | Untouched |

Messages go in one place, at the top of the screen. Success messages are announced politely to screen readers; errors are announced at once.

## 6. Moving around on the map

```mermaid
flowchart LR
  open([Open the map]) --> here[Centred on You are here]
  here -- drag or arrow keys --> pan[Move along the path]
  here -- "+ / − or pinch or Ctrl+scroll" --> zoom[Zoom in or out]
  here -- Show all --> fit[The whole path in view]
  pan --> pick[Pick a stop]
  zoom --> pick
  fit --> pick
  pick --> detail[Its details show under the map]
  detail -- Find me --> here
  detail -- switch path --> open
```

Plain scrolling does not zoom the map. If it did, the page would get stuck whenever the pointer was over the map.

## 7. Screens that do not exist yet

| Screen | Why it is missing |
|---|---|
| Sign in | No hosting decision yet |
| Settings | The few settings live where they are used (targets on each screen, the look in the menu) |
| A unit's own page | A unit is one card on the Grades screen. With many units this may need its own page. |
| History (other days and months) | The data and API exist; the controls do not (task C3) |
