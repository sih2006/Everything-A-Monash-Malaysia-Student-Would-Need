#include "tracker/model.hpp"

namespace tracker {

namespace {

bool blank(const std::string& text) {
    for (char c : text) {
        if (c != ' ') return false;
    }
    return true;
}

// Tabs and line breaks are used by the save format, so they are not allowed inside names.
bool has_break(const std::string& text) {
    for (char c : text) {
        if (c == '\t' || c == '\n' || c == '\r') return true;
    }
    return false;
}

Status check_text(const std::string& text, const char* what) {
    if (blank(text)) return std::string(what) + " cannot be empty.";
    if (has_break(text)) return std::string(what) + " cannot contain a tab or a line break.";
    return "";
}

const double TINY = 1e-9;   // room for rounding error when comparing decimals

}  // namespace

double Unit::total_weight() const {
    double total = 0;
    for (const Assessment& a : assessments) total += a.weight;
    return total;
}

Status Tracker::add_unit(const std::string& code, const std::string& name, double credit, const std::string& term) {
    Status bad = check_text(code, "The unit code");
    if (!bad.empty()) return bad;
    if (has_break(name) || has_break(term)) return "The name and semester cannot contain a tab or a line break.";
    if (!(credit > 0) || credit > 48) return "Credit points must be above 0 and at most 48. Most units are 6.";
    if (units_.contains(code)) return "There is already a unit with the code " + code + ".";
    Unit unit;
    unit.code = code;
    unit.name = name;
    unit.term = term;
    unit.credit = credit;
    units_.put(code, std::move(unit));
    return "";
}

Status Tracker::remove_unit(const std::string& code) {
    return units_.erase(code) ? "" : "There is no unit with the code " + code + ".";
}

Status Tracker::set_target(const std::string& code, double mark) {
    Unit* unit = units_.find(code);
    if (unit == nullptr) return "There is no unit with the code " + code + ".";
    if (!(mark > 0) || mark > 100) return "A target must be above 0 and at most 100.";
    unit->has_target = true;
    unit->target = mark;
    return "";
}

Status Tracker::clear_target(const std::string& code) {
    Unit* unit = units_.find(code);
    if (unit == nullptr) return "There is no unit with the code " + code + ".";
    unit->has_target = false;
    unit->target = 0;
    return "";
}

Status Tracker::add_assessment(const std::string& code, const std::string& id, const std::string& name, double weight) {
    Unit* unit = units_.find(code);
    if (unit == nullptr) return "There is no unit with the code " + code + ".";
    Status bad = check_text(id, "The assessment id");
    if (!bad.empty()) return bad;
    bad = check_text(name, "The assessment name");
    if (!bad.empty()) return bad;
    if (!(weight > 0) || weight > 100) return "A weight must be above 0 and at most 100.";
    if (unit->assessments.find([&](const Assessment& a) { return a.id == id; }) != nullptr) {
        return "This unit already has an assessment with the id " + id + ".";
    }
    if (unit->total_weight() + weight > 100 + TINY) {
        return "That would take the unit above 100%. The weights already add up to " +
               std::to_string(static_cast<int>(unit->total_weight() + 0.5)) + "%.";
    }
    Assessment a;
    a.id = id;
    a.name = name;
    a.weight = weight;
    unit->assessments.push_back(std::move(a));
    return "";
}

Status Tracker::remove_assessment(const std::string& code, const std::string& id) {
    Unit* unit = units_.find(code);
    if (unit == nullptr) return "There is no unit with the code " + code + ".";
    bool removed = unit->assessments.remove_first([&](const Assessment& a) { return a.id == id; });
    return removed ? "" : "This unit has no assessment with the id " + id + ".";
}

Status Tracker::set_mark(const std::string& code, const std::string& id, double score, double max) {
    Unit* unit = units_.find(code);
    if (unit == nullptr) return "There is no unit with the code " + code + ".";
    Assessment* a = unit->assessments.find([&](const Assessment& x) { return x.id == id; });
    if (a == nullptr) return "This unit has no assessment with the id " + id + ".";
    if (!(max > 0)) return "The marks available must be above 0.";
    if (!(score >= 0) || score > max + TINY) return "The mark must be between 0 and the marks available.";
    a->done = true;
    a->score = score;
    a->max = max;
    return "";
}

Status Tracker::clear_mark(const std::string& code, const std::string& id) {
    Unit* unit = units_.find(code);
    if (unit == nullptr) return "There is no unit with the code " + code + ".";
    Assessment* a = unit->assessments.find([&](const Assessment& x) { return x.id == id; });
    if (a == nullptr) return "This unit has no assessment with the id " + id + ".";
    a->done = false;
    a->score = 0;
    a->max = 100;
    return "";
}

Status Tracker::set_hurdle(const std::string& code, const std::string& id, double min_percent) {
    Unit* unit = units_.find(code);
    if (unit == nullptr) return "There is no unit with the code " + code + ".";
    Assessment* a = unit->assessments.find([&](const Assessment& x) { return x.id == id; });
    if (a == nullptr) return "This unit has no assessment with the id " + id + ".";
    if (min_percent == 0) {          // 0 means "no hurdle"
        a->has_hurdle = false;
        a->hurdle = 0;
        return "";
    }
    if (!(min_percent > 0) || min_percent > 100) return "A hurdle must be between 0 and 100 percent.";
    a->has_hurdle = true;
    a->hurdle = min_percent;
    return "";
}

Status Tracker::add_result(const std::string& code, const std::string& name, double credit, double mark,
                           const std::string& grade_text, const std::string& term) {
    Status bad = check_text(code, "The unit code");
    if (!bad.empty()) return bad;
    if (has_break(name) || has_break(term)) return "The name and semester cannot contain a tab or a line break.";
    if (!(credit > 0) || credit > 48) return "Credit points must be above 0 and at most 48. Most units are 6.";
    if (!(mark >= 0) || mark > 100) return "A final mark must be between 0 and 100.";
    Result r;
    r.code = code;
    r.name = name;
    r.term = term;
    r.credit = credit;
    r.mark = mark;
    if (!grade_text.empty() && grade_text != "-") {
        if (!parse_grade(grade_text, r.grade)) return "The grade must be one of HD, D, C, P, NP, N, NH or WN.";
        r.has_grade = true;
    }
    results_.push_back(std::move(r));
    return "";
}

Status Tracker::remove_result(std::size_t index) {
    return results_.remove_at(index) ? "" : "There is no finished unit at that position.";
}

Status Tracker::set_goal(const std::string& measure, double value, double total_credits) {
    bool points = (measure == "cgpa" || measure == "gpa");
    if (!points && measure != "wam") return "A goal must be for cgpa, gpa or wam.";
    if (points && (!(value > 0) || value > 4)) return "A GPA or CGPA goal must be above 0 and at most 4.";
    if (!points && (!(value > 0) || value > 100)) return "A WAM goal must be above 0 and at most 100.";
    if (!(total_credits > 0) || total_credits > 1000) return "The credit points in your course must be above 0.";
    goal.set = true;
    goal.measure = measure;
    goal.value = value;
    goal.total_credits = total_credits;
    return "";
}

ds::LinkedList<std::string> Tracker::sorted_codes() const {
    ds::LinkedList<std::string> codes;
    units_.for_each([&](const std::string& code, const Unit&) { codes.push_back(code); });
    codes.sort([](const std::string& a, const std::string& b) { return a < b; });
    return codes;
}

}  // namespace tracker
