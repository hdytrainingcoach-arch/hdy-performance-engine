import type { ReactNode } from 'react';

export default function WorkspaceLayout({children}:{children:ReactNode}){
 return <>
  <div style={{position:'sticky',top:0,zIndex:60,display:'flex',gap:8,flexWrap:'wrap',padding:'8px 14px',background:'#08080A',borderBottom:'1px solid #242428',fontFamily:'Inter,system-ui,sans-serif'}}>
   <strong style={{color:'#fff',marginRight:8,alignSelf:'center',fontSize:12,letterSpacing:.8}}>ACCÈS RAPIDES</strong>
   <a href='/admin/manage?tab=player' style={link}>Fiche joueur</a>
   <a href='/admin/manage?tab=tests' style={link}>Tests</a>
   <a href='/admin/manage?tab=staff' style={link}>Staff & accès</a>
   <a href='/admin/manage/advanced' style={{...link,background:'#E31E24',borderColor:'#E31E24'}}>Séances · Famille · Scolarité · Clubs</a>
  </div>
  {children}
 </>
}
const link:React.CSSProperties={textDecoration:'none',color:'#fff',border:'1px solid #34343A',borderRadius:9,padding:'8px 11px',fontWeight:800,fontSize:12,background:'#151518'};
