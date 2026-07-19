"use client";
import { useState } from "react";
import {
  PageHeader, Panel, SectionLabel,
  Button, IconButton,
  Pill, Tag, MidChip, Badge, CardCell, Mono,
  KpiCard, KpiGrid, Sparkline, RingGauge,
  FilterBar, Segmented, SelectChip, CheckChip, SearchInput,
  Field, SelectField, Tabs,
  DataTable, type Column,
  Modal, MetaGrid, Timeline, TimelineStep, RawDetails,
} from "@/components/ui";

type Row = { id: string; name: string; last4: string; flow: string; product: string; amount: number; mid: string; ok: boolean; retried?: boolean };
const ROWS: Row[] = [
  { id: "1", name: "Kevin Hutchinson", last4: "9060", flow: "Cliq", product: "Portable Water Filter Straw", amount: 5.25, mid: "5", ok: true },
  { id: "2", name: "Karen Nguyen", last4: "9256", flow: "Slash Cliq Subs", product: "Clq B357", amount: 7.75, mid: "5", ok: true, retried: true },
  { id: "3", name: "Joshua Jackson", last4: "0345", flow: "Slash Maverick Subs", product: "Mav B48", amount: 7.75, mid: "3", ok: true },
  { id: "4", name: "Marcus Bell", last4: "1180", flow: "Maverick", product: "Fast USB Charger", amount: 5.25, mid: "3", ok: false },
];

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 34 }}>
      <SectionLabel>{title}</SectionLabel>
      <div style={{ marginTop: 12 }}>{children}</div>
    </div>
  );
}

