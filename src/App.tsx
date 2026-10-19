import { useCallback, useEffect, useMemo, useState } from "react";
import { HistoryView } from "./components/HistoryView";
import { LogView } from "./components/LogView";
import { ProgressView } from "./components/ProgressView";
import { SignIn } from "./components/SignIn";
import { personalRecords } from "./lib/lifting";
import { KEYS } from "./lib/storage";
import { supabase } from "./lib/supabase";
import type { Unit } from "./lib/types";
import { signOut, useAuth } from "./lib/useAuth";
import { useEntries } from "./lib/useEntries";
import { usePersistentState } from "./lib/usePersistentState";

const TABS = [
  { id: "log", label: "Log" },
  { id: "history", label: "History" },
  { id: "progress", label: "Progress" },
] as const;
type Tab = (typeof TABS)[number]["id"];

export default function App() {
  const { session, loading: authLoading } = useAuth();
  const [deviceOnly, setDeviceOnly] = usePersistentState(KEYS.deviceOnly, false);
  const [unit, setUnit] = usePersistentState<Unit>(KEYS.unit, "kg");
  const [tab, setTab] = usePersistentState<Tab>(KEYS.tab, "log");

  const [toastMsg, setToastMsg] = useState<{ text: string; key: number } | null>(null);
  const toast = useCallback((text: string) => setToastMsg({ text, key: Date.now() }), []);
  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(null), 2400);
    return () => clearTimeout(t);
  }, [toastMsg]);

  const userId = session?.user.id ?? null;
  const { entries, loading, add, remove, cloud } = useEntries(userId, toast);
  const prs = useMemo(() => personalRecords(entries), [entries]);

  const needsSignIn = supabase !== null && !authLoading && !session && !deviceOnly;
  const busy = authLoading || loading;

  function show(next: Tab) {
    setTab(next);
    window.scrollTo(0, 0);
  }

  return (
    <>
      <header className="top">
        <div className="wrap">
          <h1>Hephaestus</h1>
          <div className="account">
            <span className="status" data-mode={cloud ? "cloud" : "local"}>
              {cloud ? "Synced" : "This device only"}
            </span>
            {cloud ? (
              <button type="button" className="link" onClick={() => signOut()}>
                Sign out
              </button>
            ) : supabase && deviceOnly ? (
              <button type="button" className="link" onClick={() => setDeviceOnly(false)}>
                Sign in
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <main>
        <div className="wrap">
          {needsSignIn ? (
            <SignIn onSkip={() => setDeviceOnly(true)} />
          ) : busy ? (
            <p className="loading">Loading your log…</p>
          ) : tab === "log" ? (
            <LogView
              entries={entries}
              unit={unit}
              prs={prs}
              onToggleUnit={() => setUnit(unit === "kg" ? "lb" : "kg")}
              onAdd={add}
              onRemove={remove}
              toast={toast}
            />
          ) : tab === "history" ? (
            <HistoryView entries={entries} unit={unit} prs={prs} onRemove={remove} />
          ) : (
            <ProgressView entries={entries} unit={unit} />
          )}
        </div>
      </main>

      {!needsSignIn && (
        <nav className="tabs" aria-label="Sections">
          <div className="inner" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                className="tab"
                aria-selected={tab === t.id}
                onClick={() => show(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </nav>
      )}

      <div className="toast" role="status" hidden={!toastMsg} key={toastMsg?.key}>
        {toastMsg?.text}
      </div>
    </>
  );
}
