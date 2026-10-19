import { fmt } from "../lib/lifting";

const W = 340;
const H = 170;
const PAD = { left: 40, right: 14, top: 12, bottom: 26 };

/** Heaviest weight per session, one point per day. `points` must be sorted by date. */
export function ProgressChart({ points }: { points: [date: string, weight: number][] }) {
  const weights = points.map((p) => p[1]);
  let lo = Math.min(...weights);
  let hi = Math.max(...weights);
  if (lo === hi) {
    lo = Math.max(0, lo - 5);
    hi += 5;
  }
  const pad = (hi - lo) * 0.12;
  lo = Math.max(0, lo - pad);
  hi += pad;

  const times = points.map((p) => new Date(p[0] + "T12:00:00").getTime());
  const t0 = times[0];
  const t1 = times[times.length - 1];
  const x = (t: number) =>
    t1 === t0 ? PAD.left + (W - PAD.left - PAD.right) / 2 : PAD.left + ((t - t0) / (t1 - t0)) * (W - PAD.left - PAD.right);
  const y = (w: number) => PAD.top + (1 - (w - lo) / (hi - lo)) * (H - PAD.top - PAD.bottom);
  const dateLabel = (t: number) => new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" });

  const line = points.map((p, i) => `${x(times[i]).toFixed(1)},${y(p[1]).toFixed(1)}`).join(" ");
  const base = H - PAD.bottom;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Heaviest weight per session over time">
      {[lo, (lo + hi) / 2, hi].map((v) => (
        <g key={v}>
          <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} stroke="var(--line)" strokeWidth={1} />
          <text x={PAD.left - 6} y={y(v) + 4} textAnchor="end" className="axis">
            {fmt(v)}
          </text>
        </g>
      ))}

      {times.length > 1 ? (
        <>
          <text x={x(t0)} y={H - 8} textAnchor="start" className="axis">
            {dateLabel(t0)}
          </text>
          <text x={x(t1)} y={H - 8} textAnchor="end" className="axis">
            {dateLabel(t1)}
          </text>
          <polygon points={`${x(t0)},${base} ${line} ${x(t1)},${base}`} fill="var(--accent)" fillOpacity={0.12} />
          <polyline
            points={line}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </>
      ) : (
        <text x={x(t0)} y={H - 8} textAnchor="middle" className="axis">
          {dateLabel(t0)}
        </text>
      )}

      {points.map((p, i) => {
        const last = i === points.length - 1;
        return (
          <circle
            key={p[0]}
            cx={x(times[i])}
            cy={y(p[1])}
            r={last ? 5 : 3}
            fill={last ? "var(--accent)" : "var(--surface)"}
            stroke="var(--accent)"
            strokeWidth={2}
          />
        );
      })}
    </svg>
  );
}
