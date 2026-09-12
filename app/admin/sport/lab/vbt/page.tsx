'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useOrg } from '@/lib/org-context';
import FrameScrubber from '@/components/FrameScrubber';

type Row=Record<string,any>;
type Trial={velocity:number;loadKg?:number};
const FPS_OPTIONS=[30,60,120,240];

export default function VbtLabPage(){
 const {environments,currentEnvId:org,setCurrentEnvId:setOrg,currentTeamId:team,setCurrentTeamId:setTeam,teamsFor,usesTeams}=useOrg();
 const [ready,setReady]=useState(false),[ok,setOk]=useState(false),[players,setPlayers]=useState<Row[]>([]),[def,setDef]=useState<Row|null>(null);
 const [playerId,setPlayerId]=useState(''),[testedAt,setTestedAt]=useState(new Date().toISOString().slice(0,16)),[msg,setMsg]=useState('');
 const [videoUrl,setVideoUrl]=useState(''),[fps,setFps]=useState(60);
 const [duration,setDuration]=useState(0),[cur,setCur]=useState(0),[playing,setPlaying]=useState(false);
 const [distanceCm,setDistanceCm]=useState('40'),[loadKg,setLoadKg]=useState('');
 const [startT,setStartT]=useState<number|null>(null),[endT,setEndT]=useState<number|null>(null);
 const [trials,setTrials]=useState<Trial[]>([]);

 async function load(){const [p,d]=await Promise.all([supabase.from('players').select('*').eq('active',true),supabase.from('test_definitions').select('*').eq('active',true).eq('category','vbt').maybeSingle()]);setPlayers(p.data||[]);setDef(d.data||null)}
 useEffect(()=>{(async()=>{const {data:{session}}=await supabase.auth.getSession();if(!session){setReady(true);return}const [{data:p},{data:m}]=await Promise.all([supabase.from('profiles').select('is_super_admin').eq('user_id',session.user.id).maybeSingle(),supabase.from('memberships').select('id').eq('user_id',session.user.id).eq('active',true).limit(1)]);if(!p?.is_super_admin&&!m?.length){setReady(true);return}setOk(true);await load();setReady(true)})()},[]);

 const scoped=useMemo(()=>players.filter(p=>p.organization_id===org&&(!usesTeams(org)||!team||p.team_id===team)),[players,org,team,usesTeams]);
 useEffect(()=>{if(!scoped.some(p=>p.id===playerId))setPlayerId(scoped[0]?.id||'')},[scoped,playerId]);
 useEffect(()=>{return()=>{if(videoUrl)URL.revokeObjectURL(videoUrl)}},[videoUrl]);

 function onFile(e:React.ChangeEvent<HTMLInputElement>){const f=e.target.files?.[0];if(!f)return;if(videoUrl)URL.revokeObjectURL(videoUrl);setVideoUrl(URL.createObjectURL(f));setDuration(0);setCur(0);setPlaying(false);setStartT(null);setEndT(null)}

 const dist=Number(distanceCm);
 const timeS=startT!=null&&endT!=null&&endT>startT?endT-startT:null;
 const velocity=timeS!=null&&dist>0?(dist/100)/timeS:null;

 function addTrial(){
  if(velocity==null){setMsg('Marque le début et la fin de la phase concentrique, avec une distance de déplacement valide.');return}
  setTrials(t=>[...t,{velocity:Math.round(velocity*1000)/1000,loadKg:loadKg?Number(loadKg):undefined}]);setStartT(null);setEndT(null);setMsg('');
 }
 function removeTrial(i:number){setTrials(t=>t.filter((_,idx)=>idx!==i))}

 async function save(){
  if(!def){setMsg('Le protocole VBT n’est pas encore configuré (migration test_definitions manquante).');return}
  if(!playerId||!trials.length){setMsg('Sélectionne un joueur et enregistre au moins un essai.');return}
  const vals=trials.map(t=>t.velocity);const best=Math.max(...vals);const mean=Math.round((vals.reduce((a,b)=>a+b,0)/vals.length)*1000)/1000;
  const {data:{session}}=await supabase.auth.getSession();
  const {error}=await supabase.from('test_results').insert({organization_id:org,test_definition_id:def.id,player_id:playerId,tested_at:new Date(testedAt).toISOString(),trials:vals,best_value:best,mean_value:mean,device:'HDY LAB (vidéo)',evaluator_user_id:session?.user.id||null,context:{protocol:def.protocol,unit:def.unit,method:'video_distance_time',fps,distance_cm:dist,trials_detail:trials}});
  setMsg(error?error.message:`Vitesse concentrique enregistrée : ${best.toFixed(2)} m/s ✓`);
  if(!error)setTrials([]);
 }

 if(!ready)return <main style={S.center}>Chargement…</main>;
 if(!ok)return <main style={S.center}>Accès staff requis.</main>;

 return <main style={S.main}>
  <header style={S.header}>
   <div><span style={S.kicker}>HDY LAB</span><h1>VBT · Vitesse concentrique</h1><p>Vitesse moyenne = distance de déplacement connue / temps de la phase concentrique, mesurée sur vidéo. Pas de capteur inertiel : plus simple et plus fiable qu’un accéléromètre de téléphone sur ce type de mesure.</p></div>
   <a href='/admin/sport/lab' style={S.back}>← HDY LAB</a>
  </header>

  <section style={S.toolbar}>
   <label>Environnement<select value={org} onChange={e=>setOrg(e.target.value)} style={S.input}>{environments.map(e=><option key={e.id} value={e.id}>{e.branding?.label||e.name}</option>)}</select></label>
   {usesTeams(org)&&<label>Équipe<select value={team} onChange={e=>setTeam(e.target.value)} style={S.input}><option value=''>Toutes les équipes</option>{teamsFor(org).map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>}
   <label>Joueur<select value={playerId} onChange={e=>setPlayerId(e.target.value)} style={S.input}>{scoped.map(p=><option key={p.id} value={p.id}>{p.display_name||`${p.first_name} ${p.last_name}`}</option>)}</select></label>
  </section>

  {msg&&<div style={S.notice}>{msg}</div>}

  <section style={S.grid}>
   <article style={S.card}>
    <h2>1 · Filmer le mouvement</h2>
    <p style={S.hint}>Caméra fixe, perpendiculaire au déplacement (profil). Mesure au préalable la distance parcourue par la barre/le repère entre le bas et le haut du mouvement.</p>
    <input type='file' accept='video/*' capture='environment' onChange={onFile} style={S.input}/>
    <label>Fréquence d’image<select value={fps} onChange={e=>setFps(Number(e.target.value))} style={S.input}>{FPS_OPTIONS.map(f=><option key={f} value={f}>{f} im/s</option>)}</select></label>
    <label>Distance parcourue (cm)<input type='number' value={distanceCm} onChange={e=>setDistanceCm(e.target.value)} style={S.input}/></label>
    <label>Charge (kg, optionnel)<input type='number' value={loadKg} onChange={e=>setLoadKg(e.target.value)} style={S.input}/></label>

    {videoUrl&&<>
     <FrameScrubber videoUrl={videoUrl} fps={fps} cur={cur} duration={duration} playing={playing} onTime={setCur} onDuration={setDuration} onPlaying={setPlaying}/>
     <div style={S.markRow}>
      <button onClick={()=>setStartT(cur)} style={S.markBtn}>Début concentrique{startT!=null?` · ${(startT*1000).toFixed(1)} ms`:''}</button>
      <button onClick={()=>setEndT(cur)} style={S.markBtn}>Fin concentrique{endT!=null?` · ${(endT*1000).toFixed(1)} ms`:''}</button>
     </div>
     {velocity!=null&&<div style={S.result}><b>{velocity.toFixed(2)} m/s</b><span>{(timeS!*1000).toFixed(0)} ms sur {dist} cm</span></div>}
     <button onClick={addTrial} style={S.primary}>Ajouter cet essai</button>
    </>}
   </article>

   <article style={S.card}>
    <h2>2 · Essais enregistrés</h2>
    {!trials.length&&<p style={S.hint}>Aucun essai pour l’instant.</p>}
    {trials.map((t,i)=><div key={i} style={S.row}><span><b>Essai {i+1}</b>{t.loadKg?<small>{t.loadKg} kg</small>:null}</span><span style={S.rowRight}><strong>{t.velocity} m/s</strong><button onClick={()=>removeTrial(i)} style={S.remove}>Retirer</button></span></div>)}
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
