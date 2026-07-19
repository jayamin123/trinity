"use client";
import { useState } from "react";
import { PageHeader, Panel, SectionLabel, Pill, Badge, Tag, Segmented } from "@/components/ui";
import { INTRO, PAGE_TYPES, MASTER_RECIPE, PAGES, MAPPING, FRAMEWORK, type Page, type Filter } from "./data";

type Section = "overview" | "types" | "recipe" | "pages" | "framework";
type Tone = "good" | "bad" | "warn" | "info" | "neutral" | "accent";

const typeTone: Record<string, Tone> = {
  dashboard: "info", "resource-list": "accent", "action-flow": "warn", form: "good", wizard: "neutral",
};
const typeName = (id: string) => PAGE_TYPES.find((t) => t.id === id)?.name ?? id;

function TypePill({ id }: { id: string }) {
  const tone = typeTone[id] ?? "neutral";
  return <span className={`bp-tp ${tone}`}>{typeName(id)}</span>;
}

export default function BlueprintPage() {
  const [sec, setSec] = useState<Section>("overview");
  const [pageIdx, setPageIdx] = useState(0);

  return (
    <div className="ui bp" style={{ maxWidth: 1080 }}>
      <style>{CSS}</style>
      <PageHeader title={INTRO.title} subtitle={INTRO.tagline} />

      <div className="bp-nav">
        {([["overview", "Overview"], ["types", "Page types"], ["recipe", "Master recipe"], ["pages", "The 8 pages"], ["framework", "Framework"]] as const).map(([k, label]) => (
          <button key={k} className={sec === k ? "on" : ""} onClick={() => setSec(k)}>{label}</button>
        ))}
      </div>

      {sec === "overview" && <Overview />}
      {sec === "types" && <Types />}
      {sec === "recipe" && <Recipe />}
      {sec === "pages" && <Pages idx={pageIdx} setIdx={setPageIdx} />}
      {sec === "framework" && <Framework />}
    </div>
  );
}

