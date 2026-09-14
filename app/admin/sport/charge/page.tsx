'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useOrg } from '@/lib/org-context';
import { loadRatio, mean, stddev, zScore, fmtNum } from '@/lib/stats';

type Row = Record<string, any>;

export default function ChargePage() {
  const { environments, currentEnvId: org, setCurrentEnvId: setOrg, currentTeamId: team, setCurrentTeamId: setTeam, teamsFor, usesTeams } = useOrg();
  const [ready, setReady] = useState(false);
  const [ok, setOk] = useState(false);
  const [players, setPlayers] = useState<Row[]>([]);
  const [sessions, setSessions] = useState<Row[]>([]);
  const [rpe, setRpe] = useState<Row[]>([]);
  const [gps, setGps] = useState<Row[]>([]);
  const [playerFilter, setPlayerFilter] = useState('');

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
    const [{ data: p }, { data: s }, { data: r }, { data: g }] = await Promise.all([
      supabase.from('players').select('id,display_name,first_name,last_name,organization_id,team_id').eq('organization_id', org).eq('active', true),
      supabase.from('sessions').select('id,title,type,session_date,organization_id,team_id').eq('organization_id', org).order('session_date', { ascending: false }).limit(60),
      supabase.from('session_rpe').select('session_id,player_id,rpe,load_ua,actual_duration_min,submitted_at').eq('organization_id', org).order('submitted_at', { ascending: false }).limit(2000),
      supabase.from('gps_records').select('session_id,player_id,metrics,recorded_at').eq('organization_id', org).not('session_id', 'is', null).order('recorded_at', { ascending: false }).limit(2000),
    ]);
    setPlayers(p || []);
    setSessions(s || []);
    setRpe(r || []);
    setGps(g || []);
  }
  useEffect(() => { if (ok && org) load(); }, [ok, org]);

  const scopedSessions = useMemo(
    () => sessions.filter((s) => !usesTeams(org) || !team || s.team_id === team),
    [sessions, org, team, usesTeams],
  );
  const scopedPlayers = useMemo(
    () => players.filter((p) => !usesTeams(org) || !team || p.team_id === team),
    [players, org, team, usesTeams],
  );

  // Une ligne par (séance, joueur) où on a à la fois une charge interne (sRPE) et une charge externe (GPS).
  const rows = useMemo(() => {
    const sessionIds = new Set(scopedSessions.map((s) => s.id));
    const playerIds = new Set(scopedPlayers.map((p) => p.id));
    const out: Row[] = [];
    for (const r of rpe) {
      if (!sessionIds.has(r.session_id) || !playerIds.has(r.player_id)) continue;
      const g = gps.find((x) => x.session_id === r.session_id && x.player_id === r.player_id);
      if (!g) continue;
      const external = g.metrics?.external_load ?? null;
      const internal = r.load_ua ?? (r.rpe && r.actual_duration_min ? r.rpe * r.actual_duration_min : null);
      const s = scopedSessions.find((x) => x.id === r.session_id);
      out.push({
        sessionId: r.session_id, playerId: r.player_id, date: s?.session_date, title: s?.title || s?.type,
        internal, external, ratio: loadRatio(internal, external),
      });
    }
    return out.filter((x) => !playerFilter || x.playerId === playerFilter)
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }, [rpe, gps, scopedSessions, scopedPlayers, playerFilter]);

  // Moyenne/écart-type du ratio par joueur, pour repérer une dérive vs son propre historique.
  const statsByPlayer = useMemo(() => {
    const m = new Map<string, { m: number | null; sd: number | null }>();
    for (const p of scopedPlayers) {
      const ratios = rows.filter((r) => r.playerId === p.id && r.ratio !== null).map((r) => r.ratio as number);
      m.set(p.id, { m: mean(ratios), sd: stddev(ratios) });
    }
    return m;
  }, [rows, scopedPlayers]);

  function playerName(id: string) {
    const p = players.find((x) => x.id === id);
    return p ? p.display_name || `${p.first_name} ${p.last_name}` : '—';
  }

  if (!ready) return <main style={S.center}>Chargement…</main>;
  if (!ok) return <main style={S.center}>Accès staff requis.</main>;

  return (
    <main style={S.main}>
      <header style={S.header}>
        <div>
          <span style={S.kicker}>SPORT & PERFORMANCE</span>
          <h1>Charge — corrélation interne / externe</h1>
          <p>Croise la charge interne déclarée (sRPE Foster) et la charge externe mesurée (GPS) sur une même séance, pour repérer une dérive d'efficience. Signal de contexte, jamais une conclusion automatique.</p>
        </div>
        <a href="/admin/sport" style={S.back}>← Sport & Performance</a>
      </header>
      <section style={S.toolbar}>
        <label>Environnement<select value={org} onChange={(e) => setOrg(e.target.value)} style={S.input}>{environments.map((e) => <option key={e.id} value={e.id}>{e.branding?.label || e.name}</option>)}</select></label>
        {usesTeams(org) && <label>Équipe<select value={team} onChange={(e) => setTeam(e.target.value)} style={S.input}><option value="">Toutes</option>{teamsFor(org).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>}
        <label>Joueur<select value={playerFilter} onChange={(e) => setPlayerFilter(e.target.value)} style={S.input}><option value="">Tous</option>{scopedPlayers.map((p) => <option key={p.id} value={p.id}>{p.display_name || `${p.first_name} ${p.last_name}`}</option>)}</select></label>
      </section>
      <section style={S.card}>
        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr><th>Date</th><th>Séance</th><th>Joueur</th><th>Charge interne (UA)</th><th>Charge externe</th><th>Ratio int./ext.</th><th>Écart vs propre moyenne</th></tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const st = statsByPlayer.get(r.playerId);
                const z = zScore(r.ratio, st?.m ?? null, st?.sd ?? null);
                const flag = z !== null && Math.abs(z) >= 1.5;
                return (
                  <tr key={i}>
                    <td>{r.date}</td>
                    <td>{r.title}</td>
                    <td>{playerName(r.playerId)}</td>
                    <td>{fmtNum(r.internal, 0)}</td>
                    <td>{fmtNum(r.external, 0)}</td>
                    <td>{fmtNum(r.ratio, 2)}</td>
                    <td>{flag ? <span style={S.watch}>À surveiller (z={fmtNum(z, 1)})</span> : (z !== null ? fmtNum(z, 1) : '—')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!rows.length && <p style={{ color: '#A1A1AA' }}>Aucune séance avec charge interne ET externe disponibles simultanément pour ce périmètre. Importe le GPS en mode « Séance GPS » (pas historique) pour que la corrélation soit possible.</p>}
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
  card: { maxWidth: 1200, margin: '0 auto', background: '#141416', border: '1px solid #2B2B31', borderRadius: 16, padding: 16 },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  watch: { color: '#FBBF24', fontWeight: 700 },
};
