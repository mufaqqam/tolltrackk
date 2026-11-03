"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { audit, requireDriver } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getTollPoints } from "@/lib/data";
import { melbourneToday } from "@/lib/time";
import { suggestForTrip } from "@/lib/suggestService";
import { CHECK_THRESHOLD, type TollPoint } from "@/lib/suggest";
import { firstError, tripSchema } from "@/lib/validation";
import type { FormState } from "./auth";

/** Server-side rule check: never trust the browser to send a valid entry/exit pair. */
function checkPoints(points: TollPoint[], entryId: number, exitId: number): { entry: TollPoint; exit: TollPoint } | string {
  const entry = points.find((p) => p.id === entryId);
  const exit = points.find((p) => p.id === exitId);
  if (!entry || !exit) return "Choose a valid entry and exit point.";
  if (entry.id === exit.id) return "Entry and exit can't be the same point.";
  if (entry.roadId !== exit.roadId) return "Entry and exit must be on the same toll road. Log a separate trip for each toll road.";
  const dir = exit.km > entry.km ? "inc" : "dec";
  if (!entry.entryDirs.includes(dir)) return `You can't get on at ${entry.name} in that direction.`;
  if (!exit.exitDirs.includes(dir)) return `You can't get off at ${exit.name} in that direction.`;
  return { entry, exit };
}

function readTrip(form: FormData) {
  return tripSchema.safeParse({
    jobNumber: form.get("jobNumber"),
    tollAccount: form.get("tollAccount"),
    pickupAddress: form.get("pickupAddress"),
    dropoffAddress: form.get("dropoffAddress"),
    pickupLat: form.get("pickupLat"),
    pickupLng: form.get("pickupLng"),
    entryPointId: form.get("entryPointId"),
    exitPointId: form.get("exitPointId"),
  });
}

export async function createTrip(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireDriver();
  const parsed = readTrip(form);
  if (!parsed.success) return { error: firstError(parsed.error) };
  const d = parsed.data;

  const points = await getTollPoints();
  const chosen = checkPoints(points, d.entryPointId, d.exitPointId);
  if (typeof chosen === "string") return { error: chosen };

  // Re-run the suggestion on the server, so the stored confidence can't be faked by the browser.
  const pickupPoint = d.pickupLat != null && d.pickupLng != null ? { lat: d.pickupLat, lng: d.pickupLng } : undefined;
  const out = await suggestForTrip({ pickup: d.pickupAddress, dropoff: d.dropoffAddress, pickupPoint });
  const s = out.suggestion?.kind === "route" ? out.suggestion : null;
  const acceptedAsIs = !!s && s.entry.id === chosen.entry.id && s.exit.id === chosen.exit.id;
  const needsCheck = acceptedAsIs && s!.confidence < CHECK_THRESHOLD;

  const db = sql();
  const [row] = await db`
    insert into trips (driver_id, trip_date, job_number, toll_account, truck_rego, pickup_address, dropoff_address,
      pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, entry_point_id, exit_point_id,
      suggested_entry_id, suggested_exit_id, confidence, suggestion_reason, needs_check)
    values (${user.id}, ${melbourneToday()}, ${d.jobNumber.toUpperCase()}, ${d.tollAccount}, ${user.truckRego ?? "UNKNOWN"},
      ${d.pickupAddress}, ${d.dropoffAddress},
      ${out.pickupPoint?.lat ?? null}, ${out.pickupPoint?.lng ?? null}, ${out.dropoffPoint?.lat ?? null}, ${out.dropoffPoint?.lng ?? null},
      ${chosen.entry.id}, ${chosen.exit.id}, ${s?.entry.id ?? null}, ${s?.exit.id ?? null},
      ${s?.confidence ?? null}, ${s?.reason ?? (out.suggestion?.kind === "none" ? out.suggestion.reason : out.problem)}, ${needsCheck})
    returning id`;
  await audit(user.id, "trip_created", "trip", Number(row.id), {
    job: d.jobNumber, suggested: s ? [s.entry.id, s.exit.id] : null, chosen: [chosen.entry.id, chosen.exit.id], confidence: s?.confidence ?? null,
  });
  revalidatePath("/today");
  redirect(`/today?added=${encodeURIComponent(d.jobNumber.toUpperCase())}`);
}

export async function updateTrip(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireDriver();
  const tripId = Number(form.get("tripId"));
  const parsed = readTrip(form);
  if (!parsed.success) return { error: firstError(parsed.error) };
  const d = parsed.data;
  const points = await getTollPoints();
  const chosen = checkPoints(points, d.entryPointId, d.exitPointId);
  if (typeof chosen === "string") return { error: chosen };

  const db = sql();
  // The WHERE clause is the access control: only this driver's own, not-yet-submitted trip can change.
  const rows = await db`
    update trips set job_number = ${d.jobNumber.toUpperCase()}, toll_account = ${d.tollAccount},
      pickup_address = ${d.pickupAddress}, dropoff_address = ${d.dropoffAddress},
      entry_point_id = ${chosen.entry.id}, exit_point_id = ${chosen.exit.id},
      needs_check = false, updated_at = now()
    where id = ${tripId} and driver_id = ${user.id} and runsheet_id is null
    returning id`;
  if (!rows.length) return { error: "This trip can't be changed. It may already be on a submitted runsheet." };
  await audit(user.id, "trip_updated", "trip", tripId, { entry: chosen.entry.id, exit: chosen.exit.id });
  revalidatePath("/review");
  redirect("/review?saved=1");
}

export async function deleteTrip(form: FormData) {
  const user = await requireDriver();
  const tripId = Number(form.get("tripId"));
  const rows = await sql()`delete from trips where id = ${tripId} and driver_id = ${user.id} and runsheet_id is null returning job_number`;
  if (rows.length) await audit(user.id, "trip_deleted", "trip", tripId, { job: rows[0].job_number });
  revalidatePath("/review");
  redirect("/review");
}

export async function submitDay(_: FormState): Promise<FormState> {
  const user = await requireDriver();
  const today = melbourneToday();
  const db = sql();
  const pending = await db`select id, needs_check from trips where driver_id = ${user.id} and trip_date = ${today} and runsheet_id is null`;
  if (!pending.length) return { error: "There are no new trips to send." };
  const flagged = pending.filter((t) => t.needs_check).length;
  if (flagged) return { error: `Check ${flagged} flagged trip${flagged > 1 ? "s" : ""} before sending the runsheet.` };

  const id = await db.begin(async (tx) => {
    const [sheet] = await tx`
      insert into runsheets (driver_id, sheet_date, trip_count) values (${user.id}, ${today}, ${pending.length})
      on conflict (driver_id, sheet_date) do update set trip_count = runsheets.trip_count + excluded.trip_count, submitted_at = now()
      returning id`;
    await tx`update trips set runsheet_id = ${sheet.id} where id in ${tx(pending.map((t) => t.id))} and runsheet_id is null`;
    return Number(sheet.id);
  });
  await audit(user.id, "runsheet_submitted", "runsheet", id, { trips: pending.length, date: today });
  redirect(`/runsheets/${id}?sent=1`);
}
