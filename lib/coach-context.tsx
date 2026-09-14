'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

// ─────────────────────────────────────────────────────────────────────────────
// Contexte HDY Coach — volontairement minimal, contrairement à OrgProvider
// (lib/org-context.tsx) qui gère le multi-organisation blanc-marque de HDY
// Performance Engine. Ici, on résout automatiquement le périmètre (org +
// équipe) du coach connecté depuis ses `memberships`, sans sélecteur
// d'environnement : un coach n'a normalement qu'une ou deux équipes.
// ─────────────────────────────────────────────────────────────────────────────

export type CoachScope = {
  organizationId: string;
  organizationLabel: string;
  teamId: string | null;
  teamName: string | null;
};

type Ctx = {
  loading: boolean;
  authed: boolean;
  allowed: boolean;
  displayName: string;
  scopes: CoachScope[];
  scopeIndex: number;
  setScopeIndex: (i: number) => void;
  scope: CoachScope | null;
  refresh: () => void;
  logout: () => Promise<void>;
};

const CoachContext = createContext<Ctx | null>(null);

export function CoachProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [scopes, setScopes] = useState<CoachScope[]>([]);
  const [scopeIndex, setScopeIndex] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setAuthed(false); setAllowed(false); setScopes([]); setLoading(false);
      return;
    }
    setAuthed(true);
    setDisplayName(session.user.email || '');

    const [{ data: profile }, { data: memberships }] = await Promise.all([
      supabase.from('profiles').select('is_super_admin').eq('user_id', session.user.id).maybeSingle(),
      supabase.from('memberships').select('organization_id,team_id,role').eq('user_id', session.user.id).eq('active', true),
    ]);
    const isSuper = !!profile?.is_super_admin;
    const staff = (memberships || []).filter((m) => m.role !== 'player');

    if (!isSuper && !staff.length) {
      setAllowed(false); setScopes([]); setLoading(false);
      return;
    }
    setAllowed(true);

    let pairs = staff.map((m) => ({ organization_id: m.organization_id as string, team_id: m.team_id as string | null }));
    if (!pairs.length) {
      // Super-admin sans membership direct : on propose la première organisation active.
      const { data: orgs } = await supabase.from('organizations').select('id').eq('active', true).order('name').limit(1);
      if (orgs?.length) pairs = [{ organization_id: orgs[0].id, team_id: null }];
    }

    const orgIds = Array.from(new Set(pairs.map((p) => p.organization_id)));
    const teamIds = Array.from(new Set(pairs.map((p) => p.team_id).filter(Boolean))) as string[];
    const [{ data: orgs }, { data: teams }] = await Promise.all([
      orgIds.length ? supabase.from('organizations').select('id,name,branding').in('id', orgIds) : Promise.resolve({ data: [] as any[] }),
      teamIds.length ? supabase.from('teams').select('id,name').in('id', teamIds) : Promise.resolve({ data: [] as any[] }),
    ]);

    const resolved: CoachScope[] = pairs.map((p) => ({
      organizationId: p.organization_id,
      organizationLabel: orgs?.find((o) => o.id === p.organization_id)?.branding?.label || orgs?.find((o) => o.id === p.organization_id)?.name || 'Organisation',
      teamId: p.team_id,
      teamName: p.team_id ? (teams?.find((t) => t.id === p.team_id)?.name || 'Équipe') : null,
    }));

    setScopes(resolved);
    setScopeIndex(0);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => load());
    return () => subscription.unsubscribe();
  }, [load]);

  const scope = useMemo(() => scopes[scopeIndex] ?? null, [scopes, scopeIndex]);

  async function logout() {
    await supabase.auth.signOut();
  }

  const value: Ctx = { loading, authed, allowed, displayName, scopes, scopeIndex, setScopeIndex, scope, refresh: load, logout };
  return <CoachContext.Provider value={value}>{children}</CoachContext.Provider>;
}

export function useCoach(): Ctx {
  const c = useContext(CoachContext);
  if (!c) throw new Error('useCoach doit être utilisé dans un <CoachProvider>');
  return c;
}
