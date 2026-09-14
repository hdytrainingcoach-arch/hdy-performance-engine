'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useCoach } from '@/lib/coach-context';

type Row = Record<string, any>;
const LOAD_TYPES = [
  { value: 'kg', label: 'kg' },
  { value: 'pct_1rm', label: '% 1RM' },
  { value: 'rpe', label: 'RPE' },
  { value: 'poids_corps', label: 'Poids de corps' },
  { value: 'autre', label: 'Autre' },
];

function SessionProgram({ session, orgId, onClose }: { session: Row; orgId: string; onClose: () => void }) {
  const [exercises, setExercises] = useState<Row[]>([]);
  const [content, setContent] = useState<Row[]>([]);
  const [exerciseId, setExerciseId] = useState('');
  const [sets, setSets] = useState(4);
  const [reps, setReps] = useState('6');
  const [loadType, setLoadType] = useState('pct_1rm');
  const [loadNote, setLoadNote] = useState('75');
  const [tempo, setTempo] = useState('');
  const [rest, setRest] = useState(120);
  const [notes, setNotes] = useState('');
  const [msg, setMsg] = useState('');

  async function load() {
    const [{ data: ex }, { data: se }] = await Promise.all([
      supabase.from('exercises').select('*').eq('organization_id', orgId).eq('active', true).order('name'),
      supabase.from('session_exercises').select('*, exercise:exercises(name,category)').eq('session_id', session.id).order('position'),
    ]);
    setExercises(ex || []);
    setContent(se || []);
    if (!exerciseId && ex?.length) setExerciseId(ex[0].id);
  }
  useEffect(() => { load(); }, [session.id]);

  async function add() {
    if (!exerciseId) { setMsg('Choisis un exercice.'); return; }
    const { error } = await supabase.from('session_exercises').insert({
      organization_id: orgId, session_id: session.id, exercise_id: exerciseId, position: content.length,
      sets: sets || null, reps: reps || null, load_type: loadType || null, load_note: loadNote || null,
      tempo: tempo || null, rest_seconds: rest || null, notes: notes || null,
    });
    setMsg(error ? error.message : 'Exercice ajouté au programme ✓');
    if (!error) { setNotes(''); await load(); }
  }
  async function remove(id: string) {
    const { error } = await supabase.from('session_exercises').delete().eq('id', id);
    if (!error) await load();
  }

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={S.h2}>Programme · {session.title || session.type} · {session.session_date}</h2>
          <button onClick={onClose} style={S.smallGhost}>Fermer</button>
        </div>
        {msg && <div style={S.notice}>{msg}</div>}
        <div style={S.programGrid}>
          <div style={S.card}>
            <h3 style={S.h3}>Ajouter un exercice</h3>
            <label style={S.label}>Exercice<select value={exerciseId} onChange={(e) => setExerciseId(e.target.value)} style={S.input}>{exercises.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
            <div style={S.threeCol}>
              <label style={S.label}>Séries<input type="number" value={sets} onChange={(e) => setSets(Number(e.target.value))} style={S.input} /></label>
              <label style={S.label}>Répétitions<input value={reps} onChange={(e) => setReps(e.target.value)} style={S.input} placeholder="6 ou AMRAP" /></label>
              <label style={S.label}>Récup. (s)<input type="number" value={rest} onChange={(e) => setRest(Number(e.target.value))} style={S.input} /></label>
            </div>
            <div style={S.twoCol}>
              <label style={S.label}>Type de charge<select value={loadType} onChange={(e) => setLoadType(e.target.value)} style={S.input}>{LOAD_TYPES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}</select></label>
              <label style={S.label}>Valeur<input value={loadNote} onChange={(e) => setLoadNote(e.target.value)} style={S.input} placeholder="75" /></label>
            </div>
            <label style={S.label}>Tempo (exc-pause-conc-pause)<input value={tempo} onChange={(e) => setTempo(e.target.value)} style={S.input} placeholder="3-1-1-0" /></label>
            <label style={S.label}>Notes<input value={notes} onChange={(e) => setNotes(e.target.value)} style={S.input} /></label>
            <button onClick={add} style={S.primary}>Ajouter au programme</button>
            {!exercises.length && <small style={{ color: '#71717A' }}>Aucun exercice actif dans la <a href="/coach/exercises" style={{ color: '#fff' }}>banque d'exercices</a>.</small>}
          </div>
          <div style={S.card}>
            <h3 style={S.h3}>Programme de la séance ({content.length})</h3>
            {content.map((c, i) => (
              <div key={c.id} style={S.row}>
                <span>
                  <b>{i + 1}. {c.exercise?.name || '—'}</b>
                  <small style={S.small}>
                    {c.sets ? `${c.sets}×${c.reps || '—'}` : c.reps || ''}
                    {c.load_note ? ` · ${c.load_note}${c.load_type ? ` ${LOAD_TYPES.find((l) => l.value === c.load_type)?.label || ''}` : ''}` : ''}
                    {c.tempo ? ` · tempo ${c.tempo}` : ''}
                    {c.rest_seconds ? ` · récup ${c.rest_seconds}s` : ''}
                  </small>
                </span>
                <button onClick={() => remove(c.id)} style={S.smallGhost}>Retirer</button>
              </div>
            ))}
            {!content.length && <p style={{ color: '#71717A' }}>Aucun exercice prescrit pour l'instant.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CoachSessionsPage() {
  const { scope } = useCoach();
  const [sessions, setSessions] = useState<Row[]>([]);
  const [title, setTitle] = useState('Séance de musculation');
  const [type, setType] = useState('gym');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [duration, setDuration] = useState(60);
  const [plannedRpe, setPlannedRpe] = useState(6);
  const [location, setLocation] = useState('');
  const [msg, setMsg] = useState('');
  const [programFor, setProgramFor] = useState<Row | null>(null);

  async function load() {
    if (!scope) return;
    let q = supabase.from('sessions').select('*').eq('organization_id', scope.organizationId);
    q = scope.teamId ? q.eq('team_id', scope.teamId) : q.is('team_id', null);
    const { data } = await q.order('session_date', { ascending: false }).limit(60);
    setSessions(data || []);
  }
  useEffect(() => { load(); }, [scope?.organizationId, scope?.teamId]);

  async function save() {
    if (!scope) return;
    if (!date) { setMsg('Date requise.'); return; }
    const { error } = await supabase.from('sessions').insert({
      organization_id: scope.organizationId, team_id: scope.teamId, type, title: title || null,
      session_date: date, planned_duration_min: duration || null, planned_rpe: plannedRpe || null,
      location: location || null, metadata: { source: 'hdy_coach' },
    });
    setMsg(error ? error.message : 'Séance créée ✓');
    if (!error) await load();
  }

  const upcoming = useMemo(() => sessions.filter((s) => s.session_date >= new Date().toISOString().slice(0, 10)), [sessions]);
  const past = useMemo(() => sessions.filter((s) => s.session_date < new Date().toISOString().slice(0, 10)), [sessions]);

  return (
    <div>
      <header style={S.pageHead}>
        <p style={S.eyebrow}>SÉANCES</p>
        <h1 style={S.h1}>Programmer une séance</h1>
        <p style={S.sub}>Musculation, préparation physique — attache ensuite les exercices de ta banque.</p>
      </header>
      {msg && <div style={S.notice}>{msg}</div>}
      <div style={S.grid}>
        <article style={S.card}>
          <h2 style={S.h2}>Nouvelle séance</h2>
          <label style={S.label}>Titre<input value={title} onChange={(e) => setTitle(e.target.value)} style={S.input} /></label>
          <label style={S.label}>
            Type
            <select value={type} onChange={(e) => setType(e.target.value)} style={S.input}>
              <option value="gym">Musculation</option>
              <option value="training">Préparation physique</option>
              <option value="recovery">Récupération</option>
              <option value="test">Tests</option>
              <option value="rehab">Réathlétisation</option>
            </select>
          </label>
          <label style={S.label}>Date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={S.input} /></label>
          <label style={S.label}>Lieu<input value={location} onChange={(e) => setLocation(e.target.value)} style={S.input} placeholder="Salle de musculation…" /></label>
          <div style={S.twoCol}>
            <label style={S.label}>Durée prévue (min)<input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} style={S.input} /></label>
            <label style={S.label}>RPE prévu<input type="number" min={1} max={10} value={plannedRpe} onChange={(e) => setPlannedRpe(Number(e.target.value))} style={S.input} /></label>
          </div>
          <div style={S.loadBox}>Charge prévisionnelle <b>{duration * plannedRpe} UA</b></div>
          <button onClick={save} style={S.primary}>Créer la séance</button>
        </article>
        <article style={S.card}>
          <h2 style={S.h2}>À venir ({upcoming.length})</h2>
          {upcoming.map((s) => (
            <div key={s.id} style={S.row}>
              <span><b>{s.title || s.type}</b><small style={S.small}>{s.session_date} · {s.type}{s.location ? ` · ${s.location}` : ''}</small></span>
              <button onClick={() => setProgramFor(s)} style={S.smallGhost}>Programme</button>
            </div>
          ))}
          {!upcoming.length && <p style={{ color: '#71717A' }}>Aucune séance à venir.</p>}
          {past.length > 0 && <><h2 style={{ ...S.h2, marginTop: 10 }}>Passées</h2>{past.slice(0, 10).map((s) => (
            <div key={s.id} style={S.row}>
              <span><b>{s.title || s.type}</b><small style={S.small}>{s.session_date} · {s.type}</small></span>
              <button onClick={() => setProgramFor(s)} style={S.smallGhost}>Programme</button>
            </div>
          ))}</>}
        </article>
      </div>
      {programFor && scope && <SessionProgram session={programFor} orgId={scope.organizationId} onClose={() => setProgramFor(null)} />}
    </div>
  );
}

const ACCENT = '#10B981';
const S: Record<string, React.CSSProperties> = {
  pageHead: { marginBottom: 18 },
  eyebrow: { fontSize: 11, fontWeight: 900, letterSpacing: 1.6, color: ACCENT, margin: 0 },
  h1: { fontSize: 28, margin: '4px 0 6px', letterSpacing: -0.5 },
  h2: { fontSize: 16, margin: 0 },
  h3: { fontSize: 14, margin: 0 },
  sub: { color: '#A1A1AA', margin: 0, maxWidth: 560 },
  notice: { background: '#141416', border: '1px solid #2B2B31', borderRadius: 12, padding: 12, marginBottom: 14 },
  grid: { display: 'grid', gridTemplateColumns: 'minmax(280px,.8fr) minmax(0,1.2fr)', gap: 14 },
  card: { background: '#141416', border: '1px solid #24262A', borderRadius: 16, padding: 18, display: 'grid', gap: 12, alignContent: 'start' },
  label: { fontSize: 12, color: '#A1A1AA', display: 'grid', gap: 6 },
  input: { width: '100%', height: 42, background: '#1B1B1F', color: '#fff', border: '1px solid #2B2B31', borderRadius: 10, padding: '0 10px', boxSizing: 'border-box', fontSize: 14 },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  threeCol: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 },
  loadBox: { background: '#1B1B1F', border: '1px solid #2B2B31', borderRadius: 12, padding: 12, display: 'flex', justifyContent: 'space-between' },
  primary: { border: 0, borderRadius: 10, padding: '12px 15px', fontWeight: 850, color: '#04120C', background: ACCENT, cursor: 'pointer' },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid #1E2023' },
  small: { display: 'block', color: '#71717A', marginTop: 2 },
  smallGhost: { border: '1px solid #2B2B31', borderRadius: 8, padding: '6px 10px', fontWeight: 700, color: '#fff', background: 'transparent', cursor: 'pointer', fontSize: 12 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'grid', placeItems: 'center', padding: 20, zIndex: 50 },
  modal: { background: '#0D0D0F', border: '1px solid #24262A', borderRadius: 18, padding: 20, maxWidth: 900, width: '100%', maxHeight: '88vh', overflowY: 'auto', display: 'grid', gap: 14 },
  programGrid: { display: 'grid', gridTemplateColumns: 'minmax(260px,.9fr) minmax(0,1.1fr)', gap: 14 },
};
