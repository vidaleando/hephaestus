import { useMemo, useState, type FocusEvent, type FormEvent } from "react";
import { convert, exerciseNames, fmt, niceDate, round1, sameExercise, sortEntries, todayISO } from "../lib/lifting";
import type { Entry, NewEntry, Unit } from "../lib/types";
import { EmptyState } from "./EmptyState";
import { EntryList } from "./EntryList";

interface Props {
  entries: Entry[];
  unit: Unit;
  prs: Set<string>;
  onToggleUnit: () => void;
  onAdd: (entry: NewEntry) => Promise<boolean>;
  onRemove: (id: string) => void;
  toast: (message: string) => void;
}

const selectAll = (e: FocusEvent<HTMLInputElement>) => e.currentTarget.select();

export function LogView({ entries, unit, prs, onToggleUnit, onAdd, onRemove, toast }: Props) {
  const [exercise, setExercise] = useState("");
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [sets, setSets] = useState("3");
  const [date, setDate] = useState(todayISO);

  const sorted = useMemo(() => sortEntries(entries), [entries]);
  const names = useMemo(() => exerciseNames(entries), [entries]);
  const onDate = sorted.filter((e) => e.performed_on === date);
  const last = exercise.trim() ? sorted.find((e) => sameExercise(e.exercise, exercise)) : undefined;

  function prefillFrom(name: string) {
    const prev = sorted.find((e) => sameExercise(e.exercise, name));
    if (!prev) return;
    setWeight(prev.weight ? String(round1(convert(prev.weight, prev.unit, unit))) : "");
    setReps(String(prev.reps));
    setSets(String(prev.sets));
  }

  function toggleUnit() {
    const w = parseFloat(weight);
    if (!Number.isNaN(w)) setWeight(String(round1(convert(w, unit, unit === "kg" ? "lb" : "kg"))));
    onToggleUnit();
  }

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    const name = exercise.trim().replace(/\s+/g, " ");
    const r = parseInt(reps, 10);
    const s = parseInt(sets, 10);
    if (!name || !(r > 0) || !(s > 0)) {
      toast("Add an exercise, reps and sets");
      return;
    }
    const canonical = names.find((n) => sameExercise(n, name)) ?? name;
    setExercise("");
    setWeight("");
    setReps("");
    setSets("3");
    const ok = await onAdd({
      exercise: canonical,
      weight: parseFloat(weight) || 0,
      unit,
      reps: r,
      sets: s,
      performed_on: date || todayISO(),
    });
    if (ok) toast(`Logged ${canonical}`);
  }

  return (
    <section className="view">
      <form className="panel" autoComplete="off" onSubmit={submit}>
        <label htmlFor="ex">
          Exercise
          <input
            id="ex"
            list="ex-list"
            placeholder="e.g. Bench press"
            required
            maxLength={80}
            enterKeyHint="next"
            value={exercise}
            onChange={(e) => {
              setExercise(e.target.value);
              // Picking a known exercise (from the suggestions or typed in full) fills in last time's numbers
              if (!weight && !reps && names.some((n) => n === e.target.value)) prefillFrom(e.target.value);
            }}
          />
          <datalist id="ex-list">
            {names.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </label>

        {names.length > 0 && (
          <div className="chips">
            {names.slice(0, 6).map((n) => (
              <button
                key={n}
                type="button"
                className="chip"
                onClick={() => {
                  setExercise(n);
                  prefillFrom(n);
                }}
              >
                {n}
              </button>
            ))}
          </div>
        )}

        <p className="hint">
          {last ? (
            <>
              Last time:{" "}
              <b>
                {last.weight ? `${fmt(convert(last.weight, last.unit, unit))} ${unit}` : "Bodyweight"} × {last.reps} ×{" "}
                {last.sets}
              </b>{" "}
              on {niceDate(last.performed_on, { month: "short", day: "numeric" })}
            </>
          ) : exercise.trim() ? (
            "First time logging this one."
          ) : null}
        </p>

        <div className="grid3">
          <label htmlFor="w">
            Weight
            <span className="weight-row">
              <input
                id="w"
                type="number"
                inputMode="decimal"
                step="0.5"
                min="0"
                placeholder="60"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                onFocus={selectAll}
              />
              <button type="button" className="unit-toggle" aria-label="Switch units" onClick={toggleUnit}>
                {unit}
              </button>
            </span>
          </label>
          <label htmlFor="reps">
            Reps
            <input
              id="reps"
              type="number"
              inputMode="numeric"
              min="1"
              step="1"
              placeholder="8"
              required
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              onFocus={selectAll}
            />
          </label>
          <label htmlFor="sets">
            Sets
            <input
              id="sets"
              type="number"
              inputMode="numeric"
              min="1"
              step="1"
              required
              value={sets}
              onChange={(e) => setSets(e.target.value)}
              onFocus={selectAll}
            />
          </label>
        </div>

        <label htmlFor="date">
          Date
          <input id="date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
        </label>

        <button className="primary" type="submit">
          Add to log
        </button>
      </form>

      <div className="day">
        <h2>{date === todayISO() ? "Today" : niceDate(date)}</h2>
        {onDate.length ? (
          <EntryList entries={onDate} unit={unit} prs={prs} onRemove={onRemove} />
        ) : (
          <EmptyState title="Nothing logged yet">
            Add your first exercise above. Example: Bench press, 60 kg, 8 reps, 3 sets.
          </EmptyState>
        )}
      </div>
    </section>
  );
}
