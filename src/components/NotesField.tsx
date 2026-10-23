import { NOTES_MAX, niceDate } from "../lib/lifting";
import { weekLabel } from "../lib/programme";
import type { Entry } from "../lib/types";

interface Props {
  id: string;
  value: string;
  onChange: (value: string) => void;
  /** The last note on this exercise, shown above the box (omit when it's shown elsewhere). */
  previous?: Entry;
}

/** The previous note on an exercise, for reference while logging it again. */
export function PreviousNote({ entry }: { entry: Entry }) {
  return (
    <div className="prev-note">
      <span className="prev-note-when">
        Last note · {niceDate(entry.performed_on, { day: "numeric", month: "short" })}
        {entry.program_week ? ` · ${weekLabel(entry.program_week)}` : ""}
      </span>
      <p>{entry.notes}</p>
    </div>
  );
}

/** Notes for one logged exercise, optionally with the previous note above the box. */
export function NotesField({ id, value, onChange, previous }: Props) {
  return (
    <div className="notes-field">
      {previous && <PreviousNote entry={previous} />}
      <label htmlFor={id}>
        Notes
        <textarea
          id={id}
          rows={3}
          maxLength={NOTES_MAX}
          placeholder="How did it feel? Anything to change next time?"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
    </div>
  );
}
