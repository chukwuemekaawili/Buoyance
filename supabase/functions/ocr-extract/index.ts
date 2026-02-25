import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const systemPrompt = `You are a specialized OCR extraction engine for a Nigerian tax and accounting software called Buoyance.
Your ONLY job is to extract data from the provided receipt or invoice image and output it as strictly formatted JSON.
Do not include any markdown formatting, conversational text, or explanations. Only output the JSON object.

Extract the following fields:
1. "merchant": The name of the business or vendor. If not found, use "null".
2. "date": The date of the transaction in YYYY-MM-DD format. If not found, use "null".
3. "amount_ngn": The total amount of the transaction in Nigerian Naira (NGN) as a standard number (no commas or currency symbols). Ensure it is the final total. If not found, use "null".
4. "tax_category": Categorize the expense into one of the following exactly (use your best judgement based on the merchant/items): 
   ["Office Supplies", "Travel & Transport", "Meals & Entertainment", "Rent & Lease", "Utilities", "Software & Subscriptions", "Legal & Professional", "Advertising & Marketing", "Repairs & Maintenance", "Cost of Goods Sold", "Other"]
5. "confidence_score": A number between 0.0 and 1.0 indicating your confidence in the overall extraction.

Example output:
{
  "merchant": "MTN Nigeria",
  "date": "2026-02-14",
  "amount_ngn": 15500.00,
  "tax_category": "Utilities",
  "confidence_score": 0.95
}
`;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: 'imageBase64 payload is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'Configuration Error: OPENAI_API_KEY is missing in Supabase Secrets.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Extract the details from this receipt.' },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 500,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('OpenAI API Error:', data);
      throw new Error(data.error?.message || 'Failed to communicate with OpenAI');
    }

    const content = data.choices[0].message.content;

    // Attempt to parse the JSON locally to ensure it's valid before sending it back
    let parsedContent;
    try {
      parsedContent = JSON.parse(content);

      // Convert amount to kobo for the frontend
      if (parsedContent.amount_ngn && parsedContent.amount_ngn !== "null") {
        parsedContent.amount_kobo = Math.round(Number(parsedContent.amount_ngn) * 100).toString();
      } else {
        parsedContent.amount_kobo = "null";
      }

    } catch (e) {
      console.error('Failed to parse OpenAI response as JSON:', content);
      return new Response(
        JSON.stringify({ error: 'OpenAI returned invalid JSON format.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify(parsedContent),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ocr-extract function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
