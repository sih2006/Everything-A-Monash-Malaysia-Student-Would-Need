// The terminal program: a menu on top of the tracker.
//
// It never crashes on bad input: every answer is checked, and a wrong answer
// gets a message and another try. Every change is saved straight away.
#include "cli.hpp"

#include <cstdio>
#include <iostream>

#include "tracker/calc.hpp"
#include "tracker/codec.hpp"
#include "tracker/report.hpp"

using namespace tracker;

namespace {

struct Session {
    Tracker tracker;
    std::string path;
    bool input_ended = false;   // true once there is nothing more to read
};

std::string trimmed(const std::string& text) {
    std::size_t start = 0, end = text.size();
    while (start < end && (text[start] == ' ' || text[start] == '\t' || text[start] == '\r')) ++start;
    while (end > start && (text[end - 1] == ' ' || text[end - 1] == '\t' || text[end - 1] == '\r')) --end;
    return text.substr(start, end - start);
}

std::string upper(std::string text) {
    for (char& c : text) {
        if (c >= 'a' && c <= 'z') c = static_cast<char>(c - 'a' + 'A');
    }
    return text;
}

// Shows the prompt and reads one line. Returns false when the input has ended.
bool ask(Session& s, const std::string& prompt, std::string& out) {
    std::printf("%s", prompt.c_str());
    std::fflush(stdout);
    std::string line;
    if (!std::getline(std::cin, line)) {
        s.input_ended = true;
        std::printf("\n");
        return false;
    }
    out = trimmed(line);
    return true;
}

// Keeps asking until the answer is a number from `low` to `high`.
// An empty answer gives `fallback` if there is one, or cancels (returns false).
bool ask_number(Session& s, const std::string& prompt, double low, double high, double& out,
                bool has_fallback = false, double fallback = 0) {
    for (;;) {
        std::string answer;
        if (!ask(s, prompt, answer)) return false;
        if (answer.empty()) {
            if (!has_fallback) {
                std::printf("  Cancelled.\n");
                return false;
            }
            out = fallback;
            return true;
        }
        double value = 0;
        if (parse_number(answer, value) && value >= low && value <= high) {
            out = value;
            return true;
        }
        std::printf("  Please type a number from %g to %g, or press Enter to cancel.\n", low, high);
    }
}

void save(Session& s) {
    std::string error;
    if (!write_file_safely(s.path, save_text(s.tracker), error)) std::printf("  NOT SAVED: %s\n", error.c_str());
}

// Prints the result of a change and saves if it worked.
bool finish(Session& s, const Status& status, const char* done) {
    if (!status.empty()) {
        std::printf("  Not done: %s\n", status.c_str());
        return false;
    }
    save(s);
    std::printf("  %s\n", done);
    return true;
}

Standing standing_of(const Session& s, const Unit& unit) {
    return standing_for(unit, s.tracker.margin, fallback_basis(s.tracker));
}

// Lets the user pick a unit by its number in the list or by its code.
bool pick_unit(Session& s, std::string& code) {
    ds::LinkedList<std::string> codes = s.tracker.sorted_codes();
    if (codes.empty()) {
        std::printf("  There are no units yet. Add one first (option 2).\n");
        return false;
    }
    int number = 0;
    for (const std::string& c : codes) std::printf("  %d) %s  %s\n", ++number, c.c_str(), s.tracker.find_unit(c)->name.c_str());
    for (;;) {
        std::string answer;
        if (!ask(s, "Unit (number or code, Enter to cancel): ", answer)) return false;
        if (answer.empty()) {
            std::printf("  Cancelled.\n");
            return false;
        }
        double position = 0;
        if (parse_number(answer, position) && position >= 1 && position <= number && position == static_cast<int>(position)) {
            int at = 0;
            for (const std::string& c : codes) {
                if (++at == static_cast<int>(position)) code = c;
            }
            return true;
        }
        if (s.tracker.find_unit(upper(answer)) != nullptr) {
            code = upper(answer);
            return true;
        }
        std::printf("  There is no unit \"%s\". Type a number from the list or a unit code.\n", answer.c_str());
    }
}

void print_assessments(const Unit& unit) {
    int number = 0;
    for (const Assessment& a : unit.assessments) {
        std::printf("  %d) %-28s %5.1f%%   ", ++number, a.name.c_str(), a.weight);
        if (a.done) std::printf("done    %g/%g (%.1f%%)", a.score, a.max, a.percent());
        else std::printf("not done");
        if (a.has_hurdle) std::printf("   hurdle %g%%", a.hurdle);
        std::printf("\n");
    }
}

bool pick_assessment(Session& s, const Unit& unit, std::string& id) {
    if (unit.assessments.empty()) {
        std::printf("  This unit has no assessments yet. Add one first (option 3).\n");
        return false;
    }
    print_assessments(unit);
    double position = 0;
    if (!ask_number(s, "Assessment number (Enter to cancel): ", 1, static_cast<double>(unit.assessments.size()), position)) return false;
    int at = 0;
    for (const Assessment& a : unit.assessments) {
        if (++at == static_cast<int>(position)) id = a.id;
    }
    return true;
}

// A new id that this unit does not use yet: a1, a2, ...
std::string next_id(const Unit& unit) {
    for (int n = 1;; ++n) {
        std::string id = "a" + std::to_string(n);
        if (unit.assessments.find([&](const Assessment& a) { return a.id == id; }) == nullptr) return id;
    }
}

void print_standing(const Standing& st) {
    std::printf("  Earned so far:   %.1f of the %.0f%% marked", st.earned, st.done_weight);
    if (st.has_average) std::printf("  (average %.1f%%, heading for %s)", st.average, grade_name(st.projected_grade));
    std::printf("\n  Still to come:   %.0f%% of the unit\n", st.left_weight);
    if (st.has_target) {
        std::printf("  Target:          %g (%s)\n", st.target, grade_name(grade_for_mark(st.target)));
        if (st.has_need && !st.secured) std::printf("  Needed:          %.1f%% on what is left\n", st.need_max);
        std::printf("  Possible:        %s\n", st.secured ? "already secured" : st.possible ? "yes" : "no");
        std::printf("  Realistic:       %s\n", st.realistic ? "yes" : "no");
    }
    std::printf("  Verdict:         %s\n", st.verdict.c_str());
}

// ---------- menu actions ----------

void list_units(Session& s) {
    ds::LinkedList<std::string> codes = s.tracker.sorted_codes();
    if (codes.empty()) {
        std::printf("  There are no units yet.\n");
        return;
    }
    for (const std::string& code : codes) {
        const Unit& u = *s.tracker.find_unit(code);
        Standing st = standing_of(s, u);
        std::printf("  %-9s %-34s %g points   %d of %d assessments done\n", u.code.c_str(), u.name.c_str(), u.credit,
                    st.done_count, st.total_count);
        std::printf("            %s\n", st.verdict.c_str());
    }
}

void add_unit(Session& s) {
    std::string code, name, term;
    double credit = 6;
    if (!ask(s, "Unit code (for example FIT2004): ", code) || code.empty()) return;
    if (!ask(s, "Unit name: ", name)) return;
    if (!ask_number(s, "Credit points [6]: ", 0.5, 48, credit, true, 6)) return;
    std::string shown = s.tracker.current_term.empty() ? "" : " [" + s.tracker.current_term + "]";
    if (!ask(s, "Semester" + shown + ": ", term)) return;
    if (term.empty()) term = s.tracker.current_term;
    else s.tracker.current_term = term;
    finish(s, s.tracker.add_unit(upper(code), name, credit, term), "Unit added.");
}

void add_assessment(Session& s) {
    std::string code, name;
    double weight = 0;
    if (!pick_unit(s, code)) return;
    const Unit& unit = *s.tracker.find_unit(code);
    std::printf("  Weights so far add up to %g%%.\n", unit.total_weight());
    if (!ask(s, "Assessment name (for example Final exam): ", name) || name.empty()) return;
    if (!ask_number(s, "Weight in percent: ", 0.01, 100, weight)) return;
    finish(s, s.tracker.add_assessment(code, next_id(unit), name, weight), "Assessment added.");
}

void record_mark(Session& s) {
    std::string code, id;
    double score = 0, max = 100;
    if (!pick_unit(s, code)) return;
    if (!pick_assessment(s, *s.tracker.find_unit(code), id)) return;
    if (!ask_number(s, "Marks available [100]: ", 0.01, 100000, max, true, 100)) return;
    if (!ask_number(s, "Your mark: ", 0, max, score)) return;
    if (finish(s, s.tracker.set_mark(code, id, score, max), "Mark recorded.")) {
        print_standing(standing_of(s, *s.tracker.find_unit(code)));
    }
}

void set_target(Session& s) {
    std::string code;
    double mark = 0;
    if (!pick_unit(s, code)) return;
    std::printf("  Grades start at: P 50, C 60, D 70, HD 80.\n");
    if (!ask_number(s, "Target mark for the unit (0 removes the target): ", 0, 100, mark)) return;
    if (mark == 0) finish(s, s.tracker.clear_target(code), "Target removed.");
    else if (finish(s, s.tracker.set_target(code, mark), "Target set.")) print_standing(standing_of(s, *s.tracker.find_unit(code)));
}

void set_hurdle(Session& s) {
    std::string code, id;
    double percent = 0;
    if (!pick_unit(s, code)) return;
    if (!pick_assessment(s, *s.tracker.find_unit(code), id)) return;
    if (!ask_number(s, "Lowest percent that still passes (0 removes the hurdle): ", 0, 100, percent)) return;
    finish(s, s.tracker.set_hurdle(code, id, percent), percent == 0 ? "Hurdle removed." : "Hurdle set.");
}

void unit_report(Session& s) {
    std::string code;
    if (!pick_unit(s, code)) return;
    const Unit& u = *s.tracker.find_unit(code);
    std::printf("\n  %s  %s  (%g points, %s)\n", u.code.c_str(), u.name.c_str(), u.credit, u.term.empty() ? "no semester" : u.term.c_str());
    if (u.assessments.empty()) std::printf("  No assessments yet.\n");
    else print_assessments(u);
    if (u.total_weight() < 100) std::printf("  Note: the weights add up to %g%%, so %g%% is not entered yet.\n", u.total_weight(), 100 - u.total_weight());
    print_standing(standing_of(s, u));
}

void ask_what_if(Session& s) {
    std::string code;
    double score = 0;
    if (!pick_unit(s, code)) return;
    if (!ask_number(s, "What if you score this percent on everything that is left? ", 0, 100, score)) return;
    WhatIf w = what_if(*s.tracker.find_unit(code), score);
    std::printf("  Final mark %.1f, grade %s.\n", w.final_mark, grade_name(w.grade));
    if (w.hurdle_fail) std::printf("  That is below a hurdle, so the unit would be a hurdle fail.\n");
    else if (w.has_target) std::printf("  %s\n", w.reaches_target ? "Your target is reached." : "That is below your target.");
}

void attention(Session& s) {
    ds::LinkedList<std::string> codes = s.tracker.sorted_codes();
    int shown = 0;
    for (const std::string& code : codes) {
        Standing st = standing_of(s, *s.tracker.find_unit(code));
        if (st.hurdle_failed || (st.has_target && !st.on_course)) {
            std::printf("  %-9s %s\n", code.c_str(), st.verdict.c_str());
            ++shown;
        }
    }
    if (shown == 0) std::printf("  Nothing needs attention. Every unit with a target is on course.\n");
}

void add_result(Session& s) {
    std::string code, name, grade, term;
    double credit = 6, mark = 0;
    if (!ask(s, "Unit code: ", code) || code.empty()) return;
    if (!ask(s, "Unit name: ", name)) return;
    if (!ask_number(s, "Credit points [6]: ", 0.5, 48, credit, true, 6)) return;
    if (!ask_number(s, "Final mark: ", 0, 100, mark)) return;
    if (!ask(s, "Grade, only if it is NP, NH or WN (Enter to work it out from the mark): ", grade)) return;
    if (!ask(s, "Semester (for example S1 2026): ", term)) return;
    finish(s, s.tracker.add_result(upper(code), name, credit, mark, upper(grade), term), "Finished unit added.");
}

void remove_result(Session& s) {
    const ds::DynArray<Result>& results = s.tracker.results();
    if (results.empty()) {
        std::printf("  There are no finished units.\n");
        return;
    }
    for (std::size_t i = 0; i < results.size(); ++i) {
        std::printf("  %d) %-9s %-30s %g %s  %s\n", static_cast<int>(i + 1), results[i].code.c_str(), results[i].name.c_str(),
                    results[i].mark, grade_name(results[i].final_grade()), results[i].term.c_str());
    }
    double position = 0;
    if (!ask_number(s, "Number to remove (Enter to cancel): ", 1, static_cast<double>(results.size()), position)) return;
    finish(s, s.tracker.remove_result(static_cast<std::size_t>(position) - 1), "Finished unit removed.");
}

void overall(Session& s) {
    Overview o = overview_of(s.tracker);
    if (o.finished.units == 0 && o.current.units == 0) {
        std::printf("  No results yet. Add finished units (option 10) or record marks (option 4).\n");
        return;
    }
    std::printf("  GPA uses the standard Monash scale. CGPA uses the Malaysia scale. They are different numbers.\n\n");
    std::printf("  %-22s %6s %7s %7s %8s\n", "", "units", "GPA", "CGPA", "WAM");
    for (const TermGroup& g : o.terms) {
        std::printf("  %-22s %6d %7.3f %7.3f %8.3f\n", g.term.empty() ? "(no semester)" : g.term.c_str(), g.totals.units,
                    g.totals.gpa(), g.totals.cgpa(), g.totals.wam());
    }
    if (o.finished.units > 0) {
        std::printf("  %-22s %6d %7.3f %7.3f %8.3f\n", "All finished units", o.finished.units, o.finished.gpa(), o.finished.cgpa(), o.finished.wam());
    }
    if (o.current.units > 0) {
        std::printf("  %-22s %6d %7.3f %7.3f %8.3f\n", "This semester, heading", o.current.units, o.current.gpa(), o.current.cgpa(), o.current.wam());
        std::printf("  %-22s %6d %7.3f %7.3f %8.3f\n", "If that happens", o.projected.units, o.projected.gpa(), o.projected.cgpa(), o.projected.wam());
    }
    if (!s.tracker.goal.set) {
        std::printf("\n  No final goal set (option 12).\n");
        return;
    }
    const Goal& goal = s.tracker.goal;
    std::printf("\n  Final goal: %s %g over %g credit points.\n", upper(goal.measure).c_str(), goal.value, goal.total_credits);
    if (!o.plan.has_need) std::printf("  There are no credit points left to plan for.\n");
    else if (!o.plan.reachable) std::printf("  The goal is out of reach: it would need an average of %.2f on the %g points left.\n", o.plan.need, o.plan.credits_left);
    else {
        std::printf("  You need an average of %.2f across the %g credit points left.\n", o.plan.need, o.plan.credits_left);
        if (o.plan.has_default) std::printf("  Default target for each unit: %s (%g or more).\n", grade_name(o.plan.default_grade), o.plan.default_mark);
        if (o.has_goal_value) std::printf("  This semester you are heading for %.2f, which is %s what you need.\n", o.current_value,
                                          o.current_value >= o.plan.need ? "at or above" : "below");
    }
}

void set_goal(Session& s) {
    std::string measure;
    double value = 0, credits = 0;
    if (!ask(s, "Goal measure (cgpa, gpa or wam): ", measure) || measure.empty()) return;
    bool wam = measure == "wam" || measure == "WAM";
    if (!ask_number(s, wam ? "WAM you want at graduation: " : "Value you want at graduation (up to 4): ", 0.01, wam ? 100 : 4, value)) return;
    if (!ask_number(s, "Credit points in your whole course (for example 144): ", 1, 1000, credits)) return;
    std::string lower = measure;
    for (char& c : lower) {
        if (c >= 'A' && c <= 'Z') c = static_cast<char>(c - 'A' + 'a');
    }
    finish(s, s.tracker.set_goal(lower, value, credits), "Goal set.");
}

// The path from finished semesters, through today's tasks, to the final goal.
void show_path(Session& s) {
    Overview o = overview_of(s.tracker);
    std::printf("  Path to your goal\n");
    for (const TermGroup& g : o.terms) {
        std::printf("  [done] %-12s %d units   GPA %.2f   CGPA %.2f\n", g.term.c_str(), g.totals.units, g.totals.gpa(), g.totals.cgpa());
    }
    ds::LinkedList<std::string> codes = s.tracker.sorted_codes();
    if (!codes.empty()) std::printf("  [now ] %s\n", s.tracker.current_term.empty() ? "This semester" : s.tracker.current_term.c_str());
    for (const std::string& code : codes) {
        const Unit& u = *s.tracker.find_unit(code);
        Standing st = standing_of(s, u);
        std::printf("         %s  %s\n", u.code.c_str(), st.verdict.c_str());
        for (const Assessment& a : u.assessments) {
            if (a.done) std::printf("            done   %s: %.1f%%\n", a.name.c_str(), a.percent());
            else if (st.has_target && st.has_need && st.possible) {
                std::printf("            to do  %s: need %.1f%%\n", a.name.c_str(), a.has_hurdle && a.hurdle > st.need ? a.hurdle : st.need);
            } else std::printf("            to do  %s\n", a.name.c_str());
        }
    }
    if (s.tracker.goal.set) {
        if (o.plan.has_need && o.plan.reachable) {
            std::printf("  [next] %g credit points still to come: average %.2f needed", o.plan.credits_left, o.plan.need);
            if (o.plan.has_default) std::printf(" (%s or better in each unit)", grade_name(o.plan.default_grade));
            std::printf("\n");
        }
        std::printf("  [goal] %s %g\n", upper(s.tracker.goal.measure).c_str(), s.tracker.goal.value);
        std::printf("  One 6-point unit is %.1f%% of your course.\n", 600.0 / s.tracker.goal.total_credits);
    } else {
        std::printf("  [goal] not set yet (option 12)\n");
    }
}

void remove_unit(Session& s) {
    std::string code, answer;
    if (!pick_unit(s, code)) return;
    if (!ask(s, "Remove " + code + " and all its assessments? Type yes to confirm: ", answer)) return;
    if (answer != "yes") {
        std::printf("  Nothing was removed.\n");
        return;
    }
    finish(s, s.tracker.remove_unit(code), "Unit removed.");
}

void remove_assessment(Session& s) {
    std::string code, id;
    if (!pick_unit(s, code)) return;
    if (!pick_assessment(s, *s.tracker.find_unit(code), id)) return;
    finish(s, s.tracker.remove_assessment(code, id), "Assessment removed.");
}

void find_units(Session& s) {
    std::string wanted;
    if (!ask(s, "Part of a unit code or name: ", wanted) || wanted.empty()) return;
    std::string needle = upper(wanted);
    ds::LinkedList<std::string> codes = s.tracker.sorted_codes();
    int shown = 0;
    for (const std::string& code : codes) {
        const Unit& u = *s.tracker.find_unit(code);
        if (upper(u.code).find(needle) != std::string::npos || upper(u.name).find(needle) != std::string::npos) {
            std::printf("  %-9s %s\n", u.code.c_str(), u.name.c_str());
            ++shown;
        }
    }
    if (shown == 0) std::printf("  No unit matches \"%s\".\n", wanted.c_str());
}

void print_menu() {
    std::printf(
        "\n"
        "  Units                       Results                      Overall\n"
        "   1 List units                7 Unit report               11 GPA, CGPA and WAM\n"
        "   2 Add a unit                8 What if                   12 Set final goal\n"
        "   3 Add an assessment         9 Needs attention           13 Path to your goal\n"
        "   4 Record a mark            10 Add a finished unit       14 Find a unit\n"
        "   5 Set a target\n"
        "   6 Set a hurdle             Remove: 15 unit   16 assessment   17 finished unit\n"
        "   0 Quit\n");
}

}  // namespace

