import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    <div style={{width:'192px',height:'192px',display:'flex',alignItems:'center',justifyContent:'center',position:'relative',overflow:'hidden',background:'linear-gradient(145deg,#050505 0%,#111 68%,#7A1015 100%)',borderRadius:'42px',fontFamily:'Arial, sans-serif'}}>
      <div style={{position:'absolute',top:'-12px',left:'-38px',width:'110px',height:'38px',background:'#D71920',transform:'rotate(-45deg)',opacity:.95}} />
      <div style={{position:'absolute',bottom:'-12px',right:'-38px',width:'110px',height:'38px',background:'#D71920',transform:'rotate(-45deg)',opacity:.95}} />
      <div style={{width:'148px',height:'148px',display:'flex',alignItems:'center',justifyContent:'center',borderRadius:'999px',background:'#fff',border:'8px solid #D71920',boxShadow:'0 0 0 4px #111'}}>
        <div style={{width:'116px',height:'116px',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'space-between',borderRadius:'999px',background:'#111',border:'5px solid #D71920',padding:'9px 7px',color:'#fff',boxSizing:'border-box'}}>
          <div style={{fontSize:'14px',fontWeight:950,letterSpacing:'2px'}}>DIAMBARS</div>
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',width:'62px',height:'48px',fontSize:'34px',fontWeight:950}}>⚽</div>
          <div style={{fontSize:'18px',fontWeight:950,letterSpacing:'1px'}}>FC</div>
        </div>
      </div>
    </div>,
    { width: 192, height: 192 }
  );
}
