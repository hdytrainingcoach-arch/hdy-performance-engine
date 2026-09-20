'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useOrg } from '@/lib/org-context';
import { buildBeepSchedule, stageIndexAt, ift3015Stages, type Stage } from '@/lib/beep-schedule';

type Row=Record<string,any>;
type Tab='shuttle'|'cooper';
const SHUTTLE_NAMES=['VAMEVAL','30-15 IFT','Yo-Yo IR1'];
const COOPER_NAMES=['Cooper','Demi-Cooper'];

function beep(ctx:AudioContext,atS:number,freq:number,durS:number){
 const osc=ctx.createOscillator(),gain=ctx.createGain();
 osc.frequency.value=freq;osc.connect(gain);gain.connect(ctx.destination);
 gain.gain.setValueAtTime(0.4,ctx.currentTime+atS);gain.gain.setValueAtTime(0,ctx.currentTime+atS+durS);
 osc.start(ctx.currentTime+atS);osc.stop(ctx.currentTime+atS+durS+0.02);
}

export default function AerobicLabPage(){
 const {environments,currentEnvId:org,setCurrentEnvId:setOrg,currentTeamId:team,setCurrentTeamId:setTeam,teamsFor,usesTeams}=useOrg();
 const [ready,setReady]=useState(false),[ok,setOk]=useState(false),[players,setPlayers]=useState<Row[]>([]),[defs,setDefs]=useState<Row[]>([]);
 const [tab,setTab]=useState<Tab>('shuttle');
 const [playerId,setPlayerId]=useState(''),[defId,setDefId]=useState(''),[testedAt,setTestedAt]=useState(new Date().toISOString().slice(0,16)),[msg,setMsg]=useState('');

 const [shuttleDistanceM,setShuttleDistanceM]=useState(20);
 const [stages,setStages]=useState<Stage[]>(ift3015Stages());
 const [running,setRunning]=useState(false),[elapsedS,setElapsedS]=useState(0),[stageIdx,setStageIdx]=useState(0),[resultKmh,setResultKmh]=useState<number|null>(null),[resultM,setResultM]=useState<number|null>(null);
 const ctxRef=useRef<AudioContext|null>(null),startRef=useRef(0),rafRef=useRef(0),scheduleRef=useRef(buildBeepSchedule(stages,shuttleDistanceM));

 const [durationMin,setDurationMin]=useState(12),[distanceM,setDistanceM]=useState('');

 async function load(){const [p,d]=await Promise.all([supabase.from('players').select('*').eq('active',true),supabase.from('test_definitions').select('*').eq('active',true).eq('category','endurance')]);setPlayers(p.data||[]);setDefs(d.data||[])}
 useEffect(()=>{(async()=>{const {data:{session}}=await supabase.auth.getSession();if(!session){setReady(true);return}const [{data:p},{data:m}]=await Promise.all([supabase.from('profiles').select('is_super_admin').eq('user_id',session.user.id).maybeSingle(),supabase.from('memberships').select('id').eq('user_id',session.user.id).eq('active',true).limit(1)]);if(!p?.is_super_admin&&!m?.length){setReady(true);return}setOk(true);await load();setReady(true)})()},[]);

 const scoped=useMemo(()=>players.filter(p=>p.organization_id===org&&(!usesTeams(org)||!team||p.team_id===team)),[players,org,team,usesTeams]);
 const visibleDefs=useMemo(()=>defs.filter(d=>d.organization_id===org||d.organization_id===null),[defs,org]);
 const shuttleDefs=useMemo(()=>visibleDefs.filter(d=>SHUTTLE_NAMES.includes(d.name)),[visibleDefs]);
 const cooperDefs=useMemo(()=>visibleDefs.filter(d=>COOPER_NAMES.includes(d.name)),[visibleDefs]);
 const currentDefs=tab==='shuttle'?shuttleDefs:cooperDefs;
 useEffect(()=>{if(!scoped.some(p=>p.id===playerId))setPlayerId(scoped[0]?.id||'')},[scoped,playerId]);
 useEffect(()=>{if(!currentDefs.some(d=>d.id===defId))setDefId(currentDefs[0]?.id||'')},[currentDefs,defId]);
 useEffect(()=>{if(tab==='cooper')setDurationMin(defs.find(d=>d.id===defId)?.name==='Demi-Cooper'?6:12)},[defId,tab,defs]);

 function addStage(){setStages(s=>[...s,{speedKmh:s.length?s[s.length-1].speedKmh+0.5:8,runS:30,recoveryS:15}])}
 function updateStage(i:number,field:keyof Stage,val:number){setStages(s=>s.map((st,idx)=>idx===i?{...st,[field]:val}:st))}
 function removeStage(i:number){setStages(s=>s.filter((_,idx)=>idx!==i))}

 function start(){
  const ctx=new AudioContext();ctxRef.current=ctx;
  const sched=buildBeepSchedule(stages,shuttleDistanceM);scheduleRef.current=sched;
  sched.beeps.forEach(t=>beep(ctx,t,1000,0.12));
  sched.stageStarts.slice(1).forEach(t=>beep(ctx,t,1500,0.3));
  startRef.current=ctx.currentTime;setRunning(true);setResultKmh(null);setResultM(null);setStageIdx(0);setElapsedS(0);
  const tick=()=>{const el=ctx.currentTime-startRef.current;setElapsedS(el);setStageIdx(stageIndexAt(sched.stageStarts,el));if(el<sched.totalS)rafRef.current=requestAnimationFrame(tick);else setRunning(false)};
  rafRef.current=requestAnimationFrame(tick);
 }
 function stop(){cancelAnimationFrame(rafRef.current);ctxRef.current?.close();setRunning(false)}
 function markOut(){
  const sched=scheduleRef.current;
  const completed=sched.beeps.filter(b=>b<=elapsedS).length;
  setResultKmh(stages[stageIdx]?.speedKmh??null);
  setResultM(Math.round(completed*shuttleDistanceM));
  stop();
 }
 useEffect(()=>()=>{cancelAnimationFrame(rafRef.current);ctxRef.current?.close()},[]);

 async function saveShuttle(){
  const def=defs.find(d=>d.id===defId);
  if(!def||!playerId){setMsg('Sélectionne un joueur et un test.');return}
  const value=def.unit==='m'?resultM:resultKmh;
  if(value==null){setMsg('Lance le test et marque la sortie avant d’enregistrer.');return}
  const {data:{session}}=await supabase.auth.getSession();
  const {error}=await supabase.from('test_results').insert({organization_id:org,test_definition_id:def.id,player_id:playerId,tested_at:new Date(testedAt).toISOString(),trials:[value],best_value:value,mean_value:value,device:'HDY LAB (navette sonore)',evaluator_user_id:session?.user.id||null,context:{protocol:def.protocol,unit:def.unit,shuttle_distance_m:shuttleDistanceM,stages,elapsed_s:Math.round(elapsedS)}});
  setMsg(error?error.message:`${def.name} enregistré : ${value} ${def.unit} ✓`);
 }

 async function saveCooper(){
  const def=defs.find(d=>d.id===defId);
  const dist=Number(distanceM);
  if(!def||!playerId||!dist){setMsg('Sélectionne un joueur, un test et saisis la distance parcourue.');return}
  const {data:{session}}=await supabase.auth.getSession();
  const vo2max=def.name==='Cooper'?Math.round(((dist-504.9)/44.73)*10)/10:null;
  const {error}=await supabase.from('test_results').insert({organization_id:org,test_definition_id:def.id,player_id:playerId,tested_at:new Date(testedAt).toISOString(),trials:[dist],best_value:dist,mean_value:dist,device:'HDY LAB',evaluator_user_id:session?.user.id||null,context:{protocol:def.protocol,unit:def.unit,duration_min:durationMin,vo2max_estimate:vo2max}});
  setMsg(error?error.message:`${def.name} enregistré : ${dist} m${vo2max?` · VO2max estimé ${vo2max} ml/kg/min`:''} ✓`);
  if(!error)setDistanceM('');
 }

 if(!ready)return <main style={S.center}>Chargement…</main>;
 if(!ok)return <main style={S.center}>Accès staff requis.</main>;

 return <main style={S.main}>
  <header style={S.header}>
   <div><span style={S.kicker}>HDY LAB</span><h1>Tests aérobies</h1><p>Navette sonore configurable (VAMEVAL, 30-15 IFT, Yo-Yo IR1) sans matériel dédié, et Cooper/Demi-Cooper au chronomètre. Vérifie toujours les paliers avec ta fiche protocole officielle avant le test.</p></div>
   <a href='/admin/sport/lab' style={S.back}>← HDY LAB</a>
  </header>

  <section style={S.tabs}>
   <button onClick={()=>setTab('shuttle')} style={tab==='shuttle'?S.tabActive:S.tab}>Navette sonore</button>
   <button onClick={()=>setTab('cooper')} style={tab==='cooper'?S.tabActive:S.tab}>Cooper / Demi-Cooper</button>
  </section>

  <section style={S.toolbar}>
   <label>Environnement<select value={org} onChange={e=>setOrg(e.target.value)} style={S.input}>{environments.map(e=><option key={e.id} value={e.id}>{e.branding?.label||e.name}</option>)}</select></label>
   {usesTeams(org)&&<label>Équipe<select value={team} onChange={e=>setTeam(e.target.value)} style={S.input}><option value=''>Toutes les équipes</option>{teamsFor(org).map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>}
   <label>Joueur<select value={playerId} onChange={e=>setPlayerId(e.target.value)} style={S.input}>{scoped.map(p=><option key={p.id} value={p.id}>{p.display_name||`${p.first_name} ${p.last_name}`}</option>)}</select></label>
   <label>Test<select value={defId} onChange={e=>setDefId(e.target.value)} style={S.input}>{currentDefs.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
  </section>

  {msg&&<div style={S.notice}>{msg}</div>}

  {tab==='shuttle'?<section style={S.grid}>
   <article style={S.card}>
    <h2>1 · Paliers</h2>
    <div style={S.markRow}>
     <button onClick={()=>{setStages(ift3015Stages());setShuttleDistanceM(40)}} style={S.markBtn}>Préremplir 30-15 IFT (à vérifier)</button>
     <button onClick={addStage} style={S.markBtn}>+ Ajouter un palier</button>
    </div>
    <label>Distance de la navette (m)<input type='number' value={shuttleDistanceM} onChange={e=>setShuttleDistanceM(Number(e.target.value))} style={S.input}/></label>
    <div style={S.stageList}>
     {stages.map((s,i)=><div key={i} style={S.stageRow}>
      <span>#{i+1}</span>
      <input type='number' step={0.5} value={s.speedKmh} onChange={e=>updateStage(i,'speedKmh',Number(e.target.value))} style={S.stageInput} title='km/h'/>
      <input type='number' value={s.runS} onChange={e=>updateStage(i,'runS',Number(e.target.value))} style={S.stageInput} title='course (s)'/>
      <input type='number' value={s.recoveryS} onChange={e=>updateStage(i,'recoveryS',Number(e.target.value))} style={S.stageInput} title='récup (s)'/>
      <button onClick={()=>removeStage(i)} style={S.remove}>×</button>
     </div>)}
    </div>
    <p style={S.hint}>Colonnes : vitesse (km/h) · course (s) · récupération (s). Laisser récupération à 0 pour un protocole continu (VAMEVAL).</p>
   </article>

   <article style={S.card}>
    <h2>2 · Lancer le test</h2>
    {!running?<button onClick={start} style={S.primary}>Démarrer les bips</button>:<button onClick={stop} style={S.primary}>Arrêter</button>}
    <div style={S.result}><b>{stages[stageIdx]?.speedKmh??'—'} km/h</b><span>palier {stageIdx+1}/{stages.length} · {elapsedS.toFixed(0)} s</span></div>
    {running&&<button onClick={markOut} style={S.markBtn}>Marquer la sortie</button>}
    {(resultKmh!=null||resultM!=null)&&<div style={S.notice}>Résultat : {resultKmh} km/h · {resultM} m parcourus</div>}
    <label>Date / heure<input type='datetime-local' value={testedAt} onChange={e=>setTestedAt(e.target.value)} style={S.input}/></label>
    <button onClick={saveShuttle} style={S.primary}>Enregistrer le test</button>
   </article>
  </section>:<section style={S.grid}>
   <article style={S.card}>
    <h2>Cooper / Demi-Cooper</h2>
    <p style={S.hint}>Durée fixe du protocole : {durationMin} min. Chronomètre-la avec ton téléphone (minuteur système), puis saisis la distance parcourue.</p>
    <label>Distance parcourue (m)<input type='number' value={distanceM} onChange={e=>setDistanceM(e.target.value)} style={S.input}/></label>
    <label>Date / heure<input type='datetime-local' value={testedAt} onChange={e=>setTestedAt(e.target.value)} style={S.input}/></label>
    <button onClick={saveCooper} style={S.primary}>Enregistrer le test</button>
   </article>
  </section>}
 </main>
}

const S:Record<string,React.CSSProperties>={
 center:{minHeight:'80vh',display:'grid',placeItems:'center'},
 main:{minHeight:'100vh',background:'#09090B',color:'#FAFAFA',fontFamily:'Inter,system-ui,sans-serif',padding:28},
 header:{maxWidth:1200,margin:'0 auto 20px',display:'flex',justifyContent:'space-between',gap:20},
 kicker:{fontSize:11,fontWeight:900,letterSpacing:1.4,color:'#E31E24'},
 back:{color:'#fff',textDecoration:'none',border:'1px solid #2B2B31',padding:'10px 12px',borderRadius:10,height:'fit-content'},
 tabs:{maxWidth:1200,margin:'0 auto 12px',display:'flex',gap:8},
 tab:{height:38,padding:'0 14px',borderRadius:8,border:'1px solid #2B2B31',background:'#141416',color:'#A1A1AA',cursor:'pointer'},
 tabActive:{height:38,padding:'0 14px',borderRadius:8,border:'1px solid #E31E24',background:'#1B1B1F',color:'#fff',fontWeight:800,cursor:'pointer'},
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
 stageList:{display:'grid',gap:6,maxHeight:280,overflowY:'auto'},
 stageRow:{display:'grid',gridTemplateColumns:'28px 1fr 1fr 1fr 28px',gap:6,alignItems:'center'},
 stageInput:{height:34,background:'#1B1B1F',color:'#fff',border:'1px solid #2B2B31',borderRadius:8,padding:'0 6px',boxSizing:'border-box'},
 remove:{border:'1px solid #2B2B31',background:'transparent',color:'#A1A1AA',borderRadius:8,cursor:'pointer',height:34},
};
