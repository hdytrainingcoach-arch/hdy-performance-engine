'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useOrg } from '@/lib/org-context';

type Row = Record<string, any>;
const CATEGORIES = [
  { value: 'echauffement', label: 'Échauffement' },
  { value: 'technique', label: 'Technique' },
  { value: 'physique', label: 'Physique' },
  { value: 'tactique', label: 'Tactique' },
  { value: 'renforcement', label: 'Renforcement' },
  { value: 'etirement', label: 'Étirement' },
  { value: 'recuperation', label: 'Récupération' },
  { value: 'gardien', label: 'Gardien' },
];
const catLabel = (v: string) => CATEGORIES.find((c) => c.value === v)?.label || v;

export default function ExercisesPage() {
  const { environments, currentEnvId: org, setCurrentEnvId: setOrg } = useOrg();
  const [ready, setReady] = useState(false);
  const [ok, setOk] = useState(false);
  const [exercises, setExercises] = useState<Row[]>([]);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('technique');
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [equipment, setEquipment] = useState('');
  const [targetMuscles, setTargetMuscles] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [msg, setMsg] = useState('');
  const [editingId, setEditingId] = useState('');

  async function load() {
    const { data } = await supabase.from('exercises').select('*').order('created_at', { ascending: false }).limit(500);
    setExercises(data || []);
  }

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
      await load();
      setReady(true);
    })();
  }, []);

  const scoped = useMemo(
    () => exercises.filter((e) => e.organization_id === org && (!filterCat || e.category === filterCat)),
    [exercises, org, filterCat],
  );

  function resetForm() {
    setEditingId('');
    setName('');
    setCategory('technique');
    setDescription('');
    setVideoUrl('');
    setEquipment('');
    setTargetMuscles('');
  }

  function edit(e: Row) {
    setEditingId(e.id);
    setName(e.name || '');
    setCategory(e.category || 'technique');
    setDescription(e.description || '');
    setVideoUrl(e.video_url || '');
    setEquipment(e.equipment || '');
    setTargetMuscles(e.target_muscles || '');
    setMsg('');
  }

  async function save() {
    if (!name.trim()) { setMsg('Nom requis.'); return; }
    const payload = {
      organization_id: org,
      name: name.trim(),
      category,
      description: description.trim() || null,
      video_url: videoUrl.trim() || null,
      equipment: equipment.trim() || null,
      target_muscles: targetMuscles.trim() || null,
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

  if (!ready) return <main style={S.center}>Chargement…</main>;
  if (!ok) return <main style={S.center}>Accès staff requis.</main>;

  return (
    <main style={S.main}>
      <header style={S.header}>
        <div>
          <span style={S.kicker}>SPORT & PERFORMANCE</span>
          <h1>Banque d'exercices</h1>
          <p>Bibliothèque réutilisable pour construire le contenu des séances.</p>
        </div>
        <a href="/admin/sport" style={S.back}>← Sport & Performance</a>
      </header>
      <section style={S.toolbar}>
        <label>
          Environnement
          <select value={org} onChange={(e) => setOrg(e.target.value)} style={S.input}>
            {environments.map((e) => <option key={e.id} value={e.id}>{e.branding?.label || e.name}</option>)}
          </select>
        </label>
        <label>
          Filtrer par catégorie
          <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)} style={S.input}>
            <option value="">Toutes</option>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </label>
      </section>
      {msg && <div style={S.notice}>{msg}</div>}
      <section style={S.grid}>
        <article style={S.card}>
          <h2>{editingId ? "Modifier l'exercice" : 'Nouvel exercice'}</h2>
          <label>Nom<input value={name} onChange={(e) => setName(e.target.value)} style={S.input} /></label>
          <label>
            Catégorie
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={S.input}>
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </label>
          <label>Description / consigne<textarea value={description} onChange={(e) => setDescription(e.target.value)} style={S.textarea} /></label>
          <label>Lien vidéo (optionnel)<input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} style={S.input} placeholder="https://…" /></label>
          <label>Matériel<input value={equipment} onChange={(e) => setEquipment(e.target.value)} style={S.input} placeholder="Plots, échelle de rythme…" /></label>
          <label>Groupes musculaires ciblés<input value={targetMuscles} onChange={(e) => setTargetMuscles(e.target.value)} style={S.input} /></label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={save} style={S.primary}>{editingId ? 'Enregistrer' : "Ajouter l'exercice"}</button>
            {editingId && <button onClick={resetForm} style={S.ghost}>Annuler</button>}
          </div>
        </article>
        <article style={S.card}>
          <h2>Exercices ({scoped.length})</h2>
          {scoped.map((e) => (
            <div key={e.id} style={S.row}>
              <span>
                <b style={{ opacity: e.active ? 1 : 0.45 }}>{e.name}</b>
                <small>{catLabel(e.category)}{e.equipment ? ` · ${e.equipment}` : ''}</small>
              </span>
              <span style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => edit(e)} style={S.smallGhost}>Modifier</button>
                <button onClick={() => toggleActive(e)} style={S.smallGhost}>{e.active ? 'Désactiver' : 'Réactiver'}</button>
              </span>
            </div>
          ))}
          {!scoped.length && <p style={{ color: '#A1A1AA' }}>Aucun exercice pour ce filtre.</p>}
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
  textarea: { width: '100%', minHeight: 80, background: '#1B1B1F', color: '#fff', border: '1px solid #2B2B31', borderRadius: 10, padding: 10, marginTop: 6, boxSizing: 'border-box', fontFamily: 'inherit' },
  notice: { maxWidth: 1200, margin: '0 auto 14px', background: '#141416', border: '1px solid #2B2B31', borderRadius: 12, padding: 12 },
  grid: { maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'minmax(280px,.8fr) minmax(0,1.2fr)', gap: 14 },
  card: { background: '#141416', border: '1px solid #2B2B31', borderRadius: 16, padding: 16, display: 'grid', gap: 12, alignContent: 'start' },
  primary: { border: 0, borderRadius: 10, padding: '12px 15px', fontWeight: 850, color: '#fff', background: '#E31E24', cursor: 'pointer' },
  ghost: { border: '1px solid #2B2B31', borderRadius: 10, padding: '12px 15px', fontWeight: 850, color: '#fff', background: 'transparent', cursor: 'pointer' },
  smallGhost: { border: '1px solid #2B2B31', borderRadius: 8, padding: '6px 10px', fontWeight: 700, color: '#fff', background: 'transparent', cursor: 'pointer', fontSize: 12 },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid #2B2B31' },
};
