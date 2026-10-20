import { useCallback, useEffect, useState } from "react";
import { flush, withPending, write } from "./outbox";
import { KEYS, readLocal, writeLocal } from "./storage";
import { supabase } from "./supabase";
import type { Bodyweight, NewBodyweight } from "./types";

const COLUMNS = "id, weight, unit, measured_on, created_at";

function fromRow(row: Record<string, unknown>): Bodyweight {
  return {
    id: String(row.id),
    weight: Number(row.weight),
    unit: row.unit === "lb" ? "lb" : "kg",
    measured_on: String(row.measured_on),
    created_at: String(row.created_at),
  };
}

const loadLocal = () => readLocal<Bodyweight[]>(KEYS.bodyweights, []);
const saveLocal = (rows: Bodyweight[]) => writeLocal(KEYS.bodyweights, rows);

/** The user's weigh-ins from Supabase (through the offline queue), or this device's when there is no user. */
export function useBodyweights(userId: string | null, onError: (message: string) => void) {
  const cloud = supabase !== null && userId !== null;
  const [weights, setWeights] = useState<Bodyweight[]>(() => (cloud ? [] : loadLocal()));
  const [loading, setLoading] = useState(cloud);

  useEffect(() => {
    if (!supabase || !userId) {
      setWeights(loadLocal());
      setLoading(false);
      return;
    }
    const db = supabase;
    let cancelled = false;
    setLoading(true);

    (async () => {
      const local = loadLocal();
      if (local.length) {
        const { error } = await db.from("bodyweights").upsert(local);
        if (!error) saveLocal([]);
      }
      await flush(userId);
      const { data, error } = await db
        .from("bodyweights")
        .select(COLUMNS)
        .order("measured_on", { ascending: false })
        .order("created_at", { ascending: false });
      if (cancelled) return;
      setWeights(withPending(userId, "bodyweights", error ? [] : data.map(fromRow)));
      if (error && navigator.onLine) onError("Couldn't load your body weights. Check your connection and reopen the app.");
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, onError]);

  const add = useCallback(
    async (input: NewBodyweight) => {
      const row: Bodyweight = { ...input, id: crypto.randomUUID(), created_at: new Date().toISOString() };
      const next = [...weights, row];
      setWeights(next);
      if (!cloud || !userId) {
        saveLocal(next);
        return true;
      }
      if ((await write(userId, { table: "bodyweights", kind: "insert", id: row.id, row: { ...row } })) === "failed") {
        setWeights((prev) => prev.filter((w) => w.id !== row.id));
        onError("Couldn't save that weight. Try again.");
        return false;
      }
      return true;
    },
    [weights, cloud, userId, onError],
  );

  const remove = useCallback(
    async (id: string) => {
      const target = weights.find((w) => w.id === id);
      if (!target) return;
      const next = weights.filter((w) => w.id !== id);
      setWeights(next);
      if (!cloud || !userId) {
        saveLocal(next);
        return;
      }
      if ((await write(userId, { table: "bodyweights", kind: "delete", id })) === "failed") {
        setWeights((prev) => [...prev, target]);
        onError("Couldn't delete that weight. Try again.");
      }
    },
    [weights, cloud, userId, onError],
  );

  return { weights, loading, add, remove };
}
