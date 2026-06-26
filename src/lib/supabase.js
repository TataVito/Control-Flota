import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    `Variables de entorno faltantes:\n` +
    `VITE_SUPABASE_URL: ${supabaseUrl ? '✓' : '✗ no definida'}\n` +
    `VITE_SUPABASE_ANON_KEY: ${supabaseAnonKey ? '✓' : '✗ no definida'}\n\n` +
    `Configúralas en Vercel → Settings → Environment Variables.`
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
