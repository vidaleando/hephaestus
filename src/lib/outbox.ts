// Every write to Supabase goes through this queue. A write that fails because there's no
// connection stays queued on the device (localStorage) and is retried when the browser
// comes back online, in the order it was made. The UI updates straight away either way.
import { readLocal, writeLocal } from "./storage";
import { supabase } from "./supabase";

export type Change =
  | { table: string; kind: "insert"; id: string; row: Record<string, unknown> }
  | { table: string; kind: "update"; id: string; patch: Record<string, unknown> }
  | { table: string; kind: "delete"; id: string }
  /** Insert-or-replace keyed by the table's primary key (training_maxes: user_id). */
  | { table: string; kind: "upsert"; id: string; row: Record<string, unknown> };

type Op = Change & { uid: string };

export type WriteResult = "saved" | "queued" | "failed";

const key = (userId: string) => `hephaestus.outbox.${userId}`;
const load = (userId: string) => readLocal<Op[]>(key(userId), []);
const store = (userId: string, ops: Op[]) => writeLocal(key(userId), ops);

const listeners = new Set<() => void>();
const failureListeners = new Set<(count: number) => void>();
const notify = () => listeners.forEach((l) => l());
/** Changes the server rejected during this page load, by uid. */
const rejected = new Set<string>();

/** Subscribe to queue changes; returns an unsubscribe function. */
export function onOutboxChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Called with how many queued changes the server rejected (not connection problems). */
export function onOutboxFailure(listener: (count: number) => void): () => void {
  failureListeners.add(listener);
  return () => failureListeners.delete(listener);
}

export function pendingCount(userId: string): number {
  return load(userId).length;
}

function isNetworkError(error: { message?: string } | null): boolean {
  if (!navigator.onLine) return true;
  // Chrome, Firefox and Safari word a failed fetch differently
  return /failed to fetch|networkerror|load failed|network request failed|fetch failed/i.test(error?.message ?? "");
}

async function send(op: Op): Promise<"ok" | "network" | "rejected"> {
  if (!supabase) return "rejected";
  try {
    const t = supabase.from(op.table);
    const { error } =
      op.kind === "insert"
        ? await t.insert(op.row)
        : op.kind === "update"
          ? await t.update(op.patch).eq("id", op.id)
          : op.kind === "delete"
            ? await t.delete().eq("id", op.id)
            : await t.upsert(op.row);
    if (!error) return "ok";
    // A retried insert whose first attempt reached the server
    if (op.kind === "insert" && error.code === "23505") return "ok";
    return isNetworkError(error) ? "network" : "rejected";
  } catch (err) {
    return isNetworkError(err as Error) ? "network" : "rejected";
  }
}

const running = new Map<string, Promise<void>>();

/** Send queued changes in order until the queue is empty or the connection drops. */
export function flush(userId: string): Promise<void> {
  const current = running.get(userId);
  if (current) return current.then(() => flush(userId));

  const job = (async () => {
    let failures = 0;
    for (;;) {
      const [head] = load(userId);
      if (!head) break;
      const outcome = await send(head);
      if (outcome === "network") break;
      if (outcome === "rejected") {
        failures++;
        rejected.add(head.uid);
      }
      // Re-read: more changes may have been queued while this one was in flight
      store(
        userId,
        load(userId).filter((o) => o.uid !== head.uid),
      );
      notify();
    }
    if (failures) failureListeners.forEach((l) => l(failures));
  })().finally(() => running.delete(userId));

  running.set(userId, job);
  return job;
}

/** Queue a change and try to send it now. */
export async function write(userId: string, change: Change): Promise<WriteResult> {
  const op: Op = { ...change, uid: crypto.randomUUID() };
  store(userId, [...load(userId), op]);
  notify();
  await flush(userId);
  if (load(userId).some((o) => o.uid === op.uid)) return "queued";
  return rejected.has(op.uid) ? "failed" : "saved";
}

/** Apply queued changes for `table` on top of rows loaded from the server (or its offline copy). */
export function withPending<T extends { id: string }>(userId: string, table: string, rows: T[]): T[] {
  let out = [...rows];
  for (const op of load(userId)) {
    if (op.table !== table) continue;
    if (op.kind === "insert" || op.kind === "upsert") {
      if (!out.some((r) => r.id === op.id)) out.push(op.row as unknown as T);
    } else if (op.kind === "update") {
      out = out.map((r) => (r.id === op.id ? ({ ...r, ...op.patch } as T) : r));
    } else {
      out = out.filter((r) => r.id !== op.id);
    }
  }
  return out;
}

/** The latest queued upsert for a table, e.g. maxes saved while offline. */
export function pendingUpsert(userId: string, table: string): Record<string, unknown> | null {
  const ops = load(userId).filter((o) => o.table === table && o.kind === "upsert");
  const last = ops[ops.length - 1];
  return last && last.kind === "upsert" ? last.row : null;
}
