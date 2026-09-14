'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useOrg } from '@/lib/org-context';
import FrameScrubber from '@/components/FrameScrubber';
import { heightFromFlightMs } from '@/lib/lab-calc';

type Row=Record<string,any>;
type ApiResult={
 test_id:string|null;status:'valid'|'invalid';issues:{code:string;message:string;trialNumber?:number}[];
 f0:number|null;v0:number|null;sfv:number|null;pmax:number|null;pmax_relative:number|null;
 sfv_optimal:number|null;profile_optimal_percent:number|null;fv_imbalance_percent:number|null;deficit_type:string;
 r_squared:number|null;quality:'HIGH'|'MEDIUM'|'LOW'|null;model_version:string;
};
type LocalTrial={loadKg:number;heightCm:number};
const FPS_OPTIONS=[30,60,120,240];
type View='pro'|'player';

const DEFICIT_LABEL:Record<string,string>={force:'FORCE DEFICIT',balanced:'BALANCED',velocity:'VELOCITY DEFICIT',unavailable:'—'};
const DEFICIT_COLOR:Record<string,string>={force:'#E31E24',balanced:'#22C55E',velocity:'#F59E0B',unavailable:'#71717A'};
const PLAYER_MESSAGE:Record<string,string>={
 force:'Ton profil présente actuellement un déficit relatif de force. Le travail doit progressivement augmenter ta capacité à produire de la force à vitesse élevée.',
 balanced:'Ton profil force-vitesse est actuellement bien équilibré par rapport à ton optimum individuel. Le travail peut couvrir l’ensemble du spectre (force, force-vitesse, vitesse).',
 velocity:'Ton profil présente actuellement un déficit relatif de vitesse. Le travail doit progressivement augmenter ta capacité à produire de la vitesse à charge légère.',
};
// v0_opt / f0_opt ne sont pas stockés en base (seul sfv_optimal l'est) — ils
// se retrouvent simplement à partir de Pmax = F0·V0/4 et Sfv = -F0/V0.
function optimalPoint(sfvOpt:number|null,pmaxRelative:number|null){
 if(sfvOpt==null||pmaxRelative==null||sfvOpt>=0)return null;
 const v0Opt=Math.sqrt((-4*pmaxRelative)/sfvOpt);
 const f0OptRel=-sfvOpt*v0Opt;
 return {v0Opt,f0OptRel};
}

