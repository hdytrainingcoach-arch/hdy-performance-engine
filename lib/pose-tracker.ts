// Suivi de corps par pose-detection (MoveNet, TensorFlow.js) — utilisé pour
// le suivi automatique de sprint (position → distance calibrée → vitesse),
// dans l'esprit de Metric Sprint. Tourne entièrement côté client.
'use client';

// Import dynamique : TensorFlow.js + le modèle de pose (~400 Ko) ne doivent
// être téléchargés que si le préparateur utilise réellement le suivi
// automatique, pas à chaque chargement de la page Sprint.
import type * as PoseDetectionNS from '@tensorflow-models/pose-detection';

let detectorPromise: Promise<PoseDetectionNS.PoseDetector> | null = null;

export async function getPoseDetector(): Promise<PoseDetectionNS.PoseDetector> {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      const [tf, poseDetection] = await Promise.all([import('@tensorflow/tfjs'), import('@tensorflow-models/pose-detection')]);
      await tf.setBackend('webgl');
      await tf.ready();
      return poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
      });
    })();
  }
  return detectorPromise;
}

export type PixelPoint = { x: number; y: number; score: number };

// Centre approximatif du bassin (moyenne hanche gauche/droite), avec repli
// sur le centre de masse des points fiables si les hanches ne sont pas
// détectées avec confiance (ex : coureur de dos ou de profil serré).
export async function detectBodyCenter(video: HTMLVideoElement): Promise<PixelPoint | null> {
  const detector = await getPoseDetector();
  const poses = await detector.estimatePoses(video, { flipHorizontal: false });
  const kp = poses[0]?.keypoints;
  if (!kp || !kp.length) return null;

  const byName = (name: string) => kp.find(k => k.name === name);
  const lHip = byName('left_hip'), rHip = byName('right_hip');
  const minScore = 0.3;
  if (lHip && rHip && (lHip.score ?? 0) > minScore && (rHip.score ?? 0) > minScore) {
    return { x: (lHip.x + rHip.x) / 2, y: (lHip.y + rHip.y) / 2, score: Math.min(lHip.score ?? 0, rHip.score ?? 0) };
  }

  const confident = kp.filter(k => (k.score ?? 0) > minScore);
  if (!confident.length) return null;
  const x = confident.reduce((a, k) => a + k.x, 0) / confident.length;
  const y = confident.reduce((a, k) => a + k.y, 0) / confident.length;
  const score = confident.reduce((a, k) => a + (k.score ?? 0), 0) / confident.length;
  return { x, y, score };
}
