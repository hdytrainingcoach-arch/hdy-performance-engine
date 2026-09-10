'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

// ─────────────────────────────────────────────────────────────────────────────
// Contexte multi-organisation (white-label).
// Charge l'arbre d'organisations + les équipes visibles depuis Supabase (RLS).
// Plus aucun identifiant Diambars / Elite / équipe codé en dur : un nouvel
// environnement client = une ligne dans `organizations`, zéro code.
// ─────────────────────────────────────────────────────────────────────────────

export type Branding = {
  label?: string;
  theme?: string;
  logo_key?: string;
  primary?: string;
  secondary?: string;
  background?: string;
  accent?: string;
  powered_by?: string;
  is_root?: boolean;
};

export type Org = {
  id: string;
  name: string;
  type: string;
  parent_organization_id: string | null;
  branding: Branding;
  active: boolean;
};

export type Team = {
  id: string;
  name: string;
  category: string | null;
  season: string | null;
  organization_id: string;
};

export type BrandKind = 'diambars' | 'hdy' | 'elite';

export function brandKindOf(org: Org | null | undefined): BrandKind {
  const t = `${org?.branding?.theme ?? ''} ${org?.branding?.logo_key ?? ''}`.toLowerCase();
  if (t.includes('diambars')) return 'diambars';
  if (t.includes('elite')) return 'elite';
  return 'hdy';
}

type Ctx = {
  loading: boolean;
  root: Org | null;
  environments: Org[];
  allOrgs: Org[];
  teams: Team[];
  teamsFor: (orgId: string) => Team[];
  currentEnvId: string;
  currentEnv: Org | null;
  setCurrentEnvId: (id: string) => void;
  currentTeamId: string;
  setCurrentTeamId: (id: string) => void;
  usesTeams: (orgId: string) => boolean;
  refresh: () => void;
};

const OrgContext = createContext<Ctx | null>(null);
const LS_ENV = 'hdy-current-env';

export function OrgProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [allOrgs, setAllOrgs] = useState<Org[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [currentEnvId, setEnvState] = useState('');
  const [currentTeamId, setCurrentTeamId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: o }, { data: t }] = await Promise.all([
      supabase.from('organizations').select('id,name,type,parent_organization_id,branding,active'),
      supabase.from('teams').select('id,name,category,season,organization_id').eq('active', true).order('name'),
    ]);
    setAllOrgs((o ?? []) as Org[]);
    setTeams((t ?? []) as Team[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => load());
    return () => subscription.unsubscribe();
  }, [load]);

  const root = useMemo(() => allOrgs.find((x) => !x.parent_organization_id) ?? null, [allOrgs]);

  const environments = useMemo(() => {
    const children = allOrgs.filter(
      (x) => x.parent_organization_id && (!root || x.parent_organization_id === root.id) && x.active,
    );
    if (children.length) return children.sort((a, b) => a.name.localeCompare(b.name));
    return root ? [root] : [];
  }, [allOrgs, root]);

  // Sélection de l'environnement courant : mémorisé, sinon le premier.
  useEffect(() => {
    if (!environments.length) return;
    if (currentEnvId && environments.some((e) => e.id === currentEnvId)) return;
    let stored = '';
    try {
      stored = localStorage.getItem(LS_ENV) ?? '';
    } catch {
      /* ignore */
    }
    setEnvState(environments.find((e) => e.id === stored)?.id ?? environments[0].id);
  }, [environments, currentEnvId]);

  const setCurrentEnvId = useCallback((id: string) => {
    setEnvState(id);
    setCurrentTeamId('');
    try {
      localStorage.setItem(LS_ENV, id);
    } catch {
      /* ignore */
    }
  }, []);

  const teamsFor = useCallback((orgId: string) => teams.filter((t) => t.organization_id === orgId), [teams]);
  const usesTeams = useCallback((orgId: string) => teams.some((t) => t.organization_id === orgId), [teams]);

  const currentEnv = useMemo(
    () => environments.find((e) => e.id === currentEnvId) ?? null,
    [environments, currentEnvId],
  );

  const value: Ctx = {
    loading,
    root,
    environments,
    allOrgs,
    teams,
    teamsFor,
    currentEnvId,
    currentEnv,
    setCurrentEnvId,
    currentTeamId,
    setCurrentTeamId,
    usesTeams,
    refresh: load,
  };

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrg(): Ctx {
  const c = useContext(OrgContext);
  if (!c) throw new Error('useOrg doit être utilisé dans un <OrgProvider>');
  return c;
}
