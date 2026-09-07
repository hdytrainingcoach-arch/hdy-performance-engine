'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const DIAMBARS='d3136b7f-ef28-43e8-af53-30fa6de70c62';
const ELITE='5454ad8f-8f2b-4812-9923-ab7d0b1f8748';
type BrandMode='loading'|'hdy'|'diambars'|'elite'|'neutral';
type PageIdentity={key:string;label:string;eyebrow:string;description:string};

function pageIdentity(path:string):PageIdentity{
  if(path.startsWith('/admin/administration/staff')) return {key:'staff',label:'Staff & Accès',eyebrow:'PEOPLE · PERMISSIONS',description:'Membres, rôles, invitations et périmètres d’accès.'};
  if(path.startsWith('/admin/administration')||path.startsWith('/admin/manage')||path.startsWith('/admin/organizations')||path.startsWith('/admin/setup')) return {key:'administration',label:'Administration',eyebrow:'ORGANISATION · CONTROL',description:'Organisation, équipes, comptes, droits et configuration.'};
  if(path.startsWith('/admin/registration')||path.startsWith('/admin/roster')) return {key:'players',label:'Joueurs',eyebrow:'PEOPLE · PROFILES',description:'Effectif, dossiers joueurs et informations longitudinales.'};
  if(path.startsWith('/admin/sport/gps')) return {key:'gps',label:'GPS & Charge externe',eyebrow:'LOAD · SPEED · EXPOSURE',description:'Distance, HSR, sprints, accélérations, Vmax, charge et tendances.'};
  if(path.startsWith('/admin/sport/tests')) return {key:'results',label:'Résultats & Tests',eyebrow:'TESTING · PROGRESS',description:'Tests physiques, meilleurs résultats et évolution dans le temps.'};
  if(path.startsWith('/admin/sport/comparator')) return {key:'comparator',label:'Comparatif',eyebrow:'PROFILES · TALENT',description:'Comparer les profils athlétiques pour éclairer la décision staff.'};
  if(path.startsWith('/admin/sport/monitoring')||path.startsWith('/admin/workspace')) return {key:'dashboard',label:'Dashboard',eyebrow:'MONITORING · DECISION',description:'Disponibilité, Hooper, RPE, douleur, GPS, alertes et tendances.'};
  if(path.startsWith('/admin/sport/alerts')) return {key:'alerts',label:'Alertes',eyebrow:'REVIEW · CONTEXT',description:'Signaux à revoir par le staff, sans diagnostic automatique.'};
  if(path.startsWith('/admin/sport/hrv')) return {key:'recovery',label:'Récupération & HRV',eyebrow:'RECOVERY · READINESS',description:'Suivi récupération et mesures HRV lorsque ce module est activé.'};
  if(path.startsWith('/admin/sport/sessions')) return {key:'sessions',label:'Séances',eyebrow:'TRAINING · PLANNING',description:'Planifier les séances et relier les données de charge au bon contexte.'};
  if(path.startsWith('/admin/sport')) return {key:'sport',label:'Sport & Performance',eyebrow:'PERFORMANCE · OPERATIONS',description:'Charge, préparation, séances, alertes, GPS, tests et monitoring.'};
  return {key:'home',label:'Centre de gestion',eyebrow:'PERFORMANCE · PEOPLE · PROGRESS',description:'Piloter les organisations et les environnements de performance.'};
}

export default function AdminBrandFrame({children}:{children:React.ReactNode}){
  const [mode,setMode]=useState<BrandMode>('loading');
  const pathname=usePathname()||'/admin';
  const identity=useMemo(()=>pageIdentity(pathname),[pathname]);

  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      const params=new URLSearchParams(window.location.search);
      const requested=params.get('app');
      if(requested==='diambars'||requested==='hdy'||requested==='elite') localStorage.setItem('hdy-app-mode',requested);
      const stored=(requested||localStorage.getItem('hdy-app-mode')) as 'diambars'|'hdy'|'elite'|null;
      const {data:{session}}=await supabase.auth.getSession();
      if(cancelled)return;
      if(!session){setMode(stored||'neutral');return;}

      const {data:profile}=await supabase.from('profiles').select('is_super_admin').eq('user_id',session.user.id).maybeSingle();
      if(profile?.is_super_admin){setMode(stored||'hdy');return;}

      const {data:members}=await supabase.from('memberships').select('organization_id,active').eq('user_id',session.user.id);
      const active=(members||[]).filter(m=>m.active!==false);
      if(active.some(m=>m.organization_id===DIAMBARS)){setMode('diambars');return;}
      if(active.some(m=>m.organization_id===ELITE)){setMode('elite');return;}
      setMode(stored||'neutral');
    })();
    return()=>{cancelled=true};
  },[pathname]);

  useEffect(()=>{
    if(mode==='loading')return;
    const brand=mode==='neutral'?'hdy':mode;
    document.documentElement.dataset.brand=brand;
    document.documentElement.dataset.page=identity.key;
    document.documentElement.style.setProperty('--brand-accent',brand==='diambars'?'#D71920':'#F4F4F5');
    return()=>{delete document.documentElement.dataset.page};
  },[mode,identity.key]);

  const brand=mode==='neutral'||mode==='loading'?'hdy':mode;
  const isDiambars=brand==='diambars';
  const isElite=brand==='elite';
  const logo=isDiambars?'/pwa/diambars-icon-192.png?v=visual-final':isElite?'/pwa/elite-icon-192.png?v=elite-final':'/pwa/hdy-icon-192.png?v=hdy-final';
  const title=isDiambars?'DIAMBARS FC':isElite?'HDY ELITE':'HDY PERFORMANCE ENGINE';
  const subtitle=isDiambars?'CELLULE PERFORMANCE · STAFF':isElite?'INDIVIDUAL PERFORMANCE':'GLOBAL PERFORMANCE SYSTEM';
  const installHref=isDiambars?'/diambars':isElite?'/elite':'/hdy';

  return <div className={`adminBrandFrame brand-${brand}`}>
    <header className='adminBrandHeader'>
      <a href={installHref} className='adminBrandIdentity' aria-label={`${title} — accueil`}>
        <span className={`adminBrandLogo ${isElite?'roundLogo':''}`}><img src={logo} alt={title}/></span>
        <span className='adminBrandName'><strong>{title}</strong><small>{subtitle}</small></span>
      </a>
      <div className='adminBrandActions'><span className='adminEnvironmentPill'>{identity.eyebrow}</span><a href={installHref} className='adminInstallLink'>Installer</a></div>
    </header>
    <section className={`adminPageContext page-${identity.key}`}><div><span>{identity.eyebrow}</span><strong>{identity.label}</strong><p>{identity.description}</p></div><i aria-hidden='true'/></section>
    <div className='adminBrandContent'>{children}</div>
    <footer className='adminBrandFooter'>{isDiambars?'POWERED BY HDY PERFORMANCE ENGINE':isElite?'HDY ELITE · POWERED BY HDY PERFORMANCE ENGINE':'HDY PERFORMANCE ENGINE · A BETTER GAME GLOBALLY'}</footer>
  </div>
}
