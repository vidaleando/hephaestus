import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import { KEYS, readLocal, writeLocal } from "./storage";
import type { Entry, NewEntry } from "./types";

const COLUMNS = "id, exercise, weight, unit, reps, sets, performed_on, created_at";

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
  };
}

const loadLocal = () => readLocal<Entry[]>(KEYS.entries, []);
const saveLocal = (entries: Entry[]) => writeLocal(KEYS.entries, entries);

/**
 * The signed-in user's log from Supabase, or this device's log when there is no user.
 * Anything logged on the device before signing in is uploaded on first sign-in.
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
      const { data, error } = await db
        .from("entries")
        .select(COLUMNS)
        .order("performed_on", { ascending: false })
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (error) onError("Couldn't load your log. Check your connection and reopen the app.");
      else setEntries(data.map(fromRow));
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
      if (!cloud || !supabase) {
        saveLocal(next);
        return true;
      }
      const { error } = await supabase.from("entries").insert(entry);
      if (error) {
        setEntries((prev) => prev.filter((e) => e.id !== entry.id));
        onError("Couldn't save that entry. Check your connection and try again.");
        return false;
      }
      return true;
    },
    [entries, cloud, onError],
  );

  const remove = useCallback(
    async (id: string) => {
      const target = entries.find((e) => e.id === id);
      if (!target) return;
      const next = entries.filter((e) => e.id !== id);
      setEntries(next);
      if (!cloud || !supabase) {
        saveLocal(next);
        return;
      }
      const { error } = await supabase.from("entries").delete().eq("id", id);
      if (error) {
        setEntries((prev) => [...prev, target]);
        onError("Couldn't delete that entry. Check your connection and try again.");
      }
    },
    [entries, cloud, onError],
  );

  return { entries, loading, add, remove, cloud };
}
