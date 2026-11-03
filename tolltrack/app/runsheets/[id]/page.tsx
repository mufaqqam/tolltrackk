import Link from "next/link";
import { notFound } from "next/navigation";
import { requireDriver } from "@/lib/auth";
import { sql } from "@/lib/db";
import { runsheetTrips } from "@/lib/data";
import { dayLabel } from "@/lib/time";
import { NavBar } from "@/components/DriverChrome";
import { RunsheetTable } from "@/components/RunsheetTable";
import { PrintButton } from "@/components/PrintButton";
import { Icon } from "@/components/Icon";

export const dynamic = "force-dynamic";

export default async function Runsheet({ params, searchParams }: { params: { id: string }; searchParams: { sent?: string } }) {
  const user = await requireDriver();
  const id = Number(params.id);
  if (!Number.isInteger(id)) notFound();
  const [sheet] = await sql()`select id, sheet_date, trip_count from runsheets where id = ${id} and driver_id = ${user.id}`;
  if (!sheet) notFound();
  const trips = await runsheetTrips(id);

  return (
    <main className="phone">
      {searchParams.sent ? (
        <section className="success">
          <div className="tick"><Icon name="check" size={40} color="var(--green)" strokeWidth={2.6} /></div>
          <h1>Runsheet sent to office</h1>
          <div className="muted">{dayLabel(sheet.sheet_date)} · {trips.length} toll trip{trips.length === 1 ? "" : "s"}</div>
        </section>
      ) : (
        <NavBar title={`Runsheet ${dayLabel(sheet.sheet_date)}`} backHref="/runsheets" />
      )}
      <div className="content">
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, gap: 8, flexWrap: "wrap" }}>
            <strong>Runsheet</strong>
            <span className="small muted">Driver {user.driverNo} · {user.truckRego}</span>
          </div>
          <RunsheetTable trips={trips} />
        </div>
        <div className="card small" style={{ display: "flex", gap: 10, background: "#e6efee", boxShadow: "none" }}>
          <Icon name="sparkle" size={18} color="var(--teal)" />
          <span>The office will match these trips to the toll statement when it arrives and flag anything missing.</span>
        </div>
      </div>
      <div className="actions no-print">
        <div style={{ display: "flex", gap: 10 }}>
          <PrintButton />
          <a className="btn soft" href={`/api/export/runsheet/${id}`}><Icon name="download" size={18} /> CSV</a>
        </div>
        <Link href="/today" className="btn primary">Back to home</Link>
      </div>
    </main>
  );
}
