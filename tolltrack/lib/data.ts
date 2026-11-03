import "server-only";
import { sql } from "./db";
import type { Dir, TollPoint } from "./suggest";

/** Toll points from the database (the reference table), typed for the suggestion engine. */
export async function getTollPoints(): Promise<TollPoint[]> {
  const rows = await sql()`
    select p.id, p.road_id, r.name as road_name, p.name, p.km, p.lat, p.lng, p.entry_dirs, p.exit_dirs
    from toll_points p join toll_roads r on r.id = p.road_id
    order by p.road_id, p.km, p.id`;
  return rows.map((r) => ({
    id: r.id,
    roadId: r.road_id,
    roadName: r.road_name,
    name: r.name,
    km: Number(r.km),
    lat: r.lat,
    lng: r.lng,
    entryDirs: r.entry_dirs as Dir[],
    exitDirs: r.exit_dirs as Dir[],
  }));
}

export type TripRow = {
  id: number;
  tripDate: string;
  jobNumber: string;
  tollAccount: string;
  truckRego: string;
  pickupAddress: string;
  dropoffAddress: string;
  roadName: string;
  entryId: number;
  exitId: number;
  entryName: string;
  exitName: string;
  confidence: number | null;
  reason: string | null;
  needsCheck: boolean;
  edited: boolean;
  runsheetId: number | null;
  createdAt: Date;
};

const tripSelect = (db: ReturnType<typeof sql>) => db`
  select t.id, t.trip_date, t.job_number, t.toll_account, t.truck_rego, t.pickup_address, t.dropoff_address,
         r.name as road_name, t.entry_point_id, t.exit_point_id, e.name as entry_name, x.name as exit_name,
         t.confidence, t.suggestion_reason, t.needs_check, t.runsheet_id, t.created_at,
         (t.suggested_entry_id is distinct from t.entry_point_id or t.suggested_exit_id is distinct from t.exit_point_id) as edited
  from trips t
  join toll_points e on e.id = t.entry_point_id
  join toll_points x on x.id = t.exit_point_id
  join toll_roads r on r.id = e.road_id`;

function mapTrip(r: Record<string, any>): TripRow {
  return {
    id: Number(r.id),
    tripDate: r.trip_date,
    jobNumber: r.job_number,
    tollAccount: r.toll_account,
    truckRego: r.truck_rego,
    pickupAddress: r.pickup_address,
    dropoffAddress: r.dropoff_address,
    roadName: r.road_name,
    entryId: r.entry_point_id,
    exitId: r.exit_point_id,
    entryName: r.entry_name,
    exitName: r.exit_name,
    confidence: r.confidence,
    reason: r.suggestion_reason,
    needsCheck: r.needs_check,
    edited: r.edited,
    runsheetId: r.runsheet_id == null ? null : Number(r.runsheet_id),
    createdAt: r.created_at,
  };
}

/** A driver's trips for one day. Always filtered by the signed-in driver's id (access control). */
export async function driverTrips(driverId: number, date: string): Promise<TripRow[]> {
  const db = sql();
  const rows = await db`${tripSelect(db)} where t.driver_id = ${driverId} and t.trip_date = ${date} order by t.created_at`;
  return rows.map(mapTrip);
}

export async function driverTrip(driverId: number, tripId: number): Promise<TripRow | null> {
  const db = sql();
  const rows = await db`${tripSelect(db)} where t.driver_id = ${driverId} and t.id = ${tripId}`;
  return rows[0] ? mapTrip(rows[0]) : null;
}

export async function runsheetTrips(runsheetId: number): Promise<TripRow[]> {
  const db = sql();
  const rows = await db`${tripSelect(db)} where t.runsheet_id = ${runsheetId} order by t.created_at`;
  return rows.map(mapTrip);
}

export async function tripsForMatching(from: string, to: string) {
  const db = sql();
  const rows = await db`${tripSelect(db)} where t.runsheet_id is not null and t.trip_date between ${from} and ${to}`;
  return rows.map(mapTrip);
}

export const money = (cents: number) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(cents / 100);
