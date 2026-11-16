#include "tracker/grades.hpp"

namespace tracker {

static const char* const NAMES[GRADE_COUNT] = {"HD", "D", "C", "P", "NP", "N", "NH", "WN"};

const char* grade_name(Grade grade) { return NAMES[grade]; }

bool parse_grade(const std::string& text, Grade& out) {
    for (int g = 0; g < GRADE_COUNT; ++g) {
        if (text == NAMES[g]) {
            out = static_cast<Grade>(g);
            return true;
        }
    }
    return false;
}

Grade grade_for_mark(double mark) {
    if (mark >= 80) return HD;
    if (mark >= 70) return D;
    if (mark >= 60) return C;
    if (mark >= 50) return P;
    return N;
}

double min_mark_for(Grade grade) {
    switch (grade) {
        case HD: return 80;
        case D: return 70;
        case C: return 60;
        case P: return 50;
        default: return 0;
    }
}

// Order of the numbers: HD, D, C, P, NP, N, NH, WN.
// Monash lists hurdle fail (NH) at the same value as fail (N) on the GPA scale.
// The Malaysia table does not list NH, so it is given the fail value here too. That is an assumption.
const Scheme& gpa_scheme() {
    static const Scheme scheme = {"gpa", "GPA (standard Monash scale)", {4.0, 3.0, 2.0, 1.0, 0.7, 0.3, 0.3, 0.0}};
    return scheme;
}

const Scheme& cgpa_scheme() {
    static const Scheme scheme = {"cgpa", "CGPA (Malaysia scale)", {4.0, 3.67, 2.85, 2.15, 1.7, 1.15, 1.15, 0.0}};
    return scheme;
}

double level_weight(const std::string& unit_code) {
    for (char c : unit_code) {
        if (c >= '0' && c <= '9') return c == '1' ? 0.5 : 1.0;
    }
    return 1.0;   // no digit in the code: treat it as a later-year unit
}

}  // namespace tracker
