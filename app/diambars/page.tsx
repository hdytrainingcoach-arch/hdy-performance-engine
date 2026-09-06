export default function DiambarsInstall(){
  return <main style={S.main}>
    <div style={S.diagTop}/><div style={S.diagBottom}/><div style={S.ring1}/><div style={S.ring2}/>
    <section style={S.hero}>
      <img src='/pwa/diambars-icon-512' alt='Diambars FC' style={S.logo}/>
      <h1 style={S.h1}>DIAMBARS FC</h1>
      <div style={S.redLine}/>
      <p style={S.sub}>Performance <b>·</b> Monitoring <b>·</b> Médical <b>·</b> Suivi joueur</p>
      <div style={S.installCard}>
        <p style={S.kicker}>APPLICATION STAFF · TEST INTERNE</p>
        <h2 style={S.h2}>Installer sur l’écran d’accueil</h2>
        <p style={S.copy}><b>iPhone / iPad :</b> Safari → Partager → Sur l’écran d’accueil → Ajouter.</p>
        <p style={S.copy}><b>Android / ordinateur :</b> utilise <b>Installer Diambars</b> dans le navigateur.</p>
        <a href='/admin' style={S.button}>Ouvrir l’espace staff →</a>
      </div>
      <p style={S.powered}>Powered by <strong>HDY</strong> Performance Engine</p>
    </section>
  </main>
}

const S:Record<string,React.CSSProperties>={
  main:{minHeight:'100vh',position:'relative',overflow:'hidden',display:'grid',placeItems:'center',background:'radial-gradient(circle at 50% 34%,#281012 0%,#0A0A0C 45%,#030303 100%)',padding:'36px 20px',color:'#fff',fontFamily:'Inter,system-ui,sans-serif'},
  diagTop:{position:'absolute',width:'52vw',height:38,top:'2%',left:'-14%',transform:'rotate(-45deg)',background:'linear-gradient(90deg,#E31E24,#6A0D11)',boxShadow:'0 0 30px rgba(227,30,36,.35)'},
  diagBottom:{position:'absolute',width:'62vw',height:38,right:'-20%',bottom:'6%',transform:'rotate(-45deg)',background:'linear-gradient(90deg,#6A0D11,#E31E24)',boxShadow:'0 0 30px rgba(227,30,36,.28)'},
  ring1:{position:'absolute',width:'78vw',height:'78vw',maxWidth:690,maxHeight:690,borderRadius:'50%',border:'1px solid rgba(227,30,36,.08)',top:'8%',left:'50%',transform:'translateX(-50%)'},
  ring2:{position:'absolute',width:'61vw',height:'61vw',maxWidth:540,maxHeight:540,borderRadius:'50%',border:'1px solid rgba(255,255,255,.04)',top:'13%',left:'50%',transform:'translateX(-50%)'},
  hero:{position:'relative',zIndex:2,width:'100%',maxWidth:560,textAlign:'center',display:'grid',justifyItems:'center'},
  logo:{width:'clamp(180px,43vw,285px)',height:'clamp(180px,43vw,285px)',borderRadius:'22%',objectFit:'cover',filter:'drop-shadow(0 18px 40px rgba(227,30,36,.16))'},
  h1:{fontSize:'clamp(44px,10vw,78px)',letterSpacing:-2.4,lineHeight:.95,fontWeight:950,margin:'24px 0 10px'},
  redLine:{width:150,height:2,background:'#E31E24',boxShadow:'0 0 12px rgba(227,30,36,.9)',marginBottom:16},
  sub:{color:'#D4D4D8',fontSize:'clamp(13px,3vw,18px)',margin:'0 0 32px'},
  installCard:{width:'100%',boxSizing:'border-box',background:'rgba(17,17,19,.86)',border:'1px solid #332126',backdropFilter:'blur(14px)',borderRadius:22,padding:22,textAlign:'left',boxShadow:'0 24px 70px rgba(0,0,0,.34)'},
  kicker:{fontSize:10,fontWeight:900,letterSpacing:1.5,color:'#D71920',margin:'0 0 7px'},
  h2:{fontSize:23,margin:'0 0 12px'},
  copy:{color:'#A1A1AA',lineHeight:1.55,fontSize:14,margin:'8px 0'},
  button:{display:'grid',placeItems:'center',height:50,borderRadius:12,background:'#D71920',color:'#fff',textDecoration:'none',fontWeight:900,marginTop:18},
  powered:{fontSize:10,color:'#71717A',letterSpacing:.3,fontWeight:650,marginTop:28}
};
