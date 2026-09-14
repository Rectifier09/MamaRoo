import { scaleLinear, scaleTime } from "d3-scale";
import { EmptyState } from "@/components/patterns/EmptyState";

export interface TrendChartSeriesData {
  id: string;
  points: { date: string; value: number }[];
}

export interface TrendChartProps {
  series: TrendChartSeriesData[];
  /** id -> display label, shown at the end of that series' line. */
  seriesLabels: Record<string, string>;
  normalBand?: { min: number; max: number };
  /** Full sentence describing the trend for assistive technology; the chart
   * is never colour-and-shape only. */
  ariaSummary: string;
  emptyMessage: string;
}

const WIDTH = 320;
const HEIGHT = 200;
const MARGIN = { top: 16, right: 16, bottom: 16, left: 16 };
const MAX_SERIES = 4;

// Distinct as well as coloured, per the design document's data-visualisation
// rule (§2) -- a reader who cannot distinguish the two chart colours (or is
// using a printed/greyscale copy) still tells the lines apart.
const DASH_PATTERNS = [undefined, "6 4", "2 3", "8 3 2 3"];
type MarkerShape = "circle" | "square" | "triangle" | "diamond";
const MARKER_SHAPES: MarkerShape[] = ["circle", "square", "triangle", "diamond"];
const SERIES_COLOR_VARS = ["--chart-series-1", "--chart-series-2", "--chart-series-3", "--chart-series-4"];

const DOMAIN_PAD_RATIO = 0.1;
const DOMAIN_PAD_MIN = 1;

function Marker({ shape, x, y, color }: { shape: MarkerShape; x: number; y: number; color: string }) {
  const size = 4;
  const style = { fill: color };
  switch (shape) {
    case "square":
      return <rect data-marker x={x - size} y={y - size} width={size * 2} height={size * 2} style={style} />;
    case "triangle":
      return <polygon data-marker points={`${x},${y - size} ${x - size},${y + size} ${x + size},${y + size}`} style={style} />;
    case "diamond":
      return <polygon data-marker points={`${x},${y - size} ${x + size},${y} ${x},${y + size} ${x - size},${y}`} style={style} />;
    case "circle":
    default:
      return <circle data-marker cx={x} cy={y} r={size} style={style} />;
  }
}

export function TrendChart({ series, seriesLabels, normalBand, ariaSummary, emptyMessage }: TrendChartProps) {
  if (series.length > MAX_SERIES) {
    throw new Error(`TrendChart supports at most ${MAX_SERIES} series, got ${series.length}`);
  }

  const hasAnyPoints = series.some((s) => s.points.length > 0);
  if (!hasAnyPoints) {
    return <EmptyState iconName="ChartLine" message={emptyMessage} />;
  }

  const allPoints = series.flatMap((s) => s.points);
  const dateValues = allPoints.map((p) => new Date(p.date).getTime());
  const valueValues = allPoints.map((p) => p.value);
  if (normalBand) {
    valueValues.push(normalBand.min, normalBand.max);
  }

  const dateMin = Math.min(...dateValues);
  const dateMax = Math.max(...dateValues);
  const datePad = Math.max((dateMax - dateMin) * 0.05, 1000 * 60 * 60 * 12);

  const valueMin = Math.min(...valueValues);
  const valueMax = Math.max(...valueValues);
  const valuePad = Math.max((valueMax - valueMin) * DOMAIN_PAD_RATIO, DOMAIN_PAD_MIN);

  const x = scaleTime()
    .domain([new Date(dateMin - datePad), new Date(dateMax + datePad)])
    .range([MARGIN.left, WIDTH - MARGIN.right]);
  const y = scaleLinear()
    .domain([valueMin - valuePad, valueMax + valuePad])
    .range([HEIGHT - MARGIN.bottom, MARGIN.top]);

  return (
    <div className="flex flex-col gap-xs">
      <svg data-trend-chart width="100%" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-hidden="true">
        <line
          x1={MARGIN.left}
          x2={WIDTH - MARGIN.right}
          y1={HEIGHT - MARGIN.bottom}
          y2={HEIGHT - MARGIN.bottom}
          style={{ stroke: "var(--chart-gridline)" }}
        />

        {normalBand && (
          <rect
            data-normal-band
            x={MARGIN.left}
            y={y(normalBand.max)}
            width={WIDTH - MARGIN.left - MARGIN.right}
            height={Math.max(y(normalBand.min) - y(normalBand.max), 0)}
            style={{ fill: "var(--chart-gridline)", opacity: 0.4 }}
          />
        )}

        {series.map((s, i) => {
          const color = `var(${SERIES_COLOR_VARS[i]})`;
          const shape = MARKER_SHAPES[i]!;
          const sorted = [...s.points].sort((a, b) => a.date.localeCompare(b.date));
          const coords = sorted.map((p) => ({ x: x(new Date(p.date)), y: y(p.value) }));

          if (coords.length === 0) return null;

          const last = coords[coords.length - 1]!;
          const label = seriesLabels[s.id] ?? s.id;

          return (
            <g key={s.id}>
              {coords.length > 1 && (
                <path
                  data-series={s.id}
                  d={coords.map((c, idx) => `${idx === 0 ? "M" : "L"}${c.x},${c.y}`).join(" ")}
                  fill="none"
                  strokeWidth={2}
                  strokeDasharray={DASH_PATTERNS[i]}
                  style={{ stroke: color }}
                />
              )}
              {coords.map((c, idx) => (
                <Marker key={idx} shape={shape} x={c.x} y={c.y} color={color} />
              ))}
              <text x={last.x} y={last.y - 8} textAnchor="end" className="text-caption font-medium" style={{ fill: color }}>
                {label}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="sr-only">{ariaSummary}</p>
    </div>
  );
}
