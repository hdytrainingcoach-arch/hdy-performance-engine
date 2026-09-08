import React from 'react';
import { ImageResponse } from 'next/og';

export function hdyIcon(size: number) {
  return new ImageResponse(
    React.createElement('div', { style: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(145deg,#050505,#131316 58%,#030303)', fontFamily: 'Arial, sans-serif' } },
      React.createElement('div', { style: { width: '82%', height: '82%', borderRadius: Math.round(size * 0.22), display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle at 35% 25%,#232327,#0A0A0C 58%,#020203)', border: `${Math.max(4, Math.round(size * .018))}px solid #E6E6EA`, boxShadow: `0 0 0 ${Math.max(6, Math.round(size * .028))}px rgba(255,255,255,.05)` } },
        React.createElement('div', { style: { fontSize: Math.round(size * .30), fontWeight: 900, letterSpacing: -Math.round(size * .018), lineHeight: .9, color: '#fff' } }, 'HDY'),
        React.createElement('div', { style: { marginTop: Math.round(size * .04), fontSize: Math.round(size * .062), fontWeight: 700, letterSpacing: Math.round(size * .018), color: '#D7D7DD' } }, 'PERFORMANCE')
      )
    ),
    { width: size, height: size }
  );
}
