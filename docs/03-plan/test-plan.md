# Test plan

**Status:** Draft. It describes the tests that exist on 16 November 2026 and what is still untested.

This document answers: how do we know the app works, and which test proves which requirement?

## 1. The levels of testing

| Level | What it checks | How | Count | Where |
|---|---|---|---|---|
| **Unit, white-box** (core) | Each data structure and each rule, written with knowledge of the code | Our own test helper, with a leak check on every test | 72 | `core/tests/test_*.cpp` |
| **System, black-box** (core) | The terminal program as a user sees it, written from the backlog's acceptance criteria only | A script types into the real program and reads its output | 31 | `core/tests/blackbox.py` |
| **Unit** (backend rules) | Budget, food and health rules as pure functions | `node:test` | 21 | `backend/test/domain.test.js` |
| **Integration** (backend) | The real server, a real database and the real C++ engine, called over HTTP | `node:test` | 34 | `backend/test/api.test.js` |
| **Unit** (web) | Presenters and commands, with a fake API and no browser | `node:test` | 27 | `web/test/viewmodel.test.js` |
| **Browser, by hand** | The real screens in a real browser | Driven with the Playwright command-line tool, checked by eye | see section 5 | not automated |

Total automated: **185 tests**. Run them all with `python tools/check.py`. The last saved run is in [docs/proofs/test-run.txt](../proofs/test-run.txt).

This follows the test pyramid: many fast unit tests, fewer integration tests, and a small number of whole-app checks.

## 2. How black-box test cases were designed

Black-box cases come from the acceptance criteria in the [backlog](../01-requirements/product-backlog.md), without reading the code. Three methods were used.

**Equivalence partitioning (EP):** inputs that should behave the same are one group, and one test covers the group.

| Input | Groups | One test each |
|---|---|---|
| A unit code | new, already used, empty | ACA-01 |
| A final mark | from the mark alone, with a typed grade, with a bad grade | GPA-02 |
| A menu choice | on the menu, a number off the menu, text, empty | ACA-13 |

**Boundary value analysis (BVA):** bugs gather at edges, so each edge is tested on both sides.

| Rule | Edge | Tested values |
|---|---|---|
| Grade bands | 50, 60, 70, 80 | 49.99 and 50; 59.99 and 60; 69.99 and 70; 79.99 and 80; also 0 and 100 |
| Weights add up to at most 100% | 100 | exactly 100 (allowed), 100.5 (refused) |
| A mark is at most the marks available | the maximum | 21 out of 20 (refused), 17 out of 20 (allowed) |
| Possible | needs 100% | target 80 needs exactly 100% (possible), target 81 (not possible) |
| Realistic | average + 10 | needs exactly 10 above (realistic), a little more (not realistic) |
| Hurdle | the hurdle mark | 44 with a hurdle of 45 (fails), 45 (passes) |
| Budget: ahead of pace | 5 points ahead of the calendar | RM 750.00 (on pace), RM 750.01 (ahead) |
| Budget: over the limit | the limit | RM 1,000.00 (not over), RM 1,000.01 (over) |
| Food: over target | the target | 2,400 kcal (on target), 2,401 (over) |
| Health: steps target | the target | 8,000 (reached), 7,999 (1 short) |
| A goal value | top of the scale | 4.5 on a 4-point scale (refused) |

**State transition (ST):** the same data across two runs.

| From | Action | To | Test |
|---|---|---|---|
| Data typed in | close, open again | everything still there | ACA-12 |
| A damaged file | open | bad lines reported, good lines kept, file untouched | ACA-12 |
| A damaged file | make a change | new file saved, old one kept as a backup | ACA-12 |

## 3. Traceability: which test proves which story

Every story in release 0.1 is listed. "Pass" means the automated tests for it pass today.

