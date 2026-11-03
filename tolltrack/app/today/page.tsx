import Link from "next/link";
import { requireDriver } from "@/lib/auth";
import { driverTrips } from "@/lib/data";
import { dayLabel, melbourneToday } from "@/lib/time";
import { BrandRow } from "@/components/DriverChrome";
import { TripList } from "@/components/TripList";
import { Icon } from "@/components/Icon";

export const dynamic = "force-dynamic";

export default async function Today({ searchParams }: { searchParams: { added?: string } }) {
  const user = await requireDriver();
  const today = melbourneToday();
  const trips = await driverTrips(user.id, today);
  const flagged = trips.filter((t) => t.needsCheck);
  const open = trips.filter((t) => !t.runsheetId);
  const sent = trips.length > 0 && open.length === 0;

  return (
    <main className="phone">
      <header className="topbar">
        <BrandRow />
        <div className="greet">G&apos;day, {user.fullName.split(" ")[0]}</div>
        <div className="sub">Driver No {user.driverNo} · Truck {user.truckRego} · {dayLabel(today)}</div>
      </header>
      <div className="content">
        {searchParams.added && <div className="notice" role="status">Trip for job {searchParams.added.slice(0, 30)} saved.</div>}
        <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div><div className="big-num">{trips.length}</div><div className="small muted">toll trip{trips.length === 1 ? "" : "s"} logged today</div></div>
          <span className={`pill ${sent ? "dark" : "mint"}`} style={sent ? { background: "var(--teal)" } : undefined}>{sent ? "Runsheet sent" : "Shift active"}</span>
        </div>
        {flagged.length > 0 && (
          <Link href={`/trips/${flagged[0].id}`} className="alert-card">
            <Icon name="warning" color="var(--alert-ink)" size={22} />
            <span style={{ flex: 1 }}><strong>{flagged.length} trip{flagged.length > 1 ? "s need" : " needs"} a quick check</strong><br />
              <span className="small muted">Not sure about the toll points on job {flagged[0].jobNumber}</span></span>
            <Icon name="chevron" color="var(--alert-ink)" />
          </Link>
        )}
        <div className="label">Today&apos;s trips</div>
        {trips.length ? <TripList trips={trips} editable={false} /> : <div className="card muted small">No toll trips yet today. Tap “Add toll trip” after you leave a toll road.</div>}
      </div>
      <div className="actions">
        <Link href="/trips/new" className="btn primary"><Icon name="plus" /> Add toll trip</Link>
        <Link href="/review" className="btn outline">Review my day</Link>
        <Link href="/runsheets" className="small muted" style={{ textAlign: "center" }}>Past runsheets</Link>
      </div>
    </main>
  );
}