export default function ForceVelocityLabPage(){
 const {environments,currentEnvId:org,setCurrentEnvId:setOrg,currentTeamId:team,setCurrentTeamId:setTeam,teamsFor,usesTeams}=useOrg();
 const [ready,setReady]=useState(false),[ok,setOk]=useState(false),[players,setPlayers]=useState<Row[]>([]);
 const [playerId,setPlayerId]=useState(''),[testedAt,setTestedAt]=useState(new Date().toISOString().slice(0,10)),[msg,setMsg]=useState('');
 const [view,setView]=useState<View>('pro');
 const [pushOffCm,setPushOffCm]=useState(''),[loadKg,setLoadKg]=useState('0');
 const [videoUrl,setVideoUrl]=useState(''),[fps,setFps]=useState(240);
 const [duration,setDuration]=useState(0),[cur,setCur]=useState(0),[playing,setPlaying]=useState(false);
 const [markA,setMarkA]=useState<number|null>(null),[markB,setMarkB]=useState<number|null>(null);
 const [trials,setTrials]=useState<LocalTrial[]>([]);
 const [result,setResult]=useState<ApiResult|null>(null);
 const [history,setHistory]=useState<Row[]>([]);
 const [saving,setSaving]=useState(false);

 async function load(){const {data:p}=await supabase.from('players').select('*').eq('active',true);setPlayers(p||[])}
 useEffect(()=>{(async()=>{const {data:{session}}=await supabase.auth.getSession();if(!session){setReady(true);return}const [{data:p},{data:m}]=await Promise.all([supabase.from('profiles').select('is_super_admin').eq('user_id',session.user.id).maybeSingle(),supabase.from('memberships').select('id').eq('user_id',session.user.id).eq('active',true).limit(1)]);if(!p?.is_super_admin&&!m?.length){setReady(true);return}setOk(true);await load();setReady(true)})()},[]);

 const scoped=useMemo(()=>players.filter(p=>p.organization_id===org&&(!usesTeams(org)||!team||p.team_id===team)),[players,org,team,usesTeams]);
 useEffect(()=>{if(!scoped.some(p=>p.id===playerId))setPlayerId(scoped[0]?.id||'')},[scoped,playerId]);
 const player=scoped.find(p=>p.id===playerId);
 useEffect(()=>{return()=>{if(videoUrl)URL.revokeObjectURL(videoUrl)}},[videoUrl]);
 useEffect(()=>{setTrials([]);setMarkA(null);setMarkB(null);setResult(null)},[playerId]);

 async function loadHistory(pid:string){
  const {data:{session}}=await supabase.auth.getSession();if(!session)return;
  const res=await fetch(`/api/performance/fv-profile?athlete_id=${pid}`,{headers:{Authorization:`Bearer ${session.access_token}`}});
  if(res.ok){const j=await res.json();setHistory(j.tests||[])}
 }
 useEffect(()=>{if(playerId)loadHistory(playerId)},[playerId]);

 function onFile(e:React.ChangeEvent<HTMLInputElement>){const f=e.target.files?.[0];if(!f)return;if(videoUrl)URL.revokeObjectURL(videoUrl);setVideoUrl(URL.createObjectURL(f));setDuration(0);setCur(0);setPlaying(false);setMarkA(null);setMarkB(null)}

 const flightMs=markA!=null&&markB!=null&&markB>markA?(markB-markA)*1000:null;
 const heightCm=flightMs!=null?heightFromFlightMs(flightMs):null;

 function addTrial(){
  const loadVal=Number(loadKg);
  if(heightCm==null||!Number.isFinite(loadVal)||loadVal<0){setMsg('Marque l’envol puis la réception, avec une charge valide (0 = poids de corps).');return}
  setTrials(t=>[...t,{loadKg:loadVal,heightCm:Math.round(heightCm*10)/10}]);setMarkA(null);setMarkB(null);setMsg('');
 }
 function removeTrial(i:number){setTrials(t=>t.filter((_,idx)=>idx!==i))}

 async function save(){
  if(!playerId||!player?.weight_kg){setMsg('Sélectionne un joueur dont la masse corporelle est renseignée.');return}
  if(!pushOffCm){setMsg('Renseigne la distance de poussée mesurée (pas une estimation).');return}
  if(trials.length<2){setMsg('Il faut au moins 2 essais à des charges différentes.');return}
  setSaving(true);setMsg('');
  const {data:{session}}=await supabase.auth.getSession();
  if(!session){setMsg('Session expirée.');setSaving(false);return}
  const res=await fetch('/api/performance/fv-profile',{
   method:'POST',
   headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},
   body:JSON.stringify({
    athlete_id:playerId,test_date:testedAt,test_type:'vertical',protocol:'Sauts chargés — vidéo (temps de vol)',
    body_mass_kg:player.weight_kg,push_off_distance_m:Number(pushOffCm)/100,
    trials:trials.map(t=>({additional_load_kg:t.loadKg,jump_height_m:t.heightCm/100,measurement_method:'flight_time'})),
   }),
  });
  const j:ApiResult|{error:string}=await res.json();
  setSaving(false);
  if(!res.ok||'error' in j){setMsg((j as any).error||'Erreur inconnue.');return}
  setResult(j);
  if(j.status==='valid'){setTrials([]);setMarkA(null);setMarkB(null);await loadHistory(playerId)}
 }

 if(!ready)return <main style={S.center}>Chargement…</main>;
 if(!ok)return <main style={S.center}>Accès staff requis.</main>;

 const opt=result?optimalPoint(result.sfv_optimal,result.pmax_relative):null;
 const maxV=Math.max(result?.v0||0,opt?.v0Opt||0)*1.15||1;
 const maxF=Math.max(result?.f0!=null&&player?.weight_kg?result.f0/player.weight_kg:0,opt?.f0OptRel||0)*1.15||1;

 return <main style={S.main}>
  <header style={S.header}>
   <div><span style={S.kicker}>HDY LAB</span><h1>Profil Force-Vitesse</h1><p>Sauts chargés mesurés au temps de vol. F0, V0, Pmax, profil optimal et FV imbalance calculés par le moteur lib/performance/fv (Samozino et al. 2012, formules et référence documentées dans le code — push-off vertical).</p></div>
   <div style={{display:'flex',gap:8,alignItems:'flex-start'}}>
    <button onClick={()=>setView(v=>v==='pro'?'player':'pro')} style={S.viewToggle}>{view==='pro'?'Vue préparateur':'Vue joueur'}</button>
    <a href='/admin/sport/lab' style={S.back}>← HDY LAB</a>
   </div>
  </header>

  <section style={S.toolbar}>
   <label>Environnement<select value={org} onChange={e=>setOrg(e.target.value)} style={S.input}>{environments.map(e=><option key={e.id} value={e.id}>{e.branding?.label||e.name}</option>)}</select></label>
   {usesTeams(org)&&<label>Équipe<select value={team} onChange={e=>setTeam(e.target.value)} style={S.input}><option value=''>Toutes les équipes</option>{teamsFor(org).map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>}
   <label>Joueur<select value={playerId} onChange={e=>setPlayerId(e.target.value)} style={S.input}>{scoped.map(p=><option key={p.id} value={p.id}>{p.display_name||`${p.first_name} ${p.last_name}`}</option>)}</select></label>
   <label>Distance de poussée mesurée (cm)<input type='number' value={pushOffCm} onChange={e=>setPushOffCm(e.target.value)} placeholder='ex : 42' style={S.input}/></label>
  </section>

  {!player?.weight_kg&&<div style={S.notice}>Masse corporelle du joueur non renseignée : indispensable pour ce test. Renseigne-la dans la fiche joueur.</div>}
  {msg&&<div style={S.notice}>{msg}</div>}

  {view==='pro'?<section style={S.grid}>
   <article style={S.card}>
    <h2>1 · Un essai par charge</h2>
    <p style={S.hint}>Filme chaque CMJ (poids de corps puis charges croissantes), marque l’envol et la réception. Au moins 2 charges différentes, 4-5 recommandé.</p>
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

    <label>Date<input type='date' value={testedAt} onChange={e=>setTestedAt(e.target.value)} style={S.input}/></label>
    <button onClick={save} style={S.primary} disabled={saving}>{saving?'Calcul…':'Enregistrer le profil'}</button>

    {result&&result.status==='invalid'&&<div style={S.notice}><b>Données invalides :</b>{result.issues.map((iss,i)=><div key={i}>· {iss.message}</div>)}</div>}

    {result&&result.status==='valid'&&<>
     <svg viewBox='0 0 300 240' style={S.chart}>
      <line x1={20} y1={220} x2={280} y2={220} stroke='#2B2B31'/>
      <line x1={20} y1={20} x2={20} y2={220} stroke='#2B2B31'/>
      {opt&&<line x1={20} y1={220-(opt.f0OptRel/maxF)*200} x2={20+(opt.v0Opt/maxV)*260} y2={220} stroke='#71717A' strokeDasharray='4 3' strokeWidth={2}/>}
      {result.f0!=null&&result.v0!=null&&player?.weight_kg&&<line x1={20} y1={220-((result.f0/player.weight_kg)/maxF)*200} x2={20+(result.v0/maxV)*260} y2={220} stroke='#E31E24' strokeWidth={2}/>}
      <g transform='translate(24,30)' fontSize='9' fill='#D4D4D8'><rect width='8' height='8' fill='#E31E24'/><text x='12' y='8'>REAL PROFILE</text></g>
      {opt&&<g transform='translate(24,44)' fontSize='9' fill='#D4D4D8'><rect width='8' height='8' fill='#71717A'/><text x='12' y='8'>OPTIMAL PROFILE</text></g>}
     </svg>
     <div style={S.statsGrid}>
      <div><b>{result.pmax_relative?.toFixed(1)}</b><small>Pmax (W/kg)</small></div>
      <div><b>{result.f0!=null&&player?.weight_kg?(result.f0/player.weight_kg).toFixed(1):'—'}</b><small>F0 (N/kg)</small></div>
      <div><b>{result.v0?.toFixed(2)}</b><small>V0 (m/s)</small></div>
     </div>
     <div style={S.statsGrid}>
      <div><b>{result.sfv?.toFixed(0)}</b><small>Sfv (N·s/m)</small></div>
      <div><b>{result.r_squared?.toFixed(3)}</b><small>R²</small></div>
      <div><b style={{color:result.quality==='HIGH'?'#22C55E':result.quality==='MEDIUM'?'#F59E0B':'#E31E24'}}>{result.quality}</b><small>Qualité du profil</small></div>
     </div>

     {result.deficit_type!=='unavailable'?<div style={S.optCard}>
      <div style={S.statsGrid}>
       <div><b>{result.profile_optimal_percent?.toFixed(0)}%</b><small>Profil actuel</small></div>
       <div><b>100%</b><small>Profil optimal</small></div>
       <div><b>{result.fv_imbalance_percent?.toFixed(0)}%</b><small>FV imbalance</small></div>
      </div>
      <div style={{...S.deficitBadge,background:DEFICIT_COLOR[result.deficit_type]}}>{DEFICIT_LABEL[result.deficit_type]}</div>
      <p style={S.hint}>Optimisation à titre indicatif — n’est pas une mesure directe de la performance (Pmax et hauteur de saut ci-dessus restent les indicateurs de performance). Le préparateur reste juge de l’orientation d’entraînement.</p>
     </div>:<div style={S.notice}>Profil optimal / FV imbalance indisponible pour ce test (distance de poussée ou Pmax hors du domaine de validité du modèle — voir les essais saisis).</div>}
    </>}
   </article>
  </section>:<section style={S.grid}>
   <article style={S.card}>
    <h2>Profil de {player?.display_name||player?.first_name}</h2>
    {result&&result.status==='valid'?<>
     <div style={S.playerStat}><b>{result.pmax_relative?.toFixed(1)} W/kg</b><span>Puissance maximale</span></div>
     {result.deficit_type!=='unavailable'?<>
      <div style={S.statsGrid}>
       <div><b>{result.profile_optimal_percent?.toFixed(0)}%</b><small>Profil</small></div>
       <div><b>{result.fv_imbalance_percent?.toFixed(0)}%</b><small>Déséquilibre</small></div>
       <div><b style={{color:DEFICIT_COLOR[result.deficit_type]}}>{DEFICIT_LABEL[result.deficit_type]}</b><small>Orientation</small></div>
      </div>
      <div style={S.notice}>{PLAYER_MESSAGE[result.deficit_type]}</div>
     </>:<div style={S.notice}>Profil optimal indisponible pour ce test.</div>}
    </>:<p style={S.hint}>Aucun profil calculé pour l’instant sur cette session.</p>}
   </article>
   <article style={S.card}><h2>Historique</h2>{!history.length&&<p style={S.hint}>Aucun test enregistré.</p>}
    {history.map(h=><div key={h.id} style={S.row}><span><b>{h.test_date}</b></span><span style={S.rowRight}><strong>{h.pmax_relative?.toFixed?.(1)??h.pmax_relative} W/kg</strong></span></div>)}
   </article>
  </section>}

  {view==='pro'&&<section style={S.card2}>
   <h2>Historique</h2>
   {!history.length&&<p style={S.hint}>Aucun test enregistré pour ce joueur.</p>}
   {!!history.length&&<div style={{overflowX:'auto'}}>
    <table style={S.table}>
     <thead><tr><th>Date</th><th>Pmax (W/kg)</th><th>F0 (N/kg)</th><th>V0 (m/s)</th><th>R²</th><th>Qualité</th><th>Orientation</th></tr></thead>
     <tbody>{history.map(h=><tr key={h.id}>
      <td>{h.test_date}</td>
      <td>{h.pmax_relative!=null?Number(h.pmax_relative).toFixed(1):'—'}</td>
      <td>{h.f0!=null?(Number(h.f0)/Number(h.body_mass_kg)).toFixed(1):'—'}</td>
      <td>{h.v0!=null?Number(h.v0).toFixed(2):'—'}</td>
      <td>{h.r_squared!=null?Number(h.r_squared).toFixed(3):'—'}</td>
      <td>{h.quality||'—'}</td>
      <td><span style={{color:DEFICIT_COLOR[h.deficit_type||'unavailable']}}>{DEFICIT_LABEL[h.deficit_type||'unavailable']}</span></td>
     </tr>)}</tbody>
    </table>
   </div>}
  </section>}
 </main>
}

