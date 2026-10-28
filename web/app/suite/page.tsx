"use client";

import { useState } from "react";

type Match = { label: string; source: string; score: number; verdict: string };
type Suite = {
  title: string;
  slug: string;
  format: string;
  lane: string;
  argument: string[];
  ytTitles: string[];
  bestTitle: string;
  bestTitleWhy: string;
  igCaptions: string[];
  bestCaption: string;
  bestCaptionWhy: string;
  xPosts: string[];
  bestPost: string;
  bestPostWhy: string;
  coldOpen: string;
  editNotes: string[];
};
type Result = {
  suite: Suite;
  description: string;
  saved: { slug: string; file: string };
  matches: Match[];
  usage: { input: number; cached: number; output: number };
};

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      className="copy"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1600);
        } catch {}
      }}
    >
      {done ? "Copied" : (label ?? "Copy")}
    </button>
  );
}

function Section({
  title,
  copyText,
  children,
}: {
  title: string;
  copyText?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="panel" style={{ marginTop: 16 }}>
      <div className="ph">
        <h2>{title}</h2>
        {copyText && <CopyButton text={copyText} />}
      </div>
      <div className="pb">{children}</div>
    </section>
  );
}

export default function SuitePage() {
  const [transcript, setTranscript] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<Match[] | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  async function run(force = false) {
    setBusy(true);
    setError(null);
    setBlocked(null);
    if (!force) setResult(null);
    try {
      const res = await fetch("/api/package", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, note, force }),
      });
      const data = await res.json();
      if (res.status === 409) setBlocked(data.matches);
      else if (!res.ok) setError(data.error ?? "Something went wrong.");
      else setResult(data);
    } catch (e: any) {
      setError(e.message ?? "Request failed.");
    } finally {
      setBusy(false);
    }
  }

  const s = result?.suite;

  return (
    <main className="wrap">
      <div className="head">
        <div>
          <p className="kicker">Transcript in, posting day done</p>
          <h1>Full suite</h1>
          <p>
            Paste the clip transcript. It gets checked against every transcript and
            package first, then packaged: titles, description, captions, posts, edit notes.
          </p>
        </div>
      </div>

      <section className="panel">
        <div className="ph">
          <h2>The transcript</h2>
          <span className="meta">repeat-checked before packaging</span>
        </div>
        <div className="pb">
          <textarea
            rows={10}
            placeholder="Paste what Brandon said, timestamps and all. They get cleaned up."
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
          />
          <textarea
            rows={2}
            style={{ marginTop: 10 }}
            placeholder="Context, optional. e.g. this is a cold call training, bleep the prospect's name"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="controls" style={{ marginTop: 10 }}>
            <button className="btn" onClick={() => run(false)} disabled={busy || !transcript.trim()}>
              {busy ? "Working..." : "Build the suite"}
            </button>
          </div>
          {error && (
            <p className="err" style={{ marginTop: 12 }}>
              {error}
            </p>
          )}
        </div>
      </section>

      {blocked && (
        <section className="panel blockpanel" style={{ marginTop: 16 }}>
          <div className="ph">
            <h2>Stop - this looks already posted</h2>
          </div>
          <div className="pb">
            {blocked.map((m) => (
              <p key={m.label} style={{ margin: "4px 0" }}>
                <strong>{m.verdict}</strong> &middot; {m.label}{" "}
                <span className="meta">
                  ({m.source}, overlap {m.score})
                </span>
              </p>
            ))}
            <p className="hint" style={{ marginTop: 10 }}>
              Posting it again competes with itself. If this repost is deliberate, go ahead:
            </p>
            <button className="btn ghost" style={{ marginTop: 8 }} onClick={() => run(true)} disabled={busy}>
              {busy ? "Working..." : "Package it anyway"}
            </button>
          </div>
        </section>
      )}

      {result && s && (
        <>
          <div className="head" style={{ marginTop: 28 }}>
            <div>
              <h1 style={{ fontSize: 17 }}>{s.title}</h1>
              <p>
                {s.format} &middot; {s.lane.replace(/_/g, " ")} &middot; saved to{" "}
                {result.saved.file}
              </p>
            </div>
          </div>

          {result.matches.length > 0 && (
            <p className="err" style={{ marginTop: 8 }}>
              Overlap noted with{" "}
              {result.matches.map((m) => `"${m.label}" (${m.score})`).join(", ")} - packaged
              anyway, differentiated.
            </p>
          )}

          <Section title="Best picks">
            <div className="picks">
              {[
                ["Title", s.bestTitle],
                ["IG caption", s.bestCaption],
                ["X post", s.bestPost],
                ["Cold open", s.coldOpen],
              ].map(([k, v]) => (
                <div className="pick" key={k}>
                  <span className="k">{k}</span>
                  <span className="v">{v}</span>
                  <CopyButton text={v} />
                </div>
              ))}
            </div>
          </Section>

          <Section title="YouTube titles" copyText={s.ytTitles.join("\n")}>
            <ol>
              {s.ytTitles.map((t) => (
                <li key={t} className={t === s.bestTitle ? "best" : ""}>
                  {t} <CopyButton text={t} />
                </li>
              ))}
            </ol>
            <p className="why">
              <strong>Best fit: {s.bestTitle}.</strong> {s.bestTitleWhy}
            </p>
          </Section>

          <Section title="YouTube description" copyText={result.description}>
            <pre className="desc">{result.description}</pre>
          </Section>

          <Section title="IG captions" copyText={s.igCaptions.join("\n\n")}>
            <ol>
              {s.igCaptions.map((c) => (
                <li key={c} className={c === s.bestCaption ? "best" : ""}>
                  {c} <CopyButton text={c} />
                </li>
              ))}
            </ol>
            <p className="why">
              <strong>Best: {s.bestCaption}</strong> {s.bestCaptionWhy}
            </p>
          </Section>

          <Section title="X posts" copyText={s.xPosts.join("\n\n")}>
            <ol>
              {s.xPosts.map((p) => (
                <li key={p} className={p === s.bestPost ? "best" : ""}>
                  {p} <CopyButton text={p} />
                </li>
              ))}
            </ol>
            <p className="why">
              <strong>Best: {s.bestPost}</strong> {s.bestPostWhy}
            </p>
          </Section>

          <Section title="Edit notes">
            <ul>
              {s.editNotes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </Section>

          <div className="stats">
            <span>Saved as {result.saved.slug}.md</span>
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
