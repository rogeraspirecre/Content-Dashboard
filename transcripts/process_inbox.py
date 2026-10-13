#!/usr/bin/env python3
"""Summarize every transcript in transcripts/inbox/ without loading full text into chat.

Usage:  python3 "Brandon Content/transcripts/process_inbox.py"

Prints one compact row per file: word count, est. runtime, topic guess, and the
opening line (the hook). Claude reads this summary instead of every transcript,
which keeps context (and cost) small. Full text stays on disk until needed.
"""
import os, re, glob, csv, sys

BASE = os.path.dirname(os.path.abspath(__file__))
INBOX = os.path.join(BASE, "inbox")

TOPIC_HINTS = [
    ("ranking",      r"\brank|tier|s tier|best to worst"),
    ("green/red",    r"green flag|red flag"),
    ("rich/mid/poor",r"rich.*middle.*poor|middle class"),
    ("versus",       r"\bversus\b|\bvs\b|would you rather"),
    ("Q&A",          r"^\s*(what|how|why|do you|did you|when)\b.*\?"),
    ("real estate",  r"broker|tenant|landlord|lease|vacan|cap rate|property manage"),
    ("careers",      r"\bjob|career|salary|degree|college|major"),
    ("business",     r"business owner|employee|hiring|payroll|founder"),
]

def topic_of(text):
    t = text.lower()
    hits = [name for name, pat in TOPIC_HINTS if re.search(pat, t, re.M)]
    return ", ".join(hits[:3]) if hits else "unclassified"

def clean(text):
    text = re.sub(r"^\d{2}:\d{2}:\d{2}[;:]\d{2}\s*$", "", text, flags=re.M)  # timecodes
    text = re.sub(r"^\s*[-–]\s*$", "", text, flags=re.M)
    text = re.sub(r"^\s*Speaker \d+\s*$", "", text, flags=re.M)
    return re.sub(r"\n{2,}", "\n", text).strip()

def main():
    files = sorted(glob.glob(os.path.join(INBOX, "*.txt")) + glob.glob(os.path.join(INBOX, "*.md")))
    if not files:
        print("Inbox is empty. Drop .txt transcripts in:", INBOX)
        return
    rows = []
    print(f"{'FILE':<42} {'WORDS':>6} {'~SEC':>5}  TOPIC")
    print("-" * 100)
    for f in files:
        raw = open(f, errors="ignore").read()
        body = clean(raw)
        words = len(body.split())
        secs = round(words / 2.5)          # ~150 wpm speaking pace
        name = os.path.basename(f)[:40]
        topic = topic_of(body)
        hook = " ".join(body.split()[:18])
        print(f"{name:<42} {words:>6} {secs:>5}  {topic}")
        print(f"    hook: {hook}...")
        rows.append({"file": os.path.basename(f), "words": words, "est_seconds": secs,
                     "topic": topic, "hook": hook})
    out = os.path.join(BASE, "inbox_summary.csv")
    with open(out, "w", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=["file", "words", "est_seconds", "topic", "hook"])
        w.writeheader(); w.writerows(rows)
    print("-" * 100)
    print(f"{len(rows)} transcripts. Summary written to {out}")

if __name__ == "__main__":
    main()
