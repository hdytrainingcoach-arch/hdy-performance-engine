'use client';

import { FormEvent, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { checkPassword } from '@/lib/password';

const PRIMARY_ADMIN_EMAIL = 'hdy.training.coach@gmail.com';

export default function AdminSetupPage() {
  const [email] = useState(PRIMARY_ADMIN_EMAIL);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function createAccess(e: FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    const pwChk = checkPassword(password);
    if (!pwChk.ok) {
      setError(pwChk.message);
      return;
    }
    if (password !== confirm) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }
    setLoading(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: 'Frédéric Hardy', primary_admin: true },
        emailRedirectTo: `${window.location.origin}/`,
      },
    });
    setLoading(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    if (data.session) {
      setMessage('Accès administrateur principal activé. Retourne à l’accueil pour ouvrir le dashboard.');
    } else {
      setMessage('Compte créé. Confirme maintenant ton adresse email puis reconnecte-toi sur HDY Performance Engine.');
    }
  }

  return (
    <main style={{minHeight:'100vh',display:'grid',placeItems:'center',background:'#f5f5f5',padding:24,fontFamily:'Arial, sans-serif'}}>
      <section style={{width:'100%',maxWidth:520,background:'#fff',border:'1px solid #e5e7eb',borderRadius:22,padding:28,boxShadow:'0 20px 60px rgba(0,0,0,.08)'}}>
        <div style={{display:'inline-flex',background:'#111',color:'#fff',fontWeight:900,padding:'8px 11px',borderRadius:8,marginBottom:18}}>HDY</div>
        <p style={{fontSize:12,fontWeight:800,letterSpacing:1.5,color:'#D71920'}}>CONFIGURATION SÉCURISÉE</p>
        <h1 style={{fontSize:30,margin:'8px 0'}}>Administrateur principal</h1>
        <p style={{color:'#6b7280',lineHeight:1.5}}>Crée ton accès personnel. Ce compte reçoit les droits super-administrateur et peut naviguer dans les paramètres et données autorisées de HDY Performance Engine.</p>
        <form onSubmit={createAccess} style={{display:'grid',gap:14,marginTop:24}}>
          <label style={{display:'grid',gap:7,fontWeight:700}}>Email
            <input value={email} readOnly style={{padding:14,border:'1px solid #d1d5db',borderRadius:10,background:'#f9fafb'}} />
          </label>
          <label style={{display:'grid',gap:7,fontWeight:700}}>Choisir un mot de passe
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} minLength={10} required style={{padding:14,border:'1px solid #d1d5db',borderRadius:10}} />
          </label>
          <label style={{display:'grid',gap:7,fontWeight:700}}>Confirmer le mot de passe
            <input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} minLength={10} required style={{padding:14,border:'1px solid #d1d5db',borderRadius:10}} />
          </label>
          {error && <p style={{color:'#b91c1c',background:'#fee2e2',padding:12,borderRadius:10}}>{error}</p>}
          {message && <p style={{color:'#166534',background:'#dcfce7',padding:12,borderRadius:10}}>{message}</p>}
          <button disabled={loading} style={{marginTop:4,padding:15,border:0,borderRadius:10,background:'#111',color:'#fff',fontWeight:800,cursor:'pointer'}}>
            {loading ? 'Création…' : 'Créer mon accès administrateur'}
          </button>
        </form>
        <p style={{fontSize:12,color:'#6b7280',marginTop:18}}>Cette page est réservée à l’adresse administrateur principale configurée dans le backend.</p>
      </section>
    </main>
  );
}
