'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useOrg } from '@/lib/org-context';

type Row=Record<string,any>;
const SCREEN_NAMES=['Overhead Squat','Overhead Lunge','Lateral Overhead Squat'];
const CRITERIA_LABELS:Record<string,string>={
 heels_rise:'Talons qui décollent',
 knee_valgus:'Genou/genoux qui rentrent (valgus)',
 knees_valgus:'Genoux qui rentrent (valgus)',
 forward_lean:'Inclinaison excessive du tronc en avant',
 arms_fall_forward:'Bras qui tombent vers l’avant',
 asymmetric_shift:'Déplacement de poids asymétrique',
 trunk_rotation:'Rotation du tronc',
 balance_loss:'Perte d’équilibre',
 trunk_lean:'Inclinaison latérale du tronc',
};
const SCORES=[
 {value:3,label:'3 · Aucune compensation'},
 {value:2,label:'2 · Compensations mineures'},
 {value:1,label:'1 · Compensations majeures'},
 {value:0,label:'0 · Douleur / mouvement impossible'},
];

export default function ScreenLabPage(){
 const {environments,currentEnvId:org,setCurrentEnvId:setOrg,currentTeamId:team,setCurrentTeamId:setTeam,teamsFor,usesTeams}=useOrg();
 const [ready,setReady]=useState(false),[ok,setOk]=useState(false),[players,setPlayers]=useState<Row[]>([]),[defs,setDefs]=useState<Row[]>([]),[results,setResults]=useState<Row[]>([]);
 const [playerId,setPlayerId]=useState(''),[defId,setDefId]=useState(''),[side,setSide]=useState<'left'|'right'|''>(''),[score,setScore]=useState(3),[flagged,setFlagged]=useState<string[]>([]),[notes,setNotes]=useState(''),[testedAt,setTestedAt]=useState(new Date().toISOString().slice(0,16)),[msg,setMsg]=useState('');

 async function load(){const [p,d,r]=await Promise.all([supabase.from('players').select('*').eq('active',true),supabase.from('test_definitions').select('*').eq('active',true).eq('category','functional'),supabase.from('test_results').select('*').order('tested_at',{ascending:false}).limit(100)]);setPlayers(p.data||[]);setDefs((d.data||[]).filter(x=>SCREEN_NAMES.includes(x.name)));setResults(r.data||[])}
 useEffect(()=>{(async()=>{const {data:{session}}=await supabase.auth.getSession();if(!session){setReady(true);return}const [{data:p},{data:m}]=await Promise.all([supabase.from('profiles').select('is_super_admin').eq('user_id',session.user.id).maybeSingle(),supabase.from('memberships').select('id').eq('user_id',session.user.id).eq('active',true).limit(1)]);if(!p?.is_super_admin&&!m?.length){setReady(true);return}setOk(true);await load();setReady(true)})()},[]);

 const scoped=useMemo(()=>players.filter(p=>p.organization_id===org&&(!usesTeams(org)||!team||p.team_id===team)),[players,org,team,usesTeams]);
 const visibleDefs=useMemo(()=>defs.filter(d=>d.organization_id===org||d.organization_id===null),[defs,org]);
 useEffect(()=>{if(!scoped.some(p=>p.id===playerId))setPlayerId(scoped[0]?.id||'')},[scoped,playerId]);
 useEffect(()=>{if(!visibleDefs.some(d=>d.id===defId))setDefId(visibleDefs[0]?.id||'')},[visibleDefs,defId]);

 const def=defs.find(d=>d.id===defId);
 const criteria:string[]=def?.config?.criteria||[];
 const isLateral=def?.name==='Lateral Overhead Squat';
 useEffect(()=>{setFlagged([]);setScore(3);setNotes('');if(!isLateral)setSide('')},[defId,isLateral]);

 function toggle(c:string){setFlagged(f=>f.includes(c)?f.filter(x=>x!==c):[...f,c])}

 async function save(){
  if(!def||!playerId){setMsg('Sélectionne un joueur et un écran fonctionnel.');return}
  if(isLateral&&!side){setMsg('Choisis le côté testé.');return}
  const {data:{session}}=await supabase.auth.getSession();
  const {error}=await supabase.from('test_results').insert({organization_id:org,test_definition_id:def.id,player_id:playerId,tested_at:new Date(testedAt).toISOString(),trials:[score],best_value:score,mean_value:score,device:'HDY LAB (observation)',evaluator_user_id:session?.user.id||null,context:{protocol:def.protocol,unit:def.unit,side:side||null,compensations:flagged,notes:notes||null}});
  setMsg(error?error.message:`${def.name} enregistré : score ${score} ✓`);
  if(!error){setFlagged([]);setScore(3);setNotes('');await load()}
 }

 const visibleResults=useMemo(()=>results.filter(r=>SCREEN_NAMES.includes(defs.find(d=>d.id===r.test_definition_id)?.name)&&scoped.some(p=>p.id===r.player_id)),[results,defs,scoped]);

 if(!ready)return <main style={S.center}>Chargement…</main>;
 if(!ok)return <main style={S.center}>Accès staff requis.</main>;

 return <main style={S.main}>
  <header style={S.header}>
   <div><span style={S.kicker}>HDY LAB</span><h1>Écrans fonctionnels</h1><p>Overhead Squat, Overhead Lunge, Lateral Overhead Squat — observation en direct ou sur vidéo, notée par compensation (comme un dépistage FMS).</p></div>
   <a href='/admin/sport/lab' style={S.back}>← HDY LAB</a>
  </header>

  <section style={S.toolbar}>
   <label>Environnement<select value={org} onChange={e=>setOrg(e.target.value)} style={S.input}>{environments.map(e=><option key={e.id} value={e.id}>{e.branding?.label||e.name}</option>)}</select></label>
   {usesTeams(org)&&<label>Équipe<select value={team} onChange={e=>setTeam(e.target.value)} style={S.input}><option value=''>Toutes les équipes</option>{teamsFor(org).map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>}
  </section>

  {msg&&<div style={S.notice}>{msg}</div>}

  <section style={S.grid}>
   <article style={S.card}>
    <h2>Nouvelle observation</h2>
    <label>Joueur<select value={playerId} onChange={e=>setPlayerId(e.target.value)} style={S.input}>{scoped.map(p=><option key={p.id} value={p.id}>{p.display_name||`${p.first_name} ${p.last_name}`}</option>)}</select></label>
    <label>Écran<select value={defId} onChange={e=>setDefId(e.target.value)} style={S.input}>{visibleDefs.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
    {def&&<p style={S.hint}>{def.protocol}</p>}
    {isLateral&&<label>Côté testé<select value={side} onChange={e=>setSide(e.target.value as any)} style={S.input}><option value=''>—</option><option value='left'>Gauche</option><option value='right'>Droite</option></select></label>}
    <div>
     <b style={S.subhead}>Compensations observées</b>
     {criteria.map(c=><label key={c} style={S.checkRow}><input type='checkbox' checked={flagged.includes(c)} onChange={()=>toggle(c)}/> {CRITERIA_LABELS[c]||c}</label>)}
    </div>
    <label>Score global<select value={score} onChange={e=>setScore(Number(e.target.value))} style={S.input}>{SCORES.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}</select></label>
    <label>Notes<textarea value={notes} onChange={e=>setNotes(e.target.value)} style={{...S.input,height:70,paddingTop:8}}/></label>
    <label>Date / heure<input type='datetime-local' value={testedAt} onChange={e=>setTestedAt(e.target.value)} style={S.input}/></label>
    <button onClick={save} style={S.primary}>Enregistrer l’observation</button>
   </article>

   <article style={S.card}>
    <h2>Dernières observations</h2>
    {visibleResults.slice(0,25).map(r=>{const p=players.find(x=>x.id===r.player_id),d=defs.find(x=>x.id===r.test_definition_id);return <div key={r.id} style={S.row}><span><b>{p?.display_name||`${p?.first_name||''} ${p?.last_name||''}`}</b><small>{d?.name||'Écran'}{r.context?.side?` · ${r.context.side==='left'?'G':'D'}`:''}</small></span><strong>{r.best_value}/3</strong></div>})}
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
 subhead:{fontSize:12,letterSpacing:.6,color:'#A1A1AA',display:'block',marginBottom:6},
 checkRow:{display:'flex',alignItems:'center',gap:8,padding:'6px 0',fontSize:14},
 primary:{border:0,borderRadius:10,padding:'12px 15px',fontWeight:850,color:'#fff',background:'#E31E24',cursor:'pointer'},
 row:{display:'flex',justifyContent:'space-between',gap:10,padding:'10px 0',borderBottom:'1px solid #2B2B31'},
};
