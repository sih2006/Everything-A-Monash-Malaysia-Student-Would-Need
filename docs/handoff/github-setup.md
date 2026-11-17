# GitHub: pushing the work, CI and the project board

Everything in this guide needs your GitHub login, so an AI agent cannot do it for you. It takes about 20 minutes the first time.

## Where the work is now

All the work is committed on your laptop. **None of it is on GitHub yet.** There are four branches, each built on top of the one before:

| Order | Branch | What it holds |
|---|---|---|
| 1 | `docs/engineering-principles` | Engineering principles, ADR-0001, the capability map updates, the first backlog |
| 2 | `feat/prototype` | The clickable design prototype |
| 3 | `chore/backlog-board` | The updated backlog and the script that copies it to GitHub issues |
| 4 | `feat/app` | The real app: C++ core, backend, web app, CI, documents |

## Part 1: check which account git uses

In the project folder:

```
git config user.name
git config user.email
```

They should show `sih2006` and the email of your `sih2006` GitHub account. If the email is not saved in that account (GitHub, Settings, Emails), your commits will not link to your profile.

Some older commits on these branches carry the Monash email. If you want every commit to show your account, ask an agent: "rewrite the author on the unpushed commits to my current git name and email". Do this **before** pushing; after pushing it is much harder.

## Part 2: install the GitHub tool and log in

```
winget install --id GitHub.cli
```

Close and reopen the terminal, then:

```
gh auth login
```

Choose GitHub.com, HTTPS, "Login with a web browser", and log in as `sih2006`.

## Part 3: push and merge, one branch at a time

Do this in order. For each of the four branches in the table:

1. Push it:
   ```
   git push -u origin BRANCH-NAME
   ```
2. Open a pull request into `main`:
   ```
   gh pr create --base main --head BRANCH-NAME --fill
   ```
3. Open the link it prints, read the changes, and press **Merge pull request**. Choose **Create a merge commit**. Do not choose "Squash" for these: the later branches are built on these exact commits, and squashing would make the next pull request show changes that are already merged.
4. Move on to the next branch.

After the fourth one, update your laptop:

```
git switch main
git pull
```

## Part 4: check that CI is green

The first time `feat/app` is pushed, GitHub runs the tests on its own machines. Open the repository on GitHub and click the **Actions** tab.

- A green tick means every test passed there too.
- A red cross means something failed on Linux that passed on Windows. **This workflow has never run before**, so that is possible. Open the failed run, copy the red part of the log, and give it to an agent with: "CI failed with this output. Fix it and check it locally first."

Then protect `main` so nothing can be merged while tests fail: repository **Settings**, **Branches**, **Add branch ruleset** (or "Add rule"), pick `main`, and turn on **Require status checks to pass** with the check named `test`.

## Part 5: the project board

The backlog can be copied to GitHub issues and shown on a public board.

1. Allow the tool to use projects:
   ```
   gh auth refresh -s project
   ```
2. Create the board. It prints a number; remember it:
   ```
   gh project create --owner sih2006 --title "Student companion backlog"
   ```
3. See what would be created. This changes nothing:
   ```
   python tools/backlog_sync.py --dry-run
   ```
4. Create the issues and put them on the board (use your number in place of `1`):
   ```
   python tools/backlog_sync.py --project 1 --owner sih2006
   ```
5. On GitHub, open the board (your profile, **Projects**). In its menu choose **Settings** and set the visibility to **Public**.
6. Still on the board, open **Workflows**, choose **Auto-add to project**, pick this repository, set the filter to `is:issue`, and turn it on. New issues then appear on the board by themselves.

From then on, whenever the backlog file changes on `main`, the workflow `backlog-sync.yml` updates the issues.

## Part 6: mark what is already done

The script creates every story as an open issue. Much of release 0.1 is already built. To close the finished ones, ask an agent: "close the GitHub issues for the stories that docs/03-plan/test-plan.md marks as passing". Or close them by hand as you review each one, which is a good way to learn the code.
