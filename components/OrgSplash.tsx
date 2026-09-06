'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const DIAMBARS='d3136b7f-ef28-43e8-af53-30fa6de70c62';
const V='20260906-ios3';
type Brand='diambars'|'hdy'|null;

export default function OrgSplash(){
  const [brand,setBrand]=useState<Brand>(null);
  const [visible,setVisible]=useState(false);
  const [failed,setFailed]=useState(false);

  useEffect(()=>{
    const path=window.location.pathname;
    if(path.startsWith('/join/')) return;

    let cancelled=false;
    let timer:ReturnType<typeof setTimeout>|undefined;

    async function resolveBrand(showSplash=true){
      let next:Brand=path.startsWith('/diambars')?'diambars':path.startsWith('/hdy')?'hdy':null;

      if(!next){
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
      }

      if(cancelled||!next)return;
      document.documentElement.dataset.brand=next;
      setBrand(next);
      setFailed(false);
      if(showSplash){
        setVisible(true);
        if(timer)clearTimeout(timer);
        timer=setTimeout(()=>setVisible(false),1700);
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

  return <div aria-label={club?'Ouverture Diambars FC':'Ouverture HDY Performance Engine'} style={{position:'fixed',inset:0,zIndex:20000,overflow:'hidden',background:'#030303',display:'grid',placeItems:'center'}}>
    {failed?<div style={{display:'grid',placeItems:'center',gap:14,textAlign:'center',padding:28,color:'#fff'}}>
      <img src={icon} alt='' style={{width:'min(48vw,230px)',borderRadius:36,display:'block'}}/>
      <strong style={{fontSize:club?36:28,letterSpacing:-1}}>{club?'DIAMBARS FC':'HDY PERFORMANCE ENGINE'}</strong>
      <span style={{color:'#A1A1AA',fontSize:13}}>{club?'Performance · Monitoring · Médical · Suivi joueur':'Monitoring · Performance · Data'}</span>
    </div>:<img src={splash} alt={club?'Diambars FC — Performance, Monitoring, Médical, Suivi joueur':'HDY Performance Engine — Monitoring, Performance, Data'} onError={()=>setFailed(true)} style={{width:'100%',height:'100%',objectFit:'contain',display:'block',background:'#030303'}}/>}
  </div>
}
