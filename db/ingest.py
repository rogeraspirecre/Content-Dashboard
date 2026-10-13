#!/usr/bin/env python3
"""Load the existing second brain into SQLite.

    python3 db/ingest.py            # build/refresh db/brandon.db
    python3 db/ingest.py --reset    # wipe and rebuild from the files

Sources: content-database.csv (posted videos + transcripts + views),
outputs/packages/*.md (content packages), topic-backlog.md (ideas),
pipeline.csv (filmed-not-posted), second-brain/ads/*.md (properties).

The markdown files stay the source of truth for prose. This gives us the
countable layer: filtering, joins, time series, and the repeat checker.
"""
import csv, json, os, re, sqlite3, sys, glob, datetime

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB = os.path.join(BASE, "db", "brandon.db")
SCHEMA = os.path.join(BASE, "db", "schema.sql")


def parse_date(s):
    s = (s or "").strip()
    for fmt in ("%b %d, %Y", "%m/%d/%Y", "%Y-%m-%d", "%m/%d/%y"):
        try:
            return datetime.datetime.strptime(s, fmt).date().isoformat()
        except ValueError:
            pass
    return None


def to_int(s):
    try:
        return int(float(str(s).replace(",", "").strip()))
    except (TypeError, ValueError):
        return None


def connect(reset=False):
    if reset and os.path.exists(DB):
        os.remove(DB)
    con = sqlite3.connect(DB)
    con.row_factory = sqlite3.Row
    con.executescript(open(SCHEMA).read())
    return con


def client_id(con, name="Aspire Commercial", kind="internal"):
    con.execute("INSERT OR IGNORE INTO clients(name, kind) VALUES (?,?)", (name, kind))
    return con.execute("SELECT id FROM clients WHERE name=?", (name,)).fetchone()["id"]


# ------------------------------------------------------------------ sources
def load_videos(con, cid):
    path = os.path.join(BASE, "second-brain/data/content-database.csv")
    n_v = n_t = n_m = 0
    for r in csv.DictReader(open(path, newline="", encoding="utf-8", errors="ignore")):
        title = (r.get("Title") or "").strip().replace("\r", " ").replace("\n", " ")
        if not title:
            continue
        posted = parse_date(r.get("Date Posted"))
        views = to_int(r.get("Views"))
        length = to_int(r.get("Length"))
        cur = con.execute(
            """INSERT INTO videos(client_id,title,platform,status,posted_at,length_sec)
               VALUES (?,?,?,?,?,?)""",
            (cid, title, "youtube", "posted" if posted else "filmed", posted, length))
        vid = cur.lastrowid
        n_v += 1
        body = (r.get("Transcript") or "").strip()
        if len(body.split()) >= 10:
            con.execute(
                """INSERT INTO transcripts(video_id,client_id,body,word_count,source)
                   VALUES (?,?,?,?,?)""", (vid, cid, body, len(body.split()), "import"))
            n_t += 1
        if views is not None:
            con.execute(
                """INSERT OR IGNORE INTO metrics(video_id,captured_at,platform,views)
                   VALUES (?,?,?,?)""", (vid, posted or datetime.date.today().isoformat(),
                                         "youtube", views))
            n_m += 1
    return n_v, n_t, n_m


def load_pipeline(con, cid):
    path = os.path.join(BASE, "second-brain/pipeline.csv")
    n = 0
    if not os.path.exists(path):
        return 0
    for r in csv.DictReader(open(path, newline="", encoding="utf-8", errors="ignore")):
        title = (r.get("topic") or r.get("Topic") or "").strip()
        if not title:
            continue
        exists = con.execute("SELECT id FROM videos WHERE lower(title)=lower(?)", (title,)).fetchone()
        if exists:
            continue
        con.execute(
            """INSERT INTO videos(client_id,title,status,lane,format,notes)
               VALUES (?,?,?,?,?,?)""",
            (cid, title, (r.get("status") or "filmed").strip().lower(),
             (r.get("lane") or "").strip(), (r.get("format") or "").strip(),
             (r.get("notes") or "").strip()))
        n += 1
    return n


SECTIONS = {
    "yt_titles": r"## YouTube titles\n(.*?)(?=\n## |\Z)",
    "yt_description": r"## YouTube description\n(.*?)(?=\n## |\Z)",
    "ig_captions": r"## IG captions\n(.*?)(?=\n## |\Z)",
    "x_posts": r"## X posts\n(.*?)(?=\n## |\Z)",
    "edit_notes": r"## EDIT NOTES\n(.*?)(?=\n## |\Z)",
}


def numbered(block):
    return [re.sub(r"^\d+\.\s*", "", ln).strip()
            for ln in (block or "").split("\n") if re.match(r"^\d+\.", ln.strip())]


