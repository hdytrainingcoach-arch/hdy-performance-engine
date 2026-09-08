import React from 'react';
import { ImageResponse } from 'next/og';

// Placeholder programmatique aux couleurs du club (noir/rouge/blanc), en attendant
// l'intégration du vrai blason Diambars FC en asset statique.
export function diambarsIcon(size: number) {
  return new ImageResponse(
    React.createElement('div', { style: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle at 50% 40%,rgba(215,25,32,.16),transparent 55%),linear-gradient(145deg,#050304,#0D0607 60%,#150607)', fontFamily: 'Arial, sans-serif' } },
      React.createElement('div', { style: { width: '82%', height: '82%', borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle at 35% 25%,#1A1112,#0A0505 58%,#050304)', border: `${Math.max(4, Math.round(size * .018))}px solid #D71920`, boxShadow: `0 0 0 ${Math.max(6, Math.round(size * .028))}px rgba(215,25,32,.12)` } },
        React.createElement('div', { style: { fontSize: Math.round(size * .30), fontWeight: 900, letterSpacing: -Math.round(size * .018), lineHeight: .9, color: '#fff' } }, 'DFC'),
        React.createElement('div', { style: { marginTop: Math.round(size * .04), fontSize: Math.round(size * .056), fontWeight: 700, letterSpacing: Math.round(size * .016), color: '#D71920' } }, 'DIAMBARS')
      )
    ),
    { width: size, height: size }
  );
}
