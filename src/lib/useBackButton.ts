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
  }
});

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
