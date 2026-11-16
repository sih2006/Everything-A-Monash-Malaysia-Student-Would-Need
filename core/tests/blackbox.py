#!/usr/bin/env python3
"""Black-box tests for the terminal program.

These tests do not look at the code. Each one types answers into the real
program, the way a user would, and checks what the program prints. Every test
names the backlog story it checks, so a failing test points at a requirement.

    python core/tests/blackbox.py path/to/tracker

Test design methods used (see docs/03-plan/test-plan.md):
  EP  = equivalence partitioning   one test for each group of inputs that should behave the same
  BVA = boundary value analysis    tests on each side of an edge, such as 79.99 and 80
  ST  = state transition           the same data across two runs of the program
"""
import os
import subprocess
import sys
import tempfile

TRACKER = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else "tracker"

# Typed answers that build one unit with three marks and an exam still to come:
#   earned 28.7 of 40, average 71.75%
UNIT = ["2", "fit2004", "Algorithms and data structures", "", "S1 2027",
        "3", "1", "Assignment 1", "15",
        "3", "1", "Assignment 2", "15",
        "3", "1", "Mid-semester test", "10",
        "3", "1", "Final exam", "60",
        "4", "1", "1", "", "78",
        "4", "1", "2", "", "70",
        "4", "1", "3", "", "65"]


def run(answers, path=None, keep=False):
    """Runs the program with the typed answers and returns everything it printed."""
    folder = tempfile.mkdtemp()
    data = path or os.path.join(folder, "data.tsv")
    done = subprocess.run([TRACKER, data], input="\n".join(answers) + "\n", capture_output=True, text=True, timeout=30)
    assert done.returncode == 0, f"the program stopped with code {done.returncode}: {done.stderr}"
    return (done.stdout, data) if keep else done.stdout


CASES = []


def case(story, method, name):
    def register(function):
        CASES.append((story, method, name, function))
        return function
    return register


def has(output, *parts):
    for part in parts:
        assert part in output, f"expected to see: {part!r}"


def has_not(output, *parts):
    for part in parts:
        assert part not in output, f"did not expect to see: {part!r}"


# ---------- Epic A: units and assessments ----------

@case("ACA-01", "EP", "a valid unit is added and listed, with the code in capitals")
def _():
    out = run(["2", "fit2004", "Algorithms", "6", "S1 2027", "1", "0"])
    has(out, "Unit added.", "FIT2004", "Algorithms")


@case("ACA-01", "EP", "a unit code that already exists is rejected")
def _():
    out = run(["2", "FIT2004", "Algorithms", "", "S1", "2", "FIT2004", "Again", "", "", "0"])
    has(out, "There is already a unit with the code FIT2004.")


@case("ACA-01", "BVA", "credit points of 0 are refused and asked for again")
def _():
    out = run(["2", "FIT2004", "Algorithms", "0", "6", "S1", "0"])
    has(out, "Please type a number from 0.5 to 48", "Unit added.")


@case("ACA-02", "EP", "a unit is found by part of its name; no match says so")
def _():
    out = run(UNIT + ["14", "data struct", "14", "zebra", "0"])
    has(out, "FIT2004   Algorithms and data structures", 'No unit matches "zebra".')


@case("ACA-03", "EP", "removing a unit needs the word yes")
def _():
    out = run(UNIT + ["15", "1", "no", "15", "1", "yes", "1", "0"])
    has(out, "Nothing was removed.", "Unit removed.", "There are no units yet.")


@case("ACA-04", "BVA", "weights may add up to exactly 100 but not more")
def _():
    out = run(["2", "ABC1000", "Weights", "", "",
               "3", "1", "First", "60", "3", "1", "Second", "40", "3", "1", "Third", "0.5", "0"])
    assert out.count("Assessment added.") == 2
    has(out, "That would take the unit above 100%.")


@case("ACA-05", "BVA", "a mark above the marks available is refused; 17 out of 20 is 85%")
def _():
    out = run(["2", "ABC1000", "Marks", "", "", "3", "1", "Quiz", "10",
               "4", "1", "1", "20", "21", "17", "7", "1", "0"])
    has(out, "Please type a number from 0 to 20", "Mark recorded.", "17/20 (85.0%)")


@case("ACA-05", "EP", "a mark can be corrected later")
def _():
    out = run(["2", "ABC1000", "Marks", "", "", "3", "1", "Quiz", "50",
               "4", "1", "1", "", "40", "4", "1", "1", "", "60", "7", "1", "0"])
    has(out, "60/100 (60.0%)", "Earned so far:   30.0")


@case("ACA-06", "EP", "each assessment shows as done or not done")
def _():
    out = run(UNIT + ["7", "1", "0"])
    has(out, "Assignment 1", "done    78/100", "Final exam", "not done", "Still to come:   60%")


