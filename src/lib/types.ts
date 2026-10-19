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
}

export type NewEntry = Omit<Entry, "id" | "created_at">;
