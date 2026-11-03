import { requireDriver } from "@/lib/auth";
import { driverTrips } from "@/lib/data";
import { dayLabel, melbourneToday } from "@/lib/time";
import { NavBar } from "@/components/DriverChrome";
import { TripList } from "@/components/TripList";
import { EndDayButton } from "@/components/EndDayButton";

export const dynamic = "force-dynamic";

export default async function Review({ searchParams }: { searchParams: { saved?: string } }) {
  const user = await requireDriver();
  const today = melbourneToday();
  const trips = await driverTrips(user.id, today);
  const open = trips.filter((t) => !t.runsheetId);
  const toCheck = trips.filter((t) => t.needsCheck).length;
  const roads = new Set(trips.map((t) => t.roadName)).size;

  return (
    <main className="phone">
      <NavBar title="Review today" backHref="/today" />
      <div className="content">
        {searchParams.saved && <div className="notice" role="status">Trip saved and marked as checked.</div>}
        <div className="stats3">
          <div className="stat"><div className="n">{trips.length}</div><div className="l">Toll trips</div></div>
          <div className="stat"><div className="n">{roads}</div><div className="l">Toll roads</div></div>
          <div className="stat"><div className="n" style={{ color: toCheck ? "var(--coral-dark)" : undefined }}>{toCheck}</div><div className="l">To check</div></div>
        </div>
        <div className="label">{dayLabel(today)}</div>
        {trips.length ? <TripList trips={trips} editable /> : <div className="card muted small">No trips logged today.</div>}
        {open.length > 0 && <p className="small muted" style={{ textAlign: "center", margin: 0 }}>Tap any trip to fix it before you finish.</p>}
        {trips.length > 0 && open.length === 0 && <div className="notice">Everything from today has been sent to the office.</div>}
      </div>
      <div className="actions">
        <EndDayButton
          disabled={open.length === 0 || toCheck > 0}
          label={toCheck > 0 ? `Check ${toCheck} trip${toCheck > 1 ? "s" : ""} first` : open.length === 0 ? "Nothing new to send" : `End work day · send ${open.length} trip${open.length > 1 ? "s" : ""}`}
        />
      </div>
    </main>
  );
}
