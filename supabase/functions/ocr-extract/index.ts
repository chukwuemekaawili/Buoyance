import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// IMPORTANT: Always return HTTP 200. Supabase's client hides the actual error body
// with a generic "Edge Function returned a non-2xx status code" message otherwise.
// All errors are returned in the JSON body as { error: "..." }
const ok = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const systemPrompt = `You are a specialized OCR extraction engine for a Nigerian tax and accounting software called Buoyance.
Your ONLY job is to extract data from the provided receipt or invoice image and output it as strictly formatted JSON.
Do not include any markdown formatting, conversational text, or explanations. Only output the JSON object.

Extract the following fields:
1. "merchant": The name of the business or vendor. If not found, use null.
2. "date": The date of the transaction in YYYY-MM-DD format. If not found, use null.
3. "amount_ngn": The total amount of the transaction in Nigerian Naira (NGN) as a standard number (no commas or currency symbols). Ensure it is the final total. If not found, use null.
4. "description": A concise summary of what was purchased. Include key line items from the receipt (e.g. "Jollof Rice x2, Peppered Chicken, Zobo Drink x2"). Max 80 characters. If not determinable, use the merchant name.
5. "tax_category": Categorize the expense into one of these EXACT labels (use your best judgement based on the merchant/items): 
   ["Office Rent / Workspace", "Salaries / Wages", "Internet / Data", "Power / Diesel / Inverter", "Marketing / Ads", "Transport / Logistics", "Cost of Goods Sold (COGS)", "Professional Services (Legal/Audit)", "Office Supplies", "Equipment/Assets", "Insurance", "Maintenance/Repairs", "Software/Subscriptions", "Training/Education", "Personal / Groceries", "Entertainment", "Fines / Penalties", "Donations (Non-approved)", "Other"]
6. "confidence_score": A number between 0.0 and 1.0 indicating your confidence in the overall extraction.

Example output:
{
  "merchant": "MTN Nigeria",
  "date": "2026-02-14",
  "amount_ngn": 15500.00,
  "description": "Mobile data plan renewal 10GB",
  "tax_category": "Internet / Data",
  "confidence_score": 0.95
}
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { imageUrl } = await req.json();

    if (!imageUrl) {
      return ok({ error: 'imageUrl payload is required' });
    }

    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    if (!ANTHROPIC_API_KEY) {
      console.error('ANTHROPIC_API_KEY is not configured');
      return ok({ error: 'Configuration Error: ANTHROPIC_API_KEY is missing in Supabase Secrets.' });
    }

    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

    // 1. Download the image from the provided public URL securely on the backend
    console.log(`[OCR] Fetching image from: ${imageUrl}`);
    const imageResponse = await fetch(imageUrl, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });

    if (!imageResponse.ok) {
      return ok({ error: `Failed to download image from Storage: ${imageResponse.statusText}` });
    }

    // 2. Convert raw image buffer to base64
    const arrayBuffer = await imageResponse.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Efficient base64 conversion in Deno
    let binaryString = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binaryString += String.fromCharCode(uint8Array[i]);
    }
    const cleanBase64 = btoa(binaryString);

    console.log(`[OCR] Image downloaded and converted. Base64 length: ${cleanBase64.length}`);

    // 3. Determine the correct media type for Anthropic (Claude enforces strict type checking)
    // The bucket URL structure is .../receipts/workspace-id/uuid.extension
    const urlParts = imageUrl.split('.');
    let fileExtension = urlParts[urlParts.length - 1]?.toLowerCase();

    // Default to jpeg if parsing fails or extension is missing
    let mediaType = 'image/jpeg';
    if (fileExtension === 'png') mediaType = 'image/png';
    else if (fileExtension === 'webp') mediaType = 'image/webp';
    else if (fileExtension === 'gif') mediaType = 'image/gif';

    // Add a 25-second timeout to the Anthropic fetch (Supabase edge functions default to 150s max)
    const anthropicController = new AbortController();
    const anthropicTimeout = setTimeout(() => anthropicController.abort(), 25000);

    let anthropicResponse: Response;
    try {
      anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal: anthropicController.signal,
        headers: {
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1024,
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: mediaType,
                    data: cleanBase64,
                  }
                },
                {
                  type: 'text',
                  text: 'Extract the details from this receipt and output only JSON.'
                }
              ]
            }
          ],
        }),
      });
    } catch (fetchError: unknown) {
      const msg = fetchError instanceof Error ? fetchError.message : String(fetchError);
      return ok({ error: `Anthropic fetch failed: ${msg}` });
    } finally {
      clearTimeout(anthropicTimeout);
    }

    const anthropicData = await anthropicResponse.json();

    if (!anthropicResponse.ok) {
      console.error(`[OCR] Anthropic HTTP ${anthropicResponse.status}. Full body:`, JSON.stringify(anthropicData));
      const message = anthropicData?.error?.message || JSON.stringify(anthropicData);
      return ok({ error: `Anthropic API Error (HTTP ${anthropicResponse.status}): ${message}` });
    }

    const rawText = anthropicData?.content?.[0]?.text ?? '';

    let parsedContent;
    try {
      // Claude sometimes wraps JSON in markdown code fences even when told not to
      const cleaned = rawText.replace(/```json\n?|\n?```/g, '').trim();
      parsedContent = JSON.parse(cleaned);

      if (parsedContent.amount_ngn && parsedContent.amount_ngn !== null) {
        parsedContent.amount_kobo = Math.round(Number(parsedContent.amount_ngn) * 100).toString();
      } else {
        parsedContent.amount_kobo = null;
      }
    } catch (e) {
      console.error('Failed to parse Claude response as JSON. Raw:', rawText);
      return ok({ error: `Claude returned invalid JSON. Raw response: ${rawText.slice(0, 300)}` });
    }

    return ok(parsedContent);

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Unhandled error in ocr-extract:', message);
    return ok({ error: `Server Error: ${message}` });
  }
});
