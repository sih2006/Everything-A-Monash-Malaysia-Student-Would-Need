# Grade rules

**Status:** Draft, written by Claude on 16 November 2026 from Monash's published pages. The owner should check it against their own results before relying on it.

This page lists every grade rule the app uses, where it came from, and where it lives in the code. The decision behind it is [ADR-0004](../adr/0004-grade-scales-and-rules.md).

All of these rules are in the C++ core, in `core/src/lib/grades.cpp` and `core/src/lib/calc.cpp`. They are not repeated anywhere else.

## 1. From a mark to a grade

| Grade | Name | Mark |
|---|---|---|
| HD | High distinction | 80 to 100 |
| D | Distinction | 70 to 79 |
| C | Credit | 60 to 69 |
| P | Pass | 50 to 59 |
| N | Fail | 0 to 49 |

Three more grades exist. A mark alone never gives them, so the user enters them for a finished unit:

| Grade | Name | When it is used |
|---|---|---|
| NP | Near pass | Given by a faculty for a mark just under 50 |
| NH | Hurdle fail | The total was a pass, but a hurdle was not met |
| WN | Withdrawn fail | Withdrawn after the cut-off date |

## 2. The two scales

The same grades are worth different values on the two scales. This is why GPA and CGPA are different numbers.

| Grade | GPA, standard scale | CGPA, Malaysia scale |
|---|---|---|
| HD | 4.0 | 4.0 |
| D | 3.0 | 3.67 |
| C | 2.0 | 2.85 |
| P | 1.0 | 2.15 |
| NP | 0.7 | 1.7 |
| N | 0.3 | 1.15 |
| NH | 0.3 | 1.15 (assumed, not listed by Monash) |
| WN | 0.0 | 0.0 |

**Formula for both:**

```
            sum of (grade value x credit points)
result  =  --------------------------------------
                  sum of credit points
```

**Worked example.** Four 6-point units with HD, D, C and N:

- GPA = (4 + 3 + 2 + 0.3) ÷ 4 = **2.325**
- CGPA = (4 + 3.67 + 2.85 + 1.15) ÷ 4 = **2.918**

## 3. WAM (weighted average mark)

```
         sum of (mark x credit points x year weight)
WAM  =  ---------------------------------------------
              sum of (credit points x year weight)
```

- The year weight is **0.5 for a first-year unit** and **1.0 for every other unit**.
- The year level is the first digit in the unit code: `FIT1045` is first year, `FIT2004` is second year. The level counts, not the year you took it in.
- A withdrawn fail (WN) counts as a mark of 0, and its credit points still count.
- Failed and repeated units are included.
- **A failed unit is entered with the credit points you attempted** (usually 6), not the 0 the transcript shows. The transcript's "credit points" column shows points *earned*, and a fail earns none, but GPA, CGPA and WAM all count the points *attempted*. Entering 0 would leave the fail out and make every average too high.

**Worked example.** FIT1045 with 80 and FIT2004 with 70, both 6 points:

- Top: 80 × 6 × 0.5 + 70 × 6 × 1.0 = 240 + 420 = 660
- Bottom: 6 × 0.5 + 6 × 1.0 = 9
- WAM = 660 ÷ 9 = **73.333**

## 4. Standing in a unit

For a unit that is still in progress:

| Name | How it is worked out |
|---|---|
| Earned | Sum of (weight × percent ÷ 100) over the marked assessments |
| Average so far | Earned ÷ weight marked × 100 |
| Left | 100 minus the weight marked. Weight that is not entered yet counts as left |
| Heading for | Earned + left × average ÷ 100: the final mark if the average continues |
| Needed | (target − earned) ÷ left × 100: the average percent needed on everything that is left |

**Worked example.** Marks of 78, 70 and 65 on assessments worth 15%, 15% and 10%, with a 60% exam to come and a target of 70:

