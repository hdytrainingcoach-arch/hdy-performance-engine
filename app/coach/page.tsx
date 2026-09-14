'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useCoach } from '@/lib/coach-context';

type Row = Record<string, any>;

export default function CoachHomePage() {
  const { scope } = useCoach();
  const [sessions, setSessions] = useState<Row[]>([]);
  const [exerciseCount, setExerciseCount] = useState(0);

  useEffect(() => {
    (async () => {
      if (!scope) return;
      const today = new Date().toISOString().slice(0, 10);
      const in7 = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
      let q = supabase.from('sessions').select('*').eq('organization_id', scope.organizationId).gte('session_date', today).lte('session_date', in7);
      q = scope.teamId ? q.eq('team_id', scope.teamId) : q.is('team_id', null);
      const [{ data: s }, { count }] = await Promise.all([
        q.order('session_date', { ascending: true }),
        supabase.from('exercises').select('id', { count: 'exact', head: true }).eq('organization_id', scope.organizationId).eq('active', true),
      ]);
      setSessions(s || []);
      setExerciseCount(count || 0);
    })();
  }, [scope?.organizationId, scope?.teamId]);

  const todaySessions = useMemo(() => sessions.filter((s) => s.session_date === new Date().toISOString().slice(0, 10)), [sessions]);

  return (
    <div>
      <header style={S.pageHead}>
        <p style={S.eyebrow}>{new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}</p>
        <h1 style={S.h1}>Salut {scope?.teamName ? `coach ${scope.teamName}` : 'coach'} 👋</h1>
        <p style={S.sub}>Banque d'exercices, programmation musculation & préparation physique.</p>
      </header>
      <section style={S.statsGrid}>
        <div style={S.statCard}><span style={S.statLabel}>Séances aujourd'hui</span><strong style={S.statValue}>{todaySessions.length}</strong></div>
        <div style={S.statCard}><span style={S.statLabel}>Séances 7 prochains jours</span><strong style={S.statValue}>{sessions.length}</strong></div>
        <div style={S.statCard}><span style={S.statLabel}>Exercices actifs</span><strong style={S.statValue}>{exerciseCount}</strong></div>
      </section>
      <section style={S.card}>
        <h2 style={S.h2}>Séances à venir</h2>
        {sessions.map((s) => (
          <div key={s.id} style={S.row}>
            <span><b>{s.title || s.type}</b><small style={S.small}>{s.session_date}{s.location ? ` · ${s.location}` : ''}</small></span>
          </div>
        ))}
        {!sessions.length && <p style={{ color: '#71717A' }}>Rien de programmé cette semaine.</p>}
      </section>
      <section style={S.quickGrid}>
        <a href="/coach/sessions" style={S.quickCard}><b>Séances</b><span>Créer et programmer une séance</span></a>
        <a href="/coach/exercises" style={S.quickCard}><b>Exercices</b><span>Gérer la banque d'exercices</span></a>
        <a href="/coach/calendar" style={S.quickCard}><b>Calendrier</b><span>Vue mensuelle du planning</span></a>
      </section>
    </div>
  );
}

const ACCENT = '#10B981';
const S: Record<string, React.CSSProperties> = {
  pageHead: { marginBottom: 18 },
  eyebrow: { fontSize: 11, fontWeight: 900, letterSpacing: 1.6, color: ACCENT, margin: 0, textTransform: 'capitalize' },
  h1: { fontSize: 30, margin: '4px 0 6px', letterSpacing: -0.5 },
  h2: { fontSize: 16, margin: '0 0 4px' },
  sub: { color: '#A1A1AA', margin: 0 },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12, margin: '18px 0' },
  statCard: { background: '#141416', border: '1px solid #24262A', borderRadius: 14, padding: 16, display: 'grid', gap: 6 },
  statLabel: { fontSize: 12, color: '#A1A1AA' },
  statValue: { fontSize: 28, fontWeight: 900 },
  card: { background: '#141416', border: '1px solid #24262A', borderRadius: 16, padding: 18, marginBottom: 18 },
  row: { display: 'flex', justifyContent: 'space-between', gap: 10, padding: '10px 0', borderBottom: '1px solid #1E2023' },
  small: { display: 'block', color: '#71717A', marginTop: 2 },
  quickGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12 },
  quickCard: { background: '#141416', border: '1px solid #24262A', borderRadius: 14, padding: 16, color: '#fff', textDecoration: 'none', display: 'grid', gap: 6 },
};
