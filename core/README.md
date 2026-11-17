# The core: grade rules in C++

This folder holds every grade rule in the app, written in C++17 with data structures built by hand. It builds one program, `tracker`, which works in two ways:

- **`tracker [file]`** is a terminal program with a menu. It keeps its data in a text file.
- **`tracker --engine`** reads the same text from standard input and prints one JSON report. The backend uses this to do all grade maths.

## Build and test

```
cmake -S core -B core/build
cmake --build core/build
core/build/tracker_tests                              72 white-box tests with a leak check
python core/tests/blackbox.py core/build/tracker      31 black-box tests of the terminal program
core/build/tracker                                    run it
```

On Windows the programs end in `.exe`. Warnings are treated as errors.

## What is in here

| Path | What it holds |
|---|---|
| `include/ds/` | The three data structures. Header-only templates. |
| `include/tracker/`, `src/lib/` | The rules: grade scales, the data model, the calculations, the text format and the JSON report. No input or output of their own, except reading and writing a file. |
| `src/cli.cpp`, `src/main.cpp` | The terminal menu and the choice between menu and engine mode. |
| `tests/` | White-box tests (`test_*.cpp`), the small test helper (`mini.hpp`) and the black-box script (`blackbox.py`). |

The rules are explained with worked examples in [docs/02-design/grade-rules.md](../docs/02-design/grade-rules.md).

## The data structures

No container from the standard library is used in this folder: no `std::vector`, `std::list`, `std::map` or `std::unordered_map`. `std::string` and the stream classes are used for text and files.

In the tables, **n** is the number of items held.

### `DynArray<T>`: a growable array

Items sit side by side in one block of memory. When the block is full, a block twice as large is made and the items are moved.

| Operation | Time | Extra space | Why |
|---|---|---|---|
| Read or write by position | O(1) | O(1) | The position is an offset into the block |
| `push_back` | O(1) amortised, O(n) when it grows | O(n) while growing | Doubling means growth happens rarely enough that the average stays constant |
| `remove_at` | O(n) | O(1) | Every later item moves one place down |
| Walk through all items | O(n) | O(1) | Fast in practice: the items are next to each other in memory |
| The structure | | O(n), at most 2n slots | |

**Used for:** finished results, the fields of a split line, the JSON writer's nesting.
**Why this one:** these are only ever added to at the end and read from start to finish.
**Not chosen:** a linked list would cost one extra pointer per item and scatter the items across memory, for no gain.

### `LinkedList<T>`: a singly linked list

Each item lives in its own node, and each node points to the next. The list keeps a pointer to the first and the last node.

| Operation | Time | Extra space | Why |
|---|---|---|---|
| `push_back`, `push_front`, `pop_front` | O(1) | O(1) | Only the end pointers change |
| `find`, `remove_first` | O(n) | O(1) | The list is walked from the front |
| `sort` (merge sort) | O(n log n) | O(log n) | The list is halved log n times; the recursion is that deep |
| The structure | | O(n), one pointer per item | |

**Used for:** a unit's assessments, and sorted lists of unit codes.
**Why this one:** assessments are shown in the order they were added, adding one must not move the others, and a unit has only a handful.
**Why merge sort:** it suits a linked list. It only relinks nodes and never copies an item. It needs no jumping to a position, which a list cannot do quickly. It is stable: items that compare equal keep their order. Quicksort was not chosen because it is O(n²) in the worst case and is not stable.

### `HashMap<V>`: a hash map from text to values

A hash function (FNV-1a) turns the key into a number, and that number picks a bucket. Keys that land in the same bucket are kept in a short chain of nodes ("separate chaining"). When the table is 75% full it doubles, and every node is moved to its new bucket without being copied.

| Operation | Average time | Worst time | Why |
|---|---|---|---|
| `put`, `find`, `erase`, `contains` | O(1) | O(n) | On average a bucket holds less than one item. The worst case needs every key to land in one bucket |
| `for_each` | O(n + b) | O(n + b) | Every bucket (b of them) and every item is visited |
| The structure | | O(n + b) space | b stays between 1.33n and 2.67n |

**Used for:** units by their code, and semesters by name when results are grouped.
**Why this one:** the most common action in the whole program is "find the unit with this code".
**Not chosen:** a sorted array with binary search would find in O(log n) but add in O(n). A balanced tree would give O(log n) for everything and keep the keys in order, which is only needed when listing, and listing is done by collecting the codes and merge sorting them.
**Why separate chaining:** removing a key is simple (unlink one node), and the table still works when it is nearly full. Open addressing would save the pointers but needs "deleted" markers.

## Where each choice shows up

| Action | Structures used | Cost |
|---|---|---|
| Find a unit by code | `HashMap` | O(1) average |
| Add an assessment to a unit | `HashMap` find, `LinkedList` walk to check the weights, then `push_back` | O(a) for a unit with a assessments |
| Work out the standing in a unit | one walk over its `LinkedList` | O(a) |
| List units in order | collect codes into a `LinkedList`, merge sort | O(u log u) for u units |
| GPA, CGPA and WAM | one walk over the `DynArray` of results, grouping by semester with a `HashMap` | O(r) average for r results |
| Build the whole engine report | all of the above | O(u log u + A + r), where A is all assessments |

## Honest note on speed

With a few dozen units and a few hundred assessments, none of these choices changes what a user feels. Any of the structures would answer in well under a millisecond. The value here is that each choice is stated, has a reason, and is tested. Measuring them on large generated data is still to do (story ENG-07).

## Memory safety

- Each structure follows the rule of five: copying makes a full separate copy, moving hands the memory over, and the destructor frees everything.
- The test runner replaces `new` and `delete` with versions that count. A test that does not give back everything it took fails. All 72 tests pass this.
- In CI the tests also run under the address and undefined-behaviour sanitizers (`-DTRACKER_SANITIZE=ON`). That build has not run yet.

## The text format

One record per line, fields separated by tabs. It is described at the top of [include/tracker/codec.hpp](include/tracker/codec.hpp). It is both the terminal program's save file and what the backend sends to the engine, so one parser serves both and is tested once.

A save is written to a new file first and then swapped in, and the previous file is kept as `<name>.bak`. A damaged file is reported line by line and never overwritten until the user makes a change.
