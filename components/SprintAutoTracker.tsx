'use client';

import { useEffect, useRef, useState } from 'react';
import { detectBodyCenter, getPoseDetector } from '@/lib/pose-tracker';
import { toDistanceSeries, smooth, velocityCurve, peakVelocity, computeSplits, type Split } from '@/lib/sprint-track';

export type TrackerResult = { peakVelocityMs: number; splits: Split[]; sampleCount: number };

export default function SprintAutoTracker({ videoUrl, targets, onDone }: { videoUrl: string; targets: number[]; onDone: (r: TrackerResult) => void }) {
 const videoRef = useRef<HTMLVideoElement | null>(null);
 const [markerA, setMarkerA] = useState(0.15), [markerB, setMarkerB] = useState(0.85);
 const [distanceM, setDistanceM] = useState('10');
 const [fps, setFps] = useState(15);
 const [dragging, setDragging] = useState<'A' | 'B' | null>(null);
 const [status, setStatus] = useState<'idle' | 'loading_model' | 'scanning' | 'done' | 'error'>('idle');
 const [progress, setProgress] = useState(0);
 const [result, setResult] = useState<TrackerResult | null>(null);
 const [error, setError] = useState('');

 function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
  if (!dragging) return;
  const rect = e.currentTarget.getBoundingClientRect();
  const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
  if (dragging === 'A') setMarkerA(x); else setMarkerB(x);
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
  const dist = Number(distanceM);
  if (!v || !Number.isFinite(dist) || dist <= 0) { setError('Renseigne la distance réelle entre les deux repères.'); return; }
  if (Math.abs(markerB - markerA) < 0.02) { setError('Écarte davantage les deux repères de calibration.'); return; }
  setError(''); setStatus('loading_model'); setResult(null); setProgress(0);
  try {
   await getPoseDetector(); // charge le modèle (mis en cache ensuite) avant de démarrer le balayage image par image
   setStatus('scanning');
   const duration = v.duration || 0;
   const step = 1 / fps;
   const samples: { t: number; xPixel: number }[] = [];
   for (let t = 0; t <= duration; t += step) {
    await seekTo(v, t);
    const point = await detectBodyCenter(v);
    if (point && point.score > 0.3) samples.push({ t, xPixel: point.x });
    setProgress(Math.min(100, Math.round((t / duration) * 100)));
   }
   if (samples.length < 4) { setStatus('error'); setError('Suivi insuffisant (le coureur n’a pas été détecté assez souvent). Vérifie l’éclairage, le cadrage, ou marque manuellement.'); return; }

   const cal = { xA: markerA * v.videoWidth, xB: markerB * v.videoWidth, distanceM: dist };
   const series = smooth(toDistanceSeries(samples, cal), 5);
   const curve = velocityCurve(series);
   const peak = peakVelocity(curve);
   const splits = computeSplits(series, targets);
   const r = { peakVelocityMs: peak, splits, sampleCount: samples.length };
   setResult(r); setStatus('done');
  } catch (e) {
   setStatus('error'); setError((e as Error).message || 'Erreur pendant l’analyse.');
  }
 }

 return <div style={S.wrap}>
  <p style={S.hint}>Place les deux repères sur des points de référence visibles dans le cadre (plots, lignes au sol…) et indique la distance réelle entre eux. Le suivi tourne dans le navigateur (aucune vidéo envoyée à un serveur).</p>
  <div style={S.previewWrap} onPointerMove={onPointerMove} onPointerUp={() => setDragging(null)}>
   <video ref={videoRef} src={videoUrl} muted playsInline style={S.video} onLoadedMetadata={e => { e.currentTarget.currentTime = Math.min(0.1, e.currentTarget.duration) }} />
   <div style={{ ...S.markerLine, left: `${markerA * 100}%`, background: '#22C55E' }} onPointerDown={() => setDragging('A')} />
   <div style={{ ...S.markerLine, left: `${markerB * 100}%`, background: '#F59E0B' }} onPointerDown={() => setDragging('B')} />
  </div>
  <div style={S.row2}>
   <label>Distance réelle entre repères (m)<input type='number' value={distanceM} onChange={e => setDistanceM(e.target.value)} style={S.input} /></label>
   <label>Échantillonnage (im/s analysées)<input type='number' value={fps} onChange={e => setFps(Number(e.target.value))} style={S.input} /></label>
  </div>
  <button onClick={analyze} style={S.primary} disabled={status === 'scanning' || status === 'loading_model'}>
   {status === 'loading_model' ? 'Chargement du modèle…' : status === 'scanning' ? `Analyse… ${progress}%` : 'Analyser (suivi automatique)'}
  </button>
  {error && <div style={S.notice}>{error}</div>}
  {result && <div style={S.notice}>
   <b>Vitesse de pointe : {result.peakVelocityMs.toFixed(2)} m/s ({(result.peakVelocityMs * 3.6).toFixed(1)} km/h)</b>
   {result.splits.map(s => <div key={s.distanceM}>· {s.distanceM} m : {s.timeS.toFixed(3)} s</div>)}
   <button onClick={() => onDone(result)} style={{ ...S.primary, marginTop: 8 }}>Utiliser ces résultats</button>
  </div>}
 </div>;
}

const S: Record<string, React.CSSProperties> = {
 wrap: { display: 'grid', gap: 10 },
 hint: { color: '#A1A1AA', fontSize: 13, lineHeight: 1.5, margin: 0 },
 previewWrap: { position: 'relative', touchAction: 'none' },
 video: { width: '100%', borderRadius: 12, background: '#000', display: 'block' },
 markerLine: { position: 'absolute', top: 0, bottom: 0, width: 14, marginLeft: -7, cursor: 'ew-resize', opacity: 0.6, borderRadius: 4 },
 row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
 input: { width: '100%', height: 42, background: '#1B1B1F', color: '#fff', border: '1px solid #2B2B31', borderRadius: 10, padding: '0 10px', marginTop: 6, boxSizing: 'border-box' },
 primary: { border: 0, borderRadius: 10, padding: '12px 15px', fontWeight: 850, color: '#fff', background: '#E31E24', cursor: 'pointer' },
 notice: { background: '#141416', border: '1px solid #2B2B31', borderRadius: 12, padding: 12, fontSize: 13, lineHeight: 1.6, color: '#D4D4D8' },
};
