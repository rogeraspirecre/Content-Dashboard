import fs from "fs";
import path from "path";
import { norm, shingles, overlap } from "./dedupe";
import { voiceGuide } from "./brain";
import { getDb, ASPIRE } from "./db";

/**
 * The transcript -> full suite pipeline. This is the daily workflow:
 * paste what Brandon said, get back everything needed to post it.
 *
 * Two hard rules, both enforced in code rather than trusted to the model:
 *  1. The repeat check runs BEFORE any tokens are spent. Several already-posted
 *     clips got packaged twice before this habit existed.
 *  2. The standing footer is appended verbatim from the markdown file. The model
 *     never writes it, so it can never drift.
 */

// On Render, CONTENT_ROOT points at the persistent disk instead.
const ROOT = process.env.CONTENT_ROOT ?? path.join(process.cwd(), "..");
const PACKAGES_DIR = path.join(ROOT, "outputs", "packages");
const SUBSCRIBE_LINE =
  "Subscribe for more commercial real estate breakdowns in plain English.";

/** The standing contact/bio block, verbatim from the second brain. */
export function footer(): string {
  const raw = fs.readFileSync(
    path.join(ROOT, "second-brain", "youtube-description-footer.md"),
    "utf8"
  );
  // The file opens with instructions to Roger/Claude; the block starts after ---.
  const i = raw.indexOf("---");
  return (i >= 0 ? raw.slice(i + 3) : raw).trim();
}

// ---------------------------------------------------------------- repeat check

export type RepeatMatch = {
  label: string;
  source: "transcript" | "package";
  score: number;
  verdict: "same clip" | "same argument";
};

/**
 * Same method and thresholds as second-brain/data/check_repeat.py:
 * >= 0.35 shingle overlap means the same clip, 0.20-0.35 the same argument.
 * The corpus is every stored transcript plus every package file on disk.
 */
export function checkTranscript(transcript: string): RepeatMatch[] {
  const incoming = shingles(transcript);
  const matches: RepeatMatch[] = [];

  const rows = getDb()
    .prepare(
      `SELECT t.body, COALESCE(v.title, 'untitled transcript #' || t.id) AS title
         FROM transcripts t LEFT JOIN videos v ON v.id = t.video_id
        WHERE t.client_id = ?`
    )
    .all(ASPIRE) as { body: string; title: string }[];

  for (const r of rows) {
    const score = overlap(incoming, shingles(r.body));
    if (score >= 0.2)
      matches.push({
        label: r.title,
        source: "transcript",
        score: Number(score.toFixed(2)),
        verdict: score >= 0.35 ? "same clip" : "same argument",
      });
  }

  let files: string[] = [];
  try {
    files = fs.readdirSync(PACKAGES_DIR).filter((f) => f.endsWith(".md"));
  } catch {
    files = [];
  }
  for (const f of files) {
    const body = fs.readFileSync(path.join(PACKAGES_DIR, f), "utf8");
    const score = overlap(incoming, shingles(body));
    if (score >= 0.2)
      matches.push({
        label: f.replace(/\.md$/, ""),
        source: "package",
        score: Number(score.toFixed(2)),
        verdict: score >= 0.35 ? "same clip" : "same argument",
      });
  }

  return matches.sort((a, b) => b.score - a.score).slice(0, 5);
}

// ---------------------------------------------------------------- the prompt

/** Stable across runs, so it caches. The transcript goes in the user message. */
export function suiteSystem(): string {
  return `You turn a raw clip transcript into a complete posting package for Brandon
Avedikian, a Houston commercial real estate broker and founder of Aspire Commercial.
Roger pastes the transcript of a clip Brandon already filmed; you produce everything
needed to post it. You never invent facts: every claim in the package must come from
the transcript. Clean up transcription garbles, never the substance.

HIS VOICE
${voiceGuide()}

THE PACKAGE
- 7 YouTube titles. Plain spoken, arguable, no colons-with-subtitle constructions,
  no clickbait that the clip doesn't pay off. Then name the best fit and say why in
  one sentence (and when a different title wins under a different edit, say that too).
- A YouTube description: 2-4 short paragraphs in Brandon's voice retelling the clip's
  argument in plain English. First person. No headers, no bullet lists, no hashtags.
  It must END with exactly this line: "${SUBSCRIBE_LINE}"
  Do not write anything after that line. The contact footer is appended by the system.
- 4-5 Instagram captions. One or two sentences each, no hashtags, no emoji. At least
  one should turn the clip into a standard the viewer can hold someone to. Name the
  best and why.
- 8 X posts. Standalone thoughts that work without the video. Vary the angle: the
  mechanism, the contrarian take, the number, the one-liner. Name the best and why.
- A cold open: which exact moment or line from the transcript the clip should open on,
  and why it is the most arguable or intriguing beat.
- The argument: 3-8 bullets summarizing what the clip actually says, for the record.
- Edit notes: transcription garbles to fix in captions, anything to bleep or confirm,
  compliance flags (names of real prospects or clients, profanity, claims that need a
  caveat), and sequencing advice if relevant. If there are none, say so in one note.

JUDGMENT
- North star is raw reach: titles and captions are judged on whether a stranger
  outside commercial real estate would stop for them.
- Never manufacture controversy, never flatten what made the clip specific.
- Choose the working title, lane and format honestly; they drive the library records.`;
}

