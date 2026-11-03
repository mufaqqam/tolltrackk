import "server-only";
import { geocode } from "./geocode";
import { getTollPoints } from "./data";
import { suggestRoute, type Suggestion } from "./suggest";
import type { LatLng } from "./geo";

export type SuggestInput = { pickup: string; dropoff: string; pickupPoint?: LatLng };

export type SuggestOutput = {
  suggestion: Suggestion | null;
  pickupFound: string | null;
  dropoffFound: string | null;
  problem: string | null;
  pickupPoint: LatLng | null;
  dropoffPoint: LatLng | null;
};

/** Look up both addresses, then run the suggestion engine. Used by the API and re-run on save. */
export async function suggestForTrip(input: SuggestInput): Promise<SuggestOutput> {
  const [pick, drop] = await Promise.all([
    input.pickupPoint ? Promise.resolve({ point: input.pickupPoint, label: "Your current location", source: "map" as const }) : geocode(input.pickup),
    geocode(input.dropoff),
  ]);
  if (!pick || !drop) {
    return {
      suggestion: null,
      pickupFound: pick?.label ?? null,
      dropoffFound: drop?.label ?? null,
      pickupPoint: pick?.point ?? null,
      dropoffPoint: drop?.point ?? null,
      problem: `Couldn't find the ${!pick ? "pickup" : "drop-off"} address. Add the suburb (e.g. "Scoresby VIC") or choose the toll points yourself.`,
    };
  }
  const points = await getTollPoints();
  return {
    suggestion: suggestRoute(pick.point, drop.point, points),
    pickupFound: pick.label,
    dropoffFound: drop.label,
    problem: null,
    pickupPoint: pick.point,
    dropoffPoint: drop.point,
  };
}
