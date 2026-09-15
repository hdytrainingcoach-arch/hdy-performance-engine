'use client';

import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
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

// ── Import Excel/CSV ─────────────────────────────────────────────────────────
// Même logique de mapping de colonnes explicite que l'import GPS
// (app/admin/sport/gps/page.tsx) : pré-remplissage par alias, correction
// manuelle possible, aperçu avant import.
const IMPORT_FIELD_ALIASES: Record<string, string[]> = {
  name: ['nom', 'exercice', 'name', 'titre', 'exercise'],
  description: ['consignes', 'consigne', 'description', 'notes', 'instructions'],
  videoUrl: ['lien video', 'video', 'lien', 'url', 'youtube', 'drive', 'lien youtube', 'lien drive'],
  category: ['categorie', 'catégorie', 'category', 'type'],
  equipment: ['materiel', 'matériel', 'equipment', 'equipement'],
  targetMuscles: ['groupes musculaires', 'muscles', 'muscle', 'zone', 'groupe musculaire'],
};
const IMPORT_FIELD_LABELS: Record<string, string> = {
  name: 'Nom', description: 'Consignes / description', videoUrl: 'Lien vidéo', category: 'Catégorie',
  equipment: 'Matériel', targetMuscles: 'Groupes musculaires',
};
const IMPORT_FIELDS = Object.keys(IMPORT_FIELD_LABELS);

