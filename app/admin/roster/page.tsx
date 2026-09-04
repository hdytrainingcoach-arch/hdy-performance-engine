'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Player = {
  id:string;
  display_name:string|null;
  first_name:string;
  last_name:string;
  birth_year:number|null;
  position:string|null;
  primary_position:string|null;
  status:string;
  observation:string|null;
  photo_url:string|null;
  team_id:string|null;
  category:string|null;
};

const DIAMBARS='d3136b7f-ef28-43e8-af53-30fa6de70c62';
const TEAMS=[
  {id:'d9bb5390-94cb-461e-b2cd-a326da2cfa3d',name:'PRO A'},
  {id:'44f6976d-f5ef-4dcf-980f-ce3995e99877',name:'U19 · PRO B'},
  {id:'28b38b9f-3de0-419d-8275-b331a074b7f4',name:'U17'},
  {id:'e652df98-4653-416c-b794-3763e38a629d',name:'U15'},
] as const;

export default function RosterPage(){
  const [ready,setReady]=useState(false);
  const [authorized,setAuthorized]=useState(false);
  const [players,setPlayers]=useState<Player[]>([]);
  const [team,setTeam]=useState<string>(TEAMS[0].id);
  const [search,setSearch]=useState('');
  const [error,setError]=useState('');

  useEffect(()=>{(async()=>{
    const {data:{session}}=await supabase.auth.getSession();
    if(!session){setReady(true);return;}
    const {data:profile}=await supabase.from('profiles').select('is_super_admin').eq('user_id',session.user.id).maybeSingle();
    const {data:membership}=await supabase.from('memberships').select('id').eq('user_id',session.user.id).eq('organization_id',DIAMBARS).eq('active',true).limit(1);
    if(!profile?.is_super_admin && !(membership?.length)){setReady(true);return;}
    setAuthorized(true);
    const {data,error:e}=await supabase.from('players')
      .select('id,display_name,first_name,last_name,birth_year,position,primary_position,status,observation,photo_url,team_id,category')
      .eq('organization_id',DIAMBARS)
      .eq('active',true)
      .eq('season','2026-2027')
      .order('display_name');
    if(e)setError(e.message); else setPlayers((data||[]) as Player[]);
    setReady(true);
  })()},[]);

  const scoped=useMemo(()=>players.filter(p=>p.team_id===team),[players,team]);
  const visible=useMemo(()=>scoped.filter(p=>`${p.display_name||''} ${p.first_name} ${p.last_name} ${p.position||''} ${p.observation||''}`.toLowerCase().includes(search.toLowerCase())),[scoped,search]);

  if(!ready)return <main style={S.center}>Chargement…</main>;
  if(!authorized)return <main style={S.center}>Accès staff Diambars requis.</main>;

  return <main style={S.main}>
    <header style={S.header}>
      <div><span style={S.kicker}>DIAMBARS FC · 2026-2027</span><h1 style={S.h1}>Effectifs officiels</h1><p style={S.sub}>{players.length} joueurs actifs intégrés dans HDY Performance Engine.</p></div>
      <a href='/admin' style={S.back}>← Portail admin</a>
    </header>

    <section style={S.teamGrid}>
      {TEAMS.map(t=>{
        const n=players.filter(p=>p.team_id===t.id).length;
        return <button key={t.id} onClick={()=>setTeam(t.id)} style={{...S.teamCard,borderColor:team===t.id?'#E31E24':'#2B2B31',background:team===t.id?'#18181B':'#111113'}}>
          <span>{t.name}</span><strong>{n}</strong><small>joueurs</small>
        </button>
      })}
    </section>

    <section style={S.panel}>
      <div style={S.panelHead}>
        <div><small style={S.muted}>GROUPE ACTIF</small><h2 style={{margin:'4px 0'}}>{TEAMS.find(t=>t.id===team)?.name}</h2><p style={S.muted}>{scoped.length} joueurs</p></div>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder='Rechercher un joueur ou un poste' style={S.input}/>
      </div>
      {error&&<div style={S.error}>{error}</div>}
      <div style={S.cards}>
        {visible.map(p=>{
          const injured=p.status==='indisponible';
          return <article key={p.id} style={S.playerCard}>
            <div style={S.avatar}>{p.photo_url?<img src={p.photo_url} alt='' style={S.photo}/>:<span>{(p.display_name||p.first_name||'?').slice(0,1)}</span>}</div>
            <div style={{minWidth:0,flex:1}}>
              <div style={S.nameRow}><h3 style={S.name}>{p.display_name||`${p.first_name} ${p.last_name}`}</h3><span style={{...S.status,background:injured?'#3A1416':'#13331F',color:injured?'#FF8A8F':'#8EF0B0'}}>{injured?'Indisponible':'Disponible'}</span></div>
              <div style={S.meta}>{p.birth_year||'—'} · {p.primary_position||p.position||'Poste à compléter'}</div>
              {p.observation&&<p style={{...S.note,color:injured?'#FFB5B8':'#A1A1AA'}}>{p.observation}</p>}
            </div>
          </article>
        })}
      </div>
      {!visible.length&&<p style={S.muted}>Aucun joueur trouvé.</p>}
    </section>
  </main>
}

