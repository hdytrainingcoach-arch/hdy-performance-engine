import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    <div
      style={{
        width: '512px',
        height: '512px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#050505',
        borderRadius: '96px',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <div
        style={{
          width: '352px',
          height: '352px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#E31E24',
          borderRadius: '80px',
          color: '#FFFFFF',
          fontWeight: 900,
          fontSize: '144px',
          letterSpacing: '-8px',
        }}
      >
        HDY
      </div>
    </div>,
    { width: 512, height: 512 }
  );
}
