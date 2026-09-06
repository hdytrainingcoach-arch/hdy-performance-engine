import type { Metadata, Viewport } from 'next';

const V = '20260906-ios2';

export const metadata: Metadata = {
  title: 'Diambars FC',
  description: 'Espace staff Diambars FC — performance, monitoring, médical et suivi joueur.',
  applicationName: 'Diambars FC',
  manifest: `/diambars.webmanifest?v=${V}`,
  appleWebApp: { capable: true, title: 'Diambars FC', statusBarStyle: 'black-translucent' },
  icons: {
    icon: [
      { url: `/pwa/diambars-icon-192.png?v=${V}`, sizes: '192x192', type: 'image/png' },
      { url: `/pwa/diambars-icon-512.png?v=${V}`, sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: `/pwa/diambars-apple-touch-icon.png?v=${V}`, sizes: '192x192', type: 'image/png' }],
  },
};

export const viewport: Viewport = {
  themeColor: '#D71920',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function DiambarsLayout({children}:{children:React.ReactNode}){
  return children;
}