const S:Record<string,React.CSSProperties>={
  center:{minHeight:'80vh',display:'grid',placeItems:'center',fontFamily:'Inter,system-ui,sans-serif'},
  main:{minHeight:'100vh',background:'#09090B',color:'#FAFAFA',fontFamily:'Inter,system-ui,sans-serif',padding:24},
  header:{maxWidth:1280,margin:'0 auto 18px',display:'flex',justifyContent:'space-between',gap:20,alignItems:'flex-start',flexWrap:'wrap'},
  kicker:{fontSize:11,fontWeight:900,letterSpacing:1.5,color:'#E31E24'},
  h1:{fontSize:'clamp(36px,5vw,62px)',lineHeight:1,margin:'5px 0 8px',letterSpacing:-2.5},
  sub:{color:'#A1A1AA',margin:0},
  back:{color:'#fff',textDecoration:'none',border:'1px solid #2B2B31',padding:'10px 12px',borderRadius:10},
  teamGrid:{maxWidth:1280,margin:'0 auto 14px',display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:10},
  teamCard:{border:'1px solid',borderRadius:16,padding:16,color:'#fff',textAlign:'left',cursor:'pointer',display:'grid',gap:5},
  panel:{maxWidth:1280,margin:'0 auto',background:'#111113',border:'1px solid #242428',borderRadius:18,padding:16},
  panelHead:{display:'flex',justifyContent:'space-between',gap:16,alignItems:'end',flexWrap:'wrap',marginBottom:14},
  muted:{color:'#A1A1AA',margin:'2px 0'},
  input:{minWidth:260,height:42,background:'#0B0B0D',color:'#fff',border:'1px solid #303034',borderRadius:10,padding:'0 12px'},
  cards:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:10},
  playerCard:{display:'flex',gap:12,alignItems:'center',background:'#171719',border:'1px solid #29292D',borderRadius:14,padding:12},
  avatar:{width:54,height:54,borderRadius:12,background:'#26262A',display:'grid',placeItems:'center',overflow:'hidden',fontWeight:900,fontSize:20,flex:'0 0 auto'},
  photo:{width:'100%',height:'100%',objectFit:'cover'},
  nameRow:{display:'flex',justifyContent:'space-between',gap:10,alignItems:'center'},
  name:{fontSize:15,margin:0,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'},
  status:{fontSize:10,fontWeight:900,borderRadius:999,padding:'5px 8px',whiteSpace:'nowrap'},
  meta:{fontSize:12,color:'#D4D4D8',marginTop:5},
  note:{fontSize:11,margin:'6px 0 0',lineHeight:1.35},
  error:{background:'#3A1416',color:'#FFB5B8',borderRadius:10,padding:10,marginBottom:12}
};