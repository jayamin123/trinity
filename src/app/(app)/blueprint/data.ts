// ---------------------------------------------------------------------------
// Trinity Page Blueprint — the "recipe", not the code.
//
// Every fact here was extracted by reading the ACTUAL page source (grounded,
// not idealized). Each page carries how it works TODAY plus the ideal spec and
// the lessons learned from living with it. Rendered by ./page.tsx with the kit.
// ---------------------------------------------------------------------------

export type Where = "server" | "client";
export type Filter = { name: string; today: Where; ideal: Where; note?: string };
export type DataGroup = { source: string; items: string[] };
export type Lesson = { title: string; detail: string };

export type Page = {
  name: string;
  route: string;
  type: string;           // page-type id
  status: "grounded";
  purpose: string;
  primary: string;
  secondary: string[];
  questions: string[];
  actions: string[];
  data: { summary: DataGroup; list: DataGroup; detail: DataGroup; lookup: DataGroup };
  filters: Filter[];
  sections: string[];
  apis: string[];
  components: string[];
  state: string[];
  performance: string[];
  lessons: Lesson[];
};

// ---- The philosophy ------------------------------------------------------
export const INTRO = {
  title: "Trinity Page Blueprint",
  tagline: "We're not documenting the code. We're documenting how this kind of application should be built.",
  body: [
    "The current code is the result of months of trial and error — a great meal cooked by experimenting. This document is the rewritten recipe: same result, clean sequence.",
    "Each page was read from source and reverse-engineered into a spec: its purpose, entities, data, filters, sections, actions, and — most valuable — the lessons only visible after living with it. Then every page is sorted into a page TYPE. Trinity isn't 8 unique pages; it's 4 repeating patterns. Document the patterns and you have a framework for every future app.",
  ],
  verification: [
    "Each page's facts extracted directly from its source files (grounded, not idealized).",
    "Checked 3× per page: worksheet-vs-code, page-type classification, lessons accuracy.",
    "Reviewed as a whole to extract the universal spine and cross-page lessons.",
    "Final independent adversarial pass re-verified every claim against the code.",
  ],
};

// ---- 1. Page types (the patterns) ---------------------------------------
export const PAGE_TYPES = [
  {
    id: "dashboard", name: "Dashboard", tone: "info",
    purpose: "Give the user an at-a-glance overview. Read-only, fast, summary only.",
    examples: ["Home / Overview", "Analytics"],
    sections: ["Header", "KPIs", "Recent activity", "Quick actions"],
    rules: ["Never edit data here", "Summary numbers come from dedicated queries", "Fast, eager, no heavy scans"],
  },
  {
    id: "resource-list", name: "Resource List", tone: "accent",
    purpose: "Browse, search, monitor and manage a collection of one entity. ~80% of the app.",
    examples: ["Activity", "Cards", "Flows", "Flow detail"],
    sections: ["Header", "Summary (KPIs)", "Actions", "Filters", "Table", "Pagination", "Detail drawer"],
    rules: ["Filter / sort / paginate on the SERVER", "KPIs from a dedicated summary query", "Detail drawer fetches its own data on demand", "Row actions light; heavy actions in the drawer"],
  },
  {
    id: "action-flow", name: "Action Flow", tone: "warn",
    purpose: "Perform an action / workflow — not CRUD. State → inputs → confirm → execute → result.",
    examples: ["New flow (create + preview + fire)", "Deposit funds", "Refund"],
    sections: ["Header", "Current state", "Inputs", "Confirmation", "Execute", "Result"],
    rules: ["Validate once (server is the source of truth)", "One execution = one transaction", "Show the result / where it went"],
  },
  {
    id: "form", name: "Form", tone: "good",
    purpose: "View and edit one object. Header → sections → inputs → validation → save.",
    examples: ["Settings", "Profile", "Login (auth variant)"],
    sections: ["Header", "Sections", "Inputs", "Validation", "Save"],
    rules: ["One object per page", "Server validates + persists", "Clear saved / error feedback"],
  },
  {
    id: "wizard", name: "Wizard / Setup", tone: "neutral",
    purpose: "Guide a user step-by-step through configuration. (Reserved — not used in Trinity yet.)",
    examples: ["Facebook / BM setup", "Connect gateway"],
    sections: ["Header", "Progress", "Step form", "Validation", "Review", "Submit"],
    rules: ["One decision per step", "Can't advance until valid", "Review before submit"],
  },
];

