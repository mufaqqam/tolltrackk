"use server";
import { redirect } from "next/navigation";
import { adminLoginSchema, driverLoginSchema, firstError } from "@/lib/validation";
import { currentUser, endSession, startSession, verifyCredentials } from "@/lib/auth";

export type FormState = { error?: string; ok?: string } | undefined;

export async function loginDriver(_: FormState, form: FormData): Promise<FormState> {
  const parsed = driverLoginSchema.safeParse({ driverNo: form.get("driverNo"), pin: form.get("pin") });
  if (!parsed.success) return { error: firstError(parsed.error) };
  const res = await verifyCredentials("driver", parsed.data.driverNo, parsed.data.pin);
  if (!res.ok) return { error: res.message };
  await startSession(res.userId);
  redirect("/today");
}

export async function loginAdmin(_: FormState, form: FormData): Promise<FormState> {
  const parsed = adminLoginSchema.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return { error: firstError(parsed.error) };
  const res = await verifyCredentials("admin", parsed.data.email, parsed.data.password);
  if (!res.ok) return { error: res.message };
  await startSession(res.userId);
  redirect("/office");
}

export async function logout() {
  const u = await currentUser();
  await endSession();
  redirect(u?.role === "admin" ? "/office/login" : "/login");
}
