import { beforeEach, describe, expect, it, vi } from 'vitest';

// --- Mock du client Supabase : capture les insertions, simule erreurs et doublons ---
const state = {
  inserted: [] as { table: string; row: Record<string, unknown> }[],
  failNext: 0,
  seenUids: new Set<string>(),
};

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getSession: async () => ({ data: { session: { access_token: 'tok' } } }) },
    from: (table: string) => ({
      insert: async (row: Record<string, unknown>) => {
        if (state.failNext > 0) {
          state.failNext -= 1;
          return { error: { code: 'NETWORK', message: 'réseau indisponible' } };
        }
        const uid = row.client_uid as string;
        if (state.seenUids.has(uid)) {
          return { error: { code: '23505', message: 'duplicate key value violates unique constraint' } };
        }
        state.seenUids.add(uid);
        state.inserted.push({ table, row });
        return { error: null };
      },
    }),
  },
}));

import { enqueue, flush, listItems, queueCounts, retryErrors } from '@/lib/offline-queue';

async function clearQueue() {
  const all = await listItems();
  const req = indexedDB.open('hdy-offline', 1);
  await new Promise<void>((res) => {
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction('queue', 'readwrite');
      const store = tx.objectStore('queue');
      all.forEach((i) => store.delete(i.localId));
      tx.oncomplete = () => { db.close(); res(); };
    };
    req.onerror = () => res();
  });
}

beforeEach(async () => {
  state.inserted = [];
  state.failNext = 0;
  state.seenUids = new Set();
  (globalThis.navigator as { onLine: boolean }).onLine = true;
  await clearQueue();
});

const painPayload = { organization_id: 'o1', player_id: 'p1', zone: 'Genou', intensity: 3 };

describe('file offline — Hooper / RPE / douleur', () => {
  it('enregistre et synchronise une saisie faite en ligne (source online)', async () => {
    await enqueue('pain', { ...painPayload });
    await flush();
    expect(state.inserted).toHaveLength(1);
    expect(state.inserted[0].table).toBe('pain_declarations');
    expect(state.inserted[0].row.source).toBe('online');
    expect(state.inserted[0].row.client_uid).toBeTruthy();
    const c = await queueCounts();
    expect(c.synced).toBe(1);
    expect(c.pending).toBe(0);
  });

  it('CA-13 — une saisie hors ligne survit puis part une seule fois', async () => {
    (globalThis.navigator as { onLine: boolean }).onLine = false;
    await enqueue('pain', { ...painPayload });
    await flush(); // hors ligne : rien ne part
    expect(state.inserted).toHaveLength(0);
    expect((await queueCounts()).pending).toBe(1);

    (globalThis.navigator as { onLine: boolean }).onLine = true;
    await flush();
    await flush(); // reconnexion + rejeu : toujours une seule insertion
    expect(state.inserted).toHaveLength(1);
    expect(state.inserted[0].row.source).toBe('offline');
    expect((await queueCounts()).synced).toBe(1);
  });

  it('CA-13 — rejeu après “app fermée avant confirmation” : pas de doublon', async () => {
    await enqueue('hooper', { organization_id: 'o1', player_id: 'p1', template_id: 't', template_version: 1, answers: {} });
    await flush();
    expect(state.inserted).toHaveLength(1);

    // simule une saisie repassée en 'pending' (statut non persisté avant fermeture)
    const items = await listItems();
    const req = indexedDB.open('hdy-offline', 1);
    await new Promise<void>((res) => {
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction('queue', 'readwrite');
        tx.objectStore('queue').put({ ...items[0], status: 'pending' });
        tx.oncomplete = () => { db.close(); res(); };
      };
    });

    await flush(); // le serveur répond 23505 → traité comme déjà enregistré
    expect(state.inserted).toHaveLength(1);
    expect((await queueCounts()).synced).toBe(1);
  });

  it('une erreur réseau passe la saisie en erreur, retryErrors la renvoie', async () => {
    state.failNext = 1;
    // enqueue tente une synchro immédiate → échoue → saisie en erreur
    await enqueue('rpe', { organization_id: 'o1', session_id: 's1', player_id: 'p1', rpe: 6, actual_duration_min: 70, load_ua: 420 });
    let c = await queueCounts();
    expect(c.error).toBe(1);
    expect(state.inserted).toHaveLength(0);

    await retryErrors();
    c = await queueCounts();
    expect(c.error).toBe(0);
    expect(c.synced).toBe(1);
    expect(state.inserted).toHaveLength(1);
  });

  it('deux saisies distinctes produisent deux lignes', async () => {
    await enqueue('pain', { ...painPayload, zone: 'Cheville' });
    await enqueue('pain', { ...painPayload, zone: 'Genou' });
    await flush();
    expect(state.inserted).toHaveLength(2);
    const uids = state.inserted.map((i) => i.row.client_uid);
    expect(new Set(uids).size).toBe(2);
  });
});
