#include "tracker/report.hpp"

#include <cmath>
#include <cstdio>

namespace tracker {

namespace {

// Writes JSON text piece by piece and puts the commas in the right places.
class JsonWriter {
public:
    void begin_object(const char* key = nullptr) { open(key, '{'); }
    void end_object() { close('}'); }
    void begin_array(const char* key = nullptr) { open(key, '['); }
    void end_array() { close(']'); }

    void text(const char* key, const std::string& value) {
        item(key);
        quote(value);
    }
    void number(const char* key, double value) {
        item(key);
        if (std::isnan(value) || std::isinf(value)) {
            out_ += "null";
            return;
        }
        char buffer[40];
        std::snprintf(buffer, sizeof(buffer), "%.10g", value);
        out_ += buffer;
    }
    // A number that may be missing: written as null when `has` is false.
    void maybe(const char* key, bool has, double value) {
        if (has) number(key, value);
        else null(key);
    }
    void boolean(const char* key, bool value) {
        item(key);
        out_ += value ? "true" : "false";
    }
    void null(const char* key) {
        item(key);
        out_ += "null";
    }

    const std::string& str() const { return out_; }

private:
    void open(const char* key, char bracket) {
        item(key);
        out_ += bracket;
        first_.push_back(true);
    }
    void close(char bracket) {
        first_.remove_at(first_.size() - 1);
        out_ += bracket;
    }
    // Starts a new item: a comma if it is not the first, then the key if there is one.
    void item(const char* key) {
        if (!first_.empty()) {
            bool& first = first_[first_.size() - 1];
            if (!first) out_ += ',';
            first = false;
        }
        if (key != nullptr) {
            quote(key);
            out_ += ':';
        }
    }
    void quote(const std::string& value) {
        out_ += '"';
        for (unsigned char c : value) {
            if (c == '"') out_ += "\\\"";
            else if (c == '\\') out_ += "\\\\";
            else if (c == '\n') out_ += "\\n";
            else if (c == '\r') out_ += "\\r";
            else if (c == '\t') out_ += "\\t";
            else if (c < 0x20) {
                char buffer[8];
                std::snprintf(buffer, sizeof(buffer), "\\u%04x", c);
                out_ += buffer;
            } else out_ += static_cast<char>(c);
        }
        out_ += '"';
    }