// ---------------------------------------------------------------- persistence

export type Suite = {
  title: string;
  slug: string;
  format: string;
  lane: string;
  argument: string[];
  ytTitles: string[];
  bestTitle: string;
  bestTitleWhy: string;
  ytDescription: string;
  igCaptions: string[];
  bestCaption: string;
  bestCaptionWhy: string;
  xPosts: string[];
  bestPost: string;
  bestPostWhy: string;
  coldOpen: string;
  editNotes: string[];
};

/** The description the world sees: model text, subscribe line, verbatim footer. */
export function fullDescription(s: Suite): string {
  let d = s.ytDescription.trim();
  if (!d.endsWith(SUBSCRIBE_LINE)) d = `${d}\n\n${SUBSCRIBE_LINE}`;
  return `${d}\n\n${footer()}`;
}

/** Same markdown shape as the ~90 packages already in outputs/packages/. */
export function toMarkdown(s: Suite): string {
  const today = new Date().toISOString().slice(0, 10);
  return `# ${s.title}
Format: ${s.format} | Lane: ${s.lane} | Status: filmed, packaged ${today}

## Best picks
- **Title:** ${s.bestTitle}
- **IG caption:** ${s.bestCaption}
- **X post:** ${s.bestPost}
- **Cold open:** ${s.coldOpen}

## The argument
${s.argument.map((a) => `- ${a}`).join("\n")}

## YouTube titles
${s.ytTitles.map((t, i) => `${i + 1}. ${t}`).join("\n")}

**Best fit: ${s.bestTitle}.** ${s.bestTitleWhy}

## YouTube description
${fullDescription(s)}

## IG captions
${s.igCaptions.map((c, i) => `${i + 1}. ${c}`).join("\n")}

**Best: ${s.bestCaption}** ${s.bestCaptionWhy}

## X posts
${s.xPosts.map((p, i) => `${i + 1}. ${p}`).join("\n")}

**Best: ${s.bestPost}** ${s.bestPostWhy}

## EDIT NOTES
${s.editNotes.map((n) => `- ${n}`).join("\n")}
`;
}

/**
 * Write the markdown file and record the video, transcript and package in the
 * database, so the next repeat check and the Library see it immediately.
 */
export function saveSuite(s: Suite, transcript: string) {
  // Never overwrite an existing package file.
  let slug = s.slug.replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-") || "package";
  let file = path.join(PACKAGES_DIR, `${slug}.md`);
  for (let n = 2; fs.existsSync(file); n++) {
    file = path.join(PACKAGES_DIR, `${slug}-${n}.md`);
    if (!fs.existsSync(file)) slug = `${slug}-${n}`;
  }
  fs.writeFileSync(file, toMarkdown(s), "utf8");

  const db = getDb();
  const tx = db.transaction(() => {
    const video = db
      .prepare(
        `INSERT INTO videos (client_id, title, slug, status, lane, format, notes)
         VALUES (?, ?, ?, 'filmed', ?, ?, 'packaged in app')`
      )
      .run(ASPIRE, s.bestTitle, slug, s.lane, s.format);
    const videoId = Number(video.lastInsertRowid);

    db.prepare(
      `INSERT INTO transcripts (video_id, client_id, body, word_count, source)
       VALUES (?, ?, ?, ?, 'pasted')`
    ).run(videoId, ASPIRE, transcript, norm(transcript).split(" ").length);

    db.prepare(
      `INSERT INTO packages (video_id, client_id, slug, file_path, yt_titles,
         best_title, yt_description, ig_captions, best_caption, x_posts,
         best_post, clip_note, edit_notes, generated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'claude')`
    ).run(
      videoId,
      ASPIRE,
      slug,
      path.relative(ROOT, file),
      JSON.stringify(s.ytTitles),
      s.bestTitle,
      fullDescription(s),
      JSON.stringify(s.igCaptions),
      s.bestCaption,
      JSON.stringify(s.xPosts),
      s.bestPost,
      s.coldOpen,
      s.editNotes.join("\n")
    );
    return videoId;
  });

  return { slug, file: path.relative(ROOT, file), videoId: tx() };
}
