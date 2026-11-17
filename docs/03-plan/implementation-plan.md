# Implementation plan

**Status:** Draft, 16 November 2026, updated 18 November. Written after most of the work it describes: the original process called for this plan to be approved before any code, but on 16 November the owner chose to build first.

This document answers: how is the work done, what counts as done, what could go wrong, and what does it cost? **What** comes next, version by version, is in the [roadmap](roadmap.md); the open tasks are in [next-tasks.md](../handoff/next-tasks.md).

## 1. Definition of done

A piece of work is done when all of these are true:

1. It does what its story or task says.
2. Every rule with numbers in it has a test with a hand-worked example, including the edges.
3. `python tools/check.py` passes.
4. Anything a user typed is escaped before it is shown, and checked before it is stored.
5. It was tried by hand where it has a screen: light and dark, phone width and laptop width.
6. The documents that describe it are updated, including [STATUS.md](../handoff/STATUS.md).
7. It is committed in small commits with plain messages. Nothing secret is in the commit.
8. What was not tested is written down.

## 2. What was built, in order

Each row was built, tested and committed before the next one started.

| # | Slice | Proved by | Commit |
|---|---|---|---|
| 1 | Hand-built data structures | 24 white-box tests, leak check | `feat(core): add hand-built data structures with tests` |
| 2 | Grade rules, data model, calculations | 35 more white-box tests | `feat(core): add grade rules, the data model and the calculations` |
| 3 | Save files, the engine report, the terminal program | 13 more white-box tests, 31 black-box tests | `feat(core): add the terminal program, save files and the engine mode` |
| 4 | Backend: database, API, engine bridge, AI helper | 54 tests | `feat(backend): add the local server, database and API` |
| 5 | Web app in MVVM | 27 tests, browser checks by hand | `feat(web): add the web app in MVVM` |
| 6 | One command to check everything, and CI | The command itself | `ci: build everything and run every test on each push` |
| 7 | A cross-site protection found during the security review | 1 more test | `fix(backend): refuse changes that are not sent as JSON` |
| 8 | Handoff guides and the planning documents | Reading them | several `docs:` commits |

After the sprint, the work went on in small slices, each merged through a pull request:

| # | Slice | Proved by |
|---|---|---|
| 9 | Tasks C2 to C10: edit units, other days and months, export and import, token guess limit, benchmarks, accessibility, sorting, demo mode | Tests at each layer, [accessibility report](../proofs/accessibility.md) |
| 10 | Money accounts, the life tree (Map), semester dates, more grade sorting, more health | Rule, API and ViewModel tests |
| 11 | Pass/fail units and what-if totals for GPA, CGPA and WAM | Core, API and ViewModel tests |
| 12 | Money in, height and BMI, Hide money | Rule, API and ViewModel tests |
| 13 | Budget tabs, essential categories, Could cut, advice; balances applied by date | Rule, API and ViewModel tests, browser check at laptop and phone width |
| 14 | The owner's real records loaded into the local app only (transcript, bank statements, e-wallet record) | Every statement row was checked against its printed balance; the app's balances match the statements to the cent |

Why this order: each slice only needs the ones above it. The rules were built and proven before anything was put on top of them, so a bug found later could not be in the foundations without a test having missed it.

## 3. How work is done from here

1. Each version of the [roadmap](roadmap.md) starts with an interview of the owner where its scope is not clear yet. The answers become requirements in the [PRD](../01-requirements/prd.md), each with its version.
2. `tools/backlog_sync.py` copies the requirements to the [project board](https://github.com/users/sih2006/projects/1), one issue each, under the version's milestone.
3. Each piece of work is one branch and one pull request. CI must pass before it is merged.
4. A version is finished when its theme works and its issues are closed. It is then tagged (`v0.4.0`) and released on GitHub with notes on what is in it.

## 4. Risks

| Risk | How likely | How bad | What reduces it |
|---|---|---|---|
| **A grade rule is wrong.** The scales came from Monash's pages through a search tool, not from the pages directly, and one value (NH on the Malaysia scale) is a guess. | Medium | High: every number depends on it | The scales are data in one file. Task A4 checks against Monash's own calculator before the numbers are trusted. |
| **The owner cannot explain the code**, because an AI wrote it in a day. | High | High: it defeats the purpose of the project | Small files with a comment on why each exists. The MVVM guide's worked example (task A5). Explanations as each version is built. Closing the board's issues one by one while reading the matching code. |
| **The decisions were not the owner's.** Six ADRs were proposed during the build without the owner's input. | Certain | Medium | They are marked "Proposed" until the owner reviews them (task A2). Each lists the options turned down, so changing one is a real choice. |
| **The real Gemini API behaves differently from the fake one.** | Medium | Low: the feature is optional | All Gemini code is in one file. The first real run is task D5. |
| **`node:sqlite` changes.** It is still marked experimental in Node 24. | Low | Low | Only two files use it. The Node version is stated in `package.json`. |
| **An AWS bill.** | Low if the guide is followed | Medium | A budget alert before creating anything. Serverless, pay-per-request parts only. A list of what costs money by surprise. |
| **Personal data is lost.** One SQLite file, no automatic backup. | Medium over a year | High | **Download all my data** on Home exports everything to one file. Do it now and then until hosting brings backups (v0.7). |
| **Too many looks and features to keep correct.** | Medium | Medium | Decide the look (B2) and remove the rest. Use the app daily and let that decide what the next version fixes. |
| **Real personal data reaches the public repository.** The owner's grades, bank and e-wallet records are in the local database. | Low | High: the repository is public | `backend/data/` is git-ignored; statement files and the scripts that read them stay outside the repository; tests use made-up numbers; commits name their paths. Before every push, search the unpushed changes for real values. |

## 5. Costs

| Item | Now | Later |
|---|---|---|
| Running the app | RM 0: it runs on the laptop | RM 0 on a serverless free tier at one user, if the guide's warnings are followed |
| Tools | RM 0: compiler, CMake, Node, Python, git | Android Studio is free |
| Gemini | RM 0 on the free tier, with a daily limit | The same |
| A domain name | Not needed | Optional, about RM 50 a year, only for a nicer address |
| Google Play | Not needed | A one-time developer fee, only if the app is ever published there. Installing it on your own phone needs no fee. |

## 6. What not to do next

- **Do not add features the owner has not asked for.** Each later version starts with an interview.
- **Do not move to the cloud to make the project look bigger.** Do it when using the app on the phone away from home is a real need.
- **Do not polish all four looks.** Pick one.
- **Do not let a second copy of a rule appear** outside the core, however small.

## 7. After release

At 1.0: two weeks of real daily use, then a retrospective (what went well, what did not, what to change), then a short case study for the portfolio. Good material already: the two grade scales that the first assumption got wrong, the bugs the tests found ([test plan](test-plan.md#6-bugs-found-and-how)), and a balance bug found by loading real bank statements.
