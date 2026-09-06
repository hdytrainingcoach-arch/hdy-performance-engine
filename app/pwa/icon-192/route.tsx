import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    <div style={{width:'192px',height:'192px',display:'flex',alignItems:'center',justifyContent:'center',background:'linear-gradient(145deg,#2A2A2A 0%,#050505 42%,#111 100%)',borderRadius:'42px',fontFamily:'Arial, sans-serif',boxShadow:'inset 0 0 0 2px #3F3F46'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',width:'164px',height:'164px',borderRadius:'34px',background:'rgba(255,255,255,.02)',color:'#FFFFFF',fontWeight:950,fontSize:'70px',letterSpacing:'-7px'}}>HDY</div>
    </div>,
    { width: 192, height: 192 }
  );
}
