import { useCallback, useEffect, useState } from "react";
import { flush, withPending, write } from "./outbox";
import { KEYS, readLocal, writeLocal } from "./storage";
import { supabase } from "./supabase";
import type { Entry, NewEntry } from "./types";

const COLUMNS =
  "id, exercise, weight, unit, reps, sets, performed_on, created_at, program_week, program_day, set_results, amrap_reps, cycle";

function fromRow(row: Record<string, unknown>): Entry {
  return {
    id: String(row.id),
    exercise: String(row.exercise),
    weight: Number(row.weight),
    unit: row.unit === "lb" ? "lb" : "kg",
    reps: Number(row.reps),
    sets: Number(row.sets),
    performed_on: String(row.performed_on),
    created_at: String(row.created_at),
    program_week: row.program_week == null ? null : Number(row.program_week),
    program_day: row.program_day == null ? null : Number(row.program_day),
    set_results: Array.isArray(row.set_results) ? row.set_results.map(Boolean) : null,
    amrap_reps: row.amrap_reps == null ? null : Number(row.amrap_reps),
    cycle: row.cycle == null ? null : Number(row.cycle),
  };
}

const loadLocal = () => readLocal<Entry[]>(KEYS.entries, []);
const saveLocal = (entries: Entry[]) => writeLocal(KEYS.entries, entries);

/**
 * The signed-in user's log from Supabase, or this device's log when there is no user.
 * Anything logged on the device before signing in is uploaded on first sign-in. Writes go
 * through the offline queue, so changes made with no signal sync later.
 */
export function useEntries(userId: string | null, onError: (message: string) => void) {
  const cloud = supabase !== null && userId !== null;
  const [entries, setEntries] = useState<Entry[]>(() => (cloud ? [] : loadLocal()));
  const [loading, setLoading] = useState(cloud);

  useEffect(() => {
    if (!supabase || !userId) {
      setEntries(loadLocal());
      setLoading(false);
      return;
    }
    const db = supabase;
    let cancelled = false;
    setLoading(true);

    (async () => {
      const local = loadLocal();
      if (local.length) {
        const { error } = await db.from("entries").upsert(local);
        if (!error) saveLocal([]);
      }
      await flush(userId);
      const { data, error } = await db
        .from("entries")
        .select(COLUMNS)
        .order("performed_on", { ascending: false })
        .order("created_at", { ascending: false });
      if (cancelled) return;
      // Offline with nothing cached: show at least what's waiting to sync
      setEntries(withPending(userId, "entries", error ? [] : data.map(fromRow)));
      if (error && navigator.onLine) onError("Couldn't load your log. Check your connection and reopen the app.");
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, onError]);

  const add = useCallback(
    async (input: NewEntry) => {
      const entry: Entry = { ...input, id: crypto.randomUUID(), created_at: new Date().toISOString() };
      const next = [...entries, entry];
      setEntries(next);
      if (!cloud || !userId) {
        saveLocal(next);
        return true;
      }
      if ((await write(userId, { table: "entries", kind: "insert", id: entry.id, row: { ...entry } })) === "failed") {
        setEntries((prev) => prev.filter((e) => e.id !== entry.id));
        onError("Couldn't save that entry. Try again.");
        return false;
      }
      return true;
    },
    [entries, cloud, userId, onError],
  );

  const remove = useCallback(
    async (id: string) => {
      const target = entries.find((e) => e.id === id);
      if (!target) return;
      const next = entries.filter((e) => e.id !== id);
      setEntries(next);
      if (!cloud || !userId) {
        saveLocal(next);
        return;
      }
      if ((await write(userId, { table: "entries", kind: "delete", id })) === "failed") {
        setEntries((prev) => [...prev, target]);
        onError("Couldn't delete that entry. Try again.");
      }
    },
    [entries, cloud, userId, onError],
  );

  const update = useCallback(
    async (id: string, input: NewEntry) => {
      const target = entries.find((e) => e.id === id);
      if (!target) return false;
      const updated: Entry = { ...target, ...input };
      const next = entries.map((e) => (e.id === id ? updated : e));
      setEntries(next);
      if (!cloud || !userId) {
        saveLocal(next);
        return true;
      }
      if ((await write(userId, { table: "entries", kind: "update", id, patch: { ...input } })) === "failed") {
        setEntries((prev) => prev.map((e) => (e.id === id ? target : e)));
        onError("Couldn't save your changes. Try again.");
        return false;
      }
      return true;
    },
    [entries, cloud, userId, onError],
  );

  return { entries, loading, add, update, remove, cloud };
}
