'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useOrg } from '@/lib/org-context';
import CodGateTracker from '@/components/CodGateTracker';

type Row=Record<string,any>;

export default function CodLabPage(){
 const {environments,currentEnvId:org,setCurrentEnvId:setOrg,currentTeamId:team,setCurrentTeamId:setTeam,teamsFor,usesTeams}=useOrg();
 const [ready,setReady]=useState(false),[ok,setOk]=useState(false),[players,setPlayers]=useState<Row[]>([]),[defs,setDefs]=useState<Row[]>([]);
 const [playerId,setPlayerId]=useState(''),[defId,setDefId]=useState(''),[testedAt,setTestedAt]=useState(new Date().toISOString().slice(0,16)),[msg,setMsg]=useState('');
 const [videoUrl,setVideoUrl]=useState(''),[crossings,setCrossings]=useState<number[]|null>(null),[picked,setPicked]=useState<number[]>([]);
 const [trials,setTrials]=useState<number[]>([]);

 async function load(){const [p,d]=await Promise.all([supabase.from('players').select('*').eq('active',true),supabase.from('test_definitions').select('*').eq('active',true).eq('category','cod')]);setPlayers(p.data||[]);setDefs(d.data||[])}
 useEffect(()=>{(async()=>{const {data:{session}}=await supabase.auth.getSession();if(!session){setReady(true);return}const [{data:p},{data:m}]=await Promise.all([supabase.from('profiles').select('is_super_admin').eq('user_id',session.user.id).maybeSingle(),supabase.from('memberships').select('id').eq('user_id',session.user.id).eq('active',true).limit(1)]);if(!p?.is_super_admin&&!m?.length){setReady(true);return}setOk(true);await load();setReady(true)})()},[]);

 const scoped=useMemo(()=>players.filter(p=>p.organization_id===org&&(!usesTeams(org)||!team||p.team_id===team)),[players,org,team,usesTeams]);
 const visibleDefs=useMemo(()=>defs.filter(d=>d.organization_id===org||d.organization_id===null),[defs,org]);
 useEffect(()=>{if(!scoped.some(p=>p.id===playerId))setPlayerId(scoped[0]?.id||'')},[scoped,playerId]);
 useEffect(()=>{if(!visibleDefs.some(d=>d.id===defId))setDefId(visibleDefs.find(d=>d.name==='5-0-5')?.id||visibleDefs[0]?.id||'')},[visibleDefs,defId]);

 useEffect(()=>{return()=>{if(videoUrl)URL.revokeObjectURL(videoUrl)}},[videoUrl]);

 function onFile(e:React.ChangeEvent<HTMLInputElement>){const f=e.target.files?.[0];if(!f)return;if(videoUrl)URL.revokeObjectURL(videoUrl);setVideoUrl(URL.createObjectURL(f));setCrossings(null);setPicked([])}

 function togglePick(t:number){setPicked(p=>p.includes(t)?p.filter(x=>x!==t):p.length<2?[...p,t].sort((a,b)=>a-b):[p[1],t].sort((a,b)=>a-b))}

 function addTrial(){
  if(picked.length!==2){setMsg('Sélectionne les deux passages (aller et retour) dans la liste détectée.');return}
  setTrials(t=>[...t,Math.round((picked[1]-picked[0])*1000)/1000]);setPicked([]);setMsg('');
 }
 function removeTrial(i:number){setTrials(t=>t.filter((_,idx)=>idx!==i))}

 async function save(){
  const def=defs.find(d=>d.id===defId);
  if(!playerId||!def||!trials.length){setMsg('Sélectionne un joueur, un test et enregistre au moins un essai.');return}
  const best=Math.min(...trials);const mean=Math.round((trials.reduce((a,b)=>a+b,0)/trials.length)*1000)/1000;
  const {data:{session}}=await supabase.auth.getSession();
  const {error}=await supabase.from('test_results').insert({organization_id:org,test_definition_id:def.id,player_id:playerId,tested_at:new Date(testedAt).toISOString(),trials,best_value:best,mean_value:mean,device:'HDY LAB (suivi vidéo automatique)',evaluator_user_id:session?.user.id||null,context:{protocol:def.protocol,unit:def.unit,method:'video_auto_tracking_bidirectional'}});
  setMsg(error?error.message:`${def.name} enregistré : ${best.toFixed(3)} ${def.unit} ✓`);
  if(!error)setTrials([]);
 }

 if(!ready)return <main style={S.center}>Chargement…</main>;
 if(!ok)return <main style={S.center}>Accès staff requis.</main>;

 return <main style={S.main}>
  <header style={S.header}>
   <div><span style={S.kicker}>HDY LAB</span><h1>5-0-5 · Changement de direction</h1><p>Suivi automatique du coureur : la même ligne est franchie à l’aller et au retour, l’écart entre les deux passages donne le temps du test — sans portillon ni cellule.</p></div>
   <a href='/admin/sport/lab' style={S.back}>← HDY LAB</a>
  </header>

  <section style={S.toolbar}>
   <label>Environnement<select value={org} onChange={e=>setOrg(e.target.value)} style={S.input}>{environments.map(e=><option key={e.id} value={e.id}>{e.branding?.label||e.name}</option>)}</select></label>
   {usesTeams(org)&&<label>Équipe<select value={team} onChange={e=>setTeam(e.target.value)} style={S.input}><option value=''>Toutes les équipes</option>{teamsFor(org).map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>}
   <label>Joueur<select value={playerId} onChange={e=>setPlayerId(e.target.value)} style={S.input}>{scoped.map(p=><option key={p.id} value={p.id}>{p.display_name||`${p.first_name} ${p.last_name}`}</option>)}</select></label>
   <label>Test<select value={defId} onChange={e=>setDefId(e.target.value)} style={S.input}>{visibleDefs.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
  </section>

  {msg&&<div style={S.notice}>{msg}</div>}

  <section style={S.grid}>
   <article style={S.card}>
    <h2>1 · Vidéo du test</h2>
    <p style={S.hint}>Caméra fixe, vue de profil, cadrant la ligne de chronométrage sur toute la durée (aller + virage + retour).</p>
    <input type='file' accept='video/*' capture='environment' onChange={onFile} style={S.input}/>
    {videoUrl&&<CodGateTracker videoUrl={videoUrl} onDone={setCrossings}/>}
   </article>

   <article style={S.card}>
    <h2>2 · Passages détectés</h2>
    {!crossings&&<p style={S.hint}>Lance l’analyse pour voir les passages détectés.</p>}
    {crossings&&<>
     <p style={S.hint}>Sélectionne les deux passages à retenir (aller puis retour).</p>
     {crossings.map((t,i)=><button key={i} onClick={()=>togglePick(t)} style={picked.includes(t)?S.pickedBtn:S.markBtn}>Passage {i+1} · {(t*1000).toFixed(0)} ms</button>)}
     {picked.length===2&&<div style={S.result}><b>{(picked[1]-picked[0]).toFixed(3)} s</b></div>}
     <button onClick={addTrial} style={S.primary}>Ajouter cet essai</button>
    </>}
    <h2>Essais enregistrés</h2>
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
 toolbar:{maxWidth:1200,margin:'0 auto 16px',background:'#141416',border:'1px solid #2B2B31',borderRadius:16,padding:14,display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:12},
 input:{width:'100%',height:42,background:'#1B1B1F',color:'#fff',border:'1px solid #2B2B31',borderRadius:10,padding:'0 10px',marginTop:6,boxSizing:'border-box'},
 notice:{maxWidth:1200,margin:'0 auto 14px',background:'#141416',border:'1px solid #2B2B31',borderRadius:12,padding:12},
 grid:{maxWidth:1200,margin:'0 auto',display:'grid',gridTemplateColumns:'minmax(320px,1.1fr) minmax(280px,.9fr)',gap:14},
 card:{background:'#141416',border:'1px solid #2B2B31',borderRadius:16,padding:16,display:'grid',gap:12,alignContent:'start'},
 hint:{color:'#A1A1AA',fontSize:13,lineHeight:1.5,margin:0},
 markBtn:{width:'100%',height:44,borderRadius:10,border:'1px solid #2B2B31',background:'#1B1B1F',color:'#fff',fontWeight:700,cursor:'pointer'},
 pickedBtn:{width:'100%',height:44,borderRadius:10,border:'1px solid #E31E24',background:'#E31E24',color:'#fff',fontWeight:700,cursor:'pointer'},
 result:{display:'flex',justifyContent:'center',border:'1px solid #2B2B31',borderRadius:12,padding:12},
 primary:{border:0,borderRadius:10,padding:'12px 15px',fontWeight:850,color:'#fff',background:'#E31E24',cursor:'pointer'},
 row:{display:'flex',justifyContent:'space-between',gap:10,padding:'10px 0',borderBottom:'1px solid #2B2B31'},
 rowRight:{display:'flex',alignItems:'center',gap:10},
 remove:{border:'1px solid #2B2B31',background:'transparent',color:'#A1A1AA',borderRadius:8,padding:'4px 8px',cursor:'pointer',fontSize:12},
};
