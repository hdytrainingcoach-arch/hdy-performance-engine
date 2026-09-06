import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Diambars FC · Performance',
  description: 'Espace staff Diambars FC — performance, monitoring, médical et suivi joueur.',
  applicationName: 'Diambars FC',
  manifest: '/diambars/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Diambars FC', statusBarStyle: 'black-translucent' },
  icons: {
    icon: [
      { url: '/pwa/diambars-icon-192', sizes: '192x192', type: 'image/png' },
      { url: '/pwa/diambars-icon-512', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/pwa/diambars-icon-192', sizes: '192x192', type: 'image/png' }],
  },
};

export default function DiambarsLayout({children}:{children:React.ReactNode}){
  return children;
}
