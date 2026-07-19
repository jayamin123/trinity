import { INTRO, PAGE_TYPES, MASTER_RECIPE, PAGES, MAPPING, FRAMEWORK, type Page } from "@/app/(app)/blueprint/data";

/* Print-only, full-document version of /blueprint (no app shell, no tabs) —
   rendered to PDF with headless Chromium. Reads the SAME data as the page. */

const typeName = (id: string) => PAGE_TYPES.find((t) => t.id === id)?.name ?? id;
const tpClass: Record<string, string> = {
  dashboard: "info", "resource-list": "accent", "action-flow": "warn", form: "good", wizard: "neutral",
};
const TP = ({ id }: { id: string }) => <span className={`d-tp ${tpClass[id] ?? "neutral"}`}>{typeName(id)}</span>;

function Worksheet({ p, n }: { p: Page; n: number }) {
  return (
    <section className="d-page">
      <div className="d-ws-head">
        <span className="d-idx">{n}</span>
        <h3>{p.name}</h3>
        <TP id={p.type} />
        <code>{p.route}</code>
      </div>
      <p className="d-purpose">{p.purpose}</p>
      <div className="d-ent">
        <div><span>Primary entity</span><b>{p.primary}</b></div>
        <div><span>Supporting</span><b>{p.secondary.length ? p.secondary.join(", ") : "—"}</b></div>
      </div>

      <div className="d-2">
        <div>
          <h4>Questions it answers</h4>
          <ul>{p.questions.map((q) => <li key={q}>{q}</li>)}</ul>
        </div>
        <div>
          <h4>Actions</h4>
          <div className="d-tags">{p.actions.map((a) => <span key={a} className="d-tag">{a}</span>)}</div>
        </div>
      </div>

      <h4>Data — 4 calls</h4>
      <div className="d-data">
        {([["Summary / KPIs", p.data.summary], ["List", p.data.list], ["Detail", p.data.detail], ["Lookups", p.data.lookup]] as const).map(([label, g]) => {
          const good = g.source.startsWith("✅"), bad = g.source.startsWith("❌");
          return (
            <div key={label} className="d-dg">
              <div className="d-dg-top"><b>{label}</b>{good && <span className="d-pill good">good</span>}{bad && <span className="d-pill bad">fix</span>}</div>
              <div className="d-dg-src">{g.source.replace(/^[✅❌]\s*/, "")}</div>
              {g.items.length > 0 && <div className="d-tags">{g.items.map((it) => <span key={it} className="d-tag">{it}</span>)}</div>}
            </div>
          );
        })}
      </div>

      <h4>Filters — today → ideal</h4>
      <table className="d-filters">
        <tbody>
          {p.filters.map((f) => (
            <tr key={f.name}>
              <td className="fn">{f.name}{f.note && <div className="fnote">{f.note}</div>}</td>
              <td className="fb">
                <span className={`d-wb ${f.today === "server" ? "srv" : "cli"}`}>{f.today}</span>
                {f.today !== f.ideal && <><span className="ar">→</span><span className="d-wb srv">{f.ideal}</span></>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="d-2">
        <div>
          <h4>Sections</h4>
          <div className="d-flow">{p.sections.map((s, i) => <span key={i} className="d-node">{s}{i < p.sections.length - 1 && <i> → </i>}</span>)}</div>
          <h4 style={{ marginTop: 10 }}>Client state</h4>
          <div className="d-tags">{p.state.map((s) => <span key={s} className="d-tag mono">{s}</span>)}</div>
        </div>
        <div>
          <h4>APIs / actions</h4>
          <div className="d-tags">{p.apis.map((a) => <span key={a} className="d-tag mono">{a}</span>)}</div>
          <h4 style={{ marginTop: 10 }}>Components</h4>
          <div className="d-tags">{p.components.map((c) => <span key={c} className="d-tag">{c}</span>)}</div>
        </div>
      </div>

      <h4>Performance</h4>
      <ul>{p.performance.map((x) => <li key={x}>{x}</li>)}</ul>

      <h4>Lessons learned</h4>
      <div className="d-lessons">
        {p.lessons.map((l) => (
          <div key={l.title} className="d-lesson"><b>◆ {l.title}</b><span>{l.detail}</span></div>
        ))}
      </div>
    </section>
  );
}

export default function BlueprintPrint() {
  return (
    <div className="doc">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* Cover */}
      <section className="d-cover">
        <div className="d-kicker">Trinity Flows · Design System Documentation</div>
        <h1>{INTRO.title}</h1>
        <p className="d-tag">{INTRO.tagline}</p>
        {INTRO.body.map((b, i) => <p key={i} className="d-body">{b}</p>)}
        <div className="d-verify">
          <div className="d-vh">How this was produced</div>
          {INTRO.verification.map((v, i) => <div key={i} className="d-vrow"><span>✓</span>{v}</div>)}
        </div>
        <div className="d-finding"><b>{FRAMEWORK.finding}</b></div>
      </section>

      {/* Page types */}
      <section className="d-page">
        <h2>1 · Page types — the patterns</h2>
        {PAGE_TYPES.map((t) => (
          <div key={t.id} className="d-type">
            <div className="d-type-h"><TP id={t.id} /><span className="d-ex">{t.examples.join(" · ")}</span></div>
            <p>{t.purpose}</p>
            <div className="d-flow">{t.sections.map((s, i) => <span key={s} className="d-node">{s}{i < t.sections.length - 1 && <i> → </i>}</span>)}</div>
            <div className="d-rules">{t.rules.map((r) => <span key={r} className="d-rule">· {r}</span>)}</div>
          </div>
        ))}
      </section>

      {/* Master recipe */}
      <section className="d-page">
        <h2>2 · Master recipe — Resource List</h2>
        <p className="d-note">{MASTER_RECIPE.note}</p>
        <div className="d-steps">
          {MASTER_RECIPE.steps.map((s) => (
            <div key={s.n} className="d-step"><span className="d-num">{s.n}</span><div><b>{s.title}</b><span>{s.body}</span></div></div>
          ))}
        </div>
      </section>

      {/* The 8 pages */}
      <section className="d-page"><h2>3 · The 8 pages — grounded worksheets</h2></section>
      {PAGES.map((p, i) => <Worksheet key={p.route} p={p} n={i + 1} />)}

      {/* Framework */}
      <section className="d-page">
        <h2>4 · The framework</h2>
        <h4>The universal spine</h4>
        <div className="d-flow big">{FRAMEWORK.spine.map((s, i) => <span key={s} className="d-node">{s}{i < FRAMEWORK.spine.length - 1 && <i> ↓ </i>}</span>)}</div>
        <h4>Universal lessons — the rules for every page</h4>
        <div className="d-lessons">
          {FRAMEWORK.universalLessons.map((l, i) => (
            <div key={l.title} className="d-lesson"><b>{i + 1}. {l.title}</b><span>{l.detail}</span></div>
          ))}
        </div>
        <div className="d-2" style={{ marginTop: 14 }}>
          <div>
            <h4>Page → type map</h4>
            <table className="d-map"><tbody>{MAPPING.map((m) => (
              <tr key={m.route}><td>{m.page} <code>{m.route}</code></td><td style={{ textAlign: "right" }}><TP id={m.type} /></td></tr>
            ))}</tbody></table>
          </div>
          <div>
            <h4>New-page worksheet</h4>
            <div className="d-worksheet">{FRAMEWORK.worksheet.map((w) => <div key={w} className="d-wl"><span>{w}</span><i /></div>)}</div>
          </div>
        </div>
      </section>
    </div>
  );
}

const CSS = `
*{-webkit-print-color-adjust:exact;print-color-adjust:exact}
.doc{max-width:820px;margin:0 auto;padding:0 8px;color:#1a1c24;font-family:"Segoe UI",system-ui,sans-serif;font-variant-numeric:tabular-nums}
.doc h1{font-size:30px;font-weight:720;letter-spacing:-.03em;margin:6px 0 10px}
.doc h2{font-size:19px;font-weight:700;letter-spacing:-.02em;margin:0 0 14px;padding-bottom:8px;border-bottom:2px solid #e6e9ee}
.doc h3{font-size:17px;font-weight:680;margin:0}
.doc h4{font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;color:#949bad;font-weight:700;margin:16px 0 8px}
.doc p{line-height:1.6;color:#5d6577;font-size:12.5px}
.doc ul{margin:6px 0 0;padding-left:16px}
.doc li{font-size:12px;color:#5d6577;line-height:1.5;margin-bottom:3px}
.d-page{break-before:page;padding-top:6px}
.d-cover{padding-top:8px}
.d-kicker{font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#5a56e0;font-weight:700}
.d-tag{font-size:15px;color:#1a1c24;font-weight:500;font-style:italic;margin:0 0 16px}
.d-body{font-size:13px;margin:0 0 12px}
.d-verify{background:#f6f8fa;border:1px solid #e6e9ee;border-radius:12px;padding:14px 16px;margin:18px 0}
.d-vh{font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;color:#949bad;font-weight:700;margin-bottom:10px}
.d-vrow{display:flex;gap:9px;font-size:12px;color:#1a1c24;line-height:1.4;margin-bottom:8px}
.d-vrow span{flex:none;width:16px;height:16px;border-radius:50%;background:rgba(23,145,95,.13);color:#17915f;display:grid;place-items:center;font-size:10px;font-weight:800}
.d-finding{background:rgba(90,86,224,.06);border:1px solid rgba(90,86,224,.18);border-radius:12px;padding:14px 16px}
.d-finding b{font-size:13.5px;line-height:1.55;color:#1a1c24;font-weight:600}

.d-tp{display:inline-flex;font-size:10.5px;font-weight:700;padding:2px 9px;border-radius:999px;white-space:nowrap}
.d-tp.accent{color:#4b47d6;background:rgba(90,86,224,.1)}
.d-tp.info{color:#2b7de0;background:rgba(43,125,224,.12)}
.d-tp.warn{color:#b07219;background:rgba(176,114,25,.14)}
.d-tp.good{color:#17915f;background:rgba(23,145,95,.13)}
.d-tp.neutral{color:#5d6577;background:#f6f8fa;border:1px solid #e6e9ee}

.d-type{border:1px solid #e6e9ee;border-radius:12px;padding:13px 15px;margin-bottom:11px;break-inside:avoid}
.d-type-h{display:flex;align-items:center;justify-content:space-between;margin-bottom:7px}
.d-ex{font-size:11.5px;color:#949bad}
.d-type p{margin:0 0 9px;font-size:12.5px}
.d-flow{display:flex;flex-wrap:wrap;align-items:center;gap:6px}
.d-flow.big .d-node{font-size:12.5px}
.d-node{font-size:11.5px;font-weight:600;color:#1a1c24;background:#f6f8fa;border:1px solid #e6e9ee;padding:4px 9px;border-radius:7px}
.d-node i{color:#949bad;font-style:normal}
.d-rules{display:flex;flex-wrap:wrap;gap:5px 16px;margin-top:10px}
.d-rule{font-size:11.5px;color:#5d6577}

.d-note{font-size:13px;margin:0 0 14px}
.d-steps{display:flex;flex-direction:column}
.d-step{display:flex;gap:12px;padding:9px 0;border-bottom:1px solid #eef1f4;break-inside:avoid}
.d-step:last-child{border-bottom:0}
.d-num{flex:none;width:23px;height:23px;border-radius:7px;background:rgba(90,86,224,.1);color:#4b47d6;display:grid;place-items:center;font-size:12px;font-weight:700}
.d-step b{font-size:13px;font-weight:650;color:#1a1c24;display:block}
.d-step span{font-size:12px;color:#5d6577;line-height:1.5;display:block;margin-top:2px}

.d-ws-head{display:flex;align-items:center;gap:10px;margin-bottom:8px}
.d-idx{flex:none;width:26px;height:26px;border-radius:8px;background:#1a1c24;color:#fff;display:grid;place-items:center;font-size:13px;font-weight:700}
.d-ws-head code,.d-map code{font-family:"Cascadia Code",Consolas,monospace;font-size:11px;color:#5d6577;background:#f6f8fa;border:1px solid #e6e9ee;padding:2px 7px;border-radius:5px}
.d-purpose{font-size:13px;color:#1a1c24;margin:0 0 12px;line-height:1.55}
.d-ent{display:flex;gap:32px;padding:10px 0;border-top:1px solid #e6e9ee;border-bottom:1px solid #e6e9ee}
.d-ent span{font-size:9.5px;text-transform:uppercase;letter-spacing:.05em;color:#949bad;font-weight:700;display:block}
.d-ent b{font-size:12.5px;display:block;margin-top:2px}
.d-2{display:grid;grid-template-columns:1fr 1fr;gap:20px}
.d-tags{display:flex;flex-wrap:wrap;gap:5px}
.d-tag{font-size:10.5px;color:#5d6577;background:#f6f8fa;border:1px solid #e6e9ee;border-radius:5px;padding:2px 7px}
.d-tag.mono{font-family:"Cascadia Code",Consolas,monospace;font-size:10px}

.d-data{display:grid;grid-template-columns:1fr 1fr;gap:9px}
.d-dg{border:1px solid #e6e9ee;border-radius:9px;padding:10px 11px;background:#fafbfc;break-inside:avoid}
.d-dg-top{display:flex;align-items:center;gap:7px;margin-bottom:5px}
.d-dg-top b{font-size:12px}
.d-dg-src{font-size:11px;color:#5d6577;line-height:1.45;margin-bottom:6px}
.d-pill{font-size:9.5px;font-weight:700;padding:1px 7px;border-radius:999px}
.d-pill.good{color:#17915f;background:rgba(23,145,95,.13)}
.d-pill.bad{color:#d23b41;background:rgba(210,59,65,.12)}

.d-filters{width:100%;border-collapse:collapse;border:1px solid #e6e9ee;border-radius:8px;overflow:hidden}
.d-filters td{padding:8px 11px;border-bottom:1px solid #eef1f4;vertical-align:top;font-size:12px}
.d-filters tr:last-child td{border-bottom:0}
.d-filters tr:nth-child(even){background:#fafbfc}
.d-filters .fn{font-weight:550;color:#1a1c24}
.d-filters .fnote{font-size:10.5px;color:#949bad;font-weight:400;margin-top:3px;line-height:1.4}
.d-filters .fb{text-align:right;white-space:nowrap}
.d-wb{font-size:9.5px;font-weight:700;letter-spacing:.02em;padding:2px 7px;border-radius:5px;text-transform:uppercase}
.d-wb.cli{color:#b07219;background:rgba(176,114,25,.14)}
.d-wb.srv{color:#17915f;background:rgba(23,145,95,.13)}
.fb .ar{color:#949bad;margin:0 4px}

.d-lessons{display:grid;grid-template-columns:1fr 1fr;gap:9px}
.d-lesson{border:1px solid #e6e9ee;border-radius:9px;padding:10px 12px;background:#fff;break-inside:avoid}
.d-lesson b{font-size:12px;font-weight:650;color:#1a1c24;display:block}
.d-lesson span{font-size:11px;color:#5d6577;line-height:1.5;display:block;margin-top:5px}

.d-map{width:100%;border-collapse:collapse}
.d-map td{padding:7px 0;border-bottom:1px solid #eef1f4;font-size:12px;font-weight:600}
.d-map tr:last-child td{border-bottom:0}
.d-worksheet{display:flex;flex-direction:column;gap:7px}
.d-wl{display:flex;align-items:center;gap:9px}
.d-wl span{font-family:"Cascadia Code",Consolas,monospace;font-size:10px;color:#5d6577;font-weight:600;white-space:nowrap}
.d-wl i{flex:1;border-bottom:1px dashed #d7dce3;height:1px}

@page{size:A4;margin:14mm 12mm}
`;
