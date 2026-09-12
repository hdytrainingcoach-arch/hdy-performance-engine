'use client';

export default function LabHub(){
 const cards=[
  {href:'/admin/sport/lab/jump',title:'Sauts (vidéo)',desc:'CMJ, Squat Jump, Sargent Test, Drop Jump / RSI, test d’asymétrie gauche/droite — mesure au temps de vol.'},
  {href:'/admin/sport/lab/force-velocity',title:'Profil Force-Vitesse',desc:'Sauts chargés (poids de corps + charges), F0/V0/Pmax par régression linéaire (méthode Samozino).'},
  {href:'/admin/sport/lab/hop',title:'Hop-tests (retour au jeu)',desc:'Single/Triple/Crossover hop pour la distance, LSI gauche/droite — batterie standard de retour au jeu.'},
  {href:'/admin/sport/lab/sprint',title:'Sprint (chrono vidéo)',desc:'Portillon vidéo : marque le départ et l’arrivée pour chronométrer un sprint 5 à 40 m sans cellules.'},
  {href:'/admin/sport/lab/vbt',title:'VBT · Vitesse concentrique',desc:'Vitesse moyenne de la phase concentrique à partir d’une distance de déplacement connue et d’une vidéo.'},
  {href:'/admin/sport/lab/aerobic',title:'Tests aérobies',desc:'Navette sonore configurable (VAMEVAL, 30-15 IFT, Yo-Yo IR1) et Cooper/Demi-Cooper.'},
  {href:'/admin/sport/lab/screen',title:'Écrans fonctionnels',desc:'Overhead Squat, Overhead Lunge, Lateral Overhead Squat — grille de score des compensations.'},
  {href:'/admin/sport/lab/mobility',title:'Mobilité · Inclinomètre',desc:'Mesure d’angle avec les capteurs de l’iPhone (dorsiflexion cheville, inclinaison du tronc…).'},
 ];
 return <main style={S.main}>
  <header style={S.header}>
   <div><span style={S.kicker}>HDY LAB</span><h1>Tests de terrain, sans matériel dédié</h1><p>Une suite de tests physiques exploitables au terrain avec un simple smartphone — dans l’esprit My Jump Lab / Hexfit Lab, connectée au dossier joueur HDY.</p></div>
   <a href='/admin/sport' style={S.back}>← Sport & Performance</a>
  </header>
  <section style={S.grid}>{cards.map(c=><a key={c.title} href={c.href} style={S.card}><span style={S.badge}>HDY LAB</span><h2>{c.title}</h2><p>{c.desc}</p><b>Ouvrir →</b></a>)}</section>
 </main>
}

const S:Record<string,React.CSSProperties>={
 main:{minHeight:'100vh',background:'#09090B',color:'#FAFAFA',fontFamily:'Inter,system-ui,sans-serif',padding:28},
 header:{maxWidth:1200,margin:'0 auto 24px',display:'flex',justifyContent:'space-between',gap:20,alignItems:'flex-start'},
 kicker:{fontSize:11,fontWeight:900,letterSpacing:1.4,color:'#E31E24'},
 back:{color:'#fff',textDecoration:'none',border:'1px solid #2B2B31',padding:'10px 12px',borderRadius:10,height:'fit-content'},
 grid:{maxWidth:1200,margin:'0 auto',display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(250px,1fr))',gap:14},
 card:{background:'linear-gradient(145deg,rgba(20,20,22,.96),rgba(12,12,14,.96))',border:'1px solid #2B2B31',borderRadius:18,padding:20,color:'#fff',textDecoration:'none',display:'grid',gap:10},
 badge:{fontSize:9,fontWeight:950,letterSpacing:1.25,color:'#E31E24'},
};
