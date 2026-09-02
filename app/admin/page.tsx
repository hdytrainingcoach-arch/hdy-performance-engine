export default function AdminHome(){
  return <main style={S.main}>
    <section style={S.hero}>
      <span style={S.kicker}>HDY PERFORMANCE ENGINE</span>
      <h1 style={S.h1}>Centre de gestion</h1>
      <p style={S.p}>Choisis ton espace. Les fonctions administratives et sportives sont désormais séparées.</p>
    </section>
    <section style={S.grid}>
      <a href='/admin/administration' style={S.card}><span style={S.tag}>ADMINISTRATION</span><h2>Administration</h2><p>Inscription joueurs, informations personnelles, famille, scolarité, organisations, staff et droits.</p><b>Entrer →</b></a>
      <a href='/admin/sport' style={S.card}><span style={S.tag}>SPORT & PERFORMANCE</span><h2>Sport & Performance</h2><p>Séances, tests, monitoring Hooper/RPE/douleur, analyse et comparateur.</p><b>Entrer →</b></a>
    </section>
    <a href='/admin/workspace' style={S.dashboard}>Ouvrir le Dashboard principal</a>
  </main>
}
const S:Record<string,React.CSSProperties>={main:{minHeight:'100vh',background:'#09090B',color:'#FAFAFA',fontFamily:'Inter,system-ui,sans-serif',display:'grid',alignContent:'center',padding:28},hero:{maxWidth:980,width:'100%',margin:'0 auto 22px'},kicker:{fontSize:11,letterSpacing:1.5,fontWeight:900,color:'#E31E24'},h1:{fontSize:'clamp(44px,7vw,82px)',letterSpacing:-4,margin:'5px 0 10px'},p:{color:'#A1A1AA',fontSize:17,maxWidth:680},grid:{maxWidth:980,width:'100%',margin:'0 auto',display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:14},card:{background:'#141416',border:'1px solid #2B2B31',borderRadius:20,padding:24,color:'#fff',textDecoration:'none',display:'grid',gap:12},tag:{fontSize:10,fontWeight:900,color:'#E31E24'},dashboard:{maxWidth:980,width:'100%',boxSizing:'border-box',margin:'14px auto 0',border:'1px solid #2B2B31',borderRadius:12,padding:'12px 15px',color:'#fff',textDecoration:'none',textAlign:'center',fontWeight:800}};
