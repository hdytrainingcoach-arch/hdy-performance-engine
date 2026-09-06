'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const DIAMBARS='d3136b7f-ef28-43e8-af53-30fa6de70c62';
type Brand='diambars'|'hdy'|null;

export default function OrgSplash(){
  const [brand,setBrand]=useState<Brand>(null);
  const [visible,setVisible]=useState(false);

  useEffect(()=>{
    const path=window.location.pathname;
    if(path.startsWith('/join/')) return;

    let cancelled=false;
    let timer:ReturnType<typeof setTimeout>|undefined;

    (async()=>{
      // Explicit brand entry points always preview/install the requested organization identity.
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

      if(cancelled)return;
      setBrand(next);
      setVisible(true);
      timer=setTimeout(()=>setVisible(false),1700);
    })();

    return()=>{cancelled=true;if(timer)clearTimeout(timer)};
  },[]);

  if(!visible||!brand)return null;
  const club=brand==='diambars';

  return <div aria-label={club?'Ouverture Diambars FC':'Ouverture HDY Performance Engine'} style={{position:'fixed',inset:0,zIndex:20000,overflow:'hidden',background:'#030303',display:'grid',placeItems:'center'}}>
    <img
      src={club?'/pwa/diambars-splash':'/pwa/hdy-splash'}
      alt={club?'Diambars FC — Performance, Monitoring, Médical, Suivi joueur':'HDY Performance Engine — Monitoring, Performance, Data'}
      style={{width:'100%',height:'100%',objectFit:'contain',display:'block',background:'#030303'}}
    />
  </div>
}
