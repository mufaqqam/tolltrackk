import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { Icon, Logo } from "./Icon";

const LINKS = [
  { href: "/office", label: "Dashboard" },
  { href: "/office/statements", label: "Toll statements" },
  { href: "/office/drivers", label: "Drivers" },
  { href: "/office/activity", label: "Activity log" },
];

export function OfficeShell({ active, userName, children }: { active: string; userName: string; children: React.ReactNode }) {
  return (
    <div className="office">
      <header className="office-top no-print">
        <div className="inner">
          <Link href="/office" className="brand"><Logo /> TollTrack Office</Link>
          <nav aria-label="Office">
            {LINKS.map((l) => <Link key={l.href} href={l.href} className={active === l.href ? "on" : ""}>{l.label}</Link>)}
          </nav>
          <span className="small" style={{ color: "#c4d6d8" }}>{userName}</span>
          <form action={logout}><button className="pill dark" style={{ border: 0, cursor: "pointer" }}><Icon name="logout" size={14} /> Sign out</button></form>
        </div>
      </header>
      <main className="office-main">{children}</main>
    </div>
  );
}

export function StatusChip({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    matched: ["mint", "Matched"],
    check: ["alert", "Check"],
    unmatched: ["red", "No trip"],
  };
  const [cls, label] = map[status] ?? ["dark", status];
  return <span className={`pill ${cls}`}>{label}</span>;
}
