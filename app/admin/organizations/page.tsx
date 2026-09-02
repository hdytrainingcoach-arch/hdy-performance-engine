'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Organization = { id:string; name:string; branding:{primary?:string;secondary?:string;background?:string;label?:string}|null };
type Team = { id:string; organization_id:string; name:string; category:string|null; season:string|null };
type Player = { id:string; organization_id:string; team_id:string|null; display_name:string|null; first_name:string; last_name:string; birth_date:string|null; birth_year:number|null; position:string|null; primary_position:string|null; status:string; height_cm:number|null; weight_kg:number|null; dossier_status:string; active:boolean };
type Comparison = { player_id:string; organization_id:string; team_id:string|null; display_name:string|null; first_name:string; last_name:string; position:string|null; age_years:number|null; height_cm:number|null; weight_kg:number|null; bmi:number|null; latest_tests:Record<string,{value:number;unit:string}>|null };
type Tab = 'overview'|'players'|'compare'|'tests'|'staff';

type CompareRow = { label:string; value:(p:Comparison)=>string };

const DIAMBARS_ORDER=['PRO A','U19 - PRO B','U17','U15'];
const EMPTY_PLAYER={first_name:'',last_name:'',birth_date:'',position:'',height_cm:'',weight_kg:'',status:'disponible'};

