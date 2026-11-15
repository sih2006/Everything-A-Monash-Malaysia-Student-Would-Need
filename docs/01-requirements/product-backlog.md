# Product backlog: academics tracker

**Status:** Draft, written on 15 November 2026 from the author's interview answers. Not approved. The author reviews and edits every story before it counts.

This backlog covers the academics tracker only: the `gpa` and `academics` modules from the [capability map](../00-concept/capability-map.md), written in C++ ([ADR-0001](../adr/0001-cpp-core-for-academics-tracker.md)).

## Scope

**Goal.** A tracker where a Monash Malaysia student types in units, assessments and marks, and sees where they stand, what they need on the remaining assessments to reach a target they set, whether that target is still achievable, and their GPA, WAM and CGPA.

**In scope**

| Release | What it delivers |
|---|---|
| 0.1 | A terminal program on a laptop with typed entry. Data saved to a file. Hand-built data structures, tests and CI. |
| 0.2 | Importing assessments and marks from a screenshot, read by the free Gemini tier. |
| 0.3 onwards | Handbook lookup, an AI plan for reaching a target, and future goals such as postgraduate entry requirements. |

**Out of scope for this backlog:** reading Moodle directly, phone and browser screens, mascots, login and cloud sync, and the budget, calorie and health modules.

## How to read this backlog

- **Epic:** a large piece of work, made up of stories.
- **Story:** one thing the user can do, written as "As a student, I want ... so that ...".
- **Acceptance criteria:** the conditions that must all be true for the story to be done. Black-box tests are written from these.
- **ID:** permanent. `ACA` is the academics module, `GPA` is the grade rules module, `ENG` is engineering work with no direct user feature. Tests, issues and commits refer to these IDs.
- **Priority (MoSCoW):** Must (the release fails without it), Should (important, but the release still works), Could (only if time allows).
- **Size:** S (under half a day), M (about a day), L (several days). These are first guesses.

## Assumptions

Each of these is unconfirmed until the author approves this document.

1. A unit belongs to one semester and year, and has a code, a name and credit points.
2. An assessment has a name and a weight as a percentage of the unit. A mark is entered as a score out of a maximum, for example 17 out of 20.
3. Past semesters are entered as final results per unit, without their individual assessments.
4. The grade bands, GPA values, WAM formula and CGPA formula come from official Monash sources and are checked before the `GPA` stories are built (see open question 1).
5. The user sets every target and final goal. The tracker may offer a default target worked out from the user's own final goal, which the user can change. The tracker gives the verdict on progress against a target: on track or not, realistic or not.
6. Whether a target can be reached is reported in two separate ways. "Mathematically possible" means the marks needed on the remaining assessments are 100% or less. "Realistic" compares the marks needed with the student's own average so far (see open question 3).
7. Some units have hurdles, so hurdles are part of release 0.1.

## Release 0.1: terminal tracker

### Epic A: Units and assessments

| ID | Story | Acceptance criteria | Priority | Size |
|---|---|---|---|---|
| ACA-01 | As a student, I want to add a unit with its code, name, credit points and semester, so that I can track it. | The unit is stored and appears in the unit list. A unit code that already exists in the same semester is rejected. Missing or invalid credit points are rejected with a message saying what is wrong. | Must | S |
| ACA-02 | As a student, I want to find a unit by its code or name and list my units by semester, so that I can get to the one I need. | Searching by full code finds the unit. Searching by part of the name lists every match. A search with no match says so and does not crash. | Must | S |
| ACA-03 | As a student, I want to edit or remove a unit, so that I can fix mistakes. | Edits are saved. Removing a unit asks for confirmation first and also removes its assessments. | Should | S |
| ACA-04 | As a student, I want to add assessments to a unit with a weight each, so that the tracker knows how the unit is graded. | The assessment is stored under its unit. An assessment that would take the unit's total weight above 100% is rejected. A weight of 0 or less is rejected. | Must | S |
| ACA-05 | As a student, I want to record the mark I got for an assessment, so that my standing is up to date. | The mark is stored as a score out of a maximum. A score below 0 or above the maximum is rejected. A mark can be corrected later. | Must | S |
| ACA-06 | As a student, I want to see which assessments in a unit are done and which are not, so that I know what is left. | Each assessment is shown as done (with its mark) or not done. The total weight still to come is shown. | Must | S |

### Epic B: Standing and targets

