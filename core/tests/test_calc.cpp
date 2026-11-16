// Tests for the grade rules and the calculations.
// The expected numbers were worked out by hand; the working is in the comments.
#include "mini.hpp"
#include "tracker/calc.hpp"

using namespace tracker;

namespace {

// Builds the unit used in most tests:
//   Assignment 1  15%  78/100     Assignment 2  15%  70/100
//   Mid test      10%  65/100     Final exam    60%  not done, hurdle 45%
// Earned = 11.7 + 10.5 + 6.5 = 28.7 of the 40 marked. Average = 28.7 / 40 = 71.75%.
void add_fit2004(Tracker& t) {
    CHECK(t.add_unit("FIT2004", "Algorithms and data structures", 6, "S1 2027").empty());
    CHECK(t.add_assessment("FIT2004", "a1", "Assignment 1", 15).empty());
    CHECK(t.add_assessment("FIT2004", "a2", "Assignment 2", 15).empty());
    CHECK(t.add_assessment("FIT2004", "mid", "Mid-semester test", 10).empty());
    CHECK(t.add_assessment("FIT2004", "exam", "Final exam", 60).empty());
    CHECK(t.set_mark("FIT2004", "a1", 78, 100).empty());
    CHECK(t.set_mark("FIT2004", "a2", 70, 100).empty());
    CHECK(t.set_mark("FIT2004", "mid", 65, 100).empty());
    CHECK(t.set_hurdle("FIT2004", "exam", 45).empty());
}

Standing standing_of(const Tracker& t, const char* code) {
    return standing_for(*t.find_unit(code), t.margin, fallback_basis(t));
}

}  // namespace

// ---------- Grade bands: boundary value analysis ----------

TEST(grade_boundaries) {
    CHECK(grade_for_mark(0) == N);
    CHECK(grade_for_mark(49.99) == N);
    CHECK(grade_for_mark(50) == P);
    CHECK(grade_for_mark(59.99) == P);
    CHECK(grade_for_mark(60) == C);
    CHECK(grade_for_mark(69.99) == C);
    CHECK(grade_for_mark(70) == D);
    CHECK(grade_for_mark(79.99) == D);
    CHECK(grade_for_mark(80) == HD);
    CHECK(grade_for_mark(100) == HD);
}

TEST(grade_names_round_trip) {
    for (int g = 0; g < GRADE_COUNT; ++g) {
        Grade parsed = N;
        CHECK(parse_grade(grade_name(static_cast<Grade>(g)), parsed));
        CHECK(parsed == g);
    }
    Grade parsed = N;
    CHECK(!parse_grade("A+", parsed));
    CHECK(!parse_grade("", parsed));
    CHECK(!parse_grade("hd", parsed));   // grades are written in capitals
}

TEST(the_two_scales_are_different) {
    // Same grades, different values. This is why GPA and CGPA are never mixed.
    CHECK_NEAR(gpa_scheme().points[D], 3.0, 1e-9);
    CHECK_NEAR(cgpa_scheme().points[D], 3.67, 1e-9);
    CHECK_NEAR(gpa_scheme().points[N], 0.3, 1e-9);
    CHECK_NEAR(cgpa_scheme().points[N], 1.15, 1e-9);
    CHECK_NEAR(gpa_scheme().points[HD], cgpa_scheme().points[HD], 1e-9);
    CHECK_NEAR(cgpa_scheme().points[WN], 0.0, 1e-9);
}

TEST(year_level_weight_comes_from_the_first_digit) {
    CHECK_NEAR(level_weight("FIT1045"), 0.5, 1e-9);
    CHECK_NEAR(level_weight("FIT2004"), 1.0, 1e-9);
    CHECK_NEAR(level_weight("MAT1830"), 0.5, 1e-9);
    CHECK_NEAR(level_weight("ENG3001"), 1.0, 1e-9);
    CHECK_NEAR(level_weight("ABC"), 1.0, 1e-9);
}

// ---------- Standing in a unit ----------

TEST(standing_with_no_marks) {
    Tracker t;
    CHECK(t.add_unit("FIT2099", "OO design", 6, "S1 2027").empty());
    Standing s = standing_of(t, "FIT2099");
    CHECK(!s.has_average);
    CHECK(!s.has_projected);
    CHECK_NEAR(s.earned, 0, 1e-9);
    CHECK_NEAR(s.left_weight, 100, 1e-9);
    CHECK(s.best_grade == HD);
    CHECK_STR(s.verdict, "No marks yet.");
}

