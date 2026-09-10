'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { enqueue } from '@/lib/offline-queue';
import { ArrowRight, ChevronLeft } from 'lucide-react';

type Player = { id: string; organization_id: string };
type Question = {
  key: string;
  label: string;
  min?: number;
  max?: number;
  labels?: Record<string, string>;
  computed?: boolean;
};
type Template = { id: string; version: number; name: string; questions: Question[] };

// Rendu piloté par la donnée : les questions viennent de questionnaire_templates
// (type 'OPR', actif, dernière version). Ne pas figer les questions ici.
export default function HooperFlow({
  player,
  onClose,
  onSaved,
}: {
  player: Player;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [tpl, setTpl] = useState<Template | null>(null);
  const [loadErr, setLoadErr] = useState('');
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [unusualSymptom, setUnusualSymptom] = useState(false);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('questionnaire_templates')
        .select('id,version,name,questions')
        .eq('type', 'OPR')
        .eq('active', true)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error || !data) {
        setLoadErr('Questionnaire Hooper indisponible. Contacte le staff.');
        return;
      }
      const t = data as Template;
      const scale = (t.questions || []).filter((q) => q.labels && !q.computed);
      if (!scale.length) {
        setLoadErr('Le questionnaire Hooper n’est pas configuré correctement.');
        return;
      }
      const init: Record<string, number> = {};
      scale.forEach((q) => {
        init[q.key] = q.min ?? 1;
      });
      setAnswers(init);
      setTpl(t);
    })();
  }, []);

  if (loadErr) {
    return (
      <div className="flow">
        <div className="flowTop">
          <button onClick={onClose} className="iconBtn">
            <ChevronLeft />
          </button>
        </div>
        <div className="flowContent">
          <p className="eyebrow">INDICE DE HOOPER</p>
          <h2>Indisponible</h2>
          <p>{loadErr}</p>
        </div>
      </div>
    );
  }

  if (!tpl) {
    return (
      <div className="flow">
        <div className="flowTop">
          <button onClick={onClose} className="iconBtn">
            <ChevronLeft />
          </button>
        </div>
        <div className="flowContent">
          <p className="eyebrow">INDICE DE HOOPER · AU RÉVEIL</p>
          <h2>Chargement…</h2>
        </div>
      </div>
    );
  }

  const questions = (tpl.questions || []).filter((q) => q.labels && !q.computed);
  const q = questions[step];
  const last = step === questions.length - 1;
  const total = questions.reduce((s, x) => s + (answers[x.key] ?? 0), 0);
  const maxTotal = questions.reduce((s, x) => s + (x.max ?? 7), 0);
  const min = q.min ?? 1;
  const max = q.max ?? 7;
  const opts: number[] = [];
  for (let n = min; n <= max; n++) opts.push(n);
  const labelFor = (n: number) => q.labels?.[String(n)] ?? String(n);

  async function save() {
    setSaving(true);
    setMsg('');
    // Passe toujours par la file offline : la réponse est enregistrée sur l'appareil
    // puis synchronisée (immédiatement si le réseau est là), sans jamais de doublon.
    await enqueue('hooper', {
      organization_id: player.organization_id,
      player_id: player.id,
      template_id: tpl!.id,
      template_version: tpl!.version,
      answers: {
        ...answers,
        hooper_total: total,
        unusual_symptom: unusualSymptom,
        comment: comment || null,
      },
      submitted_at: new Date().toISOString(),
    });
    setSaving(false);
    onSaved();
  }

  return (
    <div className="flow">
      <div className="flowTop">
        <button onClick={onClose} className="iconBtn">
          <ChevronLeft />
        </button>
        <div className="progress">
          <span style={{ width: `${((step + 1) / questions.length) * 100}%` }} />
        </div>
        <small>
          {step + 1}/{questions.length}
        </small>
      </div>
      <div className="flowContent">
        <p className="eyebrow">INDICE DE HOOPER · AU RÉVEIL</p>
        <h2>{q.label}</h2>
        <div style={{ display: 'grid', gap: 8, margin: '22px 0' }}>
          {opts.map((n) => (
            <button
              key={n}
              onClick={() => setAnswers({ ...answers, [q.key]: n })}
              style={{
                border: answers[q.key] === n ? '2px solid #E31E24' : '1px solid #D4D4D8',
                borderRadius: 12,
                padding: '13px 14px',
                display: 'flex',
                gap: 12,
                alignItems: 'center',
                background: answers[q.key] === n ? '#18181B' : '#fff',
                color: answers[q.key] === n ? '#fff' : '#111',
                fontWeight: 700,
                textAlign: 'left',
              }}
            >
              <strong style={{ width: 24 }}>{n}</strong>
              <span>{labelFor(n)}</span>
            </button>
          ))}
        </div>
        {last && (
          <>
            <div className="loadBox">
              <span>SCORE HOOPER</span>
              <strong>
                {total} / {maxTotal}
              </strong>
              <small>
                Un score élevé ou inhabituel déclenche uniquement une revue humaine du contexte.
              </small>
            </div>
            <button
              onClick={() => setUnusualSymptom(!unusualSymptom)}
              style={{
                border: unusualSymptom ? '2px solid #E31E24' : '1px solid #D4D4D8',
                borderRadius: 12,
                padding: '12px 14px',
                width: '100%',
                boxSizing: 'border-box',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: unusualSymptom ? '#FEF2F2' : '#fff',
                color: '#111',
                fontWeight: 700,
                margin: '10px 0',
              }}
            >
              <span>Symptôme inhabituel ? (maladie, gêne, perte de fonction)</span>
              <span>{unusualSymptom ? 'Oui' : 'Non'}</span>
            </button>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Commentaire facultatif"
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </>
        )}
        {msg && <p className="error">{msg}</p>}
        <button
          className="primary wide"
          onClick={() => (last ? save() : setStep(step + 1))}
          disabled={saving || answers[q.key] == null}
        >
          {last ? (saving ? 'Enregistrement…' : 'Terminer') : 'Continuer'}
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
