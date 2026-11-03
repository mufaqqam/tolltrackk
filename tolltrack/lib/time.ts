/** The business runs on Melbourne time, whatever timezone the server is in. */
export const TZ = "Australia/Melbourne";

/** Today's date in Melbourne as YYYY-MM-DD. */
export function melbourneToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** YYYY-MM-DD -> DD/MM/YYYY (the format used on the paper runsheet). */
export function auDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

/** YYYY-MM-DD -> "Mon 02/11/2026" */
export function dayLabel(iso: string): string {
  const d = new Date(iso + "T12:00:00Z");
  const wd = new Intl.DateTimeFormat("en-AU", { weekday: "short", timeZone: "UTC" }).format(d);
  return `${wd} ${auDate(iso)}`;
}

/** Time of a timestamp in Melbourne, e.g. "7:52 am". */
export function melbourneTime(ts: Date | string): string {
  return new Intl.DateTimeFormat("en-AU", { timeZone: TZ, hour: "numeric", minute: "2-digit" }).format(new Date(ts));
}