TEST(standing_earned_average_and_projection) {
    Tracker t;
    add_fit2004(t);
    Standing s = standing_of(t, "FIT2004");
    CHECK(s.done_count == 3);
    CHECK(s.total_count == 4);
    CHECK_NEAR(s.earned, 28.7, 1e-9);
    CHECK_NEAR(s.done_weight, 40, 1e-9);
    CHECK_NEAR(s.left_weight, 60, 1e-9);
    CHECK_NEAR(s.average, 71.75, 1e-9);
    CHECK_NEAR(s.projected, 71.75, 1e-9);        // 28.7 + 60 x 0.7175
    CHECK(s.projected_grade == D);
    CHECK(s.best_grade == HD);                   // 28.7 + 60 = 88.7
}

TEST(target_possible_and_realistic) {
    Tracker t;
    add_fit2004(t);
    CHECK(t.set_target("FIT2004", 70).empty());
    Standing s = standing_of(t, "FIT2004");
    CHECK_NEAR(s.need, 68.8333, 1e-3);           // (70 - 28.7) / 60
    CHECK_NEAR(s.need_max, 68.8333, 1e-3);       // the 45% hurdle is lower, so it changes nothing
    CHECK(s.possible);
    CHECK(s.realistic);                          // 68.8 <= 71.75 + 10
    CHECK(s.on_course);
    CHECK(!s.secured);
    CHECK_STR(s.verdict, "On course. The mark you need is below your average so far.");
}

TEST(target_not_possible) {
    // 20% at 74, 25% at 68, 25% at 70: earned 14.8 + 17 + 17.5 = 49.3. Exam is 30%.
    // An HD needs 80: (80 - 49.3) / 30 = 102.3%, which is more than 100.
    Tracker t;
    CHECK(t.add_unit("FIT2099", "OO design", 6, "S1 2027").empty());
    CHECK(t.add_assessment("FIT2099", "a1", "Assignment 1", 20).empty());
    CHECK(t.add_assessment("FIT2099", "a2", "Assignment 2", 25).empty());
    CHECK(t.add_assessment("FIT2099", "a3", "Assignment 3", 25).empty());
    CHECK(t.add_assessment("FIT2099", "exam", "Final exam", 30).empty());
    CHECK(t.set_mark("FIT2099", "a1", 74, 100).empty());
    CHECK(t.set_mark("FIT2099", "a2", 68, 100).empty());
    CHECK(t.set_mark("FIT2099", "a3", 70, 100).empty());
    CHECK(t.set_target("FIT2099", 80).empty());
    Standing s = standing_of(t, "FIT2099");
    CHECK_NEAR(s.earned, 49.3, 1e-9);
    CHECK_NEAR(s.need, 102.3333, 1e-3);
    CHECK(!s.possible);
    CHECK(!s.realistic);                         // never realistic when not possible
    CHECK(!s.on_course);
    CHECK(s.best_grade == D);                    // 49.3 + 30 = 79.3
    CHECK_STR(s.verdict, "HD is out of reach. The highest grade you can still get is D.");
}

TEST(target_possible_but_not_realistic) {
    // 20% at 58 and 20% at 45: earned 11.6 + 9 = 20.6, average 51.5%.
    // A C needs 60: (60 - 20.6) / 60 = 65.67%. The limit is 51.5 + 10 = 61.5, so it is not realistic.
    // At the limit: 20.6 + 60 x 0.615 = 57.5, which is a P.
    Tracker t;
    CHECK(t.add_unit("MAT1830", "Discrete maths", 6, "S1 2027").empty());
    CHECK(t.add_assessment("MAT1830", "w", "Weekly assignments", 20).empty());
    CHECK(t.add_assessment("MAT1830", "mid", "Mid-semester test", 20).empty());
    CHECK(t.add_assessment("MAT1830", "exam", "Final exam", 60).empty());
    CHECK(t.set_mark("MAT1830", "w", 58, 100).empty());
    CHECK(t.set_mark("MAT1830", "mid", 45, 100).empty());
    CHECK(t.set_target("MAT1830", 60).empty());
    Standing s = standing_of(t, "MAT1830");
    CHECK_NEAR(s.average, 51.5, 1e-9);
    CHECK_NEAR(s.need, 65.6667, 1e-3);
    CHECK(s.possible);
    CHECK(!s.realistic);
    CHECK(s.best_realistic == P);
    CHECK_STR(s.verdict, "You would need 14.2 points above your average so far. P is the highest realistic grade.");
}

