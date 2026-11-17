# Tools

## backlog_sync.py

Copies the [product backlog](../docs/01-requirements/product-backlog.md) to GitHub issues. The backlog file is the source: change a story there, not in the issue.

For every story it makes sure there is one issue with:

- a title that starts with the story ID, for example `ACA-01: Add a unit ...`
- the story, the acceptance criteria as tick boxes, and a link back to the backlog
- four labels: priority, size, module and epic
- a milestone for its release

It is safe to run many times. It only creates what is missing and changes what is different. It never closes or deletes an issue.

### First-time setup

1. Install the GitHub command-line tool: `winget install --id GitHub.cli`. Then close and reopen the terminal.
2. Log in: `gh auth login`. Choose GitHub.com, HTTPS, and log in with the browser as the repository owner.
3. Allow it to use projects: `gh auth refresh -s project`.
4. Make the board: `gh project create --owner YOUR-USER-NAME --title "Student companion backlog"`. It prints the project's number.
5. See what would happen: `python tools/backlog_sync.py --dry-run`.
6. Do it: `python tools/backlog_sync.py --project NUMBER --owner YOUR-USER-NAME`.

### Keeping it up to date

The workflow [backlog-sync.yml](../.github/workflows/backlog-sync.yml) runs the script each time the backlog file changes on `main`. It creates and updates issues.

It cannot put new issues on the board by itself, because the workflow's built-in login has no access to projects. Turn on the board's own rule for that: open the project, choose **Workflows**, then **Auto-add to project**, pick this repository, set the filter to `is:issue` and switch it on.
