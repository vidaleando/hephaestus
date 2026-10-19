# Hephaestus

A phone-first gym tracker: log exercise, weight, reps and sets; browse history by day; see your heaviest lifts and estimated 1-rep max over time.

Live version: https://claude.ai/artifact/9e2Nn7NHXfsfpgnuKPpH1S

## Files

- `artifact.html` — the exact source published as the Claude artifact. Edit this one and republish it to update the live link.
- `index.html` — the same app wrapped in a full HTML document, so it runs on its own in any browser or on any static host.

## How data is saved

- **On claude.ai** (signed in, with edit access): entries are stored in the artifact's database under each person's private `data/users/<id>/` path, so they follow you across devices.
- **Anywhere else** (opened as a plain file, hosted elsewhere, or no write access): entries are saved in the browser's `localStorage` on that device only.

Entries logged on a device are moved to the account automatically the next time the account store is available.

## Run locally

Open `index.html` in a browser, or serve the folder:

```sh
python3 -m http.server 8000
```

Then visit http://localhost:8000 (on your phone, use your computer's local IP while on the same Wi-Fi).

No build step and no dependencies. Fonts load from Google Fonts with system fallbacks.
