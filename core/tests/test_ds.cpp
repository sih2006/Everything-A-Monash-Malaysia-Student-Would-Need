// White-box tests for the hand-built data structures.
// Each structure is tested empty, with one item, and with many items.
#include <string>

#include "ds/dyn_array.hpp"
#include "ds/hash_map.hpp"
#include "ds/linked_list.hpp"
#include "mini.hpp"

// ---------- DynArray ----------

TEST(dyn_array_starts_empty) {
    ds::DynArray<int> a;
    CHECK(a.empty());
    CHECK(a.size() == 0);
    CHECK(!a.remove_at(0));
}

TEST(dyn_array_keeps_items_in_order) {
    ds::DynArray<int> a;
    for (int i = 0; i < 100; ++i) a.push_back(i * 2);
    CHECK(a.size() == 100);
    CHECK(a[0] == 0);
    CHECK(a[57] == 114);
    CHECK(a[99] == 198);
}

TEST(dyn_array_doubles_when_full) {
    ds::DynArray<int> a;
    a.push_back(1);
    CHECK(a.capacity() == 4);
    for (int i = 0; i < 4; ++i) a.push_back(i);
    CHECK(a.capacity() == 8);   // the fifth item did not fit in 4
}

TEST(dyn_array_remove_closes_the_gap) {
    ds::DynArray<std::string> a;
    a.push_back("a");
    a.push_back("b");
    a.push_back("c");
    CHECK(a.remove_at(1));
    CHECK(a.size() == 2);
    CHECK_STR(a[0], "a");
    CHECK_STR(a[1], "c");
    CHECK(!a.remove_at(2));     // one past the end
    CHECK(a.remove_at(1));      // the last item
    CHECK(a.remove_at(0));      // the only item
    CHECK(a.empty());
}

TEST(dyn_array_copy_is_independent) {
    ds::DynArray<std::string> a;
    a.push_back("one");
    ds::DynArray<std::string> b = a;
    b[0] = "changed";
    b.push_back("two");
    CHECK_STR(a[0], "one");
    CHECK(a.size() == 1);
    CHECK(b.size() == 2);
}

TEST(dyn_array_move_takes_the_items) {
    ds::DynArray<std::string> a;
    a.push_back("x");
    ds::DynArray<std::string> b = std::move(a);
    CHECK(b.size() == 1);
    CHECK(a.size() == 0);
}

TEST(dyn_array_range_for_visits_everything) {
    ds::DynArray<int> a;
    for (int i = 1; i <= 10; ++i) a.push_back(i);
    int sum = 0;
    for (int v : a) sum += v;
    CHECK(sum == 55);
}

// ---------- LinkedList ----------

TEST(linked_list_starts_empty) {
    ds::LinkedList<int> l;
    CHECK(l.empty());
    CHECK(!l.pop_front());
    CHECK(l.find([](int) { return true; }) == nullptr);
    CHECK(!l.remove_first([](int) { return true; }));
    l.sort([](int a, int b) { return a < b; });   // sorting nothing must be safe
    CHECK(l.empty());
}

TEST(linked_list_push_back_and_front) {
    ds::LinkedList<int> l;
    l.push_back(2);
    l.push_back(3);
    l.push_front(1);
    int expected = 1;
    for (int v : l) CHECK(v == expected++);
    CHECK(l.size() == 3);
}

TEST(linked_list_remove_head_middle_tail) {
    ds::LinkedList<int> l;
    for (int i = 1; i <= 5; ++i) l.push_back(i);
    CHECK(l.remove_first([](int v) { return v == 3; }));   // middle
    CHECK(l.remove_first([](int v) { return v == 1; }));   // head
    CHECK(l.remove_first([](int v) { return v == 5; }));   // tail
    CHECK(!l.remove_first([](int v) { return v == 9; }));  // not there
    CHECK(l.size() == 2);
    l.push_back(6);                                        // the tail pointer must still be right
    int expected[] = {2, 4, 6};
    int i = 0;
    for (int v : l) CHECK(v == expected[i++]);
}

TEST(linked_list_single_item_remove_then_reuse) {
    ds::LinkedList<std::string> l;
    l.push_back("only");
    CHECK(l.remove_first([](const std::string& s) { return s == "only"; }));
    CHECK(l.empty());
    l.push_back("again");
    CHECK(l.size() == 1);
    CHECK(l.pop_front());
    CHECK(l.empty());
}

TEST(linked_list_find_gives_a_pointer_to_the_item) {
    ds::LinkedList<std::string> l;
    l.push_back("alpha");
    l.push_back("beta");
    std::string* found = l.find([](const std::string& s) { return s == "beta"; });
    CHECK(found != nullptr);
    *found = "gamma";
    CHECK(l.find([](const std::string& s) { return s == "gamma"; }) != nullptr);
}

