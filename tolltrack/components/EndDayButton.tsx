"use client";
import { useFormState } from "react-dom";
import { submitDay } from "@/app/actions/trips";
import { SubmitButton } from "./SubmitButton";

export function EndDayButton({ disabled, label }: { disabled: boolean; label: string }) {
  const [state, action] = useFormState(submitDay, undefined);
  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {state?.error && <div className="error" role="alert">{state.error}</div>}
      <SubmitButton className="btn dark" pendingText="Sending runsheet…" disabled={disabled}>{label}</SubmitButton>
    </form>
  );
}
