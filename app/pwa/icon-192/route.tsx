import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    <div
      style={{
        width: '192px',
        height: '192px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#050505',
        borderRadius: '38px',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <div
        style={{
          width: '132px',
          height: '132px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#E31E24',
          borderRadius: '30px',
          color: '#FFFFFF',
          fontWeight: 900,
          fontSize: '54px',
          letterSpacing: '-3px',
        }}
      >
        HDY
      </div>
    </div>,
    { width: 192, height: 192 }
  );
}