| Story | What it asks for | Tests | State |
|---|---|---|---|
| ACA-01 | Add a unit | black-box ×3; `units_are_checked`; API "a unit is added", "the same code twice", "bad input is refused" | Pass |
| ACA-02 | Find and list units | black-box ×1; `sorted_codes_are_in_order` | Pass |
| ACA-03 | Edit or remove a unit | black-box ×1 (remove); API "deleting a unit removes its assessments" | Pass for remove. **Edit: the API works, no screen yet** (task C2) |
| ACA-04 | Add assessments with weights | black-box ×1; `weights_cannot_pass_100`; API "weights above 100% are refused" | Pass |
| ACA-05 | Record a mark | black-box ×2; `marks_are_checked`, `marks_out_of_other_totals`; API "a mark above the marks available" | Pass |
| ACA-06 | Done and not done | black-box ×1; presenter "a unit shows its numbers" | Pass |
| ACA-07 | Standing in a unit | black-box ×2; `standing_*` | Pass |
| ACA-08 | Set a target | black-box ×1; `targets_results_and_goals_are_checked`; API "setting a target" | Pass |
| ACA-09 | Mark needed for the target | black-box ×1; `target_possible_and_realistic` | Pass |
| ACA-10 | Possible or not | black-box ×1; `target_not_possible`, `target_secured` | Pass |
| ACA-11 | Hurdles | black-box ×1; `a_failed_hurdle_fails_the_unit`, `an_open_hurdle_stops_a_target_being_secured`; API "a mark below the hurdle" | Pass |
| ACA-12 | Saved to a file | black-box ×3; `save_then_load_*`, `a_damaged_file_*`, `file_round_trip_keeps_a_backup` | Pass |
| ACA-13 | A clear menu that never crashes | black-box ×2 | Pass |
| ACA-14 | Realistic, apart from possible | black-box ×1; `target_possible_but_not_realistic`, `realistic_boundary_is_exactly_ten_points`; presenter "two separate chips" | Pass |
| ACA-15 | What if | black-box ×1; `what_if_*`; API "what-if answers without saving" | Pass |
| ACA-16 | The attention list | black-box ×2; `engine_report_lists_units_that_need_attention`; presenter "the attention list" | Pass |
| GPA-01 | Mark to grade | black-box ×1; `grade_boundaries` | Pass |
| GPA-02 | Finished units | black-box ×1; `a_typed_grade_beats_the_mark` | Pass |
| GPA-03 | GPA for a semester | black-box ×2; `gpa_and_cgpa_for_equal_units`; API "finished units give GPA, CGPA and WAM" | Pass against hand-worked numbers. **Not yet checked against Monash's calculator** (task A4) |
| GPA-04 | WAM | `wam_counts_first_year_units_half`, `a_withdrawn_fail_counts_as_zero` | Same as above |
| GPA-05 | CGPA, apart from GPA | `the_two_scales_are_different`; presenter "labelled as different scales" | Same as above |
| GPA-06 | A target for GPA, WAM or CGPA | black-box ×1; `goal_*` | Pass |
| GPA-07 | Default targets from a final goal | black-box ×2; `goal_cgpa_need_and_default_target`; API "a final goal gives the average needed" | Pass |
| GPA-08 | The path to the goal | black-box ×1; presenter "each map runs done, now, ahead, goal" | Pass |
| ENG-01 | Builds with one documented command | `python tools/check.py` | Pass on Windows. **Linux untested until CI runs** |
| ENG-02 | Hand-built structures with documented complexity | the tables at the top of each file in `core/include/ds/`, and [core/README.md](../../core/README.md) | Done |
| ENG-03 | White-box tests | 72 tests | Pass |
| ENG-04 | Black-box tests named by story | 31 tests | Pass |
| ENG-05 | Memory checked automatically | the leak counter (every run); sanitizers (CI) | Leak counter passes. **Sanitizers have not run yet** |
| ENG-06 | CI on every push | `.github/workflows/ci.yml` | Written. **Has not run yet**: nothing is pushed |
| ENG-07 | Benchmarks | none | **Not done** (task C7) |
| ENG-08 | README | [README.md](../../README.md), [core/README.md](../../core/README.md) | Done |
| ENG-09 | Backlog on a public board | `tools/backlog_sync.py`, dry run only | **Needs the owner's GitHub login** |

Release 0.2 (screenshot import):

