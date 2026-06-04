import Constants from 'expo-constants';
import { createClient } from '@supabase/supabase-js';

const appConfig = Constants.expoConfig || Constants.manifest || {};
const expoExtra = appConfig.extra || {};
const SUPABASE_URL = process.env.SUPABASE_URL || expoExtra.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || expoExtra.SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    'Missing Supabase environment variables. Add SUPABASE_URL and SUPABASE_ANON_KEY to .env or your environment, or configure them in expo config extra.'
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
