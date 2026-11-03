/**
 * Toll statement import and matching. Pure functions (no database), so they are easy to unit test.
 *
 * Expected CSV columns (header names are matched loosely, in any order):
 *   Date (DD/MM/YYYY), Time, Plate, Toll Road, Entry, Exit, Amount
 */

export type ChargeRow = {
  chargeDate: string; // YYYY-MM-DD
  chargeTime: string;
  plate: string;
  roadName: string;
  entryName: string;
  exitName: string;
  amountCents: number;
};

export type TripForMatch = {
  id: number;
  tripDate: string;
  truckRego: string;
  roadName: string;
  entryName: string;
  exitName: string;
  jobNumber: string;
};

export type MatchResult = {
  status: "matched" | "check" | "unmatched";
  tripId: number | null;
  note: string;
};

export const MAX_ROWS = 2000;
export const MAX_BYTES = 512 * 1024;

/** Minimal RFC 4180 CSV parser: handles quoted fields, commas and quotes inside quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f.trim() !== "")) rows.push(row);
  return rows;
}

const HEADERS: Record<keyof ChargeRow | "date" | "time" | "amount", string[]> = {
  date: ["date", "trip date", "transaction date"],
  time: ["time", "trip time"],
  plate: ["plate", "licence plate", "license plate", "vehicle", "rego"],
  roadName: ["toll road", "road", "motorway"],
  entryName: ["entry", "entry point", "on"],
  exitName: ["exit", "exit point", "off"],
  amount: ["amount", "toll", "charge", "cost"],
  chargeDate: [],
  chargeTime: [],
  amountCents: [],
};

/** Turn "$12.34", "12.34" or "12" into cents. Returns null if it is not a valid amount. */
export function toCents(v: string): number | null {
  const clean = v.replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null;
  return Math.round(Number(clean) * 100);
}

/** "02/11/2026" -> "2026-11-02". Also accepts ISO dates. */
export function toIsoDate(v: string): string | null {
  const s = v.trim();
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const [, d, mo, y] = m;
    const iso = `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
    return isRealDate(iso) ? iso : null;
  }
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m && isRealDate(s) ? s : null;
}

function isRealDate(iso: string) {
  const d = new Date(iso + "T00:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === iso;
}

export function parseStatement(text: string): { rows: ChargeRow[]; errors: string[] } {
  const errors: string[] = [];
  if (text.length > MAX_BYTES) return { rows: [], errors: ["File is too large (max 512 KB)."] };
  const table = parseCsv(text);
  if (table.length < 2) return { rows: [], errors: ["The file has no charge rows."] };

  const header = table[0].map((h) => h.trim().toLowerCase());
  const col = (key: keyof typeof HEADERS) => header.findIndex((h) => HEADERS[key].includes(h));
  const idx = {
    date: col("date"), time: col("time"), plate: col("plate"), road: col("roadName"),
    entry: col("entryName"), exit: col("exitName"), amount: col("amount"),
  };
  const missing = Object.entries(idx).filter(([k, v]) => v < 0 && k !== "time").map(([k]) => k);
  if (missing.length) {
    return { rows: [], errors: [`Missing column(s): ${missing.join(", ")}. Expected: Date, Time, Plate, Toll Road, Entry, Exit, Amount.`] };
  }
  if (table.length - 1 > MAX_ROWS) return { rows: [], errors: [`Too many rows (max ${MAX_ROWS}).`] };

  const rows: ChargeRow[] = [];
  table.slice(1).forEach((r, i) => {
    const line = i + 2;
    const get = (j: number) => (j >= 0 ? (r[j] ?? "").trim() : "");
    const chargeDate = toIsoDate(get(idx.date));
    const amountCents = toCents(get(idx.amount));
    const plate = get(idx.plate);
    const roadName = get(idx.road);
    const entryName = get(idx.entry);
    const exitName = get(idx.exit);
    if (!chargeDate) return errors.push(`Line ${line}: date "${get(idx.date)}" is not DD/MM/YYYY.`);
    if (amountCents === null) return errors.push(`Line ${line}: amount "${get(idx.amount)}" is not a number.`);
    if (!plate || !roadName || !entryName || !exitName) return errors.push(`Line ${line}: plate, road, entry and exit are required.`);
    if ([plate, roadName, entryName, exitName].some((f) => f.length > 120)) return errors.push(`Line ${line}: a field is too long.`);
    rows.push({ chargeDate, chargeTime: get(idx.time).slice(0, 10), plate, roadName, entryName, exitName, amountCents });
  });
  return { rows, errors };
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * Match each statement charge to at most one logged trip.
 * - matched:   same date, plate, road, entry and exit
 * - check:     same date, plate and road, and one of entry/exit matches (likely a mistake on one side)
 * - unmatched: no logged trip at all, so this toll cannot be billed to a customer
 */
export function matchCharges(charges: ChargeRow[], trips: TripForMatch[]): MatchResult[] {
  const used = new Set<number>();
  const results: MatchResult[] = charges.map(() => ({ status: "unmatched", tripId: null, note: "" }));
  const sameDay = (c: ChargeRow, t: TripForMatch) =>
    !used.has(t.id) && t.tripDate === c.chargeDate && norm(t.truckRego) === norm(c.plate) && norm(t.roadName) === norm(c.roadName);

  // Pass 1: exact matches first, so a near-miss never steals a trip that matches another charge exactly.
  charges.forEach((c, i) => {
    const t = trips.find((t) => sameDay(c, t) && norm(t.entryName) === norm(c.entryName) && norm(t.exitName) === norm(c.exitName));
    if (t) {
      used.add(t.id);
      results[i] = { status: "matched", tripId: t.id, note: `Job ${t.jobNumber}` };
    }
  });
  // Pass 2: a near miss — same day, truck and road, and it shares the entry OR the exit point.
  // (Pairing on day + truck + road alone was too loose: an unrelated toll could be "matched" to the
  //  wrong job and billed to the wrong customer.)
  charges.forEach((c, i) => {
    if (results[i].status === "matched") return;
    const t = trips.find((t) => sameDay(c, t) && (norm(t.entryName) === norm(c.entryName) || norm(t.exitName) === norm(c.exitName)));
    if (t) {
      used.add(t.id);
      results[i] = {
        status: "check",
        tripId: t.id,
        note: `Job ${t.jobNumber} was logged as ${t.entryName} → ${t.exitName}`,
      };
    } else {
      results[i] = { status: "unmatched", tripId: null, note: "No logged trip. This toll can't be billed to a customer." };
    }
  });
  return results;
}