export default function KitPage() {
  const [seg, setSeg] = useState<"all" | "ok" | "fail">("all");
  const [tab, setTab] = useState<"pool" | "pending" | "fired">("pool");
  const [flow, setFlow] = useState("all");
  const [casc, setCasc] = useState(false);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Row | null>(null);

  const cols: Column<Row>[] = [
    { key: "card", header: "Card", render: (r) => <CardCell name={r.name} last4={r.last4} /> },
    { key: "flow", header: "Flow", cell: "mut", render: (r) => r.flow },
    { key: "product", header: "Product", cell: "mut", render: (r) => r.product },
    { key: "amount", header: "Amount", align: "right", render: (r) => <Mono>${r.amount.toFixed(2)}</Mono> },
    { key: "mid", header: "MID", render: (r) => <MidChip mid={r.mid} /> },
    { key: "status", header: "Status", render: (r) => (
      <span className="ui-nowrap">
        {r.ok ? <Pill tone="good">Approved</Pill> : <Pill tone="bad">Declined</Pill>}
        {r.retried && <> <Badge tone="warn">RETRY</Badge></>}
      </span>
    ) },
  ];

  return (
    <div className="ui" style={{ maxWidth: 1120 }}>
      <PageHeader
        title="Component Kit"
        subtitle="Every shared component in one place — this is the design system the whole app is built from."
        actions={<><Button variant="ghost" size="sm">Docs</Button><Button size="sm">Primary action</Button></>}
      />

      <Group title="Buttons">
        <div className="ui-row wrap">
          <Button variant="primary">Primary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="subtle">Subtle</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="primary" size="sm">Small</Button>
          <Button variant="primary" size="lg">Large</Button>
          <Button variant="primary" disabled>Disabled</Button>
          <IconButton>✕</IconButton>
          <IconButton>⋯</IconButton>
        </div>
      </Group>

      <Group title="Status pills, tags & badges">
        <div className="ui-row wrap">
          <Pill tone="good">Approved</Pill>
          <Pill tone="bad">Declined</Pill>
          <Pill tone="warn">Pending</Pill>
          <Pill tone="info">Scheduled</Pill>
          <Pill tone="neutral" dot={false}>Pool</Pill>
          <MidChip mid="5" />
          <Tag>casc</Tag>
          <Tag mono>order 88213</Tag>
          <Badge tone="warn">RETRY</Badge>
          <Badge tone="accent">NEW</Badge>
        </div>
      </Group>

      <Group title="Card cell">
        <div className="ui-row wrap" style={{ gap: 32 }}>
          <CardCell name="Kevin Hutchinson" last4="9060" />
          <CardCell name="Karen Nguyen" last4="9256" big />
        </div>
      </Group>

      <Group title="KPI cards">
        <KpiGrid n={4}>
          <KpiCard label="Charges (ledger)" value="443" visual={<Sparkline data={[3, 5, 4, 7, 6, 9, 8, 11, 10, 13, 12, 15]} />} />
          <KpiCard label="Approval rate" value="99.3" unit="%" visual={<RingGauge pct={99.3} />} />
          <KpiCard label="Captured volume" value="$2,353.50" />
          <KpiCard label="Declined" value="3" tone="bad" />
        </KpiGrid>
      </Group>

      <Group title="Filters">
        <FilterBar>
          <Segmented value={seg} onChange={setSeg} options={[
            { value: "all", label: "All", count: 443 },
            { value: "ok", label: "Approved", count: 440 },
            { value: "fail", label: "Declined", count: 3 },
          ]} />
          <SelectChip label="Flow" value={flow} onChange={setFlow} options={[
            { value: "cliq", label: "Cliq" }, { value: "maverick", label: "Maverick" },
          ]} />
          <CheckChip label="Cascaded" checked={casc} onChange={setCasc} />
          <SearchInput value={q} onChange={setQ} placeholder="CC message…" />
        </FilterBar>
      </Group>

      <Group title="Tabs">
        <Tabs value={tab} onChange={setTab} options={[
          { value: "pool", label: "Pool", count: 399 },
          { value: "pending", label: "Pending", count: 1667 },
          { value: "fired", label: "Fired", count: 434 },
        ]} />
      </Group>

      <Group title="Form fields">
        <Panel pad style={{ maxWidth: 520 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="Flow name" placeholder="e.g. Cliq Subs" defaultValue="Slash Cliq Subs" />
            <SelectField label="Account" defaultValue="a1">
              <option value="a1">Accotta — main</option>
              <option value="a2">Apollo — main</option>
            </SelectField>
            <Field label="Amount" placeholder="0.00" />
            <SelectField label="Gateway (MID)" defaultValue="5">
              <option value="3">MID 3</option><option value="5">MID 5</option>
            </SelectField>
          </div>
          <div className="ui-row" style={{ marginTop: 16, justifyContent: "flex-end" }}>
            <Button variant="ghost">Cancel</Button>
            <Button>Save flow</Button>
          </div>
        </Panel>
      </Group>

      <Group title="Data table">
        <DataTable
          columns={cols}
          rows={ROWS.filter((r) => seg === "all" || (seg === "ok") === r.ok)}
          rowKey={(r) => r.id}
          onRowClick={setOpen}
          minWidth={780}
          empty="No rows match."
        />
        <p className="ui-faint" style={{ marginTop: 8 }}>Rows are clickable — opens the detail modal.</p>
      </Group>

      <Group title="Panels">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Panel pad><SectionLabel>Plain panel</SectionLabel><p className="ui-mut" style={{ marginTop: 8, fontSize: 13 }}>A bordered surface with padding — the base container for everything.</p></Panel>
          <Panel pad><SectionLabel>Another</SectionLabel><p className="ui-mut" style={{ marginTop: 8, fontSize: 13 }}>Same token-driven border, radius and background across all five themes.</p></Panel>
        </div>
      </Group>

      <Group title="Modal (click a table row, or here)">
        <Button variant="ghost" onClick={() => setOpen(ROWS[1])}>Open example modal</Button>
      </Group>

      <Modal
        open={!!open}
        onClose={() => setOpen(null)}
        header={open && (
          <>
            <CardCell name={open.name} last4={open.last4} big />
            <div className="ui-spacer" />
            {open.ok ? <Pill tone="good">Approved</Pill> : <Pill tone="bad">Declined</Pill>}
            {open.retried && <Badge tone="warn">RETRY</Badge>}
          </>
        )}
        meta={open && (
          <MetaGrid items={[
            { label: "Product", value: open.product },
            { label: "Amount", value: <Mono>${open.amount.toFixed(2)}</Mono> },
            { label: "Gateway", value: <Mono>MID {open.mid}</Mono> },
            { label: "Order", value: <Mono>88213</Mono> },
            { label: "Cascade", value: "no" },
            { label: "Attempts", value: "2" },
          ]} />
        )}
      >
        <SectionLabel>Attempt history</SectionLabel>
        <div style={{ marginTop: 14 }}>
          <Timeline>
            <TimelineStep pass={false} title="DECLINED" stamp="#1 · 2026-07-18 22:40" line="Insufficient funds" tags={<><Tag mono>MID 3</Tag><Tag>$7.75</Tag></>} />
            <TimelineStep pass={true} title="APPROVED" stamp="#2 · 2026-07-18 22:46" line="Approved" tags={<><Tag mono>MID 5</Tag><Tag mono>order 88213</Tag><Tag>$7.75</Tag></>} />
          </Timeline>
        </div>
        <div style={{ marginTop: 14 }}>
          <RawDetails summary="Raw CheckoutChamp response">{`{\n  "result": "SUCCESS",\n  "orderId": "88213",\n  "gatewayId": "5"\n}`}</RawDetails>
        </div>
      </Modal>
    </div>
  );
}
