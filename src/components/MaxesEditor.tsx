import { useState, type FormEvent } from "react";
import { fmt } from "../lib/lifting";
import { LIFT_NAMES, LIFTS, trainingMax, TRAINING_MAX_RATIO, type TrainingMaxes } from "../lib/programme";
import { BackBar } from "./BackBar";

interface Props {
  maxes: TrainingMaxes;
  onSave: (maxes: TrainingMaxes) => Promise<boolean>;
  onBack: () => void;
}

export function MaxesEditor({ maxes, onSave, onBack }: Props) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(LIFTS.map((l) => [l, maxes[l] == null ? "" : String(maxes[l])])),
  );

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    const next = { ...maxes };
    for (const lift of LIFTS) {
      const n = parseFloat(values[lift]);
      next[lift] = n > 0 ? n : null;
    }
    if (await onSave(next)) onBack();
  }

  return (
    <section className="view">
      <BackBar label="Programme" onBack={onBack} />
      <form className="panel" onSubmit={submit} autoComplete="off">
        <div>
          <h2>Your 1-rep maxes</h2>
          <p className="hint">
            Weights in the programme use a training max of {Math.round(TRAINING_MAX_RATIO * 100)}% of these, rounded
            to 2.5 kg.
          </p>
        </div>
        <div className="maxes-grid">
          {LIFTS.map((lift) => {
            const n = parseFloat(values[lift]);
            return (
              <label key={lift} htmlFor={`max-${lift}`}>
                {LIFT_NAMES[lift]} (kg)
                <input
                  id={`max-${lift}`}
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  min="0"
                  value={values[lift]}
                  onChange={(e) => setValues({ ...values, [lift]: e.target.value })}
                />
                <span className="sub">{n > 0 ? `Training max ${fmt(trainingMax(n))} kg` : " "}</span>
              </label>
            );
          })}
        </div>
        <button className="primary" type="submit">
          Save maxes
        </button>
      </form>
    </section>
  );
}
