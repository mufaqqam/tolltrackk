import { describe, expect, test } from "vitest";
import { matchCharges, parseCsv, parseStatement, toCents, toIsoDate, type TripForMatch } from "@/lib/statement";
import { toCsv } from "@/lib/csv";

const trips: TripForMatch[] = [
  { id: 1, tripDate: "2026-11-02", truckRego: "1XT 4KD", roadName: "EastLink", entryName: "Ringwood Bypass", exitName: "Burwood Hwy", jobNumber: "A-4471" },
  { id: 2, tripDate: "2026-11-02", truckRego: "1XT 4KD", roadName: "CityLink", entryName: "Bolte Bridge / West Gate Fwy / Kings Way / Power St", exitName: "Racecourse Rd", jobNumber: "A-4475" },
  { id: 3, tripDate: "2026-11-02", truckRego: "1XT 4KD", roadName: "EastLink", entryName: "High Street Rd", exitName: "Burwood Hwy", jobNumber: "A-4479" },
];
const charge = (road: string, entry: string, exit: string, plate = "1XT4KD", date = "2026-11-02") =>
  ({ chargeDate: date, chargeTime: "8:00 am", plate, roadName: road, entryName: entry, exitName: exit, amountCents: 900 });

describe("statement matching", () => {
  test("exact match on date, plate (spacing ignored), road, entry and exit", () => {
    const [r] = matchCharges([charge("EastLink", "Ringwood Bypass", "Burwood Hwy")], trips);
    expect(r).toMatchObject({ status: "matched", tripId: 1 });
  });

  test("near miss sharing an entry point is flagged to check", () => {
    const [r] = matchCharges([charge("CityLink", "Bolte Bridge / West Gate Fwy / Kings Way / Power St", "Tullamarine Fwy / Bell St / Moreland Rd / Pascoe Vale Rd")], trips);
    expect(r).toMatchObject({ status: "check", tripId: 2 });
  });

  test("regression (vibe log #6): unrelated toll on the same road is NOT pinned on another job", () => {
    const [r] = matchCharges([charge("EastLink", "Princes Hwy", "Thompson Rd")], trips);
    expect(r).toMatchObject({ status: "unmatched", tripId: null });
  });

  test("one trip is never matched to two charges, exact matches win first", () => {
    const res = matchCharges([charge("EastLink", "Ringwood Bypass", "Canterbury Rd"), charge("EastLink", "Ringwood Bypass", "Burwood Hwy")], trips);
    expect(res[1]).toMatchObject({ status: "matched", tripId: 1 });
    expect(res[0].tripId).not.toBe(1);
  });

  test("different truck or different day does not match", () => {
    expect(matchCharges([charge("EastLink", "Ringwood Bypass", "Burwood Hwy", "1YB7QR")], trips)[0].status).toBe("unmatched");
    expect(matchCharges([charge("EastLink", "Ringwood Bypass", "Burwood Hwy", "1XT 4KD", "2026-11-03")], trips)[0].status).toBe("unmatched");
  });
});

describe("statement parsing and validation", () => {
  test("parses quoted CSV fields with commas", () => {
    expect(parseCsv('a,"b, c","d ""e"""\n1,2,3')).toEqual([["a", "b, c", 'd "e"'], ["1", "2", "3"]]);
  });
  test("reads a valid statement", () => {
    const { rows, errors } = parseStatement("Date,Time,Plate,Toll Road,Entry,Exit,Amount\n02/11/2026,7:43 am,1XT 4KD,EastLink,Ringwood Bypass,Burwood Hwy,$8.62\n");
    expect(errors).toEqual([]);
    expect(rows[0]).toMatchObject({ chargeDate: "2026-11-02", amountCents: 862, roadName: "EastLink" });
  });
  test("rejects impossible dates, bad amounts and missing columns", () => {
    expect(toIsoDate("31/02/2026")).toBeNull();
    expect(toCents("=1+1")).toBeNull();
    expect(parseStatement("Date,Plate,Amount\n02/11/2026,ABC,1\n").errors[0]).toMatch(/Missing column/);
    const bad = parseStatement("Date,Time,Plate,Toll Road,Entry,Exit,Amount\n32/13/2026,1,ABC,EastLink,A,B,9\n");
    expect(bad.rows).toHaveLength(0);
    expect(bad.errors[0]).toMatch(/Line 2/);
  });
});

describe("CSV export safety", () => {
  test("cells that start with = + - @ are neutralised (formula injection)", () => {
    expect(toCsv([["=HYPERLINK(\"http://x\")", "+61", "ok"]])).toBe(`"'=HYPERLINK(""http://x"")",'+61,ok`);
  });
});
