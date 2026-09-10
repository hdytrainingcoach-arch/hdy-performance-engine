'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, RefreshCw, UploadCloud, TriangleAlert } from 'lucide-react';
import { onQueueChange, queueCounts, retryErrors, startOfflineSync } from '@/lib/offline-queue';

/** Bandeau « à synchroniser / synchronisé / erreur » de l'espace joueur (CA-13). */
export default function SyncStatus() {
  const [c, setC] = useState({ pending: 0, error: 0, synced: 0 });
  const [online, setOnline] = useState(true);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => { queueCounts().then(setC); }, []);

  useEffect(() => {
    setOnline(navigator.onLine);
    const stop = startOfflineSync();
    const off = onQueueChange(refresh);
    const on = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', down);
    refresh();
    return () => { stop(); off(); window.removeEventListener('online', on); window.removeEventListener('offline', down); };
  }, [refresh]);

  // Rien à montrer : en ligne, tout synchronisé
  if (online && c.pending === 0 && c.error === 0) return null;

  const retry = async () => { setBusy(true); await retryErrors(); setBusy(false); };

  let tone = '#a1a1aa', bg = '#1b1b1f', border = '#2b2b31', Icon = UploadCloud, text = '';
  if (c.error > 0) {
    tone = '#ff8a8f'; bg = '#2a1416'; border = '#4a2327'; Icon = TriangleAlert;
    text = `${c.error} réponse${c.error > 1 ? 's' : ''} non envoyée${c.error > 1 ? 's' : ''}`;
  } else if (!online && c.pending > 0) {
    tone = '#f5c96b'; bg = '#2a2212'; border = '#4a3a1a'; Icon = UploadCloud;
    text = `${c.pending} réponse${c.pending > 1 ? 's' : ''} en attente de réseau`;
  } else if (c.pending > 0) {
    tone = '#8ecbff'; bg = '#14202a'; Icon = RefreshCw;
    text = `Envoi de ${c.pending} réponse${c.pending > 1 ? 's' : ''}…`;
  } else if (!online) {
    Icon = Check; text = 'Hors ligne — tes réponses sont enregistrées sur l’appareil';
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: bg, border: `1px solid ${border}`, color: tone, borderRadius: 12, padding: '10px 12px', fontSize: 13, fontWeight: 700, margin: '10px 0' }}>
      <Icon size={16} />
      <span style={{ flex: 1 }}>{text}</span>
      {c.error > 0 && (
        <button onClick={retry} disabled={busy} style={{ border: `1px solid ${tone}`, background: 'transparent', color: tone, borderRadius: 8, padding: '5px 10px', fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>
          {busy ? '…' : 'Réessayer'}
        </button>
      )}
    </div>
  );
}
