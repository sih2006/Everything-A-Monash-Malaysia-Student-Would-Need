// Reading and writing the tracker as plain text.
//
// One record per line, fields separated by tabs. The same format is used for
// the save file of the terminal program and for the messages the backend sends
// to the engine, so there is only one parser to test.
//
//   tracker <TAB> 1                                             format version
//   term    <TAB> name of the current semester
//   margin  <TAB> points
//   goal    <TAB> cgpa|gpa|wam <TAB> value <TAB> total credit points
//   unit    <TAB> code <TAB> name <TAB> credit <TAB> target or - <TAB> semester
//   assess  <TAB> unit code <TAB> id <TAB> name <TAB> weight <TAB> score or - <TAB> max <TAB> hurdle or -
//   result  <TAB> code <TAB> name <TAB> credit <TAB> mark <TAB> grade or - <TAB> semester
//   whatif  <TAB> unit code <TAB> percent                       a question, not stored
//
// Empty lines and lines that start with # are skipped.
#pragma once

#include <string>

#include "ds/dyn_array.hpp"
#include "tracker/model.hpp"

namespace tracker {

struct Question {
    std::string code;
    double score = 0;
};

struct LoadReport {
    ds::DynArray<std::string> errors;      // one message for each line that could not be used
    ds::DynArray<Question> questions;      // the "whatif" lines
};

// Fills `into` from the text. Bad lines are reported and skipped; good lines are still used.
LoadReport load_text(const std::string& text, Tracker& into);

// The whole tracker as text. Units are written in alphabetical order, so the file is stable.
std::string save_text(const Tracker& tracker);

// Splits one line at each tab.
ds::DynArray<std::string> split_tabs(const std::string& line);

// Reads a number. Returns false for empty text, letters, or anything left over.
bool parse_number(const std::string& text, double& out);

// Whole-file helpers. `write_file_safely` writes to a new file first and only
// then replaces the old one, keeping the previous version as "<path>.bak".
bool read_file(const std::string& path, std::string& out);
bool write_file_safely(const std::string& path, const std::string& text, std::string& error);

}  // namespace tracker