TEST(linked_list_sort_orders_the_items) {
    ds::LinkedList<int> l;
    int values[] = {5, 3, 9, 1, 7, 2, 8, 6, 4, 0};
    for (int v : values) l.push_back(v);
    l.sort([](int a, int b) { return a < b; });
    int expected = 0;
    for (int v : l) CHECK(v == expected++);
    CHECK(expected == 10);
    l.push_back(10);   // the tail must point at the new last node after a sort
    CHECK(l.size() == 11);
}

TEST(linked_list_sort_is_stable) {
    // Items with the same key must keep their first order.
    struct Item {
        int key;
        char tag;
    };
    ds::LinkedList<Item> l;
    l.push_back({2, 'a'});
    l.push_back({1, 'b'});
    l.push_back({2, 'c'});
    l.push_back({1, 'd'});
    l.sort([](const Item& x, const Item& y) { return x.key < y.key; });
    std::string order;
    for (const Item& it : l) order += it.tag;
    CHECK_STR(order, "bdac");
}

TEST(linked_list_sort_large) {
    ds::LinkedList<int> l;
    unsigned seed = 12345;
    for (int i = 0; i < 5000; ++i) {
        seed = seed * 1103515245u + 12345u;
        l.push_back(static_cast<int>(seed % 100000));
    }
    l.sort([](int a, int b) { return a < b; });
    int previous = -1;
    bool sorted = true;
    for (int v : l) {
        if (v < previous) sorted = false;
        previous = v;
    }
    CHECK(sorted);
    CHECK(l.size() == 5000);
}

TEST(linked_list_copy_is_independent) {
    ds::LinkedList<int> a;
    a.push_back(1);
    ds::LinkedList<int> b = a;
    b.push_back(2);
    CHECK(a.size() == 1);
    CHECK(b.size() == 2);
}

// ---------- HashMap ----------

TEST(hash_map_starts_empty) {
    ds::HashMap<int> m;
    CHECK(m.empty());
    CHECK(m.find("x") == nullptr);
    CHECK(!m.contains("x"));
    CHECK(!m.erase("x"));
}

TEST(hash_map_put_find_replace) {
    ds::HashMap<int> m;
    CHECK(m.put("FIT2004", 70));       // new key
    CHECK(!m.put("FIT2004", 80));      // same key: replaced, not added
    CHECK(m.size() == 1);
    CHECK(*m.find("FIT2004") == 80);
}

TEST(hash_map_erase) {
    ds::HashMap<int> m;
    m.put("a", 1);
    m.put("b", 2);
    CHECK(m.erase("a"));
    CHECK(!m.erase("a"));
    CHECK(m.size() == 1);
    CHECK(m.find("a") == nullptr);
    CHECK(*m.find("b") == 2);
}

TEST(hash_map_grows_and_keeps_every_key) {
    ds::HashMap<int> m;
    for (int i = 0; i < 2000; ++i) m.put("key" + std::to_string(i), i);
    CHECK(m.size() == 2000);
    CHECK(m.bucket_count() >= 2000);   // it stays under 75% full
    bool all_found = true;
    for (int i = 0; i < 2000; ++i) {
        const int* v = m.find("key" + std::to_string(i));
        if (v == nullptr || *v != i) all_found = false;
    }
    CHECK(all_found);
}

TEST(hash_map_handles_keys_in_the_same_bucket) {
    // With only 8 buckets, 6 keys must share some. Every one must still be found and removable.
    ds::HashMap<int> m;
    const char* keys[] = {"a", "b", "c", "d", "e", "f"};
    for (int i = 0; i < 6; ++i) m.put(keys[i], i);
    CHECK(m.bucket_count() == 8);
    for (int i = 0; i < 6; ++i) CHECK(*m.find(keys[i]) == i);
    for (int i = 0; i < 6; ++i) CHECK(m.erase(keys[i]));
    CHECK(m.empty());
}

TEST(hash_map_for_each_visits_every_pair_once) {
    ds::HashMap<int> m;
    for (int i = 1; i <= 50; ++i) m.put("k" + std::to_string(i), i);
    int sum = 0, count = 0;
    m.for_each([&](const std::string&, int& v) {
        sum += v;
        ++count;
    });
    CHECK(count == 50);
    CHECK(sum == 1275);
}

TEST(hash_map_copy_is_independent) {
    ds::HashMap<std::string> a;
    a.put("x", "one");
    ds::HashMap<std::string> b = a;
    b.put("x", "two");
    b.put("y", "three");
    CHECK_STR(*a.find("x"), "one");
    CHECK(a.size() == 1);
    CHECK(b.size() == 2);
}

TEST(hash_map_empty_key_and_long_key) {
    ds::HashMap<int> m;
    m.put("", 1);
    m.put(std::string(500, 'z'), 2);
    CHECK(*m.find("") == 1);
    CHECK(*m.find(std::string(500, 'z')) == 2);
}
