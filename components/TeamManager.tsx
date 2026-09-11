'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useOrg } from '@/lib/org-context';

type Team = { id: string; name: string; category: string | null; season: string | null; active: boolean };

/**
 * Gestion des équipes d'un environnement (Diambars FC : Pro A, Pro B, U17, U15…).
 * Créer une nouvelle équipe ne demande aucun code : une ligne `teams` en base.
 * Réservé aux administrateurs d'organisation (RPC create/update/set_active/delete_team).
 */
export default function TeamManager({ organizationId }: { organizationId: string }) {
  const { refresh: refreshOrg } = useOrg();
  const [open, setOpen] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [msg, setMsg] = useState('');
  const [working, setWorking] = useState('');
  const [editingId, setEditingId] = useState('');
  const [edit, setEdit] = useState({ name: '', category: '', season: '' });
  const [form, setForm] = useState({ name: '', category: '', season: '' });
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    if (!organizationId) return;
    const { data, error } = await supabase
      .from('teams')
      .select('id,name,category,season,active')
      .eq('organization_id', organizationId)
      .order('name');
    if (error) { setMsg(error.message); return; }
    setTeams((data ?? []) as Team[]);
  }, [organizationId]);

  useEffect(() => { if (open) load(); }, [open, load]);

  async function createTeam(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setMsg('Le nom de l’équipe est obligatoire.'); return; }
    setCreating(true); setMsg('');
    const { error } = await supabase.rpc('create_team', {
      p_organization_id: organizationId, p_name: form.name, p_category: form.category || null, p_season: form.season || null,
    });
    setCreating(false);
    if (error) { setMsg(error.message); return; }
    setForm({ name: '', category: '', season: '' });
    setMsg('Équipe créée ✓');
    await load(); refreshOrg();
  }

  function startEdit(t: Team) { setEditingId(t.id); setEdit({ name: t.name, category: t.category || '', season: t.season || '' }); }

  async function saveEdit(id: string) {
    setWorking(id); setMsg('');
    const { error } = await supabase.rpc('update_team', { p_team_id: id, p_name: edit.name, p_category: edit.category || null, p_season: edit.season || null });
    setWorking('');
    if (error) { setMsg(error.message); return; }
    setEditingId(''); await load(); refreshOrg();
  }

  async function toggleActive(t: Team) {
    setWorking(t.id); setMsg('');
    const { error } = await supabase.rpc('set_team_active', { p_team_id: t.id, p_active: !t.active });
    setWorking('');
    if (error) { setMsg(error.message); return; }
    await load(); refreshOrg();
  }

  async function remove(t: Team) {
    if (!window.confirm(`Supprimer définitivement l’équipe « ${t.name} » ? Impossible si des joueurs ou du staff y sont encore rattachés.`)) return;
    setWorking(t.id); setMsg('');
    const { error } = await supabase.rpc('delete_team', { p_team_id: t.id });
    setWorking('');
    if (error) { setMsg(error.message); return; }
    await load(); refreshOrg();
  }

  const visible = teams.filter((t) => showArchived || t.active);

  return (
    <div style={S.wrap}>
      <button onClick={() => setOpen((v) => !v)} style={S.toggle}>{open ? 'Fermer la gestion des équipes' : 'Gérer les équipes'}</button>
      {open && (
        <div style={S.panel}>
          <form onSubmit={createTeam} style={S.form}>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Nom (ex. U13)" style={S.input} />
            <input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} placeholder="Catégorie" style={S.input} />
            <input value={form.season} onChange={(e) => setForm((f) => ({ ...f, season: e.target.value }))} placeholder="Saison (ex. 2026-2027)" style={S.input} />
            <button disabled={creating} style={S.addBtn}>{creating ? 'Création…' : '+ Nouvelle équipe'}</button>
          </form>
          <label style={S.archiveToggle}><input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} /> Afficher les équipes archivées</label>
          {msg && <p style={S.msg}>{msg}</p>}
          <div style={S.list}>
            {visible.map((t) => (
              <div key={t.id} style={{ ...S.row, ...(t.active ? null : { opacity: .55 }) }}>
                {editingId === t.id ? (
                  <>
                    <input value={edit.name} onChange={(e) => setEdit((f) => ({ ...f, name: e.target.value }))} style={S.input} />
                    <input value={edit.category} onChange={(e) => setEdit((f) => ({ ...f, category: e.target.value }))} placeholder="Catégorie" style={S.input} />
                    <input value={edit.season} onChange={(e) => setEdit((f) => ({ ...f, season: e.target.value }))} placeholder="Saison" style={S.input} />
                    <button onClick={() => saveEdit(t.id)} disabled={working === t.id} style={S.smallBtn}>Enregistrer</button>
                    <button onClick={() => setEditingId('')} style={S.smallGhost}>Annuler</button>
                  </>
                ) : (
                  <>
                    <span style={S.name}>{t.name}{!t.active && <em style={S.archivedTag}> · archivée</em>}</span>
                    <span style={S.meta}>{[t.category, t.season].filter(Boolean).join(' · ') || '—'}</span>
                    <button onClick={() => startEdit(t)} style={S.smallGhost}>Renommer</button>
                    <button onClick={() => toggleActive(t)} disabled={working === t.id} style={S.smallGhost}>{t.active ? 'Archiver' : 'Réactiver'}</button>
                    <button onClick={() => remove(t)} disabled={working === t.id} style={S.smallDanger}>Supprimer</button>
                  </>
                )}
              </div>
            ))}
            {!visible.length && <p style={S.empty}>Aucune équipe pour le moment.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  wrap: { maxWidth: 1280, margin: '0 auto 14px' },
  toggle: { height: 40, border: '1px solid #3F3F46', borderRadius: 10, background: '#1A1A1D', color: '#fff', fontWeight: 800, fontSize: 12, padding: '0 12px', cursor: 'pointer' },
  panel: { marginTop: 10, background: '#111113', border: '1px solid #242428', borderRadius: 16, padding: 14, display: 'grid', gap: 10 },
  form: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 8, alignItems: 'center' },
  input: { height: 38, background: '#1B1B1F', color: '#fff', border: '1px solid #34343A', borderRadius: 9, padding: '0 10px', fontSize: 13 },
  addBtn: { height: 38, border: 0, borderRadius: 9, background: '#E31E24', color: '#fff', fontWeight: 800, fontSize: 12, cursor: 'pointer' },
  archiveToggle: { display: 'flex', gap: 6, alignItems: 'center', fontSize: 12, color: '#A1A1AA' },
  msg: { fontSize: 12, color: '#D4D4D8', margin: 0 },
  list: { display: 'grid', gap: 6 },
  row: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', background: '#171719', border: '1px solid #29292D', borderRadius: 10, padding: '8px 10px' },
  name: { fontWeight: 800, fontSize: 13, minWidth: 90 },
  archivedTag: { color: '#A1A1AA', fontStyle: 'normal', fontSize: 11 },
  meta: { color: '#A1A1AA', fontSize: 12, flex: 1 },
  smallBtn: { height: 30, border: 0, borderRadius: 7, background: '#E31E24', color: '#fff', fontWeight: 800, fontSize: 11, padding: '0 9px', cursor: 'pointer' },
  smallGhost: { height: 30, border: '1px solid #3F3F46', borderRadius: 7, background: '#1A1A1D', color: '#fff', fontWeight: 700, fontSize: 11, padding: '0 9px', cursor: 'pointer' },
  smallDanger: { height: 30, border: '1px solid #5A2327', borderRadius: 7, background: '#1A1A1D', color: '#FF8A8F', fontWeight: 700, fontSize: 11, padding: '0 9px', cursor: 'pointer' },
  empty: { color: '#A1A1AA', fontSize: 12, margin: 0 },
};
