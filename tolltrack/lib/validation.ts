import { z } from "zod";

const text = (max: number, label: string) =>
  z.string({ required_error: `${label} is required` }).trim().min(1, `${label} is required`).max(max, `${label} is too long`);

const optionalCoord = (min: number, max: number) =>
  z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number().min(min).max(max).optional());

export const driverLoginSchema = z.object({
  driverNo: z.string().trim().regex(/^\d{1,6}$/, "Driver ID is a number"),
  pin: z.string().regex(/^\d{4,6}$/, "PIN is 4 to 6 digits"),
});

export const adminLoginSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(120),
  password: z.string().min(8, "Password is at least 8 characters").max(200),
});

export const tripSchema = z.object({
  jobNumber: text(30, "Job number").regex(/^[A-Za-z0-9\-\/ ]+$/, "Job number can only use letters, numbers, - and /"),
  tollAccount: text(30, "Toll account"),
  pickupAddress: text(200, "Pickup address"),
  dropoffAddress: text(200, "Drop-off address"),
  pickupLat: optionalCoord(-90, 90),
  pickupLng: optionalCoord(-180, 180),
  entryPointId: z.coerce.number().int().positive("Choose an entry point"),
  exitPointId: z.coerce.number().int().positive("Choose an exit point"),
});

export const newDriverSchema = z.object({
  driverNo: z.string().trim().regex(/^\d{1,6}$/, "Driver ID is 1 to 6 digits"),
  fullName: text(80, "Name"),
  pin: z.string().regex(/^\d{4,6}$/, "PIN is 4 to 6 digits"),
  truckRego: text(10, "Truck rego").transform((s) => s.toUpperCase()),
  tollAccount: text(30, "Toll account"),
});

export const resetPinSchema = z.object({
  userId: z.coerce.number().int().positive(),
  pin: z.string().regex(/^\d{4,6}$/, "PIN is 4 to 6 digits"),
});

export function firstError(e: z.ZodError): string {
  return e.issues[0]?.message ?? "Please check the form";
}
