export default function HDYInstall(){
  return <main style={S.main}>
    <img src='/pwa/hdy-splash' alt='HDY Performance Engine — Monitoring, Performance, Data' style={S.art}/>
    <div style={S.fade}/>
    <section style={S.actions}>
      <p style={S.kicker}>PLATEFORME GLOBALE</p>
      <a href='/admin' style={S.button}>Ouvrir HDY Performance Engine →</a>
      <p style={S.help}>iPhone : Safari → Partager → Sur l’écran d’accueil · Android/ordinateur : Installer HDY.</p>
    </section>
  </main>
}

const S:Record<string,React.CSSProperties>={
  main:{minHeight:'100dvh',position:'relative',overflow:'hidden',display:'grid',placeItems:'center',background:'#030303',color:'#fff',fontFamily:'Inter,system-ui,sans-serif'},
  art:{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'contain',background:'#030303'},
  fade:{position:'absolute',left:0,right:0,bottom:0,height:'26%',background:'linear-gradient(180deg,transparent,rgba(0,0,0,.78) 50%,#030303 100%)',pointerEvents:'none'},
  actions:{position:'absolute',zIndex:2,left:18,right:18,bottom:'max(20px,env(safe-area-inset-bottom))',maxWidth:520,margin:'0 auto',display:'grid',gap:9},
  kicker:{fontSize:9,fontWeight:900,letterSpacing:1.65,color:'#A1A1AA',textAlign:'center',margin:0},
  button:{display:'grid',placeItems:'center',height:50,borderRadius:14,background:'#F4F4F5',color:'#09090B',textDecoration:'none',fontWeight:950,boxShadow:'0 12px 38px rgba(0,0,0,.42)'},
  help:{fontSize:10,color:'#A1A1AA',textAlign:'center',lineHeight:1.45,margin:0}
};
