import type { Entry, Unit } from "./types";

const KG_PER_LB = 0.45359237;

export function convert(weight: number, from: Unit, to: Unit): number {
  if (from === to) return weight;
  return from === "kg" ? weight / KG_PER_LB : weight * KG_PER_LB;
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function fmt(n: number): string {
  return round1(n).toLocaleString(undefined, { maximumFractionDigits: 1 });
}

/** Epley estimate of a one-rep max. */
export function estimated1RM(weight: number, reps: number): number {
  return reps <= 1 ? weight : weight * (1 + reps / 30);
}

export function todayISO(): string {
  return new Date().toLocaleDateString("en-CA");
}

export function niceDate(iso: string, opts?: Intl.DateTimeFormatOptions): string {
  return new Date(iso + "T12:00:00").toLocaleDateString(
    undefined,
    opts ?? { weekday: "short", month: "short", day: "numeric" },
  );
}

export function sameExercise(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function compareAsc(a: Entry, b: Entry): number {
  if (a.performed_on !== b.performed_on) return a.performed_on < b.performed_on ? -1 : 1;
  return a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0;
}

/** Newest first. */
export function sortEntries(entries: Entry[]): Entry[] {
  return [...entries].sort((a, b) => compareAsc(b, a));
}

/** Distinct exercise names, most recently used first, keeping the first spelling seen. */
export function exerciseNames(entries: Entry[]): string[] {
  const seen = new Map<string, string>();
  for (const e of sortEntries(entries)) {
    const key = e.exercise.toLowerCase();
    if (!seen.has(key)) seen.set(key, e.exercise);
  }
  return [...seen.values()];
}

/** Entries whose weight beat every earlier entry of the same exercise. */
export function personalRecords(entries: Entry[]): Set<string> {
  const ids = new Set<string>();
  const best = new Map<string, number>();
  for (const e of [...entries].sort(compareAsc)) {
    const key = e.exercise.toLowerCase();
    const kg = convert(e.weight, e.unit, "kg");
    const prev = best.get(key);
    if (prev === undefined) best.set(key, kg);
    else if (kg > prev) {
      best.set(key, kg);
      ids.add(e.id);
    }
  }
  return ids;
}
