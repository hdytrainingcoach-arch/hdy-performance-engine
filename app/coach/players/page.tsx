'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useCoach } from '@/lib/coach-context';
import { suggestedLoadKg } from '@/lib/stats';

type Row = Record<string, any>;

export default function CoachPlayersPage() {
  const { scope } = useCoach();
  const [players, setPlayers] = useState<Row[]>([]);
  const [exercises, setExercises] = useState<Row[]>([]);
  const [oneRms, setOneRms] = useState<Row[]>([]);
  const [playerId, setPlayerId] = useState('');
  const [exerciseId, setExerciseId] = useState('');
  const [valueKg, setValueKg] = useState(0);
  const [method, setMethod] = useState('tested');
  const [notes, setNotes] = useState('');
  const [msg, setMsg] = useState('');

  async function load() {
    if (!scope) return;
    let q = supabase.from('players').select('id,display_name,first_name,last_name,primary_position,position').eq('organization_id', scope.organizationId).eq('active', true);
    q = scope.teamId ? q.eq('team_id', scope.teamId) : q.is('team_id', null);
    const [{ data: p }, { data: ex }] = await Promise.all([
      q.order('last_name'),
      supabase.from('exercises').select('id,name,category').eq('organization_id', scope.organizationId).eq('active', true).order('name'),
    ]);
    setPlayers(p || []);
    setExercises(ex || []);
    if (!playerId && p?.length) setPlayerId(p[0].id);
    if (!exerciseId && ex?.length) setExerciseId(ex[0].id);
    const ids = (p || []).map((x) => x.id);
    if (ids.length) {
      const { data: r } = await supabase.from('player_one_rep_maxes').select('*').in('player_id', ids).order('recorded_at', { ascending: false }).limit(500);
      setOneRms(r || []);
    } else setOneRms([]);
  }
  useEffect(() => { load(); }, [scope?.organizationId, scope?.teamId]);

  function playerName(id: string) {
    const p = players.find((x) => x.id === id);
    return p ? p.display_name || `${p.first_name} ${p.last_name}` : '—';
  }
  function exerciseName(id: string) {
    return exercises.find((x) => x.id === id)?.name || '—';
  }

  const selectedPlayerRms = useMemo(() => oneRms.filter((r) => r.player_id === playerId), [oneRms, playerId]);
  // Dernier 1RM connu par exercice, pour ce joueur.
  const latestByExercise = useMemo(() => {
    const m = new Map<string, Row>();
    for (const r of selectedPlayerRms) if (!m.has(r.exercise_id)) m.set(r.exercise_id, r);
    return m;
  }, [selectedPlayerRms]);

  async function save() {
    if (!scope || !playerId || !exerciseId || !valueKg) { setMsg('Sélectionne un joueur, un exercice et une valeur.'); return; }
    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase.from('player_one_rep_maxes').insert({
      organization_id: scope.organizationId, player_id: playerId, exercise_id: exerciseId,
      value_kg: valueKg, method, notes: notes || null, recorded_by: session?.user.id || null,
    });
    setMsg(error ? error.message : '1RM enregistré ✓');
    if (!error) { setNotes(''); await load(); }
  }

  return (
    <div>
      <header style={S.pageHead}>
        <p style={S.eyebrow}>SUIVI INDIVIDUEL</p>
        <h1 style={S.h1}>1RM & charges de référence</h1>
        <p style={S.sub}>Historique par joueur × exercice — sert à suggérer la charge en kg quand une séance est programmée en %1RM.</p>
      </header>
      {msg && <div style={S.notice}>{msg}</div>}
      <div style={S.grid}>
        <article style={S.card}>
          <h2 style={S.h2}>Nouveau 1RM</h2>
          <label style={S.label}>Joueur<select value={playerId} onChange={(e) => setPlayerId(e.target.value)} style={S.input}>{players.map((p) => <option key={p.id} value={p.id}>{p.display_name || `${p.first_name} ${p.last_name}`}</option>)}</select></label>
          <label style={S.label}>Exercice<select value={exerciseId} onChange={(e) => setExerciseId(e.target.value)} style={S.input}>{exercises.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
          <div style={S.twoCol}>
            <label style={S.label}>Valeur (kg)<input type="number" step="0.5" value={valueKg || ''} onChange={(e) => setValueKg(Number(e.target.value))} style={S.input} /></label>
            <label style={S.label}>Méthode<select value={method} onChange={(e) => setMethod(e.target.value)} style={S.input}><option value="tested">Testé</option><option value="estimated">Estimé</option></select></label>
          </div>
          <label style={S.label}>Notes<input value={notes} onChange={(e) => setNotes(e.target.value)} style={S.input} /></label>
          <button onClick={save} style={S.primary}>Enregistrer</button>
        </article>
        <article style={S.card}>
          <h2 style={S.h2}>{playerName(playerId)} — dernières valeurs par exercice</h2>
          {Array.from(latestByExercise.values()).map((r) => (
            <div key={r.exercise_id} style={S.row}>
              <span><b>{exerciseName(r.exercise_id)}</b><small style={S.small}>{new Date(r.recorded_at).toLocaleDateString('fr-FR')} · {r.method === 'estimated' ? 'estimé' : 'testé'}</small></span>
              <strong>{r.value_kg} kg</strong>
            </div>
          ))}
          {!latestByExercise.size && <p style={{ color: '#71717A' }}>Aucun 1RM enregistré pour ce joueur.</p>}
          <h2 style={{ ...S.h2, marginTop: 14 }}>Simulateur de charge</h2>
          <p style={{ color: '#71717A', fontSize: 12, margin: 0 }}>À partir du dernier 1RM connu, la charge suggérée pour quelques % courants :</p>
          {Array.from(latestByExercise.values()).map((r) => (
            <div key={r.exercise_id} style={S.simRow}>
              <b>{exerciseName(r.exercise_id)}</b>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {[60, 70, 75, 80, 85, 90].map((pct) => <span key={pct} style={S.simPill}>{pct}% → {suggestedLoadKg(r.value_kg, pct)} kg</span>)}
              </div>
            </div>
          ))}
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
  sub: { color: '#A1A1AA', margin: 0, maxWidth: 560 },
  notice: { background: '#141416', border: '1px solid #2B2B31', borderRadius: 12, padding: 12, marginBottom: 14 },
  grid: { display: 'grid', gridTemplateColumns: 'minmax(280px,.8fr) minmax(0,1.2fr)', gap: 14 },
  card: { background: '#141416', border: '1px solid #24262A', borderRadius: 16, padding: 18, display: 'grid', gap: 12, alignContent: 'start' },
  label: { fontSize: 12, color: '#A1A1AA', display: 'grid', gap: 6 },
  input: { width: '100%', height: 42, background: '#1B1B1F', color: '#fff', border: '1px solid #2B2B31', borderRadius: 10, padding: '0 10px', boxSizing: 'border-box', fontSize: 14 },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  primary: { border: 0, borderRadius: 10, padding: '12px 15px', fontWeight: 850, color: '#04120C', background: ACCENT, cursor: 'pointer' },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid #1E2023' },
  small: { display: 'block', color: '#71717A', marginTop: 2 },
  simRow: { display: 'grid', gap: 6, padding: '10px 0', borderTop: '1px solid #1E2023' },
  simPill: { fontSize: 12, background: '#1B1B1F', border: '1px solid #2B2B31', borderRadius: 999, padding: '4px 10px' },
};
