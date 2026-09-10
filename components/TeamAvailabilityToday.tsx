'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Props = { organizationId: string; teamId: string | null };
type Player = { id: string; display_name: string | null; first_name: string; last_name: string };
type Avail = {
  id: string;
  player_id: string;
  status: string;
  reason_category: string | null;
  comment: string | null;
  medical_confirmed: boolean;
  expected_return_date: string | null;
  declared_by_role: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  present: 'Présent', absent: 'Absent', retard: 'En retard', amenage: 'Travail adapté', soins: 'Au cabinet médical',
};
const REASON_LABEL: Record<string, string> = {
  blessure: 'Blessure', maladie: 'Maladie', rdv_medical: 'RDV médical', scolaire: 'Scolaire',
  familial: 'Familial', personnel: 'Personnel', autre: 'Autre',
};
const today = () => new Date().toISOString().slice(0, 10);

export default function TeamAvailabilityToday({ organizationId, teamId }: Props) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [rows, setRows] = useState<Avail[]>([]);
  const [canConfirm, setCanConfirm] = useState(false);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setMsg('');
    let pq = supabase
      .from('players')
      .select('id,display_name,first_name,last_name')
      .eq('organization_id', organizationId)
      .eq('active', true);
    if (teamId) pq = pq.eq('team_id', teamId);
    const { data: pl } = await pq;
    const list = (pl ?? []) as Player[];
    setPlayers(list);
    const ids = list.map((p) => p.id);
    if (ids.length) {
      const { data: av } = await supabase
        .from('player_availability')
        .select('id,player_id,status,reason_category,comment,medical_confirmed,expected_return_date,declared_by_role')
        .eq('organization_id', organizationId)
        .eq('for_date', today())
        .in('player_id', ids);
      setRows((av ?? []) as Avail[]);
    } else {
      setRows([]);
    }
    setLoading(false);
  }, [organizationId, teamId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.auth.getSession();
      if (!s.session) return;
      const [{ data: prof }, { data: mem }] = await Promise.all([
        supabase.from('profiles').select('is_super_admin').eq('user_id', s.session.user.id).maybeSingle(),
        supabase.from('memberships').select('role,medical_clearance').eq('user_id', s.session.user.id).eq('organization_id', organizationId).eq('active', true).maybeSingle(),
      ]);
      setCanConfirm(!!prof?.is_super_admin || mem?.role === 'staff_medical' || !!mem?.medical_clearance);
    })();
  }, [organizationId]);

  const byId = useMemo(() => new Map(rows.map((r) => [r.player_id, r])), [rows]);
  const nameOf = (id: string) => {
    const p = players.find((x) => x.id === id);
    return p?.display_name || `${p?.first_name ?? ''} ${p?.last_name ?? ''}`.trim() || 'Joueur';
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = { present: 0, absent: 0, retard: 0, amenage: 0, soins: 0, none: 0 };
    for (const p of players) {
      const r = byId.get(p.id);
      if (!r) c.none += 1;
      else c[r.status] = (c[r.status] ?? 0) + 1;
    }
    return c;
  }, [players, byId]);

  const declared = rows.filter((r) => r.status !== 'present');

  async function confirm(id: string, next: boolean) {
    setMsg('');
    const { error } = await supabase.rpc('confirm_availability', { p_id: id, p_confirm: next });
    if (error) setMsg(error.message);
    else load();
  }

  return (
    <section style={S.card}>
      <div style={S.head}>
        <div>
          <span style={S.eyebrow}>DISPONIBILITÉ · {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          <h2 style={S.h2}>Présence du jour</h2>
        </div>
        <button style={S.refresh} onClick={load} disabled={loading}>{loading ? '…' : 'Rafraîchir'}</button>
      </div>

      <div style={S.metrics}>
        {[
          ['Présents', counts.present, '#8ef0b0'],
          ['Absents', counts.absent, '#ff8a8f'],
          ['En retard', counts.retard, '#f5c96b'],
          ['Travail adapté', counts.amenage, '#f5c96b'],
          ['Au cabinet', counts.soins, '#c9b8ff'],
          ['Sans réponse', counts.none, '#a1a1aa'],
        ].map(([label, n, color]) => (
          <div key={label as string} style={S.metric}>
            <strong style={{ color: color as string }}>{n as number}</strong>
            <small>{label as string}</small>
          </div>
        ))}
      </div>

      {msg && <p style={S.err}>{msg}</p>}

      {declared.length > 0 ? (
        <div style={S.list}>
          {declared.map((r) => (
            <div key={r.id} style={S.row}>
              <div style={{ minWidth: 0 }}>
                <b>{nameOf(r.player_id)}</b>
                <small style={S.sub}>
                  {STATUS_LABEL[r.status] ?? r.status}
                  {r.reason_category ? ` · ${REASON_LABEL[r.reason_category] ?? r.reason_category}` : ''}
                  {r.expected_return_date ? ` · retour prévu ${new Date(r.expected_return_date).toLocaleDateString('fr-FR')}` : ''}
                  {r.declared_by_role === 'staff' ? ' · saisi par le staff' : ''}
                </small>
                {r.comment && <small style={S.comment}>« {r.comment} »</small>}
              </div>
              {r.status === 'soins' && (
                <div style={S.confirmWrap}>
                  <span style={{ ...S.badge, ...(r.medical_confirmed ? S.badgeOk : S.badgeWait) }}>
                    {r.medical_confirmed ? 'Confirmé médical' : 'À confirmer'}
                  </span>
                  {canConfirm && (
                    <button style={S.confirmBtn} onClick={() => confirm(r.id, !r.medical_confirmed)}>
                      {r.medical_confirmed ? 'Retirer' : 'Confirmer'}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        !loading && <p style={S.sub}>Aucune absence ou soin déclaré pour aujourd’hui.</p>
      )}
    </section>
  );
}

const S: Record<string, React.CSSProperties> = {
  card: { maxWidth: 1280, margin: '0 auto 14px', background: '#141416', border: '1px solid #2b2b31', borderRadius: 18, padding: 16, color: '#fafafa' },
  head: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' },
  eyebrow: { fontSize: 11, fontWeight: 900, letterSpacing: 1.4, color: '#E31E24', textTransform: 'uppercase' },
  h2: { margin: '4px 0 0', fontSize: 22 },
  refresh: { border: '1px solid #34343a', background: '#1b1b1f', color: '#fff', borderRadius: 9, padding: '8px 11px', fontWeight: 800, fontSize: 12, cursor: 'pointer' },
  metrics: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(110px,1fr))', gap: 8, margin: '14px 0' },
  metric: { background: '#1b1b1f', border: '1px solid #2b2b31', borderRadius: 12, padding: '12px 10px', display: 'grid', gap: 3, textAlign: 'center' },
  list: { display: 'grid', gap: 8, marginTop: 6 },
  row: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', background: '#1b1b1f', border: '1px solid #2b2b31', borderRadius: 12, padding: '10px 12px', flexWrap: 'wrap' },
  sub: { display: 'block', color: '#a1a1aa', fontSize: 12, marginTop: 3 },
  comment: { display: 'block', color: '#d4d4d8', fontSize: 12, marginTop: 3, fontStyle: 'italic' },
  confirmWrap: { display: 'flex', gap: 8, alignItems: 'center', flex: '0 0 auto' },
  badge: { fontSize: 10, fontWeight: 900, borderRadius: 999, padding: '4px 8px' },
  badgeOk: { background: '#13331f', color: '#8ef0b0' },
  badgeWait: { background: '#3a2c12', color: '#f5c96b' },
  confirmBtn: { border: '1px solid #3f3f46', background: '#1a1a1d', color: '#fff', borderRadius: 8, padding: '7px 10px', fontWeight: 800, fontSize: 12, cursor: 'pointer' },
  err: { color: '#ff8a8f', fontSize: 13 },
};
