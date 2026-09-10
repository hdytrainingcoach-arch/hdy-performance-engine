// Libellés et helpers du module médical (LOT 5).

export const AVAILABILITY_LABEL: Record<string, string> = {
  full: 'Disponible',
  modified: 'Travail adapté',
  unavailable: 'Indisponible',
  medical_care: 'En soins',
};
export const AVAILABILITY_COLOR: Record<string, { bg: string; fg: string }> = {
  full: { bg: '#13331f', fg: '#8ef0b0' },
  modified: { bg: '#3a2c12', fg: '#f5c96b' },
  unavailable: { bg: '#3a1416', fg: '#ff8a8f' },
  medical_care: { bg: '#241b3a', fg: '#c9b8ff' },
};

export const CONTEXT_LABEL: Record<string, string> = {
  training: 'Entraînement',
  match: 'Match',
  out_of_football: 'Hors football',
  other: 'Autre',
};
export const LATERALITY_LABEL: Record<string, string> = {
  left: 'Gauche',
  right: 'Droite',
  bilateral: 'Bilatéral',
  na: 'N/A',
};
export const MECHANISM_LABEL: Record<string, string> = {
  contact: 'Contact',
  non_contact: 'Sans contact',
  overload: 'Surcharge',
  other: 'Autre',
};
export const SEVERITY_LABEL: Record<string, string> = {
  minimal: 'Minime',
  mild: 'Légère',
  moderate: 'Modérée',
  severe: 'Sévère',
  unknown: 'Non précisée',
};
export const EVENT_STATUS_LABEL: Record<string, string> = {
  open: 'En cours',
  rehab: 'Réathlétisation',
  closed: 'Clôturé',
};

/** L'utilisateur a-t-il l'accès médical détaillé pour cette organisation ? */
export async function hasMedicalAccess(
  supabase: import('@supabase/supabase-js').SupabaseClient,
  organizationId: string,
): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return false;
  const [{ data: prof }, { data: mem }] = await Promise.all([
    supabase.from('profiles').select('is_super_admin').eq('user_id', session.user.id).maybeSingle(),
    supabase
      .from('memberships')
      .select('role,medical_clearance')
      .eq('user_id', session.user.id)
      .eq('organization_id', organizationId)
      .eq('active', true)
      .maybeSingle(),
  ]);
  return !!prof?.is_super_admin || mem?.role === 'staff_medical' || !!mem?.medical_clearance;
}
