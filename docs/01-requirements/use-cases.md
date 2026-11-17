# Use cases

**Status:** Draft. Written by Claude on 16 November 2026 from the app as built.

This document answers: who does what with the system?

## Who and what is involved

| Actor | What it is | Kind |
|---|---|---|
| **Student** | The one person who uses the app | Main actor |
| **Gemini** | Google's AI service. Takes part only when a key is set and the student asks | Outside system |
| **Artist** | Supplies mascot art and icons as files. Never uses the app | Outside person, not an actor in the running system |

## Use-case diagram

```mermaid
flowchart LR
  student([Student])
  gemini([Gemini])

  subgraph app [Student companion]
    direction TB
    subgraph grades [Grades]
      uc1(Keep units and assessments)
      uc2(Record a mark)
      uc3(Set a target)
      uc4(See standing and verdicts)
      uc5(Ask what if)
      uc6(Keep finished results)
      uc7(Set a final goal)
      uc8(See GPA, CGPA and WAM)
      uc9(Import from a screenshot)
      uc10(Ask for a study plan)
    end
    subgraph other [Budget, food, health]
      uc11(Record spending)
      uc12(Log food)
      uc13(Enter health numbers)
      uc14(Set limits and targets)
    end
    subgraph all [Across the app]
      uc15(See the home summary)
      uc16(Follow the map to a goal)
      uc17(Hide grades)
      uc18(Delete all data)
    end
  end

  student --- uc1 & uc2 & uc3 & uc4 & uc5 & uc6 & uc7 & uc8
  student --- uc9 & uc10
  student --- uc11 & uc12 & uc13 & uc14
  student --- uc15 & uc16 & uc17 & uc18
  uc9 --- gemini
  uc10 --- gemini
  uc2 -.->|includes| uc4
  uc3 -.->|includes| uc4
  uc7 -.->|extends: offers a default| uc3
```

Mermaid has no use-case diagram of its own, so this one is drawn as a flowchart. A draw.io version in `docs/diagrams/` is still to do, as the diagram conventions ask.

## The main use cases, step by step

### UC-2: Record a mark

| | |
|---|---|
| **Goal** | The student's standing in a unit is up to date |
| **Before** | The unit and the assessment exist |
| **Stories** | ACA-05, ACA-07, ACA-09, ACA-10, ACA-14, ACA-11 |

**Main path**

1. The student opens the unit and chooses "Enter mark" on an assessment.
2. The student types the mark and what it is out of.
3. The app checks the mark is from 0 to the marks available.
4. The app saves it and works out the new standing.
5. The app shows marks earned, the average, what is needed for the target, and the two verdicts.

**Other paths**

- 3a. The mark is above the marks available: the app says so and keeps what was typed. Nothing is saved.
- 4a. The assessment has a hurdle and the mark is below it: the app shows a hurdle fail, and the target is no longer possible.
- 5a. The unit has no target: the app shows standing only, and the grade the average leads to.
- 2a. The student clears the mark: the assessment goes back to "not done".

### UC-3: Set a target

| | |
|---|---|
| **Goal** | The app judges the unit against the student's own aim |
| **Stories** | ACA-08, ACA-09, ACA-10, ACA-14, GPA-07 |

**Main path**

1. The student opens "Target and unit settings" in a unit.
2. The student types a target mark (50 for P, 60 for C, 70 for D, 80 for HD).
3. The app works out the mark needed on what is left.
4. The app shows whether it is possible, and whether it is realistic.

**Other paths**

- 2a. A final goal is set: the app has already shown a default target for each unit, which the student can accept or change.
- 4a. Not possible: the app names the highest grade still reachable.
- 4b. Possible but not realistic: the app says how many points above the student's average it needs, and names the highest realistic grade.
- 2b. The student clears the target: the verdicts disappear.

### UC-9: Import from a screenshot

| | |
|---|---|
| **Goal** | Assessments and marks are entered with less typing, and never wrongly |
| **Before** | A Gemini key is set |
| **Stories** | ACA-20, ACA-21, ACA-22 |

**Main path**

1. In a unit, the student chooses a picture and presses "Read screenshot".
2. The app sends the picture to Gemini.
3. Gemini returns a list of assessment names, weights and marks.
4. The app shows the list in a form. **Nothing is saved yet.**
5. The student corrects any mistakes and unticks rows that are not wanted.
6. The student presses "Save the ticked rows".
7. The app saves each kept row as an assessment and shows the new standing.

**Other paths**

- 2a. No internet, the daily limit is used up, or the picture cannot be read: the app says which, and nothing changes. Typing still works.
- 5a. The student presses Cancel: nothing is saved.
- 7a. A row breaks a rule (for example the weights would pass 100%): the app says which row, and the rows before it stay saved.

### UC-11: Record spending

| | |
|---|---|
| **Goal** | The month's total and pace are up to date |
| **Before** | At least one category exists |
| **Requirements** | BUD-03 to BUD-06 |

**Main path**

1. The student types what it was, the amount, and picks a category.
2. The app checks the amount is above 0.
3. The app saves it with today's date.
4. The app shows the new total, what is left, the daily amount, and the pace verdict.

**Other paths**

- 2a. The amount is not a number: the app says so before anything is sent.
- 4a. The category is now over its limit: it is flagged, and it appears on the home screen's attention list.

### UC-16: Follow the map to a goal

| | |
|---|---|
| **Goal** | The student sees how today's tasks lead to the goal |
| **Requirements** | MAP-01 to MAP-04, GPA-08 |

**Main path**

1. The student opens the map. It shows the studies path, centred on "you are here".
2. Under the map, the app lists each unit's tasks: done ones with their marks, and ones still to do with what they need.
3. The student drags the map to the right to see the semesters still to come and the goal.
4. The student picks a stop. The app shows its details.
5. The student switches to the budget, food or health path.

**Other paths**

- 1a. No final goal is set: the last stop says so and points to where to set one.
- 1b. Grades are hidden: marks and targets on the map are masked.

### UC-17: Hide grades

1. The student presses "Hide grades".
2. Every mark, grade, target, GPA, CGPA and WAM is replaced by dots, on every screen.
3. The forms that would show a mark are removed.
4. The choice is remembered until the student presses "Show grades".

### UC-18: Delete all data

1. On the home screen the student opens "Delete all my data".
2. The student types the word "delete".
3. The app removes every unit, mark, result, spending entry, meal, health record and setting.
4. The app shows the empty start screen.

- 2a. Anything else is typed: nothing is deleted.

## Use cases that are planned but not built

| Use case | Waits for |
|---|---|
| Sign in | A hosting decision |
| Read steps, sleep and heart rate from the phone | A native Android app |
| Look up a unit in the handbook | An interview with the owner |
| See what a goal such as a master's needs | Researched entry requirements |
| Use the app with no signal and sync later | Hosting and a sync design |
