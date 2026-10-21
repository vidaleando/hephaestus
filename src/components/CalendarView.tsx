import { useMemo, useState } from "react";
import { convert, fmt, niceDate, sortEntries, todayISO } from "../lib/lifting";
import { entryCycle } from "../lib/programme";
import type { Bodyweight, Entry, Unit } from "../lib/types";
import { EntryList } from "./EntryList";

interface Props {
  entries: Entry[];
  weights: Bodyweight[];
  unit: Unit;
  prs: Set<string>;
  onRemove: (id: string) => void;
}

const pad = (n: number) => String(n).padStart(2, "0");
const isoDate = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

// Monday-first weekday initials in the viewer's language (2024-01-01 was a Monday)
const WEEKDAYS = Array.from({ length: 7 }, (_, i) =>
  new Date(2024, 0, 1 + i).toLocaleDateString(undefined, { weekday: "narrow" }),
);

/** Month calendar of past workouts; tap a day to see what was logged. */
export function CalendarView({ entries, weights, unit, prs, onRemove }: Props) {
  const today = todayISO();
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [selected, setSelected] = useState(today);

  const byDate = useMemo(() => {
    const map = new Map<string, Entry[]>();
    for (const e of sortEntries(entries)) {
      const list = map.get(e.performed_on) ?? [];
      list.push(e);
      map.set(e.performed_on, list);
    }
    return map;
  }, [entries]);

  const weighIns = useMemo(() => {
    const map = new Map<string, Bodyweight>();
    for (const w of weights) {
      const prev = map.get(w.measured_on);
      if (!prev || w.created_at > prev.created_at) map.set(w.measured_on, w);
    }
    return map;
  }, [weights]);

  const { y, m } = month;
  const leading = (new Date(y, m, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array<null>(leading).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7) cells.push(null);

  const monthPrefix = `${y}-${pad(m + 1)}-`;
  const workoutDays = [...byDate.keys()].filter((d) => d.startsWith(monthPrefix)).length;
  const monthLabel = new Date(y, m, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const thisMonth = today.startsWith(monthPrefix);

  const shift = (delta: number) => {
    const d = new Date(y, m + delta, 1);
    setMonth({ y: d.getFullYear(), m: d.getMonth() });
  };
  const goToday = () => {
    const d = new Date();
    setMonth({ y: d.getFullYear(), m: d.getMonth() });
    setSelected(today);
  };

  const dayEntries = byDate.get(selected) ?? [];
  const weighIn = weighIns.get(selected);
  const session = dayEntries.find((e) => e.program_week != null);

  return (
    <>
      <div className="panel cal-panel">
        <div className="cal-head">
          <button type="button" className="cal-nav" aria-label="Previous month" onClick={() => shift(-1)}>
            ‹
          </button>
          <div className="cal-title">
            <span className="cal-month">{monthLabel}</span>
            <span className="sub">
              {workoutDays} workout {workoutDays === 1 ? "day" : "days"}
            </span>
          </div>
          <button type="button" className="cal-nav" aria-label="Next month" onClick={() => shift(1)}>
            ›
          </button>
        </div>

        <div className="cal-grid" role="group" aria-label={monthLabel}>
          {WEEKDAYS.map((d, i) => (
            <span key={i} className="cal-weekday" aria-hidden="true">
              {d}
            </span>
          ))}
          {cells.map((day, i) => {
            if (day === null) return <span key={i} className="cal-blank" />;
            const iso = isoDate(y, m, day);
            const list = byDate.get(iso);
            const main = list?.some((e) => e.set_results);
            const label = `${niceDate(iso, { weekday: "long", day: "numeric", month: "long" })}${
              list ? `, ${list.length} ${list.length === 1 ? "exercise" : "exercises"}` : ""
            }`;
            return (
              <button
                key={i}
                type="button"
                className="cal-day"
                aria-label={label}
                aria-pressed={iso === selected}
                data-today={iso === today || undefined}
                onClick={() => setSelected(iso)}
              >
                <span className="cal-num">{day}</span>
                <span className="cal-marks" aria-hidden="true">
                  {list && <span className="cal-dot" data-kind={main ? "531" : "other"} />}
                  {weighIns.has(iso) && <span className="cal-dot" data-kind="weight" />}
                </span>
              </button>
            );
          })}
        </div>

        <div className="cal-foot">
          <span className="cal-key">
            <span className="cal-dot" data-kind="531" /> 5/3/1
          </span>
          <span className="cal-key">
            <span className="cal-dot" data-kind="other" /> Other
          </span>
          <span className="cal-key">
            <span className="cal-dot" data-kind="weight" /> Weigh-in
          </span>
          {!(thisMonth && selected === today) && (
            <button type="button" className="link" onClick={goToday}>
              Today
            </button>
          )}
        </div>
      </div>

      <div className="day">
        <h2>{selected === today ? "Today" : niceDate(selected, { weekday: "long", day: "numeric", month: "long" })}</h2>
        {session && (
          <p className="hint">
            Cycle {entryCycle(session)} · Week {session.program_week} · Day {session.program_day}
          </p>
        )}
        {weighIn && (
          <p className="hint">
            Body weight <b>{fmt(convert(weighIn.weight, weighIn.unit, unit))} {unit}</b>
          </p>
        )}
        {dayEntries.length ? (
          <EntryList entries={dayEntries} unit={unit} prs={prs} onRemove={onRemove} />
        ) : (
          <div className="empty">{weighIn ? "No exercises logged this day." : "Nothing logged this day."}</div>
        )}
      </div>
    </>
  );
}