def load_packages(con, cid):
    n = 0
    for f in sorted(glob.glob(os.path.join(BASE, "outputs/packages/*.md"))):
        txt = open(f, encoding="utf-8").read()
        slug = os.path.splitext(os.path.basename(f))[0]
        title = txt.split("\n", 1)[0].lstrip("# ").strip()
        got = {k: (re.search(p, txt, re.S).group(1).strip() if re.search(p, txt, re.S) else "")
               for k, p in SECTIONS.items()}
        best_title = re.search(r"\*\*Best fit:\s*([^*\n.]+)", txt)
        best_cap = re.search(r"- \*\*IG caption:\*\*\s*(.+)", txt)
        best_post = re.search(r"- \*\*X post:\*\*\s*(.+)", txt)
        clip = re.search(r"- \*\*Cold open:\*\*\s*(.+)", txt)
        vid = con.execute("SELECT id FROM videos WHERE lower(title)=lower(?)", (title,)).fetchone()
        con.execute(
            """INSERT INTO packages(video_id,client_id,slug,file_path,yt_titles,best_title,
               yt_description,ig_captions,best_caption,x_posts,best_post,clip_note,edit_notes,generated_by)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (vid["id"] if vid else None, cid, slug, os.path.relpath(f, BASE),
             json.dumps(numbered(got["yt_titles"])),
             best_title.group(1).strip() if best_title else None,
             got["yt_description"],
             json.dumps(numbered(got["ig_captions"])),
             best_cap.group(1).strip() if best_cap else None,
             json.dumps(numbered(got["x_posts"])),
             best_post.group(1).strip() if best_post else None,
             clip.group(1).strip() if clip else None,
             got["edit_notes"], "claude"))
        n += 1
    return n


def load_ideas(con, cid):
    """Backlog headings become ideas. Body is kept verbatim; [FILMED] sets status."""
    path = os.path.join(BASE, "second-brain/topic-backlog.md")
    txt = open(path, encoding="utf-8").read()
    lines = txt.split("\n")
    batch, cur, buf, n = None, None, [], 0

    def flush():
        nonlocal cur, buf, n
        if not cur:
            return
        body = "\n".join(buf).strip()
        filmed = bool(re.search(r"\[(FILMED|ALREADY POSTED|PARTIALLY ANSWERED)", cur + body, re.I))
        con.execute(
            """INSERT INTO ideas(client_id,batch,title,body,status,verdicts,source_file)
               VALUES (?,?,?,?,?,?,?)""",
            (cid, batch, re.sub(r"\s*\[.*?\]\s*", " ", cur).strip()[:300], body,
             "filmed" if filmed else "open", body if filmed else None,
             "second-brain/topic-backlog.md"))
        n += 1
        cur, buf = None, []

    for ln in lines:
        if re.match(r"^## Batch |^## Real estate batch|^## Q&A|^## Green/Red|^## This or That", ln):
            flush()
            batch = ln.lstrip("# ").strip()
            continue
        if re.match(r"^#{2,3} ", ln):
            flush()
            cur = ln.lstrip("# ").strip()
            continue
        if cur:
            buf.append(ln)
    flush()
    return n


def load_properties(con, cid):
    n = 0
    for f in sorted(glob.glob(os.path.join(BASE, "second-brain/ads/*.md"))):
        txt = open(f, encoding="utf-8").read()
        name = txt.split("\n", 1)[0].replace("# Ad Brief:", "").strip()
        addr = re.search(r"(\d{3,5}[^,\n]{3,60},\s*[A-Za-z ]+,?\s*(TX|Texas)[^\n]*)", txt)
        con.execute(
            """INSERT INTO properties(client_id,name,address,brief_path) VALUES (?,?,?,?)""",
            (cid, name, addr.group(1).strip() if addr else None, os.path.relpath(f, BASE)))
        n += 1
    return n


def main():
    reset = "--reset" in sys.argv
    con = connect(reset=reset)
    cid = client_id(con)
    v, t, m = load_videos(con, cid)
    p = load_pipeline(con, cid)
    pk = load_packages(con, cid)
    i = load_ideas(con, cid)
    pr = load_properties(con, cid)
    con.commit()

    print(f"client            : Aspire Commercial (id {cid})")
    print(f"videos (posted)   : {v}")
    print(f"videos (pipeline) : +{p}")
    print(f"transcripts       : {t}")
    print(f"metric rows       : {m}")
    print(f"packages          : {pk}")
    print(f"ideas             : {i}")
    print(f"properties        : {pr}")
    print(f"\ndb: {DB}")
    con.close()


if __name__ == "__main__":
    main()