// ---- 2. The master recipe (Resource List — the 80% pattern) -------------
export const MASTER_RECIPE = {
  type: "Resource List",
  note: "Four of Trinity's pages are this one pattern. Nail it once and every list page is a fill-in-the-blanks job.",
  steps: [
    { n: 1, title: "Purpose", body: "One sentence. If you can't, the page does too much." },
    { n: 2, title: "Primary entity", body: "Exactly one. Everything else supports it." },
    { n: 3, title: "Questions", body: "What is the user actually trying to answer? Decide before any UI." },
    { n: 4, title: "Data — 4 calls", body: "Summary (KPIs/counts) · List (rows + pagination + sort) · Detail (one entity, on demand) · Lookups (filter option lists)." },
    { n: 5, title: "Filters", body: "Search · Date · Status · relations · custom. Rule: everything filters server-side, in the query." },
    { n: 6, title: "Table", body: "Columns · server sort · server pagination · optional bulk select · light row actions." },
    { n: 7, title: "Detail drawer", body: "Overview · Timeline · Related records · Audit · Raw JSON. Fetches its own data; heavy payloads lazy." },
    { n: 8, title: "Actions", body: "Permission → Validation → Confirmation → Execute → Refresh. Heavy actions live in the drawer, not every row." },
    { n: 9, title: "State", body: "The page owns only: filters, sort, page, selection, drawer-open, search text. Everything else comes from the API." },
    { n: 10, title: "Performance", body: "Load order: Summary → Table → Drawer (lazy) → Heavy data (lazy). Never ship what a click hasn't asked for." },
  ],
};

