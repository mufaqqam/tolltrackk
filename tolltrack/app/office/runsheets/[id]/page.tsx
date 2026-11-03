import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { sql } from "@/lib/db";
import { runsheetTrips } from "@/lib/data";
import { dayLabel, melbourneTime } from "@/lib/time";
import { OfficeShell } from "@/components/OfficeShell";

export const dynamic = "force-dynamic";

export default async function OfficeRunsheet({ params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  const id = Number(params.id);
  if (!Number.isInteger(id)) notFound();
  const [s] = await sql()`select r.*, u.full_name, u.driver_no from runsheets r join users u on u.id = r.driver_id where r.id = ${id}`;
  if (!s) notFound();
  const trips = await runsheetTrips(id);
  return (
    <OfficeShell active="/office" userName={admin.fullName}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1>Runsheet · {dayLabel(s.sheet_date)}</h1>
          <div className="muted">{s.full_name} (driver {s.driver_no}) · sent {melbourneTime(s.submitted_at)}</div>
        </div>
        <a className="btn dark small" href={`/api/export/runsheet/${id}`}>Download CSV</a>
      </div>
      <div className="table-wrap">
        <table className="grid">
          <thead><tr><th>Logged</th><th>Job</th><th>Toll acct</th><th>Road</th><th>Entry → Exit</th><th>Pickup → Drop-off</th><th>Suggestion</th></tr></thead>
          <tbody>
            {trips.map((t) => (
              <tr key={t.id}>
                <td>{melbourneTime(t.createdAt)}</td>
                <td><strong>{t.jobNumber}</strong></td>
                <td>{t.tollAccount}</td>
                <td>{t.roadName}</td>
                <td>{t.entryName} → {t.exitName}</td>
                <td className="small">{t.pickupAddress}<br />→ {t.dropoffAddress}</td>
                <td>{t.confidence == null ? <span className="pill dark" style={{ background: "#6b8288" }}>Manual</span> : t.edited ? <span className="pill alert">Edited by driver</span> : <span className="pill mint">Accepted · {t.confidence}%</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </OfficeShell>
  );
}
