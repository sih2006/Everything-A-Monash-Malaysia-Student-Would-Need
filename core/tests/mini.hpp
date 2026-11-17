// A very small test helper, written for this project so the core needs no outside library.
//
//   TEST(name) { ... }        defines a test and registers it
//   CHECK(condition)          fails the test if the condition is false
//   CHECK_NEAR(a, b, eps)     for numbers with decimals
//   CHECK_STR(a, b)           for text
#pragma once

#include <cmath>
#include <cstdio>
#include <string>

namespace mini {

struct Case {
    const char* name;
    void (*run)();
    Case* next;
};

inline Case*& first_case() {
    static Case* head = nullptr;
    return head;
}
inline int& failures() {
    static int count = 0;
    return count;
}
inline int& checks() {
    static int count = 0;
    return count;
}

// Tests register themselves before main() starts. New tests go on the front of a linked list.
struct Register {
    explicit Register(Case* c) {
        c->next = first_case();
        first_case() = c;
    }
};

inline void fail(const char* file, int line, const std::string& what) {
    ++failures();
    std::printf("    FAIL %s:%d  %s\n", file, line, what.c_str());
}

}  // namespace mini

#define TEST(name)                                              \
    static void name();                                         \
    static mini::Case case_##name{#name, name, nullptr};        \
    static mini::Register register_##name{&case_##name};        \
    static void name()

#define CHECK(condition)                                                  \
    do {                                                                  \
        ++mini::checks();                                                 \
        if (!(condition)) mini::fail(__FILE__, __LINE__, #condition);     \
    } while (0)

#define CHECK_NEAR(a, b, eps)                                                                       \
    do {                                                                                            \
        ++mini::checks();                                                                           \
        double left_ = (a), right_ = (b);                                                           \
        if (std::fabs(left_ - right_) > (eps))                                                      \
            mini::fail(__FILE__, __LINE__, std::string(#a " ~ " #b "  got ") + std::to_string(left_) + \
                                               " and " + std::to_string(right_));                   \
    } while (0)

#define CHECK_STR(a, b)                                                                         \
    do {                                                                                        \
        ++mini::checks();                                                                       \
        std::string left_ = (a), right_ = (b);                                                  \
        if (left_ != right_)                                                                    \
            mini::fail(__FILE__, __LINE__, std::string(#a " == " #b "  got \"") + left_ + "\" and \"" + right_ + "\""); \
    } while (0)
