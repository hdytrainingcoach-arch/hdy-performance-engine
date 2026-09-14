'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useCoach } from '@/lib/coach-context';
import { supabase } from '@/lib/supabase';

const NAV = [
  { href: '/coach', label: 'Aujourd’hui', exact: true },
  { href: '/coach/sessions', label: 'Séances' },
  { href: '/coach/exercises', label: 'Exercices' },
  { href: '/coach/calendar', label: 'Calendrier' },
];

function LoginPanel() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  async function go(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setMsg(error?.message || '');
    setLoading(false);
  }

  return (
    <main style={S.loginShell}>
      <div style={S.loginCard}>
        <p style={S.eyebrow}>ESPACE COACH</p>
        <h1 style={S.loginTitle}>HDY COACH</h1>
        <p style={S.loginSub}>Banque d'exercices, programmation musculation & préparation physique.</p>
        <form onSubmit={go} style={{ display: 'grid', gap: 12, marginTop: 20 }}>
          <label style={S.label}>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={S.input} /></label>
          <label style={S.label}>Mot de passe<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={S.input} /></label>
          {msg && <p style={{ color: '#F87171', fontSize: 13 }}>{msg}</p>}
          <button disabled={loading} style={S.primary}>{loading ? 'Connexion…' : 'Se connecter'}</button>
        </form>
        <a href="/" style={S.backLink}>← Espace joueur / HDY Performance Engine</a>
      </div>
    </main>
  );
}

export default function CoachShell({ children }: { children: React.ReactNode }) {
  const { loading, authed, allowed, displayName, scopes, scopeIndex, setScopeIndex, scope, logout } = useCoach();
  const pathname = usePathname() || '/coach';

  if (loading) return <main style={S.center}><span style={S.loadingText}>CHARGEMENT HDY COACH…</span></main>;
  if (!authed) return <LoginPanel />;
  if (!allowed) {
    return (
      <main style={S.center}>
        <div style={{ textAlign: 'center', maxWidth: 380 }}>
          <p style={S.eyebrow}>HDY COACH</p>
          <h2 style={{ margin: '8px 0' }}>Compte non rattaché à un espace staff</h2>
          <p style={{ color: '#A1A1AA' }}>Ce compte n'a pas de rôle staff actif. Demande un accès à l'administrateur de ton organisation.</p>
          <button onClick={logout} style={{ ...S.primary, marginTop: 16 }}>Se déconnecter</button>
        </div>
      </main>
    );
  }

  return (
    <div style={S.shell}>
      <header style={S.header}>
        <a href="/coach" style={S.brand}><span style={S.brandMark}>HDY</span><span style={S.brandName}>COACH</span></a>
        <nav style={S.nav}>
          {NAV.map((n) => {
            const active = n.exact ? pathname === n.href : pathname.startsWith(n.href);
            return <a key={n.href} href={n.href} style={{ ...S.navLink, ...(active ? S.navLinkActive : {}) }}>{n.label}</a>;
          })}
        </nav>
        <div style={S.headerRight}>
          {scopes.length > 1 && (
            <select value={scopeIndex} onChange={(e) => setScopeIndex(Number(e.target.value))} style={S.scopeSelect}>
              {scopes.map((s, i) => <option key={i} value={i}>{s.teamName ? `${s.organizationLabel} · ${s.teamName}` : s.organizationLabel}</option>)}
            </select>
          )}
          {scope && scopes.length === 1 && <span style={S.scopePill}>{scope.teamName ? `${scope.organizationLabel} · ${scope.teamName}` : scope.organizationLabel}</span>}
          <button onClick={logout} style={S.logoutBtn} title={displayName}>Déconnexion</button>
        </div>
      </header>
      <main style={S.content}>{!scope ? <p style={{ color: '#A1A1AA' }}>Aucun périmètre disponible.</p> : children}</main>
    </div>
  );
}

const ACCENT = '#10B981';
const S: Record<string, React.CSSProperties> = {
  center: { minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#08090A', color: '#FAFAFA', fontFamily: 'Inter,system-ui,sans-serif', padding: 24 },
  loadingText: { fontSize: 11, fontWeight: 900, letterSpacing: 1.8, color: '#71717A' },
  loginShell: { minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#08090A', color: '#FAFAFA', fontFamily: 'Inter,system-ui,sans-serif', padding: 24 },
  loginCard: { width: '100%', maxWidth: 380, background: '#141416', border: '1px solid #24262A', borderRadius: 20, padding: 28 },
  eyebrow: { fontSize: 11, fontWeight: 900, letterSpacing: 1.6, color: ACCENT, margin: 0 },
  loginTitle: { fontSize: 34, letterSpacing: -1, margin: '6px 0 4px' },
  loginSub: { color: '#A1A1AA', fontSize: 14, lineHeight: 1.5, margin: 0 },
  label: { fontSize: 12, color: '#A1A1AA', display: 'grid', gap: 6 },
  input: { width: '100%', height: 44, background: '#1B1B1F', color: '#fff', border: '1px solid #2B2B31', borderRadius: 10, padding: '0 12px', boxSizing: 'border-box', fontSize: 14 },
  primary: { border: 0, borderRadius: 10, padding: '13px 16px', fontWeight: 850, color: '#04120C', background: ACCENT, cursor: 'pointer', fontSize: 14 },
  backLink: { display: 'block', marginTop: 18, color: '#71717A', fontSize: 12, textDecoration: 'none' },
  shell: { minHeight: '100vh', background: '#08090A', color: '#FAFAFA', fontFamily: 'Inter,system-ui,sans-serif' },
  header: { display: 'flex', alignItems: 'center', gap: 20, padding: '14px 24px', borderBottom: '1px solid #1E2023', flexWrap: 'wrap' },
  brand: { display: 'flex', alignItems: 'baseline', gap: 6, textDecoration: 'none', color: '#fff' },
  brandMark: { fontWeight: 900, fontSize: 15, color: ACCENT, letterSpacing: 1 },
  brandName: { fontWeight: 900, fontSize: 15, letterSpacing: 1 },
  nav: { display: 'flex', gap: 4, flexWrap: 'wrap' },
  navLink: { color: '#A1A1AA', textDecoration: 'none', fontSize: 13, fontWeight: 700, padding: '8px 12px', borderRadius: 8 },
  navLinkActive: { color: '#fff', background: '#16181B' },
  headerRight: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 },
  scopeSelect: { height: 36, background: '#16181B', color: '#fff', border: '1px solid #2B2B31', borderRadius: 8, padding: '0 10px', fontSize: 12 },
  scopePill: { fontSize: 12, color: '#A1A1AA', border: '1px solid #2B2B31', borderRadius: 999, padding: '6px 12px' },
  logoutBtn: { border: '1px solid #2B2B31', borderRadius: 8, padding: '8px 12px', fontWeight: 700, color: '#fff', background: 'transparent', cursor: 'pointer', fontSize: 12 },
  content: { padding: '24px', maxWidth: 1100, margin: '0 auto' },
};
