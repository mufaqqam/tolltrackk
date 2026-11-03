import { requireAdmin } from "@/lib/auth";
import { sql } from "@/lib/db";
import { dayLabel, melbourneTime, melbourneToday } from "@/lib/time";
import { OfficeShell } from "@/components/OfficeShell";

export const dynamic = "force-dynamic";

const LABEL: Record<string, string> = {
  login: "Signed in", login_failed: "Failed sign-in", trip_created: "Logged a trip", trip_updated: "Edited a trip",
  trip_deleted: "Deleted a trip", runsheet_submitted: "Sent a runsheet", statement_uploaded: "Uploaded a statement",
  driver_added: "Added a driver", pin_reset: "Reset a PIN",
};

export default async function Activity() {
  const admin = await requireAdmin();
  const rows = await sql()`
    select a.id, a.action, a.entity, a.entity_id, a.detail, a.created_at, u.full_name, u.driver_no
    from audit_log a left join users u on u.id = a.user_id order by a.created_at desc limit 100`;
  return (
    <OfficeShell active="/office/activity" userName={admin.fullName}>
      <h1>Activity log</h1>
      <p className="muted" style={{ margin: 0 }}>Every sign-in, edit, submission and upload is recorded, so changes to billing data can be traced.</p>
      <div className="table-wrap">
        <table className="grid">
          <thead><tr><th>When</th><th>Who</th><th>What</th><th>Details</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{dayLabel(melbourneToday(new Date(r.created_at)))} {melbourneTime(r.created_at)}</td>
                <td>{r.full_name ?? "—"}{r.driver_no ? ` (${r.driver_no})` : ""}</td>
                <td>{LABEL[r.action] ?? r.action}</td>
                <td className="small muted">{r.detail ? JSON.stringify(r.detail) : ""}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={4} className="muted">No activity yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </OfficeShell>
  );
}
