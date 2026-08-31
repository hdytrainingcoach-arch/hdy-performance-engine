import { createClient } from '@supabase/supabase-js';

const url = 'https://kibyxovxqrscpfttjgsy.supabase.co';
const key = 'sb_publishable_ooirgoJTS8YgV2iQdO_wAg_tvtnLxy4';

export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
