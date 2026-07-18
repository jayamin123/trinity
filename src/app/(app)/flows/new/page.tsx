"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { get, post } from "@/lib/api";

type Gateway = { id: string; name: string };
type Campaign = { id: string; name: string };
type Product = { productId: string; name: string; price: number };
const plusDays = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

export default function NewFlowPage() {
  const router = useRouter();
  const [ccUp, setCcUp] = useState<boolean | null>(null);
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [sources, setSources] = useState<string[]>([]);

  const [name, setName] = useState("");
  const [gwId, setGwId] = useState(""); const [gwName, setGwName] = useState("");
  const [campId, setCampId] = useState(""); const [campName, setCampName] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [np, setNp] = useState({ productId: "", name: "", price: "" });
  const [start, setStart] = useState(plusDays(1));
  const [end, setEnd] = useState(plusDays(30));
  const [count, setCount] = useState(0);
  const [source, setSource] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    get<string[]>("/api/cards/sources").then(setSources).catch(() => {});
    get<Gateway[]>("/api/cc/gateways").then((g) => { setGateways(g); setCcUp(true); }).catch(() => setCcUp(false));
    get<Campaign[]>("/api/cc/campaigns").then(setCampaigns).catch(() => {});
  }, []);

  function addProd() { if (np.productId && np.name && np.price) { setProducts([...products, { productId: np.productId, name: np.name, price: Number(np.price) }]); setNp({ productId: "", name: "", price: "" }); } }
  async function create() {
    if (!name) { setMsg("name required"); return; }
    setBusy(true); setMsg("");
    try {
      const r = await post<{ id: string; added: number }>("/api/flows", { name, ccGatewayId: gwId, ccGatewayName: gwName, ccCampaignId: campId, ccCampaignName: campName, products, startDate: start, endDate: end, count: Number(count), source: source || undefined });
      router.push(`/flows/${r.id}`);
    } catch (e) { setMsg(e instanceof Error ? e.message : "failed"); setBusy(false); }
  }

  return (
    <>
      <div className="topbar"><div><h1>New Flow</h1><p>Build a campaign and (optionally) schedule cards into it</p></div><div className="spacer" /><Link className="btn" href="/flows">← Flows</Link></div>
      <div className="content" style={{ maxWidth: 640 }}>
        {ccUp === false && <div className="banner" style={{ marginBottom: 16 }}>CheckoutChamp pickers are unavailable (ENCRYPTION_KEY not set on flows2) — enter the gateway / campaign / products manually below. Everything else works.</div>}
        <div className="panel"><div className="pb" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <label><div className="k" style={{ fontSize: 11, marginBottom: 4 }}>Flow name</div><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Maverick Q3" /></label>

          <div className="k" style={{ fontSize: 11 }}>Gateway (MID)</div>
          {ccUp && gateways.length ? (
            <select className="input" value={gwId} onChange={(e) => { const g = gateways.find((x) => x.id === e.target.value); setGwId(e.target.value); setGwName(g?.name ?? ""); }}><option value="">Select gateway…</option>{gateways.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
          ) : <div style={{ display: "flex", gap: 8 }}><input className="input" style={{ width: 90 }} placeholder="MID id" value={gwId} onChange={(e) => setGwId(e.target.value)} /><input className="input" style={{ flex: 1 }} placeholder="Gateway name" value={gwName} onChange={(e) => setGwName(e.target.value)} /></div>}

          <div className="k" style={{ fontSize: 11 }}>Campaign</div>
          {ccUp && campaigns.length ? (
            <select className="input" value={campId} onChange={(e) => { const c = campaigns.find((x) => x.id === e.target.value); setCampId(e.target.value); setCampName(c?.name ?? ""); }}><option value="">Select campaign…</option>{campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          ) : <div style={{ display: "flex", gap: 8 }}><input className="input" style={{ width: 90 }} placeholder="id" value={campId} onChange={(e) => setCampId(e.target.value)} /><input className="input" style={{ flex: 1 }} placeholder="Campaign name" value={campName} onChange={(e) => setCampName(e.target.value)} /></div>}

          <div>
            <div className="k" style={{ fontSize: 11, marginBottom: 6 }}>Products ({products.length})</div>
            {products.map((p, i) => <div key={i} className="minirow"><span style={{ flex: 1 }}>{p.name} <span className="faint">#{p.productId}</span></span><span className="mono">${p.price}</span><button className="btn" style={{ padding: "2px 8px", fontSize: 11 }} onClick={() => setProducts(products.filter((_, j) => j !== i))}>×</button></div>)}
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <input className="input" style={{ width: 70 }} placeholder="id" value={np.productId} onChange={(e) => setNp({ ...np, productId: e.target.value })} />
              <input className="input" style={{ flex: 1 }} placeholder="name" value={np.name} onChange={(e) => setNp({ ...np, name: e.target.value })} />
              <input className="input" style={{ width: 70 }} placeholder="$" value={np.price} onChange={(e) => setNp({ ...np, price: e.target.value })} />
              <button className="btn" onClick={addProd}>Add</button>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <label style={{ flex: 1 }}><div className="k" style={{ fontSize: 11, marginBottom: 4 }}>Start</div><input className="input" type="date" value={start} onChange={(e) => setStart(e.target.value)} /></label>
            <label style={{ flex: 1 }}><div className="k" style={{ fontSize: 11, marginBottom: 4 }}>End</div><input className="input" type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></label>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <label style={{ width: 120 }}><div className="k" style={{ fontSize: 11, marginBottom: 4 }}>Schedule now</div><input className="input" type="number" min={0} value={count} onChange={(e) => setCount(Number(e.target.value))} /></label>
            <label style={{ flex: 1 }}><div className="k" style={{ fontSize: 11, marginBottom: 4 }}>From source</div><select className="input" value={source} onChange={(e) => setSource(e.target.value)}><option value="">Any available</option>{sources.map((s) => <option key={s} value={s}>{s.length > 34 ? "…" + s.slice(-32) : s}</option>)}</select></label>
          </div>
          {msg && <div className="pill no"><span className="dot" />{msg}</div>}
          <button className="btn primary" disabled={busy} onClick={create} style={{ justifyContent: "center" }}>{busy ? "Creating…" : count > 0 ? `Create flow + schedule ${count} cards` : "Create flow"}</button>
        </div></div>
      </div>
    </>
  );
}
