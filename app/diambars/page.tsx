'use client';

import { useEffect } from 'react';
const V='20260907-visual-final';
function forceMeta(name:string,content:string){let el=document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);if(!el){el=document.createElement('meta');el.name=name;document.head.appendChild(el)}el.content=content}
function addLink(rel:string,href:string,type?:string){const el=document.createElement('link');el.rel=rel;el.href=href;if(type)el.type=type;document.head.appendChild(el)}

export default function DiambarsInstall(){
  useEffect(()=>{
    localStorage.setItem('hdy-app-mode','diambars');
    document.documentElement.dataset.brand='diambars';
    document.title='Diambars FC';
    forceMeta('application-name','Diambars FC');forceMeta('apple-mobile-web-app-title','Diambars FC');forceMeta('apple-mobile-web-app-capable','yes');forceMeta('mobile-web-app-capable','yes');forceMeta('theme-color','#D71920');
    document.querySelectorAll('link[rel="manifest"],link[rel="icon"],link[rel="shortcut icon"],link[rel="apple-touch-icon"]').forEach(n=>n.remove());
    addLink('manifest',`/diambars.webmanifest?v=${V}`,'application/manifest+json');addLink('icon',`/pwa/diambars-icon-192.png?v=${V}`,'image/png');addLink('shortcut icon',`/pwa/diambars-icon-192.png?v=${V}`,'image/png');addLink('apple-touch-icon',`/pwa/diambars-apple-touch-icon.png?v=${V}`,'image/png');
  },[]);
  return <main style={S.main}>
    <div aria-hidden='true' style={S.art}/>
    <div aria-hidden='true' style={S.fade}/>
    <section style={S.dock}>
      <p style={S.kicker}>APPLICATION STAFF · TEST INTERNE</p>
      <a href='/admin/sport?app=diambars' style={S.button}>Entrer dans l’espace Diambars <span>→</span></a>
      <p style={S.help}>iPhone : Safari → Partager → Sur l’écran d’accueil</p>
    </section>
  </main>
}
const S:Record<string,React.CSSProperties>={
  main:{minHeight:'100dvh',position:'relative',overflow:'hidden',background:'#020202',color:'#fff',fontFamily:'Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif'},
  art:{position:'absolute',inset:0,backgroundImage:`url('/pwa/diambars-splash.webp?v=${V}')`,backgroundSize:'cover',backgroundPosition:'center center',backgroundRepeat:'no-repeat'},
  fade:{position:'absolute',inset:0,background:'linear-gradient(180deg,transparent 0%,transparent 66%,rgba(0,0,0,.62) 83%,#020202 100%)',pointerEvents:'none'},
  dock:{position:'absolute',zIndex:2,left:16,right:16,bottom:'max(14px,env(safe-area-inset-bottom))',maxWidth:520,margin:'0 auto',display:'grid',gap:9,padding:'12px',borderRadius:22,background:'rgba(7,7,8,.58)',border:'1px solid rgba(255,255,255,.08)',boxShadow:'0 18px 55px rgba(0,0,0,.42)',backdropFilter:'blur(18px)',WebkitBackdropFilter:'blur(18px)'},
  kicker:{fontSize:9,fontWeight:950,letterSpacing:1.8,color:'#FF343C',textAlign:'center',margin:0},
  button:{display:'flex',alignItems:'center',justifyContent:'center',gap:10,minHeight:54,borderRadius:16,background:'linear-gradient(180deg,#F11F28,#D71920)',color:'#fff',textDecoration:'none',fontSize:'clamp(15px,4.4vw,19px)',fontWeight:950,boxShadow:'0 12px 32px rgba(215,25,32,.24)'},
  help:{fontSize:10.5,color:'#A1A1AA',textAlign:'center',lineHeight:1.35,margin:0}
};