function norm(s: string) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}
function pick(r: Row, keys: string[]) {
  for (const [h, v] of Object.entries(r)) if (keys.some((k) => norm(k) === norm(h))) return String(v ?? '');
  return '';
}
function guessImportMapping(headers: string[]): Record<string, string> {
  const m: Record<string, string> = {};
  for (const [field, aliases] of Object.entries(IMPORT_FIELD_ALIASES)) {
    const hit = headers.find((h) => aliases.some((a) => norm(a) === norm(h)));
    if (hit) m[field] = hit;
  }
  return m;
}
function pickMapped(r: Row, mapping: Record<string, string>, field: string) {
  const h = mapping[field];
  if (h && h in r) return String(r[h] ?? '');
  return pick(r, IMPORT_FIELD_ALIASES[field] || []);
}
// Reconnaît une catégorie écrite en clair dans le fichier (« Force », « Gainage / core »…)
// en la comparant aux libellés connus ; sinon on retombe sur la catégorie par défaut choisie.
function matchCategory(raw: string): string | null {
  if (!raw) return null;
  const n = norm(raw);
  if (ALL_CATEGORIES.includes(n as any)) return n;
  const hit = Object.entries(CATEGORY_LABEL).find(([, label]) => norm(label) === n);
  return hit ? hit[0] : null;
}
function csv(text: string): Row[] {
  const first = text.split(/\r?\n/)[0] || '';
  const sep = (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ';' : ',';
  const lines = text.split(/\r?\n/).filter((x) => x.trim());
  if (lines.length < 2) return [];
  const split = (line: string) => line.split(sep).map((x) => x.trim().replace(/^"|"$/g, ''));
  const head = split(lines[0]);
  return lines.slice(1).map((line) => {
    const a = split(line);
    const r: Row = {};
    head.forEach((h, i) => (r[h] = a[i] ?? ''));
    return r;
  });
}

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

  const [showImport, setShowImport] = useState(false);
  const [importRows, setImportRows] = useState<Row[]>([]);
  const [importMapping, setImportMapping] = useState<Record<string, string>>({});
  const [importFileName, setImportFileName] = useState('');
  const [defaultCategory, setDefaultCategory] = useState('force');
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const importHeaders = useMemo(() => (importRows.length ? Object.keys(importRows[0]) : []), [importRows]);

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

  async function loadImportFile(f: File) {
    setImportMsg(''); setImportFileName(f.name); setImportMapping({});
    if (/\.xlsx?$/i.test(f.name)) {
      const ab = await f.arrayBuffer();
      const wb = XLSX.read(ab, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const parsed = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
        .map((o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, String(v ?? '')])) as Row);
      setImportRows(parsed);
      if (parsed.length) setImportMapping(guessImportMapping(Object.keys(parsed[0])));
      else setImportMsg('Aucune ligne détectée dans le fichier Excel.');
      return;
    }
    const parsed = csv(await f.text());
    setImportRows(parsed);
    if (parsed.length) setImportMapping(guessImportMapping(Object.keys(parsed[0])));
    else setImportMsg('CSV vide ou format non reconnu.');
  }

  const importPreview = useMemo(() => importRows.map((r) => {
    const rawCategory = pickMapped(r, importMapping, 'category');
    return {
      name: pickMapped(r, importMapping, 'name').trim(),
      description: pickMapped(r, importMapping, 'description').trim(),
      videoUrl: pickMapped(r, importMapping, 'videoUrl').trim(),
      equipment: pickMapped(r, importMapping, 'equipment').trim(),
      targetMuscles: pickMapped(r, importMapping, 'targetMuscles').trim(),
      category: matchCategory(rawCategory) || defaultCategory,
      categoryRecognized: !!matchCategory(rawCategory),
      rawCategory,
    };
  }).filter((x) => x.name), [importRows, importMapping, defaultCategory]);

  const existingNames = useMemo(() => new Set(exercises.map((e) => norm(e.name))), [exercises]);
  const toImport = useMemo(() => importPreview.filter((x) => !existingNames.has(norm(x.name))), [importPreview, existingNames]);
  const duplicateCount = importPreview.length - toImport.length;

  async function runImport() {
    if (!scope || !toImport.length) return;
    setImporting(true);
    const payload = toImport.map((x) => ({
      organization_id: scope.organizationId, name: x.name, category: x.category,
      description: x.description || null, video_url: x.videoUrl || null,
      equipment: x.equipment || null, target_muscles: x.targetMuscles || null,
    }));
    const { error } = await supabase.from('exercises').insert(payload);
    setImporting(false);
    setImportMsg(error ? error.message : `${payload.length} exercice(s) importé(s) ✓${duplicateCount ? ` · ${duplicateCount} déjà présent(s) ignoré(s)` : ''}`);
    if (!error) { setImportRows([]); setImportMapping({}); setImportFileName(''); await load(); }
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
        <button onClick={() => setShowImport((v) => !v)} style={{ ...S.filter, marginLeft: 'auto' }}>{showImport ? 'Fermer l\'import' : 'Importer depuis Excel/CSV'}</button>
      </div>

      {showImport && (
        <section style={S.importCard}>
          <h2 style={S.h2}>Import en masse</h2>
          <p style={{ color: '#A1A1AA', fontSize: 13, margin: 0 }}>
            Un fichier Excel (.xlsx) ou CSV avec une ligne par exercice : nom, consignes, lien vidéo (YouTube ou Google Drive),
            catégorie/matériel/groupes musculaires en option. Les colonnes n'ont pas besoin d'un nom exact — tu les associes ci-dessous.
          </p>
          <div style={S.twoCol}>
            <label style={S.label}>Fichier<input type="file" accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(e) => e.target.files?.[0] && loadImportFile(e.target.files[0])} style={S.input} /></label>
            <label style={S.label}>Catégorie par défaut (si non reconnue dans le fichier)
              <select value={defaultCategory} onChange={(e) => setDefaultCategory(e.target.value)} style={S.input}>
                {GROUPS.map((g) => <optgroup key={g.key} label={g.label}>{g.categories.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}</optgroup>)}
              </select>
            </label>
          </div>
          {importMsg && <div style={S.notice}>{importMsg}</div>}
          {importRows.length > 0 && (
            <>
              <div style={S.mapGrid}>
                {IMPORT_FIELDS.map((f) => (
                  <label key={f} style={S.label}>{IMPORT_FIELD_LABELS[f]}
                    <select value={importMapping[f] || ''} onChange={(e) => setImportMapping((m) => ({ ...m, [f]: e.target.value }))} style={S.input}>
                      <option value="">— non mappé —</option>
                      {importHeaders.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </label>
                ))}
              </div>
              <p style={{ fontSize: 12, color: '#A1A1AA', margin: 0 }}>
                <b>{importPreview.length}</b> ligne(s) exploitable(s) sur {importRows.length} · <b>{toImport.length}</b> à importer
                {duplicateCount > 0 && <span> · {duplicateCount} déjà présent(s) dans la banque (ignoré(s) automatiquement)</span>}
              </p>
              <div style={S.tableWrap}>
                <table style={S.table}>
                  <thead><tr><th>Nom</th><th>Catégorie</th><th>Lien vidéo</th><th>Consignes</th><th>Statut</th></tr></thead>
                  <tbody>
                    {importPreview.slice(0, 50).map((x, i) => (
                      <tr key={i}>
                        <td>{x.name}</td>
                        <td>{CATEGORY_LABEL[x.category]}{!x.categoryRecognized && x.rawCategory && <small style={{ display: 'block', color: '#71717A' }}>« {x.rawCategory} » non reconnue → défaut</small>}</td>
                        <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.videoUrl || '—'}</td>
                        <td style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.description || '—'}</td>
                        <td>{existingNames.has(norm(x.name)) ? <span style={{ color: '#71717A' }}>déjà présent</span> : <span style={{ color: ACCENT }}>à importer</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button onClick={runImport} disabled={importing || !toImport.length} style={S.primary}>{importing ? 'Import…' : `Importer ${toImport.length} exercice(s)`}</button>
            </>
          )}
        </section>
      )}

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
  filterRow: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' },
  filter: { border: '1px solid #2B2B31', borderRadius: 999, padding: '7px 14px', fontSize: 12, fontWeight: 700, color: '#A1A1AA', background: 'transparent', cursor: 'pointer' },
  filterActive: { border: '1px solid ' + ACCENT, borderRadius: 999, padding: '7px 14px', fontSize: 12, fontWeight: 700, color: '#04120C', background: ACCENT, cursor: 'pointer' },
  notice: { background: '#141416', border: '1px solid #2B2B31', borderRadius: 12, padding: 12, marginBottom: 14 },
  grid: { display: 'grid', gridTemplateColumns: 'minmax(280px,.8fr) minmax(0,1.2fr)', gap: 14 },
  card: { background: '#141416', border: '1px solid #24262A', borderRadius: 16, padding: 18, display: 'grid', gap: 12, alignContent: 'start' },
  importCard: { background: '#141416', border: '1px solid #24262A', borderRadius: 16, padding: 18, display: 'grid', gap: 14, marginBottom: 16 },
  label: { fontSize: 12, color: '#A1A1AA', display: 'grid', gap: 6 },
  input: { width: '100%', height: 42, background: '#1B1B1F', color: '#fff', border: '1px solid #2B2B31', borderRadius: 10, padding: '0 10px', boxSizing: 'border-box', fontSize: 14 },
  textarea: { width: '100%', minHeight: 80, background: '#1B1B1F', color: '#fff', border: '1px solid #2B2B31', borderRadius: 10, padding: 10, boxSizing: 'border-box', fontFamily: 'inherit', fontSize: 14 },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  mapGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10 },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  primary: { border: 0, borderRadius: 10, padding: '12px 15px', fontWeight: 850, color: '#04120C', background: ACCENT, cursor: 'pointer' },
  ghost: { border: '1px solid #2B2B31', borderRadius: 10, padding: '12px 15px', fontWeight: 850, color: '#fff', background: 'transparent', cursor: 'pointer' },
  smallGhost: { border: '1px solid #2B2B31', borderRadius: 8, padding: '6px 10px', fontWeight: 700, color: '#fff', background: 'transparent', cursor: 'pointer', fontSize: 12 },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid #1E2023' },
  small: { display: 'block', color: '#71717A', marginTop: 2 },
};
