# Old (flows.accotta.me) → New (flows2.accotta.me) — page-by-page parity

Legend: ✅ present · 🟡 partial · ❌ missing · 🔒 needs ENCRYPTION_KEY (CheckoutChamp) so can't fully work on flows2

## 1. Login  `/login`
| Element | New |
|---|---|
| Title, email, password, Sign in, error | ✅ |

## 2. Dashboard  `/`
| Element | New |
|---|---|
| KPI stat cards (totals, approval, volume, declined) | ✅ |
| Cards / active-flows / pending counts | ✅ |
| Recent activity list | ✅ |
| Range toggle (7d/30d/all) | ❌ |
| Group-by rollup (by product/flow) | ❌ |
| "Get started" onboarding card | ❌ (n/a — data already present) |

## 3. Cards  `/cards`
| Element | New |
|---|---|
| Tabs Pool/Pending/Fired/All | ✅ |
| Balance filter (All/Unlim/Has-balance) | ✅ |
| Source filter | ✅ |
| Flow filter (Pending+Fired) | ❌ |
| CC-verdict filter (Fired) | ❌ |
| Balance cell ("$x of $y", over-by) | ✅ |
| Card modal: schedules + transactions split | ✅ |
| Card modal: reveal PAN/CVV | ✅ (🔒 503 w/o key) |
| Card modal: links to the flow(s) | ❌ |
| CSV upload | ❌ 🔒 (encrypt needs key) |
| CSV export of grid | ❌ |

## 4. Flows  `/flows`
| Element | New |
|---|---|
| Flow list + progress + counts | ✅ |
| "+ New flow" button | ❌ |

## 5. New Flow  `/flows/new`
| Element | New |
|---|---|
| Gateway/campaign/product pickers (live CC) | ❌ 🔒 |
| Smart product filter (Product/Price, Above/Below/Between) | ❌ |
| Bulk count actions | ❌ |
| Roll distribution shapes (even/inc/dec/bell/edges) | ❌ |
| Schedule preview + count + window + Create | ❌ 🔒 |
| Preset library (from existing flows) | ❌ |

## 6. Flow detail  `/flows/[id]`
| Element | New |
|---|---|
| Header: name, status, Pause/Resume | ✅ |
| Add cards dialog | 🟡 (no smart filter/roll shapes) |
| Edit flow modal (name/window) | ❌ |
| Edit flow: add/delete product | ❌ |
| Edit flow: refresh from CC | ❌ 🔒 |
| Delete flow | ❌ |
| Schedule tab: day rollup, multi-expand | ✅ |
| Schedule tab: When (Future/Past/All) + Show (failed) | ✅ |
| Schedule tab: delete pending | ✅ |
| Schedule tab: edit pending (time/product/price/MID) | ❌ (PendingScheduleModal) |
| Activity/Logs tab: table | ✅ |
| Activity tab: Planned vs Executed columns | 🟡 (executed only) |
| Activity tab: cascade + CC-message columns | 🟡 |
| Activity tab: filters (Flow/Product/Amount/MID/Cascade/msg) | 🟡 (verdict+MID) |
| Row → Fire-attempts modal (plan vs actual, raw JSON) | ✅ |
| Fire-attempts modal: Retry button | ❌ |

## 7. Activity → Logs  `/logs`
| Element | New |
|---|---|
| Global ledger feed | ✅ |
| KPI strip | ✅ (new, better) |
| Verdict filter | ✅ |
| Flow filter | ✅ |
| Product filter | ❌ |
| Amount filter | ❌ |
| MID filter | ❌ (present on flow-logs tab) |
| Cascade filter | ❌ |
| CC-message filter | ❌ |
| Row → attempt trail | ✅ |
| Retry from modal | ❌ |

## 8. Settings  `/settings`
| Element | New |
|---|---|
| CC credentials form (name/url/login/pw) | ✅ |
| Save | ✅ (🔒 503 w/o key) |
| Test connection | ✅ (🔒 503 w/o key) |

## Gap backlog (to close, page order)
1. Cards: **Flow filter** + **CC-verdict filter** + card-modal flow links.
2. Logs: **Product / MID / Cascade / CC-message** filters (+ Amount).
3. Flows: **+ New flow** entry.
4. Flow detail: **Edit flow modal** (name/window/products/delete), **edit pending schedule**, **Retry** in attempts modal, Activity **Planned vs Executed** + cascade + message columns.
5. New Flow builder (🔒 CC — build UI + graceful).
6. Dashboard: range + group-by rollup.
7. CSV export on grids; CSV upload (🔒).
