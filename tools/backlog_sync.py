#!/usr/bin/env python3
"""Copy the product backlog to GitHub issues.

The backlog file is the source. For each story in it, this script makes sure
there is one GitHub issue with the right title, text, labels and milestone.
It is safe to run again and again: it only creates what is missing and only
changes what is different. It never closes, reopens or deletes an issue.

It needs the GitHub command-line tool (gh), logged in to the repository.

    python tools/backlog_sync.py --dry-run             show what would happen, change nothing
    python tools/backlog_sync.py                       create and update the issues
    python tools/backlog_sync.py --project 1 --owner NAME
                                                       also put the issues on project number 1
"""
import argparse
import json
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BACKLOG = ROOT / "docs" / "01-requirements" / "product-backlog.md"
BACKLOG_PATH = "docs/01-requirements/product-backlog.md"

MODULES = {"ACA": "academics", "GPA": "gpa", "ENG": "engineering"}
STORY_ID = re.compile(r"^[A-Z]{3}-\d{2}$")

# Label colours, by the first word of the label name.
COLOURS = {"priority": "C2203D", "size": "0090A0", "module": "17694C", "epic": "F2A31B"}
DESCRIPTIONS = {
    "priority": "How much the release needs this story",
    "size": "Rough size: S under half a day, M about a day, L several days",
    "module": "The part of the app the story belongs to",
    "epic": "The larger piece of work the story is part of",
}


def read_stories():
    """Read every story row from the backlog file."""
    stories = []
    release = epic = None
    for line in BACKLOG.read_text(encoding="utf-8").splitlines():
        heading = re.match(r"^## Release (\d+\.\d+)(?:: (.+))?$", line)
        if heading:
            release = heading.group(1)
            epic = (heading.group(2) or "").strip().capitalize() or None
            continue
        if line.startswith("## "):          # any other section ends the release
            release = epic = None
            continue
        heading = re.match(r"^### Epic [A-Z]: (.+)$", line)
        if heading:
            epic = heading.group(1).strip()
            continue
        if not (release and line.startswith("|")):
            continue
        cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
        if len(cells) != 5 or not STORY_ID.match(cells[0]):
            continue
        story_id, story, criteria, priority, size = cells
        stories.append({
            "id": story_id, "story": story, "criteria": criteria,
            "priority": priority, "size": size, "release": release, "epic": epic,
        })
    return stories


def short_title(story):
    """Turn 'As a student, I want to add a unit, so that ...' into 'Add a unit'."""
    sentence = story["story"]
    found = re.search(r"I want (?:to )?(.+?),? so that", sentence)
    text = found.group(1) if found else sentence.rstrip(".")
    text = text[0].upper() + text[1:]
    return text if len(text) <= 90 else text[:87].rstrip() + "..."


def labels_for(story):
    return [
        "priority: " + story["priority"].lower(),
        "size: " + story["size"],
        "module: " + MODULES[story["id"][:3]],
        "epic: " + story["epic"].lower().replace(",", ""),   # GitHub does not allow commas in label names
    ]


def body_for(story, repo):
    """The text of the issue. Each acceptance criterion becomes a tick box."""
    criteria = re.split(r'(?<=[.?!])\s+(?=[A-Z"])', story["criteria"])
    link = f"https://github.com/{repo}/blob/main/{BACKLOG_PATH}"
    lines = [
        "**Story**", "", story["story"], "",
        "**Acceptance criteria**", "",
        *[f"- [ ] {item}" for item in criteria], "",
        "| Release | Epic | Priority | Size |", "|---|---|---|---|",
        f"| {story['release']} | {story['epic']} | {story['priority']} | {story['size']} |", "",
        "---",
        f"*This issue comes from [the product backlog]({link}). To change the story, edit that file. "
        "This text is written again each time the story changes there.*",
    ]
    return "\n".join(lines) + "\n"


def same_text(a, b):
    """Compare two issue texts, ignoring ticked boxes and line endings."""
    clean = lambda text: (text or "").replace("\r\n", "\n").replace("- [x]", "- [ ]").replace("- [X]", "- [ ]").strip()
    return clean(a) == clean(b)


def repo_from_git():
    url = subprocess.run(["git", "remote", "get-url", "origin"], cwd=ROOT, capture_output=True, text=True).stdout.strip()
    found = re.search(r"github\.com[:/](.+?)(?:\.git)?$", url)
    return found.group(1) if found else "OWNER/REPO"


def gh(*args):
    """Run one gh command and return what it printed."""
    done = subprocess.run(["gh", *args], cwd=ROOT, capture_output=True, text=True, encoding="utf-8")
    if done.returncode != 0:
        sys.exit(f"gh {' '.join(args[:3])} failed:\n{done.stderr.strip()}")
    return done.stdout.strip()