| ID | Story | Acceptance criteria | Priority | Size |
|---|---|---|---|---|
| ACA-07 | As a student, I want to see where I stand in a unit, so that I know how I am doing. | Shows the marks earned so far towards the unit total, the average on completed work, and the grade that average maps to. A unit with no marks yet says so instead of showing 0. | Must | M |
| ACA-08 | As a student, I want to set a target grade or mark for a unit, so that the tracker measures me against my own goal. | The target is stored and can be changed or cleared. A unit with no target shows no target-based results. | Must | S |
| ACA-09 | As a student, I want to know what I need on the remaining assessments to reach my target, so that I know how hard to push. | Shows the average percentage needed across the remaining assessments. With one assessment left, shows the exact mark needed on it. Results match hand-worked examples. | Must | M |
| ACA-10 | As a student, I want to know whether my target is still mathematically possible, so that I can adjust it if not. | Reports one of: already secured, possible (with the mark needed), or not possible (more than 100% needed). When not possible, shows the highest grade still reachable. | Must | S |
| ACA-14 | As a student, I want to know whether my target is realistic, shown separately from whether it is mathematically possible, so that I am not misled by a target that needs near-perfect marks. | The tracker gives its own verdict, "realistic" or "not realistic", using a built-in rule (realistic when the mark needed is no more than 10 points above my average so far in the unit), shown next to the mathematical result and labelled separately. It also shows the mark needed and my own average so far, so the verdict can be checked. A target that is not mathematically possible is never shown as realistic. | Must | M |
| ACA-11 | As a student, I want to record a hurdle on an assessment (a minimum mark needed to pass the unit), so that the tracker does not tell me I am safe when I am not. | A hurdle can be set on an assessment. Standing, possible and realistic results all take it into account. A failed hurdle is shown clearly even when the overall mark is a pass. | Must | M |

### Epic C: GPA, WAM and CGPA

| ID | Story | Acceptance criteria | Priority | Size |
|---|---|---|---|---|
| GPA-01 | As a student, I want a mark converted to its Monash grade, so that I see grades and not only numbers. | Every mark from 0 to 100 maps to exactly one grade. Marks on each side of every grade boundary map correctly. | Must | S |
| GPA-02 | As a student, I want to enter final results for units from past semesters, so that my overall figures include them. | A past unit is stored with its credit points, final mark and grade, without needing assessments. | Must | S |
| GPA-03 | As a student, I want to see my GPA for a semester, so that I can track each semester. | Matches the official Monash calculation for worked examples. A semester with no results says so. | Must | M |
| GPA-04 | As a student, I want to see my WAM, so that I know my weighted average mark. | Matches the official Monash calculation for worked examples, including credit-point weighting. | Must | M |
| GPA-05 | As a student, I want to see my CGPA across all semesters, shown separately from GPA, so that I can quote it on internship applications. | Matches the Monash Malaysia CGPA calculator for worked examples. GPA and CGPA are labelled separately everywhere they appear. | Must | M |
| GPA-06 | As a student, I want to set a target for my GPA, WAM or CGPA and see what I need in my remaining units, so that I can plan for it. | The target is stored. Shows the average result needed across the units not yet finished, and whether it is achievable. | Should | M |
| GPA-07 | As a student, I want to enter my final goal for graduation (a WAM, GPA or CGPA) and have the tracker work out a default target for this semester from it, so that my semester targets lead to where I want to end up. | The final goal is typed in as a number. The tracker works out what is needed this semester to stay on course and offers it as the default target for the semester and its units. Each default is marked as a default and can be changed or cleared. With no final goal entered, no default is set. | Should | M |

### Epic D: Using and keeping the data

| ID | Story | Acceptance criteria | Priority | Size |
|---|---|---|---|---|
| ACA-12 | As a student, I want my data saved to a file, so that it is still there next time. | Everything entered is present after closing and reopening the program. A damaged or missing file produces a clear message and never deletes or overwrites existing data. | Must | M |
| ACA-13 | As a student, I want a clear terminal menu, so that I can use every feature without remembering commands. | Every release 0.1 story can be reached from the menu. Invalid input shows a message and asks again; it never crashes the program. | Must | M |

### Epic E: Engineering foundation