TEST(realistic_boundary_is_exactly_ten_points) {
    // One assessment worth 50% at 60%: earned 30, average 60. The limit is 70% on the other 50%.
    // Target 65 needs exactly 70%: realistic. Target 65.5 needs 71%: not realistic.
    Tracker t;
    CHECK(t.add_unit("ABC2000", "Boundary", 6, "").empty());
    CHECK(t.add_assessment("ABC2000", "a", "First half", 50).empty());
    CHECK(t.set_mark("ABC2000", "a", 60, 100).empty());
    CHECK(t.set_target("ABC2000", 65).empty());
    CHECK(standing_of(t, "ABC2000").realistic);
    CHECK(t.set_target("ABC2000", 65.5).empty());
    CHECK(!standing_of(t, "ABC2000").realistic);
}

TEST(target_secured) {
    Tracker t;
    CHECK(t.add_unit("ABC2001", "Secured", 6, "").empty());
    CHECK(t.add_assessment("ABC2001", "a", "Big project", 70).empty());
    CHECK(t.set_mark("ABC2001", "a", 90, 100).empty());   // earned 63
    CHECK(t.set_target("ABC2001", 60).empty());
    Standing s = standing_of(t, "ABC2001");
    CHECK(s.secured);
    CHECK(s.possible);
    CHECK(s.realistic);
    CHECK_NEAR(s.need, 0, 1e-9);
    CHECK_STR(s.verdict, "Your target is already secured.");
}

TEST(an_open_hurdle_stops_a_target_being_secured) {
    // Earned 54 already beats the target of 50, but the exam has a 45% hurdle still to pass.
    Tracker t;
    CHECK(t.add_unit("ABC2002", "Hurdle", 6, "").empty());
    CHECK(t.add_assessment("ABC2002", "a", "Project", 60).empty());
    CHECK(t.add_assessment("ABC2002", "exam", "Exam", 40).empty());
    CHECK(t.set_mark("ABC2002", "a", 90, 100).empty());
    CHECK(t.set_hurdle("ABC2002", "exam", 45).empty());
    CHECK(t.set_target("ABC2002", 50).empty());
    Standing s = standing_of(t, "ABC2002");
    CHECK(!s.secured);
    CHECK_NEAR(s.need, 0, 1e-9);
    CHECK_NEAR(s.need_max, 45, 1e-9);            // the hurdle is what must be reached
    CHECK(s.possible);
    CHECK(s.realistic);
}

TEST(a_failed_hurdle_fails_the_unit) {
    Tracker t;
    CHECK(t.add_unit("ABC2003", "Hurdle fail", 6, "").empty());
    CHECK(t.add_assessment("ABC2003", "a", "Project", 60).empty());
    CHECK(t.add_assessment("ABC2003", "exam", "Exam", 40).empty());
    CHECK(t.set_mark("ABC2003", "a", 95, 100).empty());
    CHECK(t.set_hurdle("ABC2003", "exam", 45).empty());
    CHECK(t.set_mark("ABC2003", "exam", 44, 100).empty());   // just under the hurdle
    CHECK(t.set_target("ABC2003", 50).empty());
    Standing s = standing_of(t, "ABC2003");
    CHECK(s.hurdle_failed);
    CHECK(!s.possible);
    CHECK(!s.on_course);
    CHECK(s.best_grade == NH);
    CHECK(s.projected_grade == NH);              // 57 + 17.6 = 74.6 would be a D without the hurdle
    CHECK(t.set_mark("ABC2003", "exam", 45, 100).empty());   // exactly on the hurdle passes
    CHECK(!standing_of(t, "ABC2003").hurdle_failed);
}

TEST(marks_out_of_other_totals) {
    // 17 out of 20 is 85%.
    Tracker t;
    CHECK(t.add_unit("ABC2004", "Scores", 6, "").empty());
    CHECK(t.add_assessment("ABC2004", "q", "Quiz", 10).empty());
    CHECK(t.set_mark("ABC2004", "q", 17, 20).empty());
    Standing s = standing_of(t, "ABC2004");
    CHECK_NEAR(s.earned, 8.5, 1e-9);
    CHECK_NEAR(s.average, 85, 1e-9);
}

