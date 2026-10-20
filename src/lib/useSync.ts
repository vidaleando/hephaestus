import { useEffect, useState } from "react";
import { flush, onOutboxChange, onOutboxFailure, pendingCount } from "./outbox";

/**
 * Keeps the offline queue moving: retries when the browser comes back online, when the app
 * returns to the foreground, and every 30 s while anything is waiting (phones can report
 * "online" on Wi-Fi with no internet). Returns how many changes are waiting.
 */
export function useSync(userId: string | null, onFailure: (count: number) => void) {
  const [pending, setPending] = useState(() => (userId ? pendingCount(userId) : 0));
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    if (!userId) {
      setPending(0);
      return;
    }
    const update = () => setPending(pendingCount(userId));
    const sync = () => {
      setOnline(navigator.onLine);
      if (navigator.onLine && pendingCount(userId)) void flush(userId);
    };
    const onVisible = () => document.visibilityState === "visible" && sync();

    update();
    sync();
    const offChange = onOutboxChange(update);
    const offFailure = onOutboxFailure(onFailure);
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    document.addEventListener("visibilitychange", onVisible);
    const timer = setInterval(sync, 30_000);
    return () => {
      offChange();
      offFailure();
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(timer);
    };
  }, [userId, onFailure]);

  return { pending, online };
}
