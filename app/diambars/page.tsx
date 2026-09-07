'use client';

import { useEffect } from 'react';
const V='20260907-logo-layout1';
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
    <div aria-hidden='true' style={S.veil}/>
    <section style={S.brand} aria-label='Diambars FC'>
      <div style={S.logoFrame}>
        <span style={S.logoFallback}>DFC</span>
        <img src={`/pwa/diambars-icon-512.png?v=${V}`} alt='Logo Diambars FC' style={S.logoImg}/>
      </div>
      <p style={S.eyebrow}>CELLULE PERFORMANCE</p>
      <strong style={S.title}>DIAMBARS FC</strong>
      <span style={S.sub}>Performance · Monitoring · Médical · Suivi joueur</span>
      <div style={S.signature}>Powered by <b>HDY</b> Performance Engine</div>
    </section>
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
  art:{position:'absolute',inset:0,backgroundImage:`url('/pwa/diambars-splash.webp?v=${V}')`,backgroundSize:'cover',backgroundPosition:'center center',backgroundRepeat:'no-repeat',opacity:.32,filter:'saturate(.9) contrast(1.08)'},
  veil:{position:'absolute',inset:0,background:'radial-gradient(circle at 50% 37%,rgba(215,25,32,.17),transparent 30%),linear-gradient(180deg,rgba(0,0,0,.24),rgba(0,0,0,.46))'},
  brand:{position:'absolute',zIndex:2,left:20,right:20,top:'8.5%',bottom:150,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center',gap:9},
  logoFrame:{position:'relative',width:'min(43vw,190px)',aspectRatio:'1',borderRadius:'50%',display:'grid',placeItems:'center',overflow:'hidden',padding:7,background:'linear-gradient(145deg,#120708,#050505)',border:'1px solid rgba(255,56,64,.42)',boxShadow:'0 0 0 8px rgba(215,25,32,.045),0 0 54px rgba(215,25,32,.24),0 22px 60px rgba(0,0,0,.44)'},
  logoFallback:{fontSize:'clamp(28px,9vw,48px)',fontWeight:950,color:'#fff'},
  logoImg:{position:'absolute',inset:7,width:'calc(100% - 14px)',height:'calc(100% - 14px)',objectFit:'contain',display:'block',borderRadius:'50%'},
  eyebrow:{fontSize:9,fontWeight:950,letterSpacing:2.2,color:'#FF343C',margin:'7px 0 0'},
  title:{fontSize:'clamp(37px,11vw,62px)',lineHeight:.94,letterSpacing:-2.1,fontWeight:950,textShadow:'0 12px 30px rgba(0,0,0,.6)'},
  sub:{fontSize:'clamp(10px,3vw,14px)',color:'#E4E4E7',letterSpacing:.25,lineHeight:1.45,maxWidth:430},
  signature:{marginTop:10,fontSize:10,color:'#8E8E93',letterSpacing:.35},
  fade:{position:'absolute',inset:0,background:'linear-gradient(180deg,transparent 0%,transparent 67%,rgba(0,0,0,.62) 82%,#020202 100%)',pointerEvents:'none'},
  dock:{position:'absolute',zIndex:3,left:16,right:16,bottom:'max(14px,env(safe-area-inset-bottom))',maxWidth:520,margin:'0 auto',display:'grid',gap:9,padding:'12px',borderRadius:22,background:'rgba(7,7,8,.68)',border:'1px solid rgba(255,255,255,.08)',boxShadow:'0 18px 55px rgba(0,0,0,.42)',backdropFilter:'blur(18px)',WebkitBackdropFilter:'blur(18px)'},
  kicker:{fontSize:9,fontWeight:950,letterSpacing:1.8,color:'#FF343C',textAlign:'center',margin:0},
  button:{display:'flex',alignItems:'center',justifyContent:'center',gap:10,minHeight:54,borderRadius:16,background:'linear-gradient(180deg,#F11F28,#D71920)',color:'#fff',textDecoration:'none',fontSize:'clamp(15px,4.4vw,19px)',fontWeight:950,boxShadow:'0 12px 32px rgba(215,25,32,.24)'},
  help:{fontSize:10.5,color:'#A1A1AA',textAlign:'center',lineHeight:1.35,margin:0}
};
