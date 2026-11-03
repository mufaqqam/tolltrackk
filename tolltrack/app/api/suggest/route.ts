import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { allow } from "@/lib/rateLimit";
import { suggestForTrip } from "@/lib/suggestService";

export const dynamic = "force-dynamic";

const body = z.object({
  pickup: z.string().trim().min(3).max(200),
  dropoff: z.string().trim().min(3).max(200),
  pickupLat: z.number().min(-90).max(90).optional(),
  pickupLng: z.number().min(-180).max(180).optional(),
});

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user || user.role !== "driver") return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  if (!allow(`suggest:${user.id}`, 30, 10 * 60_000)) {
    return NextResponse.json({ error: "Too many lookups. Wait a few minutes or choose the points yourself." }, { status: 429 });
  }
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter both addresses (at least 3 characters)." }, { status: 400 });
  const { pickup, dropoff, pickupLat, pickupLng } = parsed.data;
  const out = await suggestForTrip({
    pickup,
    dropoff,
    pickupPoint: pickupLat != null && pickupLng != null ? { lat: pickupLat, lng: pickupLng } : undefined,
  });
  const s = out.suggestion;
  return NextResponse.json({
    problem: out.problem,
    pickupFound: out.pickupFound,
    dropoffFound: out.dropoffFound,
    suggestion:
      s?.kind === "route"
        ? {
            kind: "route",
            roadName: s.roadName,
            entry: { id: s.entry.id, name: s.entry.name },
            exit: { id: s.exit.id, name: s.exit.name },
            confidence: s.confidence,
            needsCheck: s.needsCheck,
            reason: s.reason,
          }
        : s ?? null,
  });
}
