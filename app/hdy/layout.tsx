import type { Metadata, Viewport } from 'next';

const V = '20260907-visual-final';

export const metadata: Metadata = {
  title: 'HDY Performance Engine',
  description: 'Plateforme globale — monitoring, performance, data et athlete management.',
  applicationName: 'HDY Performance Engine',
  manifest: `/hdy.webmanifest?v=${V}`,
  appleWebApp: { capable: true, title: 'HDY Performance', statusBarStyle: 'black-translucent' },
  icons: {
    icon: [
      { url: `/pwa/hdy-icon-192.png?v=${V}`, sizes: '192x192', type: 'image/png' },
      { url: `/pwa/hdy-icon-512.png?v=${V}`, sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: `/pwa/hdy-apple-touch-icon.png?v=${V}`, sizes: '192x192', type: 'image/png' }],
  },
};

export const viewport: Viewport = {
  themeColor: '#050505',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function HDYLayout({children}:{children:React.ReactNode}){
  return children;
}