TEST(a_unit_with_no_marks_uses_the_overall_average) {
    // Finished units average (80 + 60) / 2 = 70, so the limit for a new unit is 80.
    Tracker t;
    CHECK(t.add_result("FIT1045", "Programming", 6, 80, "", "S1 2026").empty());
    CHECK(t.add_result("FIT1047", "Systems", 6, 60, "", "S1 2026").empty());
    CHECK(t.add_unit("FIT2004", "Algorithms", 6, "").empty());
    CHECK(t.set_target("FIT2004", 80).empty());
    Standing s = standing_of(t, "FIT2004");
    CHECK(s.has_basis);
    CHECK_NEAR(s.basis, 70, 1e-9);
    CHECK(s.realistic);                          // needs 80, limit is 80
    CHECK(t.set_target("FIT2004", 81).empty());
    CHECK(!standing_of(t, "FIT2004").realistic);
}

TEST(with_nothing_to_compare_possible_is_enough) {
    Tracker t;
    CHECK(t.add_unit("FIT2004", "Algorithms", 6, "").empty());
    CHECK(t.set_target("FIT2004", 95).empty());
    Standing s = standing_of(t, "FIT2004");
    CHECK(!s.has_basis);
    CHECK(s.possible);
    CHECK(s.realistic);
    CHECK_STR(s.verdict, "Possible. There are no marks yet to judge how realistic it is.");
}

// ---------- What if ----------

TEST(what_if_gives_the_final_mark_and_grade) {
    Tracker t;
    add_fit2004(t);
    CHECK(t.set_target("FIT2004", 70).empty());
    WhatIf w = what_if(*t.find_unit("FIT2004"), 69);
    CHECK_NEAR(w.final_mark, 70.1, 1e-9);        // 28.7 + 60 x 0.69
    CHECK(w.grade == D);
    CHECK(w.reaches_target);
    CHECK(!w.hurdle_fail);
    w = what_if(*t.find_unit("FIT2004"), 68);
    CHECK_NEAR(w.final_mark, 69.5, 1e-9);
    CHECK(w.grade == C);
    CHECK(!w.reaches_target);
}

TEST(what_if_below_the_hurdle) {
    Tracker t;
    add_fit2004(t);
    WhatIf w = what_if(*t.find_unit("FIT2004"), 44);
    CHECK(w.hurdle_fail);
    CHECK(w.grade == NH);                        // 55.1 would be a P without the hurdle
    w = what_if(*t.find_unit("FIT2004"), 45);
    CHECK(!w.hurdle_fail);
    CHECK(w.grade == P);
}

// ---------- GPA, CGPA and WAM ----------

TEST(gpa_and_cgpa_for_equal_units) {
    // Four 6-point units: HD, D, C, N.
    //   GPA  = (4 + 3 + 2 + 0.3) / 4       = 2.325
    //   CGPA = (4 + 3.67 + 2.85 + 1.15) / 4 = 2.9175
    Totals totals;
    totals.add("FIT2001", 6, 85, HD);
    totals.add("FIT2002", 6, 72, D);
    totals.add("FIT2003", 6, 65, C);
    totals.add("FIT2004", 6, 40, N);
    CHECK_NEAR(totals.gpa(), 2.325, 1e-9);
    CHECK_NEAR(totals.cgpa(), 2.9175, 1e-9);
    CHECK(totals.units == 4);
    CHECK_NEAR(totals.credits, 24, 1e-9);
}

TEST(credit_points_weight_the_average) {
    // HD worth 12 points and P worth 6 points.
    //   GPA  = (4 x 12 + 1 x 6) / 18    = 3.0
    //   CGPA = (4 x 12 + 2.15 x 6) / 18 = 3.3833
    Totals totals;
    totals.add("FIT3001", 12, 90, HD);
    totals.add("FIT3002", 6, 55, P);
    CHECK_NEAR(totals.gpa(), 3.0, 1e-9);
    CHECK_NEAR(totals.cgpa(), 3.38333, 1e-4);
}

TEST(wam_counts_first_year_units_half) {
    // FIT1045: 80 x 6 x 0.5 = 240, weight 3.   FIT2004: 70 x 6 x 1 = 420, weight 6.
    // WAM = 660 / 9 = 73.333
    Totals totals;
    totals.add("FIT1045", 6, 80, HD);
    totals.add("FIT2004", 6, 70, D);
    CHECK_NEAR(totals.wam(), 73.3333, 1e-3);
}

