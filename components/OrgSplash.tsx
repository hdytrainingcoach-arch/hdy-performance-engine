'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const DIAMBARS='d3136b7f-ef28-43e8-af53-30fa6de70c62';
const V='20260906-ios5';
type Brand='diambars'|'hdy'|null;

export default function OrgSplash(){
  const [brand,setBrand]=useState<Brand>(null);
  const [visible,setVisible]=useState(false);

  useEffect(()=>{
    const path=window.location.pathname;
    if(path.startsWith('/join/')||path.startsWith('/diambars')||path.startsWith('/hdy')) return;

    let cancelled=false;
    let timer:ReturnType<typeof setTimeout>|undefined;

    async function resolveBrand(showSplash=true){
      let next:Brand=null;
      const {data:{session}}=await supabase.auth.getSession();
      if(session){
        const {data:profile}=await supabase.from('profiles').select('is_super_admin').eq('user_id',session.user.id).maybeSingle();
        if(profile?.is_super_admin){
          next='hdy';
        }else{
          const {data:members}=await supabase.from('memberships').select('organization_id,active').eq('user_id',session.user.id);
          if((members||[]).some(m=>m.organization_id===DIAMBARS&&m.active!==false)){
            next='diambars';
          }else{
            const {data:player}=await supabase.from('players').select('organization_id').eq('user_id',session.user.id).maybeSingle();
            next=player?.organization_id===DIAMBARS?'diambars':'hdy';
          }
        }
      }else{
        next='hdy';
      }

      if(cancelled||!next)return;
      document.documentElement.dataset.brand=next;
      setBrand(next);
      if(showSplash){
        setVisible(true);
        if(timer)clearTimeout(timer);
        timer=setTimeout(()=>setVisible(false),1500);
      }
    }

    resolveBrand(true);
    const {data:{subscription}}=supabase.auth.onAuthStateChange(()=>{setTimeout(()=>resolveBrand(true),0)});
    return()=>{cancelled=true;if(timer)clearTimeout(timer);subscription.unsubscribe()};
  },[]);

  if(!visible||!brand)return null;
  const club=brand==='diambars';
  const splash=club?`/pwa/diambars-splash.webp?v=${V}`:`/pwa/hdy-splash.webp?v=${V}`;
  const icon=club?`/pwa/diambars-icon-512.png?v=${V}`:`/pwa/hdy-icon-512.png?v=${V}`;

  return <div aria-label={club?'Ouverture Diambars FC':'Ouverture HDY Performance Engine'} style={{position:'fixed',inset:0,zIndex:20000,overflow:'hidden',background:club?'radial-gradient(circle at 50% 42%,rgba(215,25,32,.14),transparent 34%),linear-gradient(145deg,#050505,#0D0D0E 60%,#150607)':'linear-gradient(145deg,#050505,#101012 60%,#030303)',color:'#fff'}}>
    <div aria-hidden='true' style={{position:'absolute',inset:0,backgroundImage:`url('${splash}')`,backgroundSize:'contain',backgroundPosition:'center',backgroundRepeat:'no-repeat'}}/>
    <div style={{position:'absolute',inset:0,display:'grid',placeItems:'center',padding:28,textAlign:'center'}}>
      <div style={{display:'grid',placeItems:'center',gap:12}}>
        <div style={{width:'min(48vw,230px)',aspectRatio:'1',borderRadius:36,backgroundImage:`url('${icon}')`,backgroundSize:'cover',backgroundPosition:'center',backgroundRepeat:'no-repeat',backgroundColor:'#0A0A0A'}}/>
        <strong style={{fontSize:club?36:28,letterSpacing:-1}}>{club?'DIAMBARS FC':'HDY PERFORMANCE ENGINE'}</strong>
        <span style={{color:'#A1A1AA',fontSize:13}}>{club?'Performance · Monitoring · Médical · Suivi joueur':'Monitoring · Performance · Data'}</span>
      </div>
    </div>
  </div>
}
