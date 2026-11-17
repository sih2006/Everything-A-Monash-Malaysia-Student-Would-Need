# App flow

**Status:** Draft, 16 November 2026, updated 18 November, from the app as built.

This document answers: how does a user move through the app?

## 1. The screens

```mermaid
flowchart TB
  home[Home<br/>headline, four cards,<br/>needs attention, your data]
  map[Map<br/>Life tree, or a path<br/>for studies, budget, food, health]
  grades[Grades]
  budget[Budget<br/>Overview, Banking,<br/>Investing, Expenses]
  food[Food]
  health[Health]

  home <--> map
  home <--> grades
  home <--> budget
  home <--> food
  home <--> health
  map -.->|"set a goal or target"| grades
  map -.-> budget
  map -.-> food
  map -.-> health
```

- Six screens, all one press away from each other. On a phone the menu is a bar at the bottom; on a laptop it is a list at the side.
- Each screen has its own address (`#grades`, `#map` and so on), so the browser's back button works and a screen can be bookmarked.
- Four controls are always in reach: the look, the currency amounts are shown in, **Hide numbers** and dark mode.
- There are no pop-up windows. Forms open in place, inside the card they belong to.

| Screen | Sections, top to bottom |
|---|---|
| **Home** | Headline verdict with the penguin egg's mood. Start here (only when empty). Four area cards. Needs your attention. Your data: download, load from a file, delete everything. |
| **Map** | Life or a path. The life tree (years down the left, areas branching right) or the path of stops to a goal. Details of the chosen node or stop. |
| **Grades** | CGPA, GPA and WAM (they follow the what-if sliders). Final goal. CGPA by semester. One card per unit, in the order you choose. Add a unit. Study plan from the AI helper. Finished units. |
| **Budget** | Your money (total). Four tabs: **Overview** (every account, this month in short, a currency converter and the exchange rates), **Banking** and **Investing** (one account at a time), **Expenses** (the month and its limit; looking back over this month, 3 months, a year or all time with where your money goes, could cut, advice and month by month; categories, add spending, the list). |
| **Food** | Calories and protein. Log food and quick add. Change the quick-add list. Logged today. |
| **Health** | Today's steps, sleep, heart rate and water. Steps and sleep this week. Body weight with BMI. Workouts and best lifts. Targets. |

Budget, Food and Health each have **Previous** and **Next**, to look at another month or day.

## 2. First run

```mermaid
flowchart TD
  open([Open the app]) --> empty{Any data?}
  empty -- yes --> home[Home with the real summary]
  empty -- no --> start[Home with the Start here card]
  start --> choice{The user picks}
  choice -- Add my first unit --> gradesEmpty[Grades:<br/>the add-unit form is already open]
  choice -- Load example data --> demo[Every screen filled<br/>with made-up data]
  choice -- Load my data from a file --> restored[Everything from an earlier download]
  demo --> look[Look around]
  look --> wipe[Home: Delete all my data]
  wipe --> start
  restored --> home
  gradesEmpty --> unit[Unit added]
  unit --> assess[Its card opens with<br/>Add an assessment showing]
  assess --> mark[Enter a mark]
  mark --> target[Set a target]
  target --> verdict([Standing and both verdicts])
```

The app never starts with data the user did not enter. The example data is offered, labelled as made up, and can be removed.

Every screen also explains itself when empty. Budget asks for an account, a limit and a first category. Food and Health ask for targets. Without targets they still show totals, but give no verdict.

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
  act -- "Try numbers" --> slider[Move the what-if slider.<br/>GPA, CGPA and WAM follow it]
  act -- "Change the aim" --> lower[Set a new target]
  act -- "Ask for help" --> plan[Write me a plan]
  slider --> done
  lower --> done
  plan --> done
