import { libraryRows, libraryCounts } from "../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fmt(n: number | null) {
  return typeof n === "number" ? n.toLocaleString() : "—";
}

export default function LibraryPage() {
  const rows = libraryRows();
  const c = libraryCounts();

  return (
    <main className="wrap">
      <div className="head">
        <div>
          <h1>Library</h1>
          <p>Every video, transcript and package in one place.</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat">
          <div className="k">Videos</div>
          <div className="v">{c.videos}</div>
          <div className="s">{c.posted} posted</div>
        </div>
        <div className="stat">
          <div className="k">Filmed</div>
          <div className="v">{c.filmed}</div>
          <div className="s">not yet posted</div>
        </div>
        <div className="stat">
          <div className="k">Packages</div>
          <div className="v">{c.packages}</div>
          <div className="s">captions written</div>
        </div>
        <div className="stat">
          <div className="k">Transcripts</div>
          <div className="v">{c.transcripts}</div>
          <div className="s">searchable</div>
        </div>
      </div>

      <section className="panel">
        <div className="ph">
          <h2>Everything</h2>
          <span className="meta">{rows.length} rows, newest first</span>
        </div>
        <div className="pb scroll">
          <table className="tbl">
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Posted</th>
                <th className="r">Views</th>
                <th>Package</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="t">{r.title}</td>
                  <td>
                    <span
                      className={
                        r.status === "posted"
                          ? "pill posted"
                          : r.status === "filmed"
                            ? "pill filmed"
                            : "pill"
                      }
                    >
                      {r.status}
                    </span>
                  </td>
                  <td>{r.posted_at ?? "—"}</td>
                  <td className="r">{fmt(r.views)}</td>
                  <td>{r.package_slug ? "ready" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
