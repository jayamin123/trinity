"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { post } from "@/lib/api";

const NAV = [
  { href: "/", em: "🏠", label: "Dashboard" },
  { href: "/cards", em: "🎴", label: "Cards" },
  { href: "/flows", em: "🔀", label: "Flows" },
  { href: "/logs", em: "🧾", label: "Logs" },
];

export default function Shell() {
  const path = usePathname();
  const router = useRouter();
  const isActive = (h: string) => (h === "/" ? path === "/" : path.startsWith(h));

  async function logout() {
    await post("/api/auth/logout").catch(() => {});
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="side">
      <Link className="brand" href="/">
        <div className="mark" />
        <div>
          <div className="name">Trinity&nbsp;Flows</div>
          <div className="sub">ledger v2</div>
        </div>
      </Link>
      <nav className="nav">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className={isActive(n.href) ? "active" : ""}>
            <span className="em">{n.em}</span>
            {n.label}
          </Link>
        ))}
      </nav>
      <div className="foot">
        <span>flows2 · no-fire</span>
        <button onClick={logout}>Sign out</button>
      </div>
    </aside>
  );
}
