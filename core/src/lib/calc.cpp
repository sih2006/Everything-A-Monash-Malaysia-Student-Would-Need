#include "tracker/calc.hpp"

#include <cstdio>

namespace tracker {

namespace {
const double TINY = 1e-9;

double smaller(double a, double b) { return a < b ? a : b; }
double larger(double a, double b) { return a > b ? a : b; }
}  // namespace

std::string one_decimal(double value) {
    char text[32];
    std::snprintf(text, sizeof(text), "%.1f", value);
    return text;
}

Standing standing_for(const Unit& unit, double margin, Basis fallback) {
    Standing s;
    double top_open_hurdle = 0;      // the highest hurdle among assessments not marked yet
    bool open_hurdle = false;

    // One pass over the assessments: O(n) for n assessments.
    for (const Assessment& a : unit.assessments) {
        ++s.total_count;
        if (a.done) {
            ++s.done_count;
            s.done_weight += a.weight;
            s.earned += a.weight * a.percent() / 100.0;
            if (a.has_hurdle && a.percent() < a.hurdle - TINY) s.hurdle_failed = true;
        } else if (a.has_hurdle) {
            open_hurdle = true;
            top_open_hurdle = larger(top_open_hurdle, a.hurdle);
        }
    }

    // Weight that has not been typed in yet still counts as "to come".
    s.left_weight = larger(0, 100.0 - s.done_weight);

    if (s.done_weight > 0) {
        s.has_average = true;
        s.average = s.earned / s.done_weight * 100.0;
        s.has_projected = true;
        s.projected = s.earned + s.left_weight * s.average / 100.0;
        s.projected_grade = s.hurdle_failed ? NH : grade_for_mark(s.projected);
    }
    s.best_grade = s.hurdle_failed ? NH : grade_for_mark(s.earned + s.left_weight);

    // A pass or fail unit has no mark that counts anywhere. The only question is: pass (50) or not.
    if (unit.pass_fail) {
        if (s.hurdle_failed) s.verdict = "A hurdle was not reached, so this unit is failed. It does not change your GPA, CGPA or WAM.";
        else if (s.earned >= 50 - TINY) s.verdict = "Passed. Pass or fail only, so it does not change your GPA, CGPA or WAM.";
        else if (s.has_average) s.verdict = std::string("Pass or fail only. On your average so far you are heading for a ") + (s.projected >= 50 - TINY ? "pass" : "fail") + ". It does not change your GPA, CGPA or WAM.";
        else s.verdict = "Pass or fail only. It does not change your GPA, CGPA or WAM.";
        return s;
    }

    if (!unit.has_target) {
        if (s.hurdle_failed) s.verdict = "A hurdle was not reached, so the result is a hurdle fail (NH).";
        else if (s.has_average) s.verdict = std::string("No target set. On your average so far you are heading for ") + grade_name(s.projected_grade) + ".";
        else s.verdict = "No marks yet.";
        return s;
    }

    s.has_target = true;
    s.target = unit.target;

    if (s.has_average) {
        s.has_basis = true;
        s.basis = s.average;
    } else if (fallback.has) {
        s.has_basis = true;
        s.basis = fallback.value;
    }
    double limit = s.has_basis ? smaller(100, s.basis + margin) : 100;

    if (s.hurdle_failed) {
        s.best_realistic = NH;
        s.verdict = "A hurdle was not reached, so the result is a hurdle fail (NH). The target cannot be reached.";
        return s;
    }

    s.secured = s.earned >= s.target - TINY && !open_hurdle;
    s.possible = s.earned + s.left_weight >= s.target - TINY;
    if (s.left_weight > 0) {
        s.has_need = true;
        s.need = larger(0, s.target - s.earned) / s.left_weight * 100.0;
        s.need_max = larger(s.need, top_open_hurdle);
    }
    s.realistic = s.secured || (s.possible && s.need_max <= limit + TINY);
    s.on_course = s.possible && s.realistic;
    s.best_realistic = grade_for_mark(s.earned + s.left_weight * limit / 100.0);

    const char* target_grade = grade_name(grade_for_mark(s.target));
    if (s.secured) {
        s.verdict = "Your target is already secured.";
    } else if (!s.possible) {
        s.verdict = std::string(target_grade) + " is out of reach. The highest grade you can still get is " + grade_name(s.best_grade) + ".";
    } else if (!s.has_basis) {
        s.verdict = "Possible. There are no marks yet to judge how realistic it is.";
    } else if (!s.realistic) {
        s.verdict = "You would need " + one_decimal(s.need_max - s.basis) + " points above your average so far. " +
                    grade_name(s.best_realistic) + " is the highest realistic grade.";
    } else if (s.need_max <= s.basis) {
        s.verdict = "On course. The mark you need is below your average so far.";
    } else {
        s.verdict = "On course. You need " + one_decimal(s.need_max - s.basis) + " points above your average so far.";
    }
    return s;
}

WhatIf what_if(const Unit& unit, double score_percent) {
    WhatIf w;
    double earned = 0, done_weight = 0;
    for (const Assessment& a : unit.assessments) {
        if (a.done) {
            done_weight += a.weight;
            earned += a.weight * a.percent() / 100.0;
            if (a.has_hurdle && a.percent() < a.hurdle - TINY) w.hurdle_fail = true;
        } else if (a.has_hurdle && score_percent < a.hurdle - TINY) {
            w.hurdle_fail = true;
        }
    }
    double left = larger(0, 100.0 - done_weight);
    w.final_mark = earned + left * score_percent / 100.0;
    w.grade = w.hurdle_fail ? NH : grade_for_mark(w.final_mark);
    w.has_target = unit.has_target;
    w.reaches_target = unit.has_target && !w.hurdle_fail && w.final_mark >= unit.target - TINY;
    return w;
}

void Totals::add(const std::string& code, double credit, double mark, Grade grade) {
    ++units;
    credits += credit;
    gpa_points += gpa_scheme().points[grade] * credit;
    cgpa_points += cgpa_scheme().points[grade] * credit;
    double weight = credit * level_weight(code);
    wam_marks += (grade == WN ? 0 : mark) * weight;   // a withdrawn fail counts as a mark of 0
    wam_weight += weight;
}

GoalPlan plan_goal(const Goal& goal, const Totals& finished) {
    GoalPlan plan;
    plan.credits_done = finished.credits;
    plan.credits_left = goal.total_credits - finished.credits;
    if (!goal.set || plan.credits_left <= 0) return plan;

    plan.has_need = true;
    if (goal.measure == "wam") {
        // Units still to come are counted as later-year units (weight 1).
        plan.need = (goal.value * (finished.wam_weight + plan.credits_left) - finished.wam_marks) / plan.credits_left;
        plan.reached = plan.need <= 0;
        plan.reachable = plan.need <= 100 + TINY;
        if (plan.reachable) {
            plan.has_default = true;
            plan.default_mark = larger(0, plan.need);
            plan.default_grade = grade_for_mark(plan.default_mark);
        }
        return plan;
    }

    const Scheme& scheme = goal.measure == "gpa" ? gpa_scheme() : cgpa_scheme();
    double done_points = goal.measure == "gpa" ? finished.gpa_points : finished.cgpa_points;
    plan.need = (goal.value * goal.total_credits - done_points) / plan.credits_left;
    plan.reached = plan.need <= scheme.points[N];   // even a fail in every unit keeps the goal
    plan.reachable = plan.need <= scheme.points[HD] + TINY;
    if (plan.reachable) {
        // The lowest passing grade whose value meets the need.
        const Grade passing[] = {P, C, D, HD};
        for (Grade g : passing) {
            if (scheme.points[g] >= plan.need - TINY) {
                plan.has_default = true;
                plan.default_grade = g;
                plan.default_mark = min_mark_for(g);
                break;
            }
        }
    }
    return plan;
}

Basis fallback_basis(const Tracker& tracker) {
    Basis basis;
    double sum = 0;
    int count = 0;
    for (const Result& r : tracker.results()) {
        sum += r.mark;
        ++count;
    }
    if (count == 0) {
        ds::LinkedList<std::string> codes = tracker.sorted_codes();
        for (const std::string& code : codes) {
            Standing s = standing_for(*tracker.find_unit(code), tracker.margin, Basis());
            if (s.has_average) {
                sum += s.average;
                ++count;
            }
        }
    }
    if (count > 0) {
        basis.has = true;
        basis.value = sum / count;
    }
    return basis;
}

}  // namespace tracker
