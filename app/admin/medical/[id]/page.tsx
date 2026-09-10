'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  AVAILABILITY_COLOR, AVAILABILITY_LABEL, CONTEXT_LABEL, EVENT_STATUS_LABEL,
  LATERALITY_LABEL, MECHANISM_LABEL, SEVERITY_LABEL, hasMedicalAccess,
} from '@/lib/medical';

type Row = Record<string, any>;

const HISTORY_FIELDS: [string, string][] = [
  ['pathologies', 'Pathologies pertinentes'],
  ['surgeries', 'Chirurgies'],
  ['hospitalizations', 'Hospitalisations pertinentes'],
  ['allergies', 'Allergies'],
  ['current_treatments', 'Traitements en cours'],
  ['contraindications', 'Contre-indications'],
  ['concussion_history', 'Antécédents de commotion'],
  ['cardio_respiratory_history', 'Antécédents cardio-respiratoires'],
  ['observations', 'Observations médicales'],
];

const EMPTY_EVENT: Row = {
  onset_date: new Date().toISOString().slice(0, 10),
  context: 'training', body_zone: '', laterality: 'na', pain_level: '',
  mechanism: 'non_contact', severity: 'unknown', diagnosis: '', imaging: '',
  clinical_report: '', treatment: '', restrictions: '', surgery: false, surgery_detail: '',
  is_recurrence: false, status: 'open',
  rtr_expected: '', rtr_actual: '', rtt_expected: '', rtt_actual: '',
  rtp_expected: '', rtp_actual: '', rtperf_expected: '', rtperf_actual: '',
};

const nn = (v: any) => (v === '' || v === undefined ? null : v);
const ni = (v: any) => (v === '' || v === undefined || v === null ? null : Number(v));

