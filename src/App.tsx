import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { About } from "./components/About";
import { HistoryView } from "./components/HistoryView";
import { InstallBanner } from "./components/InstallBanner";
import { LogView } from "./components/LogView";
import { ProgrammeView } from "./components/ProgrammeView";
import { Segmented } from "./components/Segmented";
import { SignIn } from "./components/SignIn";
import { Splash } from "./components/Splash";
import { personalRecords } from "./lib/lifting";
import { KEYS } from "./lib/storage";
import { supabase } from "./lib/supabase";
import type { Unit } from "./lib/types";
import { signOut, useAuth } from "./lib/useAuth";
import { useBodyweights } from "./lib/useBodyweights";
import { onRootBack, useBackButton } from "./lib/useBackButton";
import { useEntries } from "./lib/useEntries";
import { useSync } from "./lib/useSync";
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

const DATA_CACHE = "supabase-data";

async function handleSignOut() {
  await signOut();
  // Drop the offline copy of this person's data so the next person on this device can't see it
  if ("caches" in window) await caches.delete(DATA_CACHE).catch(() => false);
}

export default function App() {
  const { session, loading: authLoading } = useAuth();
  const [deviceOnly, setDeviceOnly] = usePersistentState(KEYS.deviceOnly, false);
  const [unit, setUnit] = usePersistentState<Unit>(KEYS.unit, "kg");
  const [storedTab, setTab] = usePersistentState<Tab | "history">(KEYS.tab, "programme");
  // History used to be its own tab; it now lives inside Log
  const tab: Tab = storedTab === "history" ? "log" : storedTab;
  const [logMode, setLogMode] = usePersistentState<LogMode>(KEYS.logMode, "today");
  const [aboutOpen, setAboutOpen] = useState(false);

  // Back from Log, Body or Progress returns to Programme; back in Programme leaves the app
  useBackButton(tab !== "programme", () => setTab("programme"));
  useBackButton(aboutOpen, () => setAboutOpen(false));

  const [toastMsg, setToastMsg] = useState<{ text: string; key: number } | null>(null);
  const toast = useCallback((text: string) => setToastMsg({ text, key: Date.now() }), []);
  useEffect(() => onRootBack(() => toast("To leave Hephaestus, use your phone's Home button.")), [toast]);
  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(null), 2400);
    return () => clearTimeout(t);
  }, [toastMsg]);

  const userId = session?.user.id ?? null;
  const { entries, loading, add, update, remove, cloud } = useEntries(userId, toast);
  const {
    maxes,
    cycle,
    loading: maxesLoading,
    save: saveMaxes,
    startNextCycle,
    startDeload,
  } = useTrainingMaxes(userId, toast);
  const { weights, loading: weightsLoading, add: addWeight, remove: removeWeight } = useBodyweights(userId, toast);
  const prs = useMemo(() => personalRecords(entries), [entries]);

  const onSyncFailure = useCallback(
    (count: number) =>
      toast(
        count === 1
          ? "One change made offline couldn't be saved. Reopen the app to see your latest data."
          : `${count} changes made offline couldn't be saved. Reopen the app to see your latest data.`,
      ),
    [toast],
  );
  const { pending, online } = useSync(cloud ? userId : null, onSyncFailure);
  const syncStatus = !cloud
    ? "This device only"
    : pending > 0
      ? `${pending} to sync`
      : online
        ? "Synced"
        : "Offline";

  const needsSignIn = supabase !== null && !authLoading && !session && !deviceOnly;
  const busy = authLoading || loading || maxesLoading || weightsLoading;

  function show(next: Tab) {
    setTab(next);
    window.scrollTo(0, 0);
  }

  if (busy && !needsSignIn) return <Splash />;

  return (
    <>
      <header className="top">
        <div className="wrap">
          <h1>
            <button type="button" className="logo" onClick={() => setAboutOpen(true)} aria-haspopup="dialog">
              Hephaestus
            </button>
          </h1>
          <div className="account">
            <span className="status" data-mode={!cloud ? "local" : pending > 0 || !online ? "pending" : "cloud"}>
              {syncStatus}
            </span>
            {cloud ? (
              <button type="button" className="link" onClick={handleSignOut}>
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
          ) : tab === "programme" ? (
            <>
              <InstallBanner />
              <ProgrammeView
                entries={entries}
                maxes={maxes}
                cycle={cycle}
                onSaveMaxes={saveMaxes}
                onStartCycle={startNextCycle}
                onStartDeload={startDeload}
                onAdd={add}
                onUpdate={update}
                toast={toast}
              />
            </>
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
                <ProgressView
                  entries={entries}
                  unit={unit}
                  maxes={maxes}
                  cycle={cycle.number}
                  weights={weights}
                  prs={prs}
                  onRemove={remove}
                  toast={toast}
                />
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

      <About open={aboutOpen} onClose={() => setAboutOpen(false)} />

      <div className="toast" role="status" hidden={!toastMsg} key={toastMsg?.key}>
        {toastMsg?.text}
      </div>
    </>
  );
}
