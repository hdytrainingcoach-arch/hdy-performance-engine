import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'HDY Performance Engine',
    short_name: 'HDY Performance',
    description: 'Monitoring joueur — disponibilité, charge, douleur et performance',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#050505',
    theme_color: '#050505',
    categories: ['sports', 'health', 'productivity'],
    icons: [
      {
        src: '/pwa/icon-192',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: '/pwa/icon-512',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
  };
}
