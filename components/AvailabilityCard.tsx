'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Activity, AlarmClock, Check, HeartPulse, X } from 'lucide-react';

type Player = { id: string; organization_id: string; team_id: string | null };
type Row = {
  status: string;
  reason_category: string | null;
  comment: string | null;
  medical_confirmed: boolean;
  for_date: string;
};

const STATUSES: { key: string; label: string; Icon: typeof Check }[] = [
  { key: 'present', label: 'Présent', Icon: Check },
  { key: 'absent', label: 'Absent', Icon: X },
  { key: 'retard', label: 'En retard', Icon: AlarmClock },
  { key: 'amenage', label: 'Travail adapté', Icon: Activity },
  { key: 'soins', label: 'Au cabinet médical', Icon: HeartPulse },
];
const REASONS: { key: string; label: string }[] = [
  { key: 'blessure', label: 'Blessure' },
  { key: 'maladie', label: 'Maladie' },
  { key: 'rdv_medical', label: 'RDV médical' },
  { key: 'scolaire', label: 'Scolaire' },
  { key: 'familial', label: 'Familial' },
  { key: 'personnel', label: 'Personnel' },
  { key: 'autre', label: 'Autre' },
];
const STATUS_LABEL: Record<string, string> = {};
STATUSES.forEach((s) => { STATUS_LABEL[s.key] = s.label; });
const REASON_LABEL: Record<string, string> = {};
REASONS.forEach((r) => { REASON_LABEL[r.key] = r.label; });

