// tracker: the academics tracker.
//
//   tracker [file]      the terminal menu. Data is kept in `file` (default: tracker-data.tsv)
//   tracker --engine    reads the tracker text from standard input, prints one JSON report.
//                       This is how the backend asks the core to do the grade maths.
//   tracker --version
//   tracker --help
#include <cstdio>
#include <iostream>
#include <sstream>
#include <string>

#include "cli.hpp"
#include "tracker/report.hpp"

int main(int argc, char** argv) {
    std::string first = argc > 1 ? argv[1] : "";

    if (first == "--version") {
        std::printf("tracker 0.1.0\n");
        return 0;
    }
    if (first == "--help" || first == "-h") {
        std::printf("tracker [file]     open the terminal menu (default file: tracker-data.tsv)\n"
                    "tracker --engine   read tracker text from standard input, print a JSON report\n"
                    "tracker --version  print the version\n");
        return 0;
    }
    if (first == "--engine") {
        std::ostringstream input;
        input << std::cin.rdbuf();
        tracker::Tracker t;
        tracker::LoadReport load = tracker::load_text(input.str(), t);
        std::printf("%s\n", tracker::engine_report(t, load).c_str());
        return 0;
    }
    if (!first.empty() && first[0] == '-') {
        std::fprintf(stderr, "Unknown option %s. Try --help.\n", first.c_str());
        return 2;
    }
    return run_cli(first.empty() ? "tracker-data.tsv" : first);
}
