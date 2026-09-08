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
  email:string|null;
  user_id:string|null;
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
      .select('id,display_name,first_name,last_name,birth_year,position,primary_position,status,observation,photo_url,team_id,category,email,user_id')
      .eq('organization_id',DIAMBARS)
      .eq('active',true)
      .order('display_name');
    if(e)setError(e.message); else setPlayers((data||[]) as Player[]);
    setReady(true);
  })()},[]);

  const [invites,setInvites]=useState<Record<string,string>>({});
  const [invitingId,setInvitingId]=useState('');
  const [inviteMsg,setInviteMsg]=useState<Record<string,string>>({});

  async function sendInvite(p:Player){
    setInvitingId(p.id);setInviteMsg(m=>({...m,[p.id]:''}));
    const {data,error:e}=await supabase.rpc('create_player_invite',{p_player_id:p.id,p_email:p.email||null,p_expires_days:14});
    setInvitingId('');
    if(e){setInviteMsg(m=>({...m,[p.id]:e.message}));return}
    const row=Array.isArray(data)?data[0]:data;
    if(!row?.token){setInviteMsg(m=>({...m,[p.id]:'Invitation créée mais lien indisponible.'}));return}
    const link=`${window.location.origin}/join/player?token=${encodeURIComponent(row.token)}`;
    setInvites(m=>({...m,[p.id]:link}));
    setInviteMsg(m=>({...m,[p.id]:'Invitation créée ✓'}));
  }
  async function copyInvite(id:string){const link=invites[id];if(!link)return;await navigator.clipboard.writeText(link);setInviteMsg(m=>({...m,[id]:'Lien copié ✓'}))}

  const filtered=useMemo(()=>players.filter(p=>`${p.display_name||''} ${p.first_name} ${p.last_name} ${p.position||''} ${p.primary_position||''} ${p.observation||''}`.toLowerCase().includes(search.toLowerCase())),[players,search]);

  if(!ready)return <main style={S.center}>Chargement…</main>;
  if(!authorized)return <main style={S.center}>Accès staff Diambars requis.</main>;

  return <main style={S.main}>
    <header style={S.header}>
      <div><span style={S.kicker}>DIAMBARS FC · 2026-2027</span><h1 style={S.h1}>Effectifs officiels</h1><p style={S.sub}>{players.length} joueurs actifs intégrés dans HDY Performance Engine.</p></div>
      <a href='/admin' style={S.back}>← Portail admin</a>
    </header>

    <section style={S.summary}>
      <div style={S.teamGrid}>{TEAMS.map(t=>{const n=players.filter(p=>p.team_id===t.id).length;return <div key={t.id} style={S.teamCard}><span>{t.name}</span><strong>{n}</strong><small>joueurs</small></div>})}</div>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder='Rechercher un joueur ou un poste' style={S.input}/>
    </section>

    {error&&<div style={S.error}>{error}</div>}

    <section style={S.groups}>
      {TEAMS.map(t=>{
        const group=filtered.filter(p=>p.team_id===t.id);
        return <section key={t.id} style={S.panel}>
          <div style={S.panelHead}><div><small style={S.muted}>GROUPE ACTIF</small><h2 style={{margin:'4px 0'}}>{t.name}</h2></div><strong style={S.count}>{group.length} joueurs</strong></div>
          <div style={S.cards}>{group.map(p=>{
            const injured=p.status==='indisponible';
            return <article key={p.id} style={S.playerCard}>
              <div style={S.avatar}>{p.photo_url?<img src={p.photo_url} alt='' style={S.photo}/>:<span>{(p.display_name||p.first_name||'?').slice(0,1)}</span>}</div>
              <div style={{minWidth:0,flex:1}}>
                <div style={S.nameRow}><h3 style={S.name}>{p.display_name||`${p.first_name} ${p.last_name}`}</h3><span style={{...S.status,background:injured?'#3A1416':'#13331F',color:injured?'#FF8A8F':'#8EF0B0'}}>{injured?'Indisponible':'Disponible'}</span></div>
                <div style={S.meta}>{p.birth_year||'—'} · {p.primary_position||p.position||'Poste à compléter'}</div>
                {p.observation&&<p style={{...S.note,color:injured?'#FFB5B8':'#A1A1AA'}}>{p.observation}</p>}
                {p.user_id
                  ? <span style={S.accountOk}>Compte actif</span>
                  : invites[p.id]
                    ? <div style={S.inviteBox}><code style={S.inviteCode}>{invites[p.id]}</code><button style={S.ghostSm} onClick={()=>copyInvite(p.id)}>Copier</button></div>
                    : <button style={S.inviteBtn} disabled={invitingId===p.id} onClick={()=>sendInvite(p)}>{invitingId===p.id?'Création…':'Envoyer une invitation'}</button>}
                {inviteMsg[p.id]&&<small style={S.inviteMsg}>{inviteMsg[p.id]}</small>}
              </div>
            </article>
          })}</div>
          {!group.length&&<p style={S.muted}>Aucun joueur affiché dans ce groupe.</p>}
        </section>
      })}
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
  summary:{maxWidth:1280,margin:'0 auto 14px',display:'grid',gap:12},
  teamGrid:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:10},
  teamCard:{border:'1px solid #2B2B31',background:'#111113',borderRadius:16,padding:16,color:'#fff',display:'grid',gap:5},
  input:{width:'100%',height:44,boxSizing:'border-box',background:'#0B0B0D',color:'#fff',border:'1px solid #303034',borderRadius:10,padding:'0 12px'},
  groups:{maxWidth:1280,margin:'0 auto',display:'grid',gap:14},
  panel:{background:'#111113',border:'1px solid #242428',borderRadius:18,padding:16},
  panelHead:{display:'flex',justifyContent:'space-between',gap:16,alignItems:'center',flexWrap:'wrap',marginBottom:14},
  count:{fontSize:14,color:'#FAFAFA'},
  muted:{color:'#A1A1AA',margin:'2px 0'},
  cards:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:10},
  playerCard:{display:'flex',gap:12,alignItems:'center',background:'#171719',border:'1px solid #29292D',borderRadius:14,padding:12},
  avatar:{width:54,height:54,borderRadius:12,background:'#26262A',display:'grid',placeItems:'center',overflow:'hidden',fontWeight:900,fontSize:20,flex:'0 0 auto'},
  photo:{width:'100%',height:'100%',objectFit:'cover'},
  nameRow:{display:'flex',justifyContent:'space-between',gap:10,alignItems:'center'},
  name:{fontSize:15,margin:0,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'},
  status:{fontSize:10,fontWeight:900,borderRadius:999,padding:'5px 8px',whiteSpace:'nowrap'},
  meta:{fontSize:12,color:'#D4D4D8',marginTop:5},
  note:{fontSize:11,margin:'6px 0 0',lineHeight:1.35},
  error:{maxWidth:1280,margin:'0 auto 12px',background:'#3A1416',color:'#FFB5B8',borderRadius:10,padding:10},
  accountOk:{display:'inline-block',marginTop:6,fontSize:10,fontWeight:900,color:'#8EF0B0',background:'#13331F',borderRadius:999,padding:'4px 8px'},
  inviteBtn:{marginTop:7,height:32,border:'1px solid #3F3F46',borderRadius:8,background:'#1A1A1D',color:'#fff',fontWeight:800,fontSize:12,padding:'0 10px',cursor:'pointer'},
  inviteBox:{marginTop:7,display:'flex',gap:6,alignItems:'center',minWidth:0},
  inviteCode:{fontSize:10,color:'#A1A1AA',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1},
  ghostSm:{height:28,border:'1px solid #3F3F46',borderRadius:7,background:'#1A1A1D',color:'#fff',fontWeight:800,fontSize:11,padding:'0 8px',flex:'0 0 auto'},
  inviteMsg:{display:'block',marginTop:4,color:'#A1A1AA',fontSize:11}
};