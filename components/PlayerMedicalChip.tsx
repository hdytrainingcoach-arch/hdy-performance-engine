'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { AVAILABILITY_COLOR, AVAILABILITY_LABEL } from '@/lib/medical';

type Row = Record<string, any>;

/** Statut fonctionnel médical PARTAGÉ — jamais le diagnostic. */
export default function PlayerMedicalChip({ playerId }: { playerId: string }) {
  const [st, setSt] = useState<Row | null | undefined>(undefined);

  useEffect(() => {
    if (!playerId) return;
    supabase
      .from('player_medical_status')
      .select('availability,shared_restrictions,expected_return')
      .eq('player_id', playerId)
      .maybeSingle()
      .then(({ data }) => setSt(data ?? null));
  }, [playerId]);

  if (st === undefined || st === null || st.availability === 'full') return null;
  const c = AVAILABILITY_COLOR[st.availability] ?? AVAILABILITY_COLOR.full;

  return (
    <section
      style={{
        maxWidth: 1280,
        margin: '0 auto 14px',
        border: '1px solid #3a2c5a',
        background: '#1a1530',
        borderRadius: 14,
        padding: '12px 14px',
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        flexWrap: 'wrap',
      }}
    >
      <span style={{ borderRadius: 999, padding: '5px 11px', fontWeight: 900, fontSize: 12, background: c.bg, color: c.fg }}>
        STATUT MÉDICAL · {AVAILABILITY_LABEL[st.availability]}
      </span>
      {st.shared_restrictions && <span style={{ fontSize: 13, color: '#d4d4d8' }}>{st.shared_restrictions}</span>}
      {st.expected_return && (
        <span style={{ fontSize: 12, color: '#a1a1aa', marginLeft: 'auto' }}>
          Retour prévu {new Date(st.expected_return).toLocaleDateString('fr-FR')}
        </span>
      )}
      <span style={{ width: '100%', fontSize: 11, color: '#8a8a9a' }}>
        Statut communiqué par le staff médical. Le diagnostic détaillé reste confidentiel.
      </span>
    </section>
  );
}
