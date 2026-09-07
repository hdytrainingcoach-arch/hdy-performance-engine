'use client';

import { useEffect, useState } from 'react';

const V='20260907-ios6';

function forceMeta(name:string,content:string){
  let el=document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if(!el){el=document.createElement('meta');el.name=name;document.head.appendChild(el)}
  el.content=content;
}
function addLink(rel:string,href:string,type?:string){
  const el=document.createElement('link');el.rel=rel;el.href=href;if(type)el.type=type;document.head.appendChild(el);
}

export default function DiambarsInstall(){
  const [splash,setSplash]=useState<string|null>(null);
  const [icon,setIcon]=useState<string|null>(null);

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

    let dead=false;
    const objectUrls:string[]=[];
    async function decode(url:string,setter:(value:string)=>void){
      try{
        const response=await fetch(`${url}?v=${V}&r=${Date.now()}`,{cache:'no-store'});
        if(!response.ok)return;
        const blob=await response.blob();
        if(!blob.size)return;
        const objectUrl=URL.createObjectURL(blob);
        const probe=new Image();
        probe.onload=()=>{
          if(dead){URL.revokeObjectURL(objectUrl);return}
          objectUrls.push(objectUrl);
          setter(objectUrl);
        };
        probe.onerror=()=>URL.revokeObjectURL(objectUrl);
        probe.src=objectUrl;
      }catch{/* branded fallback stays visible */}
    }
    decode('/pwa/diambars-splash.webp',setSplash);
    decode('/pwa/diambars-icon-512.png',setIcon);

    return()=>{
      dead=true;
      objectUrls.forEach(url=>URL.revokeObjectURL(url));
    };
  },[]);

  return <main style={S.main}>
    <div style={S.atmosphere} aria-hidden='true'>
      <span style={{...S.redBand,top:-80,left:-145,transform:'rotate(-42deg)'}}/>
      <span style={{...S.redBand,bottom:-95,right:-155,transform:'rotate(-42deg)'}}/>
      <span style={S.ring}/>
    </div>

    {!splash&&<section style={S.brandFallback} aria-label='Diambars FC'>
      {icon
        ? <div style={{...S.logo,backgroundImage:`url('${icon}')`}}/>
        : <div style={S.monogram}><span>DFC</span></div>}
      <strong style={S.title}>DIAMBARS FC</strong>
      <span style={S.sub}>Performance <b>·</b> Monitoring <b>·</b> Médical <b>·</b> Suivi joueur</span>
      <small style={S.powered}>Powered by <b>HDY</b> Performance Engine</small>
    </section>}

    {splash&&<div aria-hidden='true' style={{...S.art,backgroundImage:`url('${splash}')`}}/>}
    <div style={S.bottomShade}/>

    <section style={S.dock}>
      <p style={S.kicker}>APPLICATION STAFF · TEST INTERNE</p>
      <a href='/admin/sport?app=diambars' style={S.button}>Entrer dans l’espace Diambars <span aria-hidden='true'>→</span></a>
      <p style={S.help}><span style={S.share}>↑</span> iPhone : Partager → Sur l’écran d’accueil</p>
    </section>
  </main>
}

const S:Record<string,React.CSSProperties>={
  main:{minHeight:'100dvh',position:'relative',overflow:'hidden',background:'#030303',color:'#fff',fontFamily:'Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif'},
  atmosphere:{position:'absolute',inset:0,overflow:'hidden',background:'radial-gradient(circle at 50% 42%,rgba(215,25,32,.18),transparent 34%),linear-gradient(160deg,#030303 0%,#0A090A 56%,#120304 100%)'},
  redBand:{position:'absolute',width:240,height:62,background:'linear-gradient(90deg,#F1121B,#6A060B 56%,rgba(38,0,2,.15))',boxShadow:'0 0 28px rgba(239,18,28,.25)'},
  ring:{position:'absolute',width:'min(110vw,560px)',height:'min(110vw,560px)',borderRadius:'50%',border:'28px solid rgba(110,0,6,.12)',left:'50%',top:'42%',transform:'translate(-50%,-50%)'},
  brandFallback:{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:14,padding:'0 24px 120px',zIndex:1,textAlign:'center'},
  logo:{width:'min(54vw,260px)',aspectRatio:'1',borderRadius:38,backgroundSize:'cover',backgroundPosition:'center',backgroundRepeat:'no-repeat',boxShadow:'0 18px 70px rgba(215,25,32,.22)'},
  monogram:{width:'min(48vw,220px)',aspectRatio:'1',borderRadius:'50%',display:'grid',placeItems:'center',border:'8px solid #E31E24',boxShadow:'inset 0 0 0 8px #fff,0 20px 70px rgba(215,25,32,.2)',background:'#080808',color:'#fff',fontSize:'clamp(38px,12vw,64px)',fontWeight:950,letterSpacing:-2},
  title:{fontSize:'clamp(34px,10vw,58px)',letterSpacing:-2,lineHeight:.96,fontWeight:950,textShadow:'0 5px 24px rgba(0,0,0,.45)'},
  sub:{fontSize:'clamp(11px,3vw,15px)',color:'#E4E4E7',letterSpacing:.1},
  powered:{position:'absolute',bottom:145,color:'#71717A',fontSize:11,letterSpacing:.3},
  art:{position:'absolute',inset:0,zIndex:1,backgroundSize:'cover',backgroundPosition:'center center',backgroundRepeat:'no-repeat'},
  bottomShade:{position:'absolute',zIndex:2,left:0,right:0,bottom:0,height:'31%',background:'linear-gradient(180deg,transparent 0%,rgba(0,0,0,.68) 36%,#030303 100%)',pointerEvents:'none'},
  dock:{position:'absolute',zIndex:3,left:16,right:16,bottom:'max(14px,env(safe-area-inset-bottom))',maxWidth:520,margin:'0 auto',display:'grid',gap:10,padding:'13px 13px 10px',borderRadius:22,background:'rgba(8,8,9,.58)',border:'1px solid rgba(255,255,255,.08)',boxShadow:'0 18px 55px rgba(0,0,0,.38)',backdropFilter:'blur(18px)',WebkitBackdropFilter:'blur(18px)'},
  kicker:{fontSize:9,fontWeight:900,letterSpacing:1.8,color:'#FF343C',textAlign:'center',margin:'0 0 1px'},
  button:{display:'flex',alignItems:'center',justifyContent:'center',gap:10,minHeight:54,borderRadius:16,background:'linear-gradient(180deg,#F01F27,#D71920)',color:'#fff',textDecoration:'none',fontSize:'clamp(15px,4.4vw,19px)',fontWeight:950,boxShadow:'0 12px 32px rgba(215,25,32,.24)'},
  help:{fontSize:11,color:'#A1A1AA',textAlign:'center',lineHeight:1.35,margin:0},
  share:{display:'inline-grid',placeItems:'center',width:18,height:18,border:'1px solid #52525B',borderRadius:6,color:'#fff',fontWeight:900,marginRight:3}
};
