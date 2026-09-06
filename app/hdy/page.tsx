'use client';

import { useEffect } from 'react';

const V='20260906-ios3';

function forceMeta(name:string,content:string){
  let el=document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if(!el){el=document.createElement('meta');el.name=name;document.head.appendChild(el)}
  el.content=content;
}
function addLink(rel:string,href:string,type?:string){
  const el=document.createElement('link');el.rel=rel;el.href=href;if(type)el.type=type;document.head.appendChild(el);
}

export default function HDYInstall(){
  useEffect(()=>{
    document.title='HDY Performance Engine';
    forceMeta('application-name','HDY Performance Engine');
    forceMeta('apple-mobile-web-app-title','HDY Performance');
    forceMeta('apple-mobile-web-app-capable','yes');
    forceMeta('mobile-web-app-capable','yes');
    forceMeta('theme-color','#050505');
    document.querySelectorAll('link[rel="manifest"],link[rel="icon"],link[rel="shortcut icon"],link[rel="apple-touch-icon"]').forEach(n=>n.remove());
    addLink('manifest',`/hdy.webmanifest?v=${V}`,'application/manifest+json');
    addLink('icon',`/pwa/hdy-icon-192.png?v=${V}`,'image/png');
    addLink('shortcut icon',`/pwa/hdy-icon-192.png?v=${V}`,'image/png');
    addLink('apple-touch-icon',`/pwa/hdy-apple-touch-icon.png?v=${V}`,'image/png');
  },[]);

  return <main style={S.main}>
    <div style={S.fallback} aria-hidden='true'>
      <img src={`/pwa/hdy-icon-512.png?v=${V}`} alt='' style={S.fallbackLogo}/>
      <strong style={S.fallbackTitle}>HDY PERFORMANCE ENGINE</strong>
      <span style={S.fallbackSub}>Monitoring · Performance · Data</span>
    </div>
    <img src={`/pwa/hdy-splash.webp?v=${V}`} alt='HDY Performance Engine — Monitoring, Performance, Data' style={S.art} onError={e=>{e.currentTarget.style.display='none'}}/>
    <div style={S.fade}/>
    <section style={S.actions}>
      <p style={S.kicker}>PLATEFORME GLOBALE</p>
      <a href='/admin?app=hdy' style={S.button}>Ouvrir HDY Performance Engine →</a>
      <p style={S.help}>iPhone : Safari → Partager → Sur l’écran d’accueil · Android/ordinateur : Installer HDY.</p>
    </section>
  </main>
}

const S:Record<string,React.CSSProperties>={
  main:{minHeight:'100dvh',position:'relative',overflow:'hidden',display:'grid',placeItems:'center',background:'#030303',color:'#fff',fontFamily:'Inter,system-ui,sans-serif'},
  fallback:{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:12,padding:'0 28px 150px',background:'radial-gradient(circle at 50% 42%,rgba(255,255,255,.07),transparent 34%),linear-gradient(145deg,#050505,#101012 60%,#030303)'},
  fallbackLogo:{width:'min(52vw,260px)',aspectRatio:'1',objectFit:'cover',borderRadius:36,boxShadow:'0 22px 70px rgba(255,255,255,.06)'},
  fallbackTitle:{fontSize:'clamp(25px,7vw,46px)',letterSpacing:-1.2,textAlign:'center'},
  fallbackSub:{fontSize:'clamp(11px,3vw,15px)',color:'#D4D4D8',textAlign:'center'},
  art:{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'contain',background:'#030303',zIndex:1},
  fade:{position:'absolute',zIndex:2,left:0,right:0,bottom:0,height:'26%',background:'linear-gradient(180deg,transparent,rgba(0,0,0,.78) 50%,#030303 100%)',pointerEvents:'none'},
  actions:{position:'absolute',zIndex:3,left:18,right:18,bottom:'max(20px,env(safe-area-inset-bottom))',maxWidth:520,margin:'0 auto',display:'grid',gap:9},
  kicker:{fontSize:9,fontWeight:900,letterSpacing:1.65,color:'#A1A1AA',textAlign:'center',margin:0},
  button:{display:'grid',placeItems:'center',height:50,borderRadius:14,background:'#F4F4F5',color:'#09090B',textDecoration:'none',fontWeight:950,boxShadow:'0 12px 38px rgba(0,0,0,.42)'},
  help:{fontSize:10,color:'#A1A1AA',textAlign:'center',lineHeight:1.45,margin:0}
};
