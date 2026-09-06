import type { Metadata, Viewport } from 'next';
import PWARegister from '@/components/PWARegister';
import OrgSplash from '@/components/OrgSplash';
import './globals.css';
import './brand-themes.css';

export const metadata: Metadata = {
  title: 'HDY Performance Engine',
  description: 'Monitoring joueur — disponibilité, charge, douleur et performance',
  applicationName: 'HDY Performance Engine',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'HDY Performance',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: [
      { url: '/pwa/icon-192', sizes: '192x192', type: 'image/png' },
      { url: '/pwa/icon-512', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/pwa/icon-192', sizes: '192x192', type: 'image/png' }],
  },
  formatDetection: { telephone: false },
  other: { 'mobile-web-app-capable': 'yes' },
};

export const viewport: Viewport = {
  themeColor: '#050505',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>
        <OrgSplash />
        {children}
        <PWARegister />
      </body>
    </html>
  );
}
