"use client";

import { useState } from "react";

type Verdict = { keep: boolean; score: number; match?: string; kind?: string; reason?: string };
type Idea = {
  title: string;
  format: string;
  lane: string;
  bullets: string[];
  why: string;
  verdict: Verdict;
};
type Result = {
  batch: string;
  generated: number;
  kept: Idea[];
  dropped: Idea[];
  checkedAgainst: { posted: number; backlog: number };
  usage: { input: number; cached: number; output: number };
  error?: string;
};

const LANES = [
  ["", "Any lane"],
  ["broad_money", "Broad money and career"],
  ["re_ranking", "Real estate ranking"],
  ["green_red", "Green flag / red flag"],
  ["owner_education", "Owner education"],
  ["rapport", "Rapport"],
  ["tax", "Tax"],
];

const FORMATS = [
  ["", "Any format"],
  ["ranking", "Ranking"],
  ["rapid_fire", "Rapid fire"],
  ["green_red_flag", "Green / red flag"],
  ["qa", "Q&A"],
  ["explainer", "Explainer"],
  ["this_or_that", "This or that"],
  ["overrated_underrated", "Overrated / underrated"],
  ["insider_numbers", "Insider numbers"],
  ["story", "Story"],
];

function IdeaCard({ idea, dropped }: { idea: Idea; dropped?: boolean }) {
  const near = !dropped && idea.verdict?.reason;
  return (
    <article className={`idea${dropped ? " dropped" : ""}`}>
      <h3>{idea.title}</h3>
      <div className="tags">
        <span className="tag lane">{idea.lane.replace(/_/g, " ")}</span>
        <span className="tag">{idea.format.replace(/_/g, " ")}</span>
        {near && <span className="tag near">{idea.verdict.reason}</span>}
        {dropped && (
          <span className="tag near">
            {idea.verdict.reason} &middot; {idea.verdict.match}
          </span>
        )}
      </div>
      <ol>
        {idea.bullets.map((b, i) => (
          <li key={i}>{b}</li>
        ))}
      </ol>
      {idea.why && <p className="why">{idea.why}</p>}
    </article>
  );
}

export default function Page() {
  const [count, setCount] = useState(10);
  const [lane, setLane] = useState("");
  const [format, setFormat] = useState("");
  const [brief, setBrief] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count, lane, format, brief }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Something went wrong.");
      else setResult(data);
    } catch (e: any) {
      setError(e.message ?? "Request failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="wrap">
      <div className="head">
        <div>
          <p className="kicker">Client focused. Content driven.</p>
          <h1>Generate ideas</h1>
          <p>
            Every idea is checked against the full library and the backlog before you see it.
          </p>
        </div>
      </div>

      <section className="panel">
        <div className="ph">
          <h2>What do you want</h2>
          <span className="meta">Opus 5.5</span>
        </div>
        <div className="pb">
          <div className="controls">
            <select
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              aria-label="How many ideas"
            >
              {[5, 10, 15, 20, 30].map((n) => (
                <option key={n} value={n}>
                  {n} ideas
                </option>
              ))}
            </select>
            <select value={lane} onChange={(e) => setLane(e.target.value)} aria-label="Lane">
              {LANES.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              aria-label="Format"
            >
              {FORMATS.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            <button className="btn" onClick={generate} disabled={busy}>
              {busy ? "Thinking..." : "Generate"}
            </button>
          </div>
          <textarea
            style={{ marginTop: 10 }}
            placeholder="Anything specific? e.g. we're filming at a smash room, or lean into tax"
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
          />
          <p className="hint" style={{ marginTop: 8 }}>
            Bullets come back ordered by broad appeal and contrarian potential. The first
            bullet is the cold open.
          </p>
          {error && (
            <p className="err" style={{ marginTop: 12 }}>
              {error}
            </p>
          )}
        </div>
      </section>

      {result && (
        <>
          <div className="head" style={{ marginTop: 28 }}>
            <div>
              <h1 style={{ fontSize: 17 }}>
                {result.kept.length} new {result.kept.length === 1 ? "idea" : "ideas"}
              </h1>
              <p>
                Saved to the backlog as &ldquo;{result.batch}&rdquo;. Checked against{" "}
                {result.checkedAgainst.posted} posted videos and{" "}
                {result.checkedAgainst.backlog} existing ideas.
              </p>
            </div>
          </div>
          {result.kept.map((idea, i) => (
            <IdeaCard key={i} idea={idea} />
          ))}

          {result.dropped.length > 0 && (
            <>
              <div className="head" style={{ marginTop: 28 }}>
                <div>
                  <h1 style={{ fontSize: 17 }}>
                    {result.dropped.length} dropped as repeats
                  </h1>
                  <p>These matched something already posted or already in the backlog.</p>
                </div>
              </div>
              {result.dropped.map((idea, i) => (
                <IdeaCard key={i} idea={idea} dropped />
              ))}
            </>
          )}

          <div className="stats">
            <span>Generated {result.generated}</span>
            <span>Kept {result.kept.length}</span>
            <span>Dropped {result.dropped.length}</span>
            <span className="num">
              {result.usage.cached.toLocaleString()} cached tokens read
            </span>
            <span className="num">{result.usage.output.toLocaleString()} output tokens</span>
          </div>
        </>
      )}
    </main>
  );
}
