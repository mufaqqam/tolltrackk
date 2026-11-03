import { distanceKm, type LatLng } from "./geo";

export type Dir = "inc" | "dec";

export type TollPoint = {
  id: number;
  roadId: number;
  roadName: string;
  name: string;
  km: number;
  lat: number;
  lng: number;
  entryDirs: Dir[];
  exitDirs: Dir[];
};

export type Suggestion =
  | {
      kind: "route";
      roadName: string;
      entry: TollPoint;
      exit: TollPoint;
      confidence: number; // 0-100
      needsCheck: boolean;
      reason: string;
      alternative: { entry: TollPoint; exit: TollPoint } | null;
    }
  | { kind: "none"; reason: string };

type Candidate = {
  entry: TollPoint;
  exit: TollPoint;
  access: number; // km from pickup to the entry point
  egress: number; // km from the exit point to the drop-off
  onRoad: number; // km travelled on the toll road (along the road, for display)
  span: number; // straight-line km between entry and exit (same unit as the other distances)
  ratio: number; // (access + span + egress) / direct straight-line distance
  score: number; // lower is better
};

const DIRECTION_LABEL: Record<string, Record<Dir, string>> = {
  CityLink: { inc: "south-east towards Toorak Rd", dec: "north-west towards the airport" },
  EastLink: { inc: "south towards Frankston", dec: "north towards Ringwood" },
  "West Gate Tunnel": { inc: "east towards the city", dec: "west towards the West Gate Fwy" },
};

/** Below this confidence the trip is flagged for the driver to check before the day is submitted. */
export const CHECK_THRESHOLD = 70;

/**
 * Suggest the most likely toll entry and exit points for a trip.
 *
 * It is a transparent rules engine, not a black box: for every legal entry/exit pair on each
 * toll road it estimates how much local-road driving the toll road saves, rejects pairs that
 * would be a big detour, and ranks the rest. Confidence falls when the best option is only
 * slightly better than the next one, or when a lot of the trip is still on local roads.
 */
export function suggestRoute(pickup: LatLng, dropoff: LatLng, points: TollPoint[]): Suggestion {
  const direct = distanceKm(pickup, dropoff);
  if (direct < 2) {
    return {
      kind: "none",
      reason: `Pickup and drop-off are only ${direct.toFixed(1)} km apart, so a toll road is unlikely. If you used one, choose the points yourself.`,
    };
  }

  const maxRatio = 1.35 + 3 / direct; // short trips get more slack: straight lines understate road distance
  const maxAccess = Math.max(5, 0.4 * direct);
  const candidates: Candidate[] = [];

  const byRoad = new Map<number, TollPoint[]>();
  for (const p of points) byRoad.set(p.roadId, [...(byRoad.get(p.roadId) ?? []), p]);

  for (const roadPoints of Array.from(byRoad.values())) {
    for (const entry of roadPoints) {
      if (entry.entryDirs.length === 0) continue;
      const access = distanceKm(pickup, entry);
      if (access > maxAccess) continue;
      for (const exit of roadPoints) {
        if (exit.id === entry.id || exit.exitDirs.length === 0 || exit.km === entry.km) continue;
        const dir: Dir = exit.km > entry.km ? "inc" : "dec";
        if (!entry.entryDirs.includes(dir) || !exit.exitDirs.includes(dir)) continue;
        const egress = distanceKm(exit, dropoff);
        if (egress > maxAccess) continue;
        const onRoad = Math.abs(exit.km - entry.km);
        // Compare like with like: every distance in the score is straight-line km.
        // (Mixing "km along the road" with straight-line km wrongly rejected long, curving toll trips.)
        const span = distanceKm(entry, exit);
        if (span < 1.5) continue;
        const ratio = (access + span + egress) / direct;
        if (ratio > maxRatio) continue;
        const score = access + egress + 0.5 * Math.max(0, access + span + egress - 1.1 * direct);
        candidates.push({ entry, exit, access, egress, onRoad, span, ratio, score });
      }
    }
  }

  if (candidates.length === 0) {
    return {
      kind: "none",
      reason: "No toll road fits this trip without a long detour. If you did use one, choose the points yourself.",
    };
  }

  candidates.sort((a, b) => a.score - b.score);
  const best = candidates[0];
  const runnerUp = candidates.find(
    (c) => c.entry.roadId !== best.entry.roadId || c.entry.id !== best.entry.id || c.exit.id !== best.exit.id,
  );

  const localShare = (best.access + best.egress) / (best.access + best.span + best.egress);
  let confidence = 100 - localShare * 40;
  let margin = Infinity;
  if (runnerUp) {
    margin = (runnerUp.score - best.score) / Math.max(best.score, 1);
    if (margin < 0.08) confidence -= 22;
    else if (margin < 0.2) confidence -= 10;
  }
  if (best.ratio > 1.3) confidence -= 6;
  confidence = Math.round(Math.min(97, Math.max(30, confidence)));

  const dir: Dir = best.exit.km > best.entry.km ? "inc" : "dec";
  const road = best.entry.roadName;
  let reason =
    `Pickup is ${best.access.toFixed(1)} km from ${best.entry.name} and drop-off is ${best.egress.toFixed(1)} km ` +
    `from ${best.exit.name}, using about ${best.onRoad.toFixed(1)} km of ${road} heading ${DIRECTION_LABEL[road]?.[dir] ?? dir}.`;
  const closeCall = runnerUp && margin < 0.2;
  if (closeCall) {
    reason += ` Close alternative: ${runnerUp.entry.roadName} ${runnerUp.entry.name} → ${runnerUp.exit.name}.`;
  }

  return {
    kind: "route",
    roadName: road,
    entry: best.entry,
    exit: best.exit,
    confidence,
    needsCheck: confidence < CHECK_THRESHOLD,
    reason,
    alternative: closeCall && runnerUp ? { entry: runnerUp.entry, exit: runnerUp.exit } : null,
  };
}
