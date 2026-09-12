'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useOrg } from '@/lib/org-context';
import FrameScrubber from '@/components/FrameScrubber';

type Row=Record<string,any>;
type Mode='single'|'twocam';
const FPS_OPTIONS=[30,60,120,240];

function Clip({label,fps,onFile,videoUrl,cur,duration,playing,setCur,setDuration,setPlaying}:{
 label:string;fps:number;onFile:(f:File)=>void;videoUrl:string;cur:number;duration:number;playing:boolean;
 setCur:(t:number)=>void;setDuration:(d:number)=>void;setPlaying:(p:boolean)=>void;
}){
 return <div style={{display:'grid',gap:8}}>
  <b>{label}</b>
  <input type='file' accept='video/*' capture='environment' onChange={e=>{const f=e.target.files?.[0];if(f)onFile(f)}} style={S.input}/>
  {videoUrl&&<FrameScrubber videoUrl={videoUrl} fps={fps} cur={cur} duration={duration} playing={playing} onTime={setCur} onDuration={setDuration} onPlaying={setPlaying}/>}
 </div>
}

export default function SprintLabPage(){
 const {environments,currentEnvId:org,setCurrentEnvId:setOrg,currentTeamId:team,setCurrentTeamId:setTeam,teamsFor,usesTeams}=useOrg();
 const [ready,setReady]=useState(false),[ok,setOk]=useState(false),[players,setPlayers]=useState<Row[]>([]),[defs,setDefs]=useState<Row[]>([]);
 const [playerId,setPlayerId]=useState(''),[defId,setDefId]=useState(''),[testedAt,setTestedAt]=useState(new Date().toISOString().slice(0,16)),[msg,setMsg]=useState('');
 const [mode,setMode]=useState<Mode>('single'),[fps,setFps]=useState(60);
 const [trials,setTrials]=useState<number[]>([]);

 // Mode vidéo unique
 const [urlA,setUrlA]=useState(''),[curA,setCurA]=useState(0),[durA,setDurA]=useState(0),[playA,setPlayA]=useState(false);
 const [startT,setStartT]=useState<number|null>(null),[finishT,setFinishT]=useState<number|null>(null);

 // Mode deux caméras synchronisées (top commun, ex : un clap)
 const [urlB,setUrlB]=useState(''),[curB,setCurB]=useState(0),[durB,setDurB]=useState(0),[playB,setPlayB]=useState(false);
 const [syncA,setSyncA]=useState<number|null>(null),[syncB,setSyncB]=useState<number|null>(null),[startT2,setStartT2]=useState<number|null>(null),[finishT2,setFinishT2]=useState<number|null>(null);

 async function load(){const [p,d]=await Promise.all([supabase.from('players').select('*').eq('active',true),supabase.from('test_definitions').select('*').eq('active',true).eq('category','speed')]);setPlayers(p.data||[]);setDefs(d.data||[])}
 useEffect(()=>{(async()=>{const {data:{session}}=await supabase.auth.getSession();if(!session){setReady(true);return}const [{data:p},{data:m}]=await Promise.all([supabase.from('profiles').select('is_super_admin').eq('user_id',session.user.id).maybeSingle(),supabase.from('memberships').select('id').eq('user_id',session.user.id).eq('active',true).limit(1)]);if(!p?.is_super_admin&&!m?.length){setReady(true);return}setOk(true);await load();setReady(true)})()},[]);

 const scoped=useMemo(()=>players.filter(p=>p.organization_id===org&&(!usesTeams(org)||!team||p.team_id===team)),[players,org,team,usesTeams]);
 const visibleDefs=useMemo(()=>defs.filter(d=>d.organization_id===org||d.organization_id===null),[defs,org]);
 useEffect(()=>{if(!scoped.some(p=>p.id===playerId))setPlayerId(scoped[0]?.id||'')},[scoped,playerId]);
 useEffect(()=>{if(!visibleDefs.some(d=>d.id===defId))setDefId(visibleDefs.find(d=>d.name==='Sprint 30 m')?.id||visibleDefs[0]?.id||'')},[visibleDefs,defId]);

 useEffect(()=>{return()=>{if(urlA)URL.revokeObjectURL(urlA)}},[urlA]);
 useEffect(()=>{return()=>{if(urlB)URL.revokeObjectURL(urlB)}},[urlB]);

 function loadA(f:File){if(urlA)URL.revokeObjectURL(urlA);setUrlA(URL.createObjectURL(f));setDurA(0);setCurA(0);setPlayA(false);setStartT(null);setFinishT(null);setSyncA(null);setStartT2(null)}
 function loadB(f:File){if(urlB)URL.revokeObjectURL(urlB);setUrlB(URL.createObjectURL(f));setDurB(0);setCurB(0);setPlayB(false);setSyncB(null);setFinishT2(null)}

 const timeSingle=startT!=null&&finishT!=null&&finishT>startT?finishT-startT:null;
 const timeTwoCam=syncA!=null&&syncB!=null&&startT2!=null&&finishT2!=null?(finishT2-syncB)-(startT2-syncA):null;
 const time=mode==='single'?timeSingle:timeTwoCam;

 function addTrial(){
  if(time==null||time<=0){setMsg(mode==='single'?'Marque le départ puis l’arrivée.':'Marque le top de synchro et le repère sur les deux vidéos.');return}
  setTrials(t=>[...t,Math.round(time*1000)/1000]);
  if(mode==='single'){setStartT(null);setFinishT(null)}else{setStartT2(null);setFinishT2(null)}
  setMsg('');
 }
 function removeTrial(i:number){setTrials(t=>t.filter((_,idx)=>idx!==i))}

 async function save(){
  const def=defs.find(d=>d.id===defId);
  if(!playerId||!def||!trials.length){setMsg('Sélectionne un joueur, une distance et enregistre au moins un essai.');return}
  const best=Math.min(...trials);const mean=Math.round((trials.reduce((a,b)=>a+b,0)/trials.length)*1000)/1000;
  const {data:{session}}=await supabase.auth.getSession();
  const {error}=await supabase.from('test_results').insert({organization_id:org,test_definition_id:def.id,player_id:playerId,tested_at:new Date(testedAt).toISOString(),trials,best_value:best,mean_value:mean,device:mode==='single'?'HDY LAB (vidéo, caméra unique)':'HDY LAB (vidéo, 2 caméras synchronisées)',evaluator_user_id:session?.user.id||null,context:{protocol:def.protocol,unit:def.unit,method:mode==='single'?'video_gate_single':'video_gate_two_cam_synced',fps}});
  setMsg(error?error.message:`${def.name} enregistré : ${best.toFixed(3)} ${def.unit} ✓`);
  if(!error)setTrials([]);
 }

 if(!ready)return <main style={S.center}>Chargement…</main>;
 if(!ok)return <main style={S.center}>Accès staff requis.</main>;

 return <main style={S.main}>
  <header style={S.header}>
   <div><span style={S.kicker}>HDY LAB</span><h1>Sprint (chrono vidéo)</h1><p>Portillon vidéo : chronométrage sans cellules, en vue unique sur courte distance ou avec deux caméras synchronisées par un top commun (clap, flash) pour un 30 m/40 m.</p></div>
   <a href='/admin/sport/lab' style={S.back}>← HDY LAB</a>
  </header>

  <section style={S.toolbar}>
   <label>Environnement<select value={org} onChange={e=>setOrg(e.target.value)} style={S.input}>{environments.map(e=><option key={e.id} value={e.id}>{e.branding?.label||e.name}</option>)}</select></label>
   {usesTeams(org)&&<label>Équipe<select value={team} onChange={e=>setTeam(e.target.value)} style={S.input}><option value=''>Toutes les équipes</option>{teamsFor(org).map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>}
   <label>Joueur<select value={playerId} onChange={e=>setPlayerId(e.target.value)} style={S.input}>{scoped.map(p=><option key={p.id} value={p.id}>{p.display_name||`${p.first_name} ${p.last_name}`}</option>)}</select></label>
   <label>Distance<select value={defId} onChange={e=>setDefId(e.target.value)} style={S.input}>{visibleDefs.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
   <label>Fréquence d’image<select value={fps} onChange={e=>setFps(Number(e.target.value))} style={S.input}>{FPS_OPTIONS.map(f=><option key={f} value={f}>{f} im/s</option>)}</select></label>
   <label>Protocole<select value={mode} onChange={e=>setMode(e.target.value as Mode)} style={S.input}><option value='single'>Vidéo unique</option><option value='twocam'>Deux caméras synchronisées</option></select></label>
  </section>

  {msg&&<div style={S.notice}>{msg}</div>}

  <section style={S.grid}>
   <article style={S.card}>
    {mode==='single'?<>
     <h2>1 · Vidéo du sprint</h2>
     <p style={S.hint}>Vue large couvrant le départ et la ligne d’arrivée (idéal sur les courtes distances, ou caméra surélevée).</p>
     <Clip label='' fps={fps} onFile={loadA} videoUrl={urlA} cur={curA} duration={durA} playing={playA} setCur={setCurA} setDuration={setDurA} setPlaying={setPlayA}/>
     {urlA&&<div style={S.markRow}>
      <button onClick={()=>setStartT(curA)} style={S.markBtn}>Marquer le départ{startT!=null?` · ${(startT*1000).toFixed(1)} ms`:''}</button>
      <button onClick={()=>setFinishT(curA)} style={S.markBtn}>Marquer l’arrivée{finishT!=null?` · ${(finishT*1000).toFixed(1)} ms`:''}</button>
     </div>}
    </>:<>
     <h2>1 · Deux vidéos, top commun</h2>
     <p style={S.hint}>Sur chaque vidéo, marque d’abord le top de synchro (ex : un clap visible sur les deux caméras), puis le départ sur la vidéo A et le franchissement de la ligne sur la vidéo B.</p>
     <Clip label='Caméra A · départ' fps={fps} onFile={loadA} videoUrl={urlA} cur={curA} duration={durA} playing={playA} setCur={setCurA} setDuration={setDurA} setPlaying={setPlayA}/>
     {urlA&&<div style={S.markRow}>
      <button onClick={()=>setSyncA(curA)} style={S.markBtn}>Top synchro A{syncA!=null?` · ${(syncA*1000).toFixed(1)} ms`:''}</button>
      <button onClick={()=>setStartT2(curA)} style={S.markBtn}>Départ{startT2!=null?` · ${(startT2*1000).toFixed(1)} ms`:''}</button>
     </div>}
     <Clip label='Caméra B · arrivée' fps={fps} onFile={loadB} videoUrl={urlB} cur={curB} duration={durB} playing={playB} setCur={setCurB} setDuration={setDurB} setPlaying={setPlayB}/>
     {urlB&&<div style={S.markRow}>
      <button onClick={()=>setSyncB(curB)} style={S.markBtn}>Top synchro B{syncB!=null?` · ${(syncB*1000).toFixed(1)} ms`:''}</button>
      <button onClick={()=>setFinishT2(curB)} style={S.markBtn}>Arrivée{finishT2!=null?` · ${(finishT2*1000).toFixed(1)} ms`:''}</button>
     </div>}
    </>}
    {time!=null&&time>0&&<div style={S.result}><b>{time.toFixed(3)} s</b></div>}
    <button onClick={addTrial} style={S.primary}>Ajouter cet essai</button>
   </article>

   <article style={S.card}>
    <h2>2 · Essais enregistrés</h2>
    {!trials.length&&<p style={S.hint}>Aucun essai pour l’instant.</p>}
    {trials.map((t,i)=><div key={i} style={S.row}><span><b>Essai {i+1}</b></span><span style={S.rowRight}><strong>{t.toFixed(3)} s</strong><button onClick={()=>removeTrial(i)} style={S.remove}>Retirer</button></span></div>)}
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
 toolbar:{maxWidth:1200,margin:'0 auto 16px',background:'#141416',border:'1px solid #2B2B31',borderRadius:16,padding:14,display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:12},
 input:{width:'100%',height:42,background:'#1B1B1F',color:'#fff',border:'1px solid #2B2B31',borderRadius:10,padding:'0 10px',marginTop:6,boxSizing:'border-box'},
 notice:{maxWidth:1200,margin:'0 auto 14px',background:'#141416',border:'1px solid #2B2B31',borderRadius:12,padding:12},
 grid:{maxWidth:1200,margin:'0 auto',display:'grid',gridTemplateColumns:'minmax(320px,1.1fr) minmax(280px,.9fr)',gap:14},
 card:{background:'#141416',border:'1px solid #2B2B31',borderRadius:16,padding:16,display:'grid',gap:12,alignContent:'start'},
 hint:{color:'#A1A1AA',fontSize:13,lineHeight:1.5,margin:0},
 markRow:{display:'flex',gap:8,flexWrap:'wrap'},
 markBtn:{flex:1,minWidth:150,height:44,borderRadius:10,border:'1px solid #2B2B31',background:'#1B1B1F',color:'#fff',fontWeight:700,cursor:'pointer'},
 result:{display:'flex',justifyContent:'center',border:'1px solid #2B2B31',borderRadius:12,padding:12},
 primary:{border:0,borderRadius:10,padding:'12px 15px',fontWeight:850,color:'#fff',background:'#E31E24',cursor:'pointer'},
 row:{display:'flex',justifyContent:'space-between',gap:10,padding:'10px 0',borderBottom:'1px solid #2B2B31'},
 rowRight:{display:'flex',alignItems:'center',gap:10},
 remove:{border:'1px solid #2B2B31',background:'transparent',color:'#A1A1AA',borderRadius:8,padding:'4px 8px',cursor:'pointer',fontSize:12},
};
