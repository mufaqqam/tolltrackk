import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { sql } from "@/lib/db";
import { money } from "@/lib/data";
import { dayLabel, melbourneTime, melbourneToday } from "@/lib/time";
import { OfficeShell } from "@/components/OfficeShell";

export const dynamic = "force-dynamic";

export default async function OfficeHome() {
  const admin = await requireAdmin();
  const db = sql();
  const today = melbourneToday();
  const [k] = await db`
    select
      (select count(*) from runsheets where sheet_date > ${today}::date - 7)::int as sheets7,
      (select count(*) from trips where trip_date > ${today}::date - 7)::int as trips7,
      (select count(*) from trips where needs_check and runsheet_id is null)::int as flagged,
      (select count(*) from trips where suggested_entry_id is not null and created_at > now() - interval '30 days')::int as suggested,
      (select count(*) from trips where suggested_entry_id = entry_point_id and suggested_exit_id = exit_point_id and created_at > now() - interval '30 days')::int as accepted`;
  const [latest] = await db`
    select u.id, u.filename, u.uploaded_at,
      coalesce(sum(c.amount_cents) filter (where c.match_status = 'unmatched'), 0)::int as unmatched_cents,
      count(*) filter (where c.match_status = 'unmatched')::int as unmatched,
      count(*) filter (where c.match_status = 'check')::int as to_check
    from statement_uploads u left join statement_charges c on c.upload_id = u.id
    group by u.id order by u.uploaded_at desc limit 1`;
  const sheets = await db`
    select r.id, r.sheet_date, r.trip_count, r.submitted_at, u.full_name, u.driver_no, u.truck_rego
    from runsheets r join users u on u.id = r.driver_id order by r.sheet_date desc, r.submitted_at desc limit 15`;
  const acceptRate = k.suggested ? Math.round((k.accepted / k.suggested) * 100) : null;

  return (
    <OfficeShell active="/office" userName={admin.fullName}>
      <h1>Dashboard</h1>
      <div className="kpis">
        <div className="kpi"><div className="label">Runsheets (7 days)</div><div className="n">{k.sheets7}</div></div>
        <div className="kpi"><div className="label">Toll trips logged (7 days)</div><div className="n">{k.trips7}</div></div>
        <div className="kpi"><div className="label">Waiting on a driver check</div><div className="n">{k.flagged}</div></div>
        <div className="kpi"><div className="label">Suggestions accepted as-is</div><div className="n">{acceptRate == null ? "–" : `${acceptRate}%`}</div><div className="small muted">{k.accepted} of {k.suggested} trips, last 30 days</div></div>
        {latest && (
          <Link href={`/office/statements/${latest.id}`} className="kpi alert" style={{ textDecoration: "none" }}>
            <div className="label">Can&apos;t bill yet (latest statement)</div>
            <div className="n">{money(latest.unmatched_cents)}</div>
            <div className="small muted">{latest.unmatched} toll{latest.unmatched === 1 ? "" : "s"} with no trip · {latest.to_check} to check</div>
          </Link>
        )}
      </div>
      {!latest && (
        <div className="card">No toll statement uploaded yet. <Link href="/office/statements">Upload one</Link> to find tolls with no matching trip.</div>
      )}
      <h2 style={{ margin: "8px 0 0", fontSize: 19 }}>Recent runsheets</h2>
      <div className="table-wrap">
        <table className="grid">
          <thead><tr><th>Date</th><th>Driver</th><th>Truck</th><th>Trips</th><th>Sent</th><th></th></tr></thead>
          <tbody>
            {sheets.map((s) => (
              <tr key={s.id}>
                <td>{dayLabel(s.sheet_date)}</td>
                <td>{s.full_name} ({s.driver_no})</td>
                <td>{s.truck_rego}</td>
                <td>{s.trip_count}</td>
                <td>{melbourneTime(s.submitted_at)}</td>
                <td><Link href={`/office/runsheets/${s.id}`}>View</Link></td>
              </tr>
            ))}
            {!sheets.length && <tr><td colSpan={6} className="muted">No runsheets yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </OfficeShell>
  );
}
