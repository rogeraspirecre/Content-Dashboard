-- Brandon Content system - SQLite schema
-- Multi-tenant from day one: Aspire is client 1, agency clients come later.
-- Prose (voice guide, playbook, ad briefs) stays in markdown. This holds what we count.

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------- tenancy
CREATE TABLE IF NOT EXISTS clients (
  id            INTEGER PRIMARY KEY,
  name          TEXT NOT NULL UNIQUE,
  kind          TEXT NOT NULL DEFAULT 'internal',   -- internal | client
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  name          TEXT,
  role          TEXT NOT NULL DEFAULT 'member',     -- owner | admin | member | client_viewer
  client_id     INTEGER REFERENCES clients(id),
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------- content
CREATE TABLE IF NOT EXISTS videos (
  id            INTEGER PRIMARY KEY,
  client_id     INTEGER NOT NULL REFERENCES clients(id),
  title         TEXT NOT NULL,
  slug          TEXT,
  platform      TEXT,                                -- youtube | instagram | tiktok | x | multi
  url           TEXT,
  status        TEXT NOT NULL DEFAULT 'idea',        -- idea | filmed | packaged | posted | retired
  lane          TEXT,                                -- broad_money | re_ranking | green_red | owner_ed | rapport | utility
  format        TEXT,                                -- ranking | rapid_fire | green_red | qa | explainer | this_or_that | call_footage
  posted_at     TEXT,
  length_sec    INTEGER,
  notes         TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_videos_client ON videos(client_id, status);
CREATE INDEX IF NOT EXISTS idx_videos_posted ON videos(posted_at);

CREATE TABLE IF NOT EXISTS transcripts (
  id            INTEGER PRIMARY KEY,
  video_id      INTEGER REFERENCES videos(id) ON DELETE CASCADE,
  client_id     INTEGER NOT NULL REFERENCES clients(id),
  body          TEXT NOT NULL,
  word_count    INTEGER,
  source        TEXT,                                -- pasted | import | scraper
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_transcripts_video ON transcripts(video_id);

-- Full text search powers the repeat checker.
CREATE VIRTUAL TABLE IF NOT EXISTS transcripts_fts USING fts5(
  body, content='transcripts', content_rowid='id', tokenize='porter'
);
CREATE TRIGGER IF NOT EXISTS transcripts_ai AFTER INSERT ON transcripts BEGIN
  INSERT INTO transcripts_fts(rowid, body) VALUES (new.id, new.body);
END;
CREATE TRIGGER IF NOT EXISTS transcripts_ad AFTER DELETE ON transcripts BEGIN
  INSERT INTO transcripts_fts(transcripts_fts, rowid, body) VALUES('delete', old.id, old.body);
END;
CREATE TRIGGER IF NOT EXISTS transcripts_au AFTER UPDATE ON transcripts BEGIN
  INSERT INTO transcripts_fts(transcripts_fts, rowid, body) VALUES('delete', old.id, old.body);
  INSERT INTO transcripts_fts(rowid, body) VALUES (new.id, new.body);
END;

CREATE TABLE IF NOT EXISTS packages (
  id            INTEGER PRIMARY KEY,
  video_id      INTEGER REFERENCES videos(id) ON DELETE SET NULL,
  client_id     INTEGER NOT NULL REFERENCES clients(id),
  slug          TEXT NOT NULL,
  file_path     TEXT,
  yt_titles     TEXT,                                -- JSON array
  best_title    TEXT,
  yt_description TEXT,
  ig_captions   TEXT,                                -- JSON array
  best_caption  TEXT,
  x_posts       TEXT,                                -- JSON array
  best_post     TEXT,
  clip_note     TEXT,
  edit_notes    TEXT,
  generated_by  TEXT,                                -- claude | human
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_packages_video ON packages(video_id);

-- Metrics are a time series, not a single number. One row per capture.
CREATE TABLE IF NOT EXISTS metrics (
  id            INTEGER PRIMARY KEY,
  video_id      INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  captured_at   TEXT NOT NULL DEFAULT (datetime('now')),
  platform      TEXT,
  views         INTEGER,
  likes         INTEGER,
  comments      INTEGER,
  shares        INTEGER,
  saves         INTEGER,
  avg_watch_sec REAL,
  UNIQUE(video_id, platform, captured_at)
);
CREATE INDEX IF NOT EXISTS idx_metrics_video ON metrics(video_id, captured_at);

-- ---------------------------------------------------------------- ideas
CREATE TABLE IF NOT EXISTS ideas (
  id            INTEGER PRIMARY KEY,
  client_id     INTEGER NOT NULL REFERENCES clients(id),
  batch         TEXT,
  title         TEXT NOT NULL,
  format        TEXT,
  lane          TEXT,
  body          TEXT,                                -- bullets / items, as written
  status        TEXT NOT NULL DEFAULT 'open',        -- open | filmed | posted | cut | retired
  verdicts      TEXT,                                -- what he graded on camera
  filmed_at     TEXT,
  video_id      INTEGER REFERENCES videos(id) ON DELETE SET NULL,
  source_file   TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ideas_status ON ideas(client_id, status);

-- ---------------------------------------------------------------- ads
CREATE TABLE IF NOT EXISTS properties (
  id            INTEGER PRIMARY KEY,
  client_id     INTEGER NOT NULL REFERENCES clients(id),
  name          TEXT NOT NULL,
  address       TEXT,
  kind          TEXT,                                -- office_condo | lease | retail | industrial
  brief_path    TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ad_accounts (
  id            INTEGER PRIMARY KEY,
  client_id     INTEGER NOT NULL REFERENCES clients(id),
  platform      TEXT NOT NULL,                       -- meta | google | linkedin
  external_id   TEXT,
  name          TEXT,
  UNIQUE(platform, external_id)
);

CREATE TABLE IF NOT EXISTS campaigns (
  id            INTEGER PRIMARY KEY,
  ad_account_id INTEGER REFERENCES ad_accounts(id) ON DELETE CASCADE,
  client_id     INTEGER NOT NULL REFERENCES clients(id),
  property_id   INTEGER REFERENCES properties(id) ON DELETE SET NULL,
  external_id   TEXT,
  name          TEXT NOT NULL,
  objective     TEXT,
  hook          TEXT,                                -- the callout line being tested
  hook_type     TEXT,                                -- size | area | business_type | pain | stacked
  status        TEXT,
  started_at    TEXT,
  ended_at      TEXT
);
CREATE INDEX IF NOT EXISTS idx_campaigns_client ON campaigns(client_id, status);

CREATE TABLE IF NOT EXISTS ad_metrics (
  id            INTEGER PRIMARY KEY,
  campaign_id   INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  date          TEXT NOT NULL,
  spend         REAL,
  impressions   INTEGER,
  clicks        INTEGER,
  leads         INTEGER,
  UNIQUE(campaign_id, date)
);
CREATE INDEX IF NOT EXISTS idx_ad_metrics_date ON ad_metrics(date);

-- Derived view so CPL/CPC/CPM are never recomputed by hand again.
CREATE VIEW IF NOT EXISTS v_campaign_performance AS
SELECT
  c.id            AS campaign_id,
  c.client_id,
  c.name,
  c.hook,
  c.hook_type,
  p.name          AS property,
  SUM(m.spend)       AS spend,
  SUM(m.impressions) AS impressions,
  SUM(m.clicks)      AS clicks,
  SUM(m.leads)       AS leads,
  ROUND(SUM(m.spend) / NULLIF(SUM(m.leads), 0), 2)                  AS cpl,
  ROUND(SUM(m.spend) / NULLIF(SUM(m.clicks), 0), 2)                 AS cpc,
  ROUND(SUM(m.spend) * 1000.0 / NULLIF(SUM(m.impressions), 0), 2)   AS cpm
FROM campaigns c
LEFT JOIN ad_metrics m ON m.campaign_id = c.id
LEFT JOIN properties p ON p.id = c.property_id
GROUP BY c.id;

-- Latest view count per video, for the dashboard.
CREATE VIEW IF NOT EXISTS v_video_latest AS
SELECT v.*, (
  SELECT m.views FROM metrics m
  WHERE m.video_id = v.id ORDER BY m.captured_at DESC LIMIT 1
) AS views
FROM videos v;
