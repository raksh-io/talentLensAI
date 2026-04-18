import { createClient } from '@supabase/supabase-js'

// Using Vite's import.meta.env to access .env variables.
// Hardcoded fallbacks removed for safety to ensure the app fails fast if keys are missing.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Supabase credentials are missing. Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY ' +
    'are set in your .env file.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
