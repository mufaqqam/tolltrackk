"use client";
import { useFormState } from "react-dom";
import { loginDriver } from "@/app/actions/auth";
import { SubmitButton } from "./SubmitButton";

export function DriverLoginForm() {
  const [state, action] = useFormState(loginDriver, undefined);
  return (
    <form action={action} className="content" style={{ gap: 16 }}>
      {state?.error && <div className="error" role="alert">{state.error}</div>}
      <label className="field">
        <span>Driver ID</span>
        <input className="input" name="driverNo" inputMode="numeric" autoComplete="username" required maxLength={6} placeholder="e.g. 104" />
      </label>
      <label className="field">
        <span>PIN</span>
        <input className="input" name="pin" type="password" inputMode="numeric" autoComplete="current-password" required minLength={4} maxLength={6} placeholder="4 to 6 digits" />
      </label>
      <p className="small muted" style={{ margin: 0, textAlign: "right" }}>Forgot your PIN? Ask the office to reset it.</p>
      <SubmitButton pendingText="Signing in…">Sign in</SubmitButton>
    </form>
  );
}
