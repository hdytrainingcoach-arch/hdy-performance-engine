export default function DiambarsInstall(){
  return <main style={S.main}>
    <img src='/pwa/diambars-splash' alt='Diambars FC — Performance, Monitoring, Médical, Suivi joueur' style={S.art}/>
    <div style={S.fade}/>
    <section style={S.actions}>
      <p style={S.kicker}>APPLICATION STAFF · TEST INTERNE</p>
      <a href='/admin/sport' style={S.button}>Ouvrir l’espace Diambars →</a>
      <p style={S.help}>iPhone : Safari → Partager → Sur l’écran d’accueil · Android/ordinateur : Installer Diambars.</p>
    </section>
  </main>
}

const S:Record<string,React.CSSProperties>={
  main:{minHeight:'100dvh',position:'relative',overflow:'hidden',display:'grid',placeItems:'center',background:'#030303',color:'#fff',fontFamily:'Inter,system-ui,sans-serif'},
  art:{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'contain',background:'#030303'},
  fade:{position:'absolute',left:0,right:0,bottom:0,height:'28%',background:'linear-gradient(180deg,transparent,rgba(0,0,0,.82) 52%,#030303 100%)',pointerEvents:'none'},
  actions:{position:'absolute',zIndex:2,left:18,right:18,bottom:'max(20px,env(safe-area-inset-bottom))',maxWidth:520,margin:'0 auto',display:'grid',gap:9},
  kicker:{fontSize:9,fontWeight:900,letterSpacing:1.45,color:'#D71920',textAlign:'center',margin:0},
  button:{display:'grid',placeItems:'center',height:50,borderRadius:14,background:'#D71920',color:'#fff',textDecoration:'none',fontWeight:950,boxShadow:'0 12px 38px rgba(0,0,0,.42)'},
  help:{fontSize:10,color:'#A1A1AA',textAlign:'center',lineHeight:1.45,margin:0}
};