# ---------- Epic B: standing and targets ----------

@case("ACA-07", "EP", "standing shows marks earned, the average and the grade it leads to")
def _():
    out = run(UNIT + ["7", "1", "0"])
    has(out, "Earned so far:   28.7 of the 40% marked", "average 71.8%", "heading for D")


@case("ACA-07", "EP", "a unit with no marks says so instead of showing 0")
def _():
    out = run(["2", "ABC1000", "Empty", "", "", "1", "0"])
    has(out, "No marks yet.")


@case("ACA-08", "EP", "a target can be set and removed")
def _():
    out = run(UNIT + ["5", "1", "70", "5", "1", "0", "0"])
    has(out, "Target set.", "Target removed.")


@case("ACA-09", "EP", "the mark needed matches the hand-worked example: (70 - 28.7) / 60 = 68.8%")
def _():
    out = run(UNIT + ["5", "1", "70", "0"])
    has(out, "Needed:          68.8% on what is left")


@case("ACA-10", "BVA", "needing 100% is possible; needing more is not")
def _():
    # 50% of the unit at 60%: earned 30. Target 80 needs exactly 100%. Target 81 needs 102%.
    base = ["2", "ABC1000", "Edge", "", "", "3", "1", "First half", "50", "4", "1", "1", "", "60"]
    has(run(base + ["5", "1", "80", "0"]), "Possible:        yes")
    has(run(base + ["5", "1", "81", "0"]), "Possible:        no", "is out of reach")


@case("ACA-14", "BVA", "realistic is exactly 10 points above the average, shown apart from possible")
def _():
    # Average 60, so the limit is 70% on the rest. Target 65 needs 70%: realistic. Target 66 needs 72%: not.
    base = ["2", "ABC1000", "Edge", "", "", "3", "1", "First half", "50", "4", "1", "1", "", "60"]
    has(run(base + ["5", "1", "65", "0"]), "Possible:        yes", "Realistic:       yes")
    out = run(base + ["5", "1", "66", "0"])
    has(out, "Possible:        yes", "Realistic:       no", "points above your average so far")


@case("ACA-11", "BVA", "a mark just under a hurdle fails the unit; a mark on the hurdle passes")
def _():
    base = ["2", "ABC1000", "Hurdle", "", "", "3", "1", "Project", "60", "3", "1", "Exam", "40",
            "4", "1", "1", "", "95", "6", "1", "2", "45"]
    has(run(base + ["4", "1", "2", "", "44", "0"]), "hurdle fail (NH)")
    has_not(run(base + ["4", "1", "2", "", "45", "0"]), "hurdle fail")


@case("ACA-15", "EP", "what-if gives the final mark and grade, and warns about a hurdle")
def _():
    out = run(UNIT + ["6", "1", "4", "45", "5", "1", "70", "8", "1", "69", "8", "1", "40", "0"])
    has(out, "Final mark 70.1, grade D.", "Your target is reached.", "below a hurdle")


@case("ACA-16", "EP", "the attention list shows only units that are off course")
def _():
    out = run(UNIT + ["5", "1", "70",
                      "2", "FIT2099", "OO design", "", "", "3", "2", "Project", "70", "4", "2", "1", "", "70", "5", "2", "80",
                      "9", "0"])
    listing = out.split("Choose: ")[-2]      # what was printed after choosing 9
    has(listing, "FIT2099", "out of reach")
    has_not(listing, "FIT2004")


@case("ACA-16", "EP", "with nothing off course the list says so")
def _():
    has(run(UNIT + ["5", "1", "70", "9", "0"]), "Nothing needs attention.")


# ---------- Epic C: GPA, WAM and CGPA ----------

RESULTS = ["10", "FIT1045", "Programming", "", "78", "", "S1 2026",
           "10", "FIT1047", "Systems", "", "47", "NP", "S1 2026",
           "10", "FIT2001", "Later unit", "", "85", "", "S2 2026"]


@case("GPA-01", "BVA", "marks on each side of a grade edge get the right grade")
def _():
    out = run(["10", "AAA2001", "x", "", "49.99", "", "T", "10", "AAA2002", "x", "", "50", "", "T",
               "10", "AAA2003", "x", "", "79.99", "", "T", "10", "AAA2004", "x", "", "80", "", "T", "17", "", "0"])
    has(out, "49.99 N", "50 P", "79.99 D", "80 HD")


@case("GPA-02", "EP", "a finished unit is stored from its final result alone; a bad grade is refused")
def _():
    out = run(["10", "FIT1045", "Programming", "", "78", "A+", "S1 2026", "10", "FIT1045", "Programming", "", "78", "", "S1 2026", "0"])
    has(out, "The grade must be one of HD, D, C, P, NP, N, NH or WN.", "Finished unit added.")


