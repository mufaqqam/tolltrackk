import { requireDriver } from "@/lib/auth";
import { getTollPoints } from "@/lib/data";
import { NavBar } from "@/components/DriverChrome";
import { TripForm } from "@/components/TripForm";

export const dynamic = "force-dynamic";

export default async function NewTrip() {
  const user = await requireDriver();
  const points = await getTollPoints();
  return (
    <main className="phone">
      <NavBar title="Log a toll trip" backHref="/today" />
      <TripForm mode="new" points={points.map(({ lat, lng, ...p }) => p)} tollAccount={user.tollAccount ?? ""} />
    </main>
  );
}
