#!/usr/bin/env python3
"""Has this transcript already been posted or packaged?

Run BEFORE packaging any transcript Roger pastes.

    python3 "Brandon Content/second-brain/data/check_repeat.py" transcript.txt
    pbpaste | python3 "Brandon Content/second-brain/data/check_repeat.py"

Compares 5-word shingles against every transcript in content-database.csv and
every saved package in outputs/packages/. Anything over 0.35 is almost certainly
the same clip; 0.20-0.35 means same argument, different take.
"""
import csv, os, re, sys, glob

BASE = "/Users/rogerrodulfo/Code/Brandon Content"
CSV = os.path.join(BASE, "second-brain/data/content-database.csv")
PKG = os.path.join(BASE, "outputs/packages")


def norm(t):
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9 ]", " ", (t or "").lower())).strip()


def grams(t, n=5):
    w = norm(t).split()
    return {" ".join(w[i:i + n]) for i in range(max(0, len(w) - n + 1))}


def score(a, b):
    if not a or not b:
        return 0.0
    return len(a & b) / max(1, min(len(a), len(b)))


def main():
    text = open(sys.argv[1], encoding="utf-8", errors="ignore").read() if len(sys.argv) > 1 else sys.stdin.read()
    g = grams(text)
    if len(norm(text).split()) < 20:
        print("Transcript too short to check reliably.")
        return

    hits = []
    for r in csv.DictReader(open(CSV, newline="", encoding="utf-8", errors="ignore")):
        s = score(g, grams(r.get("Transcript") or ""))
        if s >= 0.15:
            hits.append((s, "POSTED", (r.get("Title") or "").strip().replace("\r", " "),
                         f"{(r.get('Views') or '').strip()} views, {(r.get('Date Posted') or '').strip()}"))

    for f in glob.glob(os.path.join(PKG, "*.md")):
        txt = open(f, encoding="utf-8").read()
        m = re.search(r"## YouTube description\n(.*?)\nSubscribe for more", txt, re.S)
        s = score(g, grams(m.group(1) if m else txt))
        if s >= 0.15:
            hits.append((s, "PACKAGED", os.path.basename(f), ""))

    if not hits:
        print("No match. Nothing posted or packaged looks like this. Safe to package as new.")
        return

    hits.sort(reverse=True)
    top = hits[0][0]
    verdict = ("SAME CLIP - already out there. Package it as a repost, not as new."
               if top >= 0.35 else
               "SAME ARGUMENT, different take. Check before posting so it doesn't read as a rerun."
               if top >= 0.20 else "Weak overlap. Probably fine, skim the top hit.")
    print(f"{verdict}\n")
    for s, kind, title, extra in hits[:8]:
        print(f"  {s:.2f}  [{kind}] {title}" + (f"  ({extra})" if extra else ""))

    print("\nNOTE: content-database.csv is only as current as its last export. Anything posted "
          "after that date cannot be detected here.")


if __name__ == "__main__":
    main()
