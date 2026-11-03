import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { toCsv } from "@/lib/csv";
import { auDate } from "@/lib/time";

export const dynamic = "force-dynamic";

/** Matched tolls grouped by job, ready to add to customer invoices. */
export async function GET(_: Request, { params }: { params: { id: string } }) {
  const user = await currentUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Office sign-in required" }, { status: 401 });
  const rows = await sql()`
    select t.job_number, c.charge_date, c.road_name, c.entry_name, c.exit_name, c.amount_cents, c.plate
    from statement_charges c join trips t on t.id = c.matched_trip_id
    where c.upload_id = ${Number(params.id)} and c.match_status = 'matched'
    order by t.job_number, c.charge_date`;
  const csv = toCsv([
    ["Job", "Date", "Toll road", "Entry", "Exit", "Plate", "Amount (AUD)"],
    ...rows.map((r) => [r.job_number, auDate(r.charge_date), r.road_name, r.entry_name, r.exit_name, r.plate, (r.amount_cents / 100).toFixed(2)]),
  ]);
  return new NextResponse(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="tolls-to-bill-${params.id}.csv"`, "Cache-Control": "no-store" },
  });
}
