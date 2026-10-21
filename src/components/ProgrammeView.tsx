import { useState } from "react";
import { fmt, niceDate } from "../lib/lifting";
import {
  currentPrescription,
  DAYS,
  findSessionEntry,
  LIFT_NAMES,
  nextSession,
  sessionDone,
  SESSIONS,
  setWeight,
  WEEK_SETS,
  type Day,
  type ProgrammeItem,
  type TrainingMaxes,
  type Week,
} from "../lib/programme";
import { KEYS } from "../lib/storage";
import type { Entry, NewEntry } from "../lib/types";
import { useBackButton } from "../lib/useBackButton";
import { usePersistentState } from "../lib/usePersistentState";
import type { Cycle } from "../lib/useTrainingMaxes";
import { AccessorySession } from "./AccessorySession";
import { CycleStart } from "./CycleStart";
import { LiftSession } from "./LiftSession";
import { MaxesEditor } from "./MaxesEditor";
import { Segmented } from "./Segmented";

interface Props {
  entries: Entry[];
  maxes: TrainingMaxes;
  cycle: Cycle;
  onSaveMaxes: (maxes: TrainingMaxes) => Promise<boolean>;
  onStartCycle: (maxes: TrainingMaxes) => Promise<boolean>;
  onAdd: (entry: NewEntry) => Promise<boolean>;
  onUpdate: (id: string, entry: NewEntry) => Promise<boolean>;
  toast: (message: string) => void;
}

type Screen = { name: "list" } | { name: "item"; index: number } | { name: "maxes" } | { name: "cycle" };

const WEEK_HINTS: Record<Week, string> = { 1: "5s", 2: "3s", 3: "5/3/1" };
const DAY_HINTS = Object.fromEntries(
  ([1, 2, 3] as Day[]).map((d) => [d, DAYS[d].filter((i) => i.kind === "531").map((i) => i.name).join(" · ")]),
) as Record<Day, string>;

export function ProgrammeView({ entries, maxes, cycle, onSaveMaxes, onStartCycle, onAdd, onUpdate, toast }: Props) {
  const [week, setWeek] = usePersistentState<Week>(KEYS.week, 1);
  const [day, setDay] = usePersistentState<Day>(KEYS.day, 1);
  const [screen, setScreen] = useState<Screen>({ name: "list" });

  const items = DAYS[day];
  const logged = (item: ProgrammeItem) => findSessionEntry(entries, cycle.number, week, day, item.name);
  const next = nextSession(entries, cycle.number);
  const doneCount = SESSIONS.filter((x) => sessionDone(entries, cycle.number, x.week, x.day)).length;

  const weekOptions = ([1, 2, 3] as Week[]).map((w) => ({
    value: w,
    label: `Week ${w}`,
    hint: ([1, 2, 3] as Day[]).every((d) => sessionDone(entries, cycle.number, w, d)) ? "Done ✓" : WEEK_HINTS[w],
  }));
  const dayOptions = ([1, 2, 3] as Day[]).map((d) => ({
    value: d,
    label: `Day ${d}`,
    hint: sessionDone(entries, cycle.number, week, d) ? `${DAY_HINTS[d]} ✓` : DAY_HINTS[d],
  }));

  function goTo(w: Week, d: Day) {
    setWeek(w);
    setDay(d);
  }

  const back = () => {
    setScreen({ name: "list" });
    window.scrollTo(0, 0);
  };
  // The phone's back button leaves a lift, maxes or cycle screen for the day's list
  useBackButton(screen.name !== "list", back);
  const saveFor = (existing?: Entry) => async (input: NewEntry) => {
    // New programme entries belong to the current cycle; edits keep the cycle they were logged in
    const entry = { ...input, cycle: existing ? (existing.cycle ?? 1) : cycle.number };
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

  if (screen.name === "cycle") {
    return (
      <CycleStart
        entries={entries}
        maxes={maxes}
        cycle={cycle.number}
        complete={next === null}
        onStart={async (m) => {
          const ok = await onStartCycle(m);
          if (ok) {
            goTo(1, 1);
            toast(`Cycle ${cycle.number + 1} started`);
          }
          return ok;
        }}
        onBack={back}
      />
    );
  }

  if (screen.name === "item") {
    const item = items[screen.index];
    const existing = logged(item);
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
      const now = currentPrescription(entries, day, item);
      return (
        <AccessorySession
          key={`${week}-${day}-${screen.index}`}
          name={item.name}
          reps={now.reps}
          sets={now.sets}
          weight={now.weight}
          fromLog={now.fromLog}
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
      <div className="cycle-bar">
        <div>
          <span className="cycle-name">Cycle {cycle.number}</span>
          <span className="sub">
            {doneCount} of {SESSIONS.length} sessions
            {cycle.startedOn ? ` · since ${niceDate(cycle.startedOn, { day: "numeric", month: "short" })}` : ""}
          </span>
        </div>
        {next && (next.week !== week || next.day !== day) && (
          <button type="button" className="chip next-up" onClick={() => goTo(next.week, next.day)}>
            Next up: Week {next.week} · Day {next.day}
          </button>
        )}
      </div>

      {next === null && (
        <div className="notice">
          <p>Cycle {cycle.number} is complete. Raise your training maxes and start the next one.</p>
          <button type="button" className="link" onClick={() => setScreen({ name: "cycle" })}>
            Start cycle {cycle.number + 1}
          </button>
        </div>
      )}

      <Segmented label="Week" options={weekOptions} value={week} onChange={setWeek} />
      <Segmented label="Day" options={dayOptions} value={day} onChange={setDay} />

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
            const done = logged(item);
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
                  <div className="nums">{describe(item, week, day, maxes, entries)}</div>
                </div>
                {done ? <DoneBadge entry={done} /> : <span className="chev" aria-hidden="true">›</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="footer-links">
        <button type="button" className="link" onClick={() => setScreen({ name: "maxes" })}>
          Edit 1-rep maxes
        </button>
        {next !== null && (
          <button type="button" className="link muted" onClick={() => setScreen({ name: "cycle" })}>
            Start next cycle early
          </button>
        )}
      </div>
    </section>
  );
}

function describe(item: ProgrammeItem, week: Week, day: Day, maxes: TrainingMaxes, entries: Entry[]): string {
  if (item.kind === "fixed") {
    const p = currentPrescription(entries, day, item);
    return `${p.reps} × ${p.sets} ${p.weight ? `@ ${fmt(p.weight)} kg` : "· bodyweight"}`;
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
