interface Option<T> {
  value: T;
  label: string;
  hint?: string;
}

interface Props<T> {
  label: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Keep the label for screen readers only. */
  hideLabel?: boolean;
}

export function Segmented<T extends string | number>({ label, options, value, onChange, hideLabel }: Props<T>) {
  return (
    <div className="seg-group">
      {!hideLabel && <h2>{label}</h2>}
      <div className="seg" role="group" aria-label={label} style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
        {options.map((o) => (
          <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
            <span className="seg-label">{o.label}</span>
            {o.hint && <span className="seg-hint">{o.hint}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
