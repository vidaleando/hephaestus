// The 5/3/1 Hybrid programme from "531 Diego.xlsx": three weeks, three days.

export type Lift = "squat" | "bench" | "deadlift" | "ohp";
export type Week = 1 | 2 | 3;
/** The optional deload week runs as week 4 of a cycle, after the three working weeks. */
export const DELOAD = 4 as const;
export type ProgrammeWeek = Week | typeof DELOAD;
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

// ---- Deload ----

/** Half, rounded up, so nothing drops to zero (3 sets → 2, 5 reps → 3). */
const half = (n: number) => Math.max(1, Math.ceil(n / 2));

/**
 * Deload main sets: half the sets and half the reps of Week 1 (65% and 75% for 3 reps),
 * with no + set.
 */
export const DELOAD_SETS: MainSet[] = WEEK_SETS[1]
  .slice(0, half(WEEK_SETS[1].length))
  .map((s) => ({ ...s, reps: half(s.reps), amrap: false }));

/** The main sets for any programme week, deload included. */
export function setsFor(week: ProgrammeWeek): MainSet[] {
  return week === DELOAD ? DELOAD_SETS : WEEK_SETS[week];
}

/** Halve a fixed exercise's sets and reps for the deload week. */
export function deloadPrescription<T extends { reps: number; sets: number }>(p: T): T {
  return { ...p, reps: half(p.reps), sets: half(p.sets) };
}

export function weekLabel(week: ProgrammeWeek | number | null | undefined): string {
  return week === DELOAD ? "Deload" : `Week ${week}`;
}

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

export interface CycleSuggestion {
  low: number;
  average: number;
  high: number;
  /** The + set each figure is based on, one per week that has one. */
  weeks: { week: Week; reps: number; change: number }[];
}

/**
 * Training-max change suggested by a cycle's + sets, matching the spreadsheet's
 * "Suggested Weight Increase" block: per week, 1% of the training max per rep above
 * the minimum, rounded down to 2.5 kg. Low is the smallest (and can be negative after a
 * missed + set), High the largest, Average the mean rounded down and never below zero.
 */
export function cycleSuggestion(oneRepMax: number, plusSets: { week: Week; reps: number }[]): CycleSuggestion | null {
  if (!plusSets.length) return null;
  const tm = trainingMax(oneRepMax);
  const raw = plusSets.map(({ week, reps }) => 0.01 * (reps - WEEK_SETS[week][2].reps) * tm);
  const floored = raw.map((r) => 2.5 * Math.floor(r / 2.5));
  const mean = raw.reduce((a, b) => a + b, 0) / raw.length;
  return {
    low: Math.min(...floored),
    high: Math.max(...floored),
    average: Math.max(0, 2.5 * Math.floor(mean / 2.5)),
    weeks: plusSets.map((p, i) => ({ ...p, change: floored[i] })),
  };
}

export type TrainingMaxes = Record<Lift, number | null>;

// ---- Cycles ----

/** The nine sessions of a cycle, in order. */
export const SESSIONS: { week: Week; day: Day }[] = ([1, 2, 3] as Week[]).flatMap((week) =>
  ([1, 2, 3] as Day[]).map((day) => ({ week, day })),
);

interface CycleEntry {
  exercise: string;
  performed_on: string;
  created_at: string;
  program_week?: number | null;
  program_day?: number | null;
  set_results?: boolean[] | null;
  amrap_reps?: number | null;
  cycle?: number | null;
}

/** Programme entries logged before cycles existed count as cycle 1. */
export function entryCycle(e: CycleEntry): number | null {
  return e.program_week == null ? null : (e.cycle ?? 1);
}

/** The latest entry for one programme exercise in a given cycle, week and day. */
export function findSessionEntry<T extends CycleEntry>(
  entries: T[],
  cycle: number,
  week: ProgrammeWeek,
  day: Day,
  exercise: string,
): T | undefined {
  const name = exercise.trim().toLowerCase();
  return entries
    .filter(
      (e) =>
        entryCycle(e) === cycle &&
        e.program_week === week &&
        e.program_day === day &&
        e.exercise.trim().toLowerCase() === name,
    )
    .sort((a, b) => (a.created_at < b.created_at ? -1 : 1))
    .pop();
}

