
import { createClient } from '@supabase/supabase-js';

// Project credentials as requested
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

// Diagnostic check: The provided key 'sb_publishable_...' is typically a Stripe key.
// Supabase keys usually start with 'eyJ...'. We include this logic to help debug 401 errors.
if (supabaseKey && supabaseKey.startsWith('sb_')) {
  console.warn('⚠️ Supabase Configuration Warning: The provided API key follows a Stripe format. This may cause 401 Unauthorized errors in Supabase.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
