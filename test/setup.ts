import 'fake-indexeddb/auto';

// Environnement navigateur minimal pour les modules 'use client' testés en Node.
const g = globalThis as Record<string, unknown>;

if (typeof g.window === 'undefined') g.window = globalThis;
if (typeof g.navigator === 'undefined') g.navigator = { onLine: true };

const listeners = new Map<string, Set<(e: unknown) => void>>();
if (typeof (g.window as { addEventListener?: unknown }).addEventListener !== 'function') {
  Object.assign(g.window as object, {
    addEventListener: (t: string, cb: (e: unknown) => void) => {
      if (!listeners.has(t)) listeners.set(t, new Set());
      listeners.get(t)!.add(cb);
    },
    removeEventListener: (t: string, cb: (e: unknown) => void) => listeners.get(t)?.delete(cb),
    dispatchEvent: (e: { type: string }) => {
      listeners.get(e.type)?.forEach((cb) => cb(e));
      return true;
    },
  });
}
if (typeof g.CustomEvent === 'undefined') {
  g.CustomEvent = class {
    type: string;
    detail: unknown;
    constructor(type: string, init?: { detail?: unknown }) {
      this.type = type;
      this.detail = init?.detail;
    }
  } as unknown as typeof CustomEvent;
}
if (typeof g.document === 'undefined') {
  g.document = { visibilityState: 'visible', addEventListener() {}, removeEventListener() {} };
}
