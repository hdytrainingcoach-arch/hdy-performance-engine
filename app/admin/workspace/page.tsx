'use client';

import { useEffect,useMemo,useState } from 'react';
import { supabase } from '@/lib/supabase';

type Row=Record<string,any>;
const DIAMBARS='d3136b7f-ef28-43e8-af53-30fa6de70c62';
const ELITE='5454ad8f-8f2b-4812-9923-ab7d0b1f8748';
const TEAMS=[{id:'d9bb5390-94cb-461e-b2cd-a326da2cfa3d',name:'PRO A'},{id:'44f6976d-f5ef-4dcf-980f-ce3995e99877',name:'U19 · PRO B'},{id:'28b38b9f-3de0-419d-8275-b331a074b7f4',name:'U17'},{id:'e652df98-4653-416c-b794-3763e38a629d',name:'U15'}];

export default function Workspace(){
 const [ready,setReady]=useState(false),[ok,setOk]=useState(false),[org,setOrg]=useState(DIAMBARS),[team,setTeam]=useState(TEAMS[2].id);
 const [players,setPlayers]=useState<Row[]>([]),[tests,setTests]=useState<Row[]>([]),[questionnaires,setQuestionnaires]=useState<Row[]>([]),[pain,setPain]=useState<Row[]>([]),[rpe,setRpe]=useState<Row[]>([]),[alerts,setAlerts]=useState<Row[]>([]);
 useEffect(()=>{(async()=>{const {data:{session}}=await supabase.auth.getSession();if(!session){setReady(true);return}const [{data:p},{data:m}]=await Promise.all([supabase.from('profiles').select('is_super_admin').eq('user_id',session.user.id).maybeSingle(),supabase.from('memberships').select('id').eq('user_id',session.user.id).eq('active',true).limit(1)]);if(p?.is_super_admin||m?.length)setOk(true);setReady(true)})()},[]);
 useEffect(()=>{if(ok)load()},[ok,org,team]);
 async function load(){const q=org===DIAMBARS?supabase.from('players').select('id').eq('organization_id',org).eq('team_id',team).eq('active',true):supabase.from('players').select('id').eq('organization_id',org).eq('active',true);const {data:p}=await q;const list=(p||[]) as Row[];setPlayers(list);const ids=list.map(x=>x.id);if(!ids.length){setTests([]);setQuestionnaires([]);setPain([]);setRpe([]);setAlerts([]);return}const [t,h,pa,r,al]=await Promise.all([supabase.from('test_results').select('id,player_id,tested_at').in('player_id',ids).limit(1000),supabase.from('questionnaire_responses').select('id,player_id,submitted_at').eq('organization_id',org).in('player_id',ids).limit(1000),supabase.from('pain_declarations').select('id,player_id,declared_at,intensity').eq('organization_id',org).in('player_id',ids).limit(1000),supabase.from('session_rpe').select('id,player_id,load_ua,submitted_at').eq('organization_id',org).in('player_id',ids).limit(1000),supabase.from('alerts').select('id,player_id,status').eq('organization_id',org).in('player_id',ids).neq('status','closed').limit(1000)]);setTests((t.data||[]) as Row[]);setQuestionnaires((h.data||[]) as Row[]);setPain((pa.data||[]) as Row[]);setRpe((r.data||[]) as Row[]);setAlerts((al.data||[]) as Row[])}
 const today=new Date().toISOString().slice(0,10);
 const yesterday=new Date(Date.now()-86400000).toISOString().slice(0,10);
 const missingHooper=useMemo(()=>players.filter(p=>!questionnaires.some(q=>q.player_id===p.id&&String(q.submitted_at||'').slice(0,10)===today)).length,[players,questionnaires,today]);
 const painWeek=useMemo(()=>new Set(pain.filter(x=>{const t=new Date(x.declared_at||'').getTime();return Number.isFinite(t)&&t>=Date.now()-7*86400000}).map(x=>x.player_id)).size,[pain]);
 const srpeYesterday=useMemo(()=>Math.round(rpe.filter(x=>String(x.submitted_at||'').slice(0,10)===yesterday).reduce((s,x)=>s+(Number(x.load_ua)||0),0)),[rpe,yesterday]);
 if(!ready)return <main style={S.center}>Chargement…</main>;if(!ok)return <main style={S.center}>Accès staff requis.</main>;
 const cards=[
  {href:'/admin/administration',title:'Administration',desc:'Inscriptions, organisations, staff et droits.',tag:'ADMIN'},
  {href:'/admin/sport',title:'Sport & Performance',desc:'Séances, tests, monitoring et analyse.',tag:'SPORT'},
  {href:'/admin/sport/monitoring',title:'Monitoring',desc:'Hooper, RPE Foster, sRPE et douleurs. HRV uniquement pour HDY ELITE.',tag:'LIVE'},
  {href:'/admin/sport/comparator',title:'Comparateur',desc:'Comparer jusqu’à 4 profils sur des protocoles cohérents.',tag:'ANALYSE'},
 ];
 return <main style={S.main}><header style={S.header}><div><span style={S.kicker}>HDY PERFORMANCE ENGINE</span><h1 style={S.h1}>Dashboard de pilotage</h1><p style={S.sub}>Vue synthétique. Les opérations détaillées sont maintenant séparées dans leurs espaces dédiés.</p></div><a href='/admin' style={S.back}>← Portail</a></header>
 <section style={S.filters}><label>Organisation<select value={org} onChange={e=>setOrg(e.target.value)} style={S.input}><option value={DIAMBARS}>DIAMBARS FC</option><option value={ELITE}>HDY ELITE</option></select></label>{org===DIAMBARS&&<label>Équipe<select value={team} onChange={e=>setTeam(e.target.value)} style={S.input}>{TEAMS.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>}</section>
 <section style={S.metrics}><Metric label='ATHLÈTES ACTIFS' value={players.length}/><Metric label='HOOPER MANQUANTS (AUJ.)' value={missingHooper}/><Metric label='DOULEURS 7 JOURS' value={painWeek}/><Metric label='ALERTES OUVERTES' value={alerts.length}/><Metric label='sRPE J-1 (TOTAL UA)' value={srpeYesterday}/><Metric label='TESTS ENREGISTRÉS' value={tests.length}/></section>
 <section style={S.grid}>{cards.map(c=><a key={c.href} href={c.href} style={S.card}><span style={S.tag}>{c.tag}</span><h2>{c.title}</h2><p>{c.desc}</p><b>Ouvrir →</b></a>)}</section>
 </main>
}
function Metric({label,value}:{label:string;value:number}){return <article style={S.metric}><small>{label}</small><strong>{value}</strong></article>}
const S:Record<string,React.CSSProperties>={center:{minHeight:'80vh',display:'grid',placeItems:'center',fontFamily:'system-ui'},main:{minHeight:'100vh',background:'#09090B',color:'#FAFAFA',fontFamily:'Inter,system-ui,sans-serif',padding:28},header:{maxWidth:1280,margin:'0 auto 18px',display:'flex',justifyContent:'space-between',gap:20},kicker:{fontSize:11,fontWeight:900,letterSpacing:1.5,color:'#E31E24'},h1:{fontSize:'clamp(40px,6vw,68px)',margin:'4px 0',letterSpacing:-2.5},sub:{color:'#A1A1AA',maxWidth:760},back:{color:'#fff',textDecoration:'none',border:'1px solid #2B2B31',borderRadius:10,padding:'10px 12px',height:'fit-content'},filters:{maxWidth:1280,margin:'0 auto 14px',display:'flex',gap:12,alignItems:'end',flexWrap:'wrap',background:'#141416',border:'1px solid #2B2B31',borderRadius:16,padding:14},input:{display:'block',minWidth:220,height:42,marginTop:6,background:'#1B1B1F',color:'#fff',border:'1px solid #34343A',borderRadius:10,padding:'0 10px'},metrics:{maxWidth:1280,margin:'0 auto 14px',display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:10},metric:{background:'#141416',border:'1px solid #2B2B31',borderRadius:14,padding:16,display:'grid',gap:8},grid:{maxWidth:1280,margin:'0 auto',display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:12},card:{background:'#141416',border:'1px solid #2B2B31',borderRadius:18,padding:20,color:'#fff',textDecoration:'none',display:'grid',gap:10},tag:{fontSize:10,fontWeight:900,color:'#E31E24'}};