import { useState } from "react";
import { cleanNotes, fmt, todayISO } from "../lib/lifting";
import {
  DELOAD,
  setsFor,
  setWeight,
  suggestedIncrease,
  trainingMax,
  weekLabel,
  type Day,
  type Lift,
  type ProgrammeWeek,
} from "../lib/programme";
import type { Entry, NewEntry } from "../lib/types";
import { BackBar } from "./BackBar";
import { NotesField, PreviousNote } from "./NotesField";

interface Props {
  name: string;
  lift: Lift;
  week: ProgrammeWeek;
  day: Day;
  oneRepMax: number;
  existing?: Entry;
  /** The last note on this lift, shown above the notes box. */
  lastNote?: Entry;
  onSave: (entry: NewEntry) => Promise<boolean>;
  onBack: () => void;
}

/**
 * Log a 5/3/1 main lift: made or missed for each set, and reps done on the + set when the
 * week has one (the deload week doesn't).
 */
export function LiftSession({ name, week, day, oneRepMax, existing, lastNote, onSave, onBack }: Props) {
  const sets = setsFor(week);
  const plus = sets.find((s) => s.amrap);
  const fixedCount = sets.filter((s) => !s.amrap).length;

  const [results, setResults] = useState<(boolean | null)[]>(() =>
    existing?.set_results ? existing.set_results.slice(0, fixedCount) : Array(fixedCount).fill(null),
  );
  const [repsDone, setRepsDone] = useState(() => (existing?.amrap_reps != null ? String(existing.amrap_reps) : ""));
  const [notes, setNotes] = useState(() => existing?.notes ?? "");
  const [saving, setSaving] = useState(false);

  const last = sets[sets.length - 1];
  const lastWeight = setWeight(oneRepMax, last);
  const reps = parseInt(repsDone, 10);
  const hasReps = reps >= 0;
  const increase = plus && week !== DELOAD && reps > 0 ? suggestedIncrease(oneRepMax, week, reps) : 0;
  const setsMarked = results.every((r) => r !== null);
  const complete = setsMarked && (!plus || hasReps);

  function mark(i: number, made: boolean) {
    setResults(results.map((r, j) => (j === i ? made : r)));
  }

  function step(delta: number) {
    if (!plus) return;
    const from = hasReps ? reps : delta > 0 ? plus.reps - 1 : plus.reps + 1;
    setRepsDone(String(Math.min(100, Math.max(0, from + delta))));
  }

  async function save() {
    setSaving(true);
    const ok = await onSave({
      exercise: name,
      weight: lastWeight,
      unit: "kg",
      reps: plus && reps > 0 ? reps : last.reps,
      sets: sets.length,
      performed_on: existing?.performed_on ?? todayISO(),
      program_week: week,
      program_day: day,
      set_results: plus ? [...results.map(Boolean), reps >= plus.reps] : results.map(Boolean),
      amrap_reps: plus ? reps : null,
      notes: cleanNotes(notes),
    });
    setSaving(false);
    if (ok) onBack();
  }

  const buttonLabel = complete
    ? existing
      ? `Update ${name}`
      : `Save ${name}`
    : !setsMarked
      ? fixedCount === 1
        ? "Mark set 1"
        : `Mark sets ${Array.from({ length: fixedCount }, (_, i) => i + 1).join(" and ")}`
      : "Enter reps on the + set";

  return (
    <section className="view">
      <BackBar label={`${weekLabel(week)} · Day ${day}`} onBack={onBack} />
      <div className="session-head">
        <h3>{name}</h3>
        <p className="hint">
          Training max {fmt(trainingMax(oneRepMax))} kg{week === DELOAD ? " · deload: half the sets and reps" : ""}
        </p>
      </div>
      {lastNote && <PreviousNote entry={lastNote} />}

      <ol className="sets">
        {sets.map((set, i) => {
          const result = set.amrap ? (hasReps ? reps >= set.reps : null) : results[i];
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
              {set.amrap ? (
                <div className="amrap">
                  <label htmlFor="reps-done">Reps done (as many as you can, at least {set.reps})</label>
                  <div className="stepper">
                    <button type="button" aria-label="One rep fewer" onClick={() => step(-1)}>
                      −
                    </button>
                    <input
                      id="reps-done"
                      type="number"
                      inputMode="numeric"
                      min="0"
                      max="100"
                      step="1"
                      placeholder="–"
                      value={repsDone}
                      onChange={(e) => setRepsDone(e.target.value)}
                      onFocus={(e) => e.currentTarget.select()}
                    />
                    <button type="button" aria-label="One rep more" onClick={() => step(1)}>
                      +
                    </button>
                  </div>
                  {hasReps && (
                    <span className="sub">
                      {reps < set.reps
                        ? `Short of the ${set.reps} minimum, so this set counts as missed.`
                        : increase > 0
                          ? `${reps - set.reps} extra ${reps - set.reps === 1 ? "rep" : "reps"} suggests about +${fmt(increase)} kg on your training max.`
                          : "Minimum reached."}
                    </span>
                  )}
                </div>
              ) : (
                <div className="set-actions">
                  <button
                    type="button"
                    className="result made"
                    aria-pressed={result === true}
                    onClick={() => mark(i, true)}
                  >
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
              )}
            </li>
          );
        })}
      </ol>

      <NotesField id="lift-notes" value={notes} onChange={setNotes} />

      <button className="primary" type="button" disabled={!complete || saving} onClick={save}>
        {buttonLabel}
      </button>
    </section>
  );
}
