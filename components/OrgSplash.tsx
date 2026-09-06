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
      let next:Brand=path.startsWith('/diambars')?'diambars':'hdy';
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
            if(player?.organization_id===DIAMBARS) next='diambars';
          }
        }
      }
      if(cancelled)return;
      setBrand(next);
      setVisible(true);
      timer=setTimeout(()=>setVisible(false),1550);
    })();

    return()=>{cancelled=true;if(timer)clearTimeout(timer)};
  },[]);

  if(!visible||!brand)return null;
  const club=brand==='diambars';

  return <div aria-label={club?'Ouverture Diambars FC':'Ouverture HDY Performance Engine'} style={{position:'fixed',inset:0,zIndex:20000,overflow:'hidden',background:club?'radial-gradient(circle at 50% 35%,#281012 0%,#0B0B0D 42%,#030303 100%)':'radial-gradient(circle at 50% 42%,#191919 0%,#080808 45%,#020202 100%)',color:'#fff',fontFamily:'Inter,system-ui,sans-serif',display:'grid',placeItems:'center'}}>
    <div style={{position:'absolute',inset:0,pointerEvents:'none'}}>
      <div style={{position:'absolute',width:'48vw',height:club?34:52,background:club?'linear-gradient(90deg,#E31E24,#5A0B0E)':'linear-gradient(90deg,#2B2B2B,#0A0A0A)',transform:'rotate(-45deg)',top:'4%',left:'-16%',boxShadow:club?'0 0 30px rgba(227,30,36,.35)':'none'}}/>
      <div style={{position:'absolute',width:'58vw',height:club?32:48,background:club?'linear-gradient(90deg,#5A0B0E,#E31E24)':'linear-gradient(90deg,#0A0A0A,#272727)',transform:'rotate(-45deg)',right:'-20%',bottom:'8%',boxShadow:club?'0 0 30px rgba(227,30,36,.3)':'none'}}/>
      <div style={{position:'absolute',width:'72vw',height:'72vw',maxWidth:620,maxHeight:620,border:'1px solid rgba(255,255,255,.045)',borderRadius:'50%',left:'50%',top:'34%',transform:'translate(-50%,-50%)'}}/>
      <div style={{position:'absolute',width:'58vw',height:'58vw',maxWidth:500,maxHeight:500,border:`1px solid ${club?'rgba(227,30,36,.08)':'rgba(255,255,255,.035)'}`,borderRadius:'50%',left:'50%',top:'34%',transform:'translate(-50%,-50%)'}}/>
      {!club&&<div style={{position:'absolute',left:'-10%',right:'-10%',height:140,bottom:'17%',borderTop:'3px solid rgba(255,255,255,.65)',borderRadius:'50%',filter:'blur(.2px)',boxShadow:'0 -8px 28px rgba(255,255,255,.14)'}}/>}
    </div>

    <div style={{position:'relative',zIndex:2,width:'min(88vw,540px)',textAlign:'center',display:'grid',justifyItems:'center',gap:10,marginTop:club?'-5vh':'-2vh'}}>
      <img src={club?'/pwa/diambars-icon-512':'/pwa/icon-512'} alt={club?'Diambars FC':'HDY'} style={{width:'clamp(148px,31vw,245px)',height:'clamp(148px,31vw,245px)',objectFit:'cover',borderRadius:'clamp(30px,6vw,54px)',filter:club?'drop-shadow(0 16px 34px rgba(227,30,36,.16))':'drop-shadow(0 14px 30px rgba(255,255,255,.08))'}}/>
      <h1 style={{margin:'14px 0 0',fontSize:'clamp(31px,7vw,56px)',lineHeight:.96,letterSpacing:club?'-1.7px':'-1.2px',fontWeight:950}}>{club?'DIAMBARS FC':'HDY PERFORMANCE ENGINE'}</h1>
      <div style={{width:club?150:110,height:2,margin:'5px auto 2px',background:club?'#E31E24':'rgba(255,255,255,.5)',boxShadow:club?'0 0 12px rgba(227,30,36,.9)':'none'}}/>
      <p style={{margin:0,color:'#C5C5C8',fontSize:'clamp(12px,2.8vw,17px)',letterSpacing:club?'.3px':'2px'}}>{club?'Performance · Monitoring · Médical · Suivi joueur':'Monitoring · Performance · Data'}</p>
    </div>

    <div style={{position:'absolute',zIndex:2,left:20,right:20,bottom:'7.5%',textAlign:'center',color:'#71717A',fontSize:club?11:10,letterSpacing:club?.3:4,fontWeight:650}}>
      {club?'Powered by HDY Performance Engine':'A BETTER GAME GLOBALLY'}
    </div>
  </div>
}
