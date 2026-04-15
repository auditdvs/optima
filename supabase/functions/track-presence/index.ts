import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the JWT from the Authorization header to know which user this is
    const authHeader = req.headers.get('Authorization')!
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { fetch_geo } = await req.json().catch(() => ({ fetch_geo: false }));

    // Capture Real IP (Supabase provides x-forwarded-for or x-real-ip)
    const requestIp = req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for') || '';
    let actualIp = requestIp.split(',')[0].trim();
    
    // Server-side GeoIP fetch
    let geoUpdate = {};
    
    // Make sure IP is a valid alphanumeric/dots pattern and not 'null', 'undefined'
    const isSafeIp = actualIp && actualIp !== 'null' && actualIp !== 'undefined' && actualIp !== 'Unknown';

    if (fetch_geo && isSafeIp) {
      try {
        const geoRes = await fetch(`https://ipinfo.io/${actualIp}/json?token=ac28a2bc61c49b`);
        
        if (geoRes.ok) {
           const geoData = await geoRes.json();
           if (geoData.city) {
             geoUpdate = {
               ip_location: `${geoData.city}, ${geoData.region} (${geoData.org || 'ISP'}) [Fallback GeoIP]`,
               ip_coords: geoData.loc // lat,lon
             };
           }
        } else {
           console.warn(`GeoIP rejected IP ${actualIp} - Status: ${geoRes.status}`);
        }
      } catch (e) {
        console.error('GeoIP fetch failed:', e.message);
      }
    }

    // Update profiles
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({
        last_seen_at: new Date().toISOString(),
        ...(isSafeIp ? { last_ip: actualIp } : {}),
        ...geoUpdate
      })
      .eq('id', user.id);

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ success: true, ip: actualIp }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
