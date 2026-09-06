'use client';

import { useEffect } from 'react';

const V='20260906-ios5';

function forceMeta(name:string,content:string){
  let el=document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if(!el){el=document.createElement('meta');el.name=name;document.head.appendChild(el)}
  el.content=content;
}
function addLink(rel:string,href:string,type?:string){
  const el=document.createElement('link');el.rel=rel;el.href=href;if(type)el.type=type;document.head.appendChild(el);
}

export default function DiambarsInstall(){
  useEffect(()=>{
    document.title='Diambars FC';
    forceMeta('application-name','Diambars FC');
    forceMeta('apple-mobile-web-app-title','Diambars FC');
    forceMeta('apple-mobile-web-app-capable','yes');
    forceMeta('mobile-web-app-capable','yes');
    forceMeta('theme-color','#D71920');
    document.querySelectorAll('link[rel="manifest"],link[rel="icon"],link[rel="shortcut icon"],link[rel="apple-touch-icon"]').forEach(n=>n.remove());
    addLink('manifest',`/diambars.webmanifest?v=${V}`,'application/manifest+json');
    addLink('icon',`/pwa/diambars-icon-192.png?v=${V}`,'image/png');
    addLink('shortcut icon',`/pwa/diambars-icon-192.png?v=${V}`,'image/png');
    addLink('apple-touch-icon',`/pwa/diambars-apple-touch-icon.png?v=${V}`,'image/png');
  },[]);

  return <main style={S.main}>
    <div style={S.fallback} aria-label='Diambars FC'>
      <div style={{...S.fallbackLogo,backgroundImage:`url('/pwa/diambars-icon-512.png?v=${V}')`}}/>
      <strong style={S.fallbackTitle}>DIAMBARS FC</strong>
      <span style={S.fallbackSub}>Performance · Monitoring · Médical · Suivi joueur</span>
      <small style={S.powered}>Powered by HDY Performance Engine</small>
    </div>
    <div aria-hidden='true' style={{...S.art,backgroundImage:`url('/pwa/diambars-splash.webp?v=${V}')`}}/>
    <div style={S.fade}/>
    <section style={S.actions}>
      <p style={S.kicker}>APPLICATION STAFF · TEST INTERNE</p>
      <a href='/admin/sport?app=diambars' style={S.button}>Ouvrir l’espace Diambars →</a>
      <p style={S.help}>iPhone : Safari → Partager → Sur l’écran d’accueil · Android/ordinateur : Installer Diambars.</p>
    </section>
  </main>
}

const S:Record<string,React.CSSProperties>={
  main:{minHeight:'100dvh',position:'relative',overflow:'hidden',display:'grid',placeItems:'center',background:'#030303',color:'#fff',fontFamily:'Inter,system-ui,sans-serif'},
  fallback:{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:12,padding:'0 28px 150px',background:'radial-gradient(circle at 50% 42%,rgba(215,25,32,.14),transparent 34%),linear-gradient(145deg,#050505,#0D0D0E 60%,#150607)'},
  fallbackLogo:{width:'min(52vw,260px)',aspectRatio:'1',borderRadius:36,boxShadow:'0 22px 70px rgba(215,25,32,.18)',backgroundSize:'cover',backgroundPosition:'center',backgroundRepeat:'no-repeat',backgroundColor:'#0A0A0A'},
  fallbackTitle:{fontSize:'clamp(32px,9vw,54px)',letterSpacing:-1.6,textAlign:'center'},
  fallbackSub:{fontSize:'clamp(11px,3vw,15px)',color:'#D4D4D8',textAlign:'center'},
  powered:{position:'absolute',bottom:102,color:'#71717A',letterSpacing:.4},
  art:{position:'absolute',inset:0,zIndex:1,backgroundSize:'contain',backgroundPosition:'center',backgroundRepeat:'no-repeat',pointerEvents:'none'},
  fade:{position:'absolute',zIndex:2,left:0,right:0,bottom:0,height:'28%',background:'linear-gradient(180deg,transparent,rgba(0,0,0,.82) 52%,#030303 100%)',pointerEvents:'none'},
  actions:{position:'absolute',zIndex:3,left:18,right:18,bottom:'max(20px,env(safe-area-inset-bottom))',maxWidth:520,margin:'0 auto',display:'grid',gap:9},
  kicker:{fontSize:9,fontWeight:900,letterSpacing:1.45,color:'#F12A32',textAlign:'center',margin:0},
  button:{display:'grid',placeItems:'center',height:50,borderRadius:14,background:'#E31E24',color:'#fff',textDecoration:'none',fontWeight:950,boxShadow:'0 12px 38px rgba(0,0,0,.42)'},
  help:{fontSize:10,color:'#A1A1AA',textAlign:'center',lineHeight:1.45,margin:0}
};
