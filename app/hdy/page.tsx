'use client';

import { useEffect } from 'react';

const V='20260907-ios7';

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
    <div style={S.atmosphere} aria-hidden='true'>
      <span style={{...S.line,top:'23%',left:'-12%',transform:'rotate(-18deg)'}}/>
      <span style={{...S.line,bottom:'18%',right:'-15%',transform:'rotate(-18deg)'}}/>
      <span style={S.orbit}/>
    </div>

    <section style={S.brand} aria-label='HDY Performance Engine'>
      <div style={S.logoFrame}>
        <span style={S.logoFallback}>HDY</span>
        <img src={`/pwa/hdy-icon-512.png?v=${V}`} alt='Logo HDY Performance Engine' style={S.logoImg}/>
      </div>
      <p style={S.eyebrow}>HUMAN PERFORMANCE SYSTEM</p>
      <strong style={S.title}>HDY PERFORMANCE<br/>ENGINE</strong>
      <span style={S.sub}>Monitoring · Performance · Data · Athlete Management</span>
    </section>

    <div style={S.bottomShade}/>
    <section style={S.dock}>
      <p style={S.kicker}>PLATEFORME GLOBALE</p>
      <a href='/admin?app=hdy' style={S.button}>Entrer dans HDY Performance Engine <span aria-hidden='true'>→</span></a>
      <p style={S.help}><span style={S.share}>↑</span> iPhone : Partager → Sur l’écran d’accueil</p>
    </section>
  </main>
}

const S:Record<string,React.CSSProperties>={
  main:{minHeight:'100dvh',position:'relative',overflow:'hidden',background:'#030303',color:'#fff',fontFamily:'Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif'},
  atmosphere:{position:'absolute',inset:0,overflow:'hidden',background:'radial-gradient(circle at 50% 38%,rgba(255,255,255,.075),transparent 33%),linear-gradient(160deg,#020202 0%,#0B0B0D 56%,#050505 100%)'},
  line:{position:'absolute',width:'68%',height:1,background:'linear-gradient(90deg,transparent,rgba(255,255,255,.16),transparent)'},
  orbit:{position:'absolute',width:'min(118vw,620px)',height:'min(118vw,620px)',borderRadius:'50%',border:'1px solid rgba(255,255,255,.06)',left:'50%',top:'40%',transform:'translate(-50%,-50%)'},
  brand:{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:11,padding:'0 24px 120px',zIndex:1,textAlign:'center'},
  logoFrame:{position:'relative',width:'min(45vw,205px)',aspectRatio:'1',borderRadius:38,overflow:'hidden',display:'grid',placeItems:'center',background:'#09090B',border:'1px solid rgba(255,255,255,.10)',boxShadow:'0 22px 70px rgba(255,255,255,.06)'},
  logoFallback:{fontSize:'clamp(34px,10vw,58px)',fontWeight:950,letterSpacing:-2,color:'#fff'},
  logoImg:{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',display:'block'},
  eyebrow:{fontSize:9,fontWeight:900,letterSpacing:2.1,color:'#8E8E93',margin:'2px 0 0'},
  title:{fontSize:'clamp(30px,8vw,50px)',letterSpacing:-1.8,lineHeight:.94,fontWeight:950},
  sub:{fontSize:'clamp(11px,3vw,15px)',color:'#C7C7CC'},
  bottomShade:{position:'absolute',zIndex:2,left:0,right:0,bottom:0,height:'30%',background:'linear-gradient(180deg,transparent 0%,rgba(0,0,0,.72) 38%,#030303 100%)',pointerEvents:'none'},
  dock:{position:'absolute',zIndex:3,left:16,right:16,bottom:'max(14px,env(safe-area-inset-bottom))',maxWidth:520,margin:'0 auto',display:'grid',gap:10,padding:'13px 13px 10px',borderRadius:22,background:'rgba(12,12,14,.62)',border:'1px solid rgba(255,255,255,.09)',boxShadow:'0 18px 55px rgba(0,0,0,.40)',backdropFilter:'blur(18px)',WebkitBackdropFilter:'blur(18px)'},
  kicker:{fontSize:9,fontWeight:900,letterSpacing:1.8,color:'#8E8E93',textAlign:'center',margin:'0 0 1px'},
  button:{display:'flex',alignItems:'center',justifyContent:'center',gap:10,minHeight:54,borderRadius:16,background:'linear-gradient(180deg,#FFFFFF,#E5E5EA)',color:'#09090B',textDecoration:'none',fontSize:'clamp(15px,4.2vw,18px)',fontWeight:950,boxShadow:'0 12px 32px rgba(0,0,0,.24)'},
  help:{fontSize:11,color:'#8E8E93',textAlign:'center',lineHeight:1.35,margin:0},
  share:{display:'inline-grid',placeItems:'center',width:18,height:18,border:'1px solid #4A4A50',borderRadius:6,color:'#fff',fontWeight:900,marginRight:3}
};
