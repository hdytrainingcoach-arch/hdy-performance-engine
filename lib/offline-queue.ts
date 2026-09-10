'use client';

// File d'attente offline persistante (IndexedDB) pour Hooper / RPE / douleur.
// - chaque saisie a un identifiant local unique (localId) rejoué tel quel côté serveur
//   via la colonne client_uid → aucun doublon après reconnexion (index unique partiel) ;
// - reprise automatique au retour du réseau, à l'ouverture de l'app et périodiquement ;
// - statut par saisie : 'pending' | 'synced' | 'error'.
// Aucune dépendance externe.

import { supabase } from '@/lib/supabase';

export type QueueKind = 'hooper' | 'rpe' | 'pain';

export type QueueItem = {
  localId: string;
  kind: QueueKind;
  // payload = colonnes à insérer, SANS client_uid/tz/source (ajoutés au flush)
  payload: Record<string, unknown>;
  createdAt: string; // ISO, heure de saisie côté client
  tz: string;
  capturedOffline: boolean; // réseau absent au moment de la saisie
  status: 'pending' | 'synced' | 'error';
  attempts: number;
  lastError?: string;
  syncedAt?: string;
};

const DB_NAME = 'hdy-offline';
const STORE = 'queue';
const CHANGED_EVENT = 'hdy-queue-changed';

const TABLE: Record<QueueKind, string> = {
  hooper: 'questionnaire_responses',
  rpe: 'session_rpe',
  pain: 'pain_declarations',
};

function hasIDB() {
  return typeof window !== 'undefined' && 'indexedDB' in window;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'localId' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = fn(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        t.oncomplete = () => db.close();
      }),
  );
}

function emitChange() {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(CHANGED_EVENT));
}

export function onQueueChange(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(CHANGED_EVENT, cb);
  return () => window.removeEventListener(CHANGED_EVENT, cb);
}

export async function listItems(): Promise<QueueItem[]> {
  if (!hasIDB()) return [];
  try {
    const all = (await tx<QueueItem[]>('readonly', (s) => s.getAll() as IDBRequest<QueueItem[]>)) || [];
    return all.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  } catch {
    return [];
  }
}

export async function queueCounts(): Promise<{ pending: number; error: number; synced: number }> {
  const items = await listItems();
  return {
    pending: items.filter((i) => i.status === 'pending').length,
    error: items.filter((i) => i.status === 'error').length,
    synced: items.filter((i) => i.status === 'synced').length,
  };
}

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** Ajoute une saisie à la file et déclenche une tentative de synchro immédiate. */
export async function enqueue(kind: QueueKind, payload: Record<string, unknown>): Promise<string> {
  const item: QueueItem = {
    localId: uuid(),
    kind,
    payload,
    createdAt: new Date().toISOString(),
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    capturedOffline: typeof navigator !== 'undefined' && navigator.onLine === false,
    status: 'pending',
    attempts: 0,
  };
  if (hasIDB()) {
    try {
      await tx('readwrite', (s) => s.put(item) as IDBRequest);
      emitChange();
    } catch {
      /* IndexedDB indisponible : on tente quand même l'envoi direct ci-dessous */
    }
  }
  await flush();
  return item.localId;
}

function isDuplicate(err: unknown): boolean {
  const e = err as { code?: string; message?: string } | null;
  return !!e && (e.code === '23505' || /duplicate key|unique constraint/i.test(e.message || ''));
}

async function syncItem(item: QueueItem): Promise<{ ok: boolean; error?: string }> {
  const row = {
    ...item.payload,
    client_uid: item.localId,
    client_recorded_at: item.createdAt,
    tz: item.tz,
    source: item.capturedOffline ? 'offline' : 'online',
  };
  const { error } = await supabase.from(TABLE[item.kind]).insert(row);
  if (!error) return { ok: true };
  if (isDuplicate(error)) return { ok: true }; // déjà enregistré → pas de doublon
  return { ok: false, error: error.message };
}

type FlushResult = { synced: number; failed: number; pending: number };
let running: Promise<FlushResult> | null = null;
let rerun = false;

/** Rejoue toutes les saisies en attente. Sûr à appeler souvent et en parallèle. */
export async function flush(): Promise<FlushResult> {
  if (running) {
    rerun = true;
    return running;
  }
  running = doFlush();
  const res = await running;
  running = null;
  if (rerun) {
    rerun = false;
    return flush();
  }
  return res;
}

async function doFlush(): Promise<FlushResult> {
  if (!hasIDB()) return { synced: 0, failed: 0, pending: 0 };
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { synced: 0, failed: 0, pending: (await queueCounts()).pending };
  }
  let synced = 0;
  let failed = 0;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { synced: 0, failed: 0, pending: (await queueCounts()).pending };

    const items = (await listItems()).filter((i) => i.status !== 'synced');
    for (const item of items) {
      const res = await syncItem(item);
      const next: QueueItem = res.ok
        ? { ...item, status: 'synced', syncedAt: new Date().toISOString(), lastError: undefined }
        : { ...item, status: 'error', attempts: item.attempts + 1, lastError: res.error };
      try {
        await tx('readwrite', (s) => s.put(next) as IDBRequest);
      } catch {
        /* ignore */
      }
      res.ok ? (synced += 1) : (failed += 1);
    }
    if (synced || failed) emitChange();

    // purge des saisies synchronisées de plus de 24 h
    const cutoff = Date.now() - 24 * 3600 * 1000;
    for (const it of await listItems()) {
      if (it.status === 'synced' && it.syncedAt && Date.parse(it.syncedAt) < cutoff) {
        try {
          await tx('readwrite', (s) => s.delete(it.localId) as IDBRequest);
        } catch {
          /* ignore */
        }
      }
    }
  } catch {
    /* la file reste en attente, prochaine tentative au retour réseau */
  }
  return { synced, failed, pending: (await queueCounts()).pending };
}

/** Force un nouvel essai des saisies en erreur. */
export async function retryErrors(): Promise<void> {
  if (!hasIDB()) return;
  for (const it of await listItems()) {
    if (it.status === 'error') {
      try {
        await tx('readwrite', (s) => s.put({ ...it, status: 'pending' }) as IDBRequest);
      } catch {
        /* ignore */
      }
    }
  }
  emitChange();
  await flush();
}

let started = false;

/** À appeler une fois au montage de l'espace joueur. */
export function startOfflineSync(): () => void {
  if (started || typeof window === 'undefined') return () => {};
  started = true;
  const go = () => void flush();
  window.addEventListener('online', go);
  const onVis = () => document.visibilityState === 'visible' && go();
  document.addEventListener('visibilitychange', onVis);
  const timer = window.setInterval(() => navigator.onLine && go(), 30000);
  go();
  return () => {
    window.removeEventListener('online', go);
    document.removeEventListener('visibilitychange', onVis);
    window.clearInterval(timer);
    started = false;
  };
}
