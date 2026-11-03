import type { TripRow } from "@/lib/data";
import { auDate } from "@/lib/time";

/** Same columns as the paper runsheet the office already uses. */
export function RunsheetTable({ trips }: { trips: TripRow[] }) {
  return (
    <div className="table-wrap">
      <table className="sheet">
        <thead><tr><th>DATE</th><th>ACCT</th><th>JOB</th><th>ENTRY</th><th>EXIT</th></tr></thead>
        <tbody>
          {trips.map((t) => (
            <tr key={t.id}>
              <td className="nowrap">{auDate(t.tripDate).slice(0, 5)}</td>
              <td className="nowrap">{t.tollAccount}</td>
              <td className="nowrap">{t.jobNumber}</td>
              <td><span className="muted">{t.roadName}</span><br />{t.entryName}</td>
              <td>{t.exitName}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
