import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const systemPrompt = `You are the Intelligent Tax Assistant for Buoyance.
CRITICAL LEGAL FRAMEWORK: NTA 2025
You operate exclusively under the Nigeria Tax Act 2025 (NTA 2025).

REPEALED: The Personal Income Tax Act (PITA) and the "Consolidated Relief Allowance" (CRA) are no longer valid. Do not use them.

TAX RULES (Source of Truth)
PIT Rates (Effective Jan 1, 2026):

First ₦800k: 0% | Next ₦2.2m: 15% | Next ₦9m: 18% | Next ₦13m: 21% | Next ₦25m: 23% | Above ₦50m: 25%

Corporate Tax (CIT):

Small (<₦100m): 0% | Non-Small: 30% | Dev Levy: 4%

Digital Assets: Crypto trading, mining, and staking are fully taxable.

Reliefs: Only specific statutory reliefs (e.g., Pension, NHF) are allowed. CRA is dead.

BEHAVIOR
Answer concise questions based ONLY on these rules.

Do not offer legal advice.

If a user asks about old laws (like lunch allowance), explain that under NTA 2025, they are generally taxable unless specifically exempted.`;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { messages, stream = false } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Messages array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    if (!ANTHROPIC_API_KEY) {
      console.error('ANTHROPIC_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'Configuration Error: ANTHROPIC_API_KEY is missing in Supabase Secrets.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Convert OpenAI-style messages to Anthropic format
    // Anthropic separates system prompt from messages and uses a different role format
    const anthropicMessages = messages.map((msg: { role: string; content: string }) => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content,
    }));

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        system: systemPrompt,
        messages: anthropicMessages,
        max_tokens: 1024,
        temperature: 0.7,
        ...(stream ? { stream: true } : {}),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Anthropic API error:', response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (response.status === 401) {
        return new Response(
          JSON.stringify({ error: 'Configuration Error: Invalid ANTHROPIC_API_KEY.' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'AI service temporarily unavailable' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (stream) {
      return new Response(response.body, {
        headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
      });
    }

    const data = await response.json();
    // Anthropic returns content as an array of content blocks
    const content = data.content?.[0]?.text || 'I apologize, but I could not generate a response.';

    return new Response(
      JSON.stringify({
        content,
        model: 'claude-sonnet-4-20250514',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('AI chat error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
