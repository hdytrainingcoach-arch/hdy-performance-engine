'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useOrg } from '@/lib/org-context';
import { notifyInvite } from '@/lib/invite-client';
import { exportCsv, timestampedName } from '@/lib/csv-export';
import TeamManager from '@/components/TeamManager';

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
  active:boolean;
};

export default function RosterPage(){
  const {environments,currentEnvId:org,setCurrentEnvId:setOrg,currentEnv,teamsFor}=useOrg();
  const teams=teamsFor(org);
  const [ready,setReady]=useState(false);
  const [authorized,setAuthorized]=useState(false);
  const [isAdmin,setIsAdmin]=useState(false);
  const [players,setPlayers]=useState<Player[]>([]);
  const [search,setSearch]=useState('');
  const [error,setError]=useState('');
  const [showInactive,setShowInactive]=useState(false);
  const [manageId,setManageId]=useState('');
  const [working,setWorking]=useState('');
  const [actionMsg,setActionMsg]=useState<Record<string,string>>({});

  const loadPlayers=useCallback(async()=>{
    let q=supabase.from('players')
      .select('id,display_name,first_name,last_name,birth_year,position,primary_position,status,observation,photo_url,team_id,category,email,user_id,active')
      .eq('organization_id',org)
      .order('display_name');
    if(!showInactive)q=q.eq('active',true);
    const {data,error:e}=await q;
    if(e)setError(e.message); else {setError('');setPlayers((data||[]) as Player[]);}
  },[org,showInactive]);

  useEffect(()=>{if(!org)return;(async()=>{
    setReady(false);
    const {data:{session}}=await supabase.auth.getSession();
    if(!session){setReady(true);return;}
    const {data:profile}=await supabase.from('profiles').select('is_super_admin').eq('user_id',session.user.id).maybeSingle();
    const {data:membership}=await supabase.from('memberships').select('role').eq('user_id',session.user.id).eq('organization_id',org).eq('active',true);
    const roles=(membership||[]).map((m:{role:string})=>m.role);
    if(!profile?.is_super_admin && !roles.length){setAuthorized(false);setReady(true);return;}
    setAuthorized(true);
    setIsAdmin(!!profile?.is_super_admin || roles.some(r=>r==='organization_admin'||r==='module_admin'));
    await loadPlayers();
    setReady(true);
  })()},[org,loadPlayers]);

  async function changeTeam(p:Player,teamId:string){
    setWorking(p.id);setActionMsg(m=>({...m,[p.id]:''}));
    const {error:e}=await supabase.rpc('move_player_team',{p_player_id:p.id,p_new_team_id:teamId||null});
    setWorking('');
    if(e){setActionMsg(m=>({...m,[p.id]:e.message}));return}
    setActionMsg(m=>({...m,[p.id]:'Équipe modifiée ✓'}));
    await loadPlayers();
  }
  async function toggleActive(p:Player){
    setWorking(p.id);setActionMsg(m=>({...m,[p.id]:''}));
    const {error:e}=await supabase.rpc('set_player_active',{p_player_id:p.id,p_active:!p.active});
    setWorking('');
    if(e){setActionMsg(m=>({...m,[p.id]:e.message}));return}
    await loadPlayers();
  }
  async function removePlayer(p:Player){
    if(!window.confirm(`Supprimer définitivement ${p.display_name||p.first_name+' '+p.last_name} ? Cette action est irréversible et n'est possible que pour un doublon sans données.`))return;
    setWorking(p.id);setActionMsg(m=>({...m,[p.id]:''}));
    const {error:e}=await supabase.rpc('delete_player',{p_player_id:p.id});
    setWorking('');
    if(e){setActionMsg(m=>({...m,[p.id]:e.message}));return}
    setManageId('');
    await loadPlayers();
  }
  async function anonymizePlayer(p:Player){
    if(!window.confirm(`Anonymiser ${p.display_name||p.first_name+' '+p.last_name} (RGPD) ? L'identité est effacée définitivement ; l'historique de suivi (déjà pseudonyme) est conservé pour les statistiques d'équipe. Action irréversible.`))return;
    setWorking(p.id);setActionMsg(m=>({...m,[p.id]:''}));
    const {data,error:e}=await supabase.rpc('anonymize_player',{p_player_id:p.id});
    if(e){setWorking('');setActionMsg(m=>({...m,[p.id]:e.message}));return}
    if(data){
      const {data:{session}}=await supabase.auth.getSession();
      if(session){
        await fetch('/api/gdpr/delete-account',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({organizationId:org,userId:data})}).catch(()=>undefined);
      }
    }
    setWorking('');setManageId('');
    setActionMsg(m=>({...m,[p.id]:'Joueur anonymisé (RGPD) ✓'}));
    await loadPlayers();
  }

  const [invites,setInvites]=useState<Record<string,string>>({});
  const [invitingId,setInvitingId]=useState('');
  const [inviteMsg,setInviteMsg]=useState<Record<string,string>>({});

  async function sendInvite(p:Player){
    setInvitingId(p.id);setInviteMsg(m=>({...m,[p.id]:''}));
    const {data,error:e}=await supabase.rpc('create_player_invite',{p_player_id:p.id,p_email:p.email||null,p_expires_days:14});
    if(e){setInvitingId('');setInviteMsg(m=>({...m,[p.id]:e.message}));return}
    const row=Array.isArray(data)?data[0]:data;
    if(!row?.token){setInvitingId('');setInviteMsg(m=>({...m,[p.id]:'Invitation créée mais lien indisponible.'}));return}
    const link=`${window.location.origin}/join/player?token=${encodeURIComponent(row.token)}`;
    setInvites(m=>({...m,[p.id]:link}));
    const to=p.email||'';
    if(!to){setInvitingId('');setInviteMsg(m=>({...m,[p.id]:'Lien créé — aucun e-mail au dossier, à transmettre manuellement.'}));return}
    const r=await notifyInvite({kind:'player',inviteId:row.invite_id,token:row.token,email:to,name:p.display_name||`${p.first_name} ${p.last_name}`,orgId:org,orgLabel:currentEnv?.branding?.label||currentEnv?.name});
    setInvitingId('');
    if(r.status==='sent')setInviteMsg(m=>({...m,[p.id]:`Invitation envoyée à ${to} ✓`}));
    else if(r.status==='manual')setInviteMsg(m=>({...m,[p.id]:'Lien créé — à transmettre au joueur (e-mail non configuré).'}));
    else setInviteMsg(m=>({...m,[p.id]:`Lien créé. Envoi e-mail échoué : ${r.message}`}));
  }
  async function copyInvite(id:string){const link=invites[id];if(!link)return;await navigator.clipboard.writeText(link);setInviteMsg(m=>({...m,[id]:'Lien copié ✓'}))}

  const filtered=useMemo(()=>players.filter(p=>`${p.display_name||''} ${p.first_name} ${p.last_name} ${p.position||''} ${p.primary_position||''} ${p.observation||''}`.toLowerCase().includes(search.toLowerCase())),[players,search]);

  function exportProfiles(){
    exportCsv(timestampedName(`profils_${currentEnv?.branding?.label||currentEnv?.name||'effectif'}`),filtered,[
      {key:'display_name',label:'Nom',value:p=>p.display_name||`${p.first_name} ${p.last_name}`},
      {key:'birth_year',label:'Année de naissance'},
      {key:'primary_position',label:'Poste',value:p=>p.primary_position||p.position||''},
      {key:'category',label:'Catégorie'},
      {key:'team_id',label:'Équipe',value:p=>teams.find(t=>t.id===p.team_id)?.name||''},
      {key:'status',label:'Statut'},
      {key:'active',label:'Actif',value:p=>p.active?'oui':'non'},
      {key:'email',label:'E-mail'},
      {key:'user_id',label:'Compte activé',value:p=>p.user_id?'oui':'non'},
    ]);
  }

  if(!ready)return <main style={S.center}>Chargement…</main>;
  if(!authorized)return <main style={S.center}>Accès staff requis pour cet environnement.</main>;

  const groups=teams.length?teams:[{id:'__none__',name:'Sans équipe'}];

  return <main style={S.main}>
    <header style={S.header}>
      <div><span style={S.kicker}>{currentEnv?.branding?.label||currentEnv?.name||'EFFECTIF'}</span><h1 style={S.h1}>Effectifs officiels</h1><p style={S.sub}>{players.filter(p=>p.active).length} joueurs actifs{isAdmin?' · gestion des équipes et des doublons':''}.</p></div>
      <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
        {isAdmin&&<label style={S.inactiveToggle}><input type='checkbox' checked={showInactive} onChange={e=>setShowInactive(e.target.checked)}/> Afficher les désactivés</label>}
        <button onClick={exportProfiles} style={S.exportBtn}>Exporter CSV (profils)</button>
        <select value={org} onChange={e=>setOrg(e.target.value)} style={{...S.input,width:'auto'}}>{environments.map(e=><option key={e.id} value={e.id}>{e.branding?.label||e.name}</option>)}</select>
        <a href='/admin' style={S.back}>← Portail admin</a>
      </div>
    </header>

    <section style={S.summary}>
      <div style={S.teamGrid}>{groups.map(t=>{const n=players.filter(p=>t.id==='__none__'?!p.team_id:p.team_id===t.id).length;return <div key={t.id} style={S.teamCard}><span>{t.name}</span><strong>{n}</strong><small>joueurs</small></div>})}</div>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder='Rechercher un joueur ou un poste' style={S.input}/>
    </section>

    {error&&<div style={S.error}>{error}</div>}

    {isAdmin&&currentEnv?.type!=='elite_performance'&&<TeamManager organizationId={org}/>}

    <section style={S.groups}>
      {groups.map(t=>{
        const group=filtered.filter(p=>t.id==='__none__'?!p.team_id:p.team_id===t.id);
        return <section key={t.id} style={S.panel}>
          <div style={S.panelHead}><div><small style={S.muted}>GROUPE ACTIF</small><h2 style={{margin:'4px 0'}}>{t.name}</h2></div><strong style={S.count}>{group.length} joueurs</strong></div>
          <div style={S.cards}>{group.map(p=>{
            const injured=p.status==='indisponible';
            const open=manageId===p.id;
            return <article key={p.id} style={{...S.playerCard,...(p.active?null:{opacity:.6})}}>
              <div style={S.avatar}>{p.photo_url?<img src={p.photo_url} alt='' style={S.photo}/>:<span>{(p.display_name||p.first_name||'?').slice(0,1)}</span>}</div>
              <div style={{minWidth:0,flex:1}}>
                <div style={S.nameRow}><h3 style={S.name}>{p.display_name||`${p.first_name} ${p.last_name}`}</h3>{!p.active?<span style={{...S.status,background:'#2B2B31',color:'#A1A1AA'}}>Désactivé</span>:<span style={{...S.status,background:injured?'#3A1416':'#13331F',color:injured?'#FF8A8F':'#8EF0B0'}}>{injured?'Indisponible':'Disponible'}</span>}</div>
                <div style={S.meta}>{p.birth_year||'—'} · {p.primary_position||p.position||'Poste à compléter'}</div>
                {p.observation&&<p style={{...S.note,color:injured?'#FFB5B8':'#A1A1AA'}}>{p.observation}</p>}
                {p.user_id
                  ? <span style={S.accountOk}>Compte actif</span>
                  : invites[p.id]
                    ? <div style={S.inviteBox}><code style={S.inviteCode}>{invites[p.id]}</code><button style={S.ghostSm} onClick={()=>copyInvite(p.id)}>Copier</button></div>
                    : <button style={S.inviteBtn} disabled={invitingId===p.id} onClick={()=>sendInvite(p)}>{invitingId===p.id?'Création…':'Envoyer une invitation'}</button>}
                {inviteMsg[p.id]&&<small style={S.inviteMsg}>{inviteMsg[p.id]}</small>}
                {isAdmin&&<>
                  <button style={S.manageToggle} onClick={()=>{setManageId(open?'':p.id);setActionMsg(m=>({...m,[p.id]:''}))}}>{open?'Fermer':'Gérer'}</button>
                  {open&&<div style={S.managePanel}>
                    <label style={S.manageLabel}>Équipe
                      <select value={p.team_id||''} disabled={working===p.id} onChange={e=>changeTeam(p,e.target.value)} style={S.manageSelect}>
                        <option value=''>Sans équipe</option>
                        {teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </label>
                    <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                      <button style={S.ghostSm} disabled={working===p.id} onClick={()=>toggleActive(p)}>{p.active?'Désactiver':'Réactiver'}</button>
                      <button style={{...S.ghostSm,borderColor:'#5A2327',color:'#FF8A8F'}} disabled={working===p.id} onClick={()=>removePlayer(p)}>Supprimer (doublon)</button>
                      <button style={{...S.ghostSm,borderColor:'#3A2C5A',color:'#c9b8ff'}} disabled={working===p.id} onClick={()=>anonymizePlayer(p)}>Anonymiser (RGPD)</button>
                    </div>
                    <small style={S.manageHint}>« Désactiver » conserve tout l’historique. « Supprimer » n’est possible que sans aucune donnée de suivi. « Anonymiser » efface l’identité et supprime le compte, en gardant l’historique de suivi pseudonyme.</small>
                  </div>}
                  {actionMsg[p.id]&&<small style={S.inviteMsg}>{actionMsg[p.id]}</small>}
                </>}
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
  inviteMsg:{display:'block',marginTop:4,color:'#A1A1AA',fontSize:11},
  inactiveToggle:{display:'flex',gap:6,alignItems:'center',fontSize:12,color:'#A1A1AA',border:'1px solid #2B2B31',borderRadius:10,padding:'0 10px',height:44},
  manageToggle:{marginTop:7,marginLeft:8,height:32,border:'1px solid #3F3F46',borderRadius:8,background:'#111113',color:'#D4D4D8',fontWeight:800,fontSize:12,padding:'0 10px',cursor:'pointer'},
  managePanel:{marginTop:8,padding:10,border:'1px solid #2B2B31',borderRadius:10,background:'#0F0F11',display:'grid',gap:8},
  manageLabel:{display:'grid',gap:4,fontSize:11,fontWeight:800,color:'#A1A1AA'},
  manageSelect:{height:34,background:'#1B1B1F',color:'#fff',border:'1px solid #34343A',borderRadius:8,padding:'0 8px'},
  manageHint:{fontSize:10,color:'#71717A',lineHeight:1.4},
  exportBtn:{height:44,border:'1px solid #3F3F46',borderRadius:10,background:'#1A1A1D',color:'#fff',fontWeight:800,fontSize:12,padding:'0 12px',cursor:'pointer'}
};