import { useState } from "react";
import { fmt, sameExercise, todayISO } from "../lib/lifting";
import {
  DAYS,
  LIFT_NAMES,
  setWeight,
  WEEK_SETS,
  type Day,
  type ProgrammeItem,
  type TrainingMaxes,
  type Week,
} from "../lib/programme";
import { KEYS } from "../lib/storage";
import type { Entry, NewEntry } from "../lib/types";
import { usePersistentState } from "../lib/usePersistentState";
import { AccessorySession } from "./AccessorySession";
import { LiftSession } from "./LiftSession";
import { MaxesEditor } from "./MaxesEditor";
import { Segmented } from "./Segmented";

interface Props {
  entries: Entry[];
  maxes: TrainingMaxes;
  onSaveMaxes: (maxes: TrainingMaxes) => Promise<boolean>;
  onAdd: (entry: NewEntry) => Promise<boolean>;
  onUpdate: (id: string, entry: NewEntry) => Promise<boolean>;
  toast: (message: string) => void;
}

type Screen = { name: "list" } | { name: "item"; index: number } | { name: "maxes" };

const WEEK_OPTIONS = [
  { value: 1 as Week, label: "Week 1", hint: "5s" },
  { value: 2 as Week, label: "Week 2", hint: "3s" },
  { value: 3 as Week, label: "Week 3", hint: "5/3/1" },
];

const DAY_OPTIONS = ([1, 2, 3] as Day[]).map((d) => ({
  value: d,
  label: `Day ${d}`,
  hint: DAYS[d].filter((i) => i.kind === "531").map((i) => i.name).join(" · "),
}));

export function ProgrammeView({ entries, maxes, onSaveMaxes, onAdd, onUpdate, toast }: Props) {
  const [week, setWeek] = usePersistentState<Week>(KEYS.week, 1);
  const [day, setDay] = usePersistentState<Day>(KEYS.day, 1);
  const [screen, setScreen] = useState<Screen>({ name: "list" });

  const items = DAYS[day];
  const today = todayISO();
  const loggedToday = (item: ProgrammeItem) =>
    entries.find(
      (e) =>
        e.performed_on === today &&
        e.program_week === week &&
        e.program_day === day &&
        sameExercise(e.exercise, item.name),
    );

  const back = () => {
    setScreen({ name: "list" });
    window.scrollTo(0, 0);
  };
  const saveFor = (existing?: Entry) => async (entry: NewEntry) => {
    const ok = await (existing ? onUpdate(existing.id, entry) : onAdd(entry));
    if (ok) toast(`Saved ${entry.exercise}`);
    return ok;
  };
  const saveMaxes = async (next: TrainingMaxes) => {
    const ok = await onSaveMaxes(next);
    if (ok) toast("Maxes saved");
    return ok;
  };

  if (screen.name === "maxes") {
    return <MaxesEditor maxes={maxes} onSave={saveMaxes} onBack={back} />;
  }

  if (screen.name === "item") {
    const item = items[screen.index];
    const existing = loggedToday(item);
    if (item.kind === "531" && maxes[item.lift] != null) {
      return (
        <LiftSession
          key={`${week}-${day}-${screen.index}`}
          name={item.name}
          lift={item.lift}
          week={week}
          day={day}
          oneRepMax={maxes[item.lift]!}
          existing={existing}
          onSave={saveFor(existing)}
          onBack={back}
        />
      );
    }
    if (item.kind === "fixed") {
      return (
        <AccessorySession
          key={`${week}-${day}-${screen.index}`}
          name={item.name}
          reps={item.reps}
          sets={item.sets}
          weight={item.weight}
          week={week}
          day={day}
          existing={existing}
          onSave={saveFor(existing)}
          onBack={back}
        />
      );
    }
  }

  const missing = items.filter((i) => i.kind === "531" && maxes[i.lift] == null);

  return (
    <section className="view">
      <Segmented label="Week" options={WEEK_OPTIONS} value={week} onChange={setWeek} />
      <Segmented label="Day" options={DAY_OPTIONS} value={day} onChange={setDay} />

      {missing.length > 0 && (
        <div className="notice">
          <p>
            Add your 1-rep max for {missing.map((i) => i.name).join(" and ")} to see this day's weights.
          </p>
          <button type="button" className="link" onClick={() => setScreen({ name: "maxes" })}>
            Enter maxes
          </button>
        </div>
      )}

      <div className="day">
        <h2>
          Week {week} · Day {day}
        </h2>
        <div className="list">
          {items.map((item, index) => {
            const done = loggedToday(item);
            const locked = item.kind === "531" && maxes[item.lift] == null;
            return (
              <button
                key={index}
                type="button"
                className="row plan-row"
                onClick={() => setScreen(locked ? { name: "maxes" } : { name: "item", index })}
              >
                <div className="main">
                  <div className="ex">
                    {item.name}
                    {item.kind === "531" && <span className="tag">5/3/1</span>}
                  </div>
                  <div className="nums">{describe(item, week, maxes)}</div>
                </div>
                {done ? <DoneBadge entry={done} /> : <span className="chev" aria-hidden="true">›</span>}
              </button>
            );
          })}
        </div>
      </div>

      <button type="button" className="link maxes-link" onClick={() => setScreen({ name: "maxes" })}>
        Edit 1-rep maxes
      </button>
    </section>
  );
}

function describe(item: ProgrammeItem, week: Week, maxes: TrainingMaxes): string {
  if (item.kind === "fixed") {
    return `${item.reps} × ${item.sets} ${item.weight ? `@ ${fmt(item.weight)} kg` : "· bodyweight"}`;
  }
  const sets = WEEK_SETS[week];
  const reps = sets.map((s) => `${s.reps}${s.amrap ? "+" : ""}`).join(" / ");
  const max = maxes[item.lift];
  if (max == null) return `${reps} · needs your ${LIFT_NAMES[item.lift]} max`;
  return `${reps} @ ${sets.map((s) => fmt(setWeight(max, s))).join(" / ")} kg`;
}

function DoneBadge({ entry }: { entry: Entry }) {
  if (entry.set_results) {
    const made = entry.set_results.filter(Boolean).length;
    return (
      <span className="badge" data-ok={made === entry.set_results.length || undefined}>
        {made}/{entry.set_results.length}
      </span>
    );
  }
  return (
    <span className="badge" data-ok>
      Done
    </span>
  );
}
