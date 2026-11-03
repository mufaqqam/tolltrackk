import raw from "../db/toll-points.json";
import type { Dir, TollPoint } from "./suggest";

/** The toll network reference data as typed objects (same data the database is seeded with). */
export function loadTollPoints(): TollPoint[] {
  const roadName = new Map(raw.roads.map((r) => [r.id, r.name]));
  return raw.points.map((p) => ({
    id: p.id,
    roadId: p.road,
    roadName: roadName.get(p.road) ?? "Unknown",
    name: p.name,
    km: p.km,
    lat: p.lat,
    lng: p.lng,
    entryDirs: p.entry as Dir[],
    exitDirs: p.exit as Dir[],
  }));
}
