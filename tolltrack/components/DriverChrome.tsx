import Link from "next/link";
import { Icon, Logo } from "./Icon";
import { logout } from "@/app/actions/auth";

export function NavBar({ title, backHref }: { title: string; backHref?: string }) {
  return (
    <header className="navbar no-print">
      {backHref && <Link href={backHref} className="back" aria-label="Back"><Icon name="back" size={18} /></Link>}
      <h1>{title}</h1>
    </header>
  );
}

export function BrandRow() {
  return (
    <div className="row">
      <Link href="/today" className="brand"><Logo /> TollTrack</Link>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <span className="pill mint"><Icon name="synced" size={14} /> Synced</span>
        <form action={logout}>
          <button className="pill dark" style={{ border: 0, cursor: "pointer" }} aria-label="Sign out"><Icon name="logout" size={14} /> Sign out</button>
        </form>
      </div>
    </div>
  );
}
