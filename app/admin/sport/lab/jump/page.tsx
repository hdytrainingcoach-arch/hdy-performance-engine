'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useOrg } from '@/lib/org-context';
import FrameScrubber from '@/components/FrameScrubber';
import { heightFromFlightMs, forcePowerFromPropulsion, imbalancePct } from '@/lib/lab-calc';

type Row=Record<string,any>;
type Side='left'|'right';
type Trial={height:number;flightMs:number;contactMs?:number;rsi?:number;relF?:number;relP?:number;side?:Side};
const FPS_OPTIONS=[30,60,120,240];

export default function JumpLabPage(){
 const {environments,currentEnvId:org,setCurrentEnvId:setOrg,currentTeamId:team,setCurrentTeamId:setTeam,teamsFor,usesTeams}=useOrg();
 const [ready,setReady]=useState(false),[ok,setOk]=useState(false),[players,setPlayers]=useState<Row[]>([]),[defs,setDefs]=useState<Row[]>([]);
 const [playerId,setPlayerId]=useState(''),[defId,setDefId]=useState(''),[testedAt,setTestedAt]=useState(new Date().toISOString().slice(0,16)),[msg,setMsg]=useState('');
 const [videoUrl,setVideoUrl]=useState(''),[videoName,setVideoName]=useState(''),[fps,setFps]=useState(240);
 const [duration,setDuration]=useState(0),[cur,setCur]=useState(0),[playing,setPlaying]=useState(false);
 const [side,setSide]=useState<Side>('left');
 const [markA,setMarkA]=useState<number|null>(null),[markB,setMarkB]=useState<number|null>(null),[markC,setMarkC]=useState<number|null>(null),[markProp,setMarkProp]=useState<number|null>(null);
 const [trials,setTrials]=useState<Trial[]>([]);

 async function load(){const [p,d]=await Promise.all([supabase.from('players').select('*').eq('active',true),supabase.from('test_definitions').select('*').eq('active',true).eq('category','jump')]);setPlayers(p.data||[]);setDefs((d.data||[]).filter(x=>x.name!=='Broad Jump'))}
 useEffect(()=>{(async()=>{const {data:{session}}=await supabase.auth.getSession();if(!session){setReady(true);return}const [{data:p},{data:m}]=await Promise.all([supabase.from('profiles').select('is_super_admin').eq('user_id',session.user.id).maybeSingle(),supabase.from('memberships').select('id').eq('user_id',session.user.id).eq('active',true).limit(1)]);if(!p?.is_super_admin&&!m?.length){setReady(true);return}setOk(true);await load();setReady(true)})()},[]);

 const scoped=useMemo(()=>players.filter(p=>p.organization_id===org&&(!usesTeams(org)||!team||p.team_id===team)),[players,org,team,usesTeams]);
 const visibleDefs=useMemo(()=>defs.filter(d=>d.organization_id===org||d.organization_id===null),[defs,org]);
 useEffect(()=>{if(!scoped.some(p=>p.id===playerId))setPlayerId(scoped[0]?.id||'')},[scoped,playerId]);
 useEffect(()=>{if(!visibleDefs.some(d=>d.id===defId))setDefId(visibleDefs.find(d=>d.name==='CMJ')?.id||visibleDefs[0]?.id||'')},[visibleDefs,defId]);

 const player=scoped.find(p=>p.id===playerId);
 const def=defs.find(d=>d.id===defId);
 const mode:'flight'|'rsi'|'asym'=def?.name==='Drop Jump / RSI'?'rsi':def?.name==='Asymmetry test'?'asym':'flight';

 useEffect(()=>{return()=>{if(videoUrl)URL.revokeObjectURL(videoUrl)}},[videoUrl]);
 useEffect(()=>{setTrials([]);setMarkA(null);setMarkB(null);setMarkC(null);setMarkProp(null)},[defId]);

 function onFile(e:React.ChangeEvent<HTMLInputElement>){
  const f=e.target.files?.[0];if(!f)return;
  if(videoUrl)URL.revokeObjectURL(videoUrl);
  setVideoUrl(URL.createObjectURL(f));setVideoName(f.name);setDuration(0);setCur(0);setPlaying(false);setMarkA(null);setMarkB(null);setMarkC(null);setMarkProp(null);
 }

 const flightMs=markA!=null&&markB!=null&&markB>markA?(markB-markA)*1000:null;
 const heightCm=flightMs!=null?heightFromFlightMs(flightMs):null;
 const fp=mode==='flight'&&heightCm!=null&&markProp!=null&&markA!=null&&markProp<markA&&player?.weight_kg
  ?forcePowerFromPropulsion(player.weight_kg,heightCm,(markA-markProp)*1000):null;
 const contactMs=mode==='rsi'&&markA!=null&&markB!=null&&markB>markA?(markB-markA)*1000:null;
 const flightMs2=mode==='rsi'&&markB!=null&&markC!=null&&markC>markB?(markC-markB)*1000:null;
 const heightCm2=flightMs2!=null?heightFromFlightMs(flightMs2):null;
 const rsi=contactMs!=null&&flightMs2!=null&&contactMs>0?flightMs2/contactMs:null;

 function resetMarks(){setMarkA(null);setMarkB(null);setMarkC(null);setMarkProp(null)}

 function addTrial(){
  if(mode==='rsi'){
   if(rsi==null||heightCm2==null||contactMs==null){setMsg('Marque le 1er contact, le décollage puis la 2e réception.');return}
   setTrials(t=>[...t,{height:Math.round(heightCm2*10)/10,flightMs:Math.round(flightMs2!),contactMs:Math.round(contactMs),rsi:Math.round(rsi*100)/100}]);
  }else{
   if(flightMs==null||heightCm==null){setMsg('Marque l’envol puis la réception (réception après l’envol).');return}
   if(mode==='asym'&&!side){setMsg('Choisis la jambe testée.');return}
   setTrials(t=>[...t,{height:Math.round(heightCm*10)/10,flightMs:Math.round(flightMs),relF:fp?Math.round(fp.relF*100)/100:undefined,relP:fp?Math.round(fp.relP*10)/10:undefined,side:mode==='asym'?side:undefined}]);
  }
  resetMarks();setMsg('');
 }
 function removeTrial(i:number){setTrials(t=>t.filter((_,idx)=>idx!==i))}

 const leftBest=useMemo(()=>{const v=trials.filter(t=>t.side==='left').map(t=>t.height);return v.length?Math.max(...v):null},[trials]);
 const rightBest=useMemo(()=>{const v=trials.filter(t=>t.side==='right').map(t=>t.height);return v.length?Math.max(...v):null},[trials]);
 const imbalance=leftBest!=null&&rightBest!=null?imbalancePct(leftBest,rightBest):null;

 async function save(){
  if(!def||!playerId||!trials.length){setMsg('Sélectionne un joueur, un test et enregistre au moins un essai.');return}
  const {data:{session}}=await supabase.auth.getSession();
  let best:number,mean:number,vals:number[],context:Row;
  if(mode==='asym'){
   if(imbalance==null||leftBest==null||rightBest==null){setMsg('Il faut au moins un essai gauche et un essai droit.');return}
   vals=[leftBest,rightBest];best=Math.round(imbalance*10)/10;mean=Math.round(((leftBest+rightBest)/2)*10)/10;
   context={protocol:def.protocol,unit:def.unit,method:'video_flight_time_unilateral',left_cm:leftBest,right_cm:rightBest,fps,video_name:videoName||null,trials_detail:trials};
  }else if(mode==='rsi'){
   vals=trials.map(t=>t.rsi!);best=Math.max(...vals);mean=Math.round((vals.reduce((a,b)=>a+b,0)/vals.length)*100)/100;
   context={protocol:def.protocol,unit:def.unit,method:'video_contact_flight_time',fps,video_name:videoName||null,trials_detail:trials};
  }else{
   vals=trials.map(t=>t.height);best=def.best_rule==='min'?Math.min(...vals):Math.max(...vals);mean=Math.round((vals.reduce((a,b)=>a+b,0)/vals.length)*10)/10;
   context={protocol:def.protocol,unit:def.unit,method:'video_flight_time',fps,video_name:videoName||null,body_mass_kg:player?.weight_kg||null,trials_detail:trials};
  }
  const {error}=await supabase.from('test_results').insert({organization_id:org,test_definition_id:def.id,player_id:playerId,tested_at:new Date(testedAt).toISOString(),trials:vals,best_value:best,mean_value:mean,device:'HDY LAB (vidéo)',evaluator_user_id:session?.user.id||null,context});
  setMsg(error?error.message:`${def.name} enregistré : ${best} ${def.unit} ✓`);
  if(!error){setTrials([]);resetMarks()}
 }

 if(!ready)return <main style={S.center}>Chargement…</main>;
 if(!ok)return <main style={S.center}>Accès staff requis.</main>;

 return <main style={S.main}>
  <header style={S.header}>
   <div><span style={S.kicker}>HDY LAB</span><h1>Sauts (vidéo)</h1><p>CMJ, Squat Jump, Sargent Test, Drop Jump / RSI et test d’asymétrie — filmés en ralenti, mesurés au temps de vol.</p></div>
   <a href='/admin/sport/lab' style={S.back}>← HDY LAB</a>
  </header>

  <section style={S.toolbar}>
   <label>Environnement<select value={org} onChange={e=>setOrg(e.target.value)} style={S.input}>{environments.map(e=><option key={e.id} value={e.id}>{e.branding?.label||e.name}</option>)}</select></label>
   {usesTeams(org)&&<label>Équipe<select value={team} onChange={e=>setTeam(e.target.value)} style={S.input}><option value=''>Toutes les équipes</option>{teamsFor(org).map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>}
   <label>Joueur<select value={playerId} onChange={e=>setPlayerId(e.target.value)} style={S.input}>{scoped.map(p=><option key={p.id} value={p.id}>{p.display_name||`${p.first_name} ${p.last_name}`}</option>)}</select></label>
   <label>Test<select value={defId} onChange={e=>setDefId(e.target.value)} style={S.input}>{visibleDefs.map(d=><option key={d.id} value={d.id}>{d.name} · {d.unit}</option>)}</select></label>
  </section>

  {mode==='flight'&&!player?.weight_kg&&<div style={S.notice}>Masse corporelle du joueur non renseignée : Force/Puissance ne pourront pas être calculées (hauteur de saut disponible quand même). Renseigne-la dans la fiche joueur.</div>}
  {msg&&<div style={S.notice}>{msg}</div>}

  <section style={S.grid}>
   <article style={S.card}>
    <h2>1 · Filmer ou charger la vidéo</h2>
    <p style={S.hint}>Ralenti 120–240 im/s recommandé, caméra fixe, cadre large sur les pieds. La vidéo reste sur l’appareil : seule la mesure calculée est enregistrée.</p>
    <input type='file' accept='video/*' capture='environment' onChange={onFile} style={S.input}/>
    <label>Fréquence d’image de la vidéo<select value={fps} onChange={e=>setFps(Number(e.target.value))} style={S.input}>{FPS_OPTIONS.map(f=><option key={f} value={f}>{f} im/s</option>)}</select></label>
    {mode==='asym'&&<label>Jambe testée<select value={side} onChange={e=>setSide(e.target.value as Side)} style={S.input}><option value='left'>Gauche</option><option value='right'>Droite</option></select></label>}

    {videoUrl&&<>
     <FrameScrubber videoUrl={videoUrl} fps={fps} cur={cur} duration={duration} playing={playing} onTime={setCur} onDuration={setDuration} onPlaying={setPlaying}/>

     {mode==='rsi'?<div style={S.markRow}>
       <button onClick={()=>setMarkA(cur)} style={S.markBtn}>1er contact{markA!=null?` · ${(markA*1000).toFixed(1)} ms`:''}</button>
       <button onClick={()=>setMarkB(cur)} style={S.markBtn}>Décollage{markB!=null?` · ${(markB*1000).toFixed(1)} ms`:''}</button>
       <button onClick={()=>setMarkC(cur)} style={S.markBtn}>2e réception{markC!=null?` · ${(markC*1000).toFixed(1)} ms`:''}</button>
      </div>
      :<div style={S.markRow}>
       <button onClick={()=>setMarkA(cur)} style={S.markBtn}>Marquer l’envol{markA!=null?` · ${(markA*1000).toFixed(1)} ms`:''}</button>
       <button onClick={()=>setMarkB(cur)} style={S.markBtn}>Marquer la réception{markB!=null?` · ${(markB*1000).toFixed(1)} ms`:''}</button>
      </div>}

     {mode==='flight'&&player?.weight_kg&&<button onClick={()=>setMarkProp(cur)} style={S.markBtnGhost}>Marquer le début de poussée (optionnel, pour Force/Puissance){markProp!=null?` · ${(markProp*1000).toFixed(1)} ms`:''}</button>}

     {mode==='rsi'&&rsi!=null&&<div style={S.result}><b>RSI {rsi.toFixed(2)}</b><span>{heightCm2?.toFixed(1)} cm · contact {contactMs?.toFixed(0)} ms</span></div>}
     {mode!=='rsi'&&heightCm!=null&&<div style={S.result}><b>{heightCm.toFixed(1)} cm</b><span>Vol {flightMs!.toFixed(0)} ms{fp?` · ${fp.relF.toFixed(1)} N/kg · ${fp.relP.toFixed(0)} W/kg`:''}</span></div>}

     <button onClick={addTrial} style={S.primary}>Ajouter cet essai</button>
    </>}
   </article>

   <article style={S.card}>
    <h2>2 · Essais enregistrés</h2>
    {!trials.length&&<p style={S.hint}>Aucun essai pour l’instant.</p>}
    {trials.map((t,i)=><div key={i} style={S.row}><span><b>Essai {i+1}{t.side?` · ${t.side==='left'?'G':'D'}`:''}</b><small>{mode==='rsi'?`vol ${t.flightMs} ms · contact ${t.contactMs} ms`:`${t.flightMs} ms de vol${t.relF?` · ${t.relF} N/kg · ${t.relP} W/kg`:''}`}</small></span><span style={S.rowRight}><strong>{mode==='rsi'?`RSI ${t.rsi}`:`${t.height} cm`}</strong><button onClick={()=>removeTrial(i)} style={S.remove}>Retirer</button></span></div>)}
    {mode==='asym'&&<div style={S.notice}>Gauche : {leftBest??'—'} cm · Droite : {rightBest??'—'} cm{imbalance!=null?` · Déséquilibre ${imbalance.toFixed(1)} %`:''}</div>}
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
 markBtnGhost:{height:40,borderRadius:10,border:'1px dashed #2B2B31',background:'transparent',color:'#A1A1AA',fontSize:12,cursor:'pointer'},
 result:{display:'flex',justifyContent:'space-between',alignItems:'baseline',border:'1px solid #2B2B31',borderRadius:12,padding:12},
 primary:{border:0,borderRadius:10,padding:'12px 15px',fontWeight:850,color:'#fff',background:'#E31E24',cursor:'pointer'},
 row:{display:'flex',justifyContent:'space-between',gap:10,padding:'10px 0',borderBottom:'1px solid #2B2B31'},
 rowRight:{display:'flex',alignItems:'center',gap:10},
 remove:{border:'1px solid #2B2B31',background:'transparent',color:'#A1A1AA',borderRadius:8,padding:'4px 8px',cursor:'pointer',fontSize:12},
};
