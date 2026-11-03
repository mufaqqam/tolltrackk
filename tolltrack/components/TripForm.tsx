"use client";
import { useMemo, useState } from "react";
import { useFormState } from "react-dom";
import { createTrip, updateTrip } from "@/app/actions/trips";
import { SubmitButton } from "./SubmitButton";
import { Icon } from "./Icon";

export type PointOption = { id: number; roadId: number; roadName: string; name: string; km: number; entryDirs: string[]; exitDirs: string[] };

type Suggestion =
  | { kind: "route"; roadName: string; entry: { id: number; name: string }; exit: { id: number; name: string }; confidence: number; needsCheck: boolean; reason: string }
  | { kind: "none"; reason: string };

type Props = {
  mode: "new" | "edit";
  points: PointOption[];
  tollAccount: string;
  trip?: { id: number; jobNumber: string; pickupAddress: string; dropoffAddress: string; entryId: number; exitId: number; needsCheck: boolean; reason: string | null; confidence: number | null };
};

export function TripForm({ mode, points, tollAccount, trip }: Props) {
  const [state, formAction] = useFormState(mode === "new" ? createTrip : updateTrip, undefined);
  const [job, setJob] = useState(trip?.jobNumber ?? "");
  const [pickup, setPickup] = useState(trip?.pickupAddress ?? "");
  const [dropoff, setDropoff] = useState(trip?.dropoffAddress ?? "");
  const [account, setAccount] = useState(tollAccount);
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsMsg, setGpsMsg] = useState<string | null>(null);
  const [entryId, setEntryId] = useState<number | "">(trip?.entryId ?? "");
  const [exitId, setExitId] = useState<number | "">(trip?.exitId ?? "");
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [editing, setEditing] = useState(mode === "edit");
  const [loading, setLoading] = useState(false);

  const roads = useMemo(() => Array.from(new Set(points.map((p) => p.roadName))), [points]);
  const entryPoint = points.find((p) => p.id === entryId);
  const exitOptions = points.filter((p) => entryPoint && p.roadId === entryPoint.roadId && p.id !== entryPoint.id && p.exitDirs.length > 0);

  function locateMe() {
    if (!navigator.geolocation) return setGpsMsg("Location isn't available on this device.");
    setGpsMsg("Finding you…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: Number(pos.coords.latitude.toFixed(5)), lng: Number(pos.coords.longitude.toFixed(5)) };
        setGps(p);
        setGpsMsg("Using current location");
        if (!pickup.trim()) setPickup(`Current location (${p.lat}, ${p.lng})`);
      },
      () => setGpsMsg("Location permission was denied. Type the address instead."),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  async function suggest() {
    setLoading(true);
    setProblem(null);
    setSuggestion(null);
    try {
      const res = await fetch("/api/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pickup, dropoff, pickupLat: gps?.lat, pickupLng: gps?.lng }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      if (data.problem) {
        setProblem(data.problem);
        setEditing(true);
      }
      if (data.suggestion) {
        setSuggestion(data.suggestion);
        if (data.suggestion.kind === "route") {
          setEntryId(data.suggestion.entry.id);
          setExitId(data.suggestion.exit.id);
          setEditing(false);
        } else {
          setEditing(true);
        }
      }
    } catch (e) {
      setProblem(e instanceof Error ? e.message : "Couldn't get a suggestion. Choose the points yourself.");
      setEditing(true);
    } finally {
      setLoading(false);
    }
  }

  const canSuggest = pickup.trim().length >= 3 && dropoff.trim().length >= 3 && !loading;
  const confClass = suggestion?.kind === "route" ? (suggestion.confidence >= 80 ? "mint" : suggestion.confidence >= 70 ? "dark" : "alert") : "dark";

  return (
    <form action={formAction} className="content">
      {mode === "edit" && <input type="hidden" name="tripId" value={trip!.id} />}
      <input type="hidden" name="entryPointId" value={entryId} />
      <input type="hidden" name="exitPointId" value={exitId} />
      <input type="hidden" name="pickupLat" value={gps?.lat ?? ""} />
      <input type="hidden" name="pickupLng" value={gps?.lng ?? ""} />

      {state?.error && <div className="error" role="alert">{state.error}</div>}
      {mode === "edit" && trip?.needsCheck && (
        <div className="alert-card" style={{ alignItems: "flex-start" }}>
          <Icon name="warning" color="var(--alert-ink)" />
          <div className="small"><strong>Please check this trip.</strong><br />{trip.reason ?? "The suggestion was not confident."} Saving confirms the points are right.</div>
        </div>
      )}

      <label className="field">
        <span>Job / customer number</span>
        <input className="input" name="jobNumber" value={job} onChange={(e) => setJob(e.target.value)} required maxLength={30} placeholder="e.g. A-4479" autoCapitalize="characters" />
      </label>

      <label className="field">
        <span>Pickup address</span>
        <input className="input" name="pickupAddress" value={pickup} onChange={(e) => { setPickup(e.target.value); setGps(null); setGpsMsg(null); }} required maxLength={200} placeholder="e.g. 18 Lakeview Dr, Scoresby VIC" />
      </label>
      {mode === "new" && (
        <button type="button" className="chip-btn" onClick={locateMe}>
          <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}><Icon name="gps" size={14} />{gpsMsg ?? "Use my current location"}</span>
        </button>
      )}

      <label className="field">
        <span>Drop-off address</span>
        <input className="input" name="dropoffAddress" value={dropoff} onChange={(e) => setDropoff(e.target.value)} required maxLength={200} placeholder="e.g. 455 Burwood Hwy, Vermont South VIC" />
      </label>

      <label className="field">
        <span>Toll account number</span>
        <input className="input" name="tollAccount" value={account} onChange={(e) => setAccount(e.target.value)} required maxLength={30} />
      </label>

      {mode === "new" && !suggestion && (
        <button type="button" className="btn dark" onClick={suggest} disabled={!canSuggest}>
          <Icon name="sparkle" color="var(--coral)" /> {loading ? "Working out the route…" : "Suggest toll route"}
        </button>
      )}

      {problem && <div className="error" role="status">{problem}</div>}

      {suggestion?.kind === "route" && (
        <section className="ai-card" aria-live="polite">
          <div className="ai-head">
            <span className="t"><Icon name="sparkle" size={18} /> Suggested toll route</span>
            <span className={`pill ${confClass}`}>{suggestion.confidence}% confident</span>
          </div>
          <div className="point"><span className="dot" style={{ background: "#3ddc97" }} /><div><div className="k">ENTRY POINT · {suggestion.roadName.toUpperCase()}</div><div className="v">{points.find((p) => p.id === entryId)?.name ?? suggestion.entry.name}</div></div></div>
          <div className="point"><span className="dot" style={{ background: "var(--coral)" }} /><div><div className="k">EXIT POINT</div><div className="v">{points.find((p) => p.id === exitId)?.name ?? suggestion.exit.name}</div></div></div>
          <div className="why">Why: {suggestion.reason}</div>
          {suggestion.needsCheck && (
            <div className="pill alert" style={{ alignSelf: "flex-start" }}><Icon name="warning" size={14} /> Not sure. This trip will be flagged for you to check.</div>
          )}
          {!editing && (
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" className="btn ghost" onClick={() => setEditing(true)}>Edit</button>
              <SubmitButton pendingText="Saving…">Confirm trip</SubmitButton>
            </div>
          )}
        </section>
      )}

      {suggestion?.kind === "none" && <div className="card small">{suggestion.reason}</div>}

      {editing && (
        <section className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="label">{mode === "edit" ? "Toll points" : "Choose the toll points"}</div>
          <label className="field">
            <span>Entry point</span>
            <select className="input" value={entryId} onChange={(e) => { setEntryId(e.target.value ? Number(e.target.value) : ""); setExitId(""); }} required>
              <option value="">Select where you got on…</option>
              {roads.map((r) => (
                <optgroup key={r} label={r}>
                  {points.filter((p) => p.roadName === r && p.entryDirs.length > 0).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </optgroup>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Exit point</span>
            <select className="input" value={exitId} onChange={(e) => setExitId(e.target.value ? Number(e.target.value) : "")} required disabled={!entryPoint}>
              <option value="">{entryPoint ? "Select where you got off…" : "Choose the entry point first"}</option>
              {exitOptions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <SubmitButton pendingText="Saving…" disabled={!entryId || !exitId}>{mode === "edit" ? "Save and mark as checked" : "Save trip"}</SubmitButton>
        </section>
      )}
    </form>
  );
}
