import type { TrainingMaxes } from "../lib/programme";
import { KEYS } from "../lib/storage";
import type { Entry, Unit } from "../lib/types";
import { usePersistentState } from "../lib/usePersistentState";
import { ExerciseProgress } from "./ExerciseProgress";
import { MainLiftProgress } from "./MainLiftProgress";
import { Segmented } from "./Segmented";

type Mode = "531" | "exercises";

const MODES = [
  { value: "531" as Mode, label: "5/3/1" },
  { value: "exercises" as Mode, label: "All exercises" },
];

export function ProgressView({ entries, unit, maxes }: { entries: Entry[]; unit: Unit; maxes: TrainingMaxes }) {
  const [mode, setMode] = usePersistentState<Mode>(KEYS.progressMode, "531");
  return (
    <section className="view">
      <Segmented label="Show" hideLabel options={MODES} value={mode} onChange={setMode} />
      {mode === "531" ? <MainLiftProgress entries={entries} maxes={maxes} /> : <ExerciseProgress entries={entries} unit={unit} />}
    </section>
  );
}
