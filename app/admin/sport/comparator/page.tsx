'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import RadarChart from '@/components/RadarChart';
import { useOrg } from '@/lib/org-context';

type Row = Record<string, any>;
const COLORS = ['#E31E24', '#3B82F6', '#22C55E', '#F59E0B'];

export default function Comparator() {
  const { environments, currentEnvId: org, setCurrentEnvId: setOrg, currentTeamId: team, setCurrentTeamId: setTeam, teamsFor, usesTeams } = useOrg();
  const [ready, setReady] = useState(false);
  const [ok, setOk] = useState(false);
  const [players, setPlayers] = useState<Row[]>([]);
  const [defs, setDefs] = useState<Row[]>([]);
  const [results, setResults] = useState<Row[]>([]);
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setReady(true); return; }
      const [{ data: p }, { data: m }] = await Promise.all([
        supabase.from('profiles').select('is_super_admin').eq('user_id', session.user.id).maybeSingle(),
        supabase.from('memberships').select('id').eq('user_id', session.user.id).eq('active', true).limit(1),
      ]);
      if (p?.is_super_admin || m?.length) setOk(true);
      setReady(true);
    })();
  }, []);

  useEffect(() => { if (ok && org) load(); /* eslint-disable-next-line */ }, [ok, org, team]);

  async function load() {
    let pq = supabase
      .from('players')
      .select('id,display_name,first_name,last_name,primary_position,position')
      .eq('organization_id', org)
      .eq('active', true);
    if (usesTeams(org) && team) pq = pq.eq('team_id', team);
    const { data: p } = await pq.order('display_name');
    setPlayers((p ?? []) as Row[]);
    const ids = (p ?? []).map((x) => x.id);

    const { data: d } = await supabase
      .from('test_definitions')
      .select('id,name,unit,category,best_rule')
      .eq('active', true);
    setDefs((d ?? []) as Row[]);

    if (!ids.length) { setResults([]); setSelected([]); return; }
    const { data: r } = await supabase
      .from('test_results')
      .select('id,player_id,test_definition_id,best_value,mean_value,tested_at')
      .in('player_id', ids)
      .order('tested_at', { ascending: false })
      .limit(2000);
    setResults((r ?? []) as Row[]);
    setSelected((v) => v.filter((id) => ids.includes(id)).slice(0, 4));
  }

  function toggle(id: string) {
    setSelected((v) => (v.includes(id) ? v.filter((x) => x !== id) : v.length < 4 ? [...v, id] : v));
  }

  const defById = useMemo(() => new Map(defs.map((d) => [d.id, d])), [defs]);
  const nameOf = (id: string) => {
    const p = players.find((x) => x.id === id);
    return p?.display_name || `${p?.first_name ?? ''} ${p?.last_name ?? ''}`.trim() || 'Athlète';
  };

  // Dernier résultat par (joueur, test)
  const latest = useMemo(() => {
    const map = new Map<string, Row>(); // `${player}|${def}` -> result
    for (const r of results) {
      const k = `${r.player_id}|${r.test_definition_id}`;
      if (!map.has(k)) map.set(k, r); // results déjà triés desc
    }
    return map;
  }, [results]);

  const valueOf = (pid: string, defId: string): number | null => {
    const r = latest.get(`${pid}|${defId}`);
    const v = r?.best_value ?? r?.mean_value;
    return typeof v === 'number' ? v : v != null ? Number(v) : null;
  };

  // Tests communs à au moins 2 athlètes sélectionnés
  const metricDefs = useMemo(() => {
    if (selected.length < 2) return [];
    return defs
      .filter((d) => selected.filter((pid) => valueOf(pid, d.id) != null).length >= 2)
      .slice(0, 10);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defs, selected, latest]);

  if (!ready) return <main style={S.center}>Chargement…</main>;
  if (!ok) return <main style={S.center}>Accès staff requis.</main>;

  return (
    <main style={S.main}>
      <header style={S.header}>
        <div>
          <span style={S.kicker}>SPORT &amp; PERFORMANCE</span>
          <h1 style={S.h1}>Comparateur athlétique</h1>
          <p style={S.sub}>
            Comparer jusqu’à 4 athlètes sur leurs derniers résultats, sans mélanger des protocoles différents.
          </p>
        </div>
        <a href="/admin/sport" style={S.back}>← Sport &amp; Performance</a>
      </header>

      <section style={S.filters}>
        <label>
          Environnement
          <select value={org} onChange={(e) => setOrg(e.target.value)} style={S.input}>
            {environments.map((e) => (
              <option key={e.id} value={e.id}>{e.branding?.label || e.name}</option>
            ))}
          </select>
        </label>
        {usesTeams(org) && (
          <label>
            Équipe
            <select value={team} onChange={(e) => setTeam(e.target.value)} style={S.input}>
              <option value="">Toutes les équipes</option>
              {teamsFor(org).map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </label>
        )}
        <div style={S.count}>{selected.length}/4 athlètes</div>
      </section>

      <section style={S.grid}>
        <article style={S.card}>
          <h2>Athlètes</h2>
          {players.map((p, idx) => {
            const on = selected.includes(p.id);
            const color = on ? COLORS[selected.indexOf(p.id)] : '#1B1B1F';
            return (
              <button key={p.id} onClick={() => toggle(p.id)} style={{ ...S.player, background: color }}>
                <span>
                  <b>{p.display_name || `${p.first_name} ${p.last_name}`}</b>
                  <small>{p.primary_position || p.position || '—'}</small>
                </span>
                <strong>{on ? '✓' : '+'}</strong>
              </button>
            );
          })}
          {!players.length && <p style={S.sub}>Aucun joueur dans ce périmètre.</p>}
        </article>

        <article style={S.cardWide}>
          <h2>Comparaison</h2>
          {selected.length < 2 ? (
            <p style={S.sub}>Sélectionne 2 à 4 athlètes.</p>
          ) : metricDefs.length === 0 ? (
            <p style={S.sub}>
              Aucun test physique commun aux athlètes sélectionnés. Saisis des résultats dans{' '}
              <a href="/admin/sport/tests" style={{ color: '#E31E24' }}>Tests &amp; évaluations</a>.
            </p>
          ) : (
            <>
              {metricDefs.length >= 3 && (
                <RadarChart
                  axes={metricDefs.map((d) => d.name)}
                  higherIsBetter={metricDefs.map((d) => d.best_rule !== 'min')}
                  series={selected.map((pid, i) => ({
                    label: nameOf(pid),
                    color: COLORS[i],
                    values: metricDefs.map((d) => valueOf(pid, d.id)),
                  }))}
                />
              )}
              <div style={S.legend}>
                {selected.map((pid, i) => (
                  <span key={pid} style={S.legendItem}>
                    <i style={{ background: COLORS[i] }} /> {nameOf(pid)}
                  </span>
                ))}
              </div>
              <div style={S.tableWrap}>
                <table style={S.table}>
                  <thead>
                    <tr>
                      <th>Test</th>
                      {selected.map((id) => (
                        <th key={id}>{nameOf(id)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {metricDefs.map((d) => {
                      const vals = selected.map((pid) => valueOf(pid, d.id));
                      const present = vals.filter((v): v is number => v != null);
                      const best = d.best_rule === 'min' ? Math.min(...present) : Math.max(...present);
                      return (
                        <tr key={d.id}>
                          <td>
                            <b>{d.name}</b>
                            <small style={{ display: 'block', color: '#a1a1aa' }}>{d.unit}</small>
                          </td>
                          {vals.map((v, i) => (
                            <td key={i} style={{ fontWeight: v === best && present.length > 1 ? 900 : 400, color: v == null ? '#71717a' : '#fafafa' }}>
                              {v == null ? 'non testé' : v}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
          <p style={S.note}>
            Lecture descriptive uniquement. Une valeur n’est comparable que si le protocole, le dispositif et les
            conditions de test sont cohérents. « non testé » = donnée absente, jamais estimée.
          </p>
        </article>
      </section>
    </main>
  );
}

const S: Record<string, React.CSSProperties> = {
  center: { minHeight: '80vh', display: 'grid', placeItems: 'center', fontFamily: 'system-ui' },
  main: { minHeight: '100vh', background: '#09090B', color: '#FAFAFA', fontFamily: 'Inter,system-ui,sans-serif', padding: 28 },
  header: { maxWidth: 1280, margin: '0 auto 18px', display: 'flex', justifyContent: 'space-between', gap: 20 },
  kicker: { fontSize: 11, fontWeight: 900, letterSpacing: 1.5, color: '#E31E24' },
  h1: { fontSize: 'clamp(38px,5vw,64px)', margin: '4px 0', letterSpacing: -2.5 },
  sub: { color: '#A1A1AA', maxWidth: 720 },
  back: { color: '#fff', textDecoration: 'none', border: '1px solid #2B2B31', borderRadius: 10, padding: '10px 12px', height: 'fit-content' },
  filters: { maxWidth: 1280, margin: '0 auto 14px', display: 'flex', gap: 12, alignItems: 'end', flexWrap: 'wrap', background: '#141416', border: '1px solid #2B2B31', borderRadius: 16, padding: 14 },
  input: { display: 'block', minWidth: 220, height: 42, marginTop: 6, background: '#1B1B1F', color: '#fff', border: '1px solid #34343A', borderRadius: 10, padding: '0 10px' },
  count: { marginLeft: 'auto', fontWeight: 900 },
  grid: { maxWidth: 1280, margin: '0 auto', display: 'grid', gridTemplateColumns: '320px 1fr', gap: 14 },
  card: { background: '#141416', border: '1px solid #2B2B31', borderRadius: 18, padding: 16 },
  cardWide: { background: '#141416', border: '1px solid #2B2B31', borderRadius: 18, padding: 16, overflow: 'hidden' },
  player: { width: '100%', border: '1px solid #2B2B31', color: '#fff', borderRadius: 10, padding: '10px 12px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left', cursor: 'pointer' },
  legend: { display: 'flex', gap: 14, flexWrap: 'wrap', margin: '10px 0 4px', fontSize: 12 },
  legendItem: { display: 'inline-flex', alignItems: 'center', gap: 6 },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  note: { marginTop: 14, color: '#A1A1AA', fontSize: 12 },
};
