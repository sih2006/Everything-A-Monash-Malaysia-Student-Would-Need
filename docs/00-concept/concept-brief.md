# Concept brief

**Status:** Draft, 16 November 2026, from what the owner said across the planning sessions. The owner has not reviewed it. Lines marked **(assumed)** were not said by the owner and need a yes or no.

This document answers: what problem is this, for whom, what does success look like, and what is left out?

## The problem

A Monash Malaysia student has their marks in Moodle, their money in a banking app, their meals in their head and their steps on their phone. None of these says the one thing the student wants to know: **am I on course for what I am aiming at, and if not, what would it take?**

For grades the gap is the largest. Moodle shows marks. It does not show what is needed on the final exam, whether a target is still possible, or how one result moves the CGPA that an internship form will ask for.

## Who it is for

One person: the owner, a Monash University Malaysia student with a Samsung Galaxy S24 Ultra and a Windows laptop. The app is not built for other users. **(assumed:** it may be shown to other students later, but nothing is built for that.)

## What the app does

It tracks four areas. In each, the user sets the target and the app gives the verdict.

| Area | The user enters | The app says |
|---|---|---|
| Grades | Units, assessments, marks, a target for each unit, a final goal | What is needed on the rest, whether it is possible, whether it is realistic, and GPA, CGPA and WAM |
| Budget | A monthly limit, categories, spending in MYR | Whether spending is on pace for the month |
| Food | Daily calorie and protein targets, meals | What is left for today |
| Health | Targets for steps, sleep and workouts, and the day's numbers | Whether today and this week are on target |

Two things tie the areas together:

- **A mascot for each area**, whose mood shows the verdict at a glance: a penguin egg for grades, a crab for budget, Joel the gym-bro for food. The art is drawn by the owner's artist friend.
- **A map** for each area: a path from what is finished, through today's tasks, to the goal.

## The rules the owner set

1. **The user sets every target and goal.** The app never decides what the user should aim for.
2. **The app gives the verdict.** It says plainly whether the user is on course, and whether a target is realistic.
3. **Possible and realistic are separate.** A target can be mathematically possible and still unrealistic. Realistic means the mark needed is no more than 10 points above the user's average so far.
4. **The app may suggest a default target**, worked out from the user's own final goal.
5. **GPA and CGPA are different numbers** and are never mixed.
6. **Grades can be hidden** with one press.
7. **No generated images.** All art comes from the artist.

## Why build it

The second purpose is the owner's portfolio for internship applications. The project should show:

- **Engineering:** data structures and algorithms built by hand in C++, with their costs stated; a layered design; MVVM; white-box and black-box testing; CI.
- **Product thinking:** requirements with IDs, decisions recorded with the options turned down, and a backlog on a public board.

The owner's view is that writing code with AI is easy, and that planning and being able to explain every decision is the skill worth showing.

## What success looks like

**(assumed: the owner has not set these. They are suggestions to accept or change.)**

| Measure | Target |
|---|---|
| Daily use | The owner opens the app by choice on most days of the summer semester starting January 2027 |
| Correct numbers | The CGPA and WAM match Monash's official figures at the end of the semester |
| No surprises | No assessment result changes a verdict in a way the app did not make visible beforehand |
| Explainable | The owner can explain any file in the repository without notes |
| Cost | RM 0 a month |

## What is left out

| Left out | Why |
|---|---|
| Reading Moodle directly | It sits behind the Monash login. A screenshot import is the realistic route. |
| Connecting to a bank | Spending is typed in. |
| More than one user | One person, one device set. |
| iOS | The owner uses Android. |
| Timetable, deadlines, reminders | Listed as candidates in the capability map. Not decided. |
| Calorie data from a food database | Foods are typed in once and remembered. **(assumed)** |
| Advice on what to eat or how to train | The app tracks and judges against the user's own targets. It does not coach. **(assumed)** |

## Open questions for the owner

1. The app's name.
2. Are the success measures above the right ones?
3. Should timetable, deadlines or reminders be in scope? A map of tasks leading to a goal is close to a deadline list already.
4. Which of the four looks in the prototype is the real one?
5. Is "one user only" firm, or should the design leave room for classmates?

## How this connects to the other documents

- What is split into which part: [capability-map.md](capability-map.md).
- What each part must do, story by story: [product-backlog.md](../01-requirements/product-backlog.md) and [prd.md](../01-requirements/prd.md).
- How it is built: [trd.md](../02-design/trd.md).
