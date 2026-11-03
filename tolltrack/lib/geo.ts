export type LatLng = { lat: number; lng: number };

/** Straight-line distance in kilometres between two points (haversine formula). */
export function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Rough bounding box for greater Melbourne. Anything outside is rejected as a bad lookup. */
export function inMelbourne(p: LatLng): boolean {
  return p.lat < -37.4 && p.lat > -38.5 && p.lng > 144.4 && p.lng < 145.6;
}

/**
 * Offline fallback: approximate centre points for Melbourne suburbs.
 * Used when the free map service is unavailable, so the app still works in a demo.
 */
export const SUBURBS: Record<string, [number, number]> = {
  "melbourne": [-37.8136, 144.9631], "southbank": [-37.823, 144.964], "docklands": [-37.815, 144.946],
  "south melbourne": [-37.834, 144.958], "port melbourne": [-37.839, 144.942], "north melbourne": [-37.799, 144.946],
  "west melbourne": [-37.807, 144.94], "carlton": [-37.8, 144.967], "fitzroy": [-37.799, 144.978],
  "collingwood": [-37.802, 144.988], "richmond": [-37.823, 144.998], "cremorne": [-37.83, 144.993],
  "south yarra": [-37.839, 144.992], "toorak": [-37.841, 145.014], "prahran": [-37.851, 144.993],
  "windsor": [-37.856, 144.992], "st kilda": [-37.864, 144.981], "kew": [-37.806, 145.03],
  "hawthorn": [-37.822, 145.035], "camberwell": [-37.838, 145.071], "burnley": [-37.827, 145.008],
  "abbotsford": [-37.804, 144.998], "kooyong": [-37.84, 145.033], "malvern": [-37.858, 145.029],
  "armadale": [-37.855, 145.019], "glen iris": [-37.859, 145.057], "box hill": [-37.819, 145.125],
  "blackburn": [-37.819, 145.15], "nunawading": [-37.82, 145.175], "mitcham": [-37.817, 145.193],
  "donvale": [-37.79, 145.175], "ringwood east": [-37.812, 145.25], "ringwood": [-37.815, 145.229],
  "croydon": [-37.795, 145.281], "heathmont": [-37.828, 145.244], "vermont south": [-37.854, 145.183],
  "vermont": [-37.838, 145.195], "wantirna south": [-37.868, 145.224], "wantirna": [-37.849, 145.227],
  "bayswater": [-37.842, 145.268], "boronia": [-37.86, 145.286], "knoxfield": [-37.889, 145.249],
  "ferntree gully": [-37.884, 145.295], "scoresby": [-37.9, 145.228], "rowville": [-37.928, 145.232],
  "glen waverley": [-37.878, 145.165], "mount waverley": [-37.877, 145.129], "wheelers hill": [-37.904, 145.189],
  "mulgrave": [-37.928, 145.18], "clayton": [-37.915, 145.129], "oakleigh": [-37.9, 145.089],
  "springvale": [-37.95, 145.153], "noble park north": [-37.951, 145.19], "noble park": [-37.967, 145.176],
  "dandenong north": [-37.959, 145.211], "dandenong south": [-38.017, 145.215], "dandenong": [-37.987, 145.215],
  "keysborough": [-38.003, 145.173], "braeside": [-37.999, 145.115], "mordialloc": [-38.005, 145.087],
  "cheltenham": [-37.967, 145.056], "moorabbin": [-37.937, 145.04], "mentone": [-37.983, 145.065],
  "carrum downs": [-38.096, 145.18], "seaford": [-38.105, 145.129], "frankston": [-38.144, 145.125],
  "bangholme": [-38.042, 145.18], "hallam": [-38.003, 145.27], "lynbrook": [-38.056, 145.256],
  "lyndhurst": [-38.052, 145.239], "cranbourne": [-38.099, 145.283], "narre warren": [-38.027, 145.303],
  "berwick": [-38.035, 145.349], "brunswick": [-37.766, 144.96], "coburg": [-37.744, 144.965],
  "pascoe vale": [-37.727, 144.937], "strathmore": [-37.734, 144.919], "essendon": [-37.752, 144.919],
  "moonee ponds": [-37.765, 144.92], "ascot vale": [-37.779, 144.922], "flemington": [-37.787, 144.93],
  "kensington": [-37.793, 144.93], "parkville": [-37.786, 144.952], "tullamarine": [-37.701, 144.88],
  "airport west": [-37.724, 144.881], "melbourne airport": [-37.669, 144.841], "broadmeadows": [-37.68, 144.919],
  "campbellfield": [-37.683, 144.962], "fawkner": [-37.714, 144.967], "thomastown": [-37.68, 145.015],
  "epping": [-37.65, 145.026], "reservoir": [-37.717, 145.007], "preston": [-37.745, 145.003],
  "northcote": [-37.77, 144.999], "somerton": [-37.642, 144.945], "mernda": [-37.602, 145.099],
  "west footscray": [-37.798, 144.874], "footscray": [-37.8, 144.899], "yarraville": [-37.816, 144.889],
  "seddon": [-37.807, 144.892], "spotswood": [-37.83, 144.885], "altona north": [-37.835, 144.848],
  "altona": [-37.867, 144.83], "brooklyn": [-37.816, 144.847], "sunshine": [-37.788, 144.832],
  "laverton north": [-37.83, 144.79], "laverton": [-37.862, 144.769], "truganina": [-37.816, 144.737],
  "derrimut": [-37.792, 144.77], "williamstown": [-37.863, 144.898], "maribyrnong": [-37.774, 144.889],
  "newport": [-37.844, 144.883], "werribee": [-37.9, 144.66],
};

/** Find a suburb name inside a free-text address. Longest names are tried first ("vermont south" before "vermont"). */
export function suburbFromAddress(address: string): { name: string; point: LatLng } | null {
  const text = " " + address.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ") + " ";
  const names = Object.keys(SUBURBS).sort((a, b) => b.length - a.length);
  for (const name of names) {
    if (text.includes(" " + name + " ")) {
      const [lat, lng] = SUBURBS[name];
      return { name, point: { lat, lng } };
    }
  }
  return null;
}