/** A session counts as done once all of its 5/3/1 lifts are logged. */
export function sessionDone(entries: CycleEntry[], cycle: number, week: ProgrammeWeek, day: Day): boolean {
  return DAYS[day]
    .filter((i) => i.kind === "531")
    .every((i) => findSessionEntry(entries, cycle, week, day, i.name)?.set_results);
}

/** The first deload day not yet done, or null once all three are. */
export function nextDeloadDay(entries: CycleEntry[], cycle: number): Day | null {
  return ([1, 2, 3] as Day[]).find((d) => !sessionDone(entries, cycle, DELOAD, d)) ?? null;
}

/** The first session of the cycle's three working weeks that isn't done yet, or null when they all are. */
export function nextSession(entries: CycleEntry[], cycle: number): { week: Week; day: Day } | null {
  return SESSIONS.find((s) => !sessionDone(entries, cycle, s.week, s.day)) ?? null;
}

/** The latest + set per week of one lift within a cycle, for the next-cycle suggestion. */
export function cyclePlusSets(entries: CycleEntry[], cycle: number, lift: Lift): { week: Week; reps: number }[] {
  const out: { week: Week; reps: number }[] = [];
  for (const week of [1, 2, 3] as Week[]) {
    const latest = entries
      .filter(
        (e) =>
          entryCycle(e) === cycle &&
          e.program_week === week &&
          e.set_results &&
          e.amrap_reps != null &&
          e.exercise.trim().toLowerCase() === LIFT_NAMES[lift].toLowerCase(),
      )
      .sort((a, b) => (a.created_at < b.created_at ? -1 : 1))
      .pop();
    if (latest) out.push({ week, reps: latest.amrap_reps! });
  }
  return out;
}

export interface Prescription {
  reps: number;
  sets: number;
  /** kg; 0 is bodyweight */
  weight: number;
  /** True when these numbers come from the last time it was logged, not the programme. */
  fromLog: boolean;
}

/**
 * What to do for a fixed-prescription exercise: whatever was last logged for it on this
 * programme day (so a weight you raise carries forward), or the programme's numbers until then.
 * Matched per day because the same exercise can differ between days (DB row: 15 vs 22.5 kg).
 */
export function currentPrescription(
  entries: (CycleEntry & { weight: number; unit: string; reps: number; sets: number })[],
  day: Day,
  item: Extract<ProgrammeItem, { kind: "fixed" }>,
): Prescription {
  const name = item.name.trim().toLowerCase();
  const last = entries
    // Deload entries are halved, so they never set the prescription for normal weeks
    .filter(
      (e) =>
        e.program_day === day &&
        e.program_week !== DELOAD &&
        !e.set_results &&
        e.exercise.trim().toLowerCase() === name,
    )
    .sort((a, b) =>
      a.performed_on === b.performed_on ? (a.created_at < b.created_at ? -1 : 1) : a.performed_on < b.performed_on ? -1 : 1,
    )
    .pop();
  if (!last) return { reps: item.reps, sets: item.sets, weight: item.weight, fromLog: false };
  const kg = last.unit === "lb" ? last.weight * 0.45359237 : last.weight;
  return { reps: last.reps, sets: last.sets, weight: Math.round(kg * 100) / 100, fromLog: true };
}

/** The 1-rep max that gives a training max `increase` kg higher than today's. */
export function maxAfterIncrease(oneRepMax: number, increase: number): number {
  return Math.round(((trainingMax(oneRepMax) + increase) / TRAINING_MAX_RATIO) * 100) / 100;
}

export const EMPTY_MAXES: TrainingMaxes = { squat: null, bench: null, deadlift: null, ohp: null };