- Earned = 11.7 + 10.5 + 6.5 = 28.7 out of the 40 marked
- Average = 28.7 ÷ 40 = 71.75%
- Needed = (70 − 28.7) ÷ 60 = **68.8%** on the exam

## 5. The two verdicts

These rules were set by the owner on 15 November 2026.

| Verdict | Rule |
|---|---|
| **Possible** | The mark needed is 100% or less |
| **Realistic** | It is possible, and the mark needed is no more than **10 points above your average so far** in that unit |
| **Secured** | The target is already reached and no hurdle is still open |
| **On course** | Possible and realistic |

- A target that is not possible is never shown as realistic.
- If the unit has no marks yet, the average of your finished units is used. If there is nothing at all to compare with, the app says so and treats "possible" as enough.
- The 10 points is a setting (`margin`), stored with the data.

## 6. Hurdles

A hurdle is a lowest percent on one assessment that must be reached to pass the unit.

- If a marked assessment is below its hurdle, the unit is a hurdle fail (NH), whatever the total is. The target is then not possible.
- For an assessment that is not marked yet, the mark needed on it is the larger of the average needed and its hurdle.
- An open hurdle stops a target being "secured", even when the marks earned already reach it.
- A mark exactly on the hurdle passes.

Only this kind of hurdle is supported. Other kinds (for example a minimum across all exams together) are open question 2 in the backlog.

## 7. The final goal

The user enters a goal (CGPA, GPA or WAM), a value and the credit points in the whole course.

```
                   goal x total credit points  -  points earned so far
average needed  =  ---------------------------------------------------
                               credit points left
```

- If the average needed is above the top of the scale, the goal is out of reach and the app says so.
- The **default target** for each unit is the lowest passing grade whose value meets the average needed. The user can change it.

**Worked example.** CGPA goal 3.0 over 144 points, with 48 points finished and 168.3 CGPA points earned:

- Needed = (3.0 × 144 − 168.3) ÷ 96 = **2.747**
- The lowest grade worth at least 2.747 on the Malaysia scale is C (2.85), so the default target is C.

## Sources

Checked on 16 November 2026. Monash's pages refuse automatic reading, so they were checked through a search tool that quotes them.

- [Grade point average (GPA)](https://www.monash.edu/students/admin/assessments/results/gpa): the standard scale values and the formula.
- [GPA, Malaysia tab](https://www.monash.edu/students/admin/assessments/results/gpa/tabs-grade-point-average/malaysia): the CGPA values, and that it is rounded to three decimal places.
- [CGPA calculator](https://www.monash.edu/students/admin/exams/results/gpa/cgpa-calculator): Monash's own calculator, to check results against.
- [Weighted average mark (WAM)](https://www.monash.edu/students/admin/exams/results/wam): the year weights, and that failed and repeated units are included.
- [Grading Schema Procedure](https://publicpolicydms.monash.edu/Monash/documents/1935755): that CGPA is used in Malaysia in place of the standard GPA.
- [CGPA vs GPA, Monash Malaysia](https://www.monash.edu.my/news-and-events/trending/cgpa-vs-gpa-differences-explained): background.

## Units graded pass or fail only

Some units (for example a unit made only of pass tasks) are graded pass or fail, with no mark. Such a unit is marked "pass or fail only". It is **never** counted in GPA, CGPA or WAM, finished or in progress. Its verdict only says whether it is passed (50 or more) or heading for a pass. In the engine's text format it is an optional 6th field, `passfail`, on the unit line.

## Checked against a real transcript

On 17 November 2026 the rules were run on the owner's official transcript: 12 finished units over three semesters, including one hurdle fail (NH). The GPA and the WAM came out **exactly** as printed on the transcript, to three decimal places. The transcript does not print a CGPA, so the CGPA still needs checking against Monash's CGPA calculator. The marks themselves are kept out of this repository on purpose.

## Tests

Every rule above has a test with the same worked numbers: `core/tests/test_calc.cpp` (white-box) and `core/tests/blackbox.py` (black-box, through the terminal program).
