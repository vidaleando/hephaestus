import { useState } from "react";
import { fmt, fmtSigned } from "../lib/lifting";
import {
  cyclePlusSets,
  cycleSuggestion,
  LIFT_NAMES,
  LIFTS,
  maxAfterIncrease,
  trainingMax,
  type Lift,
  type TrainingMaxes,
} from "../lib/programme";
import type { Entry } from "../lib/types";
import { BackBar } from "./BackBar";

type Pick = "low" | "average" | "high" | "custom";

interface Props {
  entries: Entry[];
  maxes: TrainingMaxes;
  cycle: number;
  /** All nine sessions logged. Starting early is allowed, with a note. */
  complete: boolean;
  onStart: (maxes: TrainingMaxes) => Promise<boolean>;
  onBack: () => void;
}

/** Choose each lift's training max change from this cycle's + sets, then begin the next cycle. */
export function CycleStart({ entries, maxes, cycle, complete, onStart, onBack }: Props) {
  const lifts = LIFTS.filter((l) => maxes[l] != null);
  const suggestions = Object.fromEntries(
    lifts.map((l) => [l, cycleSuggestion(maxes[l]!, cyclePlusSets(entries, cycle, l))]),
  ) as Record<Lift, ReturnType<typeof cycleSuggestion>>;

  const [picks, setPicks] = useState<Record<Lift, Pick>>(
    () => Object.fromEntries(lifts.map((l) => [l, suggestions[l] ? "average" : "custom"])) as Record<Lift, Pick>,
  );
  const [custom, setCustom] = useState<Record<Lift, string>>(
    () => Object.fromEntries(lifts.map((l) => [l, "0"])) as Record<Lift, string>,
  );
  const [saving, setSaving] = useState(false);

  const increaseFor = (lift: Lift): number => {
    const pick = picks[lift];
    const s = suggestions[lift];
    if (pick === "custom" || !s) return parseFloat(custom[lift]) || 0;
    return s[pick];
  };

  async function start() {
    setSaving(true);
    const next = { ...maxes };
    for (const lift of lifts) next[lift] = maxAfterIncrease(maxes[lift]!, increaseFor(lift));
    const ok = await onStart(next);
    setSaving(false);
    if (ok) onBack();
  }

  return (
    <section className="view">
      <BackBar label="Programme" onBack={onBack} />
      <div className="session-head">
        <h3>Start cycle {cycle + 1}</h3>
        <p className="hint">
          {complete
            ? `Cycle ${cycle} is done. Pick how much to raise each training max, based on your + sets.`
            : `Cycle ${cycle} isn't finished yet. You can still start the next one; unlogged sessions stay unlogged.`}
        </p>
      </div>

      {lifts.length === 0 && <p className="hint">Add your 1-rep maxes first so there's something to raise.</p>}

      {lifts.map((lift) => {
        const max = maxes[lift]!;
        const s = suggestions[lift];
        const inc = increaseFor(lift);
        const newMax = maxAfterIncrease(max, inc);
        const options: { pick: Pick; label: string; value?: number }[] = s
          ? [
              { pick: "low", label: "Low", value: s.low },
              { pick: "average", label: "Average", value: s.average },
              { pick: "high", label: "High", value: s.high },
              { pick: "custom", label: "Own" },
            ]
          : [{ pick: "custom", label: "Own" }];
        return (
          <div className="panel cycle-lift" key={lift}>
            <div className="cycle-lift-head">
              <h2>{LIFT_NAMES[lift]}</h2>
              <span className="sub">
                {s
                  ? `From ${s.weeks.map((w) => `Week ${w.week} (${w.reps} reps)`).join(", ")}`
                  : "No + sets logged this cycle"}
              </span>
            </div>
            <div className="seg picks" role="group" aria-label={`${LIFT_NAMES[lift]} increase`} style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
              {options.map((o) => (
                <button
                  key={o.pick}
                  type="button"
                  aria-pressed={picks[lift] === o.pick}
                  onClick={() => setPicks({ ...picks, [lift]: o.pick })}
                >
                  <span className="seg-label">{o.label}</span>
                  {o.value !== undefined && <span className="seg-hint">{fmtSigned(o.value)} kg</span>}
                </button>
              ))}
            </div>
            {(picks[lift] === "custom" || !s) && (
              <label htmlFor={`inc-${lift}`}>
                Training max change (kg)
                <input
                  id={`inc-${lift}`}
                  type="number"
                  inputMode="decimal"
                  step="2.5"
                  value={custom[lift]}
                  onChange={(e) => setCustom({ ...custom, [lift]: e.target.value })}
                  onFocus={(e) => e.currentTarget.select()}
                />
              </label>
            )}
            <p className="cycle-change">
              Training max {fmt(trainingMax(max))} → <b>{fmt(trainingMax(newMax))} kg</b>
              <span className="sub"> · 1-rep max {fmt(max)} → {fmt(newMax)} kg</span>
            </p>
          </div>
        );
      })}

      <button className="primary" type="button" disabled={saving || lifts.length === 0} onClick={start}>
        Start cycle {cycle + 1}
      </button>
    </section>
  );
}
