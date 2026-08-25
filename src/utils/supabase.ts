import { createClient } from '@supabase/supabase-js'

const env = (import.meta as any).env || {}
const supabaseUrl = env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || ''

// Export the supabase client only if credentials are provided
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

if (!supabase) {
  console.warn(
    'Supabase credentials are not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file to enable cloud sync.'
  )
}
