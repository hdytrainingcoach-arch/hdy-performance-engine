import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    <div style={{width:'512px',height:'512px',display:'flex',alignItems:'center',justifyContent:'center',background:'linear-gradient(145deg,#2A2A2A 0%,#050505 42%,#111 100%)',borderRadius:'112px',fontFamily:'Arial, sans-serif',boxShadow:'inset 0 0 0 6px #3F3F46'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',width:'440px',height:'440px',borderRadius:'92px',background:'rgba(255,255,255,.02)',color:'#FFFFFF',fontWeight:950,fontSize:'188px',letterSpacing:'-18px'}}>HDY</div>
    </div>,
    { width: 512, height: 512 }
  );
}
