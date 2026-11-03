import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { runsheetTrips } from "@/lib/data";
import { toCsv } from "@/lib/csv";
import { auDate } from "@/lib/time";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const id = Number(params.id);
  // Drivers can export only their own runsheets; office admins can export any.
  const rows = user.role === "admin"
    ? await sql()`select r.id, r.sheet_date, u.driver_no from runsheets r join users u on u.id = r.driver_id where r.id = ${id}`
    : await sql()`select r.id, r.sheet_date, u.driver_no from runsheets r join users u on u.id = r.driver_id where r.id = ${id} and r.driver_id = ${user.id}`;
  if (!rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const trips = await runsheetTrips(id);
  const csv = toCsv([
    ["Date", "Toll authority number", "Customer (job)", "Toll road", "Toll entry point", "Toll exit point", "Truck"],
    ...trips.map((t) => [auDate(t.tripDate), t.tollAccount, t.jobNumber, t.roadName, t.entryName, t.exitName, t.truckRego]),
  ]);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="runsheet-driver${rows[0].driver_no}-${rows[0].sheet_date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
