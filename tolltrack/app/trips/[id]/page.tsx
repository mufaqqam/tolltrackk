import { notFound } from "next/navigation";
import { requireDriver } from "@/lib/auth";
import { driverTrip, getTollPoints } from "@/lib/data";
import { deleteTrip } from "@/app/actions/trips";
import { NavBar } from "@/components/DriverChrome";
import { TripForm } from "@/components/TripForm";
import { Icon } from "@/components/Icon";

export const dynamic = "force-dynamic";

export default async function EditTrip({ params }: { params: { id: string } }) {
  const user = await requireDriver();
  const id = Number(params.id);
  if (!Number.isInteger(id)) notFound();
  const trip = await driverTrip(user.id, id); // only finds the signed-in driver's own trips
  if (!trip) notFound();
  if (trip.runsheetId) {
    return (
      <main className="phone">
        <NavBar title={`Job ${trip.jobNumber}`} backHref="/today" />
        <div className="content"><div className="card">This trip is on a submitted runsheet and is locked. Ask the office if it needs changing.</div></div>
      </main>
    );
  }
  const points = await getTollPoints();
  return (
    <main className="phone">
      <NavBar title={`Edit job ${trip.jobNumber}`} backHref="/review" />
      <TripForm
        mode="edit"
        points={points.map(({ lat, lng, ...p }) => p)}
        tollAccount={trip.tollAccount}
        trip={{ id: trip.id, jobNumber: trip.jobNumber, pickupAddress: trip.pickupAddress, dropoffAddress: trip.dropoffAddress, entryId: trip.entryId, exitId: trip.exitId, needsCheck: trip.needsCheck, reason: trip.reason, confidence: trip.confidence }}
      />
      <form action={deleteTrip} className="actions">
        <input type="hidden" name="tripId" value={trip.id} />
        <button className="btn soft" style={{ color: "var(--red)" }}><Icon name="trash" size={18} /> Delete this trip</button>
      </form>
    </main>
  );
}
