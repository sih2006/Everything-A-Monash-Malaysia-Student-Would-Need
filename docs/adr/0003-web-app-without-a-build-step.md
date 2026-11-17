# ADR-0003: Build the screens as a web app in MVVM, with no framework and no build step

## Status

Proposed. Decided by Claude during the one-day build sprint on 16 November 2026. The owner has not reviewed it yet. It replaces the unconfirmed assumption that the screens would use Expo and React Native.

## Date

2026-11-16

## Context

The app must run on an Android phone and in a laptop browser. The owner had approved a clickable prototype written in plain HTML, CSS and JavaScript, and asked for the real app to use MVVM.

What mattered:

- The prototype's look had to carry over exactly.
- MVVM had to be real and visible: screen logic that can be tested without a browser.
- Nothing to install, so the owner (and CI) can run it at once.
- The owner knows C++ and is new to web frameworks. Every line should be explainable.
- Android features such as Health Connect are wanted later, not now.

## Decision

1. **The screens are a web app:** HTML, CSS and JavaScript modules served by the backend. No framework, no bundler, no packages.
2. **MVVM by hand**, in three folders:
   - Model access: `web/js/api.js`, the only file that calls the backend.
   - ViewModel: `web/js/viewmodels/`. Presenters turn data into finished text. Commands change the state. Neither touches the page.
   - View: `web/js/views/`. One function per screen returns HTML.
3. **It is a progressive web app:** a manifest and a service worker let it be installed on a phone and opened offline once it is served over HTTPS.
4. **The four looks from the prototype are kept** as CSS tokens, until the owner picks one.

## Alternatives considered

### Expo (React Native) with TypeScript

- Pros: one codebase for a native Android app and the web. Direct access to Health Connect through native modules.
- Cons: a large toolchain to install and learn, hundreds of packages, and the approved prototype would have to be rebuilt in a different layout system.
- Rejected for now. It stays the main candidate if a fully native app is wanted; the ViewModel code here has no page code in it and could be reused.

### React, Vue or Svelte in the browser

- Pros: the page updates itself when the state changes, and each has well-known MVVM-like patterns.
- Cons: needs a build step and packages. The app is about a dozen screens with simple forms; redrawing a screen takes under a millisecond without help.
- Rejected: the framework would add more to explain than it removes.

### Kotlin with Jetpack Compose (Android only)

- Pros: the official Android way, with MVVM built in, and Health Connect is native.
- Cons: Android only, so no laptop browser. Android Studio and a Java runtime are not installed.
- Rejected for the first version. A thin Kotlin shell around this web app is the planned route for Health Connect ([android-setup.md](../handoff/android-setup.md)).

### Keep the prototype as it was

- Pros: no work.
- Cons: it mixed rules, state and HTML in one file and used made-up data. It could not be tested and was never meant to be kept.
- Rejected: the prototype's styles were kept, its code was not.

## Consequences

- The web app starts with no install and has 27 tests that run in Node in about a tenth of a second.
- A screen is redrawn in full when its data changes. That is simple and fast at this size, but it means text typed into a form is lost if the screen redraws. The app avoids this by not redrawing when a command fails.
- There is no type checking. A wrong field name shows up only when the code runs. Tests on the presenters and commands are the guard.
- Health Connect cannot be read from a web page. Steps, sleep and heart rate are typed in until the Android shell exists.
- Without icons the browser will not offer "Install app". The icons wait for the artist, because the project uses no generated images.
- If the app grows much larger, moving the Views to a framework is possible without changing the ViewModels.
