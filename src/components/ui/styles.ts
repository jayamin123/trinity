// ---------------------------------------------------------------------------
// Trinity design system — the single source of visual truth.
//
// Extracted from the Activity ledger (the look we standardized on) and then
// NORMALIZED onto one scale: every interactive control is the same height,
// every radius comes from one ramp, spacing/typography/brightness are shared.
// Colors read the global `--app-*` theme tokens, so the whole kit re-themes.
// Injected once, server-side, in the root layout — no CSS modules, no flash.
//
// Prefix: `.ui-`.
// ---------------------------------------------------------------------------

export const UI_CSS = `
/* ---- normalized design scale ------------------------------------------ */
:root{
  --sp-1:4px; --sp-2:8px; --sp-3:12px; --sp-4:16px; --sp-5:20px; --sp-6:24px;
  --r-xs:6px; --r-sm:8px; --r-md:10px; --r-lg:14px; --r-xl:18px; --r-pill:999px;
  --ctl-h:36px; --ctl-h-sm:30px; --ctl-h-lg:44px;
  --fs-micro:10.5px; --fs-tiny:11.5px; --fs-sm:12px; --fs-body:13px; --fs-lead:14px;
  --ring:0 0 0 3px var(--app-accent-soft);
  --tr:.14s ease;
}

/* ---- root + helpers ---------------------------------------------------- */
.ui{--mono:"Cascadia Code",ui-monospace,Consolas,monospace;color:var(--app-text);font-variant-numeric:tabular-nums}
.ui-mono{font-family:var(--mono)}
.ui-mut{color:var(--app-muted)} .ui-faint{color:var(--app-faint);font-size:var(--fs-sm)}
.ui-r{text-align:right} .ui-nowrap{white-space:nowrap}
.ui-row{display:flex;align-items:center;gap:var(--sp-2)} .ui-row.wrap{flex-wrap:wrap}
.ui-spacer{flex:1}

/* ---- page header ------------------------------------------------------- */
.ui-head{display:flex;align-items:flex-start;gap:var(--sp-4);margin-bottom:var(--sp-5)}
.ui-head h1{margin:0;font-size:22px;font-weight:680;letter-spacing:-.02em;color:var(--app-text)}
.ui-head p{margin:3px 0 0;font-size:var(--fs-body);color:var(--app-muted)}

/* ---- surfaces --------------------------------------------------------- */
.ui-panel{background:var(--app-panel);border:1px solid var(--app-border);border-radius:var(--r-lg)}
.ui-panel.pad{padding:var(--sp-4)}
.ui-panel.table{overflow:hidden;box-shadow:var(--app-shadow)}
.ui-sect{font-size:var(--fs-sm);text-transform:uppercase;letter-spacing:.06em;color:var(--app-faint);font-weight:650}

/* ---- KPI cards (icon tile + metric + optional delta) ------------------ */
.ui-kpis{display:grid;grid-template-columns:repeat(var(--n,4),1fr);gap:var(--sp-3)}
.ui-kpi{position:relative;background:var(--app-panel);border:1px solid var(--app-border);border-radius:var(--r-lg);padding:var(--sp-4);box-shadow:var(--app-shadow);transition:border-color var(--tr)}
.ui-kpi:hover{border-color:var(--app-border2)}
.ui-kpi .top{display:flex;justify-content:space-between;align-items:flex-start;gap:var(--sp-2)}
.ui-kpi .lab{font-size:var(--fs-sm);color:var(--app-muted);font-weight:550;padding-top:3px}
.ui-kpi .icon{width:32px;height:32px;flex:none;border-radius:var(--r-md);background:var(--app-accent-soft);color:var(--app-accent-ink);display:grid;place-items:center;font-size:15px;font-weight:700}
.ui-kpi .icon.good{background:var(--app-good-soft);color:var(--app-good)} .ui-kpi .icon.bad{background:var(--app-bad-soft);color:var(--app-bad)}
.ui-kpi .val{font-size:28px;font-weight:680;letter-spacing:-.025em;margin-top:var(--sp-3)}
.ui-kpi .val small{font-size:15px;color:var(--app-faint);font-weight:600}
.ui-kpi .val.good{color:var(--app-good)} .ui-kpi .val.bad{color:var(--app-bad)}
.ui-kpi .delta{font-size:var(--fs-tiny);font-weight:650;margin-top:var(--sp-2)}
.ui-kpi .delta.up{color:var(--app-good)} .ui-kpi .delta.down{color:var(--app-muted)}
/* standalone trend visuals (used outside KPI cards) */
.ui-spark{width:90px;height:32px} .ui-ring{display:block}

/* ---- buttons ---------------------------------------------------------- */
.ui-btn{display:inline-flex;align-items:center;justify-content:center;gap:var(--sp-2);box-sizing:border-box;
  height:var(--ctl-h);padding:0 16px;border-radius:var(--r-md);border:1px solid transparent;
  font:inherit;font-weight:600;font-size:var(--fs-body);line-height:1;cursor:pointer;white-space:nowrap;
  transition:filter var(--tr),background var(--tr),border-color var(--tr),box-shadow var(--tr),transform var(--tr)}
.ui-btn:active:not(:disabled){transform:translateY(1px)}
.ui-btn:disabled{opacity:.5;cursor:not-allowed}
.ui-btn:focus-visible{outline:none;box-shadow:var(--ring)}
.ui-btn.primary{background:linear-gradient(180deg,color-mix(in srgb,var(--app-accent) 86%,#fff),var(--app-accent));color:var(--app-accent-on);box-shadow:0 1px 2px rgba(15,18,35,.16),inset 0 1px 0 rgba(255,255,255,.22)}
.ui-btn.primary:hover:not(:disabled){filter:brightness(1.05);box-shadow:0 4px 12px -4px color-mix(in srgb,var(--app-accent) 62%,transparent),inset 0 1px 0 rgba(255,255,255,.22)}
.ui-btn.ghost{background:var(--app-panel);color:var(--app-text);border-color:var(--app-border2)}
.ui-btn.ghost:hover:not(:disabled){background:var(--app-hover);border-color:var(--app-muted)}
.ui-btn.subtle{background:var(--app-accent-soft);color:var(--app-accent-ink)}
.ui-btn.subtle:hover:not(:disabled){filter:brightness(1.04)}
.ui-btn.danger{background:var(--app-bad-soft);color:var(--app-bad)}
.ui-btn.danger:hover:not(:disabled){filter:brightness(1.04)}
.ui-btn.sm{height:var(--ctl-h-sm);padding:0 12px;font-size:var(--fs-sm);border-radius:var(--r-sm)}
.ui-btn.lg{height:var(--ctl-h-lg);padding:0 22px;font-size:var(--fs-lead)}
.ui-iconbtn{display:inline-grid;place-items:center;box-sizing:border-box;width:var(--ctl-h);height:var(--ctl-h);
  border-radius:var(--r-md);border:1px solid var(--app-border);background:var(--app-panel);color:var(--app-muted);cursor:pointer;
  transition:background var(--tr),color var(--tr),border-color var(--tr),box-shadow var(--tr)}
.ui-iconbtn:hover{background:var(--app-hover);color:var(--app-text)}
.ui-iconbtn:focus-visible{outline:none;box-shadow:var(--ring)}

/* ---- filters (all controls share --ctl-h so a row aligns) ------------- */
.ui-filters{display:flex;gap:var(--sp-2);flex-wrap:wrap;align-items:center;margin-bottom:var(--sp-4)}
.ui-seg{display:inline-flex;box-sizing:border-box;height:var(--ctl-h);background:var(--app-panel);border:1px solid var(--app-border);border-radius:var(--r-md);padding:3px}
.ui-seg button{display:inline-flex;align-items:center;border:0;background:transparent;color:var(--app-muted);font:inherit;font-weight:550;font-size:var(--fs-body);padding:0 13px;border-radius:calc(var(--r-md) - 3px);cursor:pointer;transition:background var(--tr),color var(--tr)}
.ui-seg button.on{background:var(--app-accent-soft);color:var(--app-accent-ink);box-shadow:0 1px 2px rgba(15,18,35,.06)}
.ui-seg button span{color:var(--app-faint);font-size:var(--fs-tiny);margin-left:5px}
.ui-chip{display:inline-flex;align-items:center;gap:7px;box-sizing:border-box;height:var(--ctl-h);font-size:var(--fs-body);font-weight:500;background:var(--app-panel);border:1px solid var(--app-border);border-radius:var(--r-md);padding:0 11px;color:var(--app-muted);cursor:pointer;transition:border-color var(--tr)}
.ui-chip:hover{border-color:var(--app-border2)}
.ui-chip select{border:0;background:transparent;color:var(--app-text);font:inherit;font-weight:600;outline:none;max-width:180px;cursor:pointer}
.ui-chip input[type=checkbox]{accent-color:var(--app-accent);width:15px;height:15px}
.ui-search{display:inline-flex;align-items:center;gap:var(--sp-2);box-sizing:border-box;height:var(--ctl-h);background:var(--app-panel);border:1px solid var(--app-border);border-radius:var(--r-md);padding:0 11px;color:var(--app-muted);transition:border-color var(--tr),box-shadow var(--tr)}
.ui-search:focus-within{border-color:var(--app-accent);box-shadow:var(--ring)}
.ui-search svg{width:14px;height:14px;flex:none;color:var(--app-faint)}
.ui-search input{border:0;background:transparent;outline:none;font:inherit;font-size:var(--fs-body);font-weight:500;color:var(--app-text);width:150px}
.ui-search input::placeholder{color:var(--app-faint)}

/* ---- form fields ------------------------------------------------------ */
.ui-field{display:flex;flex-direction:column;gap:6px}
.ui-field>label{font-size:var(--fs-micro);text-transform:uppercase;letter-spacing:.05em;color:var(--app-faint);font-weight:650}
.ui-input{box-sizing:border-box;height:var(--ctl-h);background:var(--app-panel);border:1px solid var(--app-border);border-radius:var(--r-md);padding:0 12px;color:var(--app-text);font:inherit;font-size:var(--fs-body);width:100%;outline:none;transition:border-color var(--tr),box-shadow var(--tr)}
.ui-input:focus{border-color:var(--app-accent);box-shadow:var(--ring)}
.ui-input::placeholder{color:var(--app-faint)}
select.ui-input{cursor:pointer;appearance:none;background-image:linear-gradient(45deg,transparent 50%,var(--app-faint) 50%),linear-gradient(135deg,var(--app-faint) 50%,transparent 50%);background-position:calc(100% - 16px) center,calc(100% - 11px) center;background-size:5px 5px,5px 5px;background-repeat:no-repeat;padding-right:30px}

/* ---- tabs ------------------------------------------------------------- */
.ui-tabs{display:inline-flex;gap:2px;border-bottom:1px solid var(--app-border);margin-bottom:var(--sp-4)}
.ui-tabs button{border:0;background:transparent;font:inherit;font-weight:600;font-size:var(--fs-lead);color:var(--app-muted);padding:9px 15px;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px;transition:color var(--tr),border-color var(--tr)}
.ui-tabs button.on{color:var(--app-accent);border-bottom-color:var(--app-accent)}
.ui-tabs button .count{color:var(--app-faint);font-weight:500;margin-left:5px}

/* ---- data table ------------------------------------------------------- */
.ui-scroll{overflow-x:auto}
.ui-tbl{width:100%;border-collapse:collapse;font-size:var(--fs-body)}
.ui-tbl th{text-align:left;font-size:var(--fs-micro);text-transform:uppercase;letter-spacing:.05em;color:var(--app-faint);font-weight:650;padding:11px 16px;border-bottom:1px solid var(--app-border);background:var(--app-panel2)}
.ui-tbl th.r{text-align:right}
.ui-tbl td{padding:12px 16px;border-bottom:1px solid var(--app-border);vertical-align:middle;color:var(--app-text)}
.ui-tbl td.mut{color:var(--app-muted)} .ui-tbl td.t{font-size:var(--fs-sm);color:var(--app-muted)}
.ui-tbl tbody tr.clickable{cursor:pointer;transition:background var(--tr)}
.ui-tbl tbody tr.clickable:hover td{background:var(--app-hover)}
.ui-tbl tr:last-child td{border-bottom:0}
.ui-empty{text-align:center;color:var(--app-faint);padding:34px}

/* ---- card cell + glyph ------------------------------------------------ */
.ui-cardcell{display:flex;align-items:center;gap:11px}
.ui-cardcell .nm{font-weight:580} .ui-cardcell .pan{font-size:var(--fs-tiny);color:var(--app-faint)}
.ui-glyph{width:34px;height:22px;border-radius:var(--r-xs);flex:none;display:grid;place-items:center;font-size:8px;font-weight:800;letter-spacing:.03em;background:var(--app-glyph-bg);color:var(--app-glyph-text)}
.ui-glyph.big{width:42px;height:28px}

/* ---- pills / chips / tags --------------------------------------------- */
.ui-pill{display:inline-flex;align-items:center;gap:6px;font-size:var(--fs-tiny);font-weight:650;padding:3px 9px;border-radius:var(--r-pill)}
.ui-pill i{width:6px;height:6px;border-radius:50%}
.ui-pill.good{color:var(--app-good);background:var(--app-good-soft)} .ui-pill.good i{background:var(--app-good)}
.ui-pill.bad{color:var(--app-bad);background:var(--app-bad-soft)} .ui-pill.bad i{background:var(--app-bad)}
.ui-pill.warn{color:var(--app-warn);background:var(--app-warn-soft)} .ui-pill.warn i{background:var(--app-warn)}
.ui-pill.info{color:var(--app-info);background:var(--app-info-soft)} .ui-pill.info i{background:var(--app-info)}
.ui-pill.neutral{color:var(--app-muted);background:var(--app-panel2);border:1px solid var(--app-border)}
.ui-mid{font-size:var(--fs-sm);color:var(--app-muted);background:var(--app-panel2);border:1px solid var(--app-border);border-radius:var(--r-xs);padding:2px 7px;font-family:var(--mono)}
.ui-tag{font-size:var(--fs-tiny);color:var(--app-muted);background:var(--app-panel2);border:1px solid var(--app-border);border-radius:var(--r-xs);padding:2px 8px}
.ui-badge{font-size:10px;font-weight:700;letter-spacing:.04em;border-radius:var(--r-xs);padding:2px 5px}
.ui-badge.warn{color:var(--app-warn);background:var(--app-warn-soft)}
.ui-badge.accent{color:var(--app-accent-ink);background:var(--app-accent-soft)}

/* ---- modal (left as-is for now — composed from the parts above) ------- */
.ui-scrim{position:fixed;inset:0;z-index:1300;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(5,6,10,.58);backdrop-filter:blur(6px)}
.ui-modal{width:100%;max-width:620px;max-height:88vh;display:flex;flex-direction:column;background:var(--app-panel);border:1px solid var(--app-border2);border-radius:var(--r-xl);overflow:hidden;box-shadow:0 32px 60px -28px rgba(0,0,0,.8)}
.ui-modal .mh{display:flex;align-items:flex-start;gap:14px;padding:18px 20px;border-bottom:1px solid var(--app-border)}
.ui-modal .mt{font-weight:660;font-size:18px;letter-spacing:-.02em}
.ui-modal .mb{padding:16px 20px;overflow-y:auto}
.ui-x{margin-left:4px;box-sizing:border-box;width:var(--ctl-h-sm);height:var(--ctl-h-sm);border-radius:var(--r-sm);border:1px solid var(--app-border);background:var(--app-panel2);color:var(--app-muted);cursor:pointer;flex:none}
.ui-meta{display:grid;grid-template-columns:repeat(var(--n,3),1fr);gap:1px;background:var(--app-border);border-bottom:1px solid var(--app-border)}
.ui-meta>div{background:var(--app-panel);padding:12px 20px}
.ui-meta span{font-size:var(--fs-micro);text-transform:uppercase;letter-spacing:.06em;color:var(--app-faint);font-weight:650;display:block}
.ui-meta b{font-size:var(--fs-lead);font-weight:600;display:block;margin-top:4px}
.ui-timeline{position:relative;padding-left:26px}
.ui-timeline::before{content:"";position:absolute;left:5px;top:8px;bottom:20px;width:2px;background:var(--app-border2)}
.ui-step{position:relative;padding-bottom:18px} .ui-step:last-child{padding-bottom:0}
.ui-step .node{position:absolute;left:-26px;top:2px;width:12px;height:12px;border-radius:50%;border:2px solid var(--app-panel)}
.ui-step.fail .node{background:var(--app-bad);box-shadow:0 0 0 4px var(--app-bad-soft)}
.ui-step.pass .node{background:var(--app-good);box-shadow:0 0 0 4px var(--app-good-soft)}
.ui-step .top{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.ui-step .verdict{font-size:var(--fs-body);font-weight:700}
.ui-step.fail .verdict{color:var(--app-bad)} .ui-step.pass .verdict{color:var(--app-good)}
.ui-step .stamp{font-size:var(--fs-sm);color:var(--app-faint)}
.ui-step .line{margin-top:5px;font-size:var(--fs-body);color:var(--app-muted)}
.ui-step .tags{margin-top:8px;display:flex;gap:7px;flex-wrap:wrap}
.ui-raw{border:1px solid var(--app-border);border-radius:var(--r-md);overflow:hidden}
.ui-raw summary{list-style:none;cursor:pointer;padding:10px 13px;font-size:var(--fs-sm);font-weight:600;color:var(--app-muted);background:var(--app-panel2)}
.ui-raw summary::-webkit-details-marker{display:none}
.ui-raw pre{margin:0;padding:13px;font-size:11px;line-height:1.55;color:var(--app-muted);overflow-x:auto;white-space:pre-wrap;word-break:break-all;max-height:260px;font-family:var(--mono)}

@media (max-width:820px){.ui-kpis{grid-template-columns:repeat(2,1fr)}.ui-meta{grid-template-columns:repeat(2,1fr)}}
`;