int run_cli(const std::string& path) {
    Session s;
    s.path = path;

    std::string text;
    if (read_file(path, text)) {
        LoadReport report = load_text(text, s.tracker);
        if (!report.errors.empty()) {
            std::printf("Some lines in %s could not be read and were skipped:\n", path.c_str());
            for (const std::string& e : report.errors) std::printf("  %s\n", e.c_str());
            std::printf("Your file has not been changed. The next save keeps it as %s.bak.\n", path.c_str());
        }
        std::printf("Loaded %d unit(s) and %d finished unit(s) from %s.\n", static_cast<int>(s.tracker.unit_count()),
                    static_cast<int>(s.tracker.results().size()), path.c_str());
    } else {
        std::printf("No saved file at %s yet. Starting fresh.\n", path.c_str());
    }

    while (!s.input_ended) {
        print_menu();
        std::string choice;
        if (!ask(s, "Choose: ", choice)) break;
        double number = -1;
        if (!parse_number(choice, number)) number = -1;
        switch (static_cast<int>(number)) {
            case 0: std::printf("Goodbye.\n"); return 0;
            case 1: list_units(s); break;
            case 2: add_unit(s); break;
            case 3: add_assessment(s); break;
            case 4: record_mark(s); break;
            case 5: set_target(s); break;
            case 6: set_hurdle(s); break;
            case 7: unit_report(s); break;
            case 8: ask_what_if(s); break;
            case 9: attention(s); break;
            case 10: add_result(s); break;
            case 11: overall(s); break;
            case 12: set_goal(s); break;
            case 13: show_path(s); break;
            case 14: find_units(s); break;
            case 15: remove_unit(s); break;
            case 16: remove_assessment(s); break;
            case 17: remove_result(s); break;
            default: std::printf("  \"%s\" is not on the menu. Type a number from 0 to 17.\n", choice.c_str());
        }
    }
    std::printf("Input ended. Everything was already saved.\n");
    return 0;
}
