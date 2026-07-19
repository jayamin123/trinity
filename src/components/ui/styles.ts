// ---------------------------------------------------------------------------
// Trinity design system — the single source of visual truth.
//
// Extracted and generalized from the Activity ledger, which is the look we
// standardized on. Every class reads the global `--app-*` theme tokens, so the
// whole kit re-themes for free. Injected once, server-side, in the root layout
// (alongside themeCss) — no CSS modules, no per-component <style>, no flash.
//
// Prefix: `.ui-`. Naming stays flat and predictable so the showcase and the
// pages read the same way.
// ---------------------------------------------------------------------------

export const UI_CSS = `
/* ---- root + helpers ---------------------------------------------------- */
.ui{--mono:"Cascadia Code",ui-monospace,Consolas,monospace;color:var(--app-text);font-variant-numeric:tabular-nums}
.ui-mono{font-family:var(--mono)}
.ui-mut{color:var(--app-muted)} .ui-faint{color:var(--app-faint);font-size:12px}
.ui-r{text-align:right} .ui-nowrap{white-space:nowrap}
.ui-row{display:flex;align-items:center;gap:10px} .ui-row.wrap{flex-wrap:wrap}
.ui-spacer{flex:1}

/* ---- page header ------------------------------------------------------- */
.ui-head{display:flex;align-items:flex-start;gap:16px;margin-bottom:20px}
.ui-head h1{margin:0;font-size:22px;font-weight:680;letter-spacing:-.02em;color:var(--app-text)}
.ui-head p{margin:3px 0 0;font-size:13px;color:var(--app-muted)}

/* ---- surfaces --------------------------------------------------------- */
.ui-panel{background:var(--app-panel);border:1px solid var(--app-border);border-radius:14px}
.ui-panel.pad{padding:16px 18px}
.ui-panel.table{overflow:hidden;box-shadow:0 1px 0 rgba(0,0,0,.02),0 20px 46px -30px rgba(0,0,0,.5)}
.ui-sect{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--app-faint);font-weight:650}

/* ---- KPI cards -------------------------------------------------------- */
.ui-kpis{display:grid;grid-template-columns:repeat(var(--n,4),1fr);gap:14px}
.ui-kpi{position:relative;overflow:hidden;background:var(--app-panel);border:1px solid var(--app-border);border-radius:14px;padding:15px 16px}
.ui-kpi .lab{font-size:12px;color:var(--app-muted);font-weight:550}
.ui-kpi .val{font-size:26px;font-weight:680;letter-spacing:-.025em;margin-top:7px}
.ui-kpi .val small{font-size:15px;color:var(--app-faint)}
.ui-kpi .val.good{color:var(--app-good)} .ui-kpi .val.bad{color:var(--app-bad)}
.ui-spark{position:absolute;right:12px;bottom:12px;width:90px;height:32px}
.ui-ring{position:absolute;right:14px;top:14px}

/* ---- buttons ---------------------------------------------------------- */
.ui-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;font:inherit;font-weight:600;font-size:13.5px;line-height:1;
  padding:9px 15px;border-radius:9px;border:1px solid transparent;cursor:pointer;white-space:nowrap;transition:background .12s,border-color .12s,opacity .12s}
.ui-btn:disabled{opacity:.5;cursor:not-allowed}
.ui-btn.primary{background:var(--app-accent);color:#fff;border-color:transparent}
.ui-btn.primary:hover:not(:disabled){filter:brightness(1.06)}
.ui-btn.ghost{background:var(--app-panel);color:var(--app-text);border-color:var(--app-border2)}
.ui-btn.ghost:hover:not(:disabled){background:var(--app-hover);border-color:var(--app-muted)}
.ui-btn.subtle{background:var(--app-accent-soft);color:var(--app-accent-ink);border-color:transparent}
.ui-btn.subtle:hover:not(:disabled){filter:brightness(1.04)}
.ui-btn.danger{background:var(--app-bad-soft);color:var(--app-bad);border-color:transparent}
.ui-btn.danger:hover:not(:disabled){filter:brightness(1.03)}
.ui-btn.sm{padding:6px 11px;font-size:12.5px;border-radius:8px}
.ui-btn.lg{padding:11px 20px;font-size:14.5px}
.ui-iconbtn{display:inline-grid;place-items:center;width:34px;height:34px;border-radius:9px;border:1px solid var(--app-border);
  background:var(--app-panel);color:var(--app-muted);cursor:pointer;transition:background .12s,color .12s}
.ui-iconbtn:hover{background:var(--app-hover);color:var(--app-text)}

/* ---- filters ---------------------------------------------------------- */
.ui-filters{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:14px}
.ui-seg{display:inline-flex;background:var(--app-panel);border:1px solid var(--app-border);border-radius:10px;padding:3px}
.ui-seg button{border:0;background:transparent;color:var(--app-muted);font:inherit;font-weight:550;font-size:13px;padding:6px 13px;border-radius:7px;cursor:pointer}
.ui-seg button.on{background:var(--app-accent-soft);color:var(--app-accent-ink)}
.ui-seg button span{color:var(--app-faint);font-size:11px;margin-left:5px}
.ui-chip{display:inline-flex;align-items:center;gap:7px;font-size:13px;font-weight:500;background:var(--app-panel);border:1px solid var(--app-border);border-radius:9px;padding:7px 11px;color:var(--app-muted);cursor:pointer}
.ui-chip select{border:0;background:transparent;color:var(--app-text);font:inherit;font-weight:600;outline:none;max-width:180px;cursor:pointer}
.ui-chip input[type=checkbox]{accent-color:var(--app-accent)}

/* ---- form fields ------------------------------------------------------ */
.ui-field{display:flex;flex-direction:column;gap:6px}
.ui-field>label{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--app-faint);font-weight:650}
.ui-input{background:var(--app-panel);border:1px solid var(--app-border);border-radius:9px;padding:9px 11px;color:var(--app-text);font:inherit;font-size:13.5px;width:100%;outline:none;transition:border-color .12s,box-shadow .12s}
.ui-input:focus{border-color:var(--app-accent);box-shadow:0 0 0 3px var(--app-accent-soft)}
.ui-input::placeholder{color:var(--app-faint)}
select.ui-input{cursor:pointer;appearance:none;background-image:linear-gradient(45deg,transparent 50%,var(--app-faint) 50%),linear-gradient(135deg,var(--app-faint) 50%,transparent 50%);background-position:calc(100% - 16px) 50%,calc(100% - 11px) 50%;background-size:5px 5px,5px 5px;background-repeat:no-repeat;padding-right:30px}
.ui-search{position:relative;display:inline-flex;align-items:center}
.ui-search .ui-input{width:180px}

/* ---- tabs ------------------------------------------------------------- */
.ui-tabs{display:inline-flex;gap:2px;border-bottom:1px solid var(--app-border);margin-bottom:16px}
.ui-tabs button{border:0;background:transparent;font:inherit;font-weight:600;font-size:14px;color:var(--app-muted);padding:9px 15px;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px}
.ui-tabs button.on{color:var(--app-accent);border-bottom-color:var(--app-accent)}
.ui-tabs button .count{color:var(--app-faint);font-weight:500;margin-left:5px}

/* ---- data table ------------------------------------------------------- */
.ui-scroll{overflow-x:auto}
.ui-tbl{width:100%;border-collapse:collapse;font-size:13px}
.ui-tbl th{text-align:left;font-size:10.5px;text-transform:uppercase;letter-spacing:.05em;color:var(--app-faint);font-weight:650;padding:11px 14px;border-bottom:1px solid var(--app-border);background:var(--app-panel2)}
.ui-tbl th.r{text-align:right}
.ui-tbl td{padding:10px 14px;border-bottom:1px solid var(--app-border);vertical-align:middle;color:var(--app-text)}
.ui-tbl td.mut{color:var(--app-muted)} .ui-tbl td.t{font-size:12px;color:var(--app-muted)}
.ui-tbl tbody tr.clickable{cursor:pointer}
.ui-tbl tbody tr.clickable:hover td{background:var(--app-hover)}
.ui-tbl tr:last-child td{border-bottom:0}
.ui-empty{text-align:center;color:var(--app-faint);padding:34px}

/* ---- card cell + glyph ------------------------------------------------ */
.ui-cardcell{display:flex;align-items:center;gap:11px}
.ui-cardcell .nm{font-weight:580} .ui-cardcell .pan{font-size:11.5px;color:var(--app-faint)}
.ui-glyph{width:34px;height:22px;border-radius:5px;flex:none;display:grid;place-items:center;font-size:8px;font-weight:800;letter-spacing:.03em;background:var(--app-glyph-bg);color:var(--app-glyph-text)}
.ui-glyph.big{width:42px;height:28px}

/* ---- pills / chips / tags --------------------------------------------- */
.ui-pill{display:inline-flex;align-items:center;gap:6px;font-size:11.5px;font-weight:650;padding:3px 9px;border-radius:999px}
.ui-pill i{width:6px;height:6px;border-radius:50%}
.ui-pill.good{color:var(--app-good);background:var(--app-good-soft)} .ui-pill.good i{background:var(--app-good)}
.ui-pill.bad{color:var(--app-bad);background:var(--app-bad-soft)} .ui-pill.bad i{background:var(--app-bad)}
.ui-pill.warn{color:var(--app-warn);background:var(--app-warn-soft)} .ui-pill.warn i{background:var(--app-warn)}
.ui-pill.info{color:var(--app-info);background:var(--app-info-soft)} .ui-pill.info i{background:var(--app-info)}
.ui-pill.neutral{color:var(--app-muted);background:var(--app-panel2);border:1px solid var(--app-border)}
.ui-mid{font-size:12px;color:var(--app-muted);background:var(--app-panel2);border:1px solid var(--app-border);border-radius:6px;padding:2px 7px;font-family:var(--mono)}
.ui-tag{font-size:11.5px;color:var(--app-muted);background:var(--app-panel2);border:1px solid var(--app-border);border-radius:6px;padding:2px 8px}
.ui-badge{font-size:10px;font-weight:700;letter-spacing:.04em;border-radius:5px;padding:1px 5px}
.ui-badge.warn{color:var(--app-warn);background:var(--app-warn-soft)}
.ui-badge.accent{color:var(--app-accent-ink);background:var(--app-accent-soft)}

/* ---- modal ------------------------------------------------------------ */
.ui-scrim{position:fixed;inset:0;z-index:1300;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(5,6,10,.58);backdrop-filter:blur(6px)}
.ui-modal{width:100%;max-width:620px;max-height:88vh;display:flex;flex-direction:column;background:var(--app-panel);border:1px solid var(--app-border2);border-radius:18px;overflow:hidden;box-shadow:0 32px 60px -28px rgba(0,0,0,.8)}
.ui-modal .mh{display:flex;align-items:flex-start;gap:14px;padding:18px 20px;border-bottom:1px solid var(--app-border)}
.ui-modal .mt{font-weight:660;font-size:18px;letter-spacing:-.02em}
.ui-modal .mb{padding:16px 20px;overflow-y:auto}
.ui-x{margin-left:4px;width:32px;height:32px;border-radius:8px;border:1px solid var(--app-border);background:var(--app-panel2);color:var(--app-muted);cursor:pointer;flex:none}
.ui-meta{display:grid;grid-template-columns:repeat(var(--n,3),1fr);gap:1px;background:var(--app-border);border-bottom:1px solid var(--app-border)}
.ui-meta>div{background:var(--app-panel);padding:12px 20px}
.ui-meta span{font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--app-faint);font-weight:650;display:block}
.ui-meta b{font-size:14px;font-weight:600;display:block;margin-top:4px}

/* ---- timeline (attempt history) --------------------------------------- */
.ui-timeline{position:relative;padding-left:26px}
.ui-timeline::before{content:"";position:absolute;left:5px;top:8px;bottom:20px;width:2px;background:var(--app-border2)}
.ui-step{position:relative;padding-bottom:18px} .ui-step:last-child{padding-bottom:0}
.ui-step .node{position:absolute;left:-26px;top:2px;width:12px;height:12px;border-radius:50%;border:2px solid var(--app-panel)}
.ui-step.fail .node{background:var(--app-bad);box-shadow:0 0 0 4px var(--app-bad-soft)}
.ui-step.pass .node{background:var(--app-good);box-shadow:0 0 0 4px var(--app-good-soft)}
.ui-step .top{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.ui-step .verdict{font-size:13px;font-weight:700}
.ui-step.fail .verdict{color:var(--app-bad)} .ui-step.pass .verdict{color:var(--app-good)}
.ui-step .stamp{font-size:12px;color:var(--app-faint)}
.ui-step .line{margin-top:5px;font-size:13px;color:var(--app-muted)}
.ui-step .tags{margin-top:8px;display:flex;gap:7px;flex-wrap:wrap}

/* ---- collapsible raw -------------------------------------------------- */
.ui-raw{border:1px solid var(--app-border);border-radius:10px;overflow:hidden}
.ui-raw summary{list-style:none;cursor:pointer;padding:10px 13px;font-size:12.5px;font-weight:600;color:var(--app-muted);background:var(--app-panel2)}
.ui-raw summary::-webkit-details-marker{display:none}
.ui-raw pre{margin:0;padding:13px;font-size:11px;line-height:1.55;color:var(--app-muted);overflow-x:auto;white-space:pre-wrap;word-break:break-all;max-height:260px;font-family:var(--mono)}

@media (max-width:820px){.ui-kpis{grid-template-columns:repeat(2,1fr)}.ui-meta{grid-template-columns:repeat(2,1fr)}}
`;
