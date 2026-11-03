import { describe, expect, test } from "vitest";
import { suggestRoute, CHECK_THRESHOLD } from "@/lib/suggest";
import { loadTollPoints } from "@/lib/tollData";
import { SUBURBS, suburbFromAddress, distanceKm } from "@/lib/geo";

const points = loadTollPoints();
const at = (name: string) => ({ lat: SUBURBS[name][0], lng: SUBURBS[name][1] });
const route = (a: string, b: string) => {
  const r = suggestRoute(at(a), at(b), points);
  if (r.kind !== "route") throw new Error(`expected a route for ${a} -> ${b}: ${r.reason}`);
  return r;
};

describe("suggestion engine (hand-checked Melbourne trips)", () => {
  test("Airport West -> Port Melbourne uses CityLink south-east to Bolte Bridge", () => {
    const r = route("airport west", "port melbourne");
    expect(r.roadName).toBe("CityLink");
    expect(r.entry.name).toMatch(/^Tullamarine Fwy/);
    expect(r.exit.name).toMatch(/^Bolte Bridge/);
    expect(r.confidence).toBeGreaterThanOrEqual(CHECK_THRESHOLD);
  });

  test("regression (vibe log #1): Fawkner -> Kooyong exits at Monash Fwy / Toorak Rd", () => {
    const r = route("fawkner", "kooyong");
    expect(r.exit.name).toBe("Monash Fwy / Toorak Rd");
  });

  test("Glen Waverley -> Seaford runs south on EastLink", () => {
    const r = route("glen waverley", "seaford");
    expect(r.roadName).toBe("EastLink");
    expect(r.exit.km).toBeGreaterThan(r.entry.km);
  });

  test("Dandenong South -> Ringwood runs north on EastLink", () => {
    const r = route("dandenong south", "ringwood");
    expect(r.roadName).toBe("EastLink");
    expect(r.exit.km).toBeLessThan(r.entry.km);
  });

  test("short local trip (Carlton -> Fitzroy) suggests no toll road", () => {
    expect(suggestRoute(at("carlton"), at("fitzroy"), points).kind).toBe("none");
  });

  test("every suggestion respects one-way ramps (entry and exit legal in the travel direction)", () => {
    const names = Object.keys(SUBURBS);
    let checked = 0;
    for (let i = 0; i < names.length; i += 3) {
      for (let j = 1; j < names.length; j += 7) {
        const r = suggestRoute(at(names[i]), at(names[j]), points);
        if (r.kind !== "route") continue;
        const dir = r.exit.km > r.entry.km ? "inc" : "dec";
        expect(r.entry.entryDirs).toContain(dir);
        expect(r.exit.exitDirs).toContain(dir);
        expect(r.entry.roadId).toBe(r.exit.roadId);
        expect(r.confidence).toBeGreaterThanOrEqual(30);
        expect(r.confidence).toBeLessThanOrEqual(97);
        expect(r.needsCheck).toBe(r.confidence < CHECK_THRESHOLD);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(50);
  });
});

describe("geo helpers", () => {
  test("finds the longest suburb name in an address", () => {
    expect(suburbFromAddress("455 Burwood Hwy, Vermont South VIC 3133")?.name).toBe("vermont south");
    expect(suburbFromAddress("12 Smith St, Atlantis")).toBeNull();
  });
  test("distance Melbourne CBD -> Frankston is about 40 km", () => {
    expect(distanceKm(at("melbourne"), at("frankston"))).toBeGreaterThan(35);
    expect(distanceKm(at("melbourne"), at("frankston"))).toBeLessThan(45);
  });
});