def with_body_file(text, action):
    """gh reads long text from a file, so write it to a short-lived one."""
    handle, path = tempfile.mkstemp(suffix=".md")
    try:
        with os.fdopen(handle, "w", encoding="utf-8", newline="\n") as out:
            out.write(text)
        return action(path)
    finally:
        os.remove(path)


def main():
    parser = argparse.ArgumentParser(description="Copy the product backlog to GitHub issues.")
    parser.add_argument("--dry-run", action="store_true", help="show what would happen and change nothing")
    parser.add_argument("--project", type=int, help="number of a GitHub project to put the issues on")
    parser.add_argument("--owner", help="who owns that project (your GitHub user name)")
    args = parser.parse_args()
    if args.project and not args.owner:
        parser.error("--project also needs --owner")

    stories = read_stories()
    if not stories:
        sys.exit(f"No stories found in {BACKLOG_PATH}. Has the table layout changed?")
    ids = [story["id"] for story in stories]
    repeated = sorted({i for i in ids if ids.count(i) > 1})
    if repeated:
        sys.exit("These story IDs appear more than once: " + ", ".join(repeated))

    repo = repo_from_git()
    print(f"{len(stories)} stories found in {BACKLOG_PATH}")

    if args.dry_run:
        for story in stories:
            print(f"  {story['id']}: {short_title(story)}")
            print(f"      Release {story['release']} | {', '.join(labels_for(story))}")
        print("Dry run: nothing was changed.")
        return

    repo = gh("repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner")

    # 1. Labels. --force means "create it, or update it if it is already there".
    for label in sorted({label for story in stories for label in labels_for(story)}):
        kind = label.split(":")[0]
        gh("label", "create", label, "--color", COLOURS[kind], "--description", DESCRIPTIONS[kind], "--force")

    # 2. One milestone for each release. The roadmap's milestones are named "v0.1 Terminal grade tracker" and so on;
    #    a release uses its "v0.1 ..." milestone when there is one, or gets a plain "Release 0.1" milestone.
    have = json.loads(gh("api", f"repos/{repo}/milestones?state=all&per_page=100", "--jq", "[.[].title]"))
    milestone_for = {}
    for release in sorted({story["release"] for story in stories}):
        named = next((t for t in have if t.startswith(f"v{release} ")), None)
        milestone_for[release] = named or f"Release {release}"
        if milestone_for[release] not in have:
            gh("api", f"repos/{repo}/milestones", "-f", f"title=Release {release}")
            print(f"  made milestone Release {release}")

    # 3. Issues. An issue belongs to a story when its title starts with the story ID.
    listed = json.loads(gh("issue", "list", "--state", "all", "--limit", "1000",
                           "--json", "number,title,body,labels,milestone,url"))
    by_id = {}
    for issue in listed:
        found = re.match(r"^([A-Z]{3}-\d{2}):", issue["title"])
        if found:
            by_id[found.group(1)] = issue

    made = changed = same = 0
    urls = []
    for story in stories:
        title = f"{story['id']}: {short_title(story)}"
        body = body_for(story, repo)
        labels = labels_for(story)
        milestone = milestone_for[story["release"]]
        issue = by_id.get(story["id"])

        if issue is None:
            label_args = [part for label in labels for part in ("--label", label)]
            url = with_body_file(body, lambda path: gh("issue", "create", "--title", title, "--body-file", path,
                                                       "--milestone", milestone, *label_args))
            urls.append(url.splitlines()[-1])
            made += 1
            print(f"  made    {title}")
            continue

        urls.append(issue["url"])
        current = {label["name"] for label in issue["labels"]}
        managed = {name for name in current if name.split(":")[0] in COLOURS}
        to_add = [label for label in labels if label not in current]
        to_remove = sorted(managed - set(labels))
        current_milestone = (issue.get("milestone") or {}).get("title")
        if issue["title"] == title and same_text(issue["body"], body) and not to_add and not to_remove \
                and current_milestone == milestone:
            same += 1
            continue
        edit = ["issue", "edit", str(issue["number"]), "--title", title, "--milestone", milestone]
        for label in to_add:
            edit += ["--add-label", label]
        for label in to_remove:
            edit += ["--remove-label", label]
        if same_text(issue["body"], body):
            gh(*edit)
        else:
            with_body_file(body, lambda path: gh(*edit, "--body-file", path))
        changed += 1
        print(f"  changed {title}")

    for story_id in sorted(set(by_id) - set(ids)):
        print(f"  note: issue #{by_id[story_id]['number']} ({story_id}) has no story in the backlog any more. It was left alone.")

    # 4. The project board, if one was named.
    if args.project:
        for url in urls:
            gh("project", "item-add", str(args.project), "--owner", args.owner, "--url", url)
        print(f"  {len(urls)} issues are on project {args.project}")

    print(f"Done: {made} made, {changed} changed, {same} already up to date.")


if __name__ == "__main__":
    main()
