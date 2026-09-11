# Content-Security-Policy — état et limites (LOT 9, réduit)

## Ce qui est en place

`next.config.ts` pose une CSP statique sur toutes les routes, avec :
- `default-src 'self'`, `frame-ancestors 'none'` (anti-clickjacking), `object-src 'none'`,
  `base-uri 'self'`, `form-action 'self'`, `upgrade-insecure-requests` ;
- `connect-src` limité à l'origine + au projet Supabase (`https://*.supabase.co`,
  `wss://*.supabase.co` et l'hôte exact déduit de `NEXT_PUBLIC_SUPABASE_URL`) ;
- `img-src` et `font-src` ouverts raisonnablement (photos joueurs, polices) ;
- `script-src` et `style-src` gardent `'unsafe-inline'`.

Vérifié en conditions réelles : build de production, `npm run start`, page `/admin/roster`
avec les 81 joueurs réels — zéro violation CSP dans la console, toutes les requêtes Supabase
(lecture ET écriture via RPC) passent.

## Pourquoi pas de nonce sur `script-src` (essayé, annulé)

Un `middleware.ts` générant un nonce par requête a été écrit et testé (pattern documenté par
Next.js : nonce pour les scripts). **Résultat : la page reste blanche en production.** Next.js
15.5 n'applique pas automatiquement ce nonce à ses propres scripts injectés (chunks `_next/static`,
script d'hydratation) dans cette configuration — chaque script et chaque exécution inline sont
bloqués par le navigateur (`EvalError` / `Loading the script … violates … script-src`).

Retenter proprement demanderait :
1. de lire le nonce via `headers()` dans chaque `layout.tsx` et de vérifier précisément quelle
   version de Next.js/quelle configuration (Turbopack ou non, `experimental.taint`, etc.) propage
   ce nonce à ses propres balises `<script>` ;
2. de re-tester un build de production complet à chaque changement — un nonce mal câblé casse
   **toute l'application**, pas seulement un écran.

Vu le risque (page blanche en prod) pour un gain incrémental (le vecteur XSS via script injecté
reste couvert par `'self'` : aucun script tiers ne peut être chargé, seul l'inline reste permissif),
ce chantier est reporté après la livraison du pilote plutôt que retenté sous contrainte de temps.

## Pourquoi `style-src 'unsafe-inline'` restera nécessaire tant que le design system n'est pas revu

L'application utilise des objets `style={{...}}` React (attribut HTML `style="..."`) de façon massive
sur la quasi-totalité des écrans. Il n'existe pas de mécanisme de nonce pour l'attribut `style=""`
(seul CSP3 permet un nonce sur des balises `<style>`, pas sur l'attribut inline) : la seule alternative
stricte serait de migrer vers des classes CSS ou du CSS-in-JS avec extraction statique — une
réécriture de plusieurs milliers de lignes, hors périmètre du pilote.
