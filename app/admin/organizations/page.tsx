'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Player={id:string;organization_id:string;team_id:string|null;display_name:string|null;first_name:string;last_name:string;birth_year:number|null;position:string|null;primary_position:string|null;status:string;height_cm:number|null;weight_kg:number|null};
type Tab='overview'|'players'|'compare'|'tests'|'staff';

const DIAMBARS_ID='d3136b7f-ef28-43e8-af53-30fa6de70c62';
const HDY_ELITE_ID='5454ad8f-8f2b-4812-9923-ab7d0b1f8748';
const ORGS=[
 {id:DIAMBARS_ID,name:'DIAMBARS FC',primary:'#D71920',secondary:'#111111',background:'#FFFFFF'},
 {id:HDY_ELITE_ID,name:'HDY ELITE',primary:'#111111',secondary:'#FFFFFF',background:'#F5F5F5'},
] as const;
const DIAMBARS_TEAMS=[
 {id:'d9bb5390-94cb-461e-b2cd-a326da2cfa3d',name:'PRO A'},
 {id:'44f6976d-f5ef-4dcf-980f-ce3995e99877',name:'U19 - PRO B'},
 {id:'28b38b9f-3de0-419d-8275-b331a074b7f4',name:'U17'},
 {id:'e652df98-4653-416c-b794-3763e38a629d',name:'U15'},
] as const;

