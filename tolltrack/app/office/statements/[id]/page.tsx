import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { sql } from "@/lib/db";
import { money } from "@/lib/data";
import { auDate } from "@/lib/time";
import { OfficeShell, StatusChip } from "@/components/OfficeShell";

export const dynamic = "force-dynamic";

export default async function StatementResult({ params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  const id = Number(params.id);
  if (!Number.isInteger(id)) notFound();
  const db = sql();
  const [upload] = await db`select * from statement_uploads where id = ${id}`;
  if (!upload) notFound();
  const charges = await db`
    select c.*, t.job_number from statement_charges c left join trips t on t.id = c.matched_trip_id
    where c.upload_id = ${id}
    order by case c.match_status when 'unmatched' then 0 when 'check' then 1 else 2 end, c.charge_date, c.charge_time`;
  // Trips on submitted runsheets in the statement's date range, for the plates on the statement, that no charge matched.
  const noCharge = await db`
    select t.id, t.trip_date, t.job_number, t.truck_rego, r.name as road, e.name as entry, x.name as exit, u.full_name
    from trips t join toll_points e on e.id = t.entry_point_id join toll_points x on x.id = t.exit_point_id
    join toll_roads r on r.id = e.road_id join users u on u.id = t.driver_id
    where t.runsheet_id is not null
      and t.trip_date between (select min(charge_date) from statement_charges where upload_id = ${id})
                          and (select max(charge_date) from statement_charges where upload_id = ${id})
      and upper(replace(t.truck_rego, ' ', '')) in (select upper(replace(plate, ' ', '')) from statement_charges where upload_id = ${id})
      and t.id not in (select matched_trip_id from statement_charges where upload_id = ${id} and matched_trip_id is not null)
    order by t.trip_date, t.job_number`;

  const sum = (s: string) => charges.filter((c) => c.match_status === s).reduce((a, c) => a + c.amount_cents, 0);
  const count = (s: string) => charges.filter((c) => c.match_status === s).length;

  return (
    <OfficeShell active="/office/statements" userName={admin.fullName}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div><h1>Statement match results</h1><div className="muted">{upload.filename} · {upload.row_count} charges</div></div>
        <a className="btn dark small" href={`/api/export/billing/${id}`}>Download billing CSV (matched by job)</a>
      </div>
      <div className="kpis">
        <div className="kpi"><div className="label">Matched to a job</div><div className="n">{count("matched")}</div><div className="small muted">{money(sum("matched"))} ready to bill</div></div>
        <div className="kpi"><div className="label">To check</div><div className="n">{count("check")}</div><div className="small muted">{money(sum("check"))}: points differ from the runsheet</div></div>
        <div className="kpi alert"><div className="label">No trip logged</div><div className="n">{money(sum("unmatched"))}</div><div className="small muted">{count("unmatched")} toll{count("unmatched") === 1 ? "" : "s"} can&apos;t be billed yet</div></div>
        <div className="kpi"><div className="label">Trips with no charge</div><div className="n">{noCharge.length}</div><div className="small muted">Logged, but not on this statement</div></div>
      </div>
      <div className="table-wrap">
        <table className="grid">
          <thead><tr><th>Status</th><th>Date</th><th>Time</th><th>Plate</th><th>Road</th><th>Entry → Exit (statement)</th><th>Amount</th><th>What it means</th></tr></thead>
          <tbody>
            {charges.map((c) => (
              <tr key={c.id} className={`st-${c.match_status}`}>
                <td><StatusChip status={c.match_status} /></td>
                <td className="nowrap">{auDate(c.charge_date)}</td>
                <td className="nowrap">{c.charge_time}</td>
                <td className="nowrap">{c.plate}</td>
                <td>{c.road_name}</td>
                <td>{c.entry_name} → {c.exit_name}</td>
                <td>{money(c.amount_cents)}</td>
                <td className="small">{c.match_note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {noCharge.length > 0 && (
        <>
          <h2 style={{ margin: "8px 0 0", fontSize: 19 }}>Logged trips with no charge on this statement</h2>
          <p className="small muted" style={{ margin: 0 }}>These may be on a different toll account or a later statement, or the driver logged a trip that didn&apos;t use a toll road.</p>
          <div className="table-wrap">
            <table className="grid">
              <thead><tr><th>Date</th><th>Driver</th><th>Job</th><th>Truck</th><th>Road</th><th>Entry → Exit</th></tr></thead>
              <tbody>
                {noCharge.map((t) => (
                  <tr key={t.id}><td>{auDate(t.trip_date)}</td><td>{t.full_name}</td><td>{t.job_number}</td><td>{t.truck_rego}</td><td>{t.road}</td><td>{t.entry} → {t.exit}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </OfficeShell>
  );
}
