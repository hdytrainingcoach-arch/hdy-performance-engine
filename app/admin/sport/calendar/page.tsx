'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useOrg } from '@/lib/org-context';

type Row = Record<string, any>;
const TYPE_COLOR: Record<string, string> = {
  training: '#3B82F6',
  match: '#E31E24',
  gym: '#A855F7',
  rehab: '#F59E0B',
  recovery: '#22C55E',
  test: '#06B6D4',
};
const TYPE_LABEL: Record<string, string> = {
  training: 'Entraînement',
  match: 'Match',
  gym: 'Musculation',
  rehab: 'Réathlétisation',
  recovery: 'Récupération',
  test: 'Tests',
};

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function daysInMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}
// Lundi = premier jour de la semaine à l'écran.
function leadingBlanks(d: Date) {
  const dow = startOfMonth(d).getDay();
  return (dow + 6) % 7;
}

export default function CalendarPage() {
  const { environments, currentEnvId: org, setCurrentEnvId: setOrg, currentTeamId: team, setCurrentTeamId: setTeam, teamsFor, usesTeams } = useOrg();
  const [ready, setReady] = useState(false);
  const [ok, setOk] = useState(false);
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [sessions, setSessions] = useState<Row[]>([]);
  const [availability, setAvailability] = useState<Row[]>([]);
  const [selectedDate, setSelectedDate] = useState('');

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setReady(true); return; }
      const [{ data: p }, { data: m }] = await Promise.all([
        supabase.from('profiles').select('is_super_admin').eq('user_id', session.user.id).maybeSingle(),
        supabase.from('memberships').select('id').eq('user_id', session.user.id).eq('active', true).limit(1),
      ]);
      if (!p?.is_super_admin && !m?.length) { setReady(true); return; }
      setOk(true);
      setReady(true);
    })();
  }, []);

  async function load() {
    const from = ymd(startOfMonth(cursor));
    const to = ymd(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0));
    const [{ data: s }, { data: a }] = await Promise.all([
      supabase.from('sessions').select('*').gte('session_date', from).lte('session_date', to),
      supabase.from('player_availability').select('for_date,status').gte('for_date', from).lte('for_date', to),
    ]);
    setSessions(s || []);
    setAvailability(a || []);
  }
  useEffect(() => { if (ok) load(); }, [ok, cursor, org, team]);

  const scoped = useMemo(
    () => sessions.filter((s) => s.organization_id === org && (!usesTeams(org) || !team || s.team_id === team)),
    [sessions, org, team, usesTeams],
  );
  const byDay = useMemo(() => {
    const m = new Map<string, Row[]>();
    for (const s of scoped) {
      const arr = m.get(s.session_date) || [];
      arr.push(s);
      m.set(s.session_date, arr);
    }
    return m;
  }, [scoped]);
  const availByDay = useMemo(() => {
    const m = new Map<string, { present: number; absent: number; other: number }>();
    for (const a of availability) {
      const cur = m.get(a.for_date) || { present: 0, absent: 0, other: 0 };
      if (a.status === 'present') cur.present++;
      else if (a.status === 'absent') cur.absent++;
      else cur.other++;
      m.set(a.for_date, cur);
    }
    return m;
  }, [availability]);

  const cells: (number | null)[] = useMemo(() => {
    const blanks = leadingBlanks(cursor);
    const total = daysInMonth(cursor);
    return [...Array(blanks).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)];
  }, [cursor]);

  const monthLabel = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(cursor);
  const daySessions = selectedDate ? scoped.filter((s) => s.session_date === selectedDate).sort((a, b) => (a.title || '').localeCompare(b.title || '')) : [];
  const today = ymd(new Date());

  if (!ready) return <main style={S.center}>Chargement…</main>;
  if (!ok) return <main style={S.center}>Accès staff requis.</main>;

  return (
    <main style={S.main}>
      <header style={S.header}>
        <div>
          <span style={S.kicker}>SPORT & PERFORMANCE</span>
          <h1>Calendrier</h1>
          <p>Planning des séances de l'équipe et disponibilités déclarées.</p>
        </div>
        <a href="/admin/sport" style={S.back}>← Sport & Performance</a>
      </header>
      <section style={S.toolbar}>
        <label>Environnement<select value={org} onChange={(e) => setOrg(e.target.value)} style={S.input}>{environments.map((e) => <option key={e.id} value={e.id}>{e.branding?.label || e.name}</option>)}</select></label>
        {usesTeams(org) && <label>Équipe<select value={team} onChange={(e) => setTeam(e.target.value)} style={S.input}><option value="">Toutes</option>{teamsFor(org).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>}
      </section>
      <section style={S.grid}>
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
              const av = availByDay.get(date);
              return (
                <button key={i} onClick={() => setSelectedDate(date)} style={{ ...S.dayCell, ...(date === selectedDate ? S.dayCellActive : {}), ...(date === today ? S.dayCellToday : {}) }}>
                  <span>{day}</span>
                  <div style={S.dots}>{list.slice(0, 4).map((s) => <span key={s.id} style={{ ...S.dot, background: TYPE_COLOR[s.type] || '#71717A' }} />)}</div>
                  {av && av.absent > 0 && <small style={S.absentBadge}>{av.absent} abs.</small>}
                </button>
              );
            })}
          </div>
          <div style={S.legend}>{Object.entries(TYPE_LABEL).map(([k, v]) => <span key={k} style={S.legendItem}><i style={{ ...S.dot, background: TYPE_COLOR[k] }} />{v}</span>)}</div>
        </article>
        <article style={S.card}>
          <h2>{selectedDate ? new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(selectedDate)) : 'Sélectionne un jour'}</h2>
          {daySessions.map((s) => {
            const av = availByDay.get(s.session_date);
            return (
              <div key={s.id} style={S.row}>
                <span>
                  <b>{s.title || TYPE_LABEL[s.type] || s.type}</b>
                  <small>{TYPE_LABEL[s.type] || s.type}{s.location ? ` · ${s.location}` : ''}{s.planned_duration_min ? ` · ${s.planned_duration_min} min` : ''}</small>
                </span>
                <span style={{ display: 'flex', gap: 8 }}>
                  {av && <small style={{ color: '#A1A1AA' }}>{av.present} présents · {av.absent} absents</small>}
                  <a href="/admin/sport/sessions" style={S.smallGhost}>Ouvrir</a>
                </span>
              </div>
            );
          })}
          {selectedDate && !daySessions.length && <p style={{ color: '#A1A1AA' }}>Aucune séance ce jour. Crée-la depuis <a href="/admin/sport/sessions" style={{ color: '#fff' }}>Séances</a>.</p>}
        </article>
      </section>
    </main>
  );
}

