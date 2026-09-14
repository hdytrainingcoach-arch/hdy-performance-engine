'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useOrg } from '@/lib/org-context';

type Row = Record<string, any>;

export default function CommunicationPage() {
  const { environments, currentEnvId: org, setCurrentEnvId: setOrg, currentTeamId: team, setCurrentTeamId: setTeam, teamsFor, usesTeams } = useOrg();
  const [ready, setReady] = useState(false);
  const [ok, setOk] = useState(false);
  const [announcements, setAnnouncements] = useState<Row[]>([]);
  const [reads, setReads] = useState<Row[]>([]);
  const [orgPlayers, setOrgPlayers] = useState<Row[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [pinned, setPinned] = useState(false);
  const [targetTeam, setTargetTeam] = useState('');
  const [msg, setMsg] = useState('');

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
    const [{ data: a }, { data: pl }] = await Promise.all([
      supabase.from('announcements').select('*').eq('organization_id', org).order('published_at', { ascending: false }).limit(100),
      supabase.from('players').select('id,team_id').eq('organization_id', org).eq('active', true),
    ]);
    setAnnouncements(a || []);
    setOrgPlayers(pl || []);
    const ids = (a || []).map((x) => x.id);
    if (ids.length) {
      const { data: r } = await supabase.from('announcement_reads').select('announcement_id').in('announcement_id', ids);
      setReads(r || []);
    } else setReads([]);
  }
  useEffect(() => { if (ok && org) load(); }, [ok, org]);

  const scoped = useMemo(
    () => announcements.filter((a) => !usesTeams(org) || !team || !a.team_id || a.team_id === team),
    [announcements, org, team, usesTeams],
  );
  const playerCount = useMemo(
    () => orgPlayers.filter((p) => !usesTeams(org) || !targetTeam || p.team_id === targetTeam).length,
    [orgPlayers, org, targetTeam, usesTeams],
  );

  function readCount(id: string) {
    return reads.filter((r) => r.announcement_id === id).length;
  }

  async function publish() {
    if (!title.trim() || !body.trim()) { setMsg('Titre et message requis.'); return; }
    const { error } = await supabase.from('announcements').insert({
      organization_id: org, team_id: usesTeams(org) && targetTeam ? targetTeam : null,
      title: title.trim(), body: body.trim(), pinned,
    });
    setMsg(error ? error.message : 'Annonce publiée ✓');
    if (!error) { setTitle(''); setBody(''); setPinned(false); await load(); }
  }

  async function remove(id: string) {
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (!error) await load();
  }

  if (!ready) return <main style={S.center}>Chargement…</main>;
  if (!ok) return <main style={S.center}>Accès staff requis.</main>;

  return (
    <main style={S.main}>
      <header style={S.header}>
        <div>
          <span style={S.kicker}>SPORT & PERFORMANCE</span>
          <h1>Communication</h1>
          <p>Annonces staff → joueurs, avec accusé de lecture. Ce n'est pas le dossier médical : réservé aux informations d'équipe.</p>
        </div>
        <a href="/admin/sport" style={S.back}>← Sport & Performance</a>
      </header>
      <section style={S.toolbar}>
        <label>Environnement<select value={org} onChange={(e) => setOrg(e.target.value)} style={S.input}>{environments.map((e) => <option key={e.id} value={e.id}>{e.branding?.label || e.name}</option>)}</select></label>
        {usesTeams(org) && <label>Filtrer par équipe<select value={team} onChange={(e) => setTeam(e.target.value)} style={S.input}><option value="">Toutes</option>{teamsFor(org).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>}
      </section>
      {msg && <div style={S.notice}>{msg}</div>}
      <section style={S.grid}>
        <article style={S.card}>
          <h2>Nouvelle annonce</h2>
          <label>Titre<input value={title} onChange={(e) => setTitle(e.target.value)} style={S.input} /></label>
          <label>Message<textarea value={body} onChange={(e) => setBody(e.target.value)} style={S.textarea} /></label>
          {usesTeams(org) && <label>Destinataire<select value={targetTeam} onChange={(e) => setTargetTeam(e.target.value)} style={S.input}><option value="">Toute l'organisation</option>{teamsFor(org).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, flexDirection: 'row' }}><input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} /> Épingler en tête</label>
          <div style={S.load}>Destinataires estimés <b>{playerCount} joueur(s)</b></div>
          <button onClick={publish} style={S.primary}>Publier</button>
        </article>
        <article style={S.card}>
          <h2>Annonces publiées</h2>
          {scoped.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)).map((a) => (
            <div key={a.id} style={S.row}>
              <span>
                <b>{a.pinned ? '📌 ' : ''}{a.title}</b>
                <small>{new Date(a.published_at).toLocaleDateString('fr-FR')} · {a.team_id ? (teamsFor(org).find((t) => t.id === a.team_id)?.name || 'Équipe') : 'Toute l\'organisation'} · lue par {readCount(a.id)}</small>
                <p style={S.body}>{a.body}</p>
              </span>
              <button onClick={() => remove(a.id)} style={S.smallGhost}>Supprimer</button>
            </div>
          ))}
          {!scoped.length && <p style={{ color: '#A1A1AA' }}>Aucune annonce.</p>}
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
  textarea: { width: '100%', minHeight: 100, background: '#1B1B1F', color: '#fff', border: '1px solid #2B2B31', borderRadius: 10, padding: 10, marginTop: 6, boxSizing: 'border-box', fontFamily: 'inherit' },
  notice: { maxWidth: 1200, margin: '0 auto 14px', background: '#141416', border: '1px solid #2B2B31', borderRadius: 12, padding: 12 },
  grid: { maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'minmax(280px,.8fr) minmax(0,1.2fr)', gap: 14 },
  card: { background: '#141416', border: '1px solid #2B2B31', borderRadius: 16, padding: 16, display: 'grid', gap: 12, alignContent: 'start' },
  primary: { border: 0, borderRadius: 10, padding: '12px 15px', fontWeight: 850, color: '#fff', background: '#E31E24', cursor: 'pointer' },
  row: { display: 'flex', justifyContent: 'space-between', gap: 10, padding: '10px 0', borderBottom: '1px solid #2B2B31', alignItems: 'flex-start' },
  load: { background: '#1B1B1F', border: '1px solid #2B2B31', borderRadius: 12, padding: 12, display: 'flex', justifyContent: 'space-between' },
  smallGhost: { border: '1px solid #2B2B31', borderRadius: 8, padding: '6px 10px', fontWeight: 700, color: '#fff', background: 'transparent', cursor: 'pointer', fontSize: 12 },
  body: { margin: '6px 0 0', color: '#D4D4D8', fontSize: 13, maxWidth: 460 },
};
