import Database from "better-sqlite3";
import path from "path";

// The database lives one level up, beside the markdown second brain.
const DB_PATH = path.join(process.cwd(), "..", "db", "brandon.db");

let db: Database.Database | null = null;

export function getDb() {
  if (!db) {
    db = new Database(DB_PATH, { readonly: false });
    db.pragma("journal_mode = WAL");
  }
  return db;
}

export const ASPIRE = 1; // client_id for Aspire's own content

export type IdeaRow = {
  id: number;
  batch: string | null;
  title: string;
  format: string | null;
  lane: string | null;
  body: string | null;
  status: string;
  verdicts?: string | null;
};

/** Everything already posted. The generator must not repeat any of it. */
export function postedTitles(): string[] {
  return getDb()
    .prepare(
      `SELECT DISTINCT title FROM videos
       WHERE client_id = ? AND title != '' ORDER BY title`
    )
    .all(ASPIRE)
    .map((r: any) => r.title.replace(/\s+/g, " ").trim());
}

/** Everything already planned, filmed or cut. Same rule. */
export function existingIdeas(): IdeaRow[] {
  return getDb()
    .prepare(
      `SELECT id, batch, title, format, lane, body, status FROM ideas
       WHERE client_id = ? ORDER BY id`
    )
    .all(ASPIRE) as IdeaRow[];
}

/** Lane performance, so the model proposes into lanes that actually work. */
export function lanePerformance() {
  return getDb()
    .prepare(
      `SELECT v.title, m.views
       FROM videos v
       JOIN metrics m ON m.video_id = v.id
       WHERE v.client_id = ? AND m.views IS NOT NULL
       ORDER BY m.views DESC
       LIMIT 40`
    )
    .all(ASPIRE) as { title: string; views: number }[];
}

export function saveIdeas(
  ideas: { title: string; format: string; lane: string; body: string }[],
  batch: string
) {
  const stmt = getDb().prepare(
    `INSERT INTO ideas (client_id, batch, title, format, lane, body, status, source_file)
     VALUES (?, ?, ?, ?, ?, ?, 'open', 'generated')`
  );
  const tx = getDb().transaction((rows: typeof ideas) => {
    for (const r of rows) stmt.run(ASPIRE, batch, r.title, r.format, r.lane, r.body);
  });
  tx(ideas);
  return ideas.length;
}

// ---------------------------------------------------------------- read screens

export type VideoRow = {
  id: number;
  title: string;
  status: string;
  lane: string | null;
  format: string | null;
  posted_at: string | null;
  views: number | null;
  package_slug: string | null;
};

export function libraryRows(limit = 400): VideoRow[] {
  return getDb()
    .prepare(
      `SELECT v.id, v.title, v.status, v.lane, v.format, v.posted_at,
              (SELECT m.views FROM metrics m WHERE m.video_id = v.id
                ORDER BY m.captured_at DESC LIMIT 1) AS views,
              (SELECT p.slug FROM packages p WHERE p.video_id = v.id LIMIT 1) AS package_slug
         FROM videos v
        WHERE v.client_id = ?
        ORDER BY (v.posted_at IS NULL) DESC, v.posted_at DESC, views DESC
        LIMIT ?`
    )
    .all(ASPIRE, limit) as VideoRow[];
}

export function libraryCounts() {
  const db = getDb();
  const one = (sql: string, ...args: any[]) =>
    (db.prepare(sql).get(...args) as any)?.n ?? 0;
  return {
    videos: one(`SELECT COUNT(*) n FROM videos WHERE client_id = ?`, ASPIRE),
    posted: one(`SELECT COUNT(*) n FROM videos WHERE client_id = ? AND status = 'posted'`, ASPIRE),
    filmed: one(`SELECT COUNT(*) n FROM videos WHERE client_id = ? AND status = 'filmed'`, ASPIRE),
    packages: one(`SELECT COUNT(*) n FROM packages WHERE client_id = ?`, ASPIRE),
    transcripts: one(`SELECT COUNT(*) n FROM transcripts WHERE client_id = ?`, ASPIRE),
    openIdeas: one(`SELECT COUNT(*) n FROM ideas WHERE client_id = ? AND status = 'open'`, ASPIRE),
  };
}

export function ideaRows(status?: string): IdeaRow[] {
  const db = getDb();
  return status
    ? (db
        .prepare(
          `SELECT id,batch,title,format,lane,body,status,verdicts FROM ideas
            WHERE client_id = ? AND status = ? ORDER BY id DESC LIMIT 300`
        )
        .all(ASPIRE, status) as IdeaRow[])
    : (db
        .prepare(
          `SELECT id,batch,title,format,lane,body,status,verdicts FROM ideas
            WHERE client_id = ? ORDER BY id DESC LIMIT 300`
        )
        .all(ASPIRE) as IdeaRow[]);
}

/** Median is the honest centre for view data; the mean is distorted by the 1M+ outliers. */
export function performance() {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT v.title, v.posted_at,
              (SELECT m.views FROM metrics m WHERE m.video_id = v.id
                ORDER BY m.captured_at DESC LIMIT 1) AS views
         FROM videos v
        WHERE v.client_id = ? AND v.status = 'posted'`
    )
    .all(ASPIRE) as { title: string; posted_at: string | null; views: number | null }[];

  const withViews = rows.filter((r) => typeof r.views === "number") as {
    title: string;
    posted_at: string | null;
    views: number;
  }[];
  const sorted = [...withViews].sort((a, b) => a.views - b.views);
  const median = sorted.length
    ? sorted[Math.floor(sorted.length / 2)].views
    : 0;

  return {
    count: withViews.length,
    median,
    top: [...withViews].sort((a, b) => b.views - a.views).slice(0, 12),
    // Monthly medians show whether the mix is drifting toward the narrow lanes.
    byMonth: Object.entries(
      withViews.reduce<Record<string, number[]>>((acc, r) => {
        const k = (r.posted_at ?? "").slice(0, 7);
        if (!k) return acc;
        (acc[k] ||= []).push(r.views);
        return acc;
      }, {})
    )
      .map(([month, vals]) => {
        const s = [...vals].sort((a, b) => a - b);
        return { month, count: vals.length, median: s[Math.floor(s.length / 2)] };
      })
      .sort((a, b) => a.month.localeCompare(b.month)),
  };
}
