import { useEffect, useState } from "react";
import { convert, fmt } from "../lib/lifting";
import { weekLabel } from "../lib/programme";
import type { Entry, Unit } from "../lib/types";

interface Props {
  entries: Entry[];
  unit: Unit;
  prs: Set<string>;
  onRemove: (id: string) => void;
}

export function EntryList({ entries, unit, prs, onRemove }: Props) {
  return (
    <div className="list">
      {entries.map((e) => (
        <EntryRow key={e.id} entry={e} unit={unit} isPR={prs.has(e.id)} onRemove={onRemove} />
      ))}
    </div>
  );
}

function EntryRow({ entry, unit, isPR, onRemove }: { entry: Entry; unit: Unit; isPR: boolean; onRemove: (id: string) => void }) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);

  const weight = entry.weight ? `${fmt(convert(entry.weight, entry.unit, unit))} ${unit}` : "Bodyweight";

  return (
    <div className="row">
      <div className="main">
        <div className="ex">
          {entry.exercise}
          {isPR && <span className="pr-tag">PR</span>}
        </div>
        <div className="nums">
          {entry.set_results && entry.amrap_reps != null ? (
            <>
              + set {weight} × {entry.amrap_reps} · {entry.set_results.filter(Boolean).length}/
              {entry.set_results.length} sets made{entry.program_week ? ` · ${weekLabel(entry.program_week)}` : ""}
            </>
          ) : entry.set_results ? (
            <>
              {weight} × {entry.reps} · {entry.set_results.filter(Boolean).length}/{entry.set_results.length} sets made
              {entry.program_week ? ` · ${weekLabel(entry.program_week)}` : ""}
            </>
          ) : (
            <>
              {weight} × {entry.reps} reps × {entry.sets} {entry.sets === 1 ? "set" : "sets"}
            </>
          )}
        </div>
      </div>
      <button
        type="button"
        className="del"
        data-armed={armed || undefined}
        onClick={() => (armed ? onRemove(entry.id) : setArmed(true))}
      >
        {armed ? "Confirm" : "Delete"}
      </button>
    </div>
  );
}