| Story | Tests | State |
|---|---|---|
| ACA-20 Read a screenshot | API "a screenshot is read into a list" | Pass **with a fake AI service only** |
| ACA-21 Check before saving | ViewModel "a screenshot import saves only the rows the user kept" | Pass with a fake API |
| ACA-22 Failures leave data untouched | API "a used-up limit, an outage and a strange answer" | Pass with a fake AI service |
| ENG-20 The key is never in the repository | CI secret check; API "the key stays in the header" | Written; CI part has not run |

## 4. Tests beyond the backlog

| Area | Tests |
|---|---|
| Security | Paths outside the web folder are refused (3 forms). A change not sent as JSON is refused. The access token is required when set. The key never reaches the browser. Text with HTML in it is escaped (by hand, section 5). |
| Privacy | Hidden grades: no raw mark in the presented data. Only a short summary goes to the AI. |
| Robustness | Broken JSON, a body that is too large, unknown addresses, wrong methods. The app still loads when the engine is missing. A failed AI call never changes data. |

## 5. Checked by hand in a browser

On 16 and 17 November 2026, in Chromium at 1360 px and 390 px wide, with no errors in the console:

| Check | Result |
|---|---|
| Empty app shows a start card; "Load example data" fills every screen | Pass |
| Add a unit; its code is shown in capitals | Pass |
| A unit name containing `<b>` shows as text | Pass |
| Adding the same code again shows the error and keeps what was typed | Pass |
| Add an assessment, enter 34 out of 40, set a target of 80: earned 34.0, needed 76.7%, "Possible" and "Realistic" | Pass |
| The what-if slider at 90% shows "Final mark 88.0, grade HD. Target reached." | Pass |
| A weight that would pass 100% is refused with the engine's message | Pass |
| Hide grades masks every number and removes the mark inputs | Pass, **after a fix**: it first failed while an error message was showing |
| Add spending: the total and the list update | Pass |
| Reload: everything is still there | Pass |
| Every screen at phone width has no sideways scroll | Pass |
| The map: drag, zoom buttons, picking a stop | Pass in the prototype. In the real app only by synthetic events |
| With an access token set: the app shows a locked screen, refuses a wrong token and opens with the right one | Pass |
| With the server stopped: the screens still open from the offline copy, with a clear message. 13 files are kept; no API answer is | Pass |

Screenshots: [docs/proofs/screens/](../proofs/screens/).

## 6. Bugs the tests found

| Found by | Bug | Fix |
|---|---|---|
| Leak check | Under an optimised build on Windows the test program reported negative leaks | The C++ library was allocating inside its own DLL where the counter could not see it. The programs are now linked statically. |
| Browser check | "Hide grades" did nothing while an error message was showing | A failed command now says so explicitly, instead of the screen guessing from a leftover error. A regression test was added. |
| ViewModel test | With grades hidden, the edit forms still carried the raw marks in their input boxes | No raw mark is handed to the page while hidden; the forms are removed. |
| Writing the security review | A form on another website could have sent a change to the app on the user's computer | Every change must be sent as JSON. A test covers it. |

## 7. Not tested

Be clear about these when describing the project:

- **Linux and CI.** Everything ran on Windows only. The CI workflow and the sanitizer build have never run.
- **The real Gemini API.** Both AI features were tested with a fake service.
- **A real phone.** Phone width was tested in a desktop browser. Touch, pinch-to-zoom and "Add to Home screen" were not.
- **Browsers other than Chromium.**
- **Screen readers and keyboard-only use.** The markup uses real buttons, labels and live regions, but no full accessibility pass was done (task C8).
- **Automated browser tests.** The browser checks above are not repeatable by a script yet (task C1).
- **Monash's own numbers.** GPA, CGPA and WAM match hand-worked examples built from Monash's published scales, not Monash's calculator output.
- **Large data and long use.** Nothing was run for days or with thousands of rows.

## 8. User acceptance test

Planned, not started: two weeks of real daily use by the owner in the summer semester, noting anything wrong or annoying. The app passes if, at the end, the owner still opens it by choice and the numbers match their official results.