TEST(a_withdrawn_fail_counts_as_zero) {
    Totals totals;
    totals.add("FIT2001", 6, 80, HD);
    totals.add("FIT2002", 6, 30, WN);            // the mark is ignored: it counts as 0
    CHECK_NEAR(totals.wam(), 40, 1e-9);
    CHECK_NEAR(totals.gpa(), 2.0, 1e-9);
    CHECK_NEAR(totals.cgpa(), 2.0, 1e-9);
}

TEST(totals_with_nothing_are_zero_not_a_crash) {
    Totals totals;
    CHECK_NEAR(totals.gpa(), 0, 1e-9);
    CHECK_NEAR(totals.cgpa(), 0, 1e-9);
    CHECK_NEAR(totals.wam(), 0, 1e-9);
}

TEST(a_typed_grade_beats_the_mark) {
    Tracker t;
    CHECK(t.add_result("FIT2001", "Near pass", 6, 47, "NP", "S1 2026").empty());
    CHECK(t.add_result("FIT2002", "From mark", 6, 47, "", "S1 2026").empty());
    CHECK(t.results()[0].final_grade() == NP);
    CHECK(t.results()[1].final_grade() == N);
}

// ---------- The final goal ----------

namespace {
// Eight finished 6-point first-year units: D, D, D, C, HD, D, D, C.
Totals eight_finished_units() {
    Totals totals;
    const double marks[] = {78, 72, 71, 64, 81, 75, 72, 66};
    for (int i = 0; i < 8; ++i) totals.add("FIT10" + std::to_string(10 + i), 6, marks[i], grade_for_mark(marks[i]));
    return totals;
}
}  // namespace

TEST(goal_cgpa_need_and_default_target) {
    // CGPA points: (5 x 3.67 + 2 x 2.85 + 4) x 6 = 168.3. Goal 3.0 over 144 points needs 432.
    // Need = (432 - 168.3) / 96 = 2.7469. The lowest grade worth that much is C (2.85).
    Goal goal{true, "cgpa", 3.0, 144};
    GoalPlan plan = plan_goal(goal, eight_finished_units());
    CHECK_NEAR(plan.credits_done, 48, 1e-9);
    CHECK_NEAR(plan.credits_left, 96, 1e-9);
    CHECK_NEAR(plan.need, 2.74688, 1e-4);
    CHECK(plan.reachable);
    CHECK(!plan.reached);
    CHECK(plan.has_default);
    CHECK(plan.default_grade == C);
    CHECK_NEAR(plan.default_mark, 60, 1e-9);
}

TEST(goal_gpa_uses_the_other_scale) {
    // GPA points: (5 x 3 + 2 x 2 + 4) x 6 = 138. Need = (432 - 138) / 96 = 3.0625: only an HD is enough.
    Goal goal{true, "gpa", 3.0, 144};
    GoalPlan plan = plan_goal(goal, eight_finished_units());
    CHECK_NEAR(plan.need, 3.0625, 1e-9);
    CHECK(plan.default_grade == HD);
}

TEST(goal_wam) {
    // All eight are first-year units: marks 579 x 6 x 0.5 = 1737, weight 24.
    // Need = (75 x (24 + 96) - 1737) / 96 = 75.656
    Goal goal{true, "wam", 75, 144};
    GoalPlan plan = plan_goal(goal, eight_finished_units());
    CHECK_NEAR(plan.need, 75.6563, 1e-3);
    CHECK(plan.default_grade == D);
}

TEST(goal_out_of_reach) {
    Goal goal{true, "cgpa", 4.0, 144};
    GoalPlan plan = plan_goal(goal, eight_finished_units());
    CHECK(plan.has_need);
    CHECK(!plan.reachable);
    CHECK(!plan.has_default);
}

TEST(goal_with_no_units_left) {
    Goal goal{true, "cgpa", 3.0, 48};
    GoalPlan plan = plan_goal(goal, eight_finished_units());
    CHECK(!plan.has_need);
}

TEST(no_goal_set) {
    GoalPlan plan = plan_goal(Goal(), eight_finished_units());
    CHECK(!plan.has_need);
}

// ---------- The rules that keep the data valid ----------

TEST(units_are_checked) {
    Tracker t;
    CHECK(t.add_unit("FIT2004", "Algorithms", 6, "").empty());
    CHECK(!t.add_unit("FIT2004", "Again", 6, "").empty());       // same code twice
    CHECK(!t.add_unit("", "No code", 6, "").empty());
    CHECK(!t.add_unit("   ", "Blank code", 6, "").empty());
    CHECK(!t.add_unit("FIT1", "Zero credit", 0, "").empty());
    CHECK(!t.add_unit("FIT2", "Negative credit", -6, "").empty());
    CHECK(!t.add_unit("FIT\t3", "Tab in code", 6, "").empty());
    CHECK(t.unit_count() == 1);
    CHECK(t.remove_unit("FIT2004").empty());
    CHECK(!t.remove_unit("FIT2004").empty());
    CHECK(t.unit_count() == 0);
}

