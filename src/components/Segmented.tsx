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
}

export function Segmented<T extends string | number>({ label, options, value, onChange }: Props<T>) {
  return (
    <div className="seg-group">
      <h2>{label}</h2>
      <div className="seg" role="group" aria-label={label}>
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
