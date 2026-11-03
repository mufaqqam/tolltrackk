import Link from "next/link";
import type { TripRow } from "@/lib/data";
import { melbourneTime } from "@/lib/time";
import { Icon } from "./Icon";

export function TripList({ trips, editable }: { trips: TripRow[]; editable: boolean }) {
  return (
    <div className="card" style={{ padding: "4px 16px" }}>
      {trips.map((t) => {
        const inner = (
          <>
            <span className="ico"><Icon name="truck" color="var(--teal)" /></span>
            <span className="body">
              <span className="job">Job {t.jobNumber}</span><br />
              <span className="route">{t.roadName}: {t.entryName} → {t.exitName}</span>
              {t.needsCheck && <><br /><span className="flag"><Icon name="warning" size={12} /> Check {t.confidence != null ? `· ${t.confidence}% confident` : ""}</span></>}
            </span>
            {editable && !t.runsheetId ? <Icon name="edit" size={18} color="var(--muted)" /> : <span className="small muted">{melbourneTime(t.createdAt)}</span>}
          </>
        );
        return editable && !t.runsheetId ? (
          <Link key={t.id} href={`/trips/${t.id}`} className="trip" aria-label={`Edit job ${t.jobNumber}`}>{inner}</Link>
        ) : (
          <div key={t.id} className="trip">{inner}</div>
        );
      })}
    </div>
  );
}