export default function MedicalDossier() {
  const id = useParams<{ id: string }>()?.id;
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [player, setPlayer] = useState<Row | null>(null);
  const [history, setHistory] = useState<Row>({});
  const [status, setStatus] = useState<Row>({ availability: 'full', shared_restrictions: '', expected_return: '' });
  const [events, setEvents] = useState<Row[]>([]);
  const [evForm, setEvForm] = useState<Row>({ ...EMPTY_EVENT });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    const { data: p } = await supabase
      .from('players')
      .select('id,display_name,first_name,last_name,primary_position,position,organization_id')
      .eq('id', id)
      .maybeSingle();
    setPlayer(p ?? null);
    if (!p) { setReady(true); return; }
    const ok = await hasMedicalAccess(supabase, p.organization_id);
    setAllowed(ok);
    if (ok) {
      const [{ data: h }, { data: s }, { data: ev }] = await Promise.all([
        supabase.from('medical_histories').select('*').eq('player_id', id).maybeSingle(),
        supabase.from('player_medical_status').select('*').eq('player_id', id).maybeSingle(),
        supabase.from('medical_events').select('*').eq('player_id', id).order('onset_date', { ascending: false }),
      ]);
      if (h) setHistory(h);
      if (s) setStatus(s);
      setEvents((ev ?? []) as Row[]);
    }
    setReady(true);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function saveHistory() {
    setMsg('');
    const payload: Row = { organization_id: player!.organization_id, player_id: id };
    for (const [k] of HISTORY_FIELDS) payload[k] = nn(history[k]);
    const { data: { session } } = await supabase.auth.getSession();
    payload.updated_by = session?.user.id ?? null;
    const { error } = await supabase.from('medical_histories').upsert(payload, { onConflict: 'player_id' });
    setMsg(error ? error.message : 'Antécédents enregistrés ✓');
    if (!error) load();
  }

  async function saveStatus() {
    setMsg('');
    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase.from('player_medical_status').upsert(
      {
        player_id: id,
        organization_id: player!.organization_id,
        availability: status.availability,
        shared_restrictions: nn(status.shared_restrictions),
        expected_return: nn(status.expected_return),
        active_event_id: nn(status.active_event_id),
        updated_by: session?.user.id ?? null,
      },
      { onConflict: 'player_id' },
    );
    setMsg(error ? error.message : 'Statut fonctionnel partagé enregistré ✓');
    if (!error) load();
  }

  async function saveEvent() {
    setMsg('');
    if (!evForm.onset_date) { setMsg('Date d’apparition requise.'); return; }
    const { data: { session } } = await supabase.auth.getSession();
    const payload: Row = {
      organization_id: player!.organization_id,
      player_id: id,
      onset_date: evForm.onset_date,
      context: nn(evForm.context), body_zone: nn(evForm.body_zone), laterality: nn(evForm.laterality),
      pain_level: ni(evForm.pain_level), mechanism: nn(evForm.mechanism), severity: nn(evForm.severity),
      diagnosis: nn(evForm.diagnosis), imaging: nn(evForm.imaging), clinical_report: nn(evForm.clinical_report),
      treatment: nn(evForm.treatment), restrictions: nn(evForm.restrictions),
      surgery: !!evForm.surgery, surgery_detail: nn(evForm.surgery_detail),
      is_recurrence: !!evForm.is_recurrence, status: evForm.status,
      rtr_expected: nn(evForm.rtr_expected), rtr_actual: nn(evForm.rtr_actual),
      rtt_expected: nn(evForm.rtt_expected), rtt_actual: nn(evForm.rtt_actual),
      rtp_expected: nn(evForm.rtp_expected), rtp_actual: nn(evForm.rtp_actual),
      rtperf_expected: nn(evForm.rtperf_expected), rtperf_actual: nn(evForm.rtperf_actual),
    };
    let error;
    if (editingId) {
      ({ error } = await supabase.from('medical_events').update(payload).eq('id', editingId));
    } else {
      payload.created_by = session?.user.id ?? null;
      ({ error } = await supabase.from('medical_events').insert(payload));
    }
    setMsg(error ? error.message : editingId ? 'Événement mis à jour ✓' : 'Événement médical créé ✓');
    if (!error) { setEvForm({ ...EMPTY_EVENT }); setEditingId(null); load(); }
  }

  function editEvent(e: Row) {
    setEditingId(e.id);
    setEvForm({ ...EMPTY_EVENT, ...Object.fromEntries(Object.entries(e).map(([k, v]) => [k, v ?? ''])) });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (!ready) return <main style={S.center}>Chargement…</main>;
  if (!player) return <main style={S.center}>Joueur introuvable.</main>;
  if (!allowed) return <main style={S.center}>Accès réservé au personnel médical.</main>;

  const name = player.display_name || `${player.first_name} ${player.last_name}`;
  const avC = AVAILABILITY_COLOR[status.availability] ?? AVAILABILITY_COLOR.full;

  return (
    <main style={S.main}>
      <header style={S.header}>
        <div>
          <span style={S.kicker}>DOSSIER MÉDICAL PROTÉGÉ · CONFIDENTIEL</span>
          <h1 style={S.h1}>{name}</h1>
          <p style={S.sub}>{player.primary_position || player.position || 'Joueur'} · accès personnel médical uniquement</p>
        </div>
        <a href="/admin/medical" style={S.back}>← Médical</a>
      </header>

      {msg && <p style={S.notice}>{msg}</p>}

      {/* Statut fonctionnel partagé */}
      <section style={S.card}>
        <div style={S.cardHead}>
          <h2 style={S.h2}>Statut fonctionnel partagé</h2>
          <span style={{ ...S.badge, background: avC.bg, color: avC.fg }}>{AVAILABILITY_LABEL[status.availability]}</span>
        </div>
        <p style={S.hint}>Visible par le coach et le préparateur. Ne partage jamais le diagnostic ici — uniquement le statut et les restrictions utiles au terrain.</p>
        <div style={S.grid3}>
          <label>Disponibilité
            <select value={status.availability} onChange={(e) => setStatus({ ...status, availability: e.target.value })} style={S.input}>
              {Object.entries(AVAILABILITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label>Retour prévu
            <input type="date" value={status.expected_return ?? ''} onChange={(e) => setStatus({ ...status, expected_return: e.target.value })} style={S.input} />
          </label>
          <label>Événement actif
            <select value={status.active_event_id ?? ''} onChange={(e) => setStatus({ ...status, active_event_id: e.target.value })} style={S.input}>
              <option value="">—</option>
              {events.map((e) => <option key={e.id} value={e.id}>{e.body_zone || 'événement'} · {new Date(e.onset_date).toLocaleDateString('fr-FR')}</option>)}
            </select>
          </label>
        </div>
        <label>Restrictions partagées
          <textarea value={status.shared_restrictions ?? ''} onChange={(e) => setStatus({ ...status, shared_restrictions: e.target.value })} placeholder="Ex. : pas de sprint ni de duel, course en ligne autorisée" style={S.textarea} />
        </label>
        <button onClick={saveStatus} style={S.primary}>Enregistrer le statut</button>
      </section>

      {/* Antécédents */}
      <section style={S.card}>
        <h2 style={S.h2}>Antécédents médicaux</h2>
        <div style={S.grid2}>
          {HISTORY_FIELDS.map(([k, label]) => (
            <label key={k}>{label}
              <textarea value={history[k] ?? ''} onChange={(e) => setHistory({ ...history, [k]: e.target.value })} style={S.textareaSm} />
            </label>
          ))}
        </div>
        <button onClick={saveHistory} style={S.primary}>Enregistrer les antécédents</button>
      </section>

      {/* Nouvel / édition événement */}
      <section style={S.card}>
        <h2 style={S.h2}>{editingId ? 'Modifier l’événement' : 'Nouvel événement médical'}</h2>
        <div style={S.grid3}>
          <label>Date d’apparition<input type="date" value={evForm.onset_date} onChange={(e) => setEvForm({ ...evForm, onset_date: e.target.value })} style={S.input} /></label>
          <label>Contexte<select value={evForm.context} onChange={(e) => setEvForm({ ...evForm, context: e.target.value })} style={S.input}>{Object.entries(CONTEXT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <label>Zone anatomique<input value={evForm.body_zone} onChange={(e) => setEvForm({ ...evForm, body_zone: e.target.value })} placeholder="Ischio-jambier, cheville…" style={S.input} /></label>
          <label>Latéralité<select value={evForm.laterality} onChange={(e) => setEvForm({ ...evForm, laterality: e.target.value })} style={S.input}>{Object.entries(LATERALITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <label>Mécanisme<select value={evForm.mechanism} onChange={(e) => setEvForm({ ...evForm, mechanism: e.target.value })} style={S.input}>{Object.entries(MECHANISM_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <label>Gravité<select value={evForm.severity} onChange={(e) => setEvForm({ ...evForm, severity: e.target.value })} style={S.input}>{Object.entries(SEVERITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <label>Douleur (0–10)<input type="number" min={0} max={10} value={evForm.pain_level} onChange={(e) => setEvForm({ ...evForm, pain_level: e.target.value })} style={S.input} /></label>
          <label>Statut<select value={evForm.status} onChange={(e) => setEvForm({ ...evForm, status: e.target.value })} style={S.input}>{Object.entries(EVENT_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <label style={S.checkLabel}><input type="checkbox" checked={!!evForm.is_recurrence} onChange={(e) => setEvForm({ ...evForm, is_recurrence: e.target.checked })} /> Récidive</label>
        </div>
        <div style={S.grid2}>
          <label>Diagnostic<textarea value={evForm.diagnosis} onChange={(e) => setEvForm({ ...evForm, diagnosis: e.target.value })} style={S.textareaSm} /></label>
          <label>Imagerie<textarea value={evForm.imaging} onChange={(e) => setEvForm({ ...evForm, imaging: e.target.value })} style={S.textareaSm} /></label>
          <label>Compte rendu clinique<textarea value={evForm.clinical_report} onChange={(e) => setEvForm({ ...evForm, clinical_report: e.target.value })} style={S.textareaSm} /></label>
          <label>Traitement<textarea value={evForm.treatment} onChange={(e) => setEvForm({ ...evForm, treatment: e.target.value })} style={S.textareaSm} /></label>
          <label>Restrictions<textarea value={evForm.restrictions} onChange={(e) => setEvForm({ ...evForm, restrictions: e.target.value })} style={S.textareaSm} /></label>
        </div>
        <label style={S.checkLabel}><input type="checkbox" checked={!!evForm.surgery} onChange={(e) => setEvForm({ ...evForm, surgery: e.target.checked })} /> Chirurgie</label>
        {evForm.surgery && <label>Détail chirurgie<input value={evForm.surgery_detail} onChange={(e) => setEvForm({ ...evForm, surgery_detail: e.target.value })} style={S.input} /></label>}

        <h3 style={S.h3}>Retour progressif (prévu / réel)</h3>
        <div style={S.grid4}>
          {([['rtr', 'Return to Run'], ['rtt', 'Return to Training'], ['rtp', 'Return to Play'], ['rtperf', 'Return to Performance']] as [string, string][]).map(([p, label]) => (
            <div key={p} style={S.rtpBox}>
              <small>{label}</small>
              <input type="date" value={evForm[`${p}_expected`]} onChange={(e) => setEvForm({ ...evForm, [`${p}_expected`]: e.target.value })} style={S.inputSm} />
              <input type="date" value={evForm[`${p}_actual`]} onChange={(e) => setEvForm({ ...evForm, [`${p}_actual`]: e.target.value })} style={S.inputSm} />
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={saveEvent} style={S.primary}>{editingId ? 'Mettre à jour' : 'Créer l’événement'}</button>
          {editingId && <button onClick={() => { setEditingId(null); setEvForm({ ...EMPTY_EVENT }); }} style={S.ghost}>Annuler</button>}
        </div>
      </section>

      {/* Historique événements */}
      <section style={S.card}>
        <h2 style={S.h2}>Historique des événements ({events.length})</h2>
        {!events.length && <p style={S.hint}>Aucun événement médical enregistré.</p>}
        {events.map((e) => (
          <article key={e.id} style={S.event}>
            <div style={S.eventTop}>
              <b>{e.body_zone || 'Événement'} {e.laterality && e.laterality !== 'na' ? `(${LATERALITY_LABEL[e.laterality]})` : ''}</b>
              <span style={S.eventDate}>{new Date(e.onset_date).toLocaleDateString('fr-FR')} · {EVENT_STATUS_LABEL[e.status]}</span>
            </div>
            {e.diagnosis && <p style={S.eventLine}>{e.diagnosis}</p>}
            <div style={S.eventMeta}>
              {e.severity && <span>Gravité : {SEVERITY_LABEL[e.severity]}</span>}
              {e.mechanism && <span>Mécanisme : {MECHANISM_LABEL[e.mechanism]}</span>}
              {e.is_recurrence && <span style={{ color: '#ff8a8f' }}>Récidive</span>}
              {e.days_out_training != null && <span>Indispo. entraînement : <b>{e.days_out_training} j</b></span>}
              {e.days_out_play != null && <span>Indispo. jeu : <b>{e.days_out_play} j</b></span>}
            </div>
            <div style={S.eventRtp}>
              {([['rtr', 'RTR'], ['rtt', 'RTT'], ['rtp', 'RTP'], ['rtperf', 'RTPerf']] as [string, string][]).map(([p, lbl]) => (
                <span key={p}>
                  {lbl} : {e[`${p}_actual`] ? <b style={{ color: '#8ef0b0' }}>{new Date(e[`${p}_actual`]).toLocaleDateString('fr-FR')}</b>
                    : e[`${p}_expected`] ? <span style={{ color: '#f5c96b' }}>~{new Date(e[`${p}_expected`]).toLocaleDateString('fr-FR')}</span>
                      : '—'}
                </span>
              ))}
            </div>
            <button onClick={() => editEvent(e)} style={S.ghostSm}>Modifier</button>
          </article>
        ))}
      </section>
    </main>
  );
}

const S: Record<string, React.CSSProperties> = {
  center: { minHeight: '80vh', display: 'grid', placeItems: 'center', fontFamily: 'system-ui', color: '#fafafa', background: '#09090B' },
  main: { minHeight: '100vh', background: '#09090B', color: '#FAFAFA', fontFamily: 'Inter,system-ui,sans-serif', padding: 28 },
  header: { maxWidth: 1100, margin: '0 auto 18px', display: 'flex', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' },
  kicker: { fontSize: 11, fontWeight: 900, letterSpacing: 1.4, color: '#c9b8ff' },
  h1: { fontSize: 'clamp(34px,5vw,54px)', margin: '4px 0', letterSpacing: -2 },
  h2: { fontSize: 19, margin: 0 },
  h3: { fontSize: 14, margin: '16px 0 8px', color: '#a1a1aa' },
  sub: { color: '#A1A1AA' },
  back: { color: '#fff', textDecoration: 'none', border: '1px solid #2B2B31', borderRadius: 10, padding: '10px 12px', height: 'fit-content' },
  notice: { maxWidth: 1100, margin: '0 auto 12px', background: '#19191c', border: '1px solid #2b2b31', padding: 12, borderRadius: 10 },
  card: { maxWidth: 1100, margin: '0 auto 14px', background: '#141416', border: '1px solid #2B2B31', borderRadius: 18, padding: 18, display: 'grid', gap: 12 },
  cardHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  hint: { color: '#a1a1aa', fontSize: 12, margin: 0 },
  badge: { borderRadius: 999, padding: '5px 11px', fontWeight: 900, fontSize: 12 },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 10 },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 10 },
  grid4: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10 },
  input: { width: '100%', boxSizing: 'border-box', height: 40, marginTop: 5, background: '#1B1B1F', color: '#fff', border: '1px solid #34343A', borderRadius: 9, padding: '0 10px' },
  inputSm: { width: '100%', boxSizing: 'border-box', height: 34, marginTop: 4, background: '#1B1B1F', color: '#fff', border: '1px solid #34343A', borderRadius: 8, padding: '0 8px', fontSize: 12 },
  textarea: { width: '100%', boxSizing: 'border-box', minHeight: 54, marginTop: 5, background: '#1B1B1F', color: '#fff', border: '1px solid #34343A', borderRadius: 9, padding: 10, fontFamily: 'inherit' },
  textareaSm: { width: '100%', boxSizing: 'border-box', minHeight: 44, marginTop: 5, background: '#1B1B1F', color: '#fff', border: '1px solid #34343A', borderRadius: 9, padding: 8, fontFamily: 'inherit', fontSize: 13 },
  checkLabel: { display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 },
  rtpBox: { display: 'grid', gap: 2, background: '#1b1b1f', border: '1px solid #2b2b31', borderRadius: 10, padding: 8, fontSize: 11 },
  primary: { border: 0, borderRadius: 10, padding: '11px 16px', fontWeight: 850, color: '#fff', background: '#7c3aed', cursor: 'pointer', justifySelf: 'start' },
  ghost: { border: '1px solid #3f3f46', borderRadius: 10, padding: '11px 16px', fontWeight: 800, color: '#fff', background: '#1a1a1d', cursor: 'pointer' },
  ghostSm: { border: '1px solid #3f3f46', borderRadius: 8, padding: '6px 10px', fontWeight: 800, color: '#fff', background: '#1a1a1d', cursor: 'pointer', fontSize: 12, justifySelf: 'start' },
  event: { border: '1px solid #2b2b31', borderRadius: 12, padding: 12, display: 'grid', gap: 6, background: '#1b1b1f' },
  eventTop: { display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
  eventDate: { color: '#a1a1aa', fontSize: 12 },
  eventLine: { margin: 0, fontSize: 13 },
  eventMeta: { display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12, color: '#a1a1aa' },
  eventRtp: { display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 11, color: '#a1a1aa' },
};
