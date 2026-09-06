export default function DiambarsInstall(){
  return <main style={S.main}>
    <section style={S.card}>
      <img src='/pwa/diambars-icon-512' alt='Diambars FC' style={S.logo}/>
      <p style={S.kicker}>APPLICATION STAFF · TEST INTERNE</p>
      <h1 style={S.h1}>Diambars FC</h1>
      <p style={S.sub}>Performance · Monitoring · Médical · Suivi joueur</p>
      <div style={S.rule}/>
      <h2 style={S.h2}>Ajouter l’application sur ton téléphone</h2>
      <p style={S.copy}><b>iPhone / iPad :</b> ouvre cette page dans Safari, touche <b>Partager</b>, puis <b>Sur l’écran d’accueil</b> et <b>Ajouter</b>.</p>
      <p style={S.copy}><b>Android / ordinateur :</b> utilise le bouton <b>Installer Diambars</b> proposé par le navigateur.</p>
      <a href='/admin' style={S.button}>Ouvrir l’espace staff →</a>
      <p style={S.powered}>Powered by HDY Performance Engine</p>
    </section>
  </main>
}

const S:Record<string,React.CSSProperties>={
  main:{minHeight:'100vh',display:'grid',placeItems:'center',background:'radial-gradient(circle at top,#281012 0%,#09090B 38%,#050505 100%)',padding:20,color:'#fff',fontFamily:'Inter,system-ui,sans-serif'},
  card:{width:'100%',maxWidth:470,boxSizing:'border-box',background:'#111113',border:'1px solid #362126',borderRadius:24,padding:24,textAlign:'center',boxShadow:'0 24px 70px rgba(0,0,0,.4)'},
  logo:{width:116,height:116,borderRadius:26,objectFit:'cover',marginBottom:16},
  kicker:{fontSize:10,fontWeight:900,letterSpacing:1.5,color:'#D71920'},
  h1:{fontSize:42,letterSpacing:-1.8,margin:'5px 0 2px'},sub:{color:'#D4D4D8',margin:'0 auto 18px'},rule:{height:1,background:'#2B2B31',margin:'18px 0'},h2:{fontSize:22,margin:'0 0 12px'},copy:{textAlign:'left',color:'#A1A1AA',lineHeight:1.55,fontSize:14},button:{display:'grid',placeItems:'center',height:50,borderRadius:12,background:'#D71920',color:'#fff',textDecoration:'none',fontWeight:900,marginTop:18},powered:{fontSize:9,color:'#52525B',letterSpacing:1.1,textTransform:'uppercase',fontWeight:800,marginTop:18}
};
