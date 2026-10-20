// Small JSON wrapper around localStorage that never throws (private mode, blocked storage).
export function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function writeLocal(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable; the app keeps working for this session.
  }
}

export const KEYS = {
  entries: "hephaestus.entries",
  bodyweights: "hephaestus.bodyweights",
  unit: "hephaestus.unit",
  tab: "hephaestus.tab",
  deviceOnly: "hephaestus.deviceOnly",
  maxes: "hephaestus.maxes",
  cycle: "hephaestus.cycle",
  week: "hephaestus.week",
  day: "hephaestus.day",
  logMode: "hephaestus.logMode",
  progressMode: "hephaestus.progressMode",
  progressLift: "hephaestus.progressLift",
  installDismissed: "hephaestus.installDismissed",
} as const;
