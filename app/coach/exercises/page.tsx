'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useCoach } from '@/lib/coach-context';

type Row = Record<string, any>;

const GROUPS = [
  { key: 'musculation', label: 'Musculation', categories: ['force', 'hypertrophie', 'puissance', 'gainage'] },
  { key: 'prepa', label: 'Préparation physique', categories: ['vitesse', 'pliometrie', 'mobilite', 'prevention', 'cardio'] },
  { key: 'autre', label: 'Échauffement & récupération', categories: ['echauffement', 'etirement', 'recuperation'] },
];
const CATEGORY_LABEL: Record<string, string> = {
  force: 'Force', hypertrophie: 'Hypertrophie', puissance: 'Puissance', gainage: 'Gainage / core',
  vitesse: 'Vitesse', pliometrie: 'Pliométrie', mobilite: 'Mobilité', prevention: 'Prévention', cardio: 'Cardio / aérobie',
  echauffement: 'Échauffement', etirement: 'Étirement', recuperation: 'Récupération',
  technique: 'Technique', physique: 'Physique', tactique: 'Tactique', renforcement: 'Renforcement', gardien: 'Gardien',
};
const ALL_CATEGORIES = GROUPS.flatMap((g) => g.categories);

export default function CoachExercisesPage() {
  const { scope } = useCoach();
  const [exercises, setExercises] = useState<Row[]>([]);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('force');
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [equipment, setEquipment] = useState('');
  const [targetMuscles, setTargetMuscles] = useState('');
  const [filterGroup, setFilterGroup] = useState('');
  const [msg, setMsg] = useState('');
  const [editingId, setEditingId] = useState('');

  async function load() {
    if (!scope) return;
    const { data } = await supabase.from('exercises').select('*').eq('organization_id', scope.organizationId).order('created_at', { ascending: false }).limit(500);
    setExercises(data || []);
  }
  useEffect(() => { load(); }, [scope?.organizationId]);

  const visible = useMemo(() => {
    const cats = filterGroup ? GROUPS.find((g) => g.key === filterGroup)?.categories || [] : null;
    return exercises.filter((e) => !cats || cats.includes(e.category));
  }, [exercises, filterGroup]);

  function resetForm() {
    setEditingId(''); setName(''); setCategory('force'); setDescription(''); setVideoUrl(''); setEquipment(''); setTargetMuscles('');
  }
  function edit(e: Row) {
    setEditingId(e.id); setName(e.name || ''); setCategory(e.category || 'force'); setDescription(e.description || '');
    setVideoUrl(e.video_url || ''); setEquipment(e.equipment || ''); setTargetMuscles(e.target_muscles || ''); setMsg('');
  }

  async function save() {
    if (!scope) return;
    if (!name.trim()) { setMsg('Nom requis.'); return; }
    const payload = {
      organization_id: scope.organizationId, name: name.trim(), category,
      description: description.trim() || null, video_url: videoUrl.trim() || null,
      equipment: equipment.trim() || null, target_muscles: targetMuscles.trim() || null,
    };
    const { error } = editingId
      ? await supabase.from('exercises').update(payload).eq('id', editingId)
      : await supabase.from('exercises').insert(payload);
    setMsg(error ? error.message : editingId ? 'Exercice mis à jour ✓' : 'Exercice ajouté ✓');
    if (!error) { resetForm(); await load(); }
  }

  async function toggleActive(e: Row) {
    const { error } = await supabase.from('exercises').update({ active: !e.active }).eq('id', e.id);
    if (!error) await load();
  }

  return (
    <div>
      <header style={S.pageHead}>
        <p style={S.eyebrow}>BANQUE D'EXERCICES</p>
        <h1 style={S.h1}>Musculation & préparation physique</h1>
        <p style={S.sub}>Bibliothèque réutilisable pour construire tes séances de force, puissance, vitesse et prévention.</p>
      </header>
      <div style={S.filterRow}>
        <button onClick={() => setFilterGroup('')} style={filterGroup === '' ? S.filterActive : S.filter}>Tout</button>
        {GROUPS.map((g) => <button key={g.key} onClick={() => setFilterGroup(g.key)} style={filterGroup === g.key ? S.filterActive : S.filter}>{g.label}</button>)}
      </div>
      {msg && <div style={S.notice}>{msg}</div>}
      <div style={S.grid}>
        <article style={S.card}>
          <h2 style={S.h2}>{editingId ? "Modifier l'exercice" : 'Nouvel exercice'}</h2>
          <label style={S.label}>Nom<input value={name} onChange={(e) => setName(e.target.value)} style={S.input} placeholder="Squat arrière, sprint 20m…" /></label>
          <label style={S.label}>
            Catégorie
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={S.input}>
              {GROUPS.map((g) => (
                <optgroup key={g.key} label={g.label}>
                  {g.categories.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
                </optgroup>
              ))}
            </select>
          </label>
          <label style={S.label}>Description / consigne technique<textarea value={description} onChange={(e) => setDescription(e.target.value)} style={S.textarea} /></label>
          <label style={S.label}>Lien vidéo (optionnel)<input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} style={S.input} placeholder="https://…" /></label>
          <label style={S.label}>Matériel<input value={equipment} onChange={(e) => setEquipment(e.target.value)} style={S.input} placeholder="Barre, haltères, élastique, box…" /></label>
          <label style={S.label}>Groupes musculaires ciblés<input value={targetMuscles} onChange={(e) => setTargetMuscles(e.target.value)} style={S.input} placeholder="Quadriceps, fessiers, ischios…" /></label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={save} style={S.primary}>{editingId ? 'Enregistrer' : "Ajouter l'exercice"}</button>
            {editingId && <button onClick={resetForm} style={S.ghost}>Annuler</button>}
          </div>
        </article>
        <article style={S.card}>
          <h2 style={S.h2}>Exercices ({visible.length})</h2>
          {visible.map((e) => (
            <div key={e.id} style={S.row}>
              <span>
                <b style={{ opacity: e.active ? 1 : 0.4 }}>{e.name}</b>
                <small style={S.small}>{CATEGORY_LABEL[e.category] || e.category}{e.equipment ? ` · ${e.equipment}` : ''}</small>
              </span>
              <span style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => edit(e)} style={S.smallGhost}>Modifier</button>
                <button onClick={() => toggleActive(e)} style={S.smallGhost}>{e.active ? 'Désactiver' : 'Réactiver'}</button>
              </span>
            </div>
          ))}
          {!visible.length && <p style={{ color: '#71717A' }}>Aucun exercice pour ce filtre.</p>}
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
  filterRow: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 },
  filter: { border: '1px solid #2B2B31', borderRadius: 999, padding: '7px 14px', fontSize: 12, fontWeight: 700, color: '#A1A1AA', background: 'transparent', cursor: 'pointer' },
  filterActive: { border: '1px solid ' + ACCENT, borderRadius: 999, padding: '7px 14px', fontSize: 12, fontWeight: 700, color: '#04120C', background: ACCENT, cursor: 'pointer' },
  notice: { background: '#141416', border: '1px solid #2B2B31', borderRadius: 12, padding: 12, marginBottom: 14 },
  grid: { display: 'grid', gridTemplateColumns: 'minmax(280px,.8fr) minmax(0,1.2fr)', gap: 14 },
  card: { background: '#141416', border: '1px solid #24262A', borderRadius: 16, padding: 18, display: 'grid', gap: 12, alignContent: 'start' },
  label: { fontSize: 12, color: '#A1A1AA', display: 'grid', gap: 6 },
  input: { width: '100%', height: 42, background: '#1B1B1F', color: '#fff', border: '1px solid #2B2B31', borderRadius: 10, padding: '0 10px', boxSizing: 'border-box', fontSize: 14 },
  textarea: { width: '100%', minHeight: 80, background: '#1B1B1F', color: '#fff', border: '1px solid #2B2B31', borderRadius: 10, padding: 10, boxSizing: 'border-box', fontFamily: 'inherit', fontSize: 14 },
  primary: { border: 0, borderRadius: 10, padding: '12px 15px', fontWeight: 850, color: '#04120C', background: ACCENT, cursor: 'pointer' },
  ghost: { border: '1px solid #2B2B31', borderRadius: 10, padding: '12px 15px', fontWeight: 850, color: '#fff', background: 'transparent', cursor: 'pointer' },
  smallGhost: { border: '1px solid #2B2B31', borderRadius: 8, padding: '6px 10px', fontWeight: 700, color: '#fff', background: 'transparent', cursor: 'pointer', fontSize: 12 },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid #1E2023' },
  small: { display: 'block', color: '#71717A', marginTop: 2 },
};