TEST(weights_cannot_pass_100) {
    Tracker t;
    CHECK(t.add_unit("FIT2004", "Algorithms", 6, "").empty());
    CHECK(t.add_assessment("FIT2004", "a", "A", 60).empty());
    CHECK(t.add_assessment("FIT2004", "b", "B", 40).empty());      // exactly 100 is allowed
    CHECK(!t.add_assessment("FIT2004", "c", "C", 0.5).empty());    // anything more is not
    CHECK(!t.add_assessment("FIT2004", "a", "Same id", 1).empty());
    CHECK(!t.add_assessment("NOPE", "x", "No unit", 10).empty());
    CHECK(t.remove_assessment("FIT2004", "b").empty());
    CHECK(!t.add_assessment("FIT2004", "z", "Zero", 0).empty());
    CHECK(!t.add_assessment("FIT2004", "n", "Negative", -5).empty());
    CHECK(t.add_assessment("FIT2004", "c", "C", 40).empty());
}

TEST(marks_are_checked) {
    Tracker t;
    CHECK(t.add_unit("FIT2004", "Algorithms", 6, "").empty());
    CHECK(t.add_assessment("FIT2004", "a", "A", 50).empty());
    CHECK(!t.set_mark("FIT2004", "a", -1, 100).empty());
    CHECK(!t.set_mark("FIT2004", "a", 101, 100).empty());
    CHECK(!t.set_mark("FIT2004", "a", 5, 0).empty());
    CHECK(!t.set_mark("FIT2004", "missing", 5, 10).empty());
    CHECK(t.set_mark("FIT2004", "a", 0, 100).empty());             // 0 is a valid mark
    CHECK(t.set_mark("FIT2004", "a", 100, 100).empty());           // so is full marks
    CHECK(t.set_mark("FIT2004", "a", 55, 100).empty());            // a mark can be corrected
    CHECK_NEAR(standing_for(*t.find_unit("FIT2004"), 10, Basis()).earned, 27.5, 1e-9);
    CHECK(t.clear_mark("FIT2004", "a").empty());
    CHECK(!standing_for(*t.find_unit("FIT2004"), 10, Basis()).has_average);
}

TEST(targets_results_and_goals_are_checked) {
    Tracker t;
    CHECK(t.add_unit("FIT2004", "Algorithms", 6, "").empty());
    CHECK(!t.set_target("FIT2004", 0).empty());
    CHECK(!t.set_target("FIT2004", 101).empty());
    CHECK(t.set_target("FIT2004", 100).empty());
    CHECK(t.clear_target("FIT2004").empty());
    CHECK(!t.find_unit("FIT2004")->has_target);

    CHECK(!t.add_result("FIT1045", "X", 6, 101, "", "").empty());
    CHECK(!t.add_result("FIT1045", "X", 6, -1, "", "").empty());
    CHECK(!t.add_result("FIT1045", "X", 6, 70, "A+", "").empty());
    CHECK(t.add_result("FIT1045", "X", 6, 70, "-", "").empty());   // "-" means "work the grade out"
    CHECK(!t.remove_result(5).empty());
    CHECK(t.remove_result(0).empty());

    CHECK(!t.set_goal("average", 3, 144).empty());
    CHECK(!t.set_goal("cgpa", 4.5, 144).empty());
    CHECK(!t.set_goal("wam", 101, 144).empty());
    CHECK(!t.set_goal("cgpa", 3, 0).empty());
    CHECK(t.set_goal("wam", 75, 144).empty());
}

TEST(sorted_codes_are_in_order) {
    Tracker t;
    const char* codes[] = {"MAT1830", "FIT2099", "FIT2004", "FIT2094"};
    for (const char* code : codes) CHECK(t.add_unit(code, "x", 6, "").empty());
    std::string joined;
    ds::LinkedList<std::string> sorted = t.sorted_codes();
    for (const std::string& code : sorted) joined += code + " ";
    CHECK_STR(joined, "FIT2004 FIT2094 FIT2099 MAT1830 ");
}
