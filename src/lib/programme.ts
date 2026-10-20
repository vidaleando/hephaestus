// The 5/3/1 Hybrid programme from "531 Diego.xlsx": three weeks, three days.

export type Lift = "squat" | "bench" | "deadlift" | "ohp";
export type Week = 1 | 2 | 3;
export type Day = 1 | 2 | 3;

export const LIFTS: Lift[] = ["squat", "bench", "deadlift", "ohp"];

export const LIFT_NAMES: Record<Lift, string> = {
  squat: "Squat",
  bench: "Bench",
  deadlift: "Deadlift",
  ohp: "OHP",
};

/** Training max as a share of the 1-rep max. */
export const TRAINING_MAX_RATIO = 0.9;

export interface MainSet {
  percent: number;
  reps: number;
  /** The last set of each week: as many reps as possible, at least `reps`. */
  amrap: boolean;
}

export const WEEK_SETS: Record<Week, MainSet[]> = {
  1: [
    { percent: 65, reps: 5, amrap: false },
    { percent: 75, reps: 5, amrap: false },
    { percent: 85, reps: 5, amrap: true },
  ],
  2: [
    { percent: 70, reps: 3, amrap: false },
    { percent: 80, reps: 3, amrap: false },
    { percent: 90, reps: 3, amrap: true },
  ],
  3: [
    { percent: 75, reps: 5, amrap: false },
    { percent: 85, reps: 3, amrap: false },
    { percent: 95, reps: 1, amrap: true },
  ],
};

export type ProgrammeItem =
  | { kind: "531"; lift: Lift; name: string }
  /** `weight` in kg; 0 means bodyweight. */
  | { kind: "fixed"; name: string; reps: number; sets: number; weight: number };

const main = (lift: Lift): ProgrammeItem => ({ kind: "531", lift, name: LIFT_NAMES[lift] });
const fixed = (name: string, reps: number, sets: number, weight: number): ProgrammeItem => ({
  kind: "fixed",
  name,
  reps,
  sets,
  weight,
});

export const DAYS: Record<Day, ProgrammeItem[]> = {
  1: [
    main("squat"),
    main("ohp"),
    fixed("Close grip bench", 5, 5, 50),
    fixed("Lateral raise", 15, 3, 5),
    fixed("DB row", 12, 3, 15),
  ],
  2: [
    main("bench"),
    fixed("OHP", 5, 5, 65),
    fixed("Bent over row", 12, 3, 45),
    fixed("Pushups", 10, 5, 0),
    fixed("Skull crushers", 12, 3, 25),
  ],
  3: [
    main("deadlift"),
    fixed("Pulldown", 5, 5, 0),
    fixed("DB row", 12, 3, 22.5),
    fixed("Lat pullover", 12, 3, 16.5),
    fixed("BB curls", 15, 3, 25),
  ],
};

/** Round to the nearest 2.5 kg, as the spreadsheet does. */
export function roundToPlate(kg: number): number {
  return 2.5 * Math.round(kg / 2.5);
}

export function trainingMax(oneRepMax: number): number {
  return oneRepMax * TRAINING_MAX_RATIO;
}

export function setWeight(oneRepMax: number, set: MainSet): number {
  return roundToPlate((set.percent / 100) * trainingMax(oneRepMax));
}

/**
 * Suggested training-max increase from the reps beyond the minimum on the last set:
 * 1% of the training max per extra rep, rounded down to 2.5 kg.
 */
export function suggestedIncrease(oneRepMax: number, week: Week, repsDone: number): number {
  const base = WEEK_SETS[week][2].reps;
  if (repsDone <= base) return 0;
  return 2.5 * Math.floor((0.01 * (repsDone - base) * trainingMax(oneRepMax)) / 2.5);
}

export type TrainingMaxes = Record<Lift, number | null>;

export const EMPTY_MAXES: TrainingMaxes = { squat: null, bench: null, deadlift: null, ohp: null };
