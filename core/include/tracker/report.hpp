// The engine report: everything the tracker knows and has worked out, as one JSON text.
// The backend sends the stored data to the engine and gets this back, so every
// grade rule lives in one place (this C++ core) and nowhere else.
#pragma once

#include <string>

#include "tracker/calc.hpp"
#include "tracker/codec.hpp"

namespace tracker {

// The finished units of one semester, with their totals.
struct TermGroup {
    std::string term;
    Totals totals;
    ds::DynArray<std::size_t> result_indexes;   // positions in Tracker::results()
};

// Everything worked out across units. Used by the JSON report and by the terminal program.
struct Overview {
    ds::DynArray<TermGroup> terms;   // in the order the semesters first appear
    Totals finished;                 // every finished unit
    Totals current;                  // units in progress, at the mark they are heading for
    Totals projected;                // finished + current
    GoalPlan plan;
    bool has_goal_value = false;
    double current_value = 0;        // the current units, measured the way the goal is measured
};

Overview overview_of(const Tracker& tracker);

std::string engine_report(const Tracker& tracker, const LoadReport& load);

}  // namespace tracker
