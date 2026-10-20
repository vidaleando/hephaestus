import { KEYS } from "../lib/storage";
import { useInstallPrompt } from "../lib/useInstallPrompt";
import { usePersistentState } from "../lib/usePersistentState";

/** Suggests adding the app to the home screen until it's installed or dismissed. */
export function InstallBanner() {
  const { mode, install } = useInstallPrompt();
  const [dismissed, setDismissed] = usePersistentState(KEYS.installDismissed, false);
  if (!mode || dismissed) return null;

  return (
    <div className="notice install">
      {mode === "prompt" ? (
        <>
          <p>Install Hephaestus on your home screen. It opens like an app and works with poor signal.</p>
          <div className="notice-actions">
            <button type="button" className="link" onClick={install}>
              Install
            </button>
            <button type="button" className="link muted" onClick={() => setDismissed(true)}>
              Not now
            </button>
          </div>
        </>
      ) : (
        <>
          {mode === "ios" ? (
            <p>
              Add Hephaestus to your home screen: tap <b>Share</b>, then <b>Add to Home Screen</b>.
            </p>
          ) : (
            <p>
              Add Hephaestus to your home screen: open Firefox's <b>⋮</b> menu, then tap <b>Add app to Home screen</b>.
            </p>
          )}
          <div className="notice-actions">
            <button type="button" className="link" onClick={() => setDismissed(true)}>
              Got it
            </button>
          </div>
        </>
      )}
    </div>
  );
}
