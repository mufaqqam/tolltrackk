import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { DriverLoginForm } from "@/components/DriverLoginForm";
import { Icon, Logo } from "@/components/Icon";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const u = await currentUser();
  if (u) redirect(u.role === "admin" ? "/office" : "/today");
  return (
    <main className="phone">
      <section className="hero">
        <Logo size={56} />
        <h1>TollTrack</h1>
        <p className="sub" style={{ fontSize: 16, margin: 0 }}>Log every toll in seconds.<br />Never lose a charge again.</p>
      </section>
      <DriverLoginForm />
      <div className="actions">
        <Link href="/office/login" className="btn outline">Office sign in</Link>
        <div className="demo"><strong>Demo accounts:</strong> Driver 104, PIN 2580 · Driver 117, PIN 1357. All data is made up for this MVP.</div>
        <div className="privacy">
          <Icon name="shield" size={20} />
          <span>Your location is only used while you log a trip, is never tracked in the background, and is never shared outside your company.</span>
        </div>
      </div>
    </main>
  );
}
