'use client';

import { useRef, useState } from 'react';
import { detectBodyCenter, getPoseDetector } from '@/lib/pose-tracker';
import { findAllCrossings } from '@/lib/sprint-track';

export default function CodGateTracker({ videoUrl, onDone }: { videoUrl: string; onDone: (crossings: number[]) => void }) {
 const videoRef = useRef<HTMLVideoElement | null>(null);
 const [gate, setGate] = useState(0.5);
 const [dragging, setDragging] = useState(false);
 const [fps, setFps] = useState(15);
 const [status, setStatus] = useState<'idle' | 'loading_model' | 'scanning' | 'done' | 'error'>('idle');
 const [progress, setProgress] = useState(0);
 const [error, setError] = useState('');

 function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
  if (!dragging) return;
  const rect = e.currentTarget.getBoundingClientRect();
  setGate(Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)));
 }

 function seekTo(v: HTMLVideoElement, t: number) {
  return new Promise<void>(resolve => {
   const handler = () => { v.removeEventListener('seeked', handler); resolve(); };
   v.addEventListener('seeked', handler);
   v.currentTime = Math.min(t, v.duration || t);
  });
 }

 async function analyze() {
  const v = videoRef.current;
  if (!v) return;
  setError(''); setStatus('loading_model'); setProgress(0);
  try {
   await getPoseDetector();
   setStatus('scanning');
   const duration = v.duration || 0;
   const step = 1 / fps;
   const series: { t: number; d: number }[] = [];
   for (let t = 0; t <= duration; t += step) {
    await seekTo(v, t);
    const point = await detectBodyCenter(v);
    if (point && point.score > 0.3) series.push({ t, d: point.x });
    setProgress(Math.min(100, Math.round((t / duration) * 100)));
   }
   if (series.length < 4) { setStatus('error'); setError('Suivi insuffisant. Vérifie l’éclairage et le cadrage, ou marque manuellement.'); return; }
   const gatePixel = gate * v.videoWidth;
   const crossings = findAllCrossings(series, gatePixel, 0.3);
   if (crossings.length < 2) { setStatus('error'); setError(`Un seul passage détecté sur la ligne (${crossings.length}). Vérifie que la ligne est bien positionnée sur le point de chronométrage.`); return; }
   setStatus('done');
   onDone(crossings);
  } catch (e) {
   setStatus('error'); setError((e as Error).message || 'Erreur pendant l’analyse.');
  }
 }

 return <div style={S.wrap}>
  <p style={S.hint}>Place la ligne sur le point de chronométrage (ligne des 5 m). Le joueur la franchit une fois à l’aller, une fois au retour après le virage — l’écart entre les deux est le temps du test.</p>
  <div style={S.previewWrap} onPointerMove={onPointerMove} onPointerUp={() => setDragging(false)}>
   <video ref={videoRef} src={videoUrl} muted playsInline style={S.video} onLoadedMetadata={e => { e.currentTarget.currentTime = Math.min(0.1, e.currentTarget.duration) }} />
   <div style={{ ...S.markerLine, left: `${gate * 100}%` }} onPointerDown={() => setDragging(true)} />
  </div>
  <label>Échantillonnage (im/s analysées)<input type='number' value={fps} onChange={e => setFps(Number(e.target.value))} style={S.input} /></label>
  <button onClick={analyze} style={S.primary} disabled={status === 'scanning' || status === 'loading_model'}>
   {status === 'loading_model' ? 'Chargement du modèle…' : status === 'scanning' ? `Analyse… ${progress}%` : 'Analyser (suivi automatique)'}
  </button>
  {error && <div style={S.notice}>{error}</div>}
 </div>;
}

const S: Record<string, React.CSSProperties> = {
 wrap: { display: 'grid', gap: 10 },
 hint: { color: '#A1A1AA', fontSize: 13, lineHeight: 1.5, margin: 0 },
 previewWrap: { position: 'relative', touchAction: 'none' },
 video: { width: '100%', borderRadius: 12, background: '#000', display: 'block' },
 markerLine: { position: 'absolute', top: 0, bottom: 0, width: 14, marginLeft: -7, cursor: 'ew-resize', opacity: 0.6, borderRadius: 4, background: '#E31E24' },
 input: { width: '100%', height: 42, background: '#1B1B1F', color: '#fff', border: '1px solid #2B2B31', borderRadius: 10, padding: '0 10px', marginTop: 6, boxSizing: 'border-box' },
 primary: { border: 0, borderRadius: 10, padding: '12px 15px', fontWeight: 850, color: '#fff', background: '#E31E24', cursor: 'pointer' },
 notice: { background: '#141416', border: '1px solid #2B2B31', borderRadius: 12, padding: 12, fontSize: 13, lineHeight: 1.6, color: '#D4D4D8' },
};
