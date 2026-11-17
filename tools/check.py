#!/usr/bin/env python3
"""Build everything and run every test, with one command.

    python tools/check.py            build the core, then run all five test suites
    python tools/check.py --save     also write the full output to docs/proofs/test-run.txt

It stops with exit code 1 if anything fails, so it can be used before a commit
and by other tools. It needs: a C++17 compiler, CMake, Python 3 and Node 22.13 or newer.
"""
import datetime
import os
import platform
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EXE = ".exe" if os.name == "nt" else ""
BUILD = ROOT / "core" / "build"
log = []


def say(text=""):
    print(text, flush=True)
    log.append(text)


def run(title, command, cwd=ROOT):
    """Runs one step, shows its output, and returns True if it worked."""
    say(f"\n=== {title} ===")
    say("$ " + " ".join(str(part) for part in command))
    done = subprocess.run(command, cwd=cwd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    output = (done.stdout + done.stderr).strip()
    # Node prints a warning that its built-in SQLite is still marked experimental. It is not a problem.
    output = "\n".join(line for line in output.splitlines() if "ExperimentalWarning" not in line and "--trace-warnings" not in line)
    say(output)
    say(f"--> {'ok' if done.returncode == 0 else 'FAILED'}")
    return done.returncode == 0


def main():
    # Node's test output uses symbols that an old Windows console cannot print. This keeps the script from stopping on them.
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    say(f"Check run on {datetime.date.today().isoformat()}, {platform.system()} {platform.machine()}")
    configure = ["cmake", "-S", "core", "-B", "core/build"]
    if shutil.which("ninja"):
        configure += ["-G", "Ninja"]

    steps = [
        ("Configure the C++ core", configure, ROOT),
        ("Build the C++ core", ["cmake", "--build", "core/build"], ROOT),
        ("Core: white-box tests and leak check", [str(BUILD / f"tracker_tests{EXE}")], ROOT),
        ("Core: black-box tests of the terminal program", [sys.executable, "core/tests/blackbox.py", str(BUILD / f"tracker{EXE}")], ROOT),
        ("Backend: rules and API tests (uses the real engine)", ["node", "--test"], ROOT / "backend"),
        ("Web: ViewModel tests", ["node", "--test"], ROOT / "web"),
    ]
    results = []
    for title, command, cwd in steps:
        ok = run(title, command, cwd)
        results.append((title, ok))
        if not ok and "core" in title.lower() and "test" not in title.lower():
            break       # nothing else can run without the core

    say("\n=== Summary ===")
    for title, ok in results:
        say(f"{'ok    ' if ok else 'FAILED'}  {title}")
    failed = [title for title, ok in results if not ok] or (["not every step ran"] if len(results) < len(steps) else [])
    say("\nEverything passed." if not failed else f"\n{len(failed)} step(s) failed.")

    if "--save" in sys.argv:
        target = ROOT / "docs" / "proofs" / "test-run.txt"
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text("\n".join(log) + "\n", encoding="utf-8", newline="\n")
        print(f"Saved to {target.relative_to(ROOT)}")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
