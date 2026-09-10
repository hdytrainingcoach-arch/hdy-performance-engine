'use client';

// Radar descriptif : chaque axe normalisé indépendamment (min→max des séries).
// `higherIsBetter[i] === false` inverse l'axe (ex. temps de sprint) pour que
// « mieux » pointe toujours vers l'extérieur.

type Series = { label: string; color: string; values: (number | null)[] };

export default function RadarChart({
  axes,
  series,
  higherIsBetter,
  size = 320,
}: {
  axes: string[];
  series: Series[];
  higherIsBetter?: boolean[];
  size?: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 46;
  const n = axes.length;
  if (n < 3) return <p style={{ color: '#a1a1aa', fontSize: 12 }}>Radar : au moins 3 tests communs requis.</p>;

  // domaine par axe
  const domains = axes.map((_, i) => {
    const vals = series.map((s) => s.values[i]).filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
    return vals.length ? [Math.min(...vals), Math.max(...vals)] : [0, 1];
  });

  const norm = (v: number | null, i: number) => {
    if (v == null || !Number.isFinite(v)) return null;
    const [lo, hi] = domains[i];
    let t = hi === lo ? 0.5 : (v - lo) / (hi - lo);
    if (higherIsBetter && higherIsBetter[i] === false) t = 1 - t;
    return Math.max(0, Math.min(1, t));
  };

  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const point = (i: number, t: number) => [cx + Math.cos(angle(i)) * r * t, cy + Math.sin(angle(i)) * r * t];

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{ maxWidth: size, display: 'block', margin: '0 auto' }}>
      {[0.25, 0.5, 0.75, 1].map((t) => (
        <polygon
          key={t}
          points={axes.map((_, i) => point(i, t).join(',')).join(' ')}
          fill="none"
          stroke="#2b2b31"
          strokeWidth={1}
        />
      ))}
      {axes.map((_, i) => {
        const [x, y] = point(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#2b2b31" strokeWidth={1} />;
      })}
      {series.map((s) => {
        const pts = axes.map((_, i) => {
          const t = norm(s.values[i], i);
          return t == null ? null : point(i, t);
        });
        const drawn = pts.filter((p): p is number[] => p != null);
        if (drawn.length < 3) return null;
        return (
          <g key={s.label}>
            <polygon
              points={axes.map((_, i) => (pts[i] ?? point(i, 0)).join(',')).join(' ')}
              fill={s.color}
              fillOpacity={0.14}
              stroke={s.color}
              strokeWidth={2}
            />
            {pts.map((p, i) => (p ? <circle key={i} cx={p[0]} cy={p[1]} r={3} fill={s.color} /> : null))}
          </g>
        );
      })}
      {axes.map((label, i) => {
        const [x, y] = point(i, 1.16);
        return (
          <text
            key={label}
            x={x}
            y={y}
            fill="#d4d4d8"
            fontSize={10}
            fontWeight={700}
            textAnchor={Math.abs(x - cx) < 6 ? 'middle' : x > cx ? 'start' : 'end'}
            dominantBaseline="middle"
          >
            {label.length > 16 ? label.slice(0, 15) + '…' : label}
          </text>
        );
      })}
    </svg>
  );
}
