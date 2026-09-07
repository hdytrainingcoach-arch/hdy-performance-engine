import type { Metadata, Viewport } from 'next';
import PWARegister from '@/components/PWARegister';
import OrgSplash from '@/components/OrgSplash';
import './globals.css';
import './brand-themes.css';
import './player-da.css';

export const metadata: Metadata = {
  title: 'HDY Performance Engine',
  description: 'Monitoring joueur — disponibilité, charge, douleur et performance',
  applicationName: 'HDY Performance Engine',
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
