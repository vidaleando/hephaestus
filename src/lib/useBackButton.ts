import { useEffect, useRef } from "react";

// The phone's back button and the app's own screens share one stack. Each open screen
// (a sub-screen, a dialog, a non-home tab) adds a history entry; the back button pops the
// top one and closes that screen. Closing a screen from inside the app removes its entry,
// so history never fills with stale steps that lead outside the app.

interface Layer {
  close: () => void;
  popped: boolean;
}

const layers: Layer[] = [];
const rootListeners = new Set<() => void>();

// In the installed app, back on the home screen must not leave: on some phones (Firefox on
// Android) leaving an installed web app shows a black screen instead of closing it. A guard
// entry sits under everything; back at the top level lands on it and a new guard is added.
//
// Browsers skip history entries a page adds before the user has interacted with it (so sites
// can't trap the back button), so a guard only counts if it's added during a tap or key press.
// One is added on the first tap, and again on the next tap after each use.

/** Launches from the home-screen icon open /?source=pwa (see the manifest's start_url). */
function launchedFromHomeScreen(): boolean {
  const params = new URLSearchParams(location.search);
  if (params.get("source") === "pwa") {
    try {
      sessionStorage.setItem("hephaestus.installed", "1");
    } catch {
      // Storage blocked; the display-mode check below still applies
    }
    params.delete("source");
    const rest = params.toString();
    history.replaceState(history.state, "", location.pathname + (rest ? `?${rest}` : "") + location.hash);
    return true;
  }
  try {
    return sessionStorage.getItem("hephaestus.installed") === "1";
  } catch {
    return false;
  }
}

const installed =
  launchedFromHomeScreen() ||
  ["standalone", "fullscreen", "minimal-ui"].some((m) => window.matchMedia(`(display-mode: ${m})`).matches) ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

let guardNeeded = installed;

function addGuard() {
  if (!guardNeeded) return;
  guardNeeded = false;
  inOrder(() => history.pushState({ hephaestus: "guard" }, ""));
}

if (installed) {
  // Capture phase, so the guard goes in before whatever the tap opens
  window.addEventListener("pointerdown", addGuard, true);
  window.addEventListener("keydown", addGuard, true);
}

// history.back() completes asynchronously (with a popstate), so history changes are run
// strictly in order: anything requested while one of our own "back" steps is in flight waits.
let ownBacks = 0;
let queued: (() => void)[] = [];
let safety: ReturnType<typeof setTimeout> | undefined;

function drain() {
  ownBacks = 0;
  clearTimeout(safety);
  const ops = queued;
  queued = [];
  ops.forEach((op) => op());
}

function inOrder(op: () => void) {
  if (ownBacks > 0) queued.push(op);
  else op();
}

function ownBack() {
  ownBacks++;
  history.back();
  // If the browser had nothing to go back to, no popstate comes; don't wait forever
  clearTimeout(safety);
  safety = setTimeout(drain, 600);
}

window.addEventListener("popstate", () => {
  if (ownBacks > 0) {
    if (--ownBacks === 0) drain();
    return;
  }
  const top = layers.pop();
  if (top) {
    top.popped = true;
    top.close();
  } else if (installed) {
    // Back at the top level used up a guard: stay in the app, and add a fresh guard on the
    // next tap. Pushing one right away too costs nothing where the browser honours it.
    history.pushState({ hephaestus: "guard" }, "");
    guardNeeded = true;
    rootListeners.forEach((l) => l());
  }
});

/** Called when back is pressed at the app's top level in the installed app (which stays put). */
export function onRootBack(listener: () => void): () => void {
  rootListeners.add(listener);
  return () => rootListeners.delete(listener);
}

/** While `active`, the phone's back button calls `onBack` instead of leaving the screen. */
export function useBackButton(active: boolean, onBack: () => void) {
  const latest = useRef(onBack);
  useEffect(() => {
    latest.current = onBack;
  });

  useEffect(() => {
    if (!active) return;
    const layer: Layer = { close: () => latest.current(), popped: false };
    layers.push(layer);
    inOrder(() => history.pushState({ hephaestus: true }, ""));
    return () => {
      if (layer.popped) return;
      // Closed from inside the app: drop its history entry too
      const i = layers.indexOf(layer);
      if (i >= 0) layers.splice(i, 1);
      inOrder(ownBack);
    };
  }, [active]);
}
