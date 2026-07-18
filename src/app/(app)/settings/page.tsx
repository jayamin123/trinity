"use client";
import { useEffect, useState } from "react";
import { get, put, post } from "@/lib/api";

type Account = { id: string; name: string; apiUrl: string; hasCreds: boolean } | null;

export default function SettingsPage() {
  const [acct, setAcct] = useState<Account>(null);
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<{ kind: string; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { get<Account>("/api/settings").then((a) => { setAcct(a); if (a) { setName(a.name); setApiUrl(a.apiUrl); } setLoaded(true); }).catch(() => setLoaded(true)); }, []);

  async function save() {
    setBusy(true); setMsg(null);
    try { await put("/api/settings", { name, apiUrl, loginId, password }); setMsg({ kind: "ok", text: "Saved" }); }
    catch (e) { setMsg({ kind: "no", text: e instanceof Error ? e.message : "failed" }); }
    setBusy(false);
  }
  async function test() {
    setBusy(true); setMsg(null);
    try { const r = await post<{ ok: boolean; message: string }>("/api/settings/test"); setMsg({ kind: r.ok ? "ok" : "no", text: r.message }); }
    catch (e) { setMsg({ kind: "no", text: e instanceof Error ? e.message : "failed" }); }
    setBusy(false);
  }

  return (
    <>
      <div className="topbar"><div><h1>Settings</h1><p>CheckoutChamp account</p></div></div>
      <div className="content">
        {!loaded ? <div className="loading">Loading…</div> : (
          <div className="panel" style={{ maxWidth: 560 }}>
            <div className="ph">💳 CheckoutChamp connection {acct?.hasCreds && <span className="pill ok" style={{ marginLeft: 8 }}><span className="dot" />credentials on file</span>}</div>
            <div className="pb" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <label><div className="k" style={{ fontSize: 11, marginBottom: 5 }}>Account name</div><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Accotta" /></label>
              <label><div className="k" style={{ fontSize: 11, marginBottom: 5 }}>API URL</div><input className="input" value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} placeholder="https://api.checkoutchamp.com" /></label>
              <label><div className="k" style={{ fontSize: 11, marginBottom: 5 }}>Login ID</div><input className="input" value={loginId} onChange={(e) => setLoginId(e.target.value)} placeholder={acct?.hasCreds ? "•••••• (unchanged)" : "loginId"} /></label>
              <label><div className="k" style={{ fontSize: 11, marginBottom: 5 }}>Password</div><input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={acct?.hasCreds ? "•••••• (unchanged)" : "password"} /></label>
              {msg && <div className={`pill ${msg.kind}`}><span className="dot" />{msg.text}</div>}
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn primary" disabled={busy} onClick={save}>Save</button>
                <button className="btn" disabled={busy} onClick={test}>Test connection</button>
              </div>
              <div className="faint" style={{ fontSize: 12 }}>Note: on flows2 the encryption key isn&apos;t set, so saving/testing credentials returns a clear error until it&apos;s configured. The UI is fully wired.</div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
