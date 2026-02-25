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
      console.log('integration-health-admin: No authorization header');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // User client - verify identity
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      console.log('integration-health-admin: Invalid user', userError?.message);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('integration-health-admin: Checking admin status for user', user.id);

    // Admin client - check roles safely using service role key
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if user is admin - support both schema patterns
    let isAdmin = false;

    // Pattern 1: user_roles has 'role' column (text/enum)
    const { data: userRolesText, error: rolesError } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (rolesError) {
      console.error('integration-health-admin: Error fetching roles', rolesError.message);
    }

    if (userRolesText?.some((ur: any) => ur.role === 'admin' || ur.role === 'super_admin')) {
      isAdmin = true;
      console.log('integration-health-admin: User is admin (pattern 1)');
    } else {
      // Pattern 2: user_roles.role_id joins roles table
      const { data: userRolesFK } = await adminClient
        .from('user_roles')
        .select('role_id, roles(name)')
        .eq('user_id', user.id);

      isAdmin = userRolesFK?.some(
        (ur: any) => ur.roles?.name === 'admin' || ur.roles?.name === 'super_admin'
      ) || false;
      
      if (isAdmin) {
        console.log('integration-health-admin: User is admin (pattern 2)');
      }
    }

    if (!isAdmin) {
      console.log('integration-health-admin: User is not admin');
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check configuration and return provider names.
    // Supports both "generic" naming (PAYMENT_PROVIDER/PAYMENT_SECRET_KEY, etc.)
    // and provider-specific keys used by some edge functions (PAYSTACK_SECRET_KEY, RESEND_API_KEY, MONO_SECRET_KEY, ...).
    const paymentProviderEnv = Deno.env.get('PAYMENT_PROVIDER') || null;
    const paymentSecretKey = Deno.env.get('PAYMENT_SECRET_KEY');
    const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
    const flutterwaveSecretKey = Deno.env.get('FLUTTERWAVE_SECRET_KEY');
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');

    const inferredPaymentProvider =
      paymentProviderEnv ||
      (paystackSecretKey ? 'paystack' : null) ||
      (flutterwaveSecretKey ? 'flutterwave' : null) ||
      (stripeSecretKey ? 'stripe' : null);

    const paymentConfigured = !!(
      (paymentProviderEnv && paymentSecretKey) ||
      paystackSecretKey ||
      flutterwaveSecretKey ||
      stripeSecretKey
    );

    const emailProviderEnv = Deno.env.get('EMAIL_PROVIDER') || null;
    const emailApiKey = Deno.env.get('EMAIL_API_KEY');
    const emailFrom = Deno.env.get('EMAIL_FROM');
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const sendgridApiKey = Deno.env.get('SENDGRID_API_KEY');
    const mailgunApiKey = Deno.env.get('MAILGUN_API_KEY');

    const inferredEmailProvider =
      emailProviderEnv ||
      (resendApiKey ? 'resend' : null) ||
      (sendgridApiKey ? 'sendgrid' : null) ||
      (mailgunApiKey ? 'mailgun' : null);

    const emailConfigured = !!(
      (emailProviderEnv && emailApiKey && emailFrom) ||
      resendApiKey ||
      sendgridApiKey ||
      mailgunApiKey
    );

    const bankingProviderEnv = Deno.env.get('BANKING_PROVIDER') || null;
    const bankingSecretKey = Deno.env.get('BANKING_SECRET_KEY');
    const monoSecretKey = Deno.env.get('MONO_SECRET_KEY');
    const okraSecretKey = Deno.env.get('OKRA_SECRET_KEY');
    const plaidSecretKey = Deno.env.get('PLAID_SECRET_KEY');

    const inferredBankingProvider =
      bankingProviderEnv ||
      (monoSecretKey ? 'mono' : null) ||
      (okraSecretKey ? 'okra' : null) ||
      (plaidSecretKey ? 'plaid' : null);

    const bankingConfigured = !!(
      (bankingProviderEnv && bankingSecretKey) ||
      monoSecretKey ||
      okraSecretKey ||
      plaidSecretKey
    );

    const result = {
      payment: {
        configured: paymentConfigured,
        provider: inferredPaymentProvider,
      },
      email: {
        configured: emailConfigured,
        provider: inferredEmailProvider,
      },
      banking: {
        configured: bankingConfigured,
        provider: inferredBankingProvider,
      },
    };

    console.log('integration-health-admin: Results', result);

    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json'
        },
      }
    );
  } catch (error) {
    console.error('integration-health-admin: Error', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
