// lib/supabaseService.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY // Perhatikan prefix VITE_

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Environment variables not found:', {
    hasUrl: !!supabaseUrl,
    hasServiceKey: !!supabaseServiceRoleKey
  });
  throw new Error('Required environment variables are missing')
}

// Singleton pattern untuk mencegah multiple instances
let serviceClient: any = null

export const getSupabaseService = () => {
  if (!serviceClient) {
    serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      }
    })
  }
  return serviceClient
}

export const supabaseService = getSupabaseService()