@case("GPA-03/04/05", "EP", "GPA, CGPA and WAM match hand-worked numbers and are labelled apart")
def _():
    # S1 2026: D (78) and NP (47), both first-year.  GPA (3 + 0.7) / 2 = 1.850.  CGPA (3.67 + 1.7) / 2 = 2.685.  WAM 62.5.
    # All three: GPA (3 + 0.7 + 4) / 3 = 2.567.  CGPA (3.67 + 1.7 + 4) / 3 = 3.123.
    # WAM = (78 x 3 + 47 x 3 + 85 x 6) / 12 = 73.75   (first-year units count half)
    out = run(RESULTS + ["11", "0"])
    has(out, "GPA", "CGPA", "WAM", "They are different numbers.")
    has(out, "S1 2026", "1.850", "2.685", "62.500")
    has(out, "All finished units", "2.567", "3.123", "73.750")


@case("GPA-03", "EP", "with no results the overall screen says so")
def _():
    has(run(["11", "0"]), "No results yet.")


@case("GPA-06/07", "EP", "a final goal gives the average needed and a default unit target")
def _():
    # CGPA points so far: (3.67 + 1.7 + 4) x 6 = 56.22. Goal 3.0 over 48 points needs 144.
    # Need = (144 - 56.22) / 30 = 2.93, so the default target is D (3.67 is the lowest value that reaches it).
    out = run(RESULTS + ["12", "cgpa", "3", "48", "11", "0"])
    has(out, "Goal set.", "You need an average of 2.93 across the 30 credit points left.", "Default target for each unit: D (70 or more).")


@case("GPA-07", "BVA", "a goal above the top of the scale is refused")
def _():
    has(run(["12", "cgpa", "4.5", "4", "144", "0"]), "Please type a number from 0.01 to 4")


@case("GPA-08", "EP", "the path shows finished semesters, today's tasks, what is left and the goal")
def _():
    out = run(RESULTS + UNIT + ["5", "1", "70", "12", "cgpa", "3", "144", "13", "0"])
    has(out, "[done] S1 2026", "[now ] S1 2027", "done   Assignment 1: 78.0%", "to do  Final exam: need 68.8%", "[next]", "[goal] CGPA 3")


# ---------- Epic D: using and keeping the data ----------

@case("ACA-12", "ST", "everything typed is still there after closing and opening again")
def _():
    out, path = run(UNIT + ["5", "1", "70", "0"], keep=True)
    again = run(["7", "1", "0"], path=path)
    has(again, "Loaded 1 unit(s)", "78/100", "Target:          70 (D)")


@case("ACA-12", "EP", "a damaged file gives a clear message, keeps the good lines and is never wiped")
def _():
    folder = tempfile.mkdtemp()
    path = os.path.join(folder, "data.tsv")
    damaged = "unit\tFIT2004\tAlgorithms\t6\t-\tS1 2027\nthis line is rubbish\nunit\tFIT2099\tmissing fields\n"
    with open(path, "w", newline="\n") as f:
        f.write(damaged)
    out = run(["1", "0"], path=path)
    has(out, "could not be read and were skipped", "line 2", "line 3", "FIT2004")
    with open(path) as f:
        assert f.read() == damaged, "the damaged file must be left exactly as it was when nothing is changed"
    run(["2", "NEW1000", "New unit", "", "", "0"], path=path)        # a change saves, and keeps a backup
    with open(path + ".bak") as f:
        assert f.read() == damaged, "the old file must be kept as a backup"


@case("ACA-12", "EP", "a missing file starts fresh with a message")
def _():
    has(run(["0"]), "Starting fresh.")


@case("ACA-13", "EP", "wrong menu choices and wrong answers never crash the program")
def _():
    out = run(["banana", "99", "-1", "", "2", "", "7", "nothing-like-this", "", "4", "", "0"])
    has(out, "is not on the menu", "Goodbye.")


@case("ACA-13", "EP", "input that ends in the middle of a question is handled")
def _():
    out = run(["2", "FIT2004"])     # the program is cut off while asking for the name
    has(out, "Input ended.")


def main():
    if not os.path.exists(TRACKER) and not os.path.exists(TRACKER + ".exe"):
        sys.exit(f"Cannot find the program at {TRACKER}. Build it first.")
    failed = 0
    for story, method, name, function in CASES:
        try:
            function()
            print(f"ok    {story:<13} {method:<3} {name}")
        except AssertionError as problem:
            failed += 1
            print(f"FAIL  {story:<13} {method:<3} {name}\n        {problem}")
    stories = sorted({part for story, _, _, _ in CASES for part in [story]})
    print(f"\n{len(CASES) - failed} of {len(CASES)} black-box tests passed, covering {len(stories)} story groups")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