```

Three presses and two numbers from opening the app to seeing the new verdict. A unit marked **pass or fail only** gets a pass or fail verdict and never changes GPA, CGPA or WAM.

## 4. Adding spending

```mermaid
flowchart TD
  a([Bought something]) --> b[Open Budget, then Expenses]
  b --> c{Any category?}
  c -- no --> d[Add a category first] --> e
  c -- yes --> e[Type what and the amount,<br/>pick the category and the day]
  e --> acc{Paid from an account?}
  acc -- yes --> pick[Pick it under Paid from]
  acc -- no --> f
  pick --> f[Press Add]
  f --> g{Amount above 0<br/>and a number?}
  g -- no --> h[Message; the form is kept] --> e
  g -- yes --> i[Totals, pace, could cut<br/>and the list update]
  i --> balance[The account's balance<br/>goes down by the amount]
  i --> j{Category over its limit?}
  j -- yes --> k[Flagged here and on Home]
  j -- no --> l([Done])
  k --> l
```

## 5. Looking after money

```mermaid
flowchart TD
  open([Open Budget]) --> tab{Which tab?}
  tab -- Overview --> list[Every account and its balance,<br/>money in, spent and could cut this month]
  list -- pick an account --> one
  tab -- Banking or Investing --> one[One account: balance and latest moves.<br/>The others stay hidden until picked]
  one --> what{What changed?}
  what -- Money came in --> income[Add money in]
  what -- Moved between my accounts --> move[Move money.<br/>Not spending, not income]
  what -- The real balance is different --> set[Set the balance by hand,<br/>for today or an earlier day]
  tab -- Expenses --> period[Pick a period: this month,<br/>3 months, a year, all time]
  period --> spend[Where your money goes, could cut,<br/>advice, month by month]
  spend -- "rent, fees" --> ess[Mark the category essential:<br/>it leaves could cut]
```

A balance set for a day replaces everything before that day. Moves after that day still count, in whatever order they were typed.

## 6. When something goes wrong

| Situation | What the user sees | What happens to the data |
|---|---|---|
| A wrong entry | A message at the top in plain words, naming what to fix. The form keeps what was typed. | Nothing is saved |
| The server is not running | "The app could not reach its server", with the command to start it | Nothing is lost |
| The grade engine is not built | Grades says so and gives the build command. Budget, Food and Health still work. | Untouched |
| The AI helper has no key | The plan card explains how to turn it on. Everything else works. | Untouched |
| The AI helper fails | A message says whether it was the connection, the daily limit or the answer | Untouched |
| An access token is needed | A form asks for it. After 5 wrong tries the address is refused for 15 minutes. | Untouched |

Messages go in one place, at the top of the screen. Success messages are announced politely to screen readers; errors are announced at once.

## 7. Moving around on the map

```mermaid
flowchart LR
  open([Open the map]) --> kind{Life or a path?}
  kind -- Life --> tree[The life tree:<br/>years down the left]
  tree -- Open to today --> today[This year, this month,<br/>this week, today]
  tree -- Open all / Close all --> tree
  tree -- pick a node --> branch[It opens to the right.<br/>Its details show below]
  kind -- a path --> here[Centred on You are here]
  here -- drag or arrow keys --> pan[Move along the path]
  here -- "+ or -, pinch, or Ctrl+scroll" --> zoom[Zoom in or out]
  here -- Show all --> fit[The whole path in view]
  pan --> stop[Pick a stop]
  zoom --> stop
  fit --> stop
  stop --> detail[Its details show under the map]
  detail -- Find me --> here
```

Both maps can fill the whole page (**Full page**, Escape to leave). Plain scrolling does not zoom: if it did, the page would get stuck whenever the pointer was over the map.

## 8. Screens that do not exist yet

| Screen | Why it is missing |
|---|---|
| Sign in | No hosting decision yet (v0.7) |
| Settings | The few settings live where they are used: targets on each screen, the look and the hide switches in the menu |
| A unit's own page | A unit is one card on the Grades screen. With many units this may need its own page. |
| Import a bank statement | Planned for v0.7 (BUD-18) |
