// The calculations. Each function here only reads its input and returns a result:
// it changes nothing and gives the same answer for the same input. That makes
// every rule easy to test.
#pragma once

#include <string>

#include "tracker/model.hpp"

namespace tracker {

// The average that "realistic" is compared with when a unit has no marks of its own yet.
struct Basis {
    bool has = false;
    double value = 0;
};

// Where a student stands in one unit.
struct Standing {
    int done_count = 0;
    int total_count = 0;
    double done_weight = 0;      // percent of the unit already marked
    double earned = 0;           // unit marks earned so far, out of 100
    double left_weight = 100;    // percent of the unit still to come
    bool has_average = false;
    double average = 0;          // average percent on the marked work
    bool hurdle_failed = false;  // a marked assessment was below its hurdle
    Grade best_grade = N;        // the highest grade still possible
    bool has_projected = false;
    double projected = 0;        // the final mark if the average so far continues
    Grade projected_grade = N;

    // The rest is only filled in when the unit has a target.
    bool has_target = false;
    double target = 0;
    bool secured = false;        // the target is already certain
    bool possible = false;       // 100% or less is needed on what is left
    bool realistic = false;      // the mark needed is within `margin` points of the basis
    bool on_course = false;      // possible and realistic
    bool has_need = false;
    double need = 0;             // average percent needed across everything that is left
    double need_max = 0;         // the highest percent needed on any one assessment, hurdles included
    bool has_basis = false;
    double basis = 0;            // the average "realistic" was compared with
    Grade best_realistic = N;    // the highest grade that is still realistic
    std::string verdict;         // one plain sentence
};

Standing standing_for(const Unit& unit, double margin, Basis fallback);

// The result of scoring `score_percent` on everything that is left in a unit.
struct WhatIf {
    double final_mark = 0;
    Grade grade = N;
    bool hurdle_fail = false;
    bool has_target = false;
    bool reaches_target = false;
};

WhatIf what_if(const Unit& unit, double score_percent);

// Running totals for GPA, CGPA and WAM over a set of units.
struct Totals {
    int units = 0;
    double credits = 0;
    double gpa_points = 0;    // sum of (GPA value x credit points)
    double cgpa_points = 0;   // sum of (CGPA value x credit points)
    double wam_marks = 0;     // sum of (mark x credit points x year-level weight)
    double wam_weight = 0;    // sum of (credit points x year-level weight)

    void add(const std::string& code, double credit, double mark, Grade grade);
    double gpa() const { return credits > 0 ? gpa_points / credits : 0; }
    double cgpa() const { return credits > 0 ? cgpa_points / credits : 0; }
    double wam() const { return wam_weight > 0 ? wam_marks / wam_weight : 0; }
};

// What the final goal asks of the units that are not finished yet.
struct GoalPlan {
    double credits_done = 0;
    double credits_left = 0;
    bool has_need = false;
    double need = 0;             // grade points (gpa, cgpa) or mark (wam) needed on average
    bool reached = false;        // the goal holds even with the lowest results from here on
    bool reachable = false;      // the need is not above the top of the scale
    bool has_default = false;
    Grade default_grade = N;     // the lowest grade that meets the need: the default unit target
    double default_mark = 0;
};

GoalPlan plan_goal(const Goal& goal, const Totals& finished);

// The average used for units with no marks yet: the mean final mark of the
// finished units, or failing that the mean of the other units' averages.
Basis fallback_basis(const Tracker& tracker);

// "71.8" style text, used in verdict sentences.
std::string one_decimal(double value);

}  // namespace tracker
