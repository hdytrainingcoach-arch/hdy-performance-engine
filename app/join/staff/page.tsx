'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { checkPassword } from '@/lib/password';

type Invite={invite_id:string;organization_id:string;organization_name:string;team_id:string|null;team_name:string|null;email:string;full_name:string|null;role:string;expires_at:string;used:boolean};

const ROLE_LABEL:Record<string,string>={organization_admin:'Administrateur organisation',module_admin:'Administrateur module',team_admin:'Administrateur équipe',prepa_physique:'Préparateur physique',coach:'Coach',staff_medical:'Staff médical',viewer:'Lecture seule'};

export default function StaffJoinPage(){
  const [token,setToken]=useState('');
  const [invite,setInvite]=useState<Invite|null>(null);
  const [password,setPassword]=useState('');
  const [confirm,setConfirm]=useState('');
  const [loading,setLoading]=useState(true);
  const [msg,setMsg]=useState('');
  const [done,setDone]=useState(false);

  async function claim(t:string){
    const {error}=await supabase.rpc('claim_staff_invite',{p_token:t});
    if(error){setMsg(error.message);return false;}
    setDone(true);
    setTimeout(()=>{window.location.href='/admin/sport'},900);
    return true;
  }

  useEffect(()=>{(async()=>{
    const t=new URLSearchParams(window.location.search).get('token')||'';
    setToken(t);
    if(!t){setMsg('Lien d’invitation invalide.');setLoading(false);return;}
    const {data,error}=await supabase.rpc('validate_staff_invite',{p_token:t});
    if(error||!data?.length){setMsg('Lien invalide, révoqué ou expiré.');setLoading(false);return;}
    const i=data[0] as Invite; setInvite(i);
    const {data:{session}}=await supabase.auth.getSession();
    if(session){await claim(t);}
    setLoading(false);
  })()},[]);

  async function activate(e:React.FormEvent){
    e.preventDefault(); setMsg('');
    if(!invite)return;
    const pwChk=checkPassword(password);
    if(!pwChk.ok){setMsg(pwChk.message);return;}
    if(password!==confirm){setMsg('Les deux mots de passe ne correspondent pas.');return;}
    setLoading(true);
    const redirectTo=`${window.location.origin}/join/staff?token=${encodeURIComponent(token)}`;
    const {data,error}=await supabase.auth.signUp({email:invite.email,password,options:{emailRedirectTo:redirectTo}});
    if(error){
      if(error.message.toLowerCase().includes('already')) setMsg('Un compte existe déjà avec cet e-mail. Connectez-vous à l’application puis rouvrez ce lien d’invitation.');
      else setMsg(error.message);
      setLoading(false);return;
    }
    if(data.session){await claim(token);setLoading(false);return;}
    setMsg('Compte créé. Ouvrez l’e-mail de confirmation reçu puis revenez sur ce lien pour finaliser votre accès staff.');
    setLoading(false);
  }

  if(loading&&!invite)return <main style={s.center}>Vérification du lien…</main>;
  if(done)return <main style={s.center}><section style={s.card}><div style={s.mark}>HDY</div><h1>Accès staff activé</h1><p>Votre compte Diambars est maintenant actif. Ouverture de l’espace Sport & Performance…</p></section></main>;

  return <main style={s.main}><section style={s.card}>
    <div style={s.brand}><div style={s.mark}>HDY</div><div><b>PERFORMANCE</b><span> ENGINE</span></div></div>
    <p style={s.kicker}>DIAMBARS FC · INVITATION STAFF</p>
    <h1 style={s.h1}>Bienvenue {invite?.full_name||''}</h1>
    <p style={s.sub}>Activez votre accès professionnel à HDY Performance Engine pour le suivi des joueurs et du travail de performance.</p>
    {invite&&<div style={s.identity}><small>ACCÈS AUTORISÉ</small><strong>{invite.email}</strong><span>{ROLE_LABEL[invite.role]||invite.role}{invite.team_name?` · ${invite.team_name}`:' · Toutes équipes'}</span></div>}
    {invite&&!invite.used&&<form onSubmit={activate} style={s.form}>
      <label style={s.label}>Créer votre mot de passe<input style={s.input} type='password' value={password} onChange={e=>setPassword(e.target.value)} minLength={10} required/></label>
      <label style={s.label}>Confirmer le mot de passe<input style={s.input} type='password' value={confirm} onChange={e=>setConfirm(e.target.value)} minLength={10} required/></label>
      <button style={s.button} disabled={loading}>{loading?'Activation…':'Activer mon accès staff'}</button>
    </form>}
    {invite?.used&&<p style={s.notice}>Cette invitation a déjà été utilisée. Connectez-vous à HDY Performance Engine avec votre e-mail.</p>}
    {msg&&<p style={s.notice}>{msg}</p>}
    <p style={s.privacy}>Accès nominatif et sécurisé · les permissions sont attribuées par l’administrateur Diambars.</p>
  </section></main>
}

const s:Record<string,React.CSSProperties>={
  main:{minHeight:'100vh',background:'#08080A',display:'grid',placeItems:'center',padding:20,fontFamily:'Inter,system-ui,sans-serif',color:'#fff'},
  center:{minHeight:'100vh',background:'#08080A',display:'grid',placeItems:'center',padding:20,fontFamily:'Inter,system-ui,sans-serif',color:'#fff'},
  card:{width:'100%',maxWidth:500,background:'#121214',border:'1px solid #2A2A2E',borderRadius:22,padding:24,boxSizing:'border-box'},
  brand:{display:'flex',alignItems:'center',gap:10,marginBottom:28},mark:{width:48,height:48,borderRadius:13,display:'grid',placeItems:'center',background:'#E31E24',fontWeight:950,color:'#fff'},
  kicker:{fontSize:11,fontWeight:900,letterSpacing:1.3,color:'#E31E24'},h1:{fontSize:34,lineHeight:1.02,margin:'7px 0 10px'},sub:{color:'#A1A1AA',lineHeight:1.5},
  identity:{display:'grid',gap:5,background:'#19191C',border:'1px solid #2B2B30',padding:14,borderRadius:13,margin:'18px 0'},form:{display:'grid',gap:14},label:{display:'grid',gap:7,fontSize:12,fontWeight:800},
  input:{height:48,borderRadius:11,border:'1px solid #34343A',background:'#0B0B0D',color:'#fff',padding:'0 12px',fontSize:16},button:{height:50,border:0,borderRadius:12,background:'#E31E24',color:'#fff',fontWeight:900,fontSize:15,cursor:'pointer'},
  notice:{background:'#211719',border:'1px solid #4A2327',padding:12,borderRadius:10,color:'#FFD1D3',lineHeight:1.4},privacy:{fontSize:11,color:'#71717A',marginTop:18}
};