// Runs every test, and also checks for memory leaks.
//
// The leak check works by replacing the global `new` and `delete` with versions
// that count. Each test must give back everything it took: the count of live
// allocations after a test must equal the count before it.
#include <cstdlib>
#include <new>

#include "mini.hpp"

static long live_allocations = 0;

void* operator new(std::size_t size) {
    void* block = std::malloc(size == 0 ? 1 : size);
    if (block == nullptr) throw std::bad_alloc();
    ++live_allocations;
    return block;
}
void* operator new[](std::size_t size) { return operator new(size); }
void operator delete(void* block) noexcept {
    if (block == nullptr) return;
    --live_allocations;
    std::free(block);
}
void operator delete[](void* block) noexcept { operator delete(block); }
void operator delete(void* block, std::size_t) noexcept { operator delete(block); }
void operator delete[](void* block, std::size_t) noexcept { operator delete(block); }

int main() {
    // The tests registered themselves newest-first. Count them, then run oldest-first.
    int total = 0;
    for (mini::Case* c = mini::first_case(); c != nullptr; c = c->next) ++total;

    int passed = 0, leaked = 0;
    for (int index = total - 1; index >= 0; --index) {
        mini::Case* c = mini::first_case();
        for (int i = 0; i < index; ++i) c = c->next;

        int failures_before = mini::failures();
        long live_before = live_allocations;
        c->run();
        long lost = live_allocations - live_before;

        if (lost != 0) {
            ++leaked;
            ++mini::failures();
            std::printf("    LEAK %s: %ld allocation(s) not freed\n", c->name, lost);
        }
        bool ok = mini::failures() == failures_before;
        if (ok) ++passed;
        std::printf("%s  %s\n", ok ? "ok  " : "FAIL", c->name);
    }

    std::printf("\n%d of %d tests passed, %d checks, %d leak(s)\n", passed, total, mini::checks(), leaked);
    return mini::failures() == 0 ? 0 : 1;
}
