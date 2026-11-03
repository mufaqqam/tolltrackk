// End-to-end test of the full TollTrack workflow in a real browser (Playwright).
// Usage: BASE=http://localhost:3000 SHOTS=./shots node tests/e2e/run.mjs
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.BASE ?? "http://localhost:3000";
const SHOTS = process.env.SHOTS ?? "./shots";
fs.mkdirSync(SHOTS, { recursive: true });
const results = [];
const check = (name, ok, extra = "") => { results.push({ name, ok }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? "  — " + extra : ""}`); };

const browser = await chromium.launch();
const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, geolocation: { latitude: -37.9001, longitude: 145.2281 }, permissions: ["geolocation"] });
const p = await phone.newPage();
const shot = (page, name) => page.screenshot({ path: path.join(SHOTS, name + ".png"), fullPage: true });

// 1. Sign-in
await p.goto(BASE + "/login");
await shot(p, "01-login");
await p.fill('input[name="driverNo"]', "104");
await p.fill('input[name="pin"]', "9999");
await p.click('button[type="submit"]');
await p.waitForSelector(".error");
check("Wrong PIN is rejected", (await p.textContent(".error")).includes("incorrect"));
await p.fill('input[name="pin"]', "2580");
await p.click('button[type="submit"]');
await p.waitForURL("**/today");
check("Driver signs in and lands on Today", p.url().endsWith("/today"));
await shot(p, "02-today");

// 2. Log a trip with the suggestion engine
await p.click("text=Add toll trip");
await p.waitForURL("**/trips/new");
await p.fill('input[name="jobNumber"]', "A-4479");
await p.fill('input[name="pickupAddress"]', "18 Lakeview Dr, Scoresby VIC");
await p.fill('input[name="dropoffAddress"]', "455 Burwood Hwy, Vermont South VIC");
await shot(p, "03-log-trip-form");
await p.click("text=Suggest toll route");
await p.waitForSelector(".ai-card", { timeout: 15000 });
const card = await p.textContent(".ai-card");
check("Suggestion shows EastLink entry/exit with confidence", card.includes("EASTLINK") && /\d+% confident/.test(card), card.replace(/\s+/g, " ").slice(0, 140));
await shot(p, "04-suggestion");
await p.click("text=Confirm trip");
await p.waitForURL("**/today?added=*");
check("Trip saved and shown on Today", (await p.textContent("main")).includes("A-4479"));
await shot(p, "05-today-after-add");

// 3. Validation: a job number with SQL/script characters is refused
await p.goto(BASE + "/trips/new");
await p.fill('input[name="jobNumber"]', "'; drop table trips;--");
await p.fill('input[name="pickupAddress"]', "Footscray VIC");
await p.fill('input[name="dropoffAddress"]', "Richmond VIC");
await p.click("text=Suggest toll route");
await p.waitForSelector(".ai-card, .card.small", { timeout: 15000 });
if (await p.isVisible("text=Confirm trip")) await p.click("text=Confirm trip");
await p.waitForSelector(".error");
check("Malicious job number rejected by server validation", (await p.textContent(".error")).includes("Job number can only use"));

// 4. Review, fix the flagged trip, end the day
await p.goto(BASE + "/review");
await shot(p, "06-review-flagged");
const endBtn = p.locator("form button[type=submit]").last();
check("End day is blocked while a trip needs checking", await endBtn.isDisabled());
// Open each flagged trip; on the CityLink one, change the exit (driver correction), then confirm.
let n = 0;
while (await p.locator(".trip:has(.flag)").count()) {
  await p.locator(".trip:has(.flag)").first().click();
  await p.waitForURL("**/trips/*");
  if (n++ === 0) await shot(p, "07-edit-flagged-trip");
  if ((await p.textContent("select >> nth=0")).includes("Burnley Tunnel") && (await p.inputValue("select >> nth=0")) === "108") {
    await p.selectOption("select >> nth=1", { label: "Monash Fwy / Toorak Rd" });
  }
  await p.click("text=Save and mark as checked");
  await p.waitForURL("**/review?saved=1");
}
check("Flag cleared after driver checks the trip", (await p.locator(".stat .n").nth(2).textContent()) === "0");
await shot(p, "08-review-ready");
await p.click("text=End work day");
await p.waitForURL("**/runsheets/*?sent=1");
check("Runsheet submitted to office", (await p.textContent("h1")).includes("Runsheet sent"));
await shot(p, "09-runsheet-sent");
const csvRes = await p.request.get(p.url().replace(/\/runsheets\/(\d+).*/, "/api/export/runsheet/$1"));
const csv = await csvRes.text();
check("Runsheet CSV download works", csvRes.ok() && csv.includes("A-4479"));

// 5. Access control
const t117 = await p.goto(BASE + "/trips/7");
check("Driver can't open another driver's trip (404)", t117.status() === 404);
await p.goto(BASE + "/office");
check("Driver is redirected away from the office portal", p.url().endsWith("/today"));
const anon = await browser.newContext();
const ap = await anon.newPage();
const apiRes = await ap.request.post(BASE + "/api/suggest", { data: { pickup: "Scoresby", dropoff: "Ringwood" } });
check("Suggestion API refuses signed-out requests (401)", apiRes.status() === 401);
const sample = await ap.request.get(BASE + "/api/sample-statement");
check("Office export refuses signed-out requests (401)", sample.status() === 401);

// 6. Office: statement upload and matching
const desk = await browser.newContext({ viewport: { width: 1280, height: 860 }, deviceScaleFactor: 2 });
const o = await desk.newPage();
await o.goto(BASE + "/office/login");
await shot(o, "10-office-login");
await o.fill('input[name="email"]', "office@tolltrack.app");
await o.fill('input[name="password"]', "TollTrack-Demo-2026");
await o.click('button[type="submit"]');
await o.waitForURL("**/office");
await shot(o, "11-office-dashboard");
await o.click("text=View >> nth=0");
await o.waitForURL("**/office/runsheets/*");
await shot(o, "12-office-runsheet");
await o.goto(BASE + "/office/statements");
const sampleCsv = await (await o.request.get(BASE + "/api/sample-statement")).text();
const samplePath = path.join(SHOTS, "sample-linkt-statement.csv");
fs.writeFileSync(samplePath, sampleCsv);
await shot(o, "13-office-statements");
await o.setInputFiles('input[type="file"]', samplePath);
await o.click("text=Upload and match");
await o.waitForURL("**/office/statements/*");
const body = await o.textContent("main");
check("Statement matched: shows matched, to-check and no-trip charges", body.includes("Matched") && body.includes("No trip") && body.includes("Check"));
await shot(o, "14-statement-results");
const bad = path.join(SHOTS, "bad.csv");
fs.writeFileSync(bad, "Date,Plate,Amount\n32/13/2026,ABC,=1+1\n");
await o.goto(BASE + "/office/statements");
await o.setInputFiles('input[type="file"]', bad);
await o.click("text=Upload and match");
await o.waitForSelector(".error");
check("Malformed statement rejected with a clear message", (await o.textContent(".error")).includes("Missing column"));
await o.goto(BASE + "/office/drivers");
await shot(o, "15-office-drivers");
await o.goto(BASE + "/office/activity");
await shot(o, "16-office-activity");

await browser.close();
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
