import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'HDY Performance Engine',
  description: 'Monitoring joueur — disponibilité, charge, douleur et performance',
  applicationName: 'HDY Performance Engine',
};

export const viewport: Viewport = { themeColor: '#050505', width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fr"><body>{children}</body></html>;
}
