#!/usr/bin/env python3
"""Pull the live Google Sheet into the second brain, then rebuild the database.

    python3 "Brandon Content/second-brain/data/sync_sheet.py"
    python3 .../sync_sheet.py --dry-run     # show what would change, write nothing

The sheet is the source of truth for posted content and performance. This script
replaces content-database.csv with the live export, reports what changed, and
rebuilds db/brandon.db so the repeat checker and the app see current data.

Requires the sheet to stay link-shared (view access). If that's ever turned off,
switch to a Google service account with the sheet shared to its address.
"""
import csv, io, os, shutil, subprocess, sys, datetime

SHEET_ID = "1pZlpmreVPZn7nH7yQBXUeSvqiuAqUJEyls-SHj7UpGo"
URL = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=csv&gid=0"

BASE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CSV_PATH = os.path.join(BASE, "second-brain", "data", "content-database.csv")
BACKUP_DIR = os.path.join(BASE, "second-brain", "data", "backups")


def norm_title(t):
    return " ".join((t or "").split()).lower()


def to_int(s):
    try:
        return int(float(str(s).replace(",", "").strip()))
    except (TypeError, ValueError):
        return None


def load(path_or_text, is_text=False):
    f = io.StringIO(path_or_text) if is_text else open(
        path_or_text, newline="", encoding="utf-8", errors="ignore")
    rows = list(csv.DictReader(f))
    f.close()
    return rows


def main():
    dry = "--dry-run" in sys.argv

    print("Fetching the live sheet...")
    # curl rather than urllib: the python.org build on macOS ships without the
    # system root certificates, so urllib fails SSL verification on this machine.
    proc = subprocess.run(
        ["curl", "-sL", "--fail", "--max-time", "90", URL],
        capture_output=True)
    if proc.returncode != 0:
        print("Could not fetch the sheet. Is it still link-shared?")
        print(proc.stderr.decode("utf-8", errors="ignore")[:300])
        return 1
    fetched = proc.stdout.decode("utf-8", errors="ignore")
    new_rows = load(fetched, is_text=True)
    if not new_rows:
        print("The sheet came back empty. Nothing written.")
        return 1

    old_rows = load(CSV_PATH) if os.path.exists(CSV_PATH) else []

    old_by_title = {}
    for r in old_rows:
        t = norm_title(r.get("Title"))
        if t:
            old_by_title[t] = r

    added, view_changes = [], []
    for r in new_rows:
        t = norm_title(r.get("Title"))
        if not t:
            continue
        prev = old_by_title.get(t)
        if prev is None:
            added.append(r)
        else:
            a, b = to_int(prev.get("Views")), to_int(r.get("Views"))
            if a is not None and b is not None and b != a:
                view_changes.append((r.get("Title", "").strip(), a, b))

    print(f"\nsheet rows   : {len(new_rows)}")
    print(f"local rows   : {len(old_rows)}")
    print(f"new videos   : {len(added)}")
    print(f"view updates : {len(view_changes)}")

    if added:
        print("\nNew since the last sync:")
        for r in added[:25]:
            v = (r.get("Views") or "").strip() or "—"
            print(f"  {v:>12}  {(r.get('Title') or '').strip()[:66]}")
        if len(added) > 25:
            print(f"  ... and {len(added) - 25} more")

    if view_changes:
        biggest = sorted(view_changes, key=lambda x: -(x[2] - x[1]))[:10]
        print("\nBiggest view gains:")
        for title, a, b in biggest:
            print(f"  +{b - a:>10,}  {title[:58]}  ({a:,} -> {b:,})")

    if dry:
        print("\nDry run. Nothing written.")
        return 0

    if os.path.exists(CSV_PATH):
        os.makedirs(BACKUP_DIR, exist_ok=True)
        stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M")
        shutil.copy2(CSV_PATH, os.path.join(BACKUP_DIR, f"content-database-{stamp}.csv"))

    with open(CSV_PATH, "w", encoding="utf-8", newline="") as f:
        f.write(fetched)
    print(f"\nWrote {CSV_PATH}")

    ingest = os.path.join(BASE, "db", "ingest.py")
    if os.path.exists(ingest):
        print("Rebuilding the database...")
        subprocess.run([sys.executable, ingest, "--reset"], check=False)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
