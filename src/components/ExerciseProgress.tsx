import { useMemo, useState } from "react";
import { convert, estimated1RM, exerciseNames, fmt, sameExercise } from "../lib/lifting";
import type { Entry, Unit } from "../lib/types";
import { EmptyState } from "./EmptyState";
import { Stat } from "./Stat";
import { TrendChart } from "./TrendChart";

export function ExerciseProgress({ entries, unit }: { entries: Entry[]; unit: Unit }) {
  const names = useMemo(() => exerciseNames(entries), [entries]);
  const [picked, setPicked] = useState("");
  const current = names.find((n) => n === picked) ?? names[0];

  const stats = useMemo(() => {
    if (!current) return null;
    const byDay = new Map<string, number>();
    let heaviest = 0;
    let best1RM = 0;
    for (const e of entries) {
      if (!sameExercise(e.exercise, current)) continue;
      const w = convert(e.weight, e.unit, unit);
      heaviest = Math.max(heaviest, w);
      best1RM = Math.max(best1RM, estimated1RM(w, e.reps));
      byDay.set(e.performed_on, Math.max(byDay.get(e.performed_on) ?? 0, w));
    }
    const points = [...byDay].sort((a, b) => (a[0] < b[0] ? -1 : 1));
    return { heaviest, best1RM, points };
  }, [entries, current, unit]);

  return (
    <>
      <label htmlFor="pex">
        Exercise
        <select id="pex" value={current ?? ""} disabled={!names.length} onChange={(e) => setPicked(e.target.value)}>
          {names.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>

      {!stats ? (
        <EmptyState title="Progress needs a few workouts">
          Log the same exercise on different days and you'll see your heaviest weight climb here.
        </EmptyState>
      ) : (
        <>
          <div className="stats">
            <Stat label="Heaviest" value={fmt(stats.heaviest)} unit={unit} />
            <Stat label="Est. 1-rep max" value={fmt(stats.best1RM)} unit={unit} />
            <Stat label="Sessions" value={String(stats.points.length)} />
          </div>
          <div className="chart">
            <div className="note">Heaviest weight per session</div>
            <TrendChart
              label="Heaviest weight"
              unit={unit}
              points={stats.points.map(([date, value]) => ({ date, value }))}
            />
          </div>
        </>
      )}
    </>
  );
}
