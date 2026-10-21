import type { TrainingMaxes } from "../lib/programme";
import { KEYS } from "../lib/storage";
import type { Bodyweight, Entry, Unit } from "../lib/types";
import { usePersistentState } from "../lib/usePersistentState";
import { CalendarView } from "./CalendarView";
import { ExerciseProgress } from "./ExerciseProgress";
import { ExportPanel } from "./ExportPanel";
import { MainLiftProgress } from "./MainLiftProgress";
import { Segmented } from "./Segmented";

type Mode = "531" | "calendar" | "exercises";

const MODES = [
  { value: "531" as Mode, label: "5/3/1" },
  { value: "calendar" as Mode, label: "Calendar" },
  { value: "exercises" as Mode, label: "Exercises" },
];

interface Props {
  entries: Entry[];
  unit: Unit;
  maxes: TrainingMaxes;
  cycle: number;
  weights: Bodyweight[];
  prs: Set<string>;
  onRemove: (id: string) => void;
  toast: (message: string) => void;
}

export function ProgressView({ entries, unit, maxes, cycle, weights, prs, onRemove, toast }: Props) {
  const [mode, setMode] = usePersistentState<Mode>(KEYS.progressMode, "531");
  return (
    <section className="view">
      <Segmented label="Show" hideLabel options={MODES} value={mode} onChange={setMode} />
      {mode === "531" ? (
        <MainLiftProgress entries={entries} maxes={maxes} cycle={cycle} />
      ) : mode === "calendar" ? (
        <CalendarView entries={entries} weights={weights} unit={unit} prs={prs} onRemove={onRemove} />
      ) : (
        <ExerciseProgress entries={entries} unit={unit} />
      )}
      <ExportPanel entries={entries} maxes={maxes} cycle={cycle} weights={weights} unit={unit} toast={toast} />
    </section>
  );
}
