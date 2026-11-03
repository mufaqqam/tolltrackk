import "server-only";
import { sql } from "./db";
import { inMelbourne, suburbFromAddress, type LatLng } from "./geo";

export type GeoResult = { point: LatLng; label: string; source: "map" | "suburb" | "cache" } | null;

const normalise = (a: string) => a.trim().toLowerCase().replace(/\s+/g, " ");

/**
 * Turn an address into coordinates.
 * 1. Saved result (each address is looked up once — kinder to the free service and faster).
 * 2. OpenStreetMap Nominatim, limited to Victoria, Australia.
 * 3. Offline fallback: the centre of the suburb named in the address.
 */
export async function geocode(address: string): Promise<GeoResult> {
  const key = normalise(address);
  if (key.length < 3) return null;
  const db = sql();

  const cached = await db`select lat, lng, label from geocode_cache where query = ${key}`;
  if (cached[0]?.lat != null) {
    return { point: { lat: cached[0].lat, lng: cached[0].lng }, label: cached[0].label, source: "cache" };
  }

  let result: GeoResult = null;
  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", address.toLowerCase().includes("vic") ? address : `${address}, Victoria`);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "1");
    url.searchParams.set("countrycodes", "au");
    const res = await fetch(url, {
      headers: { "User-Agent": "TollTrack-MVP/1.0 (university student project)", "Accept-Language": "en-AU" },
      signal: AbortSignal.timeout(4000),
      cache: "no-store",
    });
    if (res.ok) {
      const data = (await res.json()) as { lat: string; lon: string; display_name: string }[];
      if (data[0]) {
        const point = { lat: Number(data[0].lat), lng: Number(data[0].lon) };
        if (inMelbourne(point)) result = { point, label: data[0].display_name, source: "map" };
      }
    }
  } catch {
    // network error or timeout: fall through to the offline fallback
  }

  if (!result) {
    const s = suburbFromAddress(address);
    if (s) result = { point: s.point, label: `${s.name} (suburb centre)`, source: "suburb" };
  }

  // Only precise map results are saved; a suburb-centre guess is retried next time.
  if (result?.source === "map") {
    await db`insert into geocode_cache (query, lat, lng, label, source)
      values (${key}, ${result.point.lat}, ${result.point.lng}, ${result.label}, ${result.source})
      on conflict (query) do nothing`;
  }
  return result;
}
