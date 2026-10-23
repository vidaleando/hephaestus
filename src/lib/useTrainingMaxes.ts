import { useCallback, useEffect, useState } from "react";
import { todayISO } from "./lifting";
import { flush, pendingUpsert, write } from "./outbox";
import { EMPTY_MAXES, LIFTS, type TrainingMaxes } from "./programme";
import { KEYS, readLocal, writeLocal } from "./storage";
import { supabase } from "./supabase";

export interface Cycle {
  number: number;
  /** YYYY-MM-DD, or null for a cycle started before tracking existed. */
  startedOn: string | null;
  /** In the optional deload week that follows the three working weeks. */
  deload: boolean;
}

const FIRST_CYCLE: Cycle = { number: 1, startedOn: null, deload: false };

function parse(row: Record<string, unknown>): { maxes: TrainingMaxes; cycle: Cycle } {
  const maxes = { ...EMPTY_MAXES };
  for (const lift of LIFTS) maxes[lift] = row[lift] == null ? null : Number(row[lift]);
  return {
    maxes,
    cycle: {
      number: row.cycle == null ? 1 : Number(row.cycle),
      startedOn: row.cycle_started_on == null ? null : String(row.cycle_started_on),
      deload: row.deload === true,
    },
  };
}

/**
 * Each user's 1-rep maxes (kg) for the four main lifts and their current programme cycle.
 * Saved to Supabase through the offline queue when signed in, on the device otherwise.
 */
export function useTrainingMaxes(userId: string | null, onError: (message: string) => void) {
  const cloud = supabase !== null && userId !== null;
  const [maxes, setMaxes] = useState<TrainingMaxes>(() => (cloud ? EMPTY_MAXES : readLocal(KEYS.maxes, EMPTY_MAXES)));
  // Older device-only saves have no `deload` field
  const loadLocalCycle = () => ({ ...FIRST_CYCLE, ...readLocal<Partial<Cycle>>(KEYS.cycle, FIRST_CYCLE) });
  const [cycle, setCycle] = useState<Cycle>(() => (cloud ? FIRST_CYCLE : loadLocalCycle()));
  const [loading, setLoading] = useState(cloud);

  useEffect(() => {
    if (!supabase || !userId) {
      setMaxes(readLocal(KEYS.maxes, EMPTY_MAXES));
      setCycle(loadLocalCycle());
      setLoading(false);
      return;
    }
    const db = supabase;
    let cancelled = false;
    setLoading(true);

    (async () => {
      await flush(userId);
      const { data, error } = await db
        .from("training_maxes")
        .select("squat, bench, deadlift, ohp, cycle, cycle_started_on, deload")
        .maybeSingle();
      if (cancelled) return;
      // A save made offline wins over what the server (or its cached copy) says
      const row = pendingUpsert(userId, "training_maxes") ?? (error ? null : data);
      if (row) {
        const parsed = parse(row);
        setMaxes(parsed.maxes);
        setCycle(parsed.cycle);
      } else if (error) {
        if (navigator.onLine) onError("Couldn't load your maxes. Check your connection and reopen the app.");
      } else {
        // First sign-in: carry over maxes entered in device-only mode
        const local = readLocal(KEYS.maxes, EMPTY_MAXES);
        if (LIFTS.some((l) => local[l] != null)) {
          const localCycle = loadLocalCycle();
          const { error: upErr } = await db.from("training_maxes").upsert({
            ...local,
            user_id: userId,
            cycle: localCycle.number,
            cycle_started_on: localCycle.startedOn,
            deload: localCycle.deload,
          });
          if (!upErr) {
            setMaxes(local);
            setCycle(localCycle);
          }
        }
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, onError]);

  const persist = useCallback(
    async (nextMaxes: TrainingMaxes, nextCycle: Cycle) => {
      const previous = { maxes, cycle };
      setMaxes(nextMaxes);
      setCycle(nextCycle);
      if (!cloud || !userId) {
        writeLocal(KEYS.maxes, nextMaxes);
        writeLocal(KEYS.cycle, nextCycle);
        return true;
      }
      const result = await write(userId, {
        table: "training_maxes",
        kind: "upsert",
        id: userId,
        row: {
          ...nextMaxes,
          user_id: userId,
          cycle: nextCycle.number,
          cycle_started_on: nextCycle.startedOn,
          deload: nextCycle.deload,
          updated_at: new Date().toISOString(),
        },
      });
      if (result === "failed") {
        setMaxes(previous.maxes);
        setCycle(previous.cycle);
        onError("Couldn't save your maxes. Try again.");
        return false;
      }
      return true;
    },
    [maxes, cycle, cloud, userId, onError],
  );

  const save = useCallback((next: TrainingMaxes) => persist(next, cycle), [persist, cycle]);

  /** Begin the next cycle with new 1-rep maxes. */
  const startNextCycle = useCallback(
    (next: TrainingMaxes) => persist(next, { number: cycle.number + 1, startedOn: todayISO(), deload: false }),
    [persist, cycle],
  );

  /** Go into the deload week at the end of this cycle. */
  const startDeload = useCallback(() => persist(maxes, { ...cycle, deload: true }), [persist, maxes, cycle]);

  return { maxes, cycle, loading, save, startNextCycle, startDeload };
}
