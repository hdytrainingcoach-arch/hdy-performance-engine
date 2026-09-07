'use client';

import { useEffect } from 'react';

const V='20260907-elite1';

function forceMeta(name:string,content:string){
  let el=document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if(!el){el=document.createElement('meta');el.name=name;document.head.appendChild(el)}
  el.content=content;
}
function addLink(rel:string,href:string,type?:string){
  const el=document.createElement('link');el.rel=rel;el.href=href;if(type)el.type=type;document.head.appendChild(el);
}

export default function EliteInstall(){
  useEffect(()=>{
    document.title='HDY Elite';
    forceMeta('application-name','HDY Elite');
    forceMeta('apple-mobile-web-app-title','HDY Elite');
    forceMeta('apple-mobile-web-app-capable','yes');
    forceMeta('mobile-web-app-capable','yes');
    forceMeta('theme-color','#F5F5F7');
    document.querySelectorAll('link[rel="manifest"],link[rel="icon"],link[rel="shortcut icon"],link[rel="apple-touch-icon"]').forEach(n=>n.remove());
    addLink('manifest',`/elite.webmanifest?v=${V}`,'application/manifest+json');
    addLink('icon',`/pwa/hdy-icon-192.png?v=${V}`,'image/png');
    addLink('shortcut icon',`/pwa/hdy-icon-192.png?v=${V}`,'image/png');
    addLink('apple-touch-icon',`/pwa/hdy-apple-touch-icon.png?v=${V}`,'image/png');
  },[]);

  return <main style={S.main}>
    <div style={S.atmosphere} aria-hidden='true'>
      <span style={S.grid}/>
      <span style={S.halo}/>
    </div>

    <section style={S.brand} aria-label='HDY Elite'>
      <div style={S.logoFrame}>
        <span style={S.logoFallback}>HDY</span>
        <img src={`/pwa/hdy-icon-512.png?v=${V}`} alt='Logo HDY' style={S.logoImg}/>
      </div>
      <p style={S.eyebrow}>INDIVIDUAL PERFORMANCE</p>
      <strong style={S.title}>HDY <span style={S.elite}>ELITE</span></strong>
      <span style={S.sub}>Accompagnement individuel · Monitoring · Charge · Récupération · Performance</span>
      <div style={S.pill}>ESPACE JOUEUR</div>
    </section>

    <div style={S.bottomShade}/>
    <section style={S.dock}>
      <p style={S.kicker}>ATHLETE EXPERIENCE</p>
      <a href='/?app=elite' style={S.button}>Entrer dans mon espace HDY Elite <span aria-hidden='true'>→</span></a>
      <p style={S.help}><span style={S.share}>↑</span> iPhone : Partager → Sur l’écran d’accueil</p>
    </section>
  </main>
}

const S:Record<string,React.CSSProperties>={
  main:{minHeight:'100dvh',position:'relative',overflow:'hidden',background:'#F5F5F7',color:'#09090B',fontFamily:'Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif'},
  atmosphere:{position:'absolute',inset:0,overflow:'hidden',background:'linear-gradient(155deg,#FFFFFF 0%,#F4F4F5 52%,#E9E9EC 100%)'},
  grid:{position:'absolute',inset:0,opacity:.42,backgroundImage:'linear-gradient(rgba(0,0,0,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,.025) 1px,transparent 1px)',backgroundSize:'28px 28px'},
  halo:{position:'absolute',width:'min(110vw,560px)',height:'min(110vw,560px)',borderRadius:'50%',background:'radial-gradient(circle,rgba(255,255,255,.95) 0%,rgba(255,255,255,.5) 46%,transparent 70%)',left:'50%',top:'39%',transform:'translate(-50%,-50%)'},
  brand:{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:11,padding:'0 24px 126px',zIndex:1,textAlign:'center'},
  logoFrame:{position:'relative',width:'min(43vw,190px)',aspectRatio:'1',borderRadius:38,overflow:'hidden',display:'grid',placeItems:'center',background:'#0A0A0B',border:'1px solid rgba(0,0,0,.08)',boxShadow:'0 24px 60px rgba(0,0,0,.12)'},
  logoFallback:{fontSize:'clamp(34px,10vw,54px)',fontWeight:950,letterSpacing:-2,color:'#fff'},
  logoImg:{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',display:'block'},
  eyebrow:{fontSize:9,fontWeight:900,letterSpacing:2.2,color:'#71717A',margin:'4px 0 0'},
  title:{fontSize:'clamp(38px,11vw,62px)',letterSpacing:-2.5,lineHeight:.95,fontWeight:950},
  elite:{fontWeight:500,letterSpacing:-1.5},
  sub:{fontSize:'clamp(11px,3vw,14px)',color:'#52525B',maxWidth:420,lineHeight:1.45},
  pill:{marginTop:4,padding:'7px 11px',borderRadius:999,border:'1px solid #D4D4D8',background:'rgba(255,255,255,.72)',fontSize:9,fontWeight:900,letterSpacing:1.5,color:'#3F3F46'},
  bottomShade:{position:'absolute',zIndex:2,left:0,right:0,bottom:0,height:'31%',background:'linear-gradient(180deg,transparent 0%,rgba(245,245,247,.72) 35%,#F5F5F7 100%)',pointerEvents:'none'},
  dock:{position:'absolute',zIndex:3,left:16,right:16,bottom:'max(14px,env(safe-area-inset-bottom))',maxWidth:520,margin:'0 auto',display:'grid',gap:10,padding:'13px 13px 10px',borderRadius:22,background:'rgba(255,255,255,.78)',border:'1px solid rgba(0,0,0,.08)',boxShadow:'0 18px 55px rgba(0,0,0,.10)',backdropFilter:'blur(18px)',WebkitBackdropFilter:'blur(18px)'},
  kicker:{fontSize:9,fontWeight:900,letterSpacing:1.8,color:'#71717A',textAlign:'center',margin:'0 0 1px'},
  button:{display:'flex',alignItems:'center',justifyContent:'center',gap:10,minHeight:54,borderRadius:16,background:'#09090B',color:'#fff',textDecoration:'none',fontSize:'clamp(15px,4.2vw,18px)',fontWeight:950,boxShadow:'0 12px 30px rgba(0,0,0,.16)'},
  help:{fontSize:11,color:'#71717A',textAlign:'center',lineHeight:1.35,margin:0},
  share:{display:'inline-grid',placeItems:'center',width:18,height:18,border:'1px solid #A1A1AA',borderRadius:6,color:'#111',fontWeight:900,marginRight:3}
};
