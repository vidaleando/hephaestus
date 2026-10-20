import { useState } from "react";
import { fmt, todayISO } from "../lib/lifting";
import { setWeight, suggestedIncrease, trainingMax, WEEK_SETS, type Day, type Lift, type Week } from "../lib/programme";
import type { Entry, NewEntry } from "../lib/types";
import { BackBar } from "./BackBar";

interface Props {
  name: string;
  lift: Lift;
  week: Week;
  day: Day;
  oneRepMax: number;
  existing?: Entry;
  onSave: (entry: NewEntry) => Promise<boolean>;
  onBack: () => void;
}

/** Log a 5/3/1 main lift: made or missed for each of the three sets, plus reps on the last set. */
export function LiftSession({ name, week, day, oneRepMax, existing, onSave, onBack }: Props) {
  const sets = WEEK_SETS[week];
  const [results, setResults] = useState<(boolean | null)[]>(() => existing?.set_results ?? [null, null, null]);
  const [repsDone, setRepsDone] = useState(() => (existing?.amrap_reps != null ? String(existing.amrap_reps) : ""));
  const [saving, setSaving] = useState(false);

  const last = sets[2];
  const lastWeight = setWeight(oneRepMax, last);
  const reps = parseInt(repsDone, 10);
  const increase = reps > 0 ? suggestedIncrease(oneRepMax, week, reps) : 0;
  const complete = results.every((r) => r !== null);

  function mark(i: number, made: boolean) {
    setResults(results.map((r, j) => (j === i ? made : r)));
  }

  async function save() {
    setSaving(true);
    const ok = await onSave({
      exercise: name,
      weight: lastWeight,
      unit: "kg",
      reps: reps > 0 ? reps : last.reps,
      sets: sets.length,
      performed_on: existing?.performed_on ?? todayISO(),
      program_week: week,
      program_day: day,
      set_results: results.map(Boolean),
      amrap_reps: reps >= 0 && repsDone !== "" ? reps : null,
    });
    setSaving(false);
    if (ok) onBack();
  }

  return (
    <section className="view">
      <BackBar label={`Week ${week} · Day ${day}`} onBack={onBack} />
      <div className="session-head">
        <h3>{name}</h3>
        <p className="hint">Training max {fmt(trainingMax(oneRepMax))} kg</p>
      </div>

      <ol className="sets">
        {sets.map((set, i) => {
          const result = results[i];
          return (
            <li key={i} className="set" data-result={result === null ? undefined : result ? "made" : "missed"}>
              <div className="set-info">
                <span className="set-num">
                  Set {i + 1} · {set.percent}%
                </span>
                <span className="set-target">
                  {fmt(setWeight(oneRepMax, set))} kg × {set.reps}
                  {set.amrap ? "+" : ""}
                </span>
              </div>
              <div className="set-actions">
                <button type="button" className="result made" aria-pressed={result === true} onClick={() => mark(i, true)}>
                  Made it
                </button>
                <button
                  type="button"
                  className="result missed"
                  aria-pressed={result === false}
                  onClick={() => mark(i, false)}
                >
                  Missed
                </button>
              </div>
              {set.amrap && result !== null && (
                <label htmlFor="reps-done" className="amrap">
                  Reps done on this set (optional)
                  <input
                    id="reps-done"
                    type="number"
                    inputMode="numeric"
                    min="0"
                    max="100"
                    step="1"
                    placeholder={String(set.reps)}
                    value={repsDone}
                    onChange={(e) => setRepsDone(e.target.value)}
                    onFocus={(e) => e.currentTarget.select()}
                  />
                  {increase > 0 && (
                    <span className="sub">
                      {reps - set.reps} extra reps suggests about +{fmt(increase)} kg on your training max.
                    </span>
                  )}
                </label>
              )}
            </li>
          );
        })}
      </ol>

      <button className="primary" type="button" disabled={!complete || saving} onClick={save}>
        {complete ? (existing ? `Update ${name}` : `Save ${name}`) : "Mark all three sets"}
      </button>
    </section>
  );
}
