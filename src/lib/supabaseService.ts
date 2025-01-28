// lib/supabaseService.ts
import { createClient } from '@supabase/supabase-js'

// Debug logging
console.log('Environment Variables Check:', {
  availableEnvs: import.meta.env,
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  hasServiceKey: !!import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
  // Jangan log full service key untuk keamanan
});

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing environment variables:', {
    url: !!supabaseUrl,
    serviceKey: !!supabaseServiceRoleKey
  });
  throw new Error('Required environment variables are missing. Check .env.local file')
}

let serviceClient: any = null

export const getSupabaseService = () => {
  if (!serviceClient) {
    try {
      serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false
        }
      })
      console.log('Supabase service client created successfully')
    } catch (error) {
      console.error('Error creating Supabase service client:', error)
      throw error
    }
  }
  return serviceClient
}

export const supabaseService = getSupabaseService()
