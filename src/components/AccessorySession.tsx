import { useState, type FormEvent } from "react";
import { todayISO } from "../lib/lifting";
import type { Day, Week } from "../lib/programme";
import type { Entry, NewEntry } from "../lib/types";
import { BackBar } from "./BackBar";

interface Props {
  name: string;
  reps: number;
  sets: number;
  /** kg; 0 is bodyweight */
  weight: number;
  week: Week;
  day: Day;
  existing?: Entry;
  onSave: (entry: NewEntry) => Promise<boolean>;
  onBack: () => void;
}

/** Log a fixed-prescription exercise, pre-filled from the programme. */
export function AccessorySession({ name, reps, sets, weight, week, day, existing, onSave, onBack }: Props) {
  const [w, setW] = useState(() => String(existing?.weight ?? weight));
  const [r, setR] = useState(() => String(existing?.reps ?? reps));
  const [s, setS] = useState(() => String(existing?.sets ?? sets));
  const [saving, setSaving] = useState(false);

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    const repsN = parseInt(r, 10);
    const setsN = parseInt(s, 10);
    if (!(repsN > 0) || !(setsN > 0)) return;
    setSaving(true);
    const ok = await onSave({
      exercise: name,
      weight: parseFloat(w) || 0,
      unit: "kg",
      reps: repsN,
      sets: setsN,
      performed_on: existing?.performed_on ?? todayISO(),
      program_week: week,
      program_day: day,
      set_results: null,
      amrap_reps: null,
    });
    setSaving(false);
    if (ok) onBack();
  }

  const select = (e: React.FocusEvent<HTMLInputElement>) => e.currentTarget.select();

  return (
    <section className="view">
      <BackBar label={`Week ${week} · Day ${day}`} onBack={onBack} />
      <div className="session-head">
        <h3>{name}</h3>
        <p className="hint">
          Programme: {reps} × {sets} {weight ? `@ ${weight} kg` : "· bodyweight"}
        </p>
      </div>
      <form className="panel" onSubmit={submit} autoComplete="off">
        <div className="grid3">
          <label htmlFor="acc-w">
            Weight (kg)
            <input
              id="acc-w"
              type="number"
              inputMode="decimal"
              step="0.5"
              min="0"
              value={w}
              placeholder="0 = bodyweight"
              onChange={(e) => setW(e.target.value)}
              onFocus={select}
            />
          </label>
          <label htmlFor="acc-r">
            Reps
            <input
              id="acc-r"
              type="number"
              inputMode="numeric"
              min="1"
              required
              value={r}
              onChange={(e) => setR(e.target.value)}
              onFocus={select}
            />
          </label>
          <label htmlFor="acc-s">
            Sets
            <input
              id="acc-s"
              type="number"
              inputMode="numeric"
              min="1"
              required
              value={s}
              onChange={(e) => setS(e.target.value)}
              onFocus={select}
            />
          </label>
        </div>
        <button className="primary" type="submit" disabled={saving}>
          {existing ? `Update ${name}` : `Save ${name}`}
        </button>
      </form>
    </section>
  );
}
