'use client';

import { useEffect } from 'react';
import BrandLogo from '@/components/BrandLogo';

const V='20260907-logo-system-v2';
function forceMeta(name:string,content:string){let el=document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);if(!el){el=document.createElement('meta');el.name=name;document.head.appendChild(el)}el.content=content}
function addLink(rel:string,href:string,type?:string){const el=document.createElement('link');el.rel=rel;el.href=href;if(type)el.type=type;document.head.appendChild(el)}

export default function HDYInstall(){
  useEffect(()=>{
    localStorage.setItem('hdy-app-mode','hdy');document.documentElement.dataset.brand='hdy';document.title='HDY Performance Engine';
    forceMeta('application-name','HDY Performance Engine');forceMeta('apple-mobile-web-app-title','HDY Performance');forceMeta('apple-mobile-web-app-capable','yes');forceMeta('mobile-web-app-capable','yes');forceMeta('theme-color','#050505');
    document.querySelectorAll('link[rel="manifest"],link[rel="icon"],link[rel="shortcut icon"],link[rel="apple-touch-icon"]').forEach(n=>n.remove());
    addLink('manifest',`/hdy.webmanifest?v=${V}`,'application/manifest+json');addLink('icon','/branding/hdy/icon-192.png?v=static-v1','image/png');addLink('shortcut icon','/branding/hdy/icon-192.png?v=static-v1','image/png');addLink('apple-touch-icon','/branding/hdy/apple-touch-icon.png?v=static-v1','image/png');
  },[]);

  return <main style={S.main}>
    <div aria-hidden='true' style={S.art}/><div aria-hidden='true' style={S.veil}/>
    <section className='brandLandingIdentity' aria-label='HDY Performance Engine'>
      <BrandLogo brand='hdy' variant='hero'/>
      <p className='brandLandingEyebrow' style={{color:'#A1A1AA'}}>HUMAN PERFORMANCE SYSTEM</p>
      <strong className='brandLandingTitle'>HDY <span style={{fontWeight:500}}>PERFORMANCE ENGINE</span></strong>
      <span className='brandLandingSub'>Monitoring · Performance · Data · Athlete Management</span>
      <div className='brandLandingTagline'>A BETTER GAME GLOBALLY</div>
    </section>
    <div aria-hidden='true' style={S.fade}/>
    <section style={S.dock}>
      <p style={S.kicker}>PLATEFORME GLOBALE</p>
      <a href='/admin?app=hdy' style={S.button}>Entrer dans HDY Performance Engine <span>→</span></a>
      <p style={S.help}>iPhone : Safari → Partager → Sur l’écran d’accueil</p>
    </section>
  </main>
}

const S:Record<string,React.CSSProperties>={
  main:{minHeight:'100dvh',position:'relative',overflow:'hidden',background:'#020202',color:'#fff',fontFamily:'Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif'},
  art:{position:'absolute',inset:0,/* fond splash désactivé : asset source corrompu, en attente d'un nouveau visuel */backgroundSize:'cover',backgroundPosition:'center center',backgroundRepeat:'no-repeat',opacity:.22,filter:'contrast(1.08)'},
  veil:{position:'absolute',inset:0,background:'radial-gradient(circle at 50% 36%,rgba(255,255,255,.11),transparent 28%),linear-gradient(180deg,rgba(0,0,0,.18),rgba(0,0,0,.58))'},
  fade:{position:'absolute',inset:0,background:'linear-gradient(180deg,transparent 0%,transparent 67%,rgba(0,0,0,.60) 83%,#020202 100%)',pointerEvents:'none'},
  dock:{position:'absolute',zIndex:3,left:16,right:16,bottom:'max(14px,env(safe-area-inset-bottom))',maxWidth:520,margin:'0 auto',display:'grid',gap:9,padding:'12px',borderRadius:22,background:'rgba(10,10,12,.72)',border:'1px solid rgba(255,255,255,.09)',boxShadow:'0 18px 55px rgba(0,0,0,.42)',backdropFilter:'blur(18px)',WebkitBackdropFilter:'blur(18px)'},
  kicker:{fontSize:9,fontWeight:950,letterSpacing:1.8,color:'#A1A1AA',textAlign:'center',margin:0},
  button:{display:'flex',alignItems:'center',justifyContent:'center',gap:10,minHeight:54,borderRadius:16,background:'linear-gradient(180deg,#FFFFFF,#E5E5EA)',color:'#09090B',textDecoration:'none',fontSize:'clamp(15px,4.2vw,18px)',fontWeight:950,boxShadow:'0 12px 32px rgba(0,0,0,.24)'},
  help:{fontSize:10.5,color:'#8E8E93',textAlign:'center',lineHeight:1.35,margin:0}
};
