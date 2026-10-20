import { useMemo } from "react";
import { convert, estimated1RM, fmt, fmtSigned, niceDate, sameExercise } from "../lib/lifting";
import {
  cycleSuggestion,
  LIFT_NAMES,
  LIFTS,
  trainingMax,
  type Lift,
  type TrainingMaxes,
  type Week,
} from "../lib/programme";
import { KEYS } from "../lib/storage";
import type { Entry } from "../lib/types";
import { usePersistentState } from "../lib/usePersistentState";
import { EmptyState } from "./EmptyState";
import { Segmented } from "./Segmented";
import { Stat } from "./Stat";
import { TrendChart } from "./TrendChart";

interface PlusSet {
  id: string;
  date: string;
  createdAt: string;
  week: Week | null;
  /** kg */
  weight: number;
  reps: number;
  /** kg; null when no reps were done */
  e1rm: number | null;
}

const LIFT_OPTIONS = LIFTS.map((l) => ({ value: l, label: LIFT_NAMES[l] }));

/** The spreadsheet's "531 Archive": every + set of a main lift, its estimated 1RM, and what it suggests. */
export function MainLiftProgress({ entries, maxes }: { entries: Entry[]; maxes: TrainingMaxes }) {
  const [lift, setLift] = usePersistentState<Lift>(KEYS.progressLift, "squat");

  const plusSets = useMemo<PlusSet[]>(
    () =>
      entries
        .filter((e) => e.set_results && e.amrap_reps != null && sameExercise(e.exercise, LIFT_NAMES[lift]))
        .map((e) => {
          const weight = convert(e.weight, e.unit, "kg");
          const reps = e.amrap_reps!;
          return {
            id: e.id,
            date: e.performed_on,
            createdAt: e.created_at,
            week: (e.program_week ?? null) as Week | null,
            weight,
            reps,
            e1rm: reps > 0 ? estimated1RM(weight, reps) : null,
          };
        })
        .sort((a, b) => (a.date === b.date ? (a.createdAt < b.createdAt ? -1 : 1) : a.date < b.date ? -1 : 1)),
    [entries, lift],
  );

  const scored = plusSets.filter((p) => p.e1rm !== null);
  const best = scored.reduce<PlusSet | null>((b, p) => (!b || p.e1rm! > b.e1rm! ? p : b), null);
  const latest = scored[scored.length - 1];

  // One chart point per day: the best + set that day
  const bestPerDay = new Map<string, PlusSet>();
  for (const p of scored) {
    const prev = bestPerDay.get(p.date);
    if (!prev || p.e1rm! > prev.e1rm!) bestPerDay.set(p.date, p);
  }

  // Latest + set in each week, as the spreadsheet's cycle sheet holds one per week
  const latestPerWeek = new Map<Week, PlusSet>();
  for (const p of [...plusSets].reverse()) if (p.week && !latestPerWeek.has(p.week)) latestPerWeek.set(p.week, p);
  const max = maxes[lift];
  const suggestion =
    max != null
      ? cycleSuggestion(
          max,
          [...latestPerWeek.values()].sort((a, b) => a.week! - b.week!).map((p) => ({ week: p.week!, reps: p.reps })),
        )
      : null;

  return (
    <>
      <Segmented label="Lift" hideLabel options={LIFT_OPTIONS} value={lift} onChange={setLift} />

      {!plusSets.length ? (
        <EmptyState title={`No ${LIFT_NAMES[lift]} + sets yet`}>
          Log {LIFT_NAMES[lift]} from the Programme tab. Each + set lands here with its estimated 1-rep max.
        </EmptyState>
      ) : (
        <>
          <div className="stats">
            <Stat label="Best est. 1RM" value={best ? fmt(best.e1rm!) : "–"} unit="kg" />
            <Stat label="Latest est. 1RM" value={latest ? fmt(latest.e1rm!) : "–"} unit="kg" />
            <Stat label="+ sets logged" value={String(plusSets.length)} />
          </div>

          {scored.length > 0 && (
            <div className="chart">
              <div className="note">Estimated 1-rep max, best + set each day (Brzycki)</div>
              <TrendChart
                label="Est. 1RM"
                unit="kg"
                points={[...bestPerDay.values()].map((p) => ({
                  date: p.date,
                  value: p.e1rm!,
                  detail: `${fmt(p.weight)} kg × ${p.reps}${p.week ? ` · Week ${p.week}` : ""}`,
                }))}
              />
            </div>
          )}

          {suggestion && max != null && (
            <div className="panel suggestion">
              <div>
                <h2>Next cycle</h2>
                <p className="hint">
                  Training max change suggested by your latest + set in{" "}
                  {suggestion.weeks.map((w) => `Week ${w.week}`).join(", ")}. Current training max{" "}
                  {fmt(trainingMax(max))} kg.
                </p>
              </div>
              <div className="stats">
                <Stat label="Low" value={fmtSigned(suggestion.low)} unit="kg" />
                <Stat label="Average" value={fmtSigned(suggestion.average)} unit="kg" />
                <Stat label="High" value={fmtSigned(suggestion.high)} unit="kg" />
              </div>
            </div>
          )}

          <div className="day">
            <h2>{LIFT_NAMES[lift]} archive</h2>
            <div className="table-wrap">
              <table className="archive">
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Week</th>
                    <th scope="col" className="num">
                      + set
                    </th>
                    <th scope="col" className="num">
                      Est. 1RM
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[...plusSets].reverse().map((p) => (
                    <tr key={p.id}>
                      <td>{niceDate(p.date, { day: "numeric", month: "short", year: "2-digit" })}</td>
                      <td>{p.week ?? "–"}</td>
                      <td className="num">
                        {fmt(p.weight)} × {p.reps}
                      </td>
                      <td className="num">
                        {p.e1rm === null ? "–" : fmt(p.e1rm)}
                        {best && p.id === best.id && <span className="pr-tag">Best</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  );
}
