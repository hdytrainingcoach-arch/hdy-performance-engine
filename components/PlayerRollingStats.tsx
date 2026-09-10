'use client';

import { useMemo } from 'react';
import { fmtNum, fmtPct, reviewSignal, summarize, toNum, type SignalLevel } from '@/lib/stats';

type Row = Record<string, unknown>;

const LEVEL_STYLE: Record<SignalLevel, { bg: string; fg: string; label: string }> = {
  green: { bg: '#13331f', fg: '#8ef0b0', label: 'Proche de l’habitude' },
  orange: { bg: '#3a2c12', fg: '#f5c96b', label: 'Vigilance — revue conseillée' },
  red: { bg: '#3a1416', fg: '#ff8a8f', label: 'À revoir en priorité par le staff' },
  gray: { bg: '#1f1f22', fg: '#a1a1aa', label: 'Données insuffisantes' },
};

function gpsVal(m: Row | undefined, kmKey: string, mKey: string): number | null {
  const km = toNum(m?.[kmKey]);
  if (km !== null) return km;
  const mv = toNum(m?.[mKey]);
  return mv === null ? null : mv / 1000;
}

export default function PlayerRollingStats({
  q,
  rpe,
  pain,
  gps,
}: {
  q: Row[];
  rpe: Row[];
  pain: Row[];
  gps: Row[];
}) {
  const series = useMemo(() => {
    const hooper = q.map((x) => ({
      date: String(x.submitted_at ?? ''),
      value: toNum((x.answers as Row)?.hooper_total),
    }));
    const rpeS = rpe.map((x) => ({ date: String(x.submitted_at ?? ''), value: toNum(x.rpe) }));
    const srpe = rpe.map((x) => {
      const raw = toNum(x.load_ua);
      const computed = (toNum(x.rpe) ?? 0) * (toNum(x.actual_duration_min) ?? 0);
      return { date: String(x.submitted_at ?? ''), value: raw ?? (computed > 0 ? computed : null) };
    });
    const painS = pain.map((x) => ({
      date: String(x.declared_at ?? x.created_at ?? ''),
      value: toNum(x.intensity),
    }));
    const gDist = gps.map((x) => ({
      date: String(x.recorded_at ?? ''),
      value: gpsVal(x.metrics as Row, 'total_distance_km', 'total_distance_m'),
    }));
    const gHid = gps.map((x) => ({
      date: String(x.recorded_at ?? ''),
      value: gpsVal(x.metrics as Row, 'high_intensity_distance_km', 'high_speed_distance_m'),
    }));
    const gLoad = gps.map((x) => ({
      date: String(x.recorded_at ?? ''),
      value: toNum((x.metrics as Row)?.external_load),
    }));
    return { hooper, rpeS, srpe, painS, gDist, gHid, gLoad };
  }, [q, rpe, pain, gps]);

  const rows = useMemo(
    () => [
      { key: 'hooper', label: 'Indice de Hooper', unit: '', digits: 0, s: summarize(series.hooper) },
      { key: 'rpe', label: 'RPE Foster', unit: '/10', digits: 1, s: summarize(series.rpeS) },
      { key: 'srpe', label: 'Charge interne (sRPE)', unit: 'UA', digits: 0, s: summarize(series.srpe) },
      { key: 'pain', label: 'Douleur déclarée', unit: '/10', digits: 1, s: summarize(series.painS) },
      { key: 'dist', label: 'GPS · distance', unit: 'km', digits: 2, s: summarize(series.gDist) },
      { key: 'hid', label: 'GPS · haute intensité', unit: 'km', digits: 2, s: summarize(series.gHid) },
      { key: 'load', label: 'GPS · charge externe', unit: 'index', digits: 0, s: summarize(series.gLoad) },
    ],
    [series],
  );

  const signal = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const hSum = summarize(series.hooper);
    const sSum = summarize(series.srpe);
    const recentPain = series.painS
      .filter((p) => {
        const t = new Date(p.date).getTime();
        return Number.isFinite(t) && t >= Date.now() - 7 * 86_400_000 && p.value !== null;
      })
      .map((p) => p.value as number);
    const respondedToday =
      q.some((x) => String(x.submitted_at ?? '').slice(0, 10) === today) ||
      rpe.some((x) => String(x.submitted_at ?? '').slice(0, 10) === today);
    const unusualSymptom = q[0] ? (q[0].answers as Row)?.unusual_symptom === true : false;
    const acwr = toNum((gps[0]?.metrics as Row)?.acwr);
    return reviewSignal({
      respondedToday,
      hooperLast: hSum.last,
      hooperMean28: hSum.mean28,
      hooperSd28: hSum.sd28,
      painMax: recentPain.length ? Math.max(...recentPain) : null,
      unusualSymptom,
      srpeLast: sSum.last,
      srpeMean7: sSum.mean7,
      acwr,
    });
  }, [series, q, rpe, gps]);

  const ls = LEVEL_STYLE[signal.level];

  return (
    <section style={S.card}>
      <div style={S.head}>
        <div>
          <span style={S.eyebrow}>RÉFÉRENCE INDIVIDUELLE · 28 JOURS GLISSANTS</span>
          <h2 style={S.h2}>Le joueur comparé à lui-même</h2>
        </div>
        <div style={{ ...S.signal, background: ls.bg, color: ls.fg }}>{ls.label}</div>
      </div>

      <p style={S.reasons}>
        {signal.reasons.join(' · ')}. Ce statut déclenche une revue humaine — ce n’est ni un diagnostic ni une exclusion.
      </p>

      <div style={S.tableWrap}>
        <table style={S.table}>
          <thead>
            <tr>
              {['Métrique', 'Dernier', 'Moy. 7 j', 'Moy. 28 j', 'Médiane 28 j', 'σ', 'Écart vs 28 j', 'n (28 j)'].map(
                (h) => (
                  <th key={h} style={S.th}>
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ key, label, unit, digits, s }) => (
              <tr key={key}>
                <td style={S.tdLabel}>
                  {label} {unit && <small style={S.unit}>{unit}</small>}
                </td>
                {s.n === 0 ? (
                  <td style={S.tdMissing} colSpan={7}>
                    Aucune donnée sur 28 jours
                  </td>
                ) : (
                  <>
                    <td style={S.td}>
                      <b>{fmtNum(s.last, digits)}</b>
                    </td>
                    <td style={S.td}>{fmtNum(s.mean7, digits)}</td>
                    <td style={S.td}>{fmtNum(s.mean28, digits)}</td>
                    <td style={S.td}>{fmtNum(s.median28, digits)}</td>
                    <td style={S.td}>{fmtNum(s.sd28, digits)}</td>
                    <td style={{ ...S.td, color: pctColor(s.pctVs28) }}>{fmtPct(s.pctVs28)}</td>
                    <td style={S.td}>{s.n}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={S.note}>
        Fenêtres glissantes se terminant aujourd’hui. « Écart vs 28 j » = variation de la dernière valeur par rapport à
        la moyenne des 28 derniers jours. Les cases vides indiquent une donnée manquante, jamais une valeur estimée.
      </p>
    </section>
  );
}

function pctColor(v: number | null): string {
  if (v === null) return '#e5e5e5';
  if (Math.abs(v) < 0.15) return '#8ef0b0';
  if (Math.abs(v) < 0.3) return '#f5c96b';
  return '#ff8a8f';
}

const S: Record<string, React.CSSProperties> = {
  card: { maxWidth: 1280, margin: '0 auto 14px', background: '#141416', border: '1px solid #2b2b31', borderRadius: 18, padding: 16, color: '#fafafa' },
  head: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' },
  eyebrow: { fontSize: 11, fontWeight: 900, letterSpacing: 1.4, color: '#E31E24' },
  h2: { margin: '4px 0 0', fontSize: 22 },
  signal: { borderRadius: 999, padding: '7px 12px', fontWeight: 900, fontSize: 12 },
  reasons: { color: '#d4d4d8', fontSize: 13, margin: '10px 0 14px' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 720 },
  th: { textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #2b2b31', color: '#a1a1aa', fontSize: 11, whiteSpace: 'nowrap' },
  td: { padding: '10px', borderBottom: '1px solid #1f1f22', whiteSpace: 'nowrap' },
  tdLabel: { padding: '10px', borderBottom: '1px solid #1f1f22' },
  tdMissing: { padding: '10px', borderBottom: '1px solid #1f1f22', color: '#71717a', fontStyle: 'italic' },
  unit: { color: '#71717a' },
  note: { color: '#a1a1aa', fontSize: 12, marginTop: 12 },
};
