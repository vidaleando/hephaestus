import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmt } from "../lib/lifting";

export interface TrendPoint {
  /** Local date, YYYY-MM-DD */
  date: string;
  value: number;
  /** Extra line in the tooltip, e.g. "127.5 kg × 9" */
  detail?: string;
}

interface Props {
  /** What the line measures; names the chart for screen readers and the tooltip. */
  label: string;
  unit: string;
  /** Sorted oldest first, at most one per date. */
  points: TrendPoint[];
}

const DAY = 86_400_000;
const toTime = (iso: string) => new Date(iso + "T12:00:00").getTime();
const shortDate = (t: number) => new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" });

/** One series over time: 2px line, ringed dots, crosshair tooltip. The y-axis is zoomed to the data, so no area fill. */
export function TrendChart({ label, unit, points }: Props) {
  const data = points.map((p) => ({ ...p, t: toTime(p.date) }));
  const first = data[0]?.t ?? 0;
  const last = data[data.length - 1]?.t ?? 0;
  // A single point gets a few days either side so it isn't pinned to an edge
  const domain = first === last ? [first - 3 * DAY, last + 3 * DAY] : [first, last];

  return (
    <div className="trend" role="img" aria-label={`${label} over time`}>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 12, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--line)" strokeWidth={1} />
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={domain}
            tickFormatter={shortDate}
            tick={{ fill: "var(--muted)", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "var(--line)" }}
            minTickGap={24}
            tickCount={4}
          />
          <YAxis
            domain={["auto", "auto"]}
            tickFormatter={(v: number) => fmt(v)}
            tick={{ fill: "var(--muted)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={44}
            tickCount={4}
          />
          <Tooltip
            cursor={{ stroke: "var(--muted)", strokeWidth: 1 }}
            content={({ active, payload }) => {
              const p = active && payload?.[0]?.payload;
              if (!p) return null;
              return (
                <div className="chart-tip">
                  <strong>
                    {fmt(p.value)} {unit}
                  </strong>
                  <span>
                    {label} · {shortDate(p.t)}
                  </span>
                  {p.detail && <span>{p.detail}</span>}
                </div>
              );
            }}
          />
          <Line
            type="linear"
            dataKey="value"
            stroke="var(--accent)"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            dot={{ r: 4, fill: "var(--accent)", stroke: "var(--surface)", strokeWidth: 2 }}
            activeDot={{ r: 6, fill: "var(--accent)", stroke: "var(--surface)", strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
