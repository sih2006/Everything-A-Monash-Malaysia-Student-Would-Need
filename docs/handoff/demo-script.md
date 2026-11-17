# Showing the app: a five-minute walkthrough

Use this when you show the project to a recruiter, in an interview or in a recording. It runs on made-up data, so your real marks stay private.

## Before you start

```
cmake --build core/build          only if you changed the C++ core
node backend/src/server.js --demo
```

Open <http://127.0.0.1:8080>. The server says **DEMO MODE**: the example data lives only in memory, your real data file is not opened, and everything is gone when you stop the server. Stop and start it again to reset.

Have a second window ready with the code open at [core/include/ds/hash_map.hpp](../../core/include/ds/hash_map.hpp) and [core/README.md](../../core/README.md).

## The walkthrough

| Time | Show | Say |
|---|---|---|
| 0:00 | **Home** | "This is a companion app I built for myself as a Monash Malaysia student. I set the targets; the app tells me plainly whether I am on course." Point at the headline: two of four units on course. |
| 0:30 | **Grades**, the four units | "Each unit shows two separate verdicts. *Possible* means I need 100% or less on what is left. *Realistic* means the mark I need is within 10 points of my average so far. FIT2099 is not possible; MAT1830 is possible but not realistic." |
| 1:00 | The **what-if slider** on FIT2004 | Move it to 69 and then 44. "At 44% the exam hurdle fails the whole unit, even though the total would be a pass." |
| 1:30 | The three numbers at the top | "Monash Malaysia uses a different scale for CGPA from the standard GPA. A Distinction is 3.67 in one and 3 in the other. My first plan had them as one number; checking Monash's pages showed it was wrong." |
| 2:00 | **Hide grades** | "For when someone is looking over my shoulder. While it is on, no raw mark even reaches the page; a test checks that." |
| 2:20 | **Map**: the life tree, then the studies path | Press **Open to today**. "My life by year: studies, money, food and health, down to a single day." Switch to the studies path and click "You are here": "Every task, what it needs, and how it leads to my final CGPA goal." |
| 2:50 | **Budget**, Expenses tab | "Same idea for money: am I on pace for the month? This map shows where the money goes." Press **Mark essential** on one category: "Things like rent I cannot cut, so they leave the map and the could-cut list." |
| 3:10 | The code: `hash_map.hpp` | "The grade rules are in C++ with data structures I wrote by hand. Each file starts with the cost of every operation." |
| 3:40 | `core/README.md`, the benchmark table | "I measured them. The array holds its O(1) claim even at 10 million items. The linked structures take the right number of steps but slow down 3 to 4 times at a million, because scattered nodes miss the processor cache. Big-O counts steps, not time." |
| 4:20 | A terminal: `python tools/check.py` | "One command builds everything and runs 282 tests: white-box tests with a leak check, black-box tests written from the requirements, and API tests against the real engine." |
| 4:50 | [docs/README.md](../README.md) | "Every decision has a record with the options I turned down, and every requirement has an ID that its tests point back to." |

## Questions you may get, and where the answer is

| Question | Where to look |
|---|---|
| Why C++ for the core and JavaScript for the rest? | [ADR-0001](../adr/0001-cpp-core-for-academics-tracker.md), [ADR-0002](../adr/0002-local-first-stack.md) |
| How does the backend use the C++ code? | [trd.md, section 4](../02-design/trd.md#4-how-one-action-travels-recording-a-mark) |
| What is MVVM here, and why no framework? | [mvvm-guide.md](mvvm-guide.md), [ADR-0003](../adr/0003-web-app-without-a-build-step.md) |
| Why a hash map for units and a linked list for assessments? | [core/README.md](../../core/README.md#the-data-structures) |
| How do you know the grade maths is right? | [grade-rules.md](../02-design/grade-rules.md) and [test-plan.md](../03-plan/test-plan.md) |
| What could go wrong with the data, and what stops it? | [security-privacy.md](../02-design/security-privacy.md) |
| What did the tests catch? | [test-plan.md, section 6](../03-plan/test-plan.md#6-bugs-found-and-how) |
| What is not done? | [STATUS.md](STATUS.md) |

## Be ready to say this honestly

An AI assistant wrote much of the code with you, in a short time. Interviewers may ask. A good answer says what you decided (the requirements, the two verdicts, the 10-point rule, hand-built structures, no generated images), what you checked, and what you learned by reading the code. That only works if you have read it. Section A of [next-tasks.md](next-tasks.md) is the way in.