function isoFor(day: 'today' | 'tomorrow') {
  const d = new Date();
  if (day === 'tomorrow') d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export default function AvailabilityCard({ player }: { player: Player }) {
  const isDemo = player.id === 'demo';
  const [day, setDay] = useState<'today' | 'tomorrow'>('today');
  const [current, setCurrent] = useState<Row | null>(null);
  const [status, setStatus] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(!isDemo);

  const forDate = isoFor(day);

  const load = useCallback(async () => {
    if (isDemo) return;
    setLoading(true);
    const { data } = await supabase
      .from('player_availability')
      .select('status,reason_category,comment,medical_confirmed,for_date')
      .eq('player_id', player.id)
      .eq('for_date', forDate)
      .maybeSingle();
    setCurrent((data as Row) ?? null);
    setStatus((data as Row)?.status ?? '');
    setReason((data as Row)?.reason_category ?? '');
    setComment((data as Row)?.comment ?? '');
    setMsg('');
    setLoading(false);
  }, [isDemo, player.id, forDate]);

  useEffect(() => {
    load();
  }, [load]);

  async function submit(nextStatus: string, nextReason?: string) {
    setMsg('');
    if (nextStatus !== 'present' && !(nextReason ?? reason)) {
      setStatus(nextStatus);
      return; // attend le motif
    }
    if (isDemo) {
      setCurrent({ status: nextStatus, reason_category: nextReason ?? reason ?? null, comment, medical_confirmed: false, for_date: forDate });
      return;
    }
    setSaving(true);
    const { error } = await supabase.rpc('set_my_availability', {
      p_for_date: forDate,
      p_status: nextStatus,
      p_reason: nextStatus === 'present' ? null : (nextReason ?? reason) || null,
      p_comment: comment || null,
    });
    setSaving(false);
    if (error) {
      setMsg(error.message);
      return;
    }
    await load();
  }

  const needsReason = status && status !== 'present';
  const dirty =
    status !== (current?.status ?? '') ||
    (needsReason && reason !== (current?.reason_category ?? '')) ||
    comment !== (current?.comment ?? '');

  return (
    <article style={S.card}>
      <div style={S.head}>
        <div>
          <p style={S.eyebrow}>MA PRÉSENCE À L’ENTRAÎNEMENT</p>
          <h2 style={S.title}>{day === 'today' ? "Aujourd’hui" : 'Demain'}</h2>
        </div>
        <div style={S.dayToggle}>
          {(['today', 'tomorrow'] as const).map((d) => (
            <button key={d} onClick={() => setDay(d)} style={{ ...S.dayBtn, ...(day === d ? S.dayBtnOn : {}) }}>
              {d === 'today' ? 'Auj.' : 'Demain'}
            </button>
          ))}
        </div>
      </div>

      {current && !dirty && (
        <div style={S.currentBox}>
          <strong>{STATUS_LABEL[current.status] ?? current.status}</strong>
          {current.reason_category && <span> · {REASON_LABEL[current.reason_category] ?? current.reason_category}</span>}
          {current.status === 'soins' && (
            <div style={{ ...S.badge, ...(current.medical_confirmed ? S.badgeOk : S.badgeWait) }}>
              {current.medical_confirmed ? 'Confirmé par le staff médical' : 'En attente de confirmation médicale'}
            </div>
          )}
          <button style={S.changeBtn} onClick={() => setStatus('')}>Modifier</button>
        </div>
      )}

      {(!current || dirty || !status) && (
        <>
          <div style={S.grid}>
            {STATUSES.map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => (key === 'present' ? submit('present') : setStatus(key))}
                disabled={saving || loading}
                style={{ ...S.statusBtn, ...(status === key ? S.statusBtnOn : {}) }}
              >
                <Icon size={17} />
                <span>{label}</span>
              </button>
            ))}
          </div>

          {needsReason && (
            <div style={S.reasonWrap}>
              <p style={S.reasonLabel}>Motif</p>
              <div style={S.chips}>
                {REASONS.map((r) => (
                  <button
                    key={r.key}
                    onClick={() => setReason(r.key)}
                    style={{ ...S.chip, ...(reason === r.key ? S.chipOn : {}) }}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Précision (facultatif)"
                style={S.textarea}
              />
              <button
                onClick={() => submit(status)}
                disabled={saving || !reason}
                style={S.saveBtn}
              >
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          )}
        </>
      )}

      {msg && <p style={S.err}>{msg}</p>}
    </article>
  );
}

const S: Record<string, React.CSSProperties> = {
  card: {
    marginTop: 12,
    border: '1px solid var(--brand-border, #2b2b31)',
    borderRadius: 18,
    padding: 16,
    background: 'var(--brand-surface, rgba(255,255,255,.03))',
    color: 'var(--brand-text, #fafafa)',
  },
  head: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' },
  eyebrow: { fontSize: 10, fontWeight: 900, letterSpacing: 1.4, color: 'var(--brand-accent, #E31E24)', margin: 0 },
  title: { fontSize: 20, margin: '4px 0 0', fontWeight: 900 },
  dayToggle: { display: 'flex', gap: 4, border: '1px solid var(--brand-border, #2b2b31)', borderRadius: 10, padding: 3 },
  dayBtn: { border: 0, background: 'transparent', color: 'inherit', fontWeight: 800, fontSize: 12, padding: '6px 9px', borderRadius: 7, cursor: 'pointer' },
  dayBtnOn: { background: 'var(--brand-accent, #E31E24)', color: '#fff' },
  currentBox: { marginTop: 12, padding: 12, borderRadius: 12, background: 'rgba(255,255,255,.04)', border: '1px solid var(--brand-border, #2b2b31)', fontSize: 15 },
  badge: { display: 'inline-block', marginTop: 8, fontSize: 11, fontWeight: 800, borderRadius: 999, padding: '4px 9px' },
  badgeOk: { background: '#13331f', color: '#8ef0b0' },
  badgeWait: { background: '#3a2c12', color: '#f5c96b' },
  changeBtn: { display: 'block', marginTop: 10, border: '1px solid var(--brand-border, #2b2b31)', background: 'transparent', color: 'inherit', fontWeight: 800, fontSize: 12, borderRadius: 8, padding: '7px 10px', cursor: 'pointer' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 8, marginTop: 12 },
  statusBtn: { display: 'flex', gap: 9, alignItems: 'center', border: '1px solid var(--brand-border, #2b2b31)', borderRadius: 12, padding: '12px 12px', background: 'rgba(255,255,255,.03)', color: 'inherit', fontWeight: 800, fontSize: 13, textAlign: 'left', cursor: 'pointer', minHeight: 48 },
  statusBtnOn: { borderColor: 'var(--brand-accent, #E31E24)', background: 'var(--brand-accent, #E31E24)', color: '#fff' },
  reasonWrap: { marginTop: 12 },
  reasonLabel: { fontSize: 12, fontWeight: 800, margin: '0 0 8px', opacity: 0.8 },
  chips: { display: 'flex', flexWrap: 'wrap', gap: 7 },
  chip: { border: '1px solid var(--brand-border, #2b2b31)', borderRadius: 999, padding: '8px 12px', background: 'rgba(255,255,255,.03)', color: 'inherit', fontWeight: 800, fontSize: 12, cursor: 'pointer' },
  chipOn: { borderColor: 'var(--brand-accent, #E31E24)', background: 'var(--brand-accent, #E31E24)', color: '#fff' },
  textarea: { width: '100%', boxSizing: 'border-box', marginTop: 10, minHeight: 54, borderRadius: 10, border: '1px solid var(--brand-border, #2b2b31)', background: 'rgba(0,0,0,.25)', color: 'inherit', padding: 10, fontFamily: 'inherit' },
  saveBtn: { width: '100%', marginTop: 10, border: 0, borderRadius: 12, padding: '13px 16px', background: 'var(--brand-accent, #E31E24)', color: '#fff', fontWeight: 900, fontSize: 14, cursor: 'pointer' },
  err: { marginTop: 10, color: '#ff8a8f', fontSize: 13 },
};
