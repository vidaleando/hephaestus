import { useCallback, useEffect, useState } from "react";
import { EMPTY_MAXES, LIFTS, type TrainingMaxes } from "./programme";
import { KEYS, readLocal, writeLocal } from "./storage";
import { supabase } from "./supabase";

/** Each user's 1-rep maxes (kg) for the four main lifts. Saved to Supabase when signed in. */
export function useTrainingMaxes(userId: string | null, onError: (message: string) => void) {
  const cloud = supabase !== null && userId !== null;
  const [maxes, setMaxes] = useState<TrainingMaxes>(() =>
    cloud ? EMPTY_MAXES : readLocal(KEYS.maxes, EMPTY_MAXES),
  );
  const [loading, setLoading] = useState(cloud);

  useEffect(() => {
    if (!supabase || !userId) {
      setMaxes(readLocal(KEYS.maxes, EMPTY_MAXES));
      setLoading(false);
      return;
    }
    const db = supabase;
    let cancelled = false;
    setLoading(true);

    (async () => {
      const { data, error } = await db.from("training_maxes").select("squat, bench, deadlift, ohp").maybeSingle();
      if (cancelled) return;
      if (error) {
        onError("Couldn't load your maxes. Check your connection and reopen the app.");
      } else if (data) {
        const next = { ...EMPTY_MAXES };
        for (const lift of LIFTS) next[lift] = data[lift] == null ? null : Number(data[lift]);
        setMaxes(next);
      } else {
        // First sign-in: carry over maxes entered in device-only mode
        const local = readLocal(KEYS.maxes, EMPTY_MAXES);
        if (LIFTS.some((l) => local[l] != null)) {
          const { error: upErr } = await db.from("training_maxes").upsert({ ...local, user_id: userId });
          if (!upErr) setMaxes(local);
        }
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, onError]);

  const save = useCallback(
    async (next: TrainingMaxes) => {
      const previous = maxes;
      setMaxes(next);
      if (!cloud || !supabase || !userId) {
        writeLocal(KEYS.maxes, next);
        return true;
      }
      const { error } = await supabase
        .from("training_maxes")
        .upsert({ ...next, user_id: userId, updated_at: new Date().toISOString() });
      if (error) {
        setMaxes(previous);
        onError("Couldn't save your maxes. Check your connection and try again.");
        return false;
      }
      return true;
    },
    [maxes, cloud, userId, onError],
  );

  return { maxes, loading, save };
}
