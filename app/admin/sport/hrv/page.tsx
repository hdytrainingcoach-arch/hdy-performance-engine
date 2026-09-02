'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Row=Record<string,any>;
const ELITE='5454ad8f-8f2b-4812-9923-ab7d0b1f8748';

export default function HrvPage(){
 const [ready,setReady]=useState(false),[allowed,setAllowed]=useState(false),[msg,setMsg]=useState('');
 const [players,setPlayers]=useState<Row[]>([]),[playerId,setPlayerId]=useState('');
 const [headers,setHeaders]=useState<string[]>([]),[rows,setRows]=useState<Row[]>([]),[delimiter,setDelimiter]=useState(',');
 const [map,setMap]=useState<Row>({date:'',rmssd:'',lnrmssd:'',sdnn:'',rhr:'',readiness:'',sourceid:''});
 const [source,setSource]=useState('csv');
 const [hrv,setHrv]=useState<Row[]>([]),[hooper,setHooper]=useState<Row[]>([]),[rpe,setRpe]=useState<Row[]>([]);
 const selected=players.find(p=>p.id===playerId);

 useEffect(()=>{(async()=>{
  const {data:{session}}=await supabase.auth.getSession();
  if(!session){setReady(true);return}
  const [{data:profile},{data:membership},{data:p}]=await Promise.all([
   supabase.from('profiles').select('is_super_admin').eq('user_id',session.user.id).maybeSingle(),
   supabase.from('memberships').select('id').eq('user_id',session.user.id).eq('organization_id',ELITE).eq('active',true).limit(1).maybeSingle(),
   supabase.from('players').select('id,display_name,first_name,last_name,external_id').eq('organization_id',ELITE).eq('active',true).order('last_name')
  ]);
  if(profile?.is_super_admin||membership){setAllowed(true);setPlayers(p||[]);if(p?.[0])setPlayerId(p[0].id)}
  setReady(true);
 })()},[]);

 useEffect(()=>{if(playerId)loadDaily()},[playerId]);
 async function loadDaily(){
  const [h,q,r]=await Promise.all([
   supabase.from('hrv_records').select('*').eq('organization_id',ELITE).eq('player_id',playerId).order('measurement_date',{ascending:false}).limit(180),
   supabase.from('questionnaire_responses').select('answers,submitted_at').eq('organization_id',ELITE).eq('player_id',playerId).order('submitted_at',{ascending:false}).limit(250),
   supabase.from('session_rpe').select('rpe,actual_duration_min,load_ua,submitted_at').eq('organization_id',ELITE).eq('player_id',playerId).order('submitted_at',{ascending:false}).limit(250)
  ]);
  setHrv(h.data||[]);setHooper(q.data||[]);setRpe(r.data||[]);
 }

 async function fileChanged(file?:File){if(!file)return;const text=await file.text();const first=text.split(/\r?\n/).find(Boolean)||'';const d=(first.match(/;/g)||[]).length>(first.match(/,/g)||[]).length?';':',';setDelimiter(d);const parsed=parseCsv(text,d);if(!parsed.length)return;const hs=Object.keys(parsed[0]);setHeaders(hs);setRows(parsed);setMap({date:guess(hs,['date','day','measurement date','calendar date']),rmssd:guess(hs,['rmssd','hrv','r-mssd']),lnrmssd:guess(hs,['lnrmssd','ln rmssd','log rmssd']),sdnn:guess(hs,['sdnn']),rhr:guess(hs,['resting heart rate','resting hr','rhr','resting_hr']),readiness:guess(hs,['readiness','recovery','score']),sourceid:guess(hs,['id','record id','uuid'])});setMsg(`${parsed.length} ligne(s) détectée(s). Vérifie le mapping avant import.`)}

 async function importRows(){
  if(!playerId||!map.date){setMsg('Sélectionne un athlète et une colonne date.');return}
  const batch=crypto.randomUUID();let valid=0;const payload=rows.map((r,i)=>{
   const date=toDate(r[map.date]);const rmssd=num(r[map.rmssd]),ln=num(r[map.lnrmssd]),sdnn=num(r[map.sdnn]),rhrv=num(r[map.rhr]),ready=num(r[map.readiness]);
   if(!date||[rmssd,ln,sdnn,rhrv,ready].every(v=>v===null))return null;valid++;
   return {organization_id:ELITE,player_id:playerId,measurement_date:date,measured_at:null,source:source||'csv',source_record_id:map.sourceid?String(r[map.sourceid]||i):String(i),rmssd_ms:rmssd,ln_rmssd:ln,sdnn_ms:sdnn,resting_hr_bpm:rhrv,readiness_score:ready,raw_payload:r,import_batch_id:batch};
  }).filter(Boolean);
  if(!valid){setMsg('Aucune ligne HRV valide détectée.');return}
  const {error}=await supabase.from('hrv_records').upsert(payload,{onConflict:'organization_id,player_id,measurement_date,source,source_record_id',ignoreDuplicates:true});
  if(error){setMsg(error.message);return}setMsg(`${valid} mesure(s) HRV importée(s) ou déjà présentes ✓`);await loadDaily();
 }

 const daily=useMemo(()=>mergeDaily(hrv,hooper,rpe),[hrv,hooper,rpe]);
 const corrH=pearson(daily.map(x=>[x.rmssd,x.hooperTotal]).filter(pairValid));
 const corrR=pearson(daily.map(x=>[x.rmssd,x.srpe]).filter(pairValid));
 if(!ready)return <main style={S.center}>Chargement…</main>;
 if(!allowed)return <main style={S.center}>Accès HDY ELITE requis.</main>;
 return <main style={S.main}><header style={S.header}><div><span style={S.kicker}>HDY ELITE · MONITORING</span><h1 style={S.h1}>HRV · Hooper · RPE</h1><p style={S.sub}>Import CSV HRV et lecture journalière croisée. Corrélations descriptives uniquement, sans conclusion causale ni diagnostic.</p></div><a href='/admin/sport' style={S.back}>← Sport & Performance</a></header>
 <section style={S.grid}><article style={S.card}><h2>1. Athlète & CSV</h2><label>Athlète<select value={playerId} onChange={e=>setPlayerId(e.target.value)} style={S.input}>{players.map(p=><option key={p.id} value={p.id}>{p.display_name||`${p.first_name} ${p.last_name}`}</option>)}</select></label><label>Source<input value={source} onChange={e=>setSource(e.target.value)} placeholder='Whoop, Polar, Garmin…' style={S.input}/></label><label>Fichier CSV<input type='file' accept='.csv,text/csv' onChange={e=>fileChanged(e.target.files?.[0])} style={S.file}/></label>{rows.length>0&&<><small>{rows.length} lignes · séparateur détecté « {delimiter} »</small><div style={S.mapGrid}>{[['date','Date *'],['rmssd','RMSSD ms'],['lnrmssd','LnRMSSD'],['sdnn','SDNN ms'],['rhr','FC repos'],['readiness','Readiness'],['sourceid','ID source']].map(([k,l])=><label key={k}>{l}<select value={map[k]||''} onChange={e=>setMap({...map,[k]:e.target.value})} style={S.input}><option value=''>—</option>{headers.map(h=><option key={h}>{h}</option>)}</select></label>)}</div><button onClick={importRows} style={S.primary}>Importer HRV</button></>}{msg&&<p style={S.notice}>{msg}</p>}</article>
 <article style={S.card}><h2>2. Lecture croisée</h2><div style={S.corr}><div><small>RMSSD ↔ HOOPER</small><strong>{fmtCorr(corrH)}</strong></div><div><small>RMSSD ↔ sRPE</small><strong>{fmtCorr(corrR)}</strong></div></div><p style={S.muted}>Le sens et la force d’une corrélation ne prouvent pas une cause. L’interprétation reste individualisée et longitudinale.</p></article></section>
 <section style={S.card}><div style={S.tableWrap}><table style={S.table}><thead><tr>{['Date','RMSSD','LnRMSSD','SDNN','FC repos','Hooper /28','RPE moyen','sRPE total','Source'].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{daily.map(x=><tr key={x.date}><td><b>{x.date}</b></td><td>{show(x.rmssd)}</td><td>{show(x.lnrmssd)}</td><td>{show(x.sdnn)}</td><td>{show(x.rhr)}</td><td>{show(x.hooperTotal)}</td><td>{show(x.rpeAvg)}</td><td>{show(x.srpe)}</td><td>{x.source||'—'}</td></tr>)}</tbody></table></div>{!daily.length&&<p style={S.muted}>Aucune donnée pour {selected?.display_name||'cet athlète'}.</p>}</section>
 </main>
}

function parseCsv(text:string,d:string){const lines=text.split(/\r?\n/).filter(l=>l.trim());if(lines.length<2)return[];const split=(line:string)=>{const out:string[]=[];let cur='',q=false;for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'){if(q&&line[i+1]==='"'){cur+='"';i++}else q=!q}else if(c===d&&!q){out.push(cur.trim());cur=''}else cur+=c}out.push(cur.trim());return out};const h=split(lines[0]).map(x=>x.replace(/^\ufeff/,''));return lines.slice(1).map(line=>{const v=split(line);return Object.fromEntries(h.map((k,i)=>[k,v[i]??'']))})}
function guess(h:string[],keys:string[]){const norm=(s:string)=>s.toLowerCase().replace(/[_-]/g,' ').trim();for(const k of keys){const x=h.find(v=>norm(v)===norm(k)||norm(v).includes(norm(k)));if(x)return x}return''}
function num(v:any){if(v===undefined||v===null||v==='')return null;const n=Number(String(v).replace(',','.'));return Number.isFinite(n)?n:null}
function toDate(v:any){if(!v)return null;const s=String(v).trim();const m=s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})/);if(m)return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;const d=new Date(s);return Number.isNaN(d.getTime())?null:d.toISOString().slice(0,10)}
function mergeDaily(h:Row[],q:Row[],r:Row[]){const m=new Map<string,Row>();for(const x of h){const d=x.measurement_date;m.set(d,{date:d,rmssd:num(x.rmssd_ms),lnrmssd:num(x.ln_rmssd),sdnn:num(x.sdnn_ms),rhr:num(x.resting_hr_bpm),source:x.source})}for(const x of q){const d=String(x.submitted_at||'').slice(0,10);const a=x.answers||{};const total=num(a.hooper_total)??sum([a.sleep_quality,a.fatigue,a.soreness,a.stress]);const row=m.get(d)||{date:d};row.hooperTotal=total;m.set(d,row)}for(const x of r){const d=String(x.submitted_at||'').slice(0,10);const row=m.get(d)||{date:d};row._rpes=[...(row._rpes||[]),num(x.rpe)].filter((v:any)=>v!==null);row.srpe=(row.srpe||0)+(num(x.load_ua)??((num(x.rpe)||0)*(num(x.actual_duration_min)||0)));m.set(d,row)}for(const row of m.values()){if(row._rpes?.length)row.rpeAvg=Math.round((row._rpes.reduce((a:number,b:number)=>a+b,0)/row._rpes.length)*10)/10}return [...m.values()].sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,180)}
function sum(a:any[]){const n=a.map(num);return n.every(v=>v!==null)?n.reduce((x,y)=>x+(y||0),0):null}
function pairValid(x:any[]):x is [number,number]{return x.length===2&&x[0]!==null&&x[1]!==null&&Number.isFinite(x[0])&&Number.isFinite(x[1])}
function pearson(pairs:[number,number][]) {if(pairs.length<3)return null;const n=pairs.length,mx=pairs.reduce((s,p)=>s+p[0],0)/n,my=pairs.reduce((s,p)=>s+p[1],0)/n;let nume=0,dx=0,dy=0;for(const [x,y] of pairs){nume+=(x-mx)*(y-my);dx+=(x-mx)**2;dy+=(y-my)**2}return dx&&dy?nume/Math.sqrt(dx*dy):null}
function fmtCorr(v:number|null){return v===null?'n insuffisant':`${v>=0?'+':''}${v.toFixed(2)}`}
function show(v:any){return v===null||v===undefined||v===''?'—':String(v)}
const S:Record<string,React.CSSProperties>={center:{minHeight:'80vh',display:'grid',placeItems:'center',fontFamily:'system-ui'},main:{minHeight:'100vh',background:'#F4F4F5',color:'#111',fontFamily:'Inter,system-ui,sans-serif',padding:28},header:{maxWidth:1280,margin:'0 auto 22px',display:'flex',justifyContent:'space-between',gap:20,alignItems:'flex-start'},kicker:{fontSize:11,fontWeight:900,letterSpacing:1.5},h1:{fontSize:'clamp(38px,5vw,64px)',margin:'4px 0',letterSpacing:-2.5},sub:{color:'#71717A',maxWidth:760},back:{color:'#111',textDecoration:'none',border:'1px solid #D4D4D8',borderRadius:10,padding:'10px 12px'},grid:{maxWidth:1280,margin:'0 auto 14px',display:'grid',gridTemplateColumns:'1.5fr 1fr',gap:14},card:{maxWidth:1280,margin:'0 auto 14px',background:'#fff',border:'1px solid #E4E4E7',borderRadius:18,padding:18},input:{width:'100%',height:42,boxSizing:'border-box',margin:'6px 0 12px',border:'1px solid #D4D4D8',borderRadius:10,padding:'0 10px',background:'#fff'},file:{display:'block',margin:'8px 0 14px'},mapGrid:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:8},primary:{border:0,borderRadius:10,padding:'12px 15px',background:'#111',color:'#fff',fontWeight:850,cursor:'pointer'},notice:{background:'#F4F4F5',borderRadius:10,padding:10},corr:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10},muted:{color:'#71717A'},tableWrap:{overflowX:'auto'},table:{width:'100%',borderCollapse:'collapse',fontSize:13}};