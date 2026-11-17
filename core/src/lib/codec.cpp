#include "tracker/codec.hpp"

#include <cmath>
#include <cstdio>
#include <cstdlib>
#include <fstream>
#include <sstream>

namespace tracker {

ds::DynArray<std::string> split_tabs(const std::string& line) {
    ds::DynArray<std::string> fields;
    std::string field;
    for (char c : line) {
        if (c == '\t') {
            fields.push_back(field);
            field.clear();
        } else {
            field += c;
        }
    }
    fields.push_back(field);
    return fields;
}

bool parse_number(const std::string& text, double& out) {
    if (text.empty()) return false;
    char* end = nullptr;
    double value = std::strtod(text.c_str(), &end);
    if (end == text.c_str() || *end != '\0') return false;   // nothing read, or something left over
    if (std::isnan(value) || std::isinf(value)) return false;
    out = value;
    return true;
}

namespace {

std::string number_text(double value) {
    char text[40];
    std::snprintf(text, sizeof(text), "%.10g", value);
    return text;
}

// Reads field `index` as a number, or reports why not.
bool number_at(const ds::DynArray<std::string>& fields, std::size_t index, double& out, std::string& problem) {
    if (!parse_number(fields[index], out)) {
        problem = "\"" + fields[index] + "\" is not a number";
        return false;
    }
    return true;
}

// Handles one line. Returns an empty text when the line was used, or what was wrong with it.
std::string apply_line(const ds::DynArray<std::string>& f, Tracker& t, LoadReport& report) {
    const std::string& kind = f[0];
    std::string problem;
    double a = 0, b = 0, c = 0;

    if (kind == "tracker") {
        if (f.size() != 2 || f[1] != "1") return "this file is from a version this program does not know";
        return "";
    }
    if (kind == "term") {
        if (f.size() != 2) return "a term line needs 1 field";
        t.current_term = f[1];
        return "";
    }
    if (kind == "margin") {
        if (f.size() != 2) return "a margin line needs 1 field";
        if (!number_at(f, 1, a, problem)) return problem;
        if (a < 0 || a > 100) return "the margin must be between 0 and 100";
        t.margin = a;
        return "";
    }
    if (kind == "goal") {
        if (f.size() != 4) return "a goal line needs 3 fields";
        if (!number_at(f, 2, a, problem) || !number_at(f, 3, b, problem)) return problem;
        return t.set_goal(f[1], a, b);
    }
    if (kind == "unit") {
        if (f.size() != 6) return "a unit line needs 5 fields";
        if (!number_at(f, 3, a, problem)) return problem;
        std::string bad = t.add_unit(f[1], f[2], a, f[5]);
        if (!bad.empty()) return bad;
        if (f[4] != "-") {
            if (!number_at(f, 4, b, problem)) return problem;
            return t.set_target(f[1], b);
        }
        return "";
    }
    if (kind == "assess") {
        if (f.size() != 8) return "an assess line needs 7 fields";
        if (!number_at(f, 4, a, problem)) return problem;
        std::string bad = t.add_assessment(f[1], f[2], f[3], a);
        if (!bad.empty()) return bad;
        if (f[5] != "-") {
            if (!number_at(f, 5, b, problem) || !number_at(f, 6, c, problem)) return problem;
            bad = t.set_mark(f[1], f[2], b, c);
            if (!bad.empty()) return bad;
        }
        if (f[7] != "-") {
            if (!number_at(f, 7, a, problem)) return problem;
            return t.set_hurdle(f[1], f[2], a);
        }
        return "";
    }
    if (kind == "result") {
        if (f.size() != 7) return "a result line needs 6 fields";
        if (!number_at(f, 3, a, problem) || !number_at(f, 4, b, problem)) return problem;
        return t.add_result(f[1], f[2], a, b, f[5], f[6]);
    }
    if (kind == "whatif") {
        if (f.size() != 3) return "a whatif line needs 2 fields";
        if (!number_at(f, 2, a, problem)) return problem;
        if (a < 0 || a > 100) return "a what-if score must be between 0 and 100";
        if (t.find_unit(f[1]) == nullptr) return "there is no unit with the code " + f[1];
        Question q;
        q.code = f[1];
        q.score = a;
        report.questions.push_back(q);
        return "";
    }
    return "\"" + kind + "\" is not a known kind of line";
}

}  // namespace

LoadReport load_text(const std::string& text, Tracker& into) {
    LoadReport report;
    std::string line;
    int number = 0;
    std::size_t start = 0;
    while (start <= text.size()) {
        std::size_t end = text.find('\n', start);
        if (end == std::string::npos) end = text.size();
        line.assign(text, start, end - start);
        start = end + 1;
        ++number;
        if (!line.empty() && line.back() == '\r') line.pop_back();   // files saved on Windows
        if (line.empty() || line[0] == '#') continue;
        std::string problem = apply_line(split_tabs(line), into, report);
        if (!problem.empty()) report.errors.push_back("line " + std::to_string(number) + ": " + problem);
    }
    return report;
}

std::string save_text(const Tracker& t) {
    std::string out = "tracker\t1\n";
    if (!t.current_term.empty()) out += "term\t" + t.current_term + "\n";
    out += "margin\t" + number_text(t.margin) + "\n";
    if (t.goal.set) {
        out += "goal\t" + t.goal.measure + "\t" + number_text(t.goal.value) + "\t" + number_text(t.goal.total_credits) + "\n";
    }
    ds::LinkedList<std::string> codes = t.sorted_codes();
    for (const std::string& code : codes) {
        const Unit& u = *t.find_unit(code);
        out += "unit\t" + u.code + "\t" + u.name + "\t" + number_text(u.credit) + "\t" +
               (u.has_target ? number_text(u.target) : std::string("-")) + "\t" + u.term + "\n";
        for (const Assessment& a : u.assessments) {
            out += "assess\t" + u.code + "\t" + a.id + "\t" + a.name + "\t" + number_text(a.weight) + "\t" +
                   (a.done ? number_text(a.score) : std::string("-")) + "\t" + number_text(a.max) + "\t" +
                   (a.has_hurdle ? number_text(a.hurdle) : std::string("-")) + "\n";
        }
    }
    for (const Result& r : t.results()) {
        out += "result\t" + r.code + "\t" + r.name + "\t" + number_text(r.credit) + "\t" + number_text(r.mark) + "\t" +
               (r.has_grade ? std::string(grade_name(r.grade)) : std::string("-")) + "\t" + r.term + "\n";
    }
    return out;
}

bool read_file(const std::string& path, std::string& out) {
    std::ifstream in(path, std::ios::binary);
    if (!in) return false;
    std::ostringstream buffer;
    buffer << in.rdbuf();
    out = buffer.str();
    return true;
}

bool write_file_safely(const std::string& path, const std::string& text, std::string& error) {
    const std::string fresh = path + ".new";
    {
        std::ofstream out(fresh, std::ios::binary | std::ios::trunc);
        if (!out) {
            error = "Could not write to " + fresh + ".";
            return false;
        }
        out << text;
        out.flush();
        if (!out) {
            error = "Writing to " + fresh + " failed. Your old file was not touched.";
            return false;
        }
    }
    // Keep the last good file as a backup, then put the new one in its place.
    const std::string backup = path + ".bak";
    std::string existing;
    if (read_file(path, existing)) {
        std::remove(backup.c_str());
        if (std::rename(path.c_str(), backup.c_str()) != 0) {
            error = "Could not make the backup " + backup + ". Your old file was not touched.";
            return false;
        }
    }
    if (std::rename(fresh.c_str(), path.c_str()) != 0) {
        error = "Could not replace " + path + ". The new data is in " + fresh + ".";
        return false;
    }
    return true;
}

}  // namespace tracker
