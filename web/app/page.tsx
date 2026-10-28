import Link from "next/link";
import {
  libraryCounts,
  performance as perf,
  recentPackages,
  readyToPost,
} from "../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function compact(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2).replace(/\.00$/, "") + "M";
  if (n >= 1_000) return Math.round(n / 1_000) + "K";
  return String(n);
}

export default function DashboardPage() {
  const c = libraryCounts();
  const p = perf();
  const packages = recentPackages(6);
  const ready = readyToPost(8);
  const top = p.top.slice(0, 6);
  const max = top[0]?.views ?? 1;
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <main className="wrap">
      <div className="head">
        <div>
          <p className="kicker">{today}</p>
          <h1>Dashboard</h1>
          <p>The whole operation at a glance: what&rsquo;s ready, what&rsquo;s working, what&rsquo;s next.</p>
        </div>
        <div className="actions">
          <Link href="/suite" className="btn as-link">Package a transcript</Link>
          <Link href="/generate" className="btn ghost as-link">Generate ideas</Link>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat">
          <div className="k">Posted</div>
          <div className="v">{c.posted}</div>
          <div className="s">of {c.videos} videos tracked</div>
        </div>
        <div className="stat">
          <div className="k">Median views</div>
          <div className="v">{compact(p.median)}</div>
          <div className="s">across all posted</div>
        </div>
        <div className="stat flag">
          <div className="k">Ready to post</div>
          <div className="v">{ready.length}</div>
          <div className="s">filmed, package written</div>
        </div>
        <div className="stat">
          <div className="k">Open ideas</div>
          <div className="v">{c.openIdeas}</div>
          <div className="s">in the backlog</div>
        </div>
      </div>

      <div className="grid2">
        <section className="panel">
          <div className="ph">
            <h2>Ready to post</h2>
            <span className="meta">filmed + packaged</span>
          </div>
          <div className="pb scroll">
            {ready.length === 0 ? (
              <p className="hint">Nothing in the queue. Paste a transcript into Full suite.</p>
            ) : (
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Package</th>
                  </tr>
                </thead>
                <tbody>
                  {ready.map((r) => (
                    <tr key={r.id}>
                      <td className="t">{r.title}</td>
                      <td>
                        <span className="pill filmed">{r.package_slug ?? "ready"}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section className="panel">
          <div className="ph">
            <h2>Top performers</h2>
            <span className="meta">views</span>
          </div>
          <div className="pb">
            <div className="bars">
              {top.map((t) => (
                <div className="bar" key={t.title}>
                  <span className="lab">{t.title}</span>
                  <span className="val">{compact(t.views)}</span>
                  <span className="track">
                    <span
                      className="fill"
                      style={{ width: `${Math.max(2, (t.views / max) * 100)}%` }}
                    />
                  </span>
                </div>
              ))}
            </div>
            <p className="note">
              Rankings with recognizable items carry roughly 10&times; the median. When a
              slot opens, that&rsquo;s the format to reach for.
            </p>
          </div>
        </section>
      </div>

      <section className="panel" style={{ marginTop: 16 }}>
        <div className="ph">
          <h2>Latest packages</h2>
          <span className="meta">{c.packages} total</span>
        </div>
        <div className="pb scroll">
          <table className="tbl">
            <thead>
              <tr>
                <th>Best title</th>
                <th>Slug</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {packages.map((pk) => (
                <tr key={pk.id}>
                  <td className="t">{pk.best_title ?? pk.video_title ?? pk.slug}</td>
                  <td className="num">{pk.slug}</td>
                  <td>
                    <span
                      className={
                        pk.video_status === "posted" ? "pill posted" : "pill filmed"
                      }
                    >
                      {pk.video_status ?? "—"}
                    </span>
                  </td>
                  <td className="num">{pk.created_at.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
