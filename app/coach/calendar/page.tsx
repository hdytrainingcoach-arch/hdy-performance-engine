'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useCoach } from '@/lib/coach-context';

type Row = Record<string, any>;
const TYPE_COLOR: Record<string, string> = { training: '#3B82F6', match: '#E31E24', gym: '#10B981', rehab: '#F59E0B', recovery: '#22C55E', test: '#06B6D4' };
const TYPE_LABEL: Record<string, string> = { training: 'Préparation physique', match: 'Match', gym: 'Musculation', rehab: 'Réathlétisation', recovery: 'Récupération', test: 'Tests' };

function ymd(d: Date) { return d.toISOString().slice(0, 10); }
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function daysInMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); }
function leadingBlanks(d: Date) { return (startOfMonth(d).getDay() + 6) % 7; }

export default function CoachCalendarPage() {
  const { scope } = useCoach();
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [sessions, setSessions] = useState<Row[]>([]);
  const [selectedDate, setSelectedDate] = useState('');

  async function load() {
    if (!scope) return;
    const from = ymd(startOfMonth(cursor));
    const to = ymd(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0));
    let q = supabase.from('sessions').select('*').eq('organization_id', scope.organizationId).gte('session_date', from).lte('session_date', to);
    q = scope.teamId ? q.eq('team_id', scope.teamId) : q.is('team_id', null);
    const { data } = await q;
    setSessions(data || []);
  }
  useEffect(() => { load(); }, [scope?.organizationId, scope?.teamId, cursor]);

  const byDay = useMemo(() => {
    const m = new Map<string, Row[]>();
    for (const s of sessions) { const arr = m.get(s.session_date) || []; arr.push(s); m.set(s.session_date, arr); }
    return m;
  }, [sessions]);

  const cells: (number | null)[] = useMemo(() => {
    const blanks = leadingBlanks(cursor);
    const total = daysInMonth(cursor);
    return [...Array(blanks).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)];
  }, [cursor]);

  const monthLabel = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(cursor);
  const daySessions = selectedDate ? (byDay.get(selectedDate) || []) : [];
  const today = ymd(new Date());

  return (
    <div>
      <header style={S.pageHead}>
        <p style={S.eyebrow}>CALENDRIER</p>
        <h1 style={S.h1}>Planning des séances</h1>
      </header>
      <div style={S.grid}>
        <article style={S.card}>
          <div style={S.monthNav}>
            <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} style={S.smallGhost}>←</button>
            <b style={{ textTransform: 'capitalize' }}>{monthLabel}</b>
            <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} style={S.smallGhost}>→</button>
          </div>
          <div style={S.weekRow}>{['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => <span key={i} style={S.weekDay}>{d}</span>)}</div>
          <div style={S.monthGrid}>
            {cells.map((day, i) => {
              if (day === null) return <div key={i} style={S.blankCell} />;
              const date = ymd(new Date(cursor.getFullYear(), cursor.getMonth(), day));
              const list = byDay.get(date) || [];
              return (
                <button key={i} onClick={() => setSelectedDate(date)} style={{ ...S.dayCell, ...(date === selectedDate ? S.dayCellActive : {}), ...(date === today ? S.dayCellToday : {}) }}>
                  <span>{day}</span>
                  <div style={S.dots}>{list.slice(0, 4).map((s) => <span key={s.id} style={{ ...S.dot, background: TYPE_COLOR[s.type] || '#71717A' }} />)}</div>
                </button>
              );
            })}
          </div>
        </article>
        <article style={S.card}>
          <h2 style={S.h2}>{selectedDate ? new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(selectedDate)) : 'Sélectionne un jour'}</h2>
          {daySessions.map((s) => (
            <div key={s.id} style={S.row}>
              <span><b>{s.title || TYPE_LABEL[s.type] || s.type}</b><small style={S.small}>{TYPE_LABEL[s.type] || s.type}{s.location ? ` · ${s.location}` : ''}{s.planned_duration_min ? ` · ${s.planned_duration_min} min` : ''}</small></span>
              <a href="/coach/sessions" style={S.smallGhost}>Ouvrir</a>
            </div>
          ))}
          {selectedDate && !daySessions.length && <p style={{ color: '#71717A' }}>Aucune séance ce jour. Crée-la depuis <a href="/coach/sessions" style={{ color: '#fff' }}>Séances</a>.</p>}
        </article>
      </div>
    </div>
  );
}

const ACCENT = '#10B981';
const S: Record<string, React.CSSProperties> = {
  pageHead: { marginBottom: 18 },
  eyebrow: { fontSize: 11, fontWeight: 900, letterSpacing: 1.6, color: ACCENT, margin: 0 },
  h1: { fontSize: 28, margin: '4px 0 6px', letterSpacing: -0.5 },
  h2: { fontSize: 16, margin: 0 },
  grid: { display: 'grid', gridTemplateColumns: 'minmax(340px,1.1fr) minmax(280px,.9fr)', gap: 14 },
  card: { background: '#141416', border: '1px solid #24262A', borderRadius: 16, padding: 18, display: 'grid', gap: 10, alignContent: 'start' },
  monthNav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  weekRow: { display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 },
  weekDay: { textAlign: 'center', fontSize: 11, color: '#71717A', fontWeight: 700 },
  monthGrid: { display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 },
  blankCell: { minHeight: 56 },
  dayCell: { minHeight: 56, background: '#1B1B1F', border: '1px solid #2B2B31', borderRadius: 10, color: '#fff', display: 'grid', gap: 4, alignContent: 'start', padding: 6, cursor: 'pointer', textAlign: 'left', fontWeight: 700 },
  dayCellActive: { borderColor: ACCENT },
  dayCellToday: { boxShadow: 'inset 0 0 0 1px #fff' },
  dots: { display: 'flex', gap: 3, flexWrap: 'wrap' },
  dot: { width: 6, height: 6, borderRadius: 999, display: 'inline-block' },
  row: { display: 'flex', justifyContent: 'space-between', gap: 10, padding: '10px 0', borderBottom: '1px solid #1E2023', alignItems: 'center' },
  small: { display: 'block', color: '#71717A', marginTop: 2 },
  smallGhost: { border: '1px solid #2B2B31', borderRadius: 8, padding: '6px 10px', fontWeight: 700, color: '#fff', background: 'transparent', cursor: 'pointer', fontSize: 12, textDecoration: 'none' },
};