| ID | Story | Acceptance criteria | Priority | Size |
|---|---|---|---|---|
| ENG-01 | The project builds and runs with one documented command. | A fresh copy of the repository builds on the author's laptop by following the README. | Must | S |
| ENG-02 | The core data structures are built by hand, each with its complexity documented. | No standard-library containers in the core. Each structure has a written table of time and space cost per operation and a reason it was chosen over the alternatives. | Must | L |
| ENG-03 | White-box unit tests cover every data structure and every grade rule. | Tests are written before the code they test. Every operation of every structure has tests, including empty, single-item and large cases. | Must | M |
| ENG-04 | Black-box test cases are designed from this backlog's acceptance criteria. | Each test case names the story ID it checks. Uses equivalence partitioning and boundary value analysis. Every Must story has at least one test case. | Must | M |
| ENG-05 | Memory use is checked automatically. | The tests run under a memory checker and report no leaks or invalid access. | Should | S |
| ENG-06 | Continuous integration builds and tests every push. | A push to GitHub builds the program and runs all tests. A pull request cannot be merged while any check fails. | Must | S |
| ENG-07 | Benchmarks on large generated data confirm the documented complexity. | Timing results for increasing data sizes are recorded and match the growth each structure claims. | Could | M |
| ENG-08 | The README explains how to build, run and test, with the complexity summary. | Someone who has never seen the project can build and run it from the README alone. | Should | S |

## Release 0.2: screenshot import

| ID | Story | Acceptance criteria | Priority | Size |
|---|---|---|---|---|
| ACA-20 | As a student, I want to give the tracker a screenshot of my marks and have the assessments and marks read from it, so that I type less. | Given an image file, the tracker shows the assessment names, weights and marks it read. | Must | L |
| ACA-21 | As a student, I want to check and correct what was read before it is saved, so that a misread never changes my data. | Nothing is saved until the user confirms. Each value read can be edited or rejected first. | Must | M |
| ACA-22 | As a student, I want import failures to leave my data untouched, so that I can always fall back to typing. | With no internet, a used-up daily limit or an unreadable image, a clear message is shown, the data is unchanged and typed entry still works. | Must | S |
| ENG-20 | The Gemini API key is never in the repository. | The key is read from outside the code. A check in CI fails if a key is committed. | Must | S |

## Release 0.3 onwards

These are not yet broken into stories. Each one is interviewed and specified when its release comes up.

| Epic | What it would deliver |
|---|---|
| Handbook lookup | Enter a unit code or name and get the unit's details and a link to its handbook page for the right year. |
| Plan to reach a target | On request, an AI-written plan for making a target achievable. |
| Future goals | The WAM, GPA or CGPA needed for a goal such as a master's in Australia or study in America, from researched entry requirements with source links and the date checked, which the user can edit. |
| What people say about a unit | A summary of recent public discussion about a unit (for example, the last 30 days of posts), with links to the sources. |
| Public board | The backlog loaded into a tracking tool, with each story as an issue. |

## Open questions

1. **Grade rules.** The exact grade bands, GPA values per grade, WAM formula and CGPA formula need checking against the current Monash handbook and the Monash Malaysia CGPA calculator before the `GPA` stories are built.
2. **Hurdles.** Answered on 15 November 2026: some units have them, so ACA-11 is a Must. Still open: which kinds of hurdle exist in your units (a minimum on one assessment, a minimum across all exams, or others).
3. **Realistic.** Answered in part on 15 November 2026: realistic is reported separately from mathematically possible (ACA-14). Answered on 15 November 2026: the tracker decides the verdict itself with a built-in rule. The rule, confirmed by the author on 15 November 2026: a target is realistic when the mark needed is no more than 10 points above your average so far in that unit. Still open: what to compare against when the unit has no marks yet (the draft uses your overall average).
8. **Default targets (GPA-07).** Working out a semester target from a final goal needs the total credit points in your course and how many are left. Is typing those in once acceptable?
4. **Testing library and build tool.** Not yet chosen. Each is a small decision record.
5. **File format** for saved data. Not yet chosen.
6. **Gemini key in release 0.2.** The wider plan says Gemini is only called through a backend. A terminal program on your own laptop could instead read the key from a local setting. This needs a decision before release 0.2.
7. **Tracking tool.** GitHub Projects is recommended over Jira and Linear: the board is public like the repository, each story is an issue that commits and pull requests can close, and it is free. Awaiting the author's confirmation.

## Change log

| Date | Change |
|---|---|
| 2026-11-15 | First draft. |
| 2026-11-15 | Hurdles (ACA-11) raised to Must. Added ACA-14 so that realistic is reported separately from mathematically possible. |
| 2026-11-15 | The tracker gives the realistic verdict itself (ACA-14). Added GPA-07, default targets from a final goal. Added the "what people say about a unit" epic for a later release. |
