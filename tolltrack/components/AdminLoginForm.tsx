"use client";
import { useFormState } from "react-dom";
import { loginAdmin } from "@/app/actions/auth";
import { SubmitButton } from "./SubmitButton";

export function AdminLoginForm() {
  const [state, action] = useFormState(loginAdmin, undefined);
  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {state?.error && <div className="error" role="alert">{state.error}</div>}
      <label className="field">
        <span>Work email</span>
        <input className="input" name="email" type="email" autoComplete="username" required />
      </label>
      <label className="field">
        <span>Password</span>
        <input className="input" name="password" type="password" autoComplete="current-password" required minLength={8} />
      </label>
      <SubmitButton className="btn dark" pendingText="Signing in…">Sign in to the office portal</SubmitButton>
    </form>
  );
}
