// Benchmarks: do the data structures grow as fast as their tables say?
//
// For each operation the size n is multiplied by 10 several times, and the
// time is measured. Then the time is divided by what the claimed cost
// predicts. If the claim is right, that last column stays roughly flat as n grows.
//
//   O(1) per operation        ->  time per operation stays flat
//   O(n) per operation        ->  time per operation grows 10x when n grows 10x
//   O(n log n) for a sort     ->  time / (n log n) stays flat
//
// Build and run (a Release build, or the numbers mean little):
//   cmake -S core -B core/build -DCMAKE_BUILD_TYPE=Release
//   cmake --build core/build --target tracker_bench
//   core/build/tracker_bench
#include <chrono>
#include <cmath>
#include <cstdio>
#include <string>

#include "ds/dyn_array.hpp"
#include "ds/hash_map.hpp"
#include "ds/linked_list.hpp"

namespace {

using Clock = std::chrono::steady_clock;

// Something the compiler cannot prove is unused, so it cannot delete the work being timed.
volatile long long sink = 0;

double seconds_since(Clock::time_point start) {
    return std::chrono::duration<double>(Clock::now() - start).count();
}

// A small, repeatable random number generator, so every run measures the same work.
unsigned next_random(unsigned& seed) {
    seed = seed * 1664525u + 1013904223u;
    return seed;
}

void header(const char* title, const char* claim, const char* ratio_name) {
    std::printf("\n%s   (claimed: %s)\n", title, claim);
    std::printf("  %10s  %14s  %16s  %s\n", "n", "total (ms)", "per item (ns)", ratio_name);
}

void row(long n, double seconds, double ratio) {
    std::printf("  %10ld  %14.2f  %16.1f  %.2f\n", n, seconds * 1e3, seconds / n * 1e9, ratio);
}

void bench_dyn_array_push() {
    header("DynArray: push_back n items", "O(1) amortised each", "ns per item, scaled to the first row");
    double first = 0;
    for (long n = 10000; n <= 10000000; n *= 10) {
        Clock::time_point start = Clock::now();
        ds::DynArray<long> a;
        for (long i = 0; i < n; ++i) a.push_back(i);
        sink = sink + a[static_cast<std::size_t>(n - 1)];
        double t = seconds_since(start);
        double per = t / n;
        if (first == 0) first = per;
        row(n, t, per / first);
    }
}

void bench_hash_map() {
    header("HashMap: put n keys, then find each once", "O(1) average each", "ns per key, scaled to the first row");
    double first = 0;
    for (long n = 1000; n <= 1000000; n *= 10) {
        ds::DynArray<std::string> keys;
        for (long i = 0; i < n; ++i) keys.push_back("FIT" + std::to_string(i * 7919 % 1000003));
        Clock::time_point start = Clock::now();
        ds::HashMap<long> m;
        for (long i = 0; i < n; ++i) m.put(keys[static_cast<std::size_t>(i)], i);
        long found = 0;
        for (long i = 0; i < n; ++i) found += *m.find(keys[static_cast<std::size_t>(i)]);
        sink = sink + found;
        double t = seconds_since(start);
        double per = t / n;
        if (first == 0) first = per;
        row(n, t, per / first);
    }
}

void bench_linked_list_find() {
    header("LinkedList: find the last item, 100 times", "O(n) each", "ns per search / n, scaled to the first row");
    double first = 0;
    for (long n = 1000; n <= 1000000; n *= 10) {
        ds::LinkedList<long> l;
        for (long i = 0; i < n; ++i) l.push_back(i);
        Clock::time_point start = Clock::now();
        for (int k = 0; k < 100; ++k) {
            const long wanted = n - 1 - k % 2;
            sink = sink + *l.find([wanted](long v) { return v == wanted; });
        }
        double t = seconds_since(start) / 100;     // one search
        double per_item = t / n;
        if (first == 0) first = per_item;
        std::printf("  %10ld  %14.4f  %16.2f  %.2f\n", n, t * 1e3, per_item * 1e9, per_item / first);
    }
}

void bench_linked_list_sort() {
    header("LinkedList: merge sort n random numbers", "O(n log n)", "time / (n log2 n), scaled to the first row");
    double first = 0;
    unsigned seed = 42;
    for (long n = 10000; n <= 1000000; n *= 10) {
        ds::LinkedList<unsigned> l;
        for (long i = 0; i < n; ++i) l.push_back(next_random(seed));
        Clock::time_point start = Clock::now();
        l.sort([](unsigned a, unsigned b) { return a < b; });
        double t = seconds_since(start);
        unsigned previous = 0;
        bool sorted = true;
        for (unsigned v : l) {
            if (v < previous) sorted = false;
            previous = v;
        }
        if (!sorted) std::printf("  NOT SORTED: the benchmark found a bug\n");
        double scaled = t / (static_cast<double>(n) * std::log2(static_cast<double>(n)));
        if (first == 0) first = scaled;
        row(n, t, scaled / first);
    }
}

}  // namespace

int main() {
    std::printf("Benchmarks for the hand-built data structures. Each row is n times larger than the one above.\n");
    std::printf("If a structure grows as its table says, the last column stays close to 1.\n");
    bench_dyn_array_push();
    bench_hash_map();
    bench_linked_list_find();
    bench_linked_list_sort();
    std::printf("\n(checksum %lld)\n", static_cast<long long>(sink));
    return 0;
}
