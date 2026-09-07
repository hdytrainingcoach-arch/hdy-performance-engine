'use client';

import { useEffect } from 'react';
const V='20260907-logo-layout1';
function forceMeta(name:string,content:string){let el=document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);if(!el){el=document.createElement('meta');el.name=name;document.head.appendChild(el)}el.content=content}
function addLink(rel:string,href:string,type?:string){const el=document.createElement('link');el.rel=rel;el.href=href;if(type)el.type=type;document.head.appendChild(el)}

export default function HDYInstall(){
  useEffect(()=>{
    localStorage.setItem('hdy-app-mode','hdy');document.documentElement.dataset.brand='hdy';document.title='HDY Performance Engine';
    forceMeta('application-name','HDY Performance Engine');forceMeta('apple-mobile-web-app-title','HDY Performance');forceMeta('apple-mobile-web-app-capable','yes');forceMeta('mobile-web-app-capable','yes');forceMeta('theme-color','#050505');
    document.querySelectorAll('link[rel="manifest"],link[rel="icon"],link[rel="shortcut icon"],link[rel="apple-touch-icon"]').forEach(n=>n.remove());
    addLink('manifest',`/hdy.webmanifest?v=${V}`,'application/manifest+json');addLink('icon',`/pwa/hdy-icon-192.png?v=${V}`,'image/png');addLink('shortcut icon',`/pwa/hdy-icon-192.png?v=${V}`,'image/png');addLink('apple-touch-icon',`/pwa/hdy-apple-touch-icon.png?v=${V}`,'image/png');
  },[]);
  return <main style={S.main}>
    <div aria-hidden='true' style={S.art}/><div aria-hidden='true' style={S.veil}/>
    <section style={S.brand} aria-label='HDY Performance Engine'>
      <div style={S.logoFrame}>
        <span style={S.logoFallback}>HDY</span>
        <img src={`/pwa/hdy-icon-512.png?v=${V}`} alt='Logo HDY Performance Engine' style={S.logoImg}/>
      </div>
      <p style={S.eyebrow}>HUMAN PERFORMANCE SYSTEM</p>
      <strong style={S.title}>HDY <span style={S.titleLight}>PERFORMANCE ENGINE</span></strong>
      <span style={S.sub}>Monitoring · Performance · Data · Athlete Management</span>
      <div style={S.signature}>A BETTER GAME GLOBALLY</div>
    </section>
    <div aria-hidden='true' style={S.fade}/>
    <section style={S.dock}><p style={S.kicker}>PLATEFORME GLOBALE</p><a href='/admin?app=hdy' style={S.button}>Entrer dans HDY Performance Engine <span>→</span></a><p style={S.help}>iPhone : Safari → Partager → Sur l’écran d’accueil</p></section>
  </main>
}
const S:Record<string,React.CSSProperties>={
  main:{minHeight:'100dvh',position:'relative',overflow:'hidden',background:'#020202',color:'#fff',fontFamily:'Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif'},
  art:{position:'absolute',inset:0,backgroundImage:`url('/pwa/hdy-splash.webp?v=${V}')`,backgroundSize:'cover',backgroundPosition:'center center',backgroundRepeat:'no-repeat',opacity:.30,filter:'contrast(1.08)'},
  veil:{position:'absolute',inset:0,background:'radial-gradient(circle at 50% 36%,rgba(255,255,255,.10),transparent 29%),linear-gradient(180deg,rgba(0,0,0,.18),rgba(0,0,0,.52))'},
  brand:{position:'absolute',zIndex:2,left:20,right:20,top:'8.5%',bottom:150,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center',gap:9},
  logoFrame:{position:'relative',width:'min(42vw,188px)',aspectRatio:'1',borderRadius:34,display:'grid',placeItems:'center',overflow:'hidden',padding:7,background:'linear-gradient(145deg,#121214,#050506)',border:'1px solid rgba(255,255,255,.26)',boxShadow:'0 0 0 8px rgba(255,255,255,.025),0 0 54px rgba(255,255,255,.12),0 22px 60px rgba(0,0,0,.46)'},
  logoFallback:{fontSize:'clamp(30px,9vw,50px)',fontWeight:950,color:'#fff'},
  logoImg:{position:'absolute',inset:7,width:'calc(100% - 14px)',height:'calc(100% - 14px)',objectFit:'contain',display:'block',borderRadius:27},
  eyebrow:{fontSize:9,fontWeight:950,letterSpacing:2.25,color:'#A1A1AA',margin:'7px 0 0'},
  title:{fontSize:'clamp(30px,8.8vw,52px)',lineHeight:.98,letterSpacing:-1.8,fontWeight:950,textShadow:'0 12px 30px rgba(0,0,0,.6)'},
  titleLight:{fontWeight:500,letterSpacing:-1.2},
  sub:{fontSize:'clamp(10px,3vw,14px)',color:'#D4D4D8',letterSpacing:.4,lineHeight:1.45,maxWidth:440},
  signature:{marginTop:11,fontSize:9,color:'#71717A',letterSpacing:3},
  fade:{position:'absolute',inset:0,background:'linear-gradient(180deg,transparent 0%,transparent 67%,rgba(0,0,0,.58) 83%,#020202 100%)',pointerEvents:'none'},
  dock:{position:'absolute',zIndex:3,left:16,right:16,bottom:'max(14px,env(safe-area-inset-bottom))',maxWidth:520,margin:'0 auto',display:'grid',gap:9,padding:'12px',borderRadius:22,background:'rgba(10,10,12,.68)',border:'1px solid rgba(255,255,255,.09)',boxShadow:'0 18px 55px rgba(0,0,0,.42)',backdropFilter:'blur(18px)',WebkitBackdropFilter:'blur(18px)'},
  kicker:{fontSize:9,fontWeight:950,letterSpacing:1.8,color:'#A1A1AA',textAlign:'center',margin:0},
  button:{display:'flex',alignItems:'center',justifyContent:'center',gap:10,minHeight:54,borderRadius:16,background:'linear-gradient(180deg,#FFFFFF,#E5E5EA)',color:'#09090B',textDecoration:'none',fontSize:'clamp(15px,4.2vw,18px)',fontWeight:950,boxShadow:'0 12px 32px rgba(0,0,0,.24)'},
  help:{fontSize:10.5,color:'#8E8E93',textAlign:'center',lineHeight:1.35,margin:0}
};
