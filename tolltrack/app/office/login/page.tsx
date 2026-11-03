import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { AdminLoginForm } from "@/components/AdminLoginForm";
import { Logo } from "@/components/Icon";

export const dynamic = "force-dynamic";

export default async function OfficeLogin() {
  const u = await currentUser();
  if (u) redirect(u.role === "admin" ? "/office" : "/today");
  return (
    <main className="office" style={{ display: "grid", placeItems: "center", padding: 24 }}>
      <div className="card" style={{ width: "100%", maxWidth: 420, padding: 28, display: "flex", flexDirection: "column", gap: 18 }}>
        <div className="brand" style={{ color: "var(--teal)" }}><Logo /> TollTrack Office</div>
        <p className="muted" style={{ margin: 0 }}>Review runsheets, upload the toll statement and find tolls you can&apos;t bill yet.</p>
        <AdminLoginForm />
        <div className="demo"><strong>Demo:</strong> office@tolltrack.app · TollTrack-Demo-2026</div>
        <Link href="/login" className="small muted">Driver? Sign in here</Link>
      </div>
    </main>
  );
}
