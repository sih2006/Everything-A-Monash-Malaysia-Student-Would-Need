// Tests for saving, loading and the engine report.
#include <cstdio>

#include "mini.hpp"
#include "tracker/report.hpp"

using namespace tracker;

namespace {

const char* const SAMPLE =
    "tracker\t1\n"
    "term\tS1 2027\n"
    "margin\t10\n"
    "goal\tcgpa\t3\t144\n"
    "unit\tFIT2004\tAlgorithms and data structures\t6\t70\tS1 2027\n"
    "assess\tFIT2004\ta1\tAssignment 1\t15\t78\t100\t-\n"
    "assess\tFIT2004\ta2\tAssignment 2\t15\t70\t100\t-\n"
    "assess\tFIT2004\tmid\tMid-semester test\t10\t65\t100\t-\n"
    "assess\tFIT2004\texam\tFinal exam\t60\t-\t100\t45\n"
    "result\tFIT1045\tIntroduction to programming\t6\t78\t-\tS1 2026\n"
    "result\tFIT1047\tComputer systems\t6\t47\tNP\tS1 2026\n";

bool contains(const std::string& text, const std::string& part) { return text.find(part) != std::string::npos; }

}  // namespace

TEST(split_tabs_keeps_empty_fields) {
    ds::DynArray<std::string> f = split_tabs("a\t\tb\t");
    CHECK(f.size() == 4);
    CHECK_STR(f[0], "a");
    CHECK_STR(f[1], "");
    CHECK_STR(f[2], "b");
    CHECK_STR(f[3], "");
    CHECK(split_tabs("").size() == 1);
}

TEST(parse_number_accepts_only_whole_numbers_text) {
    double v = 0;
    CHECK(parse_number("70", v) && v == 70);
    CHECK(parse_number("68.5", v) && v == 68.5);
    CHECK(parse_number("-3", v) && v == -3);
    CHECK(!parse_number("", v));
    CHECK(!parse_number("abc", v));
    CHECK(!parse_number("70%", v));
    CHECK(!parse_number("7 0", v));
    CHECK(!parse_number("nan", v));
    CHECK(!parse_number("inf", v));
}

TEST(load_reads_every_kind_of_line) {
    Tracker t;
    LoadReport report = load_text(SAMPLE, t);
    CHECK(report.errors.empty());
    CHECK_STR(t.current_term, "S1 2027");
    CHECK(t.goal.set);
    CHECK(t.unit_count() == 1);
    const Unit* u = t.find_unit("FIT2004");
    CHECK(u != nullptr);
    CHECK(u->has_target && u->target == 70);
    CHECK(u->assessments.size() == 4);
    CHECK(t.results().size() == 2);
    CHECK(t.results()[1].final_grade() == NP);
}

TEST(save_then_load_gives_the_same_tracker) {
    Tracker first;
    load_text(SAMPLE, first);
    std::string saved = save_text(first);
    Tracker second;
    LoadReport report = load_text(saved, second);
    CHECK(report.errors.empty());
    CHECK_STR(save_text(second), saved);          // saving again gives exactly the same text
    CHECK_STR(saved, SAMPLE);                     // and it matches what was loaded
}

TEST(load_accepts_windows_line_endings_and_comments) {
    Tracker t;
    LoadReport report = load_text("# my units\r\n\r\nunit\tFIT2004\tAlgorithms\t6\t-\tS1 2027\r\n", t);
    CHECK(report.errors.empty());
    CHECK(t.unit_count() == 1);
    CHECK_STR(t.find_unit("FIT2004")->term, "S1 2027");
}

TEST(a_damaged_file_reports_each_bad_line_and_keeps_the_good_ones) {
    Tracker t;
    LoadReport report = load_text(
        "unit\tFIT2004\tAlgorithms\t6\t-\tS1 2027\n"
        "unit\tFIT2099\tToo few fields\n"
        "assess\tFIT2004\ta1\tAssignment 1\tfifteen\t-\t100\t-\n"
        "assess\tNOPE000\ta1\tNo such unit\t10\t-\t100\t-\n"
        "banana\tsplit\n"
        "result\tFIT1045\tProgramming\t6\t140\t-\tS1 2026\n"
        "assess\tFIT2004\ta2\tAssignment 2\t15\t-\t100\t-\n",
        t);
    CHECK(report.errors.size() == 5);
    CHECK(contains(report.errors[0], "line 2"));
    CHECK(contains(report.errors[1], "line 3") && contains(report.errors[1], "not a number"));
    CHECK(contains(report.errors[2], "line 4"));
    CHECK(contains(report.errors[3], "line 5") && contains(report.errors[3], "banana"));
    CHECK(contains(report.errors[4], "line 6"));
    CHECK(t.unit_count() == 1);                                  // the good unit line was used
    CHECK(t.find_unit("FIT2004")->assessments.size() == 1);      // and the good assessment line
    CHECK(t.results().empty());
}