    std::string out_;
    ds::DynArray<bool> first_;   // one flag per open bracket: is the next item the first one?
};

void write_totals(JsonWriter& json, const char* key, const Totals& totals) {
    json.begin_object(key);
    json.number("units", totals.units);
    json.number("credits", totals.credits);
    json.number("gpa", totals.gpa());
    json.number("cgpa", totals.cgpa());
    json.number("wam", totals.wam());
    json.end_object();
}

void write_scale(JsonWriter& json, const Scheme& scheme) {
    json.begin_object(scheme.id);
    for (int g = 0; g < GRADE_COUNT; ++g) json.number(grade_name(static_cast<Grade>(g)), scheme.points[g]);
    json.end_object();
}

}  // namespace

Overview overview_of(const Tracker& t) {
    Overview o;

    // Group the finished units by semester. A hash map finds a semester's group in O(1) on average.
    ds::HashMap<std::size_t> group_of;
    const ds::DynArray<Result>& results = t.results();
    for (std::size_t i = 0; i < results.size(); ++i) {
        const Result& r = results[i];
        std::size_t* at = group_of.find(r.term);
        if (at == nullptr) {
            TermGroup group;
            group.term = r.term;
            o.terms.push_back(std::move(group));
            group_of.put(r.term, o.terms.size() - 1);
            at = group_of.find(r.term);
        }
        o.terms[*at].totals.add(r.code, r.credit, r.mark, r.final_grade());
        o.terms[*at].result_indexes.push_back(i);
        o.finished.add(r.code, r.credit, r.mark, r.final_grade());
    }

    // Units in progress count at the mark they are heading for, when they have any marks.
    o.projected = o.finished;
    Basis fallback = fallback_basis(t);
    ds::LinkedList<std::string> codes = t.sorted_codes();
    for (const std::string& code : codes) {
        const Unit& u = *t.find_unit(code);
        Standing s = standing_for(u, t.margin, fallback);
        if (!s.has_projected) continue;
        o.current.add(u.code, u.credit, s.projected, s.projected_grade);
        o.projected.add(u.code, u.credit, s.projected, s.projected_grade);
    }

    o.plan = plan_goal(t.goal, o.finished);
    if (t.goal.set && o.current.units > 0) {
        o.has_goal_value = true;
        o.current_value = t.goal.measure == "wam" ? o.current.wam()
                        : t.goal.measure == "gpa" ? o.current.gpa()
                        : o.current.cgpa();
    }
    return o;
}

std::string engine_report(const Tracker& t, const LoadReport& load) {
    JsonWriter json;
    Overview o = overview_of(t);
    Basis fallback = fallback_basis(t);
    ds::LinkedList<std::string> codes = t.sorted_codes();

    json.begin_object();
    json.boolean("ok", load.errors.empty());
    json.begin_array("errors");
    for (const std::string& e : load.errors) json.text(nullptr, e);
    json.end_array();
    json.number("margin", t.margin);
    json.text("currentTerm", t.current_term);

    // ----- units in progress -----
    json.begin_array("units");
    for (const std::string& code : codes) {
        const Unit& u = *t.find_unit(code);
        Standing s = standing_for(u, t.margin, fallback);
        json.begin_object();
        json.text("code", u.code);
        json.text("name", u.name);
        json.text("term", u.term);
        json.number("credit", u.credit);
        json.number("totalWeight", u.total_weight());
        if (u.has_target) {
            json.begin_object("target");
            json.number("mark", u.target);
            json.text("grade", grade_name(grade_for_mark(u.target)));
            json.end_object();
        } else {
            json.null("target");
        }

        json.begin_array("assessments");
        for (const Assessment& a : u.assessments) {
            json.begin_object();
            json.text("id", a.id);
            json.text("name", a.name);
            json.number("weight", a.weight);
            json.boolean("done", a.done);
            json.maybe("score", a.done, a.score);
            json.number("max", a.max);
            json.maybe("percent", a.done, a.percent());
            json.maybe("hurdle", a.has_hurdle, a.hurdle);
            json.boolean("hurdleFailed", a.done && a.has_hurdle && a.percent() < a.hurdle - 1e-9);
            // What this assessment needs for the target: the average need, or its own hurdle if that is higher.
            bool needs = !a.done && s.has_target && s.has_need && s.possible;
            json.maybe("needAtLeast", needs, a.has_hurdle && a.hurdle > s.need ? a.hurdle : s.need);
            json.end_object();
        }
        json.end_array();

        json.begin_object("standing");
        json.number("doneCount", s.done_count);
        json.number("totalCount", s.total_count);
        json.number("doneWeight", s.done_weight);
        json.number("earned", s.earned);
        json.number("leftWeight", s.left_weight);
        json.maybe("average", s.has_average, s.average);
        json.boolean("hurdleFailed", s.hurdle_failed);
        json.text("bestGrade", grade_name(s.best_grade));
        json.maybe("projected", s.has_projected, s.projected);
        if (s.has_projected) json.text("projectedGrade", grade_name(s.projected_grade));
        else json.null("projectedGrade");
        json.boolean("hasTarget", s.has_target);
        json.boolean("secured", s.secured);
        json.boolean("possible", s.possible);
        json.boolean("realistic", s.realistic);
        json.boolean("onCourse", s.on_course);
        json.maybe("need", s.has_need, s.need);
        json.maybe("needMax", s.has_need, s.need_max);
        json.maybe("basis", s.has_basis, s.basis);
        if (s.has_target) json.text("bestRealisticGrade", grade_name(s.best_realistic));
        else json.null("bestRealisticGrade");
        json.text("verdict", s.verdict);
        json.end_object();
        json.end_object();
    }
    json.end_array();

    // ----- the units that need attention -----
    json.begin_array("attention");
    for (const std::string& code : codes) {
        const Unit& u = *t.find_unit(code);
        Standing s = standing_for(u, t.margin, fallback);
        if (s.hurdle_failed || (s.has_target && !s.on_course)) {
            json.begin_object();
            json.text("code", u.code);
            json.text("reason", s.verdict);
            json.end_object();
        }
    }
    json.end_array();

    // ----- finished semesters -----
    const ds::DynArray<Result>& results = t.results();
    json.begin_array("terms");
    for (const TermGroup& group : o.terms) {
        json.begin_object();
        json.text("term", group.term);
        json.number("credits", group.totals.credits);
        json.number("gpa", group.totals.gpa());
        json.number("cgpa", group.totals.cgpa());
        json.number("wam", group.totals.wam());
        json.begin_array("units");
        for (std::size_t index : group.result_indexes) {
            const Result& r = results[index];
            json.begin_object();
            json.number("index", static_cast<double>(index));
            json.text("code", r.code);
            json.text("name", r.name);
            json.number("credit", r.credit);
            json.number("mark", r.mark);
            json.text("grade", grade_name(r.final_grade()));
            json.end_object();
        }
        json.end_array();
        json.end_object();
    }
    json.end_array();

    write_totals(json, "finished", o.finished);
    if (o.current.units > 0) {
        write_totals(json, "current", o.current);
        write_totals(json, "projected", o.projected);
    } else {
        json.null("current");
        json.null("projected");
    }

    // ----- the final goal -----
    if (t.goal.set) {
        json.begin_object("goal");
        json.text("measure", t.goal.measure);
        json.number("value", t.goal.value);
        json.number("totalCredits", t.goal.total_credits);
        json.number("creditsDone", o.plan.credits_done);
        json.number("creditsLeft", o.plan.credits_left);
        json.maybe("need", o.plan.has_need, o.plan.need);
        json.boolean("reached", o.plan.reached);
        json.boolean("reachable", o.plan.reachable);
        if (o.plan.has_default) {
            json.begin_object("defaultTarget");
            json.text("grade", grade_name(o.plan.default_grade));
            json.number("mark", o.plan.default_mark);
            json.end_object();
        } else {
            json.null("defaultTarget");
        }
        json.maybe("currentValue", o.has_goal_value, o.current_value);
        json.maybe("gap", o.has_goal_value && o.plan.has_need, o.current_value - o.plan.need);
        json.end_object();
    } else {
        json.null("goal");
    }

    // ----- answers to the what-if questions -----
    json.begin_array("whatIf");
    for (const Question& q : load.questions) {
        const Unit* u = t.find_unit(q.code);
        if (u == nullptr) continue;
        WhatIf w = what_if(*u, q.score);
        json.begin_object();
        json.text("code", q.code);
        json.number("score", q.score);
        json.number("finalMark", w.final_mark);
        json.text("grade", grade_name(w.grade));
        json.boolean("hurdleFail", w.hurdle_fail);
        if (w.has_target) json.boolean("reachesTarget", w.reaches_target);
        else json.null("reachesTarget");
        json.end_object();
    }
    json.end_array();

    // ----- the scales, so screens can show them without copying the numbers -----
    json.begin_object("scales");
    write_scale(json, gpa_scheme());
    write_scale(json, cgpa_scheme());
    json.begin_object("bands");
    const Grade passing[] = {HD, D, C, P};
    for (Grade g : passing) json.number(grade_name(g), min_mark_for(g));
    json.end_object();
    json.end_object();

    json.end_object();
    return json.str();
}

}  // namespace tracker