export default function ManagementCenter(){
 const [ready,setReady]=useState(false); const [authorized,setAuthorized]=useState(false); const [error,setError]=useState('');
 const [orgId,setOrgId]=useState<string>(DIAMBARS_ID); const [teamId,setTeamId]=useState<string>(DIAMBARS_TEAMS[0].id); const [tab,setTab]=useState<Tab>('overview');
 const [players,setPlayers]=useState<Player[]>([]); const [search,setSearch]=useState(''); const [selected,setSelected]=useState<string[]>([]);

 useEffect(()=>{(async()=>{
   const {data:{session}}=await supabase.auth.getSession(); if(!session){setReady(true);return;}
   const {data:profile,error:profileError}=await supabase.from('profiles').select('is_super_admin').eq('user_id',session.user.id).maybeSingle();
   if(profileError){setError(profileError.message);setReady(true);return;}
   if(!profile?.is_super_admin){setReady(true);return;}
   setAuthorized(true);
   const {data,error:e}=await supabase.from('players').select('id,organization_id,team_id,display_name,first_name,last_name,birth_year,position,primary_position,status,height_cm,weight_kg').eq('active',true);
   if(e)setError(e.message); else setPlayers((data||[]) as Player[]);
   setReady(true);
 })()},[]);

 const org=ORGS.find(o=>o.id===orgId)!; const isDiambars=orgId===DIAMBARS_ID;
 useEffect(()=>{ if(isDiambars&&!DIAMBARS_TEAMS.some(t=>t.id===teamId))setTeamId(DIAMBARS_TEAMS[0].id); if(!isDiambars)setTeamId(''); setSelected([]); },[orgId,isDiambars,teamId]);
 const orgPlayers=players.filter(p=>p.organization_id===orgId);
 const scoped=orgPlayers.filter(p=>!isDiambars||p.team_id===teamId);
 const visible=scoped.filter(p=>`${p.display_name||''} ${p.first_name} ${p.last_name} ${p.position||''}`.toLowerCase().includes(search.toLowerCase()));
 const compared=visible.filter(p=>selected.includes(p.id));
 function toggle(id:string){setSelected(v=>v.includes(id)?v.filter(x=>x!==id):(v.length<4?[...v,id]:v));}

 if(!ready)return <main style={s.center}>Chargement du centre de gestion…</main>;
 if(!authorized)return <main style={s.center}>Accès super-administrateur requis. Reconnecte-toi avec ton compte principal.</main>;

 return <main style={{minHeight:'100vh',background:org.background,color:'#111',fontFamily:'Arial,sans-serif'}}>
  <header style={{...s.header,borderBottomColor:org.primary}}><div><b>HDY Performance Engine</b><small style={{display:'block'}}>Centre de gestion · Administrateur principal</small></div><a href='/' style={s.link}>Dashboard</a></header>
  <section style={s.wrap}>
   <div style={s.selectorPanel}>
    <label style={s.label}>ENVIRONNEMENT
      <select aria-label='Choisir environnement' value={orgId} onChange={e=>setOrgId(e.target.value)} style={{...s.select,borderColor:org.primary}}>
       <option value={DIAMBARS_ID}>DIAMBARS FC</option>
       <option value={HDY_ELITE_ID}>HDY ELITE</option>
      </select>
    </label>
    {isDiambars&&<label style={s.label}>ÉQUIPE DIAMBARS FC
      <select aria-label='Choisir équipe Diambars' value={teamId} onChange={e=>setTeamId(e.target.value)} style={{...s.select,borderColor:'#D71920'}}>
       {DIAMBARS_TEAMS.map(t=><option key={t.id} value={t.id}>{t.name} · {players.filter(p=>p.team_id===t.id).length} joueurs</option>)}
      </select>
    </label>}
   </div>

   <div style={s.hero}><div><small style={{fontWeight:900,color:org.primary}}>{org.name}</small><h1 style={{margin:'6px 0'}}>Centre de gestion</h1><p style={s.muted}>{isDiambars?'Noir · rouge · blanc':'Noir · blanc · gris'} · Effectifs, joueurs, tests et accès.</p></div><div style={{...s.kpi,borderTopColor:org.primary}}><small>JOUEURS ACTIFS</small><strong>{orgPlayers.length}</strong></div></div>
   <nav style={s.tabs}>{([['overview','Vue générale'],['players','Joueurs'],['compare','Comparateur'],['tests','Tests sportifs'],['staff','Staff & accès']] as [Tab,string][]).map(([id,label])=><button key={id} onClick={()=>setTab(id)} style={{...s.tab,borderBottomColor:tab===id?org.primary:'transparent'}}>{label}</button>)}</nav>
   {error&&<div style={s.error}>{error}</div>}

   {tab==='overview'&&<div style={s.cards}>{isDiambars?DIAMBARS_TEAMS.map(t=><article key={t.id} style={{...s.card,borderTopColor:'#D71920'}}><small>2026-2027</small><h2>{t.name}</h2><strong style={s.big}>{players.filter(p=>p.team_id===t.id).length}</strong><span> joueurs</span><button style={s.textBtn} onClick={()=>{setTeamId(t.id);setTab('players')}}>Ouvrir l’effectif →</button></article>):<article style={{...s.card,borderTopColor:'#111'}}><small>PERFORMANCE INDIVIDUELLE</small><h2>HDY ELITE</h2><strong style={s.big}>{orgPlayers.length}</strong><span> athlètes</span></article>}</div>}

   {tab==='players'&&<section style={s.panel}><div style={s.panelHead}><h2>{isDiambars?DIAMBARS_TEAMS.find(t=>t.id===teamId)?.name:'HDY ELITE'}</h2><input value={search} onChange={e=>setSearch(e.target.value)} placeholder='Rechercher joueur / poste' style={s.input}/></div><div style={s.tableWrap}><table style={s.table}><thead><tr>{['Joueur','Année','Poste','Taille','Poids','Statut'].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead><tbody>{visible.map(p=><tr key={p.id}><td style={s.td}><b>{p.display_name||`${p.first_name} ${p.last_name}`}</b></td><td style={s.td}>{p.birth_year||'—'}</td><td style={s.td}>{p.primary_position||p.position||'—'}</td><td style={s.td}>{p.height_cm?`${p.height_cm} cm`:'—'}</td><td style={s.td}>{p.weight_kg?`${p.weight_kg} kg`:'—'}</td><td style={s.td}>{p.status}</td></tr>)}</tbody></table></div></section>}

   {tab==='compare'&&<section style={s.panel}><h2>Comparateur · jusqu’à 4 joueurs</h2><div style={s.pickGrid}>{visible.map(p=><button key={p.id} onClick={()=>toggle(p.id)} style={{...s.pick,borderColor:selected.includes(p.id)?org.primary:'#E5E7EB'}}>{p.display_name||`${p.first_name} ${p.last_name}`}<small>{p.primary_position||p.position||'—'}</small></button>)}</div>{compared.length>0&&<div style={s.tableWrap}><table style={s.table}><thead><tr><th style={s.th}>Mesure</th>{compared.map(p=><th key={p.id} style={s.th}>{p.display_name||p.last_name}</th>)}</tr></thead><tbody><tr><td style={s.td}><b>Taille</b></td>{compared.map(p=><td key={p.id} style={s.td}>{p.height_cm?`${p.height_cm} cm`:'—'}</td>)}</tr><tr><td style={s.td}><b>Poids</b></td>{compared.map(p=><td key={p.id} style={s.td}>{p.weight_kg?`${p.weight_kg} kg`:'—'}</td>)}</tr><tr><td style={s.td}><b>Poste</b></td>{compared.map(p=><td key={p.id} style={s.td}>{p.primary_position||p.position||'—'}</td>)}</tr></tbody></table></div>}</section>}
   {tab==='tests'&&<section style={s.panel}><h2>Tests sportifs</h2><p style={s.muted}>Batterie de tests et saisie des résultats : prochain lot actif du centre de gestion.</p></section>}
   {tab==='staff'&&<section style={s.panel}><h2>Staff & accès</h2><p style={s.muted}>Ton compte reste administrateur principal sur DIAMBARS FC et HDY ELITE.</p></section>}
  </section>
 </main>
}

const s:Record<string,React.CSSProperties>={center:{minHeight:'70vh',display:'grid',placeItems:'center',padding:24,fontFamily:'Arial,sans-serif'},header:{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,padding:'16px 24px',background:'#fff',borderBottom:'4px solid #111',flexWrap:'wrap'},link:{border:'1px solid #D1D5DB',borderRadius:9,padding:'10px 13px',background:'#fff',color:'#111',textDecoration:'none',fontWeight:700},wrap:{width:'min(1180px,calc(100% - 28px))',margin:'0 auto',padding:'24px 0 50px'},selectorPanel:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:14,background:'#fff',padding:18,borderRadius:14,border:'1px solid #E5E7EB'},label:{fontSize:12,fontWeight:900,display:'grid',gap:8},select:{width:'100%',minHeight:48,padding:'11px 14px',border:'2px solid #111',borderRadius:10,fontSize:16,background:'#fff'},hero:{display:'flex',justifyContent:'space-between',alignItems:'end',gap:20,flexWrap:'wrap',marginTop:24},muted:{color:'#6B7280'},kpi:{background:'#fff',border:'1px solid #E5E7EB',borderTop:'4px solid #111',borderRadius:12,padding:14,minWidth:150,display:'grid'},tabs:{display:'flex',gap:4,overflowX:'auto',margin:'22px 0 14px',background:'#fff',borderRadius:12,padding:'0 8px'},tab:{padding:'14px 12px',border:0,borderBottom:'3px solid transparent',background:'transparent',fontWeight:700,whiteSpace:'nowrap',cursor:'pointer'},cards:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:12},card:{background:'#fff',border:'1px solid #E5E7EB',borderTop:'4px solid #111',borderRadius:14,padding:16},big:{fontSize:32},textBtn:{display:'block',marginTop:12,border:0,background:'transparent',fontWeight:800,cursor:'pointer'},panel:{background:'#fff',border:'1px solid #E5E7EB',borderRadius:14,padding:16},panelHead:{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'},input:{padding:11,border:'1px solid #D1D5DB',borderRadius:9,fontSize:16,minWidth:240},tableWrap:{overflowX:'auto'},table:{width:'100%',borderCollapse:'collapse',minWidth:620,marginTop:12},th:{textAlign:'left',padding:'10px',fontSize:12,color:'#6B7280',borderBottom:'1px solid #E5E7EB'},td:{padding:'11px 10px',borderBottom:'1px solid #F3F4F6'},pickGrid:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:8},pick:{padding:12,border:'2px solid #E5E7EB',background:'#fff',borderRadius:10,textAlign:'left',display:'grid',gap:4},error:{background:'#FEE2E2',color:'#991B1B',padding:12,borderRadius:10,marginBottom:10}};
