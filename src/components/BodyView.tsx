import { useEffect, useMemo, useState, type FormEvent } from "react";
import { convert, fmt, fmtSigned, niceDate, percentChange, round1, todayISO } from "../lib/lifting";
import type { Bodyweight, NewBodyweight, Unit } from "../lib/types";
import { EmptyState } from "./EmptyState";
import { Stat } from "./Stat";
import { TrendChart } from "./TrendChart";

interface Props {
  weights: Bodyweight[];
  unit: Unit;
  onToggleUnit: () => void;
  onAdd: (row: NewBodyweight) => Promise<boolean>;
  onRemove: (id: string) => void;
  toast: (message: string) => void;
}

/** Body weight log: weigh-ins over time and the % change between them. */
export function BodyView({ weights, unit, onToggleUnit, onAdd, onRemove, toast }: Props) {
  const [value, setValue] = useState("");
  const [date, setDate] = useState(todayISO);

  // Oldest first, in the display unit, with the change from the weigh-in before
  const rows = useMemo(() => {
    const asc = [...weights].sort((a, b) =>
      a.measured_on === b.measured_on ? (a.created_at < b.created_at ? -1 : 1) : a.measured_on < b.measured_on ? -1 : 1,
    );
    return asc.map((w, i) => {
      const weight = convert(w.weight, w.unit, unit);
      const prev = i > 0 ? convert(asc[i - 1].weight, asc[i - 1].unit, unit) : null;
      return { ...w, shown: weight, change: prev === null ? null : percentChange(prev, weight) };
    });
  }, [weights, unit]);

  const latest = rows[rows.length - 1];
  const first = rows[0];

  function toggleUnit() {
    const n = parseFloat(value);
    if (!Number.isNaN(n)) setValue(String(round1(convert(n, unit, unit === "kg" ? "lb" : "kg"))));
    onToggleUnit();
  }

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    const n = parseFloat(value);
    if (!(n > 0)) {
      toast("Enter your weight");
      return;
    }
    setValue("");
    if (await onAdd({ weight: n, unit, measured_on: date || todayISO() })) toast(`Saved ${fmt(n)} ${unit}`);
  }

  return (
    <section className="view">
      <form className="panel" onSubmit={submit} autoComplete="off">
        <div className="grid2">
          <label htmlFor="bw">
            Body weight
            <span className="weight-row">
              <input
                id="bw"
                type="number"
                inputMode="decimal"
                step="0.1"
                min="0"
                placeholder={latest ? fmt(latest.shown) : "80"}
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
              <button type="button" className="unit-toggle" aria-label="Switch units" onClick={toggleUnit}>
                {unit}
              </button>
            </span>
          </label>
          <label htmlFor="bw-date">
            Date
            <input id="bw-date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
        </div>
        <button className="primary" type="submit">
          Save weight
        </button>
      </form>

      {!rows.length ? (
        <EmptyState title="No weigh-ins yet">
          Log your weight above. You'll see the change between weigh-ins and a chart over time.
        </EmptyState>
      ) : (
        <>
          <div className="stats">
            <Stat label="Latest" value={fmt(latest.shown)} unit={unit} />
            <Stat
              label="Since last"
              value={latest.change === null ? "–" : `${fmtSigned(latest.change)}%`}
            />
            <Stat
              label={`Since ${niceDate(first.measured_on, { day: "numeric", month: "short" })}`}
              value={rows.length > 1 ? fmtSigned(latest.shown - first.shown) : "–"}
              unit={rows.length > 1 ? unit : undefined}
            />
          </div>

          {rows.length > 1 && (
            <div className="chart">
              <div className="note">Body weight ({unit})</div>
              <TrendChart
                label="Body weight"
                unit={unit}
                points={rows.map((r) => ({ date: r.measured_on, value: r.shown }))}
              />
            </div>
          )}

          <div className="day">
            <h2>Weigh-ins</h2>
            <div className="list">
              {[...rows].reverse().map((r) => (
                <BodyRow
                  key={r.id}
                  date={r.measured_on}
                  weight={`${fmt(r.shown)} ${unit}`}
                  change={r.change}
                  onRemove={() => onRemove(r.id)}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function BodyRow({ date, weight, change, onRemove }: { date: string; weight: string; change: number | null; onRemove: () => void }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);

  return (
    <div className="row">
      <div className="main">
        <div className="ex">{weight}</div>
        <div className="nums">
          {niceDate(date)}
          {change !== null && ` · ${fmtSigned(change, 2)}%`}
        </div>
      </div>
      <button type="button" className="del" data-armed={armed || undefined} onClick={() => (armed ? onRemove() : setArmed(true))}>
        {armed ? "Confirm" : "Delete"}
      </button>
    </div>
  );
}
