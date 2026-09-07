'use client';

import { useEffect } from 'react';
const V='20260907-logo-layout1';
function forceMeta(name:string,content:string){let el=document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);if(!el){el=document.createElement('meta');el.name=name;document.head.appendChild(el)}el.content=content}
function addLink(rel:string,href:string,type?:string){const el=document.createElement('link');el.rel=rel;el.href=href;if(type)el.type=type;document.head.appendChild(el)}

export default function EliteInstall(){
  useEffect(()=>{
    localStorage.setItem('hdy-app-mode','elite');document.documentElement.dataset.brand='elite';document.title='HDY Elite';
    forceMeta('application-name','HDY Elite');forceMeta('apple-mobile-web-app-title','HDY Elite');forceMeta('apple-mobile-web-app-capable','yes');forceMeta('mobile-web-app-capable','yes');forceMeta('theme-color','#050506');
    document.querySelectorAll('link[rel="manifest"],link[rel="icon"],link[rel="shortcut icon"],link[rel="apple-touch-icon"]').forEach(n=>n.remove());
    addLink('manifest',`/elite.webmanifest?v=${V}`,'application/manifest+json');addLink('icon',`/pwa/elite-icon-192.png?v=${V}`,'image/png');addLink('shortcut icon',`/pwa/elite-icon-192.png?v=${V}`,'image/png');addLink('apple-touch-icon',`/pwa/elite-apple-touch-icon.png?v=${V}`,'image/png');
  },[]);

  return <main style={S.main}>
    <div aria-hidden='true' style={S.atmosphere}><span style={S.bandA}/><span style={S.bandB}/><span style={S.orbit}/></div>
    <section style={S.brand} aria-label='HDY Elite'>
      <div style={S.logoFrame}><span style={S.logoFallback}>HDY</span><img src={`/pwa/elite-icon-512.png?v=${V}`} alt='Logo HDY Elite' style={S.logoImg}/></div>
      <p style={S.eyebrow}>INDIVIDUAL PERFORMANCE</p>
      <strong style={S.title}>HDY ELITE</strong>
      <span style={S.sub}>Monitoring · Performance · Data</span>
      <p style={S.promise}>Accompagner chaque joueur vers sa meilleure version.</p>
      <div style={S.signature}>A BETTER GAME GLOBALLY</div>
    </section>
    <div style={S.horizon}/><div style={S.fade}/>
    <section style={S.dock}><p style={S.kicker}>ESPACE JOUEUR · ACCOMPAGNEMENT INDIVIDUEL</p><a href='/?app=elite' style={S.button}>Entrer dans mon espace HDY Elite <span>→</span></a><p style={S.help}>iPhone : Safari → Partager → Sur l’écran d’accueil</p></section>
  </main>
}

const S:Record<string,React.CSSProperties>={
  main:{minHeight:'100dvh',position:'relative',overflow:'hidden',background:'#020203',color:'#fff',fontFamily:'Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif'},
  atmosphere:{position:'absolute',inset:0,overflow:'hidden',background:'radial-gradient(circle at 50% 38%,rgba(255,255,255,.08),transparent 28%),linear-gradient(155deg,#020203 0%,#101012 54%,#030304 100%)'},
  bandA:{position:'absolute',width:'92%',height:1,top:'18%',left:'-28%',background:'linear-gradient(90deg,transparent,#7f7f86,transparent)',transform:'rotate(-43deg)',opacity:.38},
  bandB:{position:'absolute',width:'88%',height:90,bottom:'17%',right:'-36%',background:'linear-gradient(90deg,transparent,rgba(255,255,255,.025),transparent)',transform:'rotate(-43deg)'},
  orbit:{position:'absolute',width:'min(112vw,560px)',aspectRatio:'1',borderRadius:'50%',border:'1px solid rgba(255,255,255,.08)',left:'50%',top:'38%',transform:'translate(-50%,-50%)',boxShadow:'inset 0 0 80px rgba(255,255,255,.02)'},
  brand:{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:9,padding:'0 24px 150px',zIndex:1,textAlign:'center'},
  logoFrame:{position:'relative',width:'min(44vw,194px)',aspectRatio:'1',borderRadius:'50%',overflow:'hidden',display:'grid',placeItems:'center',padding:7,background:'linear-gradient(145deg,#111114,#050506)',border:'1px solid rgba(255,255,255,.28)',boxShadow:'0 0 0 8px rgba(255,255,255,.03),0 0 58px rgba(255,255,255,.13),0 22px 60px rgba(0,0,0,.46)'},
  logoFallback:{fontSize:'clamp(34px,11vw,58px)',fontWeight:950,letterSpacing:-2,color:'#fff'},
  logoImg:{position:'absolute',inset:7,width:'calc(100% - 14px)',height:'calc(100% - 14px)',objectFit:'contain',display:'block',borderRadius:'50%'},
  eyebrow:{fontSize:9,fontWeight:900,letterSpacing:2.2,color:'#A1A1AA',margin:'6px 0 0'},
  title:{fontSize:'clamp(38px,11vw,62px)',letterSpacing:-2.2,lineHeight:.95,fontWeight:950},
  sub:{fontSize:'clamp(11px,3.1vw,15px)',color:'#E4E4E7',letterSpacing:.4},
  promise:{maxWidth:360,margin:'8px 0 0',fontSize:11,color:'#8E8E93',lineHeight:1.5,letterSpacing:.2},
  signature:{marginTop:8,fontSize:9,color:'#71717A',letterSpacing:3},
  horizon:{position:'absolute',left:'-20%',right:'-20%',bottom:'18%',height:'23%',borderTop:'2px solid rgba(255,255,255,.65)',borderRadius:'50% 50% 0 0',boxShadow:'0 -8px 30px rgba(255,255,255,.12)',opacity:.42},
  fade:{position:'absolute',inset:0,background:'linear-gradient(180deg,transparent 0%,transparent 69%,rgba(0,0,0,.48) 83%,#020203 100%)',pointerEvents:'none'},
  dock:{position:'absolute',zIndex:3,left:16,right:16,bottom:'max(14px,env(safe-area-inset-bottom))',maxWidth:520,margin:'0 auto',display:'grid',gap:9,padding:'12px',borderRadius:22,background:'rgba(10,10,12,.68)',border:'1px solid rgba(255,255,255,.09)',boxShadow:'0 18px 55px rgba(0,0,0,.44)',backdropFilter:'blur(18px)',WebkitBackdropFilter:'blur(18px)'},
  kicker:{fontSize:8.5,fontWeight:950,letterSpacing:1.45,color:'#A1A1AA',textAlign:'center',margin:0},
  button:{display:'flex',alignItems:'center',justifyContent:'center',gap:10,minHeight:54,borderRadius:16,background:'linear-gradient(180deg,#FFFFFF,#E5E5EA)',color:'#09090B',textDecoration:'none',fontSize:'clamp(15px,4.2vw,18px)',fontWeight:950,boxShadow:'0 12px 32px rgba(255,255,255,.06)'},
  help:{fontSize:10.5,color:'#8E8E93',textAlign:'center',lineHeight:1.35,margin:0}
};
