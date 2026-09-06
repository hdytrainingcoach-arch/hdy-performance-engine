import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'HDY Performance Engine',
  description: 'Plateforme globale — monitoring, performance et data.',
  applicationName: 'HDY Performance Engine',
  manifest: '/hdy.webmanifest',
  appleWebApp: { capable: true, title: 'HDY Performance', statusBarStyle: 'black-translucent' },
  icons: {
    icon: [
      { url: '/pwa/icon-192', sizes: '192x192', type: 'image/png' },
      { url: '/pwa/icon-512', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/pwa/icon-192', sizes: '192x192', type: 'image/png' }],
  },
};

export default function HDYLayout({children}:{children:React.ReactNode}){
  return children;
}
