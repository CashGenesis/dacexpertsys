import { niceStep } from './trend';

export function TrendChart({ points }) {
  const W = 800;
  const H = 220;
  const pad = { top: 12, right: 12, bottom: 28, left: 36 };
  const step = niceStep(Math.max(...points.map((p) => p.value), 0));
  const max = step * 4;
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;
  const x = (i) => pad.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (v) => pad.top + innerH - (v / max) * innerH;
  const coords = points.map((p, i) => [x(i), y(p.value)]);

  // Smooth line through the points (Catmull-Rom converted to cubic Béziers).
  let d = coords.length ? `M${coords[0][0]},${coords[0][1]}` : '';
  for (let i = 0; i < coords.length - 1; i += 1) {
    const [x0, y0] = coords[i - 1] || coords[i];
    const [x1, y1] = coords[i];
    const [x2, y2] = coords[i + 1];
    const [x3, y3] = coords[i + 2] || coords[i + 1];
    const c1 = [x1 + (x2 - x0) / 6, Math.min(pad.top + innerH, y1 + (y2 - y0) / 6)];
    const c2 = [x2 - (x3 - x1) / 6, Math.min(pad.top + innerH, y2 - (y3 - y1) / 6)];
    d += ` C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${x2},${y2}`;
  }

  const ticks = [0, 1, 2, 3, 4].map((n) => n * step);
  const labelEvery = Math.max(1, Math.ceil(points.length / 8));
  // Label every Nth point, plus the last one unless it would crowd the previous label.
  const showLabel = (i) =>
    i % labelEvery === 0 || (i === points.length - 1 && i % labelEvery >= labelEvery / 2);
  const last = coords[coords.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Cases over time">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={pad.left} x2={W - pad.right} y1={y(t)} y2={y(t)} stroke="#eef0f4" />
          <text x={pad.left - 8} y={y(t) + 4} textAnchor="end" className="fill-slate-400" fontSize="10">
            {t}
          </text>
        </g>
      ))}
      {points.map((p, i) =>
        showLabel(i) ? (
          <text key={i} x={x(i)} y={H - 8} textAnchor="middle" className="fill-slate-400" fontSize="10">
            {p.label}
          </text>
        ) : null
      )}
      <defs>
        <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4b44b5" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#4b44b5" stopOpacity="0" />
        </linearGradient>
      </defs>
      {coords.length > 1 && (
        <path
          d={`${d} L${coords[coords.length - 1][0]},${pad.top + innerH} L${coords[0][0]},${pad.top + innerH} Z`}
          fill="url(#trend-fill)"
        />
      )}
      <path d={d} fill="none" stroke="#4b44b5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {last && <circle cx={last[0]} cy={last[1]} r="4" fill="#4b44b5" stroke="#fff" strokeWidth="2" />}
    </svg>
  );
}

// Ring chart: each slice is a share of the total (slices must not overlap).
export function Donut({ slices, total }) {
  const r = 70;
  const circumference = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg viewBox="0 0 180 180" className="w-44 h-44 shrink-0" role="img" aria-label="Case distribution">
      <circle cx="90" cy="90" r={r} fill="none" stroke="#f1f2f6" strokeWidth="22" />
      {total > 0 &&
        slices.map((slice) => {
          const length = (slice.value / total) * circumference;
          const el = (
            <circle
              key={slice.key}
              cx="90"
              cy="90"
              r={r}
              fill="none"
              stroke={slice.color}
              strokeWidth="22"
              strokeDasharray={`${length} ${circumference - length}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 90 90)"
            />
          );
          offset += length;
          return el;
        })}
      <text x="90" y="88" textAnchor="middle" className="fill-slate-900" fontSize="24" fontWeight="600">
        {total.toLocaleString('en-IN')}
      </text>
      <text x="90" y="110" textAnchor="middle" className="fill-slate-500" fontSize="12">
        Total cases
      </text>
    </svg>
  );
}