/* ---- Overview ---------------------------------------------------------- */
function Overview() {
  return (
    <div className="bp-stack">
      <Panel pad>
        {INTRO.body.map((p, i) => <p key={i} className="bp-lead">{p}</p>)}
      </Panel>
      <div className="bp-2col">
        <Panel pad>
          <SectionLabel>The finding</SectionLabel>
          <p className="bp-finding">{FRAMEWORK.finding}</p>
          <div className="bp-row">
            <div className="bp-stat"><b>8</b><span>pages</span></div>
            <div className="bp-arrow">→</div>
            <div className="bp-stat"><b>4</b><span>patterns</span></div>
            <div className="bp-arrow">·</div>
            <div className="bp-stat"><b>½</b><span>are Resource Lists</span></div>
          </div>
        </Panel>
        <Panel pad>
          <SectionLabel>How this was verified</SectionLabel>
          <div className="bp-checks">
            {INTRO.verification.map((v, i) => (
              <div key={i} className="bp-check"><span className="tick">✓</span><span>{v}</span></div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ---- Page types -------------------------------------------------------- */
function Types() {
  return (
    <div className="bp-stack">
      {PAGE_TYPES.map((t) => (
        <Panel key={t.id} pad className="bp-type">
          <div className="bp-type-head">
            <TypePill id={t.id} />
            <div className="bp-type-ex">{t.examples.join(" · ")}</div>
          </div>
          <p className="bp-lead" style={{ margin: "10px 0 12px" }}>{t.purpose}</p>
          <div className="bp-flow">{t.sections.map((s, i) => (
            <span key={s} className="bp-node">{s}{i < t.sections.length - 1 && <i>→</i>}</span>
          ))}</div>
          <div className="bp-rules">{t.rules.map((r) => <div key={r} className="bp-rule"><span>·</span>{r}</div>)}</div>
        </Panel>
      ))}
    </div>
  );
}

/* ---- Master recipe ----------------------------------------------------- */
function Recipe() {
  return (
    <div className="bp-stack">
      <Panel pad>
        <div className="bp-row" style={{ justifyContent: "space-between", marginBottom: 4 }}>
          <SectionLabel>Master recipe · {MASTER_RECIPE.type}</SectionLabel>
          <TypePill id="resource-list" />
        </div>
        <p className="bp-lead">{MASTER_RECIPE.note}</p>
      </Panel>
      <Panel pad>
        <div className="bp-steps">
          {MASTER_RECIPE.steps.map((s) => (
            <div key={s.n} className="bp-step">
              <div className="bp-num">{s.n}</div>
              <div><div className="bp-step-t">{s.title}</div><div className="bp-step-b">{s.body}</div></div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

/* ---- The 8 pages ------------------------------------------------------- */
function Pages({ idx, setIdx }: { idx: number; setIdx: (n: number) => void }) {
  const p = PAGES[idx];
  return (
    <div className="bp-stack">
      <div className="bp-pagepick">
        {PAGES.map((pg, i) => (
          <button key={pg.route} className={i === idx ? "on" : ""} onClick={() => setIdx(i)}>
            {pg.name}
          </button>
        ))}
      </div>
      <Worksheet p={p} />
    </div>
  );
}

function Worksheet({ p }: { p: Page }) {
  return (
    <div className="bp-stack">
      <Panel pad>
        <div className="bp-ws-head">
          <div>
            <div className="bp-row" style={{ gap: 10 }}>
              <h2 className="bp-ws-title">{p.name}</h2>
              <TypePill id={p.type} />
              <code className="bp-route">{p.route}</code>
            </div>
            <p className="bp-lead" style={{ margin: "8px 0 0" }}>{p.purpose}</p>
          </div>
        </div>
        <div className="bp-entities">
          <div><span>Primary entity</span><b>{p.primary}</b></div>
          <div><span>Supporting</span><b>{p.secondary.length ? p.secondary.join(", ") : "—"}</b></div>
        </div>
      </Panel>

      <div className="bp-2col">
        <Panel pad>
          <SectionLabel>Questions it answers</SectionLabel>
          <ul className="bp-list">{p.questions.map((q) => <li key={q}>{q}</li>)}</ul>
        </Panel>
        <Panel pad>
          <SectionLabel>Actions</SectionLabel>
          <div className="bp-tags" style={{ marginTop: 10 }}>{p.actions.map((a) => <Tag key={a}>{a}</Tag>)}</div>
        </Panel>
      </div>

      <Panel pad>
        <SectionLabel>Data — 4 calls</SectionLabel>
        <div className="bp-data">
          {([["Summary / KPIs", p.data.summary], ["List", p.data.list], ["Detail", p.data.detail], ["Lookups", p.data.lookup]] as const).map(([label, g]) => {
            const good = g.source.startsWith("✅"), bad = g.source.startsWith("❌");
            return (
              <div key={label} className="bp-dg">
                <div className="bp-dg-top">
                  <b>{label}</b>
                  {good && <Pill tone="good">good</Pill>}
                  {bad && <Pill tone="bad">fix</Pill>}
                </div>
                <div className="bp-dg-src">{g.source.replace(/^[✅❌]\s*/, "")}</div>
                {g.items.length > 0 && <div className="bp-tags">{g.items.map((it) => <Tag key={it}>{it}</Tag>)}</div>}
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel pad>
        <SectionLabel>Filters — today vs ideal</SectionLabel>
        <div className="bp-filters">
          {p.filters.map((f: Filter) => {
            const mismatch = f.today !== f.ideal;
            return (
              <div key={f.name} className="bp-filter">
                <div className="bp-filter-name">{f.name}</div>
                <div className="bp-filter-badges">
                  <span className={`bp-wb ${f.today === "server" ? "srv" : "cli"}`}>{f.today}</span>
                  {mismatch && <><span className="bp-to">→</span><span className="bp-wb srv">{f.ideal}</span></>}
                </div>
                {f.note && <div className="bp-filter-note">{f.note}</div>}
              </div>
            );
          })}
        </div>
      </Panel>

      <div className="bp-2col">
        <Panel pad>
          <SectionLabel>Sections (top → bottom)</SectionLabel>
          <div className="bp-flow" style={{ marginTop: 10 }}>{p.sections.map((s, i) => (
            <span key={i} className="bp-node">{s}{i < p.sections.length - 1 && <i>→</i>}</span>
          ))}</div>
          <div style={{ height: 14 }} />
          <SectionLabel>Client state owned</SectionLabel>
          <div className="bp-tags" style={{ marginTop: 10 }}>{p.state.map((s) => <Tag key={s} mono>{s}</Tag>)}</div>
        </Panel>
        <Panel pad>
          <SectionLabel>APIs / actions</SectionLabel>
          <div className="bp-tags" style={{ marginTop: 10 }}>{p.apis.map((a) => <Tag key={a} mono>{a}</Tag>)}</div>
          <div style={{ height: 14 }} />
          <SectionLabel>Components</SectionLabel>
          <div className="bp-tags" style={{ marginTop: 10 }}>{p.components.map((c) => <Tag key={c}>{c}</Tag>)}</div>
        </Panel>
      </div>

      <Panel pad>
        <SectionLabel>Performance</SectionLabel>
        <ul className="bp-list">{p.performance.map((x) => <li key={x}>{x}</li>)}</ul>
      </Panel>

      <Panel pad className="bp-lessons">
        <SectionLabel>Lessons learned — what living with it taught us</SectionLabel>
        <div className="bp-lesson-grid">
          {p.lessons.map((l) => (
            <div key={l.title} className="bp-lesson">
              <div className="bp-lesson-t"><span className="bp-bulb">◆</span>{l.title}</div>
              <div className="bp-lesson-b">{l.detail}</div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

/* ---- Framework --------------------------------------------------------- */
function Framework() {
  return (
    <div className="bp-stack">
      <Panel pad>
        <SectionLabel>The universal spine</SectionLabel>
        <div className="bp-flow" style={{ marginTop: 12 }}>{FRAMEWORK.spine.map((s, i) => (
          <span key={s} className="bp-node big">{s}{i < FRAMEWORK.spine.length - 1 && <i>↓</i>}</span>
        ))}</div>
      </Panel>

      <Panel pad className="bp-lessons">
        <SectionLabel>Universal lessons — the rules for every page</SectionLabel>
        <div className="bp-lesson-grid">
          {FRAMEWORK.universalLessons.map((l, i) => (
            <div key={l.title} className="bp-lesson">
              <div className="bp-lesson-t"><span className="bp-num sm">{i + 1}</span>{l.title}</div>
              <div className="bp-lesson-b">{l.detail}</div>
            </div>
          ))}
        </div>
      </Panel>

      <div className="bp-2col">
        <Panel pad>
          <SectionLabel>Page → type map</SectionLabel>
          <div className="bp-map">
            {MAPPING.map((m) => (
              <div key={m.route} className="bp-map-row">
                <span className="bp-map-name">{m.page}<code>{m.route}</code></span>
                <TypePill id={m.type} />
              </div>
            ))}
          </div>
        </Panel>
        <Panel pad>
          <SectionLabel>New-page worksheet</SectionLabel>
          <p className="bp-lead" style={{ margin: "8px 0 12px" }}>Every future page starts here — fill it in before writing code.</p>
          <div className="bp-worksheet">
            {FRAMEWORK.worksheet.map((w) => (
              <div key={w} className="bp-ws-line"><span className="bp-ws-k">{w}</span><span className="bp-ws-fill" /></div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

const CSS = `
.bp{padding-bottom:60px}
.bp-nav{display:flex;gap:2px;border-bottom:1px solid var(--app-border);margin-bottom:22px;flex-wrap:wrap}
.bp-nav button{border:0;background:transparent;font:inherit;font-weight:600;font-size:14px;color:var(--app-muted);padding:10px 15px;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px;transition:color .14s,border-color .14s}
.bp-nav button.on{color:var(--app-accent);border-bottom-color:var(--app-accent)}
.bp-stack{display:flex;flex-direction:column;gap:14px}
.bp-2col{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.bp-lead{font-size:14px;line-height:1.62;color:var(--app-muted);margin:0 0 12px}
.bp-lead:last-child{margin-bottom:0}
.bp-finding{font-size:15px;line-height:1.6;color:var(--app-text);font-weight:500;margin:10px 0 16px}
.bp-row{display:flex;align-items:center;gap:12px}
.bp-stat{display:flex;flex-direction:column;line-height:1.1}
.bp-stat b{font-size:26px;font-weight:700;letter-spacing:-.02em;color:var(--app-accent)}
.bp-stat span{font-size:11.5px;color:var(--app-muted);margin-top:2px}
.bp-arrow{color:var(--app-faint);font-size:18px}
.bp-checks{display:flex;flex-direction:column;gap:10px;margin-top:12px}
.bp-check{display:flex;gap:10px;font-size:13px;color:var(--app-text);line-height:1.45}
.bp-check .tick{flex:none;width:18px;height:18px;border-radius:50%;background:var(--app-good-soft);color:var(--app-good);display:grid;place-items:center;font-size:11px;font-weight:800}

/* type pill */
.bp-tp{display:inline-flex;align-items:center;font-size:11.5px;font-weight:700;letter-spacing:.02em;padding:3px 10px;border-radius:999px}
.bp-tp.accent{color:var(--app-accent-ink);background:var(--app-accent-soft)}
.bp-tp.info{color:var(--app-info);background:var(--app-info-soft)}
.bp-tp.warn{color:var(--app-warn);background:var(--app-warn-soft)}
.bp-tp.good{color:var(--app-good);background:var(--app-good-soft)}
.bp-tp.neutral{color:var(--app-muted);background:var(--app-panel2);border:1px solid var(--app-border)}

.bp-type-head{display:flex;align-items:center;justify-content:space-between;gap:12px}
.bp-type-ex{font-size:12.5px;color:var(--app-faint)}
.bp-flow{display:flex;flex-wrap:wrap;align-items:center;gap:8px}
.bp-node{display:inline-flex;align-items:center;gap:8px;font-size:12.5px;font-weight:600;color:var(--app-text);background:var(--app-panel2);border:1px solid var(--app-border);padding:5px 11px;border-radius:8px}
.bp-node i{color:var(--app-faint);font-style:normal;margin-left:2px}
.bp-node.big{font-size:13px;padding:7px 13px}
.bp-rules{display:flex;flex-wrap:wrap;gap:x;gap:8px 20px;margin-top:14px}
.bp-rule{display:flex;gap:7px;font-size:12.5px;color:var(--app-muted)}
.bp-rule span{color:var(--app-accent);font-weight:800}

.bp-steps{display:flex;flex-direction:column;gap:2px}
.bp-step{display:flex;gap:14px;padding:12px 0;border-bottom:1px solid var(--app-border)}
.bp-step:last-child{border-bottom:0}
.bp-num{flex:none;width:26px;height:26px;border-radius:8px;background:var(--app-accent-soft);color:var(--app-accent-ink);display:grid;place-items:center;font-size:13px;font-weight:700}
.bp-num.sm{width:22px;height:22px;font-size:12px;border-radius:6px}
.bp-step-t{font-size:14px;font-weight:650;color:var(--app-text)}
.bp-step-b{font-size:13px;color:var(--app-muted);margin-top:3px;line-height:1.5}

/* page picker */
.bp-pagepick{display:flex;flex-wrap:wrap;gap:6px;background:var(--app-panel);border:1px solid var(--app-border);border-radius:12px;padding:6px}
.bp-pagepick button{border:0;background:transparent;font:inherit;font-weight:600;font-size:13px;color:var(--app-muted);padding:7px 13px;border-radius:8px;cursor:pointer;transition:background .14s,color .14s}
.bp-pagepick button.on{background:var(--app-accent-soft);color:var(--app-accent-ink)}

.bp-ws-title{font-size:20px;font-weight:680;letter-spacing:-.02em;margin:0}
.bp-route{font-family:var(--mono);font-size:12px;color:var(--app-muted);background:var(--app-panel2);border:1px solid var(--app-border);padding:2px 8px;border-radius:6px}
.bp-entities{display:flex;gap:36px;margin-top:16px;padding-top:14px;border-top:1px solid var(--app-border)}
.bp-entities span{font-size:10.5px;text-transform:uppercase;letter-spacing:.05em;color:var(--app-faint);font-weight:650;display:block}
.bp-entities b{font-size:14px;font-weight:600;display:block;margin-top:4px}

.bp-list{margin:10px 0 0;padding-left:18px;display:flex;flex-direction:column;gap:6px}
.bp-list li{font-size:13px;color:var(--app-muted);line-height:1.5}
.bp-tags{display:flex;flex-wrap:wrap;gap:7px}

.bp-data{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px}
.bp-dg{border:1px solid var(--app-border);border-radius:10px;padding:12px 13px;background:var(--app-panel2)}
.bp-dg-top{display:flex;align-items:center;gap:8px;margin-bottom:6px}
.bp-dg-top b{font-size:13px;font-weight:650}
.bp-dg-src{font-size:12px;color:var(--app-muted);line-height:1.5;margin-bottom:8px}

.bp-filters{display:flex;flex-direction:column;gap:1px;margin-top:12px;border:1px solid var(--app-border);border-radius:10px;overflow:hidden}
.bp-filter{display:grid;grid-template-columns:1fr auto;gap:6px 14px;padding:10px 13px;background:var(--app-panel);align-items:center}
.bp-filter:nth-child(even){background:var(--app-panel2)}
.bp-filter-name{font-size:13px;font-weight:550;color:var(--app-text)}
.bp-filter-badges{display:flex;align-items:center;gap:7px}
.bp-wb{font-size:11px;font-weight:700;letter-spacing:.03em;padding:2px 8px;border-radius:6px;text-transform:uppercase}
.bp-wb.cli{color:var(--app-warn);background:var(--app-warn-soft)}
.bp-wb.srv{color:var(--app-good);background:var(--app-good-soft)}
.bp-to{color:var(--app-faint)}
.bp-filter-note{grid-column:1/-1;font-size:12px;color:var(--app-faint);line-height:1.45}

/* lessons */
.bp-lessons{background:linear-gradient(180deg,color-mix(in srgb,var(--app-accent) 4%,var(--app-panel)),var(--app-panel))}
.bp-lesson-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px}
.bp-lesson{border:1px solid var(--app-border);border-radius:10px;padding:13px 14px;background:var(--app-panel)}
.bp-lesson-t{display:flex;align-items:center;gap:9px;font-size:13.5px;font-weight:650;color:var(--app-text)}
.bp-bulb{color:var(--app-accent);font-size:11px}
.bp-lesson-b{font-size:12.5px;color:var(--app-muted);line-height:1.55;margin-top:7px}

.bp-map{display:flex;flex-direction:column;gap:1px;margin-top:10px}
.bp-map-row{display:flex;align-items:center;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--app-border)}
.bp-map-row:last-child{border-bottom:0}
.bp-map-name{font-size:13px;font-weight:600;display:flex;align-items:center;gap:9px}
.bp-map-name code{font-family:var(--mono);font-size:11px;color:var(--app-faint);font-weight:400}

.bp-worksheet{display:flex;flex-direction:column;gap:8px}
.bp-ws-line{display:flex;align-items:center;gap:10px}
.bp-ws-k{font-family:var(--mono);font-size:11px;color:var(--app-muted);font-weight:600;white-space:nowrap}
.bp-ws-fill{flex:1;border-bottom:1px dashed var(--app-border2);height:1px}

@media (max-width:820px){.bp-2col,.bp-data,.bp-lesson-grid{grid-template-columns:1fr}}
`;
