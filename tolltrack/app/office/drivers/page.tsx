import { requireAdmin } from "@/lib/auth";
import { sql } from "@/lib/db";
import { OfficeShell } from "@/components/OfficeShell";
import { AddDriverForm, ResetPinForm } from "@/components/OfficeForms";

export const dynamic = "force-dynamic";

export default async function Drivers() {
  const admin = await requireAdmin();
  const drivers = await sql()`
    select id, driver_no, full_name, truck_rego, toll_account, locked_until > now() as locked,
      (select count(*) from trips t where t.driver_id = users.id)::int as trips
    from users where role = 'driver' order by driver_no`;
  return (
    <OfficeShell active="/office/drivers" userName={admin.fullName}>
      <h1>Drivers</h1>
      <p className="muted" style={{ margin: 0 }}>Only the office can add drivers or reset PINs. PINs are stored as one-way hashes, so nobody (including the office) can see them.</p>
      <div className="table-wrap">
        <table className="grid">
          <thead><tr><th>Driver ID</th><th>Name</th><th>Truck</th><th>Toll account</th><th>Trips</th><th>Status</th><th>Reset PIN</th></tr></thead>
          <tbody>
            {drivers.map((d) => (
              <tr key={d.id}>
                <td><strong>{d.driver_no}</strong></td><td>{d.full_name}</td><td>{d.truck_rego}</td><td>{d.toll_account}</td><td>{d.trips}</td>
                <td>{d.locked ? <span className="pill red">Locked</span> : <span className="pill mint">Active</span>}</td>
                <td><ResetPinForm userId={Number(d.id)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <AddDriverForm />
    </OfficeShell>
  );
}
