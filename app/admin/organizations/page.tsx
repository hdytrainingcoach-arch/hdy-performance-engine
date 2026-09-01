'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Organization = {
  id: string;
  name: string;
  branding: { primary?: string; secondary?: string; background?: string; label?: string; theme?: string } | null;
};

type Team = {
  id: string;
  organization_id: string;
  name: string;
  category: string | null;
  season: string | null;
};

type Player = {
  id: string;
  organization_id: string;
  team_id: string | null;
  display_name: string | null;
  first_name: string;
  last_name: string;
  birth_year: number | null;
  position: string | null;
  status: string;
};

const DIAMBARS_ORDER = ['PRO A', 'U19 - PRO B', 'U17', 'U15'];

export default function OrganizationsAdminPage() {
  const [ready, setReady] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [orgId, setOrgId] = useState('');
  const [teamId, setTeamId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (!session) {
        setReady(true);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_super_admin')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (!profile?.is_super_admin) {
        setReady(true);
        return;
      }

      setAuthorized(true);

      const [orgResult, teamResult, playerResult] = await Promise.all([
        supabase.from('organizations').select('id,name,branding').order('name'),
        supabase.from('teams').select('id,organization_id,name,category,season'),
        supabase.from('players').select('id,organization_id,team_id,display_name,first_name,last_name,birth_year,position,status').eq('active', true),
      ]);

      if (orgResult.error || teamResult.error || playerResult.error) {
        setError(orgResult.error?.message || teamResult.error?.message || playerResult.error?.message || 'Erreur de chargement');
      }

      const orgs = (orgResult.data || []) as Organization[];
      setOrganizations(orgs);
      setTeams((teamResult.data || []) as Team[]);
      setPlayers((playerResult.data || []) as Player[]);

      const diambars = orgs.find(o => o.name === 'Diambars FC');
      const first = diambars || orgs[0];
      if (first) setOrgId(first.id);
      setReady(true);
    })();
  }, []);

  const selectedOrg = organizations.find(o => o.id === orgId) || null;
  const accent = selectedOrg?.branding?.primary || '#111111';
  const secondary = selectedOrg?.branding?.secondary || '#111111';
  const background = selectedOrg?.branding?.background || '#FFFFFF';
  const isDiambars = selectedOrg?.name === 'Diambars FC';

  const orgTeams = useMemo(() => {
    const list = teams.filter(t => t.organization_id === orgId);
    if (!isDiambars) return list;
    return [...list].sort((a, b) => {
      const ai = DIAMBARS_ORDER.indexOf(a.name);
      const bi = DIAMBARS_ORDER.indexOf(b.name);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
  }, [teams, orgId, isDiambars]);

  useEffect(() => {
    if (!orgId) return;
    if (isDiambars && orgTeams.length) {
      setTeamId(current => orgTeams.some(t => t.id === current) ? current : orgTeams[0].id);
    } else {
      setTeamId('');
    }
  }, [orgId, isDiambars, orgTeams]);

  const visiblePlayers = players.filter(p => p.organization_id === orgId && (!teamId || p.team_id === teamId));
  const totalOrgPlayers = players.filter(p => p.organization_id === orgId).length;

  if (!ready) return <main style={styles.center}>Chargement sécurisé…</main>;
  if (!authorized) return <main style={styles.center}>Accès administrateur requis. Connecte-toi d’abord sur HDY Performance Engine.</main>;

  return (
    <main style={{ minHeight: '100vh', background, color: secondary, fontFamily: 'Arial, sans-serif' }}>
      <header style={{ ...styles.header, borderBottomColor: isDiambars ? '#D71920' : '#111111' }}>
        <div>
          <div style={{ ...styles.brandMark, background: isDiambars ? '#D71920' : '#111111' }}>{isDiambars ? 'DFC' : 'HDY'}</div>
          <div>
            <strong style={{ fontSize: 18 }}>HDY Performance Engine</strong>
            <div style={{ fontSize: 12, opacity: .65 }}>Administration principale</div>
          </div>
        </div>
        <a href="/" style={{ ...styles.linkButton, borderColor: accent, color: secondary }}>Retour dashboard</a>
      </header>

      <section style={styles.container}>
        <div style={styles.topline}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1.4, color: accent }}>ORGANISATION</div>
            <h1 style={{ margin: '6px 0 8px', fontSize: 34 }}>{selectedOrg?.branding?.label || selectedOrg?.name}</h1>
            <p style={{ margin: 0, opacity: .7 }}>Choisis l’environnement de travail puis l’équipe.</p>
          </div>
          <div style={{ ...styles.countCard, borderTopColor: accent }}>
            <span style={{ fontSize: 12, opacity: .65 }}>JOUEURS ACTIFS</span>
            <strong style={{ fontSize: 28 }}>{totalOrgPlayers}</strong>
          </div>
        </div>

        <div style={styles.orgGrid}>
          {organizations.map(org => {
            const active = org.id === orgId;
            const orgAccent = org.branding?.primary || '#111111';
            return (
              <button
                key={org.id}
                onClick={() => setOrgId(org.id)}
                style={{
                  ...styles.orgCard,
                  borderColor: active ? orgAccent : '#D1D5DB',
                  background: active ? (org.name === 'Diambars FC' ? '#FFF5F5' : '#F3F4F6') : '#FFFFFF',
                  boxShadow: active ? `inset 0 0 0 2px ${orgAccent}` : 'none',
                }}
              >
                <span style={{ ...styles.orgBadge, background: org.name === 'Diambars FC' ? '#D71920' : '#111111' }}>
                  {org.name === 'Diambars FC' ? 'DFC' : 'HDY'}
                </span>
                <span style={{ textAlign: 'left' }}>
                  <strong style={{ display: 'block', fontSize: 17 }}>{org.name}</strong>
                  <small style={{ opacity: .65 }}>{org.name === 'Diambars FC' ? 'Noir · Rouge · Blanc' : 'Noir · Blanc · Gris'}</small>
                </span>
              </button>
            );
          })}
        </div>

        {isDiambars ? (
          <>
            <div style={{ marginTop: 30, marginBottom: 12, fontSize: 12, fontWeight: 800, letterSpacing: 1.2 }}>ÉQUIPES DIAMBARS FC</div>
            <div style={styles.teamGrid}>
              {orgTeams.map(team => {
                const active = team.id === teamId;
                const count = players.filter(p => p.team_id === team.id).length;
                return (
                  <button key={team.id} onClick={() => setTeamId(team.id)} style={{
                    ...styles.teamCard,
                    background: active ? '#111111' : '#FFFFFF',
                    color: active ? '#FFFFFF' : '#111111',
                    borderColor: active ? '#D71920' : '#E5E7EB',
                  }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: active ? '#FF6B6B' : '#D71920' }}>{team.season || '2026-2027'}</span>
                    <strong style={{ fontSize: 20 }}>{team.name}</strong>
                    <span style={{ fontSize: 13, opacity: .75 }}>{count} joueurs</span>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <div style={{ ...styles.eliteBanner, borderLeftColor: '#111111' }}>
            <strong>HDY ELITE</strong>
            <span>Environnement individuel / performance. Les groupes HDY Elite pourront être créés séparément quand tu le souhaiteras.</span>
          </div>
        )}

        <section style={{ ...styles.panel, borderTopColor: accent }}>
          <div style={styles.panelHead}>
            <div>
              <div style={{ fontSize: 12, opacity: .6 }}>EFFECTIF</div>
              <h2 style={{ margin: '4px 0 0' }}>{isDiambars ? (orgTeams.find(t => t.id === teamId)?.name || 'Équipe') : 'HDY ELITE'}</h2>
            </div>
            <div style={{ fontWeight: 800 }}>{visiblePlayers.length} joueur{visiblePlayers.length > 1 ? 's' : ''}</div>
          </div>

          {error && <p style={{ color: '#B91C1C' }}>{error}</p>}
          {visiblePlayers.length === 0 ? (
            <div style={styles.empty}>Aucun joueur enregistré dans cet environnement pour le moment.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Joueur</th>
                    <th style={styles.th}>Année</th>
                    <th style={styles.th}>Poste</th>
                    <th style={styles.th}>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {visiblePlayers.map(player => (
                    <tr key={player.id}>
                      <td style={styles.td}><strong>{player.display_name || `${player.first_name} ${player.last_name}`}</strong></td>
                      <td style={styles.td}>{player.birth_year || '—'}</td>
                      <td style={styles.td}>{player.position || '—'}</td>
                      <td style={styles.td}><span style={{ ...styles.status, borderColor: accent }}>{player.status || 'Non défini'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  center: { minHeight: '70vh', display: 'grid', placeItems: 'center', padding: 24, fontFamily: 'Arial, sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, padding: '16px 24px', background: '#FFFFFF', borderBottom: '3px solid #111111', flexWrap: 'wrap' },
  brandMark: { width: 44, height: 44, borderRadius: 10, color: '#FFFFFF', display: 'grid', placeItems: 'center', fontWeight: 900, marginRight: 12 },
  linkButton: { textDecoration: 'none', border: '1px solid #111111', borderRadius: 10, padding: '10px 14px', fontWeight: 800, background: '#FFFFFF' },
  container: { width: 'min(1180px, calc(100% - 32px))', margin: '0 auto', padding: '28px 0 50px' },
  topline: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 20, flexWrap: 'wrap' },
  countCard: { minWidth: 150, border: '1px solid #E5E7EB', borderTop: '4px solid #111111', background: '#FFFFFF', borderRadius: 14, padding: 16, display: 'grid', gap: 5 },
  orgGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: 14, marginTop: 24 },
  orgCard: { minHeight: 82, border: '1px solid #D1D5DB', borderRadius: 14, padding: 14, display: 'flex', alignItems: 'center', gap: 13, cursor: 'pointer', color: '#111111' },
  orgBadge: { width: 48, height: 48, borderRadius: 12, color: '#FFFFFF', display: 'grid', placeItems: 'center', fontWeight: 900, flex: '0 0 auto' },
  teamGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 },
  teamCard: { minHeight: 110, border: '2px solid #E5E7EB', borderRadius: 14, padding: 16, display: 'grid', gap: 6, textAlign: 'left', cursor: 'pointer' },
  eliteBanner: { marginTop: 28, borderLeft: '5px solid #111111', borderRadius: 12, background: '#FFFFFF', padding: 18, display: 'grid', gap: 5 },
  panel: { marginTop: 28, background: '#FFFFFF', border: '1px solid #E5E7EB', borderTop: '4px solid #111111', borderRadius: 16, padding: 18 },
  panelHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 16 },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 620 },
  th: { textAlign: 'left', fontSize: 12, textTransform: 'uppercase', letterSpacing: .6, padding: '12px 10px', borderBottom: '1px solid #D1D5DB', color: '#6B7280' },
  td: { padding: '13px 10px', borderBottom: '1px solid #F3F4F6', fontSize: 14 },
  status: { display: 'inline-block', padding: '5px 9px', borderRadius: 999, border: '1px solid #111111', fontSize: 12, fontWeight: 700 },
  empty: { padding: 28, textAlign: 'center', background: '#F9FAFB', borderRadius: 12, color: '#6B7280' },
};
