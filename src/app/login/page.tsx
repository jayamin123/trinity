"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { post } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await post("/api/auth/login", { email, password });
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
      setBusy(false);
    }
  }

  return (
    <div className="center-screen">
      <form onSubmit={submit} className="panel" style={{ width: 380 }}>
        <div className="pb" style={{ padding: 26 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 18 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(150deg,var(--accent),#b3b0ff)" }} />
            <div>
              <div style={{ fontWeight: 660, fontSize: 17, letterSpacing: "-.02em" }}>Trinity Flows</div>
              <div className="faint" style={{ fontSize: 12 }}>Sign in to continue</div>
            </div>
          </div>
          {error && <div className="pill no" style={{ display: "flex", marginBottom: 12 }}><span className="dot" />{error}</div>}
          <input className="input" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus style={{ marginBottom: 10 }} />
          <input className="input" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ marginBottom: 16 }} />
          <button className="btn primary" type="submit" disabled={busy} style={{ width: "100%", justifyContent: "center" }}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </div>
      </form>
    </div>
  );
}
