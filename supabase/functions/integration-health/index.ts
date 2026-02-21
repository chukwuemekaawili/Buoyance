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
    // Uses the actual env var names set by the user in Supabase secrets
    const paymentConfigured = !!(
      Deno.env.get('PAYSTACK_SECRET_KEY') || Deno.env.get('FLUTTERWAVE_SECRET_KEY')
    );

    const emailConfigured = !!(
      Deno.env.get('RESEND_API_KEY') || Deno.env.get('SENDGRID_API_KEY')
    );

    const bankingConfigured = !!(
      Deno.env.get('MONO_SECRET_KEY') || Deno.env.get('OKRA_SECRET_KEY')
    );

    // Auto-file requires both payment and email to be configured
    const autofileConfigured = paymentConfigured && emailConfigured;

    console.log('integration-health: Results', { paymentConfigured, emailConfigured, bankingConfigured, autofileConfigured });

    return new Response(
      JSON.stringify({
        payment: { configured: paymentConfigured },
        email: { configured: emailConfigured },
        banking: { configured: bankingConfigured },
        autofile: { configured: autofileConfigured },
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
