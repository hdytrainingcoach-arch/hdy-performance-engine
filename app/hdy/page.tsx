export default function HDYInstall(){
  return <main style={S.main}>
    <div style={S.diagTop}/><div style={S.diagBottom}/><div style={S.ring1}/><div style={S.ring2}/><div style={S.horizon}/>
    <section style={S.hero}>
      <img src='/pwa/icon-512' alt='HDY' style={S.logo}/>
      <h1 style={S.h1}><strong>HDY</strong> PERFORMANCE ENGINE</h1>
      <p style={S.sub}>Monitoring · Performance · Data</p>
      <div style={S.installCard}>
        <p style={S.kicker}>PLATEFORME GLOBALE</p>
        <h2 style={S.h2}>Installer HDY Performance Engine</h2>
        <p style={S.copy}><b>iPhone / iPad :</b> Safari → Partager → Sur l’écran d’accueil → Ajouter.</p>
        <p style={S.copy}><b>Android / ordinateur :</b> utilise <b>Installer HDY</b> dans le navigateur.</p>
        <a href='/admin' style={S.button}>Ouvrir la plateforme →</a>
      </div>
      <p style={S.tagline}>A BETTER GAME GLOBALLY</p>
    </section>
  </main>
}

const S:Record<string,React.CSSProperties>={
  main:{minHeight:'100vh',position:'relative',overflow:'hidden',display:'grid',placeItems:'center',background:'radial-gradient(circle at 50% 36%,#1B1B1D 0%,#080808 46%,#020202 100%)',padding:'36px 20px',color:'#fff',fontFamily:'Inter,system-ui,sans-serif'},
  diagTop:{position:'absolute',width:'58vw',height:54,top:'2%',left:'-18%',transform:'rotate(-45deg)',background:'linear-gradient(90deg,#303033,#0B0B0C)'},
  diagBottom:{position:'absolute',width:'66vw',height:54,right:'-22%',bottom:'4%',transform:'rotate(-45deg)',background:'linear-gradient(90deg,#0B0B0C,#252527)'},
  ring1:{position:'absolute',width:'76vw',height:'76vw',maxWidth:680,maxHeight:680,borderRadius:'50%',border:'1px solid rgba(255,255,255,.045)',top:'8%',left:'50%',transform:'translateX(-50%)'},
  ring2:{position:'absolute',width:'60vw',height:'60vw',maxWidth:530,maxHeight:530,borderRadius:'50%',border:'1px solid rgba(255,255,255,.028)',top:'14%',left:'50%',transform:'translateX(-50%)'},
  horizon:{position:'absolute',left:'-10%',right:'-10%',height:140,bottom:'24%',borderTop:'3px solid rgba(255,255,255,.62)',borderRadius:'50%',boxShadow:'0 -9px 28px rgba(255,255,255,.12)'},
  hero:{position:'relative',zIndex:2,width:'100%',maxWidth:560,textAlign:'center',display:'grid',justifyItems:'center'},
  logo:{width:'clamp(180px,43vw,285px)',height:'clamp(180px,43vw,285px)',borderRadius:'22%',objectFit:'cover',filter:'drop-shadow(0 18px 34px rgba(255,255,255,.08))'},
  h1:{fontSize:'clamp(34px,7.5vw,58px)',letterSpacing:-1.5,lineHeight:1,fontWeight:350,margin:'26px 0 10px'},
  sub:{color:'#C6C6C9',fontSize:'clamp(13px,3vw,18px)',letterSpacing:2.3,margin:'0 0 32px'},
  installCard:{width:'100%',boxSizing:'border-box',background:'rgba(14,14,15,.88)',border:'1px solid #2E2E32',backdropFilter:'blur(14px)',borderRadius:22,padding:22,textAlign:'left',boxShadow:'0 24px 70px rgba(0,0,0,.34)'},
  kicker:{fontSize:10,fontWeight:900,letterSpacing:1.7,color:'#A1A1AA',margin:'0 0 7px'},
  h2:{fontSize:23,margin:'0 0 12px'},copy:{color:'#A1A1AA',lineHeight:1.55,fontSize:14,margin:'8px 0'},
  button:{display:'grid',placeItems:'center',height:50,borderRadius:12,background:'#F4F4F5',color:'#09090B',textDecoration:'none',fontWeight:950,marginTop:18},
  tagline:{fontSize:10,color:'#71717A',letterSpacing:4.5,fontWeight:650,marginTop:30}
};