// ---- 3. The 8 pages (grounded worksheets) -------------------------------
export const PAGES: Page[] = [
  {
    name: "Dashboard", route: "/", type: "dashboard", status: "grounded",
    purpose: "An at-a-glance operations overview: pool size, today's firing, active-flow progress, recent fires, and range-scoped totals.",
    primary: "Schedule", secondary: ["Card", "Flow", "Account"],
    questions: ["How many cards are in my pool?", "Today: to-fire / fired / succeeded / failed?", "Which flows are active and how far along?", "What were the last 10 fires?", "Over a range, charges by flow or price?"],
    actions: ["(read-only) Range toggle", "Group-by toggle", "Onboarding links"],
    data: {
      summary: { source: "✅ 4 dedicated db.schedule.count() + card.count(POOL_WHERE) in one Promise.all — CORRECT pattern", items: ["Cards in pool", "Today to-fire", "Today fired", "Today succeeded", "Today failed"] },
      list: { source: "Recent: schedule.findMany take:10. Active flows: flow.findMany + per-flow count (N+1)", items: ["Recent activity (10)", "Active flows + progress"] },
      detail: { source: "None inline — lives on /flows/{id}", items: [] },
      lookup: { source: "None (range/groupBy are hardcoded enums)", items: [] },
    },
    filters: [
      { name: "Range (today/7d/30d/all)", today: "server", ideal: "server", note: "Applies only to the Totals query; the 5 top KPIs ignore it (always 'today')." },
      { name: "Group by (flow/price)", today: "server", ideal: "server", note: "Bucketed in a server-side JS render loop, not the query." },
    ],
    sections: ["Header", "Onboarding (first-time)", "KPI row (5)", "Active flows + Recent activity + Totals"],
    apis: ["Prisma reads only (no mutations on this page)"],
    components: ["All MUI (Card, Grid, LinearProgress, Chip)", "local StatCard", "no shared kit"],
    state: ["None — pure server component; 'state' is URL search params"],
    performance: ["3 DB round-trip waves", "Totals findMany is UNBOUNDED for range=all (full-table scan each load)", "N+1 counts for active-flow progress", "eager, no streaming"],
    lessons: [
      { title: "Two notions of the same number", detail: "Top KPIs are 'today' from dedicated counts; the Totals card is range-scoped from a different unbounded dataset. They can't reconcile without reading the code." },
      { title: "Unbounded scan for a summary", detail: "Totals uses findMany + JS aggregation (to get per-group MID 'for free') instead of GROUP BY — trading a bounded aggregate for a full row scan. 'All time' reads every schedule on every dashboard load." },
      { title: "N+1 progress counts", detail: "One count query per active flow instead of a single grouped count." },
      { title: "JSON parsed at render time", detail: "MID / price / lifecycle status live inside flowSettings & firePlan JSON, parsed per row — can't be filtered or indexed in the DB." },
    ],
  },
  {
    name: "Activity", route: "/activity", type: "resource-list", status: "grounded",
    purpose: "A permanent, read-only ledger of every CheckoutChamp charge attempt (one row per attempt, retries included), with KPIs, filters and a per-schedule attempt-history drill-down.",
    primary: "Transaction", secondary: ["Card", "Flow", "Schedule (grouping key)"],
    questions: ["Approval rate / volume / declines?", "Did this attempt approve or decline?", "Was the schedule retried — what did each attempt say?", "Planned vs actual MID; did it cascade?", "What did CheckoutChamp reply (raw)?"],
    actions: ["Filter", "Open detail modal", "Expand raw response"],
    data: {
      summary: { source: "❌ Derived in React (useMemo) from the fetched rows — NOT a query", items: ["Charges", "Approval rate", "Captured volume", "Declined", "12-day sparkline"] },
      list: { source: "transaction.findMany orderBy firedAt desc, take:1000; cards/flows fetched separately + joined in JS", items: ["Time", "Card", "Flow", "Product", "Amount", "MID", "Status + Retry"] },
      detail: { source: "Uses already-loaded rows — filters rows by scheduleId (no fetch)", items: ["Meta grid", "Attempt-history timeline", "Raw CC response"] },
      lookup: { source: "Derived client-side from rows (Set over flowName / productName / mid)", items: ["Flow", "Product", "MID"] },
    },
    filters: [
      { name: "Verdict (all/approved/declined)", today: "client", ideal: "server" },
      { name: "Flow", today: "client", ideal: "server" },
      { name: "Product", today: "client", ideal: "server" },
      { name: "MID", today: "client", ideal: "server", note: "Conflates actualMid ?? plannedMid — one option matches on two fields." },
      { name: "Cascaded", today: "client", ideal: "server" },
      { name: "Message search", today: "client", ideal: "server", note: "Substring over in-memory rows; should be full-text in the query." },
    ],
    sections: ["Header", "KPI row (4)", "Filter bar", "Table", "Detail modal (lazy content)"],
    apis: ["Server component Prisma read only — no client fetch, no actions"],
    components: ["Custom (bespoke .lg-* styles + SVG Ring/Spark)", "no MUI", "no pagination controls"],
    state: ["verdict, flow, product, mid, cascade, msg, open(row)"],
    performance: ["Full 1000-row payload shipped up-front — INCLUDING every rawResponse", "raw is not lazy", "detail modal re-filters in memory"],
    lessons: [
      { title: "KPIs are truncation-biased & filter-blind", detail: "Approval rate / volume / declined are computed in React from ≤1000 rows, so they describe only the last 1000 attempts and never reflect the active filters. Must be a dedicated aggregate query over the whole table." },
      { title: "Hard take:1000, no pagination", detail: "Silently drops older history on a table explicitly designed to be permanent & append-only." },
      { title: "Over-fetching raw payloads", detail: "rawResponse (large CC text) is sent for all 1000 rows though shown for at most one modal — should lazy-load on open." },
      { title: "Joins in application code", detail: "Transaction has no Prisma relations, so card/flow names are Map-joined and cardholder name is JSON.parse(cardData) per request." },
    ],
  },
  {
    name: "Cards", route: "/cards", type: "resource-list", status: "grounded",
    purpose: "A single-page inventory of every uploaded virtual card — pool/pending/fired status, remaining balance, and fire outcome — with CSV upload and per-card drill-down.",
    primary: "Card", secondary: ["Schedule", "Flow"],
    questions: ["How many cards pool vs in-use vs total?", "Which are unused / scheduled / charged?", "Did a fired card succeed, fail, or cascade?", "How much balance is left; over-balance?", "Full card history + billing + secrets?"],
    actions: ["Upload CSV (toolbar)", "Open detail (row → modal)", "Reveal PAN/CVV (modal, lazy)", "Export (client grid)"],
    data: {
      summary: { source: "❌ Derived in the server render: rows.filter(...).length over the full in-memory array, not a query", items: ["In pool", "In use", "Total", "Tab counts"] },
      list: { source: "card.findMany + schedule.findMany (two flat queries) joined in JS", items: ["Card ••last4", "Name", "Balance", "Source", "Status", "Flow", "Fired", "Verdict"] },
      detail: { source: "✅ getCardDetail(cardId) fetched on modal open; secrets via separate reveal action", items: ["Schedules", "Billing / contact", "Card visual"] },
      lookup: { source: "Derived client-side from visible rows (Set)", items: ["Source", "Flow"] },
    },
    filters: [
      { name: "Balance (all/unlim/numbered)", today: "client", ideal: "server" },
      { name: "Source file", today: "client", ideal: "server" },
      { name: "Flow (fired/pending tabs)", today: "client", ideal: "server" },
      { name: "CC verdict (fired tab)", today: "client", ideal: "server" },
      { name: "Tabs: Pool/Pending/Fired/All", today: "client", ideal: "server", note: "Client filter of one dataset, not per-tab queries." },
    ],
    sections: ["Header + counts + upload", "Upload result alert", "Tabs → filters → DataGrid → CardModal"],
    apis: ["uploadCsv", "getCardDetail", "revealCardSecretsByCardId", "(/api/cards ingest is a sibling path, not called here)"],
    components: ["MUI DataGrid", "shared modal-shared kit", "lazy schedule modals (next/dynamic)"],
    state: ["tab, balanceFilter, sourceFilter, flowFilter, verdictFilter, openCardId"],
    performance: ["Whole pool loaded then client tab/filter/sort/paginate", "modal detail lazy; secrets lazier (explicit reveal)"],
    lessons: [
      { title: "Counts derived from rows, not queried", detail: "There ARE correct pool-count helpers in lib/cards.ts (countCardsInPool) — the page ignores them and recomputes from loaded rows, with a subtly different definition of 'pool'." },
      { title: "Whole-table load then client everything", detail: "No server pagination/filter/sort; scaling is bounded by shipping every row to the browser." },
      { title: "Balance math duplicated", detail: "Live-charge / over-balance logic exists both as SQL in lib/cards.ts and as a JS reduce in page.tsx — two implementations that can drift." },
      { title: "Detail drawer done right", detail: "getCardDetail fetches on open and PAN/CVV decrypt only on explicit click — the model the other lists should copy." },
    ],
  },
  {
    name: "Flows", route: "/flows", type: "resource-list", status: "grounded",
    purpose: "The landing index of every flow with per-flow progress (fired / succeeded / % complete) and a create button.",
    primary: "Flow", secondary: ["Schedule (counted)", "Account (gate)"],
    questions: ["What flows exist?", "Active / paused / completed?", "How far along (fired vs total, success rate)?", "What window / MID / campaign / product mix?"],
    actions: ["(read-only) + New flow", "View → /flows/{id}"],
    data: {
      summary: { source: "None global; per-row KPIs are an N+1 (2 counts per flow)", items: ["(no page-level totals)"] },
      list: { source: "flow.findMany include _count.schedules; total_cards from flowSettings JSON", items: ["Name + status", "Window / MID / campaign", "Fired / succeeded / rate", "Progress bar"] },
      detail: { source: "None inline — on /flows/{id}", items: [] },
      lookup: { source: "None", items: [] },
    },
    filters: [{ name: "(none today)", today: "server", ideal: "server", note: "No filters at all; a real Resource List would add server-side status/search." }],
    sections: ["Header + New flow", "No-account warning", "Card per flow"],
    apis: ["Prisma reads only (findMany + count×2/flow + account.findFirst)"],
    components: ["All MUI (Card, Chip, LinearProgress)", "no modals"],
    state: ["None — pure server component"],
    performance: ["Eager", "N+1: 2 count queries per flow, unbounded by flow count", "no pagination"],
    lessons: [
      { title: "N+1 instead of grouped aggregate", detail: "2 count queries per flow rather than one GROUP BY over schedules." },
      { title: "Progress denominator lives in JSON", detail: "total_cards is read from the flowSettings blob, so the % depends on JSON staying in sync with actual schedule rows." },
      { title: "No filters / no pagination", detail: "Renders every flow every load — fine at small N, not a Resource List at scale." },
    ],
  },
  {
    name: "Flow detail", route: "/flows/[id]", type: "resource-list", status: "grounded",
    purpose: "Operate a single flow: view the day-by-day schedule and fire activity, edit / pause / resume, add cards mid-flight, and drill into each charge's plan-vs-actual and retries.",
    primary: "Flow (+ its Schedules)", secondary: ["Schedule", "Card", "Account", "CheckoutChamp gateways/products"],
    questions: ["What's scheduled each day, what fired?", "Which failed and why?", "Did it cascade MIDs?", "Planned vs actually charged?", "Card / cardholder behind a charge?"],
    actions: ["Pause / Resume", "Add cards", "Edit flow / products", "Edit / delete schedule", "Retry failed", "Reveal secrets"],
    data: {
      summary: { source: "✅ dedicated Promise.all of ~10 count/findFirst queries (succeeded/fired/pending/next/last)", items: ["Succeeded", "Fired", "Pending", "Next / last", "isFresh"] },
      list: { source: "Plan: getFlowDayRollup (ALL schedules, grouped by BKK date). Activity tab: schedule.findMany take:300 (lazy on tab)", items: ["Day rollup → per-card rows", "Activity: fired charges"] },
      detail: { source: "✅ modals fetch on demand: getScheduleDetail, live CC gateways/products, revealCardSecrets", items: ["Schedule detail", "Attempt history", "Gateway / product pickers"] },
      lookup: { source: "Live CheckoutChamp calls inside modals (gateways, products)", items: ["Gateways", "Products"] },
    },
    filters: [
      { name: "Plan: When (future/past/all)", today: "client", ideal: "server" },
      { name: "Plan: Show (all/only failed)", today: "client", ideal: "server" },
      { name: "Activity: DataGrid columns", today: "client", ideal: "server", note: "Only take:300 + status:fired constrain the server." },
    ],
    sections: ["Header (name/status/edit) + actions", "Tabs: Schedule | Activity", "Plan rollup OR Activity grid", "Modals"],
    apis: ["pause/resumeFlow", "addCardsToFlow / previewAddSchedule", "updateFlow / deleteFlow / add-remove product", "updateSchedule / deleteSchedule / retryFailedSchedule", "getScheduleDetail", "revealCardSecrets", "live CC: listGateways/Products/Campaigns"],
    components: ["MUI (Table, Collapse, Dialog, DataGrid, Accordion)", "4 modals + lazy CardModal", "shared modal-shared kit"],
    state: ["expanded map, dateFilter, showFilter, open modal ids; each row edit/confirm state + useTransition"],
    performance: ["Plan rollup eager & heavy (every schedule + JSON parse, unbounded)", "Activity lazy on tab (take:300)", "modals & CC catalogs load on open", "CardModal code-split"],
    lessons: [
      { title: "flowSettings is one JSON blob", detail: "Every mutation (pause, resume, add cards, add/remove product, edit) read-modify-REWRITES the whole JSON string — race-prone, no partial updates." },
      { title: "Hand-maintained counters drift", detail: "cc_products[].count duplicates truth in schedule rows; delete even does a defensive firePlan string-match to catch drift." },
      { title: "Plan-vs-actual reconstructed from JSON", detail: "fireAttempts is a JSON array re-parsed in 3+ places; 'actual' is dug out of cc_response.raw strings." },
      { title: "Good detail model, heavy list", detail: "Modals fetch on demand (correct), but the Plan rollup loads & parses every schedule for the flow up-front." },
    ],
  },
  {
    name: "New flow", route: "/flows/new", type: "action-flow", status: "grounded",
    purpose: "Create a flow: choose gateway + campaign + per-product card counts + a date window, preview the randomized daily distribution, then create it (schedules written, cron fires).",
    primary: "Flow (created)", secondary: ["CheckoutChamp gateways/campaigns/products", "Card pool", "Account", "prior Flows (presets)"],
    questions: ["Which MID / campaign / products can I run?", "How many cards are available?", "How will N cards spread across the window?", "Can I clone a previous flow?"],
    actions: ["Load gateways/campaigns/products", "Preview / reroll distribution", "Create flow"],
    data: {
      summary: { source: "totalCards derived in React (useMemo over picks); availableCount from countAvailableForFlow", items: ["Total cards", "Available"] },
      list: { source: "Preview: previewSchedule server action (randomDailyCounts) — per-day bars", items: ["Per-day distribution"] },
      detail: { source: "N/A", items: [] },
      lookup: { source: "Live CC on mount (gateways, campaigns) + on campaign pick (products); presets from flow.findMany take:20", items: ["Gateways", "Campaigns", "Products", "Duplicate-from"] },
    },
    filters: [{ name: "(none — it's a form)", today: "client", ideal: "client" }],
    sections: ["Header + helper", "No-account / no-cards warnings", "Single form: name → duplicate → gateway/campaign → products → dates → preview → submit"],
    apis: ["listFlowGateways/Campaigns/Products", "previewSchedule", "createFlow → redirect /flows/{id}"],
    components: ["All MUI (Select, Table, custom bar chart)", "no modals"],
    state: ["name, gateway, campaign, picks, dates, preview, submitting, error (+ derived totals)"],
    performance: ["gateways/campaigns eager; products lazy per campaign; preview on demand", "createFlow inserts schedules ONE ROW PER CARD sequentially (O(cards) round-trips)"],
    lessons: [
      { title: "It's one form, not a wizard", detail: "Config + preview + execute all on a single page. Fine — but note it behaves like an Action Flow, not CRUD." },
      { title: "Validation duplicated client & server", detail: "The same rules (gateway/campaign/≥1 product, totalCards ≤ available, previewSum === totalCards) exist on both sides — server is the real gate; client is UX." },
      { title: "Non-transactional create loop", detail: "createFlow writes schedules in a sequential loop, not a batch/transaction — partial failure mid-loop leaves a half-built flow." },
      { title: "Whole config serialized to one JSON blob", detail: "Everything is baked into flowSettings at create — the root of the read-modify-rewrite pattern elsewhere." },
    ],
  },
  {
    name: "Settings", route: "/settings", type: "form", status: "grounded",
    purpose: "View and save the single CheckoutChamp account (name, API URL, encrypted credentials) and test the connection.",
    primary: "Account (singleton)", secondary: [],
    questions: ["Is an account configured, and its name / API URL?", "Are my saved credentials valid?"],
    actions: ["Save account", "Test connection"],
    data: {
      summary: { source: "None", items: [] },
      list: { source: "None", items: [] },
      detail: { source: "account.findFirst() prefills the form; credentials never sent to client", items: ["Name", "API URL"] },
      lookup: { source: "None", items: [] },
    },
    filters: [{ name: "(none)", today: "server", ideal: "server" }],
    sections: ["Header", "Saved alert", "Account form + Test connection"],
    apis: ["saveAccount (encrypt + revalidate + redirect)", "testCcConnection (live CC)"],
    components: ["MUI form", "custom TestConnectionButton (client)"],
    state: ["None on the page; test state inside TestConnectionButton"],
    performance: ["One tiny findFirst, eager; trivial"],
    lessons: [
      { title: "Singleton by convention", detail: "Always findFirst() with no unique constraint — a second account row would be silently ignored." },
      { title: "Blank-means-keep credentials", detail: "Empty password/loginId preserves existing — reasonable but implicit." },
      { title: "Success via ?saved=1 query flag", detail: "State is URL-encoded and sticky on refresh, rather than a flash/toast." },
    ],
  },
  {
    name: "Login", route: "/login", type: "form", status: "grounded",
    purpose: "A single email/password sign-in that authenticates a Trinity admin and starts a session.",
    primary: "AdminUser", secondary: ["Session cookie (trinity_session)"],
    questions: ["Are my credentials valid?"],
    actions: ["Sign in"],
    data: {
      summary: { source: "None", items: [] },
      list: { source: "None", items: [] },
      detail: { source: "None — reads searchParams.error only", items: [] },
      lookup: { source: "None", items: [] },
    },
    filters: [{ name: "(none)", today: "server", ideal: "server" }],
    sections: ["Centered card: heading → error alert → email/password → Sign in"],
    apis: ["login server action → signIn → redirect"],
    components: ["Pure MUI (uncontrolled form)"],
    state: ["None — error via URL param"],
    performance: ["Fully server-rendered, no client JS"],
    lessons: [
      { title: "Error via URL query param", detail: "?error=… stays in history and is user-tamperable (any string renders in the alert)." },
      { title: "No throttling at this layer", detail: "Generic 'invalid' message is good; brute-force protection (if any) lives in signIn, not here." },
    ],
  },
];

