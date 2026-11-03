import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { sql } from "./db";

export type Role = "driver" | "admin";
export type SessionUser = {
  id: number;
  role: Role;
  fullName: string;
  driverNo: string | null;
  email: string | null;
  truckRego: string | null;
  tollAccount: string | null;
};

const COOKIE = "tt_session";
const SESSION_HOURS = 14; // a long shift, then sign in again
const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

const DUMMY_HASH = bcrypt.hashSync("not-a-real-pin", 10);
const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

/** Check a driver ID + PIN or admin email + password. Locks the account after repeated failures. */
export async function verifyCredentials(
  kind: Role,
  identifier: string,
  secret: string,
): Promise<{ ok: true; userId: number } | { ok: false; message: string }> {
  const db = sql();
  const rows =
    kind === "driver"
      ? await db`select id, secret_hash, failed_logins, locked_until, active from users where role = 'driver' and driver_no = ${identifier}`
      : await db`select id, secret_hash, failed_logins, locked_until, active from users where role = 'admin' and lower(email) = lower(${identifier})`;
  const generic = kind === "driver" ? "Driver ID or PIN is incorrect." : "Email or password is incorrect.";
  const user = rows[0];
  if (!user || !user.active) {
    await bcrypt.compare(secret, DUMMY_HASH); // take the same time as a real check, so IDs can't be guessed by timing
    return { ok: false, message: generic };
  }
  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    return { ok: false, message: `Too many attempts. Try again after ${LOCK_MINUTES} minutes or ask the office to reset your PIN.` };
  }
  const good = await bcrypt.compare(secret, user.secret_hash);
  if (!good) {
    const failed = user.failed_logins + 1;
    await db`update users set failed_logins = ${failed},
      locked_until = ${failed >= MAX_FAILED ? db`now() + make_interval(mins => ${LOCK_MINUTES})` : null}
      where id = ${user.id}`;
    await audit(user.id, "login_failed", "user", user.id, { attempt: failed });
    return { ok: false, message: failed >= MAX_FAILED ? `Too many attempts. Locked for ${LOCK_MINUTES} minutes.` : generic };
  }
  await db`update users set failed_logins = 0, locked_until = null where id = ${user.id}`;
  return { ok: true, userId: user.id };
}

export async function startSession(userId: number) {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_HOURS * 3600_000);
  await sql()`insert into sessions (token_hash, user_id, expires_at) values (${hashToken(token)}, ${userId}, ${expires})`;
  cookies().set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
  await audit(userId, "login", "user", userId, null);
}

export async function endSession() {
  const token = cookies().get(COOKIE)?.value;
  if (token) await sql()`delete from sessions where token_hash = ${hashToken(token)}`;
  cookies().delete(COOKIE);
}

export async function currentUser(): Promise<SessionUser | null> {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  const rows = await sql()`
    select u.id, u.role, u.full_name, u.driver_no, u.email, u.truck_rego, u.toll_account
    from sessions s join users u on u.id = s.user_id
    where s.token_hash = ${hashToken(token)} and s.expires_at > now() and u.active`;
  const u = rows[0];
  if (!u) return null;
  return {
    id: Number(u.id),
    role: u.role,
    fullName: u.full_name,
    driverNo: u.driver_no,
    email: u.email,
    truckRego: u.truck_rego,
    tollAccount: u.toll_account,
  };
}

/** Page/action guard: only a signed-in driver gets past this line. */
export async function requireDriver(): Promise<SessionUser> {
  const u = await currentUser();
  if (!u) redirect("/login");
  if (u.role !== "driver") redirect("/office");
  return u;
}

/** Page/action guard: only a signed-in office admin gets past this line. */
export async function requireAdmin(): Promise<SessionUser> {
  const u = await currentUser();
  if (!u) redirect("/office/login");
  if (u.role !== "admin") redirect("/today");
  return u;
}

export async function hashSecret(secret: string) {
  return bcrypt.hash(secret, 10);
}

export async function audit(
  userId: number | null,
  action: string,
  entity: string | null,
  entityId: number | null,
  detail: Record<string, unknown> | null,
) {
  await sql()`insert into audit_log (user_id, action, entity, entity_id, detail)
    values (${userId}, ${action}, ${entity}, ${entityId}, ${detail ? sql().json(detail as never) : null})`;
}
