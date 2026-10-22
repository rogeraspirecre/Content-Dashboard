import { performance as perf } from "../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function compact(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2).replace(/\.00$/, "") + "M";
  if (n >= 1_000) return Math.round(n / 1_000) + "K";
  return String(n);
}

export default function PerformancePage() {
  const p = perf();
  const max = p.top[0]?.views ?? 1;
  const months = p.byMonth.slice(-8);
  const maxMonth = Math.max(...months.map((m) => m.median), 1);

  return (
    <main className="wrap">
      <div className="head">
        <div>
          <h1>Performance</h1>
          <p>What the view data says to film next.</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat">
          <div className="k">Posted</div>
          <div className="v">{p.count}</div>
          <div className="s">with view data</div>
        </div>
        <div className="stat">
          <div className="k">Median views</div>
          <div className="v">{compact(p.median)}</div>
          <div className="s">all posted</div>
        </div>
        <div className="stat">
          <div className="k">Top video</div>
          <div className="v">{compact(max)}</div>
          <div className="s">{p.top[0]?.title.slice(0, 28) ?? "—"}</div>
        </div>
        <div className="stat">
          <div className="k">Months tracked</div>
          <div className="v">{p.byMonth.length}</div>
          <div className="s">by median</div>
        </div>
      </div>

      <div className="grid2">
        <section className="panel">
          <div className="ph">
            <h2>Top performers</h2>
            <span className="meta">views</span>
          </div>
          <div className="pb">
            <div className="bars">
              {p.top.map((t) => (
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
              Content travels when the items in it are recognizable outside the
              industry. That is the pattern behind every row above.
            </p>
          </div>
        </section>

        <section className="panel">
          <div className="ph">
            <h2>Median by month</h2>
            <span className="meta">last {months.length}</span>
          </div>
          <div className="pb">
            <div className="bars">
              {months.map((m) => (
                <div className="bar" key={m.month}>
                  <span className="lab">
                    {m.month} &middot; {m.count} posts
                  </span>
                  <span className="val">{compact(m.median)}</span>
                  <span className="track">
                    <span
                      className="fill"
                      style={{ width: `${Math.max(2, (m.median / maxMonth) * 100)}%` }}
                    />
                  </span>
                </div>
              ))}
            </div>
            <p className="note">
              Median, not average. A single 1.9M video would otherwise hide a month
              of narrow-lane posts.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
