'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useOrg } from '@/lib/org-context';

type Row=Record<string,any>;
type Trial={height:number;flightMs:number};
const FPS_OPTIONS=[30,60,120,240];
const G=9.81;

function fmtMs(t:number){return `${(t*1000).toFixed(1)} ms`}
function heightFromFlightMs(ms:number){return (G*Math.pow(ms/1000,2)/8)*100}

export default function LabPage(){
 const {environments,currentEnvId:org,setCurrentEnvId:setOrg,currentTeamId:team,setCurrentTeamId:setTeam,teamsFor,usesTeams}=useOrg();
 const [ready,setReady]=useState(false),[ok,setOk]=useState(false),[players,setPlayers]=useState<Row[]>([]),[defs,setDefs]=useState<Row[]>([]);
 const [playerId,setPlayerId]=useState(''),[defId,setDefId]=useState(''),[testedAt,setTestedAt]=useState(new Date().toISOString().slice(0,16)),[msg,setMsg]=useState('');
 const [videoUrl,setVideoUrl]=useState(''),[videoName,setVideoName]=useState(''),[fps,setFps]=useState(240);
 const [duration,setDuration]=useState(0),[cur,setCur]=useState(0),[playing,setPlaying]=useState(false);
 const [takeoffT,setTakeoffT]=useState<number|null>(null),[landingT,setLandingT]=useState<number|null>(null);
 const [trials,setTrials]=useState<Trial[]>([]);
 const videoRef=useRef<HTMLVideoElement|null>(null);
 const frameDur=1/fps;

 async function load(){const [p,d]=await Promise.all([supabase.from('players').select('*').eq('active',true),supabase.from('test_definitions').select('*').eq('active',true).eq('category','jump')]);setPlayers(p.data||[]);setDefs(d.data||[])}
 useEffect(()=>{(async()=>{const {data:{session}}=await supabase.auth.getSession();if(!session){setReady(true);return}const [{data:p},{data:m}]=await Promise.all([supabase.from('profiles').select('is_super_admin').eq('user_id',session.user.id).maybeSingle(),supabase.from('memberships').select('id').eq('user_id',session.user.id).eq('active',true).limit(1)]);if(!p?.is_super_admin&&!m?.length){setReady(true);return}setOk(true);await load();setReady(true)})()},[]);

 const scoped=useMemo(()=>players.filter(p=>p.organization_id===org&&(!usesTeams(org)||!team||p.team_id===team)),[players,org,team,usesTeams]);
 const visibleDefs=useMemo(()=>defs.filter(d=>d.organization_id===org||d.organization_id===null),[defs,org]);
 useEffect(()=>{if(!scoped.some(p=>p.id===playerId))setPlayerId(scoped[0]?.id||'')},[scoped,playerId]);
 useEffect(()=>{if(!visibleDefs.some(d=>d.id===defId))setDefId(visibleDefs.find(d=>d.name==='CMJ')?.id||visibleDefs[0]?.id||'')},[visibleDefs,defId]);

 useEffect(()=>{return()=>{if(videoUrl)URL.revokeObjectURL(videoUrl)}},[videoUrl]);

 function onFile(e:React.ChangeEvent<HTMLInputElement>){
  const f=e.target.files?.[0];if(!f)return;
  if(videoUrl)URL.revokeObjectURL(videoUrl);
  setVideoUrl(URL.createObjectURL(f));setVideoName(f.name);setTakeoffT(null);setLandingT(null);setDuration(0);setCur(0);setPlaying(false);
 }

 function seekTo(t:number){const v=videoRef.current;if(!v)return;const clamped=Math.min(Math.max(t,0),duration||v.duration||0);v.currentTime=clamped;setCur(clamped)}
 function step(n:number){if(videoRef.current){videoRef.current.pause();setPlaying(false)}seekTo(cur+n*frameDur)}
 function togglePlay(){const v=videoRef.current;if(!v)return;if(v.paused){v.play();setPlaying(true)}else{v.pause();setPlaying(false)}}

 function markTakeoff(){setTakeoffT(cur)}
 function markLanding(){setLandingT(cur)}
 const flightMs=takeoffT!=null&&landingT!=null&&landingT>takeoffT?(landingT-takeoffT)*1000:null;
 const heightCm=flightMs!=null?heightFromFlightMs(flightMs):null;

 function addTrial(){if(flightMs==null||heightCm==null){setMsg('Marque l’envol puis la réception (réception après l’envol).');return}setTrials(t=>[...t,{height:Math.round(heightCm*10)/10,flightMs:Math.round(flightMs)}]);setTakeoffT(null);setLandingT(null);setMsg('')}
 function removeTrial(i:number){setTrials(t=>t.filter((_,idx)=>idx!==i))}

 async function save(){
  const def=defs.find(d=>d.id===defId);
  if(!playerId||!def||!trials.length){setMsg('Sélectionne un joueur, un test et enregistre au moins un essai.');return}
  const vals=trials.map(t=>t.height);
  const best=def.best_rule==='min'?Math.min(...vals):Math.max(...vals);
  const mean=vals.reduce((a,b)=>a+b,0)/vals.length;
  const {data:{session}}=await supabase.auth.getSession();
  const {error}=await supabase.from('test_results').insert({
   organization_id:org,test_definition_id:def.id,player_id:playerId,tested_at:new Date(testedAt).toISOString(),
   trials:vals,best_value:best,mean_value:mean,device:'HDY LAB (vidéo)',evaluator_user_id:session?.user.id||null,
   context:{protocol:def.protocol,unit:def.unit,method:'video_flight_time',fps,video_name:videoName||null,trials_detail:trials},
  });
  setMsg(error?error.message:`${def.name} enregistré : ${best} ${def.unit} ✓`);
  if(!error){setTrials([]);setTakeoffT(null);setLandingT(null)}
 }

 if(!ready)return <main style={S.center}>Chargement…</main>;
 if(!ok)return <main style={S.center}>Accès staff requis.</main>;

 return <main style={S.main}>
  <header style={S.header}>
   <div><span style={S.kicker}>SPORT & PERFORMANCE</span><h1>HDY LAB · Saut vertical (vidéo)</h1><p>Mesure du temps de vol par vidéo ralentie, à la manière de My Jump Lab : filme le saut, marque l’envol et la réception, la hauteur est calculée automatiquement.</p></div>
   <a href='/admin/sport' style={S.back}>← Sport & Performance</a>
  </header>

  <section style={S.toolbar}>
   <label>Environnement<select value={org} onChange={e=>setOrg(e.target.value)} style={S.input}>{environments.map(e=><option key={e.id} value={e.id}>{e.branding?.label||e.name}</option>)}</select></label>
   {usesTeams(org)&&<label>Équipe<select value={team} onChange={e=>setTeam(e.target.value)} style={S.input}><option value=''>Toutes les équipes</option>{teamsFor(org).map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>}
   <label>Joueur<select value={playerId} onChange={e=>setPlayerId(e.target.value)} style={S.input}>{scoped.map(p=><option key={p.id} value={p.id}>{p.display_name||`${p.first_name} ${p.last_name}`}</option>)}</select></label>
   <label>Test<select value={defId} onChange={e=>setDefId(e.target.value)} style={S.input}>{visibleDefs.map(d=><option key={d.id} value={d.id}>{d.name} · {d.unit}</option>)}</select></label>
  </section>

  {msg&&<div style={S.notice}>{msg}</div>}

  <section style={S.grid}>
   <article style={S.card}>
    <h2>1 · Filmer ou charger la vidéo</h2>
    <p style={S.hint}>Idéalement en ralenti (120–240 im/s), caméra fixe, cadre large sur les pieds. La vidéo reste sur l’appareil : seule la mesure calculée est enregistrée.</p>
    <input type='file' accept='video/*' capture='environment' onChange={onFile} style={S.input}/>
    <label>Fréquence d’image de la vidéo<select value={fps} onChange={e=>setFps(Number(e.target.value))} style={S.input}>{FPS_OPTIONS.map(f=><option key={f} value={f}>{f} im/s</option>)}</select></label>

    {videoUrl&&<>
     <video ref={videoRef} src={videoUrl} style={S.video} playsInline
      onLoadedMetadata={e=>setDuration(e.currentTarget.duration)}
      onTimeUpdate={e=>setCur(e.currentTarget.currentTime)}
      onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)}/>
     <input type='range' min={0} max={duration||0} step={frameDur} value={cur} onChange={e=>seekTo(Number(e.target.value))} style={{width:'100%'}}/>
     <div style={S.scrubRow}>
      <button onClick={()=>step(-10)} style={S.small}>◀◀ 10</button>
      <button onClick={()=>step(-1)} style={S.small}>◀ 1</button>
      <button onClick={togglePlay} style={S.small}>{playing?'Pause':'Lecture'}</button>
      <button onClick={()=>step(1)} style={S.small}>1 ▶</button>
      <button onClick={()=>step(10)} style={S.small}>10 ▶▶</button>
     </div>
     <div style={S.timeReadout}>{fmtMs(cur)} / {fmtMs(duration)}</div>
     <div style={S.markRow}>
      <button onClick={markTakeoff} style={S.markBtn}>Marquer l’envol{takeoffT!=null?` · ${fmtMs(takeoffT)}`:''}</button>
      <button onClick={markLanding} style={S.markBtn}>Marquer la réception{landingT!=null?` · ${fmtMs(landingT)}`:''}</button>
     </div>
     {heightCm!=null&&<div style={S.result}><b>{heightCm.toFixed(1)} cm</b><span>Temps de vol {flightMs!.toFixed(0)} ms</span></div>}
     <button onClick={addTrial} style={S.primary}>Ajouter cet essai</button>
    </>}
   </article>

   <article style={S.card}>
    <h2>2 · Essais enregistrés</h2>
    {!trials.length&&<p style={S.hint}>Aucun essai pour l’instant. Ajoute au moins un essai avant d’enregistrer.</p>}
    {trials.map((t,i)=><div key={i} style={S.row}><span><b>Essai {i+1}</b><small>{t.flightMs} ms de vol</small></span><span style={S.rowRight}><strong>{t.height} cm</strong><button onClick={()=>removeTrial(i)} style={S.remove}>Retirer</button></span></div>)}
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
 video:{width:'100%',borderRadius:12,background:'#000'},
 scrubRow:{display:'flex',gap:8,flexWrap:'wrap'},
 small:{flex:1,minWidth:60,height:38,borderRadius:8,border:'1px solid #2B2B31',background:'#1B1B1F',color:'#fff',cursor:'pointer'},
 timeReadout:{fontVariantNumeric:'tabular-nums',color:'#A1A1AA',fontSize:13},
 markRow:{display:'flex',gap:8,flexWrap:'wrap'},
 markBtn:{flex:1,minWidth:160,height:44,borderRadius:10,border:'1px solid #2B2B31',background:'#1B1B1F',color:'#fff',fontWeight:700,cursor:'pointer'},
 result:{display:'flex',justifyContent:'space-between',alignItems:'baseline',border:'1px solid #2B2B31',borderRadius:12,padding:12},
 primary:{border:0,borderRadius:10,padding:'12px 15px',fontWeight:850,color:'#fff',background:'#E31E24',cursor:'pointer'},
 row:{display:'flex',justifyContent:'space-between',gap:10,padding:'10px 0',borderBottom:'1px solid #2B2B31'},
 rowRight:{display:'flex',alignItems:'center',gap:10},
 remove:{border:'1px solid #2B2B31',background:'transparent',color:'#A1A1AA',borderRadius:8,padding:'4px 8px',cursor:'pointer',fontSize:12},
};
