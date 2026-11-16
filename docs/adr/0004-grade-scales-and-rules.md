# ADR-0004: Use Monash's published scales, with CGPA and GPA kept apart

## Status

Proposed. Decided by Claude during the build sprint on 16 November 2026, from Monash's own pages. The owner has not reviewed it yet, and should check it against their own results (task A4 in [next-tasks.md](../handoff/next-tasks.md)).

## Date

2026-11-16

## Context

The capability map assumed one 4-point scale (HD 4, D 3, C 2, P 1, N 0) and said it had to be checked. The owner said that CGPA is different from GPA and asked for that to be remembered.

Checking Monash's pages showed that the assumption was wrong in two ways, and that the owner was right:

- A fail is not worth 0 on the GPA scale. It is worth 0.3, and a near pass is worth 0.7.
- Monash Malaysia uses a **different scale** for CGPA. A Distinction is 3.67 there, not 3.

The full tables and the sources are in [grade-rules.md](../02-design/grade-rules.md).

## Decision

1. **The app carries two scales and names each one in full wherever a number is shown:**
   - "GPA, standard scale": HD 4, D 3, C 2, P 1, NP 0.7, N 0.3, NH 0.3, WN 0.
   - "CGPA, Malaysia scale": HD 4, D 3.67, C 2.85, P 2.15, NP 1.7, N 1.15, WN 0.
2. **Both are worked out the same way:** the sum of (grade value × credit points) divided by the sum of credit points.
3. **WAM** counts first-year units at half weight. A unit's year level is the first digit in its code. A withdrawn fail counts as a mark of 0.
4. **Grades from marks:** HD from 80, D from 70, C from 60, P from 50, N below that. The grades NP, NH and WN are never worked out from a mark; the user enters them for a finished unit.
5. **The scales are data in one file** (`core/src/lib/grades.cpp`), so a correction is a one-line change with a test.
6. **A final goal defaults to CGPA**, because that is the number Monash Malaysia students are asked for.

## Alternatives considered

### One scale, as first assumed

- Rejected: it gives the wrong number for every Monash Malaysia student. With the example data, the same results are 2.88 on one scale and 3.51 on the other.

### Only the Malaysia scale

- Pros: simpler screens.
- Cons: the standard GPA is what Australian universities and many overseas applications ask for, and the owner's future goals include postgraduate study abroad.
- Rejected: both numbers are needed, and showing both is what stops them being mixed up.

### Let the user type in their own scale

- Pros: works for any university.
- Cons: more to build and more ways to get a wrong number. The app is for one Monash Malaysia student.
- Rejected for now. The scales are already data, so this could be added.

## Assumptions that still need checking

- **NH on the Malaysia scale.** Monash's Malaysia table does not list hurdle fail. The app gives it the fail value, 1.15. This is a guess.
- **The grade bands** (80, 70, 60, 50) come from a copy of Monash's grading policy, not from the policy page itself, which could not be opened.
- **Rounding.** Monash rounds to three decimal places. The app keeps full precision inside and rounds only on screen (two decimals for GPA and CGPA, one for WAM).
- **Repeated and excluded units.** Monash includes failed and repeated units in WAM. The app includes every finished unit that is entered. It has no way to mark a unit as excluded.
- **WAM for units still to come.** When working out what a WAM goal needs, future units are counted as later-year units (full weight).

## Consequences

- Every screen that shows a result says which scale it is. A sentence on the Grades screen explains why the two differ.
- Tests pin the scale values and include a case where the two scales give different answers, so they cannot be merged by accident.
- The numbers could not be checked against Monash's own worked examples, because the search results gave only the totals of those examples, not the units in them. The owner's own results are the real test.
