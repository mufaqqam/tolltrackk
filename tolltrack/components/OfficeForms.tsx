"use client";
import { useFormState } from "react-dom";
import { addDriver, resetPin, uploadStatement } from "@/app/actions/office";
import { SubmitButton } from "./SubmitButton";
import { Icon } from "./Icon";

function Msg({ state }: { state: { error?: string; ok?: string } | undefined }) {
  if (state?.error) return <div className="error" role="alert">{state.error}</div>;
  if (state?.ok) return <div className="notice" role="status">{state.ok}</div>;
  return null;
}

export function UploadStatementForm() {
  const [state, action] = useFormState(uploadStatement, undefined);
  return (
    <form action={action} className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <strong>Upload a toll statement</strong>
      <span className="small muted">CSV export from Linkt with columns Date, Time, Plate, Toll Road, Entry, Exit, Amount. Max 512 KB.</span>
      <Msg state={state} />
      <input className="input" style={{ paddingTop: 12 }} type="file" name="file" accept=".csv,text/csv" required />
      <SubmitButton className="btn dark" pendingText="Matching charges…"><Icon name="upload" size={18} /> Upload and match</SubmitButton>
    </form>
  );
}

export function AddDriverForm() {
  const [state, action] = useFormState(addDriver, undefined);
  return (
    <form action={action} className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <strong>Add a driver</strong>
      <Msg state={state} />
      <div className="inline-form">
        <label className="field"><span>Driver ID</span><input className="input" name="driverNo" inputMode="numeric" required maxLength={6} /></label>
        <label className="field"><span>Name</span><input className="input" name="fullName" required maxLength={80} /></label>
        <label className="field"><span>Truck rego</span><input className="input" name="truckRego" required maxLength={10} /></label>
        <label className="field"><span>Toll account</span><input className="input" name="tollAccount" required maxLength={30} defaultValue="tk-58821" /></label>
        <label className="field"><span>Starting PIN</span><input className="input" name="pin" type="password" inputMode="numeric" required minLength={4} maxLength={6} /></label>
      </div>
      <SubmitButton className="btn dark small" pendingText="Adding…">Add driver</SubmitButton>
    </form>
  );
}

export function ResetPinForm({ userId }: { userId: number }) {
  const [state, action] = useFormState(resetPin, undefined);
  return (
    <form action={action} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <input type="hidden" name="userId" value={userId} />
      <input className="input" style={{ minHeight: 38, width: 110 }} name="pin" type="password" inputMode="numeric" placeholder="New PIN" required minLength={4} maxLength={6} aria-label="New PIN" />
      <SubmitButton className="btn soft small" pendingText="…">Reset PIN</SubmitButton>
      {state?.error && <span className="small" style={{ color: "var(--red)" }}>{state.error}</span>}
      {state?.ok && <span className="small" style={{ color: "var(--green)" }}>{state.ok}</span>}
    </form>
  );
}
