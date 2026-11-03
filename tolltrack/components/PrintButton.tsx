"use client";
import { Icon } from "./Icon";

export function PrintButton() {
  return (
    <button type="button" className="btn soft" onClick={() => window.print()}>
      <Icon name="download" size={18} /> PDF
    </button>
  );
}