const S: Record<string, React.CSSProperties> = {
  center: { minHeight: '80vh', display: 'grid', placeItems: 'center' },
  main: { minHeight: '100vh', background: '#09090B', color: '#FAFAFA', fontFamily: 'Inter,system-ui,sans-serif', padding: 28 },
  header: { maxWidth: 1200, margin: '0 auto 20px', display: 'flex', justifyContent: 'space-between', gap: 20 },
  kicker: { fontSize: 11, fontWeight: 900, letterSpacing: 1.4, color: '#E31E24' },
  back: { color: '#fff', textDecoration: 'none', border: '1px solid #2B2B31', padding: '10px 12px', borderRadius: 10, height: 'fit-content' },
  toolbar: { maxWidth: 1200, margin: '0 auto 16px', background: '#141416', border: '1px solid #2B2B31', borderRadius: 16, padding: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 },
  input: { width: '100%', height: 42, background: '#1B1B1F', color: '#fff', border: '1px solid #2B2B31', borderRadius: 10, padding: '0 10px', marginTop: 6, boxSizing: 'border-box' },
  grid: { maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'minmax(340px,1.1fr) minmax(280px,.9fr)', gap: 14 },
  card: { background: '#141416', border: '1px solid #2B2B31', borderRadius: 16, padding: 16, display: 'grid', gap: 10, alignContent: 'start' },
  monthNav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  weekRow: { display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 },
  weekDay: { textAlign: 'center', fontSize: 11, color: '#71717A', fontWeight: 700 },
  monthGrid: { display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 },
  blankCell: { minHeight: 58 },
  dayCell: { minHeight: 58, background: '#1B1B1F', border: '1px solid #2B2B31', borderRadius: 10, color: '#fff', display: 'grid', gap: 4, alignContent: 'start', padding: 6, cursor: 'pointer', textAlign: 'left', fontWeight: 700 },
  dayCellActive: { borderColor: '#E31E24' },
  dayCellToday: { boxShadow: 'inset 0 0 0 1px #fff' },
  dots: { display: 'flex', gap: 3, flexWrap: 'wrap' },
  dot: { width: 6, height: 6, borderRadius: 999, display: 'inline-block' },
  absentBadge: { color: '#F87171', fontWeight: 700 },
  legend: { display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 6 },
  legendItem: { display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#A1A1AA' },
  row: { display: 'flex', justifyContent: 'space-between', gap: 10, padding: '10px 0', borderBottom: '1px solid #2B2B31', alignItems: 'center' },
  smallGhost: { border: '1px solid #2B2B31', borderRadius: 8, padding: '6px 10px', fontWeight: 700, color: '#fff', background: 'transparent', cursor: 'pointer', fontSize: 12, textDecoration: 'none' },
};
