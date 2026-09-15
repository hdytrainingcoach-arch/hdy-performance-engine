'use client';

import { useEffect, useState } from 'react';
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

function TemplateEditor({ template, orgId, onClose }: { template: Row; orgId: string; onClose: () => void }) {
  const [exercises, setExercises] = useState<Row[]>([]);
  const [content, setContent] = useState<Row[]>([]);
  const [exerciseId, setExerciseId] = useState('');
  const [sets, setSets] = useState(4);
  const [reps, setReps] = useState('6');
  const [loadType, setLoadType] = useState('pct_1rm');
  const [loadNote, setLoadNote] = useState('75');
  const [tempo, setTempo] = useState('');
  const [rest, setRest] = useState(120);
  const [msg, setMsg] = useState('');

  async function load() {
    const [{ data: ex }, { data: te }] = await Promise.all([
      supabase.from('exercises').select('*').eq('organization_id', orgId).eq('active', true).order('name'),
      supabase.from('program_template_exercises').select('*, exercise:exercises(name,category)').eq('template_id', template.id).order('position'),
    ]);
    setExercises(ex || []);
    setContent(te || []);
    if (!exerciseId && ex?.length) setExerciseId(ex[0].id);
  }
  useEffect(() => { load(); }, [template.id]);

  async function add() {
    if (!exerciseId) { setMsg('Choisis un exercice.'); return; }
    const { error } = await supabase.from('program_template_exercises').insert({
      organization_id: orgId, template_id: template.id, exercise_id: exerciseId, position: content.length,
      sets: sets || null, reps: reps || null, load_type: loadType || null, load_note: loadNote || null,
      tempo: tempo || null, rest_seconds: rest || null,
    });
    setMsg(error ? error.message : 'Exercice ajouté au modèle ✓');
    if (!error) await load();
  }
  async function remove(id: string) {
    const { error } = await supabase.from('program_template_exercises').delete().eq('id', id);
    if (!error) await load();
  }

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={S.h2}>Modèle · {template.name}</h2>
          <button onClick={onClose} style={S.smallGhost}>Fermer</button>
        </div>
        {msg && <div style={S.notice}>{msg}</div>}
        <div style={S.programGrid}>
          <div style={S.card}>
            <h3 style={S.h3}>Ajouter un exercice</h3>
            <label style={S.label}>Exercice<select value={exerciseId} onChange={(e) => setExerciseId(e.target.value)} style={S.input}>{exercises.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
            <div style={S.threeCol}>
              <label style={S.label}>Séries<input type="number" value={sets} onChange={(e) => setSets(Number(e.target.value))} style={S.input} /></label>
              <label style={S.label}>Répétitions<input value={reps} onChange={(e) => setReps(e.target.value)} style={S.input} /></label>
              <label style={S.label}>Récup. (s)<input type="number" value={rest} onChange={(e) => setRest(Number(e.target.value))} style={S.input} /></label>
            </div>
            <div style={S.twoCol}>
              <label style={S.label}>Type de charge<select value={loadType} onChange={(e) => setLoadType(e.target.value)} style={S.input}>{LOAD_TYPES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}</select></label>
              <label style={S.label}>Valeur<input value={loadNote} onChange={(e) => setLoadNote(e.target.value)} style={S.input} /></label>
            </div>
            <label style={S.label}>Tempo<input value={tempo} onChange={(e) => setTempo(e.target.value)} style={S.input} placeholder="3-1-1-0" /></label>
            <button onClick={add} style={S.primary}>Ajouter au modèle</button>
          </div>
          <div style={S.card}>
            <h3 style={S.h3}>Contenu du modèle ({content.length})</h3>
            {content.map((c, i) => (
              <div key={c.id} style={S.row}>
                <span>
                  <b>{i + 1}. {c.exercise?.name || '—'}</b>
                  <small style={S.small}>
                    {c.sets ? `${c.sets}×${c.reps || '—'}` : c.reps || ''}
                    {c.load_note ? ` · ${c.load_note}${c.load_type ? ` ${LOAD_TYPES.find((l) => l.value === c.load_type)?.label || ''}` : ''}` : ''}
                    {c.tempo ? ` · tempo ${c.tempo}` : ''}
                  </small>
                </span>
                <button onClick={() => remove(c.id)} style={S.smallGhost}>Retirer</button>
              </div>
            ))}
            {!content.length && <p style={{ color: '#71717A' }}>Modèle vide pour l'instant.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CoachTemplatesPage() {
  const { scope } = useCoach();
  const [templates, setTemplates] = useState<Row[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [msg, setMsg] = useState('');
  const [editing, setEditing] = useState<Row | null>(null);

  async function load() {
    if (!scope) return;
    const { data } = await supabase.from('program_templates').select('*').eq('organization_id', scope.organizationId).order('created_at', { ascending: false });
    setTemplates(data || []);
  }
  useEffect(() => { load(); }, [scope?.organizationId]);

  async function create() {
    if (!scope || !name.trim()) { setMsg('Nom requis.'); return; }
    const { error } = await supabase.from('program_templates').insert({ organization_id: scope.organizationId, name: name.trim(), description: description.trim() || null });
    setMsg(error ? error.message : 'Modèle créé ✓');
    if (!error) { setName(''); setDescription(''); await load(); }
  }
  async function toggleActive(t: Row) {
    const { error } = await supabase.from('program_templates').update({ active: !t.active }).eq('id', t.id);
    if (!error) await load();
  }

  return (
    <div>
      <header style={S.pageHead}>
        <p style={S.eyebrow}>MODÈLES</p>
        <h1 style={S.h1}>Programmes réutilisables</h1>
        <p style={S.sub}>Construis un bloc une fois (force, puissance, prépa physique…) et applique-le en un clic à n'importe quelle séance.</p>
      </header>
      {msg && <div style={S.notice}>{msg}</div>}
      <div style={S.grid}>
        <article style={S.card}>
          <h2 style={S.h2}>Nouveau modèle</h2>
          <label style={S.label}>Nom<input value={name} onChange={(e) => setName(e.target.value)} style={S.input} placeholder="Force bas du corps — semaine 1" /></label>
          <label style={S.label}>Description<textarea value={description} onChange={(e) => setDescription(e.target.value)} style={S.textarea} /></label>
          <button onClick={create} style={S.primary}>Créer le modèle</button>
        </article>
        <article style={S.card}>
          <h2 style={S.h2}>Modèles ({templates.length})</h2>
          {templates.map((t) => (
            <div key={t.id} style={S.row}>
              <span><b style={{ opacity: t.active ? 1 : 0.4 }}>{t.name}</b>{t.description && <small style={S.small}>{t.description}</small>}</span>
              <span style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setEditing(t)} style={S.smallGhost}>Contenu</button>
                <button onClick={() => toggleActive(t)} style={S.smallGhost}>{t.active ? 'Désactiver' : 'Réactiver'}</button>
              </span>
            </div>
          ))}
          {!templates.length && <p style={{ color: '#71717A' }}>Aucun modèle pour l'instant.</p>}
        </article>
      </div>
      {editing && scope && <TemplateEditor template={editing} orgId={scope.organizationId} onClose={() => setEditing(null)} />}
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
  textarea: { width: '100%', minHeight: 70, background: '#1B1B1F', color: '#fff', border: '1px solid #2B2B31', borderRadius: 10, padding: 10, boxSizing: 'border-box', fontFamily: 'inherit', fontSize: 14 },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  threeCol: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 },
  primary: { border: 0, borderRadius: 10, padding: '12px 15px', fontWeight: 850, color: '#04120C', background: ACCENT, cursor: 'pointer' },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid #1E2023' },
  small: { display: 'block', color: '#71717A', marginTop: 2 },
  smallGhost: { border: '1px solid #2B2B31', borderRadius: 8, padding: '6px 10px', fontWeight: 700, color: '#fff', background: 'transparent', cursor: 'pointer', fontSize: 12 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'grid', placeItems: 'center', padding: 20, zIndex: 50 },
  modal: { background: '#0D0D0F', border: '1px solid #24262A', borderRadius: 18, padding: 20, maxWidth: 900, width: '100%', maxHeight: '88vh', overflowY: 'auto', display: 'grid', gap: 14 },
  programGrid: { display: 'grid', gridTemplateColumns: 'minmax(260px,.9fr) minmax(0,1.1fr)', gap: 14 },
};
