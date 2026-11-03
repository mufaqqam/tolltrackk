import Link from "next/link";
import { requireDriver } from "@/lib/auth";
import { sql } from "@/lib/db";
import { dayLabel } from "@/lib/time";
import { NavBar } from "@/components/DriverChrome";
import { Icon } from "@/components/Icon";

export const dynamic = "force-dynamic";

export default async function Runsheets() {
  const user = await requireDriver();
  const sheets = await sql()`select id, sheet_date, trip_count from runsheets where driver_id = ${user.id} order by sheet_date desc limit 30`;
  return (
    <main className="phone">
      <NavBar title="Past runsheets" backHref="/today" />
      <div className="content">
        {sheets.length ? (
          <div className="card" style={{ padding: "4px 16px" }}>
            {sheets.map((s) => (
              <Link key={s.id} href={`/runsheets/${s.id}`} className="trip">
                <span className="ico"><Icon name="list" color="var(--teal)" /></span>
                <span className="body"><span className="job">{dayLabel(s.sheet_date)}</span><br /><span className="route">{s.trip_count} toll trips</span></span>
                <Icon name="chevron" color="var(--muted)" />
              </Link>
            ))}
          </div>
        ) : <div className="card muted">No runsheets sent yet.</div>}
      </div>
    </main>
  );
}
