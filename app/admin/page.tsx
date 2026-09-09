export default function AdminHome(){
  return <main style={S.main}>
    <section style={S.grid}>
      <a href='/admin/administration' style={S.card}><span style={S.tag}>ADMINISTRATION</span><h2>Administration</h2><p>Organisation, joueurs, équipes, staff, rôles, permissions et accès.</p><b>Entrer →</b></a>
      <a href='/admin/sport' style={S.card}><span style={S.tag}>SPORT & PERFORMANCE</span><h2>Sport & Performance</h2><p>Séances, tests, monitoring Hooper/RPE/douleur, GPS, alertes et comparatif.</p><b>Entrer →</b></a>
    </section>
    <a href='/admin/workspace' style={S.dashboard}>Ouvrir le Dashboard principal</a>
  </main>
}
const S:Record<string,React.CSSProperties>={main:{minHeight:'calc(100vh - 68px)',background:'transparent',color:'#FAFAFA',fontFamily:'Inter,system-ui,sans-serif',display:'grid',alignContent:'center',padding:28},hero:{maxWidth:980,width:'100%',margin:'0 auto 22px'},kicker:{fontSize:10,letterSpacing:1.7,fontWeight:950,color:'var(--page-accent,var(--brand-accent,#F4F4F5))'},h1:{fontSize:'clamp(44px,7vw,82px)',letterSpacing:-4,margin:'5px 0 10px'},p:{color:'#A1A1AA',fontSize:17,maxWidth:680,lineHeight:1.55},grid:{maxWidth:980,width:'100%',margin:'0 auto',display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:14},card:{background:'linear-gradient(145deg,rgba(20,20,22,.96),rgba(12,12,14,.96))',border:'1px solid var(--brand-border,#2B2B31)',borderRadius:20,padding:24,color:'#fff',textDecoration:'none',display:'grid',gap:12,boxShadow:'0 20px 55px rgba(0,0,0,.16)'},tag:{fontSize:9,fontWeight:950,letterSpacing:1.4,color:'var(--page-accent,var(--brand-accent,#F4F4F5))'},dashboard:{maxWidth:980,width:'100%',boxSizing:'border-box',margin:'14px auto 0',border:'1px solid var(--brand-border,#2B2B31)',borderRadius:12,padding:'13px 15px',color:'#fff',textDecoration:'none',textAlign:'center',fontWeight:850,background:'rgba(255,255,255,.025)'}};