// ---- 4. Page → type mapping ---------------------------------------------
export const MAPPING = PAGES.map((p) => ({ page: p.name, route: p.route, type: p.type }));

// ---- 5. The framework (extracted from all pages) ------------------------
export const FRAMEWORK = {
  spine: ["Purpose", "Data", "Summary", "Actions", "Filters", "Table", "Detail", "Permissions"],
  finding: "8 pages → 4 patterns. Resource List covers half of them (Activity, Cards, Flows, Flow detail). Get that recipe right and most of Trinity — and the next app — is a fill-in-the-blanks worksheet.",
  universalLessons: [
    { title: "KPIs come from a summary query — never from the page rows", detail: "Activity, Cards and the Dashboard Totals derive counts from the loaded rows (Activity in client useMemo, Cards/Dashboard in the server render); Flows instead runs N+1 per-flow counts. None is a proper summary aggregate — so they're truncation-biased (Activity: only the last 1000) and/or filter-blind. Every Resource List needs a dedicated GET …/summary." },
    { title: "Filter, sort and paginate on the server", detail: "The lists that filter (Activity, Cards, Flow-detail) ship their whole dataset to the browser and filter in React (useMemo). It works at small N and breaks silently as data grows. The query is where filtering belongs." },
    { title: "The detail drawer fetches its own data; heavy payloads are lazy", detail: "Cards and Flow-detail do this right (getCardDetail / getScheduleDetail on open; PAN/CVV only on reveal). Activity does not — it over-fetches every rawResponse. Copy the Cards pattern everywhere." },
    { title: "Store queryable columns, not JSON blobs, for anything you filter/sort/aggregate", detail: "flowSettings / firePlan / fireAttempts / cardData force JSON.parse on hot paths, read-modify-rewrite mutations, and string-contains drift checks. The new Transaction table (real columns) is the pattern to extend." },
    { title: "One write path = one transaction", detail: "createFlow inserts schedules in a non-transactional loop; flow mutations rewrite a whole JSON blob. Both are race-prone. Wrap multi-row writes in a transaction; update columns, not blobs." },
    { title: "Actions: Permission → Validation → Confirmation → Execute → Refresh", detail: "Keep row actions light; put heavy ones (retry, refund, edit) in the detail drawer. Validate on the server even if you also validate on the client for UX." },
    { title: "Avoid N+1 and unbounded scans", detail: "Dashboard and Flows list run per-row count queries; Dashboard Totals scans the whole schedule table for 'all time'. Prefer one grouped aggregate with a bound." },
  ],
  worksheet: [
    "PAGE NAME", "PAGE TYPE", "PRIMARY ENTITY", "SECONDARY ENTITIES", "PURPOSE (one sentence)",
    "QUESTIONS TO ANSWER", "API CONTRACTS (summary / list / detail / lookups)",
    "PAGE SECTIONS", "COMPONENTS (from the kit)", "PERMISSIONS / ACTIONS",
    "PERFORMANCE (server filter/sort/paginate, lazy detail)",
  ],
};
