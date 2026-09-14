'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useOrg } from '@/lib/org-context';

type Row=Record<string,any>;
type Side='left'|'right';
const HOP_NAMES=['Single Leg Hop for Distance','Triple Hop for Distance','Crossover Hop for Distance'];

export default function HopLabPage(){
 const {environments,currentEnvId:org,setCurrentEnvId:setOrg,currentTeamId:team,setCurrentTeamId:setTeam,teamsFor,usesTeams}=useOrg();
 const [ready,setReady]=useState(false),[ok,setOk]=useState(false),[players,setPlayers]=useState<Row[]>([]),[defs,setDefs]=useState<Row[]>([]);
 const [playerId,setPlayerId]=useState(''),[defId,setDefId]=useState(''),[side,setSide]=useState<Side>('left'),[distance,setDistance]=useState(''),[testedAt,setTestedAt]=useState(new Date().toISOString().slice(0,16)),[msg,setMsg]=useState('');
 const [trials,setTrials]=useState<{value:number;side:Side}[]>([]);

 async function load(){const [p,d]=await Promise.all([supabase.from('players').select('*').eq('active',true),supabase.from('test_definitions').select('*').eq('active',true).eq('category','jump')]);setPlayers(p.data||[]);setDefs((d.data||[]).filter(x=>HOP_NAMES.includes(x.name)))}
 useEffect(()=>{(async()=>{const {data:{session}}=await supabase.auth.getSession();if(!session){setReady(true);return}const [{data:p},{data:m}]=await Promise.all([supabase.from('profiles').select('is_super_admin').eq('user_id',session.user.id).maybeSingle(),supabase.from('memberships').select('id').eq('user_id',session.user.id).eq('active',true).limit(1)]);if(!p?.is_super_admin&&!m?.length){setReady(true);return}setOk(true);await load();setReady(true)})()},[]);

 const scoped=useMemo(()=>players.filter(p=>p.organization_id===org&&(!usesTeams(org)||!team||p.team_id===team)),[players,org,team,usesTeams]);
 const visibleDefs=useMemo(()=>defs.filter(d=>d.organization_id===org||d.organization_id===null),[defs,org]);
 useEffect(()=>{if(!scoped.some(p=>p.id===playerId))setPlayerId(scoped[0]?.id||'')},[scoped,playerId]);
 useEffect(()=>{if(!visibleDefs.some(d=>d.id===defId))setDefId(visibleDefs[0]?.id||'')},[visibleDefs,defId]);
 useEffect(()=>{setTrials([])},[defId]);

 function addTrial(){const v=Number(distance);if(!Number.isFinite(v)||v<=0){setMsg('Saisis une distance valide (mesurée au mètre ruban).');return}setTrials(t=>[...t,{value:v,side}]);setDistance('');setMsg('')}
 function removeTrial(i:number){setTrials(t=>t.filter((_,idx)=>idx!==i))}

 const leftBest=useMemo(()=>{const v=trials.filter(t=>t.side==='left').map(t=>t.value);return v.length?Math.max(...v):null},[trials]);
 const rightBest=useMemo(()=>{const v=trials.filter(t=>t.side==='right').map(t=>t.value);return v.length?Math.max(...v):null},[trials]);
 const lsi=leftBest!=null&&rightBest!=null?(Math.min(leftBest,rightBest)/Math.max(leftBest,rightBest))*100:null;

 async function save(){
  const def=defs.find(d=>d.id===defId);
  if(!def||!playerId||leftBest==null||rightBest==null){setMsg('Il faut au moins un essai gauche et un essai droit.');return}
  const {data:{session}}=await supabase.auth.getSession();
  const {error}=await supabase.from('test_results').insert({organization_id:org,test_definition_id:def.id,player_id:playerId,tested_at:new Date(testedAt).toISOString(),trials:trials.map(t=>t.value),best_value:Math.round(lsi!*10)/10,mean_value:Math.round(((leftBest+rightBest)/2)*10)/10,device:'HDY LAB (mètre ruban)',evaluator_user_id:session?.user.id||null,context:{protocol:def.protocol,unit:def.unit,left_cm:leftBest,right_cm:rightBest,lsi_pct:Math.round(lsi!*10)/10,trials_detail:trials}});
  setMsg(error?error.message:`${def.name} enregistré : LSI ${lsi!.toFixed(1)} % ✓`);
  if(!error)setTrials([]);
 }

 if(!ready)return <main style={S.center}>Chargement…</main>;
 if(!ok)return <main style={S.center}>Accès staff requis.</main>;

 return <main style={S.main}>
  <header style={S.header}>
   <div><span style={S.kicker}>HDY LAB</span><h1>Hop-tests (retour au jeu)</h1><p>Batterie standard de retour au jeu : saut unipodal, triple saut, crossover hop — distance mesurée au mètre ruban (plus fiable qu’une estimation vidéo pour ce type de mesure). LSI = jambe la plus faible / jambe la plus forte.</p></div>
   <a href='/admin/sport/lab' style={S.back}>← HDY LAB</a>
  </header>

  <section style={S.toolbar}>
   <label>Environnement<select value={org} onChange={e=>setOrg(e.target.value)} style={S.input}>{environments.map(e=><option key={e.id} value={e.id}>{e.branding?.label||e.name}</option>)}</select></label>
   {usesTeams(org)&&<label>Équipe<select value={team} onChange={e=>setTeam(e.target.value)} style={S.input}><option value=''>Toutes les équipes</option>{teamsFor(org).map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>}
   <label>Joueur<select value={playerId} onChange={e=>setPlayerId(e.target.value)} style={S.input}>{scoped.map(p=><option key={p.id} value={p.id}>{p.display_name||`${p.first_name} ${p.last_name}`}</option>)}</select></label>
   <label>Test<select value={defId} onChange={e=>setDefId(e.target.value)} style={S.input}>{visibleDefs.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
  </section>

  <div style={S.notice}>Pour le 6m Timed Hop (avec asymétrie chronométrée), utilise l’outil <a href='/admin/sport/lab/sprint' style={{color:'#fff'}}>Sprint (chrono vidéo)</a> avec la vidéo unique et une distance de 6 m.</div>
  {msg&&<div style={S.notice}>{msg}</div>}

  <section style={S.grid}>
   <article style={S.card}>
    <h2>1 · Saisir un essai</h2>
    <label>Jambe testée<select value={side} onChange={e=>setSide(e.target.value as Side)} style={S.input}><option value='left'>Gauche</option><option value='right'>Droite</option></select></label>
    <label>Distance (cm)<input type='number' value={distance} onChange={e=>setDistance(e.target.value)} style={S.input}/></label>
    <button onClick={addTrial} style={S.primary}>Ajouter cet essai</button>
   </article>

   <article style={S.card}>
    <h2>2 · Essais enregistrés</h2>
    {!trials.length&&<p style={S.hint}>Aucun essai pour l’instant.</p>}
    {trials.map((t,i)=><div key={i} style={S.row}><span><b>Essai {i+1} · {t.side==='left'?'G':'D'}</b></span><span style={S.rowRight}><strong>{t.value} cm</strong><button onClick={()=>removeTrial(i)} style={S.remove}>Retirer</button></span></div>)}
    <div style={S.notice}>Gauche : {leftBest??'—'} cm · Droite : {rightBest??'—'} cm{lsi!=null?` · LSI ${lsi.toFixed(1)} %`:''}</div>
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
 primary:{border:0,borderRadius:10,padding:'12px 15px',fontWeight:850,color:'#fff',background:'#E31E24',cursor:'pointer'},
 row:{display:'flex',justifyContent:'space-between',gap:10,padding:'10px 0',borderBottom:'1px solid #2B2B31'},
 rowRight:{display:'flex',alignItems:'center',gap:10},
 remove:{border:'1px solid #2B2B31',background:'transparent',color:'#A1A1AA',borderRadius:8,padding:'4px 8px',cursor:'pointer',fontSize:12},
};
