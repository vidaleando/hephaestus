export type Unit = "kg" | "lb";

export interface Entry {
  id: string;
  exercise: string;
  /** In `unit`. 0 means bodyweight. */
  weight: number;
  unit: Unit;
  reps: number;
  sets: number;
  /** Local date, YYYY-MM-DD. */
  performed_on: string;
  created_at: string;
  /** Set when the entry was logged from the programme. */
  program_week?: number | null;
  program_day?: number | null;
  /** For a 5/3/1 lift: whether each of the three main sets was completed. */
  set_results?: boolean[] | null;
  /** For a 5/3/1 lift: reps achieved on the last (+) set. */
  amrap_reps?: number | null;
  /** The programme cycle this entry belongs to (programme entries only). */
  cycle?: number | null;
}

export type NewEntry = Omit<Entry, "id" | "created_at">;

export interface Bodyweight {
  id: string;
  /** In `unit`. */
  weight: number;
  unit: Unit;
  /** Local date, YYYY-MM-DD. */
  measured_on: string;
  created_at: string;
}

export type NewBodyweight = Omit<Bodyweight, "id" | "created_at">;
