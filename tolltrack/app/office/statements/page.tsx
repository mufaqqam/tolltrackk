import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { sql } from "@/lib/db";
import { money } from "@/lib/data";
import { melbourneTime, melbourneToday, dayLabel } from "@/lib/time";
import { OfficeShell } from "@/components/OfficeShell";
import { UploadStatementForm } from "@/components/OfficeForms";

export const dynamic = "force-dynamic";

export default async function Statements() {
  const admin = await requireAdmin();
  const uploads = await sql()`
    select u.id, u.filename, u.row_count, u.uploaded_at,
      count(*) filter (where c.match_status = 'matched')::int as matched,
      count(*) filter (where c.match_status = 'check')::int as to_check,
      count(*) filter (where c.match_status = 'unmatched')::int as unmatched,
      coalesce(sum(c.amount_cents) filter (where c.match_status = 'unmatched'), 0)::int as unmatched_cents
    from statement_uploads u left join statement_charges c on c.upload_id = u.id
    group by u.id order by u.uploaded_at desc limit 20`;
  return (
    <OfficeShell active="/office/statements" userName={admin.fullName}>
      <h1>Toll statements</h1>
      <p className="muted" style={{ margin: 0 }}>Upload the toll statement and TollTrack matches every charge to a logged trip, so you can bill it to the right job.</p>
      <div className="two-col">
        <UploadStatementForm />
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <strong>No statement to hand?</strong>
          <span className="small muted">Download a sample statement built from the latest submitted runsheets. It includes a matching charge for most trips, one with a different exit point, and two tolls with no trip.</span>
          <a className="btn soft small" href="/api/sample-statement">Download sample statement (CSV)</a>
        </div>
      </div>
      <div className="table-wrap">
        <table className="grid">
          <thead><tr><th>Uploaded</th><th>File</th><th>Charges</th><th>Matched</th><th>To check</th><th>No trip</th><th>Can&apos;t bill</th><th></th></tr></thead>
          <tbody>
            {uploads.map((u) => (
              <tr key={u.id}>
                <td>{dayLabel(melbourneToday(new Date(u.uploaded_at)))} {melbourneTime(u.uploaded_at)}</td>
                <td>{u.filename}</td>
                <td>{u.row_count}</td>
                <td>{u.matched}</td>
                <td>{u.to_check}</td>
                <td>{u.unmatched}</td>
                <td>{money(u.unmatched_cents)}</td>
                <td><Link href={`/office/statements/${u.id}`}>Open</Link></td>
              </tr>
            ))}
            {!uploads.length && <tr><td colSpan={8} className="muted">No statements uploaded yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </OfficeShell>
  );
}
