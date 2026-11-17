// Monash grade rules: which mark gives which grade, and what each grade is worth.
//
// Sources, checked on 16 November 2026 (see docs/02-design/grade-rules.md):
//   - GPA values and formula:  monash.edu/students/admin/assessments/results/gpa
//   - Malaysia CGPA values:    the "Malaysia" tab of the same page
//   - WAM year-level weights:  monash.edu/students/admin/exams/results/wam
//
// Two scales exist and they give different numbers for the same grades:
//   GPA  (the standard Monash scale):  HD 4, D 3,    C 2,    P 1,    NP 0.7, N 0.3,  WN 0
//   CGPA (the scale used in Malaysia): HD 4, D 3.67, C 2.85, P 2.15, NP 1.7, N 1.15, WN 0
#pragma once

#include <string>

namespace tracker {

enum Grade { HD, D, C, P, NP, N, NH, WN, GRADE_COUNT };

const char* grade_name(Grade grade);

// Reads "HD", "D" and so on. Returns false if the text is not a grade.
bool parse_grade(const std::string& text, Grade& out);

// The grade a mark earns when there is nothing special about the unit: HD 80+, D 70+, C 60+, P 50+, else N.
// NP (near pass), NH (hurdle fail) and WN (withdrawn fail) are never given by a mark alone.
Grade grade_for_mark(double mark);

// The lowest mark that earns the grade. 0 for the fail grades.
double min_mark_for(Grade grade);

struct Scheme {
    const char* id;
    const char* label;
    double points[GRADE_COUNT];
};

const Scheme& gpa_scheme();    // the standard Monash GPA scale
const Scheme& cgpa_scheme();   // the CGPA scale used in Malaysia

// For WAM, a first-year unit counts half. The year level is the first digit in the unit code.
double level_weight(const std::string& unit_code);

}  // namespace tracker
