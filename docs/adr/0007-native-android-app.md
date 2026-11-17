# ADR-0007: A native Android app in Kotlin

## Status

Accepted in part. On 17 November 2026 the owner chose a fully native Android app (option 4 of the four offered) and chose to keep the data on the phone. The tool versions and the way the C++ core is joined to Kotlin were chosen without the owner and are still **Proposed** until the owner reviews them.

## Date

2026-11-17

## Context

The web app runs on a laptop. The owner wants the app on a Samsung Galaxy S24 Ultra, and the health module needs steps, sleep and heart rate from the phone, which a web page cannot read. The grade rules live only in the C++ core ([ADR-0004](0004-grade-scales-and-rules.md)), so whatever runs on the phone must use that core, not a copy of the rules.

## Options considered

| Option | What it is | For | Against |
|---|---|---|---|
| 1. Web app added to the Home screen | The current web app, opened on the phone over Wi-Fi | No new code | Needs the laptop running; cannot read phone health data |
| 2. Web app inside a wrapper (for example Capacitor) | The same web code packed as an Android app | Little new code | Needs packages and a build step (against ADR-0003); health data through plugins |
| 3. Cross-platform (Flutter or React Native) | One new code base for Android and iOS | iOS later for free | A third language; the C++ core joined through another bridge |
| **4. Native Kotlin with Jetpack Compose** | **A new Android app, the C++ core built into it with the NDK** | **Reads Health Connect directly; the real engine runs on the phone; strong portfolio piece** | **The budget, food and health rules must be ported from JavaScript to Kotlin, with tests** |

Where the data lives: **on the phone** (owner's choice) instead of on the laptop's server. The phone then works with no network.

## Decision

- Option 4, in the folder `android/` (started on its own branch and merged into `main` on 18 November 2026). The web app stays as it is.
- Kotlin 2.3, Jetpack Compose, Android Gradle Plugin 9.1 (the newest the installed Android Studio supports), Gradle 9.4, minimum Android 9 (API 28), target API 36.
- The C++ core is built with CMake and the NDK into `libtracker.so` for `arm64-v8a` (the phone) and `x86_64` (the emulator). One JNI function passes the engine's text input in and its JSON report out, the same contract the backend uses.
- Screens follow MVVM, as in the web app ([mvvm-guide.md](../handoff/mvvm-guide.md)).

## Consequences

- Every grade number on the phone comes from the same C++ code as on the laptop.
- The budget, food and health rules now exist in two languages. Each Kotlin port must pass the same worked examples as `backend/test/domain.test.js`.
- Build with the Java that ships inside Android Studio (`jbr`), not an older Java on the PATH.
- The first step, an app that runs the engine and shows its report, builds. It has not yet run on the phone or on an emulator.
