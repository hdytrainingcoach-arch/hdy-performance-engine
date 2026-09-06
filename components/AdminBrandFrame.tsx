'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const DIAMBARS='d3136b7f-ef28-43e8-af53-30fa6de70c62';
type BrandMode='loading'|'hdy'|'diambars'|'neutral';

export default function AdminBrandFrame({children}:{children:React.ReactNode}){
  const [mode,setMode]=useState<BrandMode>('loading');

  useEffect(()=>{(async()=>{
    const {data:{session}}=await supabase.auth.getSession();
    if(!session){setMode('neutral');return;}
    const {data:profile}=await supabase.from('profiles').select('is_super_admin').eq('user_id',session.user.id).maybeSingle();
    if(profile?.is_super_admin){setMode('hdy');return;}
    const {data:members}=await supabase.from('memberships').select('organization_id,active').eq('user_id',session.user.id);
    if((members||[]).some(m=>m.organization_id===DIAMBARS&&m.active!==false)){setMode('diambars');return;}
    setMode('neutral');
  })()},[]);

  const isDiambars=mode==='diambars';
  const isHDY=mode==='hdy';
  const accent=isDiambars?'#D71920':'#F4F4F5';

  return <div style={{minHeight:'100vh',background:'#09090B'}}>
    <header style={{position:'sticky',top:0,zIndex:9998,height:72,display:'flex',alignItems:'center',justifyContent:'space-between',gap:14,padding:'0 18px',background:'rgba(9,9,11,.97)',backdropFilter:'blur(16px)',borderBottom:`1px solid ${isDiambars?'#4A1719':'#2B2B31'}`,boxSizing:'border-box'}}>
      <div style={{display:'flex',alignItems:'center',gap:12,minWidth:0}}>
        <img src={isDiambars?'/pwa/diambars-icon-192':'/pwa/icon-192'} alt={isDiambars?'Diambars FC':'HDY'} style={{width:isDiambars?52:44,height:isDiambars?52:44,borderRadius:isDiambars?14:12,objectFit:'cover',flex:'0 0 auto',boxShadow:isDiambars?'0 0 22px rgba(215,25,32,.13)':'0 0 18px rgba(255,255,255,.05)'}}/>
        <div style={{display:'grid',gap:2,minWidth:0,color:'#fff'}}>
          <strong style={{fontSize:isDiambars?18:15,letterSpacing:isDiambars?0.2:0.5,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{isDiambars?'DIAMBARS FC':isHDY?'HDY':'ESPACE PERFORMANCE'}</strong>
          <span style={{fontSize:10,color:'#A1A1AA',letterSpacing:0.9,fontWeight:750}}>{isDiambars?'CELLULE PERFORMANCE · STAFF':'PERFORMANCE ENGINE · GLOBAL'}</span>
        </div>
      </div>
      <a href={isDiambars?'/diambars':'/hdy'} style={{display:'inline-flex',alignItems:'center',minHeight:36,padding:'0 12px',borderRadius:10,border:`1px solid ${isDiambars?'#5A2023':'#3F3F46'}`,background:isDiambars?'rgba(215,25,32,.09)':'rgba(255,255,255,.035)',color:accent,textDecoration:'none',fontSize:11,fontWeight:900,whiteSpace:'nowrap'}}>{isDiambars?'Installer Diambars':'Installer HDY'}</a>
    </header>
    {children}
    <footer style={{padding:'16px 20px 22px',textAlign:'center',background:'#09090B',color:isDiambars?'#57575D':'#71717A',fontSize:9,fontWeight:750,letterSpacing:1.2}}>{isDiambars?'POWERED BY HDY PERFORMANCE ENGINE':'HDY PERFORMANCE ENGINE'}</footer>
  </div>
}
