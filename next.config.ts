import type { NextConfig } from 'next';

// En-têtes de sécurité appliqués à toutes les routes.
//
// CSP : voir docs/CSP_NOTES.md pour le détail des essais et des limites.
// En résumé — une CSP avec nonce par requête (script-src strict) a été testée
// via middleware et CASSE le rendu en production : Next.js n'applique pas
// automatiquement ce nonce à ses propres scripts injectés dans cette version,
// toute la page reste blanche. Reposé ici en statique, sans nonce :
//   - script-src / style-src gardent 'unsafe-inline' (nécessaire : Next injecte
//     ses propres scripts inline, et l'app utilise des styles React inline
//     massivement — aucun mécanisme de nonce n'existe pour l'attribut style="").
//   - le reste est restrictif : pas de cadrage (clickjacking), pas d'origine
//     tierce pour scripts/connexions hors Supabase, pas d'object/embed.
// Amélioration future : basculer sur un nonce par requête correctement threadé
// (nécessite de lire `headers()` dans chaque layout et de vérifier le
// comportement exact de la version de Next au moment du changement).
const supabaseHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || '').host;
  } catch {
    return '';
  }
})();

const csp = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline'`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob: https:`,
  `font-src 'self' data:`,
  `connect-src 'self' https://*.supabase.co wss://*.supabase.co${supabaseHost ? ` https://${supabaseHost} wss://${supabaseHost}` : ''}`,
  `frame-ancestors 'none'`,
  `object-src 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `upgrade-insecure-requests`,
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
