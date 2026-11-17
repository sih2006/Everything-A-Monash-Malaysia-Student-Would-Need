# ADR-0001: Write the academics tracker core in C++

## Status

Proposed. Drafted on 15 November 2026 from the author's interview answers, awaiting the author's review and edits.

## Date

2026-11-15

## Context

The academics tracker is the first part of the app to be built. It stores units, assessments and marks, works out what is needed on the remaining assessments to reach a target, and calculates GPA, WAM and CGPA.

The things that matter for this decision:

- The author knows C++ and has studied data structures and algorithms in it (FIT1008 and FIT2085). The project is a portfolio piece, and the author wants to show that knowledge directly: hand-built data structures with a stated time and space cost for every operation.
- The author wants to start building now and use the tracker in the summer semester starting January 2027.
- The capability map assumed Expo and TypeScript for the whole app, but that was never confirmed (assumption 3).
- The first release only needs to run in a terminal on a laptop. Phone and browser screens come later and do not have to be written in C++.
- Free tools only, and as few libraries as possible.

## Decision

The `gpa` and `academics` modules are written in C++.

- The core data structures are built by hand (linked nodes, hash table, sorted structures), each documented with its time and space complexity.
- The standard library is used only for text, files, and input and output (`iostream`, `string` and similar), not for containers in the core.
- One small testing library is added. Which one is a separate decision.
- The first release is a terminal program that saves its data to a file.

This decision covers the academics core only. The stack for screens, mascots, sync and the other modules is still open and gets its own ADR when that work starts.

## Alternatives considered

### TypeScript with Expo

- Pros: one codebase for Android and the browser, which is where the full app is meant to run. It was the earlier recommendation.
- Cons: the author would have to learn the language and the toolkit before building anything. Its built-in collections hide the data-structure work the author wants to show.
- Rejected for the core: it delays the start and hides the algorithmic work. Still a candidate for the screens later.

### Kotlin Multiplatform

- Pros: native Android, and the logic can be shared with other platforms.
- Cons: a new language and toolchain for the author, with the same learning delay as TypeScript.
- Rejected for the core: no advantage over C++ for a terminal program, and the author does not know it.

### Flutter (Dart)

- Pros: one codebase for Android and the browser.
- Cons: a new language for the author, and the same problem of built-in collections hiding the data-structure work.
- Rejected for the core, for the same reasons as TypeScript.

### C++ with the standard library containers (`std::vector`, `std::map`)

- Pros: the fastest way to a working tracker, and well tested.
- Cons: the author could not state and defend the cost of each operation from their own implementation.
- Rejected: demonstrating hand-built structures is one of the goals of the project.

## Consequences

- The author can start immediately in a language they know, and every structure in the core is their own work to explain.
- At the size of real data (a few dozen units, a few hundred assessments) no choice of structure makes a measurable difference in speed. Efficiency is shown through complexity analysis and through benchmarks on large generated data, not through everyday use.
- Hand-built structures need more testing than standard ones, including memory checks. This is planned for in the test plan.
- Putting the core behind phone and browser screens later takes extra work: either compiling the C++ for Android (NDK) and the browser (WebAssembly), or running it behind a backend. That choice is deferred to its own ADR.
- Features that need the internet (screenshot import through Gemini, handbook lookup) will need a library for web requests and one for JSON. Those are separate decisions made when those releases are planned.
- The capability map's stack assumption and the engineering principles document's references to TypeScript need updating to match.
