import { useState, type FormEvent } from "react";
import { sendSignInLink } from "../lib/useAuth";

export function SignIn({ onSkip }: { onSkip: () => void }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    setState("sending");
    setError(null);
    const err = await sendSignInLink(email.trim());
    if (err) {
      setError(err);
      setState("idle");
    } else setState("sent");
  }

  return (
    <section className="view signin">
      <div className="panel">
        <h2>Sign in</h2>
        {state === "sent" ? (
          <p>
            Check <b>{email}</b> for a sign-in link. Open it on this phone and you'll land back here, signed in.
          </p>
        ) : (
          <form onSubmit={submit} className="signin-form">
            <p>Your log is private and follows you to any device. We'll email you a link, no password needed.</p>
            <label htmlFor="email">
              Email
              <input
                id="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            {error && <p className="error">{error}</p>}
            <button className="primary" type="submit" disabled={state === "sending"}>
              {state === "sending" ? "Sending…" : "Email me a link"}
            </button>
          </form>
        )}
      </div>
      <button type="button" className="link" onClick={onSkip}>
        Use without an account (saved on this device only)
      </button>
    </section>
  );
}
