// The things the tracker stores, and the rules that keep them valid.
//
// Every change goes through a Tracker method that checks it first. A method
// returns an empty text when the change was made, or a message that says what
// was wrong. Because of that, an invalid unit or mark can never be stored.
//
// Which structure holds what, and why:
//   units by code      HashMap     the most common action is "find the unit with this code": O(1) on average
//   assessments        LinkedList  kept in the order they were added; adding is O(1); a unit has only a few
//   finished results   DynArray    only ever added to and read from start to end: the fastest thing to walk
#pragma once

#include <string>

#include "ds/dyn_array.hpp"
#include "ds/hash_map.hpp"
#include "ds/linked_list.hpp"
#include "tracker/grades.hpp"

namespace tracker {

struct Assessment {
    std::string id;       // unique inside its unit
    std::string name;
    double weight = 0;    // percent of the unit, above 0
    bool done = false;
    double score = 0;     // marks received
    double max = 100;     // marks available
    bool has_hurdle = false;
    double hurdle = 0;    // lowest percent on this assessment that still passes the unit

    double percent() const { return max > 0 ? score / max * 100.0 : 0; }
};

struct Unit {
    std::string code;
    std::string name;
    std::string term;
    double credit = 6;
    bool has_target = false;
    double target = 0;    // the unit mark the student is aiming for, 0 to 100
    bool pass_fail = false;   // graded pass or fail only: never counted in GPA, CGPA or WAM
    ds::LinkedList<Assessment> assessments;

    double total_weight() const;
};

// A finished unit: only the final result is kept.
struct Result {
    std::string code;
    std::string name;
    std::string term;
    double credit = 6;
    double mark = 0;
    bool has_grade = false;   // true when the grade was typed in (needed for NP, NH and WN)
    Grade grade = N;

    Grade final_grade() const { return has_grade ? grade : grade_for_mark(mark); }
};

struct Goal {
    bool set = false;
    std::string measure;       // "cgpa", "gpa" or "wam"
    double value = 0;
    double total_credits = 0;  // credit points in the whole course
};

using Status = std::string;    // empty = it worked

class Tracker {
public:
    double margin = 10;        // "realistic" allows this many points above the average so far
    std::string current_term;
    Goal goal;

    Status add_unit(const std::string& code, const std::string& name, double credit, const std::string& term);
    Status remove_unit(const std::string& code);
    Status set_target(const std::string& code, double mark);
    Status set_pass_fail(const std::string& code, bool pass_fail);
    Status clear_target(const std::string& code);

    Status add_assessment(const std::string& code, const std::string& id, const std::string& name, double weight);
    Status remove_assessment(const std::string& code, const std::string& id);
    Status set_mark(const std::string& code, const std::string& id, double score, double max);
    Status clear_mark(const std::string& code, const std::string& id);
    Status set_hurdle(const std::string& code, const std::string& id, double min_percent);

    Status add_result(const std::string& code, const std::string& name, double credit, double mark,
                      const std::string& grade_text, const std::string& term);
    Status remove_result(std::size_t index);

    Status set_goal(const std::string& measure, double value, double total_credits);

    Unit* find_unit(const std::string& code) { return units_.find(code); }
    const Unit* find_unit(const std::string& code) const { return units_.find(code); }
    std::size_t unit_count() const { return units_.size(); }

    // Unit codes in alphabetical order. O(n log n): collected into a list, then merge sorted.
    ds::LinkedList<std::string> sorted_codes() const;

    const ds::DynArray<Result>& results() const { return results_; }

private:
    ds::HashMap<Unit> units_;
    ds::DynArray<Result> results_;
};

}  // namespace tracker