const S:Record<string,React.CSSProperties>={
 center:{minHeight:'80vh',display:'grid',placeItems:'center'},
 main:{minHeight:'100vh',background:'#09090B',color:'#FAFAFA',fontFamily:'Inter,system-ui,sans-serif',padding:28},
 header:{maxWidth:1200,margin:'0 auto 20px',display:'flex',justifyContent:'space-between',gap:20},
 kicker:{fontSize:11,fontWeight:900,letterSpacing:1.4,color:'#E31E24'},
 back:{color:'#fff',textDecoration:'none',border:'1px solid #2B2B31',padding:'10px 12px',borderRadius:10,height:'fit-content'},
 viewToggle:{color:'#fff',border:'1px solid #2B2B31',background:'#1B1B1F',padding:'10px 12px',borderRadius:10,height:'fit-content',cursor:'pointer'},
 toolbar:{maxWidth:1200,margin:'0 auto 16px',background:'#141416',border:'1px solid #2B2B31',borderRadius:16,padding:14,display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:12},
 input:{width:'100%',height:42,background:'#1B1B1F',color:'#fff',border:'1px solid #2B2B31',borderRadius:10,padding:'0 10px',marginTop:6,boxSizing:'border-box'},
 notice:{maxWidth:1200,margin:'0 auto 14px',background:'#141416',border:'1px solid #2B2B31',borderRadius:12,padding:12,fontSize:13,lineHeight:1.5,color:'#D4D4D8'},
 grid:{maxWidth:1200,margin:'0 auto',display:'grid',gridTemplateColumns:'minmax(320px,1.1fr) minmax(280px,.9fr)',gap:14},
 card:{background:'#141416',border:'1px solid #2B2B31',borderRadius:16,padding:16,display:'grid',gap:12,alignContent:'start'},
 card2:{maxWidth:1200,margin:'16px auto 0',background:'#141416',border:'1px solid #2B2B31',borderRadius:16,padding:16,display:'grid',gap:12},
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
 optCard:{border:'1px solid #2B2B31',borderRadius:12,padding:12,display:'grid',gap:10},
 deficitBadge:{textAlign:'center',borderRadius:8,padding:'8px 10px',fontWeight:900,fontSize:13,color:'#09090B'},
 playerStat:{display:'flex',flexDirection:'column',gap:4,alignItems:'center',padding:'20px 0'},
 table:{width:'100%',borderCollapse:'collapse',fontSize:13},
};