TEST(an_unknown_file_version_is_reported) {
    Tracker t;
    LoadReport report = load_text("tracker\t99\n", t);
    CHECK(report.errors.size() == 1);
}

TEST(empty_text_loads_as_an_empty_tracker) {
    Tracker t;
    LoadReport report = load_text("", t);
    CHECK(report.errors.empty());
    CHECK(t.unit_count() == 0);
}

TEST(file_round_trip_keeps_a_backup) {
    const std::string path = "codec_test_file.tsv";
    std::string error;
    CHECK(write_file_safely(path, "first\n", error));
    CHECK(write_file_safely(path, "second\n", error));
    std::string now, before;
    CHECK(read_file(path, now));
    CHECK(read_file(path + ".bak", before));
    CHECK_STR(now, "second\n");
    CHECK_STR(before, "first\n");
    std::remove(path.c_str());
    std::remove((path + ".bak").c_str());
    CHECK(!read_file(path, now));                 // a missing file is reported, not a crash
}

TEST(engine_report_has_the_worked_out_numbers) {
    Tracker t;
    LoadReport load = load_text(std::string(SAMPLE) + "whatif\tFIT2004\t69\n", t);
    CHECK(load.errors.empty());
    CHECK(load.questions.size() == 1);
    std::string json = engine_report(t, load);
    CHECK(contains(json, "\"ok\":true"));
    CHECK(contains(json, "\"code\":\"FIT2004\""));
    CHECK(contains(json, "\"earned\":28.7"));
    CHECK(contains(json, "\"average\":71.75"));
    CHECK(contains(json, "\"onCourse\":true"));
    CHECK(contains(json, "\"verdict\":\"On course. The mark you need is below your average so far.\""));
    CHECK(contains(json, "\"finalMark\":70.1"));              // the what-if answer
    CHECK(contains(json, "\"reachesTarget\":true"));
    CHECK(contains(json, "\"term\":\"S1 2026\""));
    // S1 2026: D (78) and NP (47), 6 points each.  GPA = (3 + 0.7) / 2 = 1.85.  CGPA = (3.67 + 1.7) / 2 = 2.685.
    CHECK(contains(json, "\"gpa\":1.85"));
    CHECK(contains(json, "\"cgpa\":2.685"));
    CHECK(contains(json, "\"attention\":[]"));
    CHECK(contains(json, "\"measure\":\"cgpa\""));
}

TEST(engine_report_lists_units_that_need_attention) {
    Tracker t;
    LoadReport load = load_text(
        "unit\tFIT2099\tOO design\t6\t80\tS1 2027\n"
        "assess\tFIT2099\ta1\tAssignment 1\t70\t70\t100\t-\n",
        t);
    std::string json = engine_report(t, load);
    // Earned 49 with 30% left: the best possible is 79, a D. An HD (80) would need 103%.
    CHECK(contains(json, "\"attention\":[{\"code\":\"FIT2099\",\"reason\":\"HD is out of reach. The highest grade you can still get is D.\"}]"));
    CHECK(contains(json, "\"goal\":null"));
}

TEST(engine_report_escapes_text_and_reports_errors) {
    Tracker t;
    LoadReport load = load_text("unit\tFIT2004\tSay \"hi\" \\ there\t6\t-\t\nrubbish\n", t);
    std::string json = engine_report(t, load);
    CHECK(contains(json, "\"ok\":false"));
    CHECK(contains(json, "Say \\\"hi\\\" \\\\ there"));
    CHECK(contains(json, "line 2"));
}

TEST(engine_report_for_an_empty_tracker) {
    Tracker t;
    std::string json = engine_report(t, load_text("", t));
    CHECK(contains(json, "\"units\":[]"));
    CHECK(contains(json, "\"terms\":[]"));
    CHECK(contains(json, "\"current\":null"));
}
