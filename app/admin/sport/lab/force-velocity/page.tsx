'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useOrg } from '@/lib/org-context';
import FrameScrubber from '@/components/FrameScrubber';
import { heightFromFlightMs } from '@/lib/lab-calc';
import { computeFvProfile, type FvTrial } from '@/lib/fv-profile';

type Row=Record<string,any>;
const FPS_OPTIONS=[30,60,120,240];

export default function ForceVelocityLabPage(){
 const {environments,currentEnvId:org,setCurrentEnvId:setOrg,currentTeamId:team,setCurrentTeamId:setTeam,teamsFor,usesTeams}=useOrg();
 const [ready,setReady]=useState(false),[ok,setOk]=useState(false),[players,setPlayers]=useState<Row[]>([]),[def,setDef]=useState<Row|null>(null);
 const [playerId,setPlayerId]=useState(''),[testedAt,setTestedAt]=useState(new Date().toISOString().slice(0,16)),[msg,setMsg]=useState('');
 const [pushOffCm,setPushOffCm]=useState(''),[loadKg,setLoadKg]=useState('0');
 const [videoUrl,setVideoUrl]=useState(''),[fps,setFps]=useState(240);
 const [duration,setDuration]=useState(0),[cur,setCur]=useState(0),[playing,setPlaying]=useState(false);
 const [markA,setMarkA]=useState<number|null>(null),[markB,setMarkB]=useState<number|null>(null);
 const [trials,setTrials]=useState<FvTrial[]>([]);

 async function load(){const [p,d]=await Promise.all([supabase.from('players').select('*').eq('active',true),supabase.from('test_definitions').select('*').eq('active',true).eq('category','force_velocity').maybeSingle()]);setPlayers(p.data||[]);setDef(d.data||null)}
 useEffect(()=>{(async()=>{const {data:{session}}=await supabase.auth.getSession();if(!session){setReady(true);return}const [{data:p},{data:m}]=await Promise.all([supabase.from('profiles').select('is_super_admin').eq('user_id',session.user.id).maybeSingle(),supabase.from('memberships').select('id').eq('user_id',session.user.id).eq('active',true).limit(1)]);if(!p?.is_super_admin&&!m?.length){setReady(true);return}setOk(true);await load();setReady(true)})()},[]);

 const scoped=useMemo(()=>players.filter(p=>p.organization_id===org&&(!usesTeams(org)||!team||p.team_id===team)),[players,org,team,usesTeams]);
 useEffect(()=>{if(!scoped.some(p=>p.id===playerId))setPlayerId(scoped[0]?.id||'')},[scoped,playerId]);
 const player=scoped.find(p=>p.id===playerId);
 useEffect(()=>{return()=>{if(videoUrl)URL.revokeObjectURL(videoUrl)}},[videoUrl]);
 useEffect(()=>{setTrials([]);setMarkA(null);setMarkB(null)},[playerId]);

 function onFile(e:React.ChangeEvent<HTMLInputElement>){const f=e.target.files?.[0];if(!f)return;if(videoUrl)URL.revokeObjectURL(videoUrl);setVideoUrl(URL.createObjectURL(f));setDuration(0);setCur(0);setPlaying(false);setMarkA(null);setMarkB(null)}

 const flightMs=markA!=null&&markB!=null&&markB>markA?(markB-markA)*1000:null;
 const heightCm=flightMs!=null?heightFromFlightMs(flightMs):null;

 function addTrial(){
  const load=Number(loadKg);
  if(heightCm==null||!Number.isFinite(load)||load<0){setMsg('Marque l’envol puis la réception, avec une charge valide (0 = poids de corps).');return}
  setTrials(t=>[...t,{loadKg:load,heightCm:Math.round(heightCm*10)/10}]);setMarkA(null);setMarkB(null);setMsg('');
 }
 function removeTrial(i:number){setTrials(t=>t.filter((_,idx)=>idx!==i))}

 const profile=useMemo(()=>player?.weight_kg&&pushOffCm?computeFvProfile(trials,player.weight_kg,Number(pushOffCm)):null,[trials,player,pushOffCm]);

 async function save(){
  if(!def){setMsg('Le protocole force-vitesse n’est pas encore configuré (migration manquante).');return}
  if(!playerId||!player?.weight_kg){setMsg('Sélectionne un joueur dont la masse corporelle est renseignée.');return}
  if(!pushOffCm){setMsg('Renseigne la distance de poussée (mesurée, du bas de la position de départ à l’extension complète).');return}
  if(!profile){setMsg('Il faut au moins 2 essais à des charges différentes.');return}
  const {data:{session}}=await supabase.auth.getSession();
  const relF0=profile.f0/player.weight_kg, relPmax=profile.pmax/player.weight_kg;
  const {error}=await supabase.from('test_results').insert({organization_id:org,test_definition_id:def.id,player_id:playerId,tested_at:new Date(testedAt).toISOString(),trials:trials.map(t=>t.heightCm),best_value:Math.round(relPmax*10)/10,mean_value:Math.round(relF0*10)/10,device:'HDY LAB (vidéo)',evaluator_user_id:session?.user.id||null,context:{protocol:def.protocol,push_off_distance_cm:Number(pushOffCm),body_mass_kg:player.weight_kg,f0_n:Math.round(profile.f0),v0_ms:Math.round(profile.v0*100)/100,sfv:Math.round(profile.sfv),pmax_w:Math.round(profile.pmax),rel_f0_n_kg:Math.round(relF0*10)/10,rel_pmax_w_kg:Math.round(relPmax*10)/10,trials_detail:trials}});
  setMsg(error?error.message:`Profil enregistré : Pmax ${relPmax.toFixed(1)} W/kg, F0 ${relF0.toFixed(1)} N/kg ✓`);
  if(!error){setTrials([]);setMarkA(null);setMarkB(null)}
 }

 if(!ready)return <main style={S.center}>Chargement…</main>;
 if(!ok)return <main style={S.center}>Accès staff requis.</main>;

 const maxV=profile?profile.v0*1.15:1, maxF=profile?profile.f0*1.15:1;
 const toX=(v:number)=>20+ (v/maxV)*260, toY=(f:number)=>220-(f/maxF)*200;

 return <main style={S.main}>
  <header style={S.header}>
   <div><span style={S.kicker}>HDY LAB</span><h1>Profil Force-Vitesse</h1><p>Sauts chargés (poids de corps + charges croissantes), mesurés au temps de vol. F0, V0 et Pmax obtenus par régression linéaire (méthode Samozino). Nécessite au moins 2 charges différentes.</p></div>
   <a href='/admin/sport/lab' style={S.back}>← HDY LAB</a>
  </header>

  <section style={S.toolbar}>
   <label>Environnement<select value={org} onChange={e=>setOrg(e.target.value)} style={S.input}>{environments.map(e=><option key={e.id} value={e.id}>{e.branding?.label||e.name}</option>)}</select></label>
   {usesTeams(org)&&<label>Équipe<select value={team} onChange={e=>setTeam(e.target.value)} style={S.input}><option value=''>Toutes les équipes</option>{teamsFor(org).map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>}
   <label>Joueur<select value={playerId} onChange={e=>setPlayerId(e.target.value)} style={S.input}>{scoped.map(p=><option key={p.id} value={p.id}>{p.display_name||`${p.first_name} ${p.last_name}`}</option>)}</select></label>
   <label>Distance de poussée (cm)<input type='number' value={pushOffCm} onChange={e=>setPushOffCm(e.target.value)} placeholder='ex : 42' style={S.input}/></label>
  </section>

  {!player?.weight_kg&&<div style={S.notice}>Masse corporelle du joueur non renseignée : indispensable pour ce test. Renseigne-la dans la fiche joueur.</div>}
  {msg&&<div style={S.notice}>{msg}</div>}

  <section style={S.grid}>
   <article style={S.card}>
    <h2>1 · Un essai par charge</h2>
    <p style={S.hint}>Filme chaque CMJ (poids de corps puis charges croissantes), marque l’envol et la réception. Au moins 2 charges différentes.</p>
    <input type='file' accept='video/*' capture='environment' onChange={onFile} style={S.input}/>
    <div style={S.row2}>
     <label>Fréquence d’image<select value={fps} onChange={e=>setFps(Number(e.target.value))} style={S.input}>{FPS_OPTIONS.map(f=><option key={f} value={f}>{f} im/s</option>)}</select></label>
     <label>Charge de cet essai (kg)<input type='number' value={loadKg} onChange={e=>setLoadKg(e.target.value)} style={S.input}/></label>
    </div>
    {videoUrl&&<>
     <FrameScrubber videoUrl={videoUrl} fps={fps} cur={cur} duration={duration} playing={playing} onTime={setCur} onDuration={setDuration} onPlaying={setPlaying}/>
     <div style={S.markRow}>
      <button onClick={()=>setMarkA(cur)} style={S.markBtn}>Marquer l’envol{markA!=null?` · ${(markA*1000).toFixed(1)} ms`:''}</button>
      <button onClick={()=>setMarkB(cur)} style={S.markBtn}>Marquer la réception{markB!=null?` · ${(markB*1000).toFixed(1)} ms`:''}</button>
     </div>
     {heightCm!=null&&<div style={S.result}><b>{heightCm.toFixed(1)} cm</b><span>à {loadKg} kg</span></div>}
     <button onClick={addTrial} style={S.primary}>Ajouter cet essai</button>
    </>}
   </article>

   <article style={S.card}>
    <h2>2 · Essais & profil</h2>
    {!trials.length&&<p style={S.hint}>Aucun essai pour l’instant.</p>}
    {trials.map((t,i)=><div key={i} style={S.row}><span><b>{t.loadKg} kg</b></span><span style={S.rowRight}><strong>{t.heightCm} cm</strong><button onClick={()=>removeTrial(i)} style={S.remove}>Retirer</button></span></div>)}

    {profile&&player?.weight_kg&&<>
     <svg viewBox='0 0 300 240' style={S.chart}>
      <line x1={20} y1={220} x2={280} y2={220} stroke='#2B2B31'/>
      <line x1={20} y1={20} x2={20} y2={220} stroke='#2B2B31'/>
      <line x1={toX(0)} y1={toY(profile.f0)} x2={toX(profile.v0)} y2={toY(0)} stroke='#E31E24' strokeWidth={2}/>
      {profile.points.map((pt,i)=><circle key={i} cx={toX(pt.v)} cy={toY(pt.f)} r={4} fill='#fff'/>)}
     </svg>
     <div style={S.statsGrid}>
      <div><b>{(profile.pmax/player.weight_kg).toFixed(1)}</b><small>Pmax (W/kg)</small></div>
      <div><b>{(profile.f0/player.weight_kg).toFixed(1)}</b><small>F0 (N/kg)</small></div>
      <div><b>{profile.v0.toFixed(2)}</b><small>V0 (m/s)</small></div>
     </div>
    </>}
    {trials.length===1&&<p style={S.hint}>Ajoute au moins un 2ᵉ essai à une autre charge pour calculer le profil.</p>}

    <label>Date / heure<input type='datetime-local' value={testedAt} onChange={e=>setTestedAt(e.target.value)} style={S.input}/></label>
    <button onClick={save} style={S.primary}>Enregistrer le profil</button>
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
 row2:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12},
 markRow:{display:'flex',gap:8,flexWrap:'wrap'},
 markBtn:{flex:1,minWidth:150,height:44,borderRadius:10,border:'1px solid #2B2B31',background:'#1B1B1F',color:'#fff',fontWeight:700,cursor:'pointer'},
 result:{display:'flex',justifyContent:'space-between',alignItems:'baseline',border:'1px solid #2B2B31',borderRadius:12,padding:12},
 primary:{border:0,borderRadius:10,padding:'12px 15px',fontWeight:850,color:'#fff',background:'#E31E24',cursor:'pointer'},
 row:{display:'flex',justifyContent:'space-between',gap:10,padding:'10px 0',borderBottom:'1px solid #2B2B31'},
 rowRight:{display:'flex',alignItems:'center',gap:10},
 remove:{border:'1px solid #2B2B31',background:'transparent',color:'#A1A1AA',borderRadius:8,padding:'4px 8px',cursor:'pointer',fontSize:12},
 chart:{width:'100%',background:'#1B1B1F',borderRadius:12},
 statsGrid:{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,textAlign:'center'},
};
