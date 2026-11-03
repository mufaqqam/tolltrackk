"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { audit, hashSecret, requireAdmin } from "@/lib/auth";
import { sql } from "@/lib/db";
import { tripsForMatching } from "@/lib/data";
import { MAX_BYTES, matchCharges, parseStatement } from "@/lib/statement";
import { firstError, newDriverSchema, resetPinSchema } from "@/lib/validation";
import type { FormState } from "./auth";

export async function uploadStatement(_: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a CSV file to upload." };
  if (!/\.csv$/i.test(file.name)) return { error: "The statement must be a .csv file." };
  if (file.size > MAX_BYTES) return { error: "File is too large (max 512 KB)." };

  const { rows, errors } = parseStatement(await file.text());
  if (errors.length) return { error: `Nothing was imported. ${errors.slice(0, 3).join(" ")}${errors.length > 3 ? ` (+${errors.length - 3} more)` : ""}` };

  const dates = rows.map((r) => r.chargeDate).sort();
  const trips = await tripsForMatching(dates[0], dates[dates.length - 1]);
  const results = matchCharges(rows, trips.map((t) => ({ id: t.id, tripDate: t.tripDate, truckRego: t.truckRego, roadName: t.roadName, entryName: t.entryName, exitName: t.exitName, jobNumber: t.jobNumber })));

  const db = sql();
  const uploadId = await db.begin(async (tx) => {
    const [u] = await tx`insert into statement_uploads (uploaded_by, filename, row_count) values (${admin.id}, ${file.name.slice(0, 120)}, ${rows.length}) returning id`;
    const records = rows.map((r, i) => ({
      upload_id: u.id, charge_date: r.chargeDate, charge_time: r.chargeTime, plate: r.plate, road_name: r.roadName,
      entry_name: r.entryName, exit_name: r.exitName, amount_cents: r.amountCents,
      match_status: results[i].status, matched_trip_id: results[i].tripId, match_note: results[i].note,
    }));
    await tx`insert into statement_charges ${tx(records)}`;
    return Number(u.id);
  });
  const count = (s: string) => results.filter((r) => r.status === s).length;
  await audit(admin.id, "statement_uploaded", "statement_upload", uploadId, { rows: rows.length, matched: count("matched"), check: count("check"), unmatched: count("unmatched") });
  redirect(`/office/statements/${uploadId}`);
}

export async function addDriver(_: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = newDriverSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const d = parsed.data;
  const exists = await sql()`select 1 from users where driver_no = ${d.driverNo}`;
  if (exists.length) return { error: `Driver ID ${d.driverNo} is already used.` };
  const [u] = await sql()`insert into users (role, full_name, driver_no, secret_hash, truck_rego, toll_account)
    values ('driver', ${d.fullName}, ${d.driverNo}, ${await hashSecret(d.pin)}, ${d.truckRego}, ${d.tollAccount}) returning id`;
  await audit(admin.id, "driver_added", "user", Number(u.id), { driverNo: d.driverNo });
  revalidatePath("/office/drivers");
  return { ok: `Driver ${d.driverNo} added. Give them their PIN in person.` };
}

export async function resetPin(_: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = resetPinSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const rows = await sql()`update users set secret_hash = ${await hashSecret(parsed.data.pin)}, failed_logins = 0, locked_until = null
    where id = ${parsed.data.userId} and role = 'driver' returning driver_no`;
  if (!rows.length) return { error: "Driver not found." };
  await sql()`delete from sessions where user_id = ${parsed.data.userId}`; // sign them out everywhere
  await audit(admin.id, "pin_reset", "user", parsed.data.userId, null);
  revalidatePath("/office/drivers");
  return { ok: `PIN reset for driver ${rows[0].driver_no}.` };
}
