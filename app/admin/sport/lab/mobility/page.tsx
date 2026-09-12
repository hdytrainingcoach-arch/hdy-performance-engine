'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useOrg } from '@/lib/org-context';

type Row=Record<string,any>;
type Axis='beta'|'gamma';
type Trial={angle:number;side?:'left'|'right'};

export default function MobilityLabPage(){
 const {environments,currentEnvId:org,setCurrentEnvId:setOrg,currentTeamId:team,setCurrentTeamId:setTeam,teamsFor,usesTeams}=useOrg();
 const [ready,setReady]=useState(false),[ok,setOk]=useState(false),[players,setPlayers]=useState<Row[]>([]),[defs,setDefs]=useState<Row[]>([]);
 const [playerId,setPlayerId]=useState(''),[defId,setDefId]=useState(''),[side,setSide]=useState<'left'|'right'>('left'),[testedAt,setTestedAt]=useState(new Date().toISOString().slice(0,16)),[msg,setMsg]=useState('');
 const [sensorState,setSensorState]=useState<'idle'|'granted'|'denied'|'unsupported'>('idle');
 const [axis,setAxis]=useState<Axis>('beta'),[raw,setRaw]=useState(0),[zero,setZero]=useState(0);
 const [trials,setTrials]=useState<Trial[]>([]);
 const listening=useRef(false);

 async function load(){const [p,d]=await Promise.all([supabase.from('players').select('*').eq('active',true),supabase.from('test_definitions').select('*').eq('active',true).eq('category','mobility')]);setPlayers(p.data||[]);setDefs(d.data||[])}
 useEffect(()=>{(async()=>{const {data:{session}}=await supabase.auth.getSession();if(!session){setReady(true);return}const [{data:p},{data:m}]=await Promise.all([supabase.from('profiles').select('is_super_admin').eq('user_id',session.user.id).maybeSingle(),supabase.from('memberships').select('id').eq('user_id',session.user.id).eq('active',true).limit(1)]);if(!p?.is_super_admin&&!m?.length){setReady(true);return}setOk(true);await load();setReady(true)})()},[]);

 const scoped=useMemo(()=>players.filter(p=>p.organization_id===org&&(!usesTeams(org)||!team||p.team_id===team)),[players,org,team,usesTeams]);
 const visibleDefs=useMemo(()=>defs.filter(d=>d.organization_id===org||d.organization_id===null),[defs,org]);
 useEffect(()=>{if(!scoped.some(p=>p.id===playerId))setPlayerId(scoped[0]?.id||'')},[scoped,playerId]);
 useEffect(()=>{if(!visibleDefs.some(d=>d.id===defId))setDefId(visibleDefs[0]?.id||'')},[visibleDefs,defId]);

 function onOrientation(e:DeviceOrientationEvent){const v=axis==='beta'?e.beta:e.gamma;if(v!=null)setRaw(v)}

 async function enableSensors(){
  const DOE:any=(window as any).DeviceOrientationEvent;
  if(!DOE){setSensorState('unsupported');return}
  if(typeof DOE.requestPermission==='function'){
   try{const res=await DOE.requestPermission();if(res!=='granted'){setSensorState('denied');return}}catch{setSensorState('denied');return}
  }
  if(!listening.current){window.addEventListener('deviceorientation',onOrientation);listening.current=true}
  setSensorState('granted');
 }
 useEffect(()=>()=>{if(listening.current)window.removeEventListener('deviceorientation',onOrientation)},[]);

 const angle=raw-zero;
 const def=defs.find(d=>d.id===defId);
 const needsSide=def?.trial_count>1;

 function addTrial(){setTrials(t=>[...t,{angle:Math.round(angle*10)/10,side:needsSide?side:undefined}]);setMsg('')}
 function removeTrial(i:number){setTrials(t=>t.filter((_,idx)=>idx!==i))}

 async function save(){
  if(!def||!playerId||!trials.length){setMsg('Sélectionne un joueur, un test et enregistre au moins une mesure.');return}
  const vals=trials.map(t=>t.angle);const best=Math.max(...vals);const mean=Math.round((vals.reduce((a,b)=>a+b,0)/vals.length)*10)/10;
  const {data:{session}}=await supabase.auth.getSession();
  const {error}=await supabase.from('test_results').insert({organization_id:org,test_definition_id:def.id,player_id:playerId,tested_at:new Date(testedAt).toISOString(),trials:vals,best_value:best,mean_value:mean,device:'HDY LAB (inclinomètre iPhone)',evaluator_user_id:session?.user.id||null,context:{protocol:def.protocol,unit:def.unit,method:'device_orientation',axis,trials_detail:trials}});
  setMsg(error?error.message:`${def.name} enregistré : ${best}° ✓`);
  if(!error)setTrials([]);
 }

 if(!ready)return <main style={S.center}>Chargement…</main>;
 if(!ok)return <main style={S.center}>Accès staff requis.</main>;

 return <main style={S.main}>
  <header style={S.header}>
   <div><span style={S.kicker}>HDY LAB</span><h1>Mobilité · Inclinomètre</h1><p>Utilise les capteurs de mouvement du téléphone (gyroscope/accéléromètre) comme inclinomètre : dorsiflexion de cheville, inclinaison du tronc en overhead squat, etc.</p></div>
   <a href='/admin/sport/lab' style={S.back}>← HDY LAB</a>
  </header>

  <section style={S.toolbar}>
   <label>Environnement<select value={org} onChange={e=>setOrg(e.target.value)} style={S.input}>{environments.map(e=><option key={e.id} value={e.id}>{e.branding?.label||e.name}</option>)}</select></label>
   {usesTeams(org)&&<label>Équipe<select value={team} onChange={e=>setTeam(e.target.value)} style={S.input}><option value=''>Toutes les équipes</option>{teamsFor(org).map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>}
   <label>Joueur<select value={playerId} onChange={e=>setPlayerId(e.target.value)} style={S.input}>{scoped.map(p=><option key={p.id} value={p.id}>{p.display_name||`${p.first_name} ${p.last_name}`}</option>)}</select></label>
   <label>Test<select value={defId} onChange={e=>setDefId(e.target.value)} style={S.input}>{visibleDefs.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
  </section>

  {!visibleDefs.length&&<div style={S.notice}>Aucun protocole de mobilité disponible pour cet environnement.</div>}
  {msg&&<div style={S.notice}>{msg}</div>}

  <section style={S.grid}>
   <article style={S.card}>
    <h2>1 · Capteurs</h2>
    {def&&<p style={S.hint}>{def.protocol}</p>}
    {sensorState!=='granted'&&<button onClick={enableSensors} style={S.primary}>Activer les capteurs de mouvement</button>}
    {sensorState==='denied'&&<div style={S.notice}>Accès refusé — vérifie les réglages de confidentialité de Safari (Réglages → Safari → Mouvement et orientation).</div>}
    {sensorState==='unsupported'&&<div style={S.notice}>Capteurs non disponibles sur cet appareil/navigateur.</div>}
    {sensorState==='granted'&&<>
     <label>Axe de mesure<select value={axis} onChange={e=>setAxis(e.target.value as Axis)} style={S.input}><option value='beta'>Avant/arrière (téléphone vertical contre le tibia/le tronc)</option><option value='gamma'>Gauche/droite (téléphone tenu à l’horizontale)</option></select></label>
     {needsSide&&<label>Côté<select value={side} onChange={e=>setSide(e.target.value as any)} style={S.input}><option value='left'>Gauche</option><option value='right'>Droite</option></select></label>}
     <div style={S.result}><b>{angle.toFixed(1)}°</b><span>brut {raw.toFixed(1)}°</span></div>
     <div style={S.markRow}>
      <button onClick={()=>setZero(raw)} style={S.markBtn}>Calibrer le zéro (position neutre)</button>
      <button onClick={addTrial} style={S.markBtn}>Enregistrer cette mesure</button>
     </div>
    </>}
   </article>

   <article style={S.card}>
    <h2>2 · Mesures enregistrées</h2>
    {!trials.length&&<p style={S.hint}>Aucune mesure pour l’instant.</p>}
    {trials.map((t,i)=><div key={i} style={S.row}><span><b>Mesure {i+1}</b>{t.side?<small>{t.side==='left'?'Gauche':'Droite'}</small>:null}</span><span style={S.rowRight}><strong>{t.angle}°</strong><button onClick={()=>removeTrial(i)} style={S.remove}>Retirer</button></span></div>)}
    <label>Date / heure<input type='datetime-local' value={testedAt} onChange={e=>setTestedAt(e.target.value)} style={S.input}/></label>
    <button onClick={save} style={S.primary}>Enregistrer le test</button>
   </article>
  </section>
 </main>
}

const S:Record<string,React.CSSProperties>={
 center:{minHeight:'80vh',display:'grid',placeItems:'center'},
 main:{minHeight:'100vh',background:'#09090B',color:'#FAFAFA',fontFamily:'Inter,system-ui,sans-serif',padding:28},
 header:{maxWidth:1200,margin:'0 auto 20px',display:'flex',justifyContent:'space-between',gap:20},
 kicker:{fontSize:11,fontWeight:900,letterSpacing:1.4,color:'#E31E24'},
 back:{color:'#fff',textDecoration:'none',border:'1px solid #2B2B31',padding:'10px 12px',borderRadius:10,height:'fit-content'},
 toolbar:{maxWidth:1200,margin:'0 auto 16px',background:'#141416',border:'1px solid #2B2B31',borderRadius:16,padding:14,display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:12},
 input:{width:'100%',height:42,background:'#1B1B1F',color:'#fff',border:'1px solid #2B2B31',borderRadius:10,padding:'0 10px',marginTop:6,boxSizing:'border-box'},
 notice:{maxWidth:1200,margin:'0 auto 14px',background:'#141416',border:'1px solid #2B2B31',borderRadius:12,padding:12},
 grid:{maxWidth:1200,margin:'0 auto',display:'grid',gridTemplateColumns:'minmax(320px,1.1fr) minmax(280px,.9fr)',gap:14},
 card:{background:'#141416',border:'1px solid #2B2B31',borderRadius:16,padding:16,display:'grid',gap:12,alignContent:'start'},
 hint:{color:'#A1A1AA',fontSize:13,lineHeight:1.5,margin:0},
 markRow:{display:'flex',gap:8,flexWrap:'wrap'},
 markBtn:{flex:1,minWidth:150,height:44,borderRadius:10,border:'1px solid #2B2B31',background:'#1B1B1F',color:'#fff',fontWeight:700,cursor:'pointer'},
 result:{display:'flex',justifyContent:'space-between',alignItems:'baseline',border:'1px solid #2B2B31',borderRadius:12,padding:12},
 primary:{border:0,borderRadius:10,padding:'12px 15px',fontWeight:850,color:'#fff',background:'#E31E24',cursor:'pointer'},
 row:{display:'flex',justifyContent:'space-between',gap:10,padding:'10px 0',borderBottom:'1px solid #2B2B31'},
 rowRight:{display:'flex',alignItems:'center',gap:10},
 remove:{border:'1px solid #2B2B31',background:'transparent',color:'#A1A1AA',borderRadius:8,padding:'4px 8px',cursor:'pointer',fontSize:12},
};
