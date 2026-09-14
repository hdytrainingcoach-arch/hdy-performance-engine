import { createClient } from '@supabase/supabase-js';
import { computeFvTest, type FvTestInput, type MeasurementMethod } from '@/lib/performance/fv';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type TrialBody = { additional_load_kg: number; jump_height_m: number; measurement_method?: string; valid?: boolean };
type Body = {
  athlete_id: string;
  test_date?: string;
  test_type?: string;
  protocol?: string;
  body_mass_kg: number;
  push_off_distance_m: number;
  gravity?: number;
  trials: TrialBody[];
};

const MEASUREMENT_METHODS: MeasurementMethod[] = ['flight_time', 'direct_measurement', 'other'];
function sanitizeMethod(m?: string): MeasurementMethod {
  return (MEASUREMENT_METHODS as string[]).includes(m || '') ? (m as MeasurementMethod) : 'other';
}

function scopedClient(jwt: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  // Client borné au JWT de l'appelant : les écritures passent par les RLS
  // existantes (private.is_org_editor / can_access_player), pas par une
  // réimplémentation de l'autorisation dans cette route.
  return createClient(url, key, { global: { headers: { Authorization: `Bearer ${jwt}` } }, auth: { persistSession: false } });
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ error: 'Corps de requête invalide.' }, { status: 400 });
  }

  const jwt = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!jwt) return Response.json({ error: 'Authentification requise.' }, { status: 401 });

  if (!body.athlete_id || !Number.isFinite(body.body_mass_kg) || !Number.isFinite(body.push_off_distance_m) || !Array.isArray(body.trials)) {
    return Response.json({ error: 'Paramètres manquants (athlete_id, body_mass_kg, push_off_distance_m, trials).' }, { status: 400 });
  }

  const input: FvTestInput = {
    athleteId: body.athlete_id,
    testDate: body.test_date || new Date().toISOString().slice(0, 10),
    bodyMassKg: body.body_mass_kg,
    pushOffDistanceM: body.push_off_distance_m,
    gravity: body.gravity,
    protocol: body.protocol,
    trials: body.trials.map(t => ({
      additionalLoadKg: t.additional_load_kg,
      jumpHeightM: t.jump_height_m,
      measurementMethod: sanitizeMethod(t.measurement_method),
      valid: t.valid,
    })),
  };

  const result = computeFvTest(input);

  const client = scopedClient(jwt);
  const { data: player, error: playerErr } = await client.from('players').select('organization_id').eq('id', input.athleteId).maybeSingle();
  if (playerErr || !player) return Response.json({ error: 'Joueur introuvable ou accès refusé.' }, { status: 404 });

  let testId: string | null = null;

  // On ne persiste que les tests valides : la base impose body_mass_kg > 0
  // et push_off_distance_m > 0 (cf. migration), donc un test invalide sur
  // ces critères ne peut pas être enregistré tel quel — cohérent avec
  // « le système doit refuser le calcul » (§20).
  if (result.status === 'valid') {
    const { data: inserted, error: insertErr } = await client
      .from('fv_tests')
      .insert({
        organization_id: player.organization_id,
        player_id: input.athleteId,
        test_date: input.testDate,
        test_type: body.test_type || 'vertical',
        protocol: input.protocol || null,
        body_mass_kg: input.bodyMassKg,
        push_off_distance_m: input.pushOffDistanceM,
        gravity: result.gravity,
        model_version: result.modelVersion,
        measurement_method: input.trials[0]?.measurementMethod || null,
        status: result.status,
        f0: result.regression?.f0 ?? null,
        v0: result.regression?.v0 ?? null,
        sfv: result.regression?.sfv ?? null,
        pmax: result.pmax,
        pmax_relative: result.pmaxRelative,
        sfv_optimal: result.optimalProfile?.status === 'computed' ? result.optimalProfile.sfvOpt : null,
        profile_optimal_percent: result.imbalance?.status === 'computed' ? result.imbalance.profileOptimalPercent : null,
        fv_imbalance_percent: result.imbalance?.status === 'computed' ? result.imbalance.fvImbalancePercent : null,
        deficit_type: result.imbalance?.status === 'computed' ? result.imbalance.deficitType : 'unavailable',
        r_squared: result.regression?.rSquared ?? null,
        standard_error: result.regression?.standardError ?? null,
        quality: result.quality,
        issues: result.issues,
      })
      .select('id')
      .single();
    if (insertErr) return Response.json({ error: insertErr.message }, { status: 403 });
    testId = inserted.id;

    if (result.trials.length) {
      const rows = result.trials.map(t => ({
        test_id: testId,
        trial_number: t.trialNumber,
        additional_load_kg: t.additionalLoadKg,
        total_mass_kg: t.totalMassKg,
        jump_height_m: t.jumpHeightM,
        measurement_method: t.measurementMethod,
        velocity_ms: t.velocityMs,
        force_n: t.forceN,
        force_relative_nkg: t.forceRelativeNkg,
        power_w: t.powerW,
        valid: t.valid,
      }));
      const { error: trialsErr } = await client.from('fv_trials').insert(rows);
      if (trialsErr) return Response.json({ error: trialsErr.message }, { status: 403 });
    }
  }

  return Response.json({
    test_id: testId,
    status: result.status,
    issues: result.issues,
    f0: result.regression?.f0 ?? null,
    v0: result.regression?.v0 ?? null,
    sfv: result.regression?.sfv ?? null,
    pmax: result.pmax,
    pmax_relative: result.pmaxRelative,
    sfv_optimal: result.optimalProfile?.status === 'computed' ? result.optimalProfile.sfvOpt : null,
    profile_optimal_percent: result.imbalance?.status === 'computed' ? result.imbalance.profileOptimalPercent : null,
    fv_imbalance_percent: result.imbalance?.status === 'computed' ? result.imbalance.fvImbalancePercent : null,
    deficit_type: result.imbalance?.status === 'computed' ? result.imbalance.deficitType : 'unavailable',
    r_squared: result.regression?.rSquared ?? null,
    quality: result.quality,
    model_version: result.modelVersion,
  });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const athleteId = searchParams.get('athlete_id');
  if (!athleteId) return Response.json({ error: 'athlete_id requis.' }, { status: 400 });

  const jwt = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!jwt) return Response.json({ error: 'Authentification requise.' }, { status: 401 });

  const client = scopedClient(jwt);
  const { data, error } = await client
    .from('fv_tests')
    .select('*')
    .eq('player_id', athleteId)
    .order('test_date', { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 403 });
  return Response.json({ tests: data ?? [] });
}
