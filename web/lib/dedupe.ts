/**
 * Repeat detection. Same method as second-brain/data/check_repeat.py so the app
 * and the command line agree: normalize, build word shingles, compare overlap.
 *
 * This is the part that makes generated ideas worth anything. Seven already-posted
 * clips got packaged as new before this check existed.
 */

export function norm(t: string): string {
  return (t || "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function shingles(t: string, n = 4): Set<string> {
  const w = norm(t).split(" ").filter(Boolean);
  const out = new Set<string>();
  for (let i = 0; i <= w.length - n; i++) out.add(w.slice(i, i + n).join(" "));
  if (out.size === 0 && w.length) out.add(w.join(" "));
  return out;
}

export function overlap(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let hits = 0;
  for (const s of a) if (b.has(s)) hits++;
  return hits / Math.min(a.size, b.size);
}

/** Title-level similarity, which catches "Ranking X" vs "Ranking X Pt 2" style repeats. */
export function titleSimilarity(a: string, b: string): number {
  const wa = new Set(norm(a).split(" ").filter((w) => w.length > 2));
  const wb = new Set(norm(b).split(" ").filter((w) => w.length > 2));
  if (!wa.size || !wb.size) return 0;
  let hits = 0;
  for (const w of wa) if (wb.has(w)) hits++;
  return hits / Math.min(wa.size, wb.size);
}

export type Corpus = { label: string; text: string; kind: "posted" | "idea" }[];

export type Verdict = {
  keep: boolean;
  score: number;
  match?: string;
  kind?: string;
  reason?: string;
};

/**
 * Judge one generated idea against everything that exists.
 *  >= 0.60 title overlap, or >= 0.35 body overlap: it's a repeat, drop it.
 *  >= 0.40 title overlap: close enough to flag for a human.
 */
export function judge(
  idea: { title: string; body: string },
  corpus: Corpus
): Verdict {
  const ideaShingles = shingles(`${idea.title} ${idea.body}`);
  let worst: Verdict = { keep: true, score: 0 };

  for (const entry of corpus) {
    const t = titleSimilarity(idea.title, entry.label);
    const b = overlap(ideaShingles, shingles(entry.text));
    const score = Math.max(t, b);
    if (score <= worst.score) continue;

    worst = {
      keep: !(t >= 0.6 || b >= 0.35),
      score: Number(score.toFixed(2)),
      match: entry.label,
      kind: entry.kind,
      reason:
        t >= 0.6
          ? "title is effectively the same"
          : b >= 0.35
            ? "same argument, already covered"
            : t >= 0.4
              ? "close to an existing one, worth a look"
              : undefined,
    };
  }
  return worst;
}
