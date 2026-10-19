import { useMemo } from "react";
import { niceDate, sortEntries, todayISO } from "../lib/lifting";
import type { Entry, Unit } from "../lib/types";
import { EmptyState } from "./EmptyState";
import { EntryList } from "./EntryList";

interface Props {
  entries: Entry[];
  unit: Unit;
  prs: Set<string>;
  onRemove: (id: string) => void;
}

export function HistoryView({ entries, unit, prs, onRemove }: Props) {
  const days = useMemo(() => {
    const map = new Map<string, Entry[]>();
    for (const e of sortEntries(entries)) {
      const list = map.get(e.performed_on) ?? [];
      list.push(e);
      map.set(e.performed_on, list);
    }
    return [...map];
  }, [entries]);

  if (!days.length) {
    return (
      <section className="view">
        <EmptyState title="Your history shows up here">
          Every workout you log is grouped by day, newest first.
        </EmptyState>
      </section>
    );
  }

  const today = todayISO();
  return (
    <section className="view">
      {days.map(([day, items]) => (
        <div className="day" key={day}>
          <h2>{day === today ? "Today" : niceDate(day)}</h2>
          <EntryList entries={items} unit={unit} prs={prs} onRemove={onRemove} />
        </div>
      ))}
    </section>
  );
}
