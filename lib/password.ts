// Contrôle de robustesse côté client. Complète (sans remplacer) la règle serveur
// Supabase (longueur min + classes de caractères configurées dans le dashboard).
// La vérification HaveIBeenPwned n'est disponible qu'en plan Supabase Pro ;
// en attendant, on bloque au moins les mots de passe manifestement faibles.

const COMMON = new Set(
  [
    'password', 'password1', 'password123', 'passw0rd', 'motdepasse', 'azerty',
    'azerty123', 'qwerty', 'qwerty123', 'qwertyuiop', 'azertyuiop', '1q2w3e4r',
    '123456', '1234567', '12345678', '123456789', '1234567890', '12345678910',
    'azerty1234', '00000000', '11111111', 'aaaaaaaa', 'abcdefgh', 'abcd1234',
    'iloveyou', 'welcome', 'welcome1', 'letmein', 'admin', 'administrator',
    'football', 'football1', 'baseball', 'basketball', 'superman', 'batman',
    'starwars', 'pokemon', 'princess', 'sunshine', 'soleil', 'chocolat',
    'marseille', 'paris', 'psgpsgpsg', 'liverpool', 'chelsea', 'arsenal',
    'barcelona', 'realmadrid', 'juventus', 'football2026', 'diambars',
    'hdyperformance', 'hdytraining', 'monkey123', 'dragon123', 'loulou123',
    'doudou123', 'nomdefamille', 'prenom123', 'test1234', 'changeme',
    'motdepasse1', 'motdepasse123', 'jetaime', 'jetaime1', 'coucou123',
  ].map((s) => s.toLowerCase()),
);

export type PasswordCheck = { ok: boolean; message: string };

export function checkPassword(pw: string): PasswordCheck {
  const p = pw ?? '';
  if (p.length < 10) return { ok: false, message: 'Au moins 10 caractères.' };
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter((r) => r.test(p)).length;
  if (classes < 3) {
    return { ok: false, message: 'Mélange au moins 3 types : minuscules, majuscules, chiffres, symboles.' };
  }
  if (/^(.)\1+$/.test(p)) return { ok: false, message: 'Mot de passe trop répétitif.' };
  if (COMMON.has(p.toLowerCase())) return { ok: false, message: 'Ce mot de passe est trop courant — choisis-en un autre.' };
  return { ok: true, message: 'Mot de passe correct.' };
}
