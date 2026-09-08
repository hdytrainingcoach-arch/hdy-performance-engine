'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const DIAMBARS='d3136b7f-ef28-43e8-af53-30fa6de70c62';
const ELITE='5454ad8f-8f2b-4812-9923-ab7d0b1f8748';
const V='20260907-visual-final';
type Brand='diambars'|'hdy'|'elite'|null;

export default function OrgSplash(){
  const [brand,setBrand]=useState<Brand>(null);
  const [visible,setVisible]=useState(false);

  useEffect(()=>{
    const path=window.location.pathname;
    if(path.startsWith('/join/')||path.startsWith('/diambars')||path.startsWith('/hdy')||path.startsWith('/elite')) return;

    let cancelled=false;
    let timer:ReturnType<typeof setTimeout>|undefined;

    async function resolveBrand(showSplash=true){
      const params=new URLSearchParams(window.location.search);
      const requested=params.get('app');
      if(requested==='diambars'||requested==='hdy'||requested==='elite') localStorage.setItem('hdy-app-mode',requested);
      const stored=(requested||localStorage.getItem('hdy-app-mode')) as Brand;
      let next:Brand=stored||null;

      const {data:{session}}=await supabase.auth.getSession();
      if(session){
        const {data:profile}=await supabase.from('profiles').select('is_super_admin').eq('user_id',session.user.id).maybeSingle();
        if(profile?.is_super_admin){
          next=stored||'hdy';
        }else{
          const {data:members}=await supabase.from('memberships').select('organization_id,active').eq('user_id',session.user.id);
          const active=(members||[]).filter(m=>m.active!==false);
          if(active.some(m=>m.organization_id===DIAMBARS)) next='diambars';
          else if(active.some(m=>m.organization_id===ELITE)) next='elite';
          else{
            const {data:player}=await supabase.from('players').select('organization_id').eq('user_id',session.user.id).maybeSingle();
            if(player?.organization_id===DIAMBARS) next='diambars';
            else if(player?.organization_id===ELITE) next='elite';
            else next=stored||'hdy';
          }
        }
      }else next=stored||'hdy';

      if(cancelled||!next)return;
      document.documentElement.dataset.brand=next;
      setBrand(next);
      if(showSplash){
        setVisible(true);
        if(timer)clearTimeout(timer);
        timer=setTimeout(()=>setVisible(false),1250);
      }
    }

    resolveBrand(true);
    const {data:{subscription}}=supabase.auth.onAuthStateChange(()=>{setTimeout(()=>resolveBrand(true),0)});
    return()=>{cancelled=true;if(timer)clearTimeout(timer);subscription.unsubscribe()};
  },[]);

  if(!visible||!brand)return null;
  const club=brand==='diambars';
  const elite=brand==='elite';
  // TODO: diambars-splash.webp et hdy-splash.webp sources corrompues (base64 tronqué) — désactivées ici,
  // fallback propre sur dégradé+icône (comme elite) en attendant un nouvel asset source.
  const splash:string|null=null;
  const icon=club?'/branding/diambars/icon-512.png?v=static-v1':elite?'/branding/elite/icon-512.png?v=static-v1':'/branding/hdy/icon-512.png?v=static-v1';
  const title=club?'DIAMBARS FC':elite?'HDY ELITE':'HDY PERFORMANCE ENGINE';
  const sub=club?'Performance · Monitoring · Médical · Suivi joueur':elite?'Individual Performance · Monitoring · Progression':'Monitoring · Performance · Data';

  return <div aria-label={`Ouverture ${title}`} style={{position:'fixed',inset:0,zIndex:20000,overflow:'hidden',background:club?'radial-gradient(circle at 50% 42%,rgba(215,25,32,.14),transparent 34%),linear-gradient(145deg,#050505,#0D0D0E 60%,#150607)':elite?'radial-gradient(circle at 50% 42%,rgba(255,255,255,.08),transparent 30%),linear-gradient(145deg,#020203,#101012 58%,#030303)':'linear-gradient(145deg,#050505,#101012 60%,#030303)',color:'#fff'}}>
    {splash&&<div aria-hidden='true' style={{position:'absolute',inset:0,backgroundImage:`url('${splash}')`,backgroundSize:'contain',backgroundPosition:'center',backgroundRepeat:'no-repeat',opacity:.88}}/>}
    {elite&&<><div aria-hidden='true' style={{position:'absolute',left:'50%',top:'41%',width:'min(92vw,520px)',aspectRatio:'1',borderRadius:'50%',border:'1px solid rgba(255,255,255,.08)',transform:'translate(-50%,-50%)',boxShadow:'0 0 90px rgba(255,255,255,.04)'}}/><div aria-hidden='true' style={{position:'absolute',left:'-18%',top:'9%',width:'80%',height:1,background:'linear-gradient(90deg,transparent,#777,transparent)',transform:'rotate(-42deg)',opacity:.34}}/></>}
    <div style={{position:'absolute',inset:0,display:'grid',placeItems:'center',padding:28,textAlign:'center'}}>
      <div style={{display:'grid',placeItems:'center',gap:12}}>
        <div style={{width:'min(46vw,220px)',aspectRatio:'1',borderRadius:elite?'50%':36,backgroundImage:`url('${icon}')`,backgroundSize:'cover',backgroundPosition:'center',backgroundRepeat:'no-repeat',backgroundColor:'#0A0A0A',border:elite?'1px solid rgba(255,255,255,.12)':'1px solid rgba(255,255,255,.08)',boxShadow:elite?'0 0 0 8px rgba(255,255,255,.03),0 20px 70px rgba(255,255,255,.08)':club?'0 20px 70px rgba(215,25,32,.18)':'0 20px 70px rgba(255,255,255,.05)'}}/>
        <strong style={{fontSize:club?36:elite?38:28,letterSpacing:elite?-1.5:-1}}>{title}</strong>
        <span style={{color:'#A1A1AA',fontSize:13}}>{sub}</span>
      </div>
    </div>
  </div>
}
