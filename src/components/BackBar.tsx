export function BackBar({ label, onBack }: { label: string; onBack: () => void }) {
  return (
    <button type="button" className="back" onClick={onBack}>
      <span aria-hidden="true">‹</span> {label}
    </button>
  );
}
