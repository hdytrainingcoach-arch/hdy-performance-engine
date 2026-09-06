import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    <div style={{width:'512px',height:'512px',display:'flex',alignItems:'center',justifyContent:'center',position:'relative',overflow:'hidden',background:'linear-gradient(145deg,#050505 0%,#111 68%,#7A1015 100%)',borderRadius:'112px',fontFamily:'Arial, sans-serif'}}>
      <div style={{position:'absolute',top:'-30px',left:'-100px',width:'300px',height:'95px',background:'#D71920',transform:'rotate(-45deg)',opacity:.95}} />
      <div style={{position:'absolute',bottom:'-30px',right:'-100px',width:'300px',height:'95px',background:'#D71920',transform:'rotate(-45deg)',opacity:.95}} />
      <div style={{width:'398px',height:'398px',display:'flex',alignItems:'center',justifyContent:'center',borderRadius:'999px',background:'#fff',border:'22px solid #D71920',boxShadow:'0 0 0 12px #111'}}>
        <div style={{width:'314px',height:'314px',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'space-between',borderRadius:'999px',background:'#111',border:'14px solid #D71920',padding:'26px 18px',color:'#fff',boxSizing:'border-box'}}>
          <div style={{fontSize:'38px',fontWeight:950,letterSpacing:'6px'}}>DIAMBARS</div>
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',width:'168px',height:'126px',fontSize:'92px',fontWeight:950}}>⚽</div>
          <div style={{fontSize:'48px',fontWeight:950,letterSpacing:'3px'}}>FC</div>
        </div>
      </div>
    </div>,
    { width: 512, height: 512 }
  );
}
