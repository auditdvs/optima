import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseServiceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  throw new Error('Missing VITE_SUPABASE_URL environment variable')
}

if (!supabaseServiceRoleKey) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
}

export const supabaseService = createClient(
  supabaseUrl,
  supabaseServiceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Utility function untuk mengecek apakah service client sudah terkonfigurasi dengan benar
export const checkServiceClientConfig = () => {
  const hasAdminAccess = Boolean(supabaseService.auth.admin)
  const projectUrl = supabaseService.supabaseUrl
  
  console.log('Service Client Check:', {
    hasAdminAccess,
    projectUrl,
    isServiceRole: supabaseServiceRoleKey.includes('service_role')
  })
  
  return hasAdminAccess
}
