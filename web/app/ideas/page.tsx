import { ideaRows } from "../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function IdeasPage() {
  const all = ideaRows();
  const open = all.filter((i) => i.status === "open");
  const filmed = all.filter((i) => i.status !== "open");

  return (
    <main className="wrap">
      <div className="head">
        <div>
          <p className="kicker">The backlog</p>
          <h1>Ideas</h1>
          <p>
            The backlog. Filmed items keep their verdicts so nothing gets graded
            twice and no sequel repeats an item.
          </p>
        </div>
      </div>

      <div className="grid2">
        <section className="panel">
          <div className="ph">
            <h2>Open</h2>
            <span className="meta">{open.length}</span>
          </div>
          <div className="pb scroll">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Idea</th>
                  <th>Batch</th>
                </tr>
              </thead>
              <tbody>
                {open.slice(0, 120).map((i) => (
                  <tr key={i.id}>
                    <td className="t">{i.title}</td>
                    <td>{i.batch ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <div className="ph">
            <h2>Filmed, with verdicts</h2>
            <span className="meta">{filmed.length}</span>
          </div>
          <div className="pb scroll">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Set</th>
                  <th>What he said</th>
                </tr>
              </thead>
              <tbody>
                {filmed.slice(0, 40).map((i) => (
                  <tr key={i.id}>
                    <td className="t">{i.title}</td>
                    <td>
                      <p className="body-pre">
                        {(i.verdicts ?? i.body ?? "").slice(0, 220)}
                        {(i.verdicts ?? i.body ?? "").length > 220 ? "…" : ""}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
