'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useOrg } from '@/lib/org-context';
import { AVAILABILITY_COLOR, AVAILABILITY_LABEL, hasMedicalAccess } from '@/lib/medical';

type Row = Record<string, any>;

export default function MedicalRoster() {
  const { environments, currentEnvId: org, setCurrentEnvId: setOrg, currentTeamId: team, setCurrentTeamId: setTeam, teamsFor, usesTeams } = useOrg();
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [players, setPlayers] = useState<Row[]>([]);
  const [statuses, setStatuses] = useState<Row[]>([]);
  const [openEvents, setOpenEvents] = useState<Row[]>([]);
  const [search, setSearch] = useState('');

  const scopeTeam = usesTeams(org) && team ? team : '';

  const load = useCallback(async () => {
    if (!org) return;
    setReady(false);
    const ok = await hasMedicalAccess(supabase, org);
    setAllowed(ok);
    if (!ok) { setReady(true); return; }
    let pq = supabase.from('players').select('id,display_name,first_name,last_name,primary_position,position,team_id').eq('organization_id', org).eq('active', true).order('display_name');
    if (scopeTeam) pq = pq.eq('team_id', scopeTeam);
    const { data: p } = await pq;
    setPlayers((p ?? []) as Row[]);
    const ids = (p ?? []).map((x) => x.id);
    if (ids.length) {
      const [{ data: st }, { data: ev }] = await Promise.all([
        supabase.from('player_medical_status').select('*').in('player_id', ids),
        supabase.from('medical_events').select('id,player_id,body_zone,onset_date,status,rtp_expected').in('player_id', ids).neq('status', 'closed'),
      ]);
      setStatuses((st ?? []) as Row[]);
      setOpenEvents((ev ?? []) as Row[]);
    } else {
      setStatuses([]); setOpenEvents([]);
    }
    setReady(true);
  }, [org, scopeTeam]);

  useEffect(() => { load(); }, [load]);

  const statusBy = useMemo(() => new Map(statuses.map((s) => [s.player_id, s])), [statuses]);
  const eventsBy = useMemo(() => {
    const m = new Map<string, Row[]>();
    for (const e of openEvents) m.set(e.player_id, [...(m.get(e.player_id) ?? []), e]);
    return m;
  }, [openEvents]);

  const rows = useMemo<Row[]>(
    () => players
      .filter((p) => `${p.display_name ?? ''} ${p.first_name} ${p.last_name}`.toLowerCase().includes(search.toLowerCase()))
      .map((p): Row => ({ ...p, st: statusBy.get(p.id), ev: eventsBy.get(p.id) ?? [] })),
    [players, search, statusBy, eventsBy],
  );

  const counts = useMemo(() => {
    const c = { full: 0, modified: 0, unavailable: 0, medical_care: 0, none: 0 };
    for (const p of players) {
      const a = statusBy.get(p.id)?.availability;
      if (!a) c.none += 1; else (c as any)[a] += 1;
    }
    return c;
  }, [players, statusBy]);

  if (!ready) return <main style={S.center}>Chargement…</main>;
  if (!allowed) return (
    <main style={S.center}>
      <div style={{ textAlign: 'center', maxWidth: 380 }}>
        <p style={S.kicker}>DOSSIER MÉDICAL</p>
        <h2>Accès réservé au personnel médical</h2>
        <p style={{ color: '#a1a1aa' }}>Ton compte n’a pas l’accès médical détaillé pour cet environnement.</p>
      </div>
    </main>
  );

  return (
    <main style={S.main}>
      <header style={S.header}>
        <div>
          <span style={S.kicker}>DOSSIER MÉDICAL PROTÉGÉ · CONFIDENTIEL</span>
          <h1 style={S.h1}>Suivi médical</h1>
          <p style={S.sub}>Antécédents, blessures, retour progressif. Le coach ne voit que le statut fonctionnel partagé.</p>
        </div>
        <a href="/admin" style={S.back}>← Portail</a>
      </header>

      <section style={S.filters}>
        <label>Environnement
          <select value={org} onChange={(e) => setOrg(e.target.value)} style={S.input}>
            {environments.map((e) => <option key={e.id} value={e.id}>{e.branding?.label || e.name}</option>)}
          </select>
        </label>
        {usesTeams(org) && (
          <label>Équipe
            <select value={team} onChange={(e) => setTeam(e.target.value)} style={S.input}>
              <option value="">Toutes les équipes</option>
              {teamsFor(org).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
        )}
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un joueur" style={{ ...S.input, minWidth: 200 }} />
      </section>

      <section style={S.metrics}>
        {[
          ['Disponibles', counts.full, '#8ef0b0'],
          ['Travail adapté', counts.modified, '#f5c96b'],
          ['Indisponibles', counts.unavailable, '#ff8a8f'],
          ['En soins', counts.medical_care, '#c9b8ff'],
          ['Sans statut', counts.none, '#a1a1aa'],
        ].map(([l, n, c]) => (
          <div key={l as string} style={S.metric}><strong style={{ color: c as string }}>{n as number}</strong><small>{l as string}</small></div>
        ))}
      </section>

      <section style={S.card}>
        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead><tr><th>Joueur</th><th>Disponibilité</th><th>Restrictions partagées</th><th>Blessures en cours</th><th>Retour prévu</th></tr></thead>
            <tbody>
              {rows.map((p) => {
                const a = p.st?.availability ?? null;
                const avC = a ? AVAILABILITY_COLOR[a] : null;
                return (
                  <tr key={p.id}>
                    <td><a href={`/admin/medical/${p.id}`} style={S.link}><b>{p.display_name || `${p.first_name} ${p.last_name}`}</b><small style={S.pos}>{p.primary_position || p.position || '—'}</small></a></td>
                    <td>{a ? <span style={{ ...S.badge, background: avC!.bg, color: avC!.fg }}>{AVAILABILITY_LABEL[a]}</span> : <span style={S.muted}>—</span>}</td>
                    <td style={S.small}>{p.st?.shared_restrictions || '—'}</td>
                    <td style={S.small}>{p.ev.length ? p.ev.map((e: Row) => e.body_zone || 'blessure').join(', ') : '—'}</td>
                    <td style={S.small}>{p.st?.expected_return ? new Date(p.st.expected_return).toLocaleDateString('fr-FR') : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!rows.length && <p style={S.muted}>Aucun joueur dans ce périmètre.</p>}
      </section>
    </main>
  );
}

const S: Record<string, React.CSSProperties> = {
  center: { minHeight: '100vh', display: 'grid', placeItems: 'center', fontFamily: 'Inter,system-ui,sans-serif', color: '#fafafa', background: '#09090B', padding: 24 },
  main: { minHeight: '100vh', background: '#09090B', color: '#FAFAFA', fontFamily: 'Inter,system-ui,sans-serif', padding: 28 },
  header: { maxWidth: 1200, margin: '0 auto 18px', display: 'flex', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' },
  kicker: { fontSize: 11, fontWeight: 900, letterSpacing: 1.4, color: '#c9b8ff' },
  h1: { fontSize: 'clamp(36px,5vw,58px)', margin: '4px 0', letterSpacing: -2.2 },
  sub: { color: '#A1A1AA', maxWidth: 640 },
  back: { color: '#fff', textDecoration: 'none', border: '1px solid #2B2B31', borderRadius: 10, padding: '10px 12px', height: 'fit-content' },
  filters: { maxWidth: 1200, margin: '0 auto 14px', display: 'flex', gap: 12, alignItems: 'end', flexWrap: 'wrap', background: '#141416', border: '1px solid #2B2B31', borderRadius: 16, padding: 14 },
  input: { display: 'block', height: 40, marginTop: 5, background: '#1B1B1F', color: '#fff', border: '1px solid #34343A', borderRadius: 9, padding: '0 10px' },
  metrics: { maxWidth: 1200, margin: '0 auto 14px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 10 },
  metric: { background: '#141416', border: '1px solid #2B2B31', borderRadius: 12, padding: '12px 10px', display: 'grid', gap: 3, textAlign: 'center' },
  card: { maxWidth: 1200, margin: '0 auto', background: '#141416', border: '1px solid #2B2B31', borderRadius: 18, padding: 16 },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  link: { color: '#fff', textDecoration: 'none', display: 'grid', gap: 2 },
  pos: { color: '#a1a1aa', fontSize: 12 },
  badge: { borderRadius: 999, padding: '4px 9px', fontWeight: 900, fontSize: 11 },
  small: { fontSize: 12, color: '#d4d4d8' },
  muted: { color: '#a1a1aa' },
};
