import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { runsheetTrips } from "@/lib/data";
import { toCsv } from "@/lib/csv";
import { auDate, melbourneTime } from "@/lib/time";

export const dynamic = "force-dynamic";

const PRICE: Record<string, number> = { CityLink: 1184, EastLink: 862, "West Gate Tunnel": 675 };

/** Builds a realistic demo statement from the latest submitted runsheets (demo/testing aid only). */
export async function GET() {
  const user = await currentUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Office sign-in required" }, { status: 401 });
  const db = sql();
  const [latest] = await db`select max(sheet_date) as d from runsheets`;
  if (!latest?.d) return NextResponse.json({ error: "No submitted runsheets yet" }, { status: 404 });
  const sheets = await db`select id from runsheets where sheet_date = ${latest.d} order by driver_id`;
  const trips = (await Promise.all(sheets.map((s) => runsheetTrips(Number(s.id))))).flat();

  const rows: (string | number)[][] = [["Date", "Time", "Plate", "Toll Road", "Entry", "Exit", "Amount"]];
  trips.forEach((t, i) => {
    if (i === trips.length - 1) return; // one logged trip has no charge (e.g. billed to another account)
    const exit = i === 1 ? "Racecourse Rd" : t.exitName; // one charge disagrees with the runsheet
    const time = melbourneTime(new Date(new Date(t.createdAt).getTime() - 25 * 60_000));
    rows.push([auDate(t.tripDate), time, t.truckRego, t.roadName, t.entryName, exit, ((PRICE[t.roadName] ?? 900) / 100).toFixed(2)]);
  });
  // Two tolls that nobody logged: the money the business would otherwise absorb.
  const plate = trips[0]?.truckRego ?? "1XT 4KD";
  rows.push([auDate(latest.d), "4:55 pm", plate, "EastLink", "Princes Hwy", "Thompson Rd", "9.46"]);
  rows.push([auDate(latest.d), "6:12 am", plate, "CityLink", "Monash Fwy / Toorak Rd", "Bolte Bridge / West Gate Fwy / Kings Way / Power St", "14.62"]);

  return new NextResponse(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sample-linkt-statement-${latest.d}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