export default function ManagementCenter(){
  const [ready,setReady]=useState(false);
  const [authorized,setAuthorized]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [organizations,setOrganizations]=useState<Organization[]>([]);
  const [teams,setTeams]=useState<Team[]>([]);
  const [players,setPlayers]=useState<Player[]>([]);
  const [comparisons,setComparisons]=useState<Comparison[]>([]);
  const [orgId,setOrgId]=useState('');
  const [teamId,setTeamId]=useState('');
  const [tab,setTab]=useState<Tab>('overview');
  const [search,setSearch]=useState('');
  const [showForm,setShowForm]=useState(false);
  const [editId,setEditId]=useState<string|null>(null);
  const [form,setForm]=useState({...EMPTY_PLAYER});
  const [compareIds,setCompareIds]=useState<string[]>([]);

  async function loadAll(){
    setError('');
    const {data:{session}}=await supabase.auth.getSession();
    if(!session){setReady(true);return;}
    const {data:profile}=await supabase.from('profiles').select('is_super_admin').eq('user_id',session.user.id).maybeSingle();
    if(!profile?.is_super_admin){setReady(true);return;}
    setAuthorized(true);
    const [o,t,p,c]=await Promise.all([
      supabase.from('organizations').select('id,name,branding').order('name'),
      supabase.from('teams').select('id,organization_id,name,category,season'),
      supabase.from('players').select('id,organization_id,team_id,display_name,first_name,last_name,birth_date,birth_year,position,primary_position,status,height_cm,weight_kg,dossier_status,active').eq('active',true),
      supabase.from('player_comparison_latest').select('*')
    ]);
    const firstErr=o.error||t.error||p.error||c.error;
    if(firstErr)setError(firstErr.message);
    const orgs=(o.data||[]) as Organization[];
    setOrganizations(orgs); setTeams((t.data||[]) as Team[]); setPlayers((p.data||[]) as Player[]); setComparisons((c.data||[]) as Comparison[]);
    if(!orgId){const d=orgs.find(x=>x.name==='Diambars FC'); setOrgId((d||orgs[0])?.id||'');}
    setReady(true);
  }

  useEffect(()=>{void loadAll();},[]);

  const selectedOrg=organizations.find(o=>o.id===orgId)||null;
  const isDiambars=selectedOrg?.name==='Diambars FC';
  const accent=selectedOrg?.branding?.primary||'#111111';
  const background=selectedOrg?.branding?.background||'#F5F5F5';
  const orgTeams=useMemo(()=>{
    const list=teams.filter(t=>t.organization_id===orgId);
    return isDiambars?[...list].sort((a,b)=>DIAMBARS_ORDER.indexOf(a.name)-DIAMBARS_ORDER.indexOf(b.name)):list;
  },[teams,orgId,isDiambars]);

  useEffect(()=>{
    if(!orgId)return;
    if(isDiambars&&orgTeams.length)setTeamId(current=>orgTeams.some(t=>t.id===current)?current:orgTeams[0].id);
    else setTeamId('');
    setCompareIds([]);
  },[orgId,isDiambars,orgTeams]);

  const orgPlayers=players.filter(p=>p.organization_id===orgId);
  const scopePlayers=orgPlayers.filter(p=>!teamId||p.team_id===teamId);
  const filteredPlayers=scopePlayers.filter(p=>`${p.display_name||''} ${p.first_name} ${p.last_name} ${p.position||''}`.toLowerCase().includes(search.toLowerCase()));
  const orgComparisons=comparisons.filter(p=>p.organization_id===orgId&&(!teamId||p.team_id===teamId));
  const selectedComparisons=orgComparisons.filter(p=>compareIds.includes(p.player_id));

  function toggleCompare(id:string){setCompareIds(v=>v.includes(id)?v.filter(x=>x!==id):(v.length<4?[...v,id]:v));}
  function startCreate(){setEditId(null);setForm({...EMPTY_PLAYER});setShowForm(true);}
  function startEdit(p:Player){setEditId(p.id);setForm({first_name:p.first_name,last_name:p.last_name,birth_date:p.birth_date||'',position:p.primary_position||p.position||'',height_cm:p.height_cm?.toString()||'',weight_kg:p.weight_kg?.toString()||'',status:p.status||'disponible'});setShowForm(true);}
  async function savePlayer(e:FormEvent){
    e.preventDefault();
    const team=teams.find(t=>t.id===teamId);
    const payload={organization_id:orgId,team_id:teamId||null,first_name:form.first_name.trim(),last_name:form.last_name.trim(),display_name:`${form.first_name.trim()} ${form.last_name.trim()}`,birth_date:form.birth_date||null,birth_year:form.birth_date?Number(form.birth_date.slice(0,4)):null,position:form.position||null,primary_position:form.position||null,height_cm:form.height_cm?Number(form.height_cm):null,weight_kg:form.weight_kg?Number(form.weight_kg):null,status:form.status||'disponible',category:team?.category||null,season:team?.season||'2026-2027',dossier_status:'draft',active:true,updated_at:new Date().toISOString()};
    const result=editId?await supabase.from('players').update(payload).eq('id',editId):await supabase.from('players').insert(payload);
    if(result.error){setError(result.error.message);return;}
    setNotice(editId?'Joueur mis à jour.':'Joueur créé en brouillon.');setShowForm(false);await loadAll();
  }

  const compareRows:CompareRow[]=[
    {label:'Âge',value:p=>p.age_years?`${p.age_years.toFixed(1)} ans`:'—'},
    {label:'Poste',value:p=>p.position||'—'},
    {label:'Taille',value:p=>p.height_cm?`${p.height_cm} cm`:'—'},
    {label:'Poids',value:p=>p.weight_kg?`${p.weight_kg} kg`:'—'},
    {label:'IMC',value:p=>p.bmi?p.bmi.toFixed(1):'—'}
  ];

  if(!ready)return <main style={s.center}>Chargement…</main>;
  if(!authorized)return <main style={s.center}>Accès super-administrateur requis.</main>;

  return <main style={{minHeight:'100vh',background,color:'#111',fontFamily:'Arial,sans-serif'}}>
    <header style={{...s.header,borderBottomColor:accent}}>
      <div><strong>HDY Performance Engine</strong><small style={{display:'block'}}>Centre de gestion</small></div>
      <a href="/" style={s.link}>Dashboard</a>
    </header>

    <section style={s.wrap}>
      <div style={s.selectorPanel}>
        <label style={s.label}>ENVIRONNEMENT
          <select value={orgId} onChange={e=>setOrgId(e.target.value)} style={{...s.select,borderColor:accent}}>
            {organizations.map(o=><option key={o.id} value={o.id}>{o.branding?.label||o.name}</option>)}
          </select>
        </label>
        {isDiambars&&<label style={s.label}>ÉQUIPE
          <select value={teamId} onChange={e=>setTeamId(e.target.value)} style={{...s.select,borderColor:'#D71920'}}>
            {orgTeams.map(t=><option key={t.id} value={t.id}>{t.name} · {players.filter(p=>p.team_id===t.id).length} joueurs</option>)}
          </select>
        </label>}
      </div>

      <div style={s.hero}><div><small style={{color:accent,fontWeight:800}}>{selectedOrg?.branding?.label||selectedOrg?.name}</small><h1 style={{margin:'5px 0'}}>Centre de gestion</h1><p style={s.muted}>Effectifs, joueurs et comparaison des profils.</p></div><div style={{...s.kpi,borderTopColor:accent}}><small>JOUEURS ACTIFS</small><strong>{orgPlayers.length}</strong></div></div>

      <nav style={s.tabs}>{([['overview','Vue générale'],['players','Joueurs'],['compare','Comparateur'],['tests','Tests sportifs'],['staff','Staff & accès']] as [Tab,string][]).map(([id,label])=><button key={id} onClick={()=>setTab(id)} style={{...s.tab,borderBottomColor:tab===id?accent:'transparent'}}>{label}</button>)}</nav>
      {error&&<div style={s.error}>{error}</div>}{notice&&<div style={s.notice}>{notice}</div>}

      {tab==='overview'&&<div style={s.cards}>{isDiambars?orgTeams.map(t=><article key={t.id} style={{...s.card,borderTopColor:'#D71920'}}><small>{t.season}</small><h2>{t.name}</h2><strong style={s.big}>{players.filter(p=>p.team_id===t.id).length}</strong><span> joueurs</span><button onClick={()=>{setTeamId(t.id);setTab('players')}} style={s.textBtn}>Gérer l’effectif →</button></article>):<article style={{...s.card,borderTopColor:'#111'}}><h2>HDY ELITE</h2><strong style={s.big}>{orgPlayers.length}</strong><span> athlètes</span></article>}</div>}

      {tab==='players'&&<section style={s.panel}>
        <div style={s.panelHead}><h2>{isDiambars?orgTeams.find(t=>t.id===teamId)?.name:'HDY ELITE'}</h2><div style={s.actions}><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher" style={s.input}/><button onClick={startCreate} style={{...s.primary,background:accent}}>+ Nouveau joueur</button></div></div>
        <div style={s.tableWrap}><table style={s.table}><thead><tr>{['Joueur','Année','Poste','Taille','Poids','Statut','Actions'].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead><tbody>{filteredPlayers.map(p=><tr key={p.id}><td style={s.td}><b>{p.display_name||`${p.first_name} ${p.last_name}`}</b></td><td style={s.td}>{p.birth_year||'—'}</td><td style={s.td}>{p.primary_position||p.position||'—'}</td><td style={s.td}>{p.height_cm?`${p.height_cm} cm`:'—'}</td><td style={s.td}>{p.weight_kg?`${p.weight_kg} kg`:'—'}</td><td style={s.td}>{p.status}</td><td style={s.td}><button onClick={()=>startEdit(p)} style={s.mini}>Modifier</button></td></tr>)}</tbody></table></div>
      </section>}

      {tab==='compare'&&<section style={s.panel}><h2>Comparateur · jusqu’à 4 joueurs</h2><div style={s.pickGrid}>{orgComparisons.map((p:Comparison)=><button key={p.player_id} onClick={()=>toggleCompare(p.player_id)} style={{...s.pick,borderColor:compareIds.includes(p.player_id)?accent:'#E5E7EB'}}>{p.display_name||`${p.first_name} ${p.last_name}`}<small>{p.position||'—'}</small></button>)}</div>{selectedComparisons.length>0&&<div style={s.tableWrap}><table style={s.table}><thead><tr><th style={s.th}>Mesure</th>{selectedComparisons.map((p:Comparison)=><th key={p.player_id} style={s.th}>{p.display_name||p.last_name}</th>)}</tr></thead><tbody>{compareRows.map(row=><tr key={row.label}><td style={s.td}><b>{row.label}</b></td>{selectedComparisons.map((p:Comparison)=><td key={p.player_id} style={s.td}>{row.value(p)}</td>)}</tr>)}</tbody></table></div>}</section>}

      {tab==='tests'&&<section style={s.panel}><h2>Tests sportifs</h2><p style={s.muted}>Les protocoles actifs restent disponibles dans la base. La saisie détaillée sera ajoutée dans le prochain lot.</p></section>}
      {tab==='staff'&&<section style={s.panel}><h2>Staff & accès</h2><p style={s.muted}>Gestion des accès par organisation et équipe. Ton compte reste super-administrateur principal.</p></section>}

      {showForm&&<div style={s.modalBack}><form onSubmit={savePlayer} style={s.modal}><h2>{editId?'Modifier le joueur':'Nouveau joueur'}</h2><div style={s.formGrid}><input required placeholder="Prénom" value={form.first_name} onChange={e=>setForm({...form,first_name:e.target.value})} style={s.input}/><input required placeholder="Nom" value={form.last_name} onChange={e=>setForm({...form,last_name:e.target.value})} style={s.input}/><input type="date" value={form.birth_date} onChange={e=>setForm({...form,birth_date:e.target.value})} style={s.input}/><input placeholder="Poste" value={form.position} onChange={e=>setForm({...form,position:e.target.value})} style={s.input}/><input type="number" placeholder="Taille cm" value={form.height_cm} onChange={e=>setForm({...form,height_cm:e.target.value})} style={s.input}/><input type="number" placeholder="Poids kg" value={form.weight_kg} onChange={e=>setForm({...form,weight_kg:e.target.value})} style={s.input}/></div><div style={s.actions}><button type="button" onClick={()=>setShowForm(false)} style={s.link}>Annuler</button><button type="submit" style={{...s.primary,background:accent}}>Enregistrer</button></div></form></div>}
    </section>
  </main>;
}

const s:Record<string,React.CSSProperties>={
 center:{minHeight:'70vh',display:'grid',placeItems:'center',padding:24,fontFamily:'Arial,sans-serif'},header:{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'16px 24px',background:'#fff',borderBottom:'3px solid #111'},wrap:{width:'min(1180px,calc(100% - 28px))',margin:'0 auto',padding:'24px 0 50px'},selectorPanel:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:14,background:'#fff',padding:16,borderRadius:14,border:'1px solid #E5E7EB'},label:{fontSize:12,fontWeight:800,display:'grid',gap:7},select:{width:'100%',padding:14,border:'2px solid #111',borderRadius:10,fontSize:16,background:'#fff'},hero:{display:'flex',justifyContent:'space-between',alignItems:'end',gap:20,flexWrap:'wrap',marginTop:24},muted:{color:'#6B7280'},kpi:{background:'#fff',border:'1px solid #E5E7EB',borderTop:'4px solid #111',borderRadius:12,padding:14,minWidth:150,display:'grid'},tabs:{display:'flex',gap:4,overflowX:'auto',margin:'22px 0 14px',background:'#fff',borderRadius:12,padding:'0 8px'},tab:{padding:'14px 12px',border:'0',borderBottom:'3px solid transparent',background:'transparent',fontWeight:700,whiteSpace:'nowrap',cursor:'pointer'},cards:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:12},card:{background:'#fff',border:'1px solid #E5E7EB',borderTop:'4px solid #111',borderRadius:14,padding:16},big:{fontSize:32},textBtn:{display:'block',marginTop:12,border:0,background:'transparent',fontWeight:800,cursor:'pointer'},panel:{background:'#fff',border:'1px solid #E5E7EB',borderRadius:14,padding:16},panelHead:{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'},actions:{display:'flex',gap:8,flexWrap:'wrap'},primary:{border:0,borderRadius:9,color:'#fff',padding:'11px 14px',fontWeight:800,cursor:'pointer'},link:{border:'1px solid #D1D5DB',borderRadius:9,padding:'10px 13px',background:'#fff',color:'#111',textDecoration:'none',fontWeight:700},input:{padding:11,border:'1px solid #D1D5DB',borderRadius:9,fontSize:16},tableWrap:{overflowX:'auto'},table:{width:'100%',borderCollapse:'collapse',minWidth:650,marginTop:12},th:{textAlign:'left',padding:'10px',fontSize:12,color:'#6B7280',borderBottom:'1px solid #E5E7EB'},td:{padding:'11px 10px',borderBottom:'1px solid #F3F4F6'},mini:{border:'1px solid #D1D5DB',background:'#fff',borderRadius:8,padding:'7px 9px'},pickGrid:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:8},pick:{padding:12,border:'2px solid #E5E7EB',background:'#fff',borderRadius:10,textAlign:'left',display:'grid',gap:4},error:{background:'#FEE2E2',color:'#991B1B',padding:12,borderRadius:10,marginBottom:10},notice:{background:'#DCFCE7',color:'#166534',padding:12,borderRadius:10,marginBottom:10},modalBack:{position:'fixed',inset:0,background:'rgba(0,0,0,.35)',display:'grid',placeItems:'center',padding:20,zIndex:50},modal:{width:'min(640px,100%)',background:'#fff',borderRadius:16,padding:20},formGrid:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:10,margin:'14px 0'}
};
