import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Cache-Control': 'no-store',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log('integration-health: No authorization header');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify user is authenticated
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.log('integration-health: Invalid user', userError?.message);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('integration-health: Checking configuration for user', user.id);

    // Check configuration (server-side secrets only)
    const paymentConfigured = !!(
      Deno.env.get('PAYMENT_SECRET_KEY') && 
      Deno.env.get('PAYMENT_PROVIDER')
    );
    
    const emailConfigured = !!(
      Deno.env.get('EMAIL_API_KEY') && 
      Deno.env.get('EMAIL_PROVIDER') && 
      Deno.env.get('EMAIL_FROM')
    );
    
    const bankingConfigured = !!(
      Deno.env.get('BANKING_SECRET_KEY') && 
      Deno.env.get('BANKING_PROVIDER')
    );

    console.log('integration-health: Results', { paymentConfigured, emailConfigured, bankingConfigured });

    return new Response(
      JSON.stringify({
        payment: { configured: paymentConfigured },
        email: { configured: emailConfigured },
        banking: { configured: bankingConfigured },
      }),
      {
        status: 200,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json'
        },
      }
    );
  } catch (error) {
    console.error('integration-health: Error', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
