import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { HistoryView } from "./components/HistoryView";
import { LogView } from "./components/LogView";
import { ProgrammeView } from "./components/ProgrammeView";
import { Segmented } from "./components/Segmented";
import { SignIn } from "./components/SignIn";
import { personalRecords } from "./lib/lifting";
import { KEYS } from "./lib/storage";
import { supabase } from "./lib/supabase";
import type { Unit } from "./lib/types";
import { signOut, useAuth } from "./lib/useAuth";
import { useBodyweights } from "./lib/useBodyweights";
import { useEntries } from "./lib/useEntries";
import { useTrainingMaxes } from "./lib/useTrainingMaxes";
import { usePersistentState } from "./lib/usePersistentState";

// Chart screens load on demand so the charting library stays out of the first download
const BodyView = lazy(() => import("./components/BodyView").then((m) => ({ default: m.BodyView })));
const ProgressView = lazy(() => import("./components/ProgressView").then((m) => ({ default: m.ProgressView })));

const TABS = [
  { id: "programme", label: "Programme" },
  { id: "log", label: "Log" },
  { id: "body", label: "Body" },
  { id: "progress", label: "Progress" },
] as const;
type Tab = (typeof TABS)[number]["id"];

type LogMode = "today" | "history";
const LOG_MODES = [
  { value: "today" as LogMode, label: "Add" },
  { value: "history" as LogMode, label: "History" },
];

export default function App() {
  const { session, loading: authLoading } = useAuth();
  const [deviceOnly, setDeviceOnly] = usePersistentState(KEYS.deviceOnly, false);
  const [unit, setUnit] = usePersistentState<Unit>(KEYS.unit, "kg");
  const [storedTab, setTab] = usePersistentState<Tab | "history">(KEYS.tab, "programme");
  // History used to be its own tab; it now lives inside Log
  const tab: Tab = storedTab === "history" ? "log" : storedTab;
  const [logMode, setLogMode] = usePersistentState<LogMode>(KEYS.logMode, "today");

  const [toastMsg, setToastMsg] = useState<{ text: string; key: number } | null>(null);
  const toast = useCallback((text: string) => setToastMsg({ text, key: Date.now() }), []);
  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(null), 2400);
    return () => clearTimeout(t);
  }, [toastMsg]);

  const userId = session?.user.id ?? null;
  const { entries, loading, add, update, remove, cloud } = useEntries(userId, toast);
  const { maxes, loading: maxesLoading, save: saveMaxes } = useTrainingMaxes(userId, toast);
  const { weights, loading: weightsLoading, add: addWeight, remove: removeWeight } = useBodyweights(userId, toast);
  const prs = useMemo(() => personalRecords(entries), [entries]);

  const needsSignIn = supabase !== null && !authLoading && !session && !deviceOnly;
  const busy = authLoading || loading || maxesLoading || weightsLoading;

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
          ) : tab === "programme" ? (
            <ProgrammeView
              entries={entries}
              maxes={maxes}
              onSaveMaxes={saveMaxes}
              onAdd={add}
              onUpdate={update}
              toast={toast}
            />
          ) : tab === "log" ? (
            <>
              <div className="mode-bar">
                <Segmented label="Log" hideLabel options={LOG_MODES} value={logMode} onChange={setLogMode} />
              </div>
              {logMode === "today" ? (
                <LogView
                  entries={entries}
                  unit={unit}
                  prs={prs}
                  onToggleUnit={() => setUnit(unit === "kg" ? "lb" : "kg")}
                  onAdd={add}
                  onRemove={remove}
                  toast={toast}
                />
              ) : (
                <HistoryView entries={entries} unit={unit} prs={prs} onRemove={remove} />
              )}
            </>
          ) : (
            <Suspense fallback={<p className="loading">Loading…</p>}>
              {tab === "body" ? (
                <BodyView
                  weights={weights}
                  unit={unit}
                  onToggleUnit={() => setUnit(unit === "kg" ? "lb" : "kg")}
                  onAdd={addWeight}
                  onRemove={removeWeight}
                  toast={toast}
                />
              ) : (
                <ProgressView entries={entries} unit={unit} maxes={maxes} />
              )}
            </Suspense>
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
