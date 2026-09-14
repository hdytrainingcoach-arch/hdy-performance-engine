'use client';

import { useEffect } from 'react';

// Écran remplacé par /admin/roster (effectif + équipes, à jour, RGPD, exports).
// Redirection conservée pour tout lien ou favori existant vers cette ancienne page.
export default function OrganizationsRedirect() {
  useEffect(() => {
    window.location.replace('/admin/roster');
  }, []);
  return null;
}
