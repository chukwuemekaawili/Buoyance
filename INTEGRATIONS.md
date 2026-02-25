# Buoyance Integration Configuration

This document describes how to configure external service integrations for the Buoyance platform.

## Overview

Buoyance supports four types of external integrations:

1. **AI Tax Assistant** - AI-powered chat for tax explanations (✅ Active via Anthropic)
2. **Payment Gateway** - Process online payments for tax filings
3. **Email Service** - Send notification emails and alerts
4. **Banking Integration** - Connect bank accounts and sync transactions

## AI Tax Assistant

The AI Tax Assistant is powered by Anthropic and is **automatically configured**.

- **Endpoint**: `/functions/v1/ai-chat`
- **Model**: Claude Sonnet 4 (`claude-sonnet-4-20250514`)
- **Secret**: `ANTHROPIC_API_KEY` (configured in Supabase Edge Function secrets)

No frontend configuration required (Edge Function secret is required).

## Security Model

- **Secret keys are NEVER stored in the frontend code or database**
- All secrets are stored in Supabase Edge Function secrets
- Frontend only receives configuration status (true/false) and provider names (admin only)
- Health check endpoints verify authentication before returning status

## Required Secrets (Supabase Edge Functions)

Add these secrets in your Supabase dashboard:
**Settings → Edge Functions → Secrets**

### Notes on Secret Names

Some edge functions support both:
- **Generic secrets** (recommended for the Admin “API Settings” page), and
- **Provider-specific secrets** used by individual functions (e.g., Paystack, Resend, Mono).

### Payment Gateway

| Secret Name | Description | Example Values |
|-------------|-------------|----------------|
| `PAYMENT_PROVIDER` | Payment provider name | `paystack`, `flutterwave`, `stripe` |
| `PAYMENT_SECRET_KEY` | Provider's secret/API key | `sk_live_xxxxx` |
| `PAYSTACK_SECRET_KEY` | Paystack secret key (alternative) | `sk_live_xxxxx` |
| `FLUTTERWAVE_SECRET_KEY` | Flutterwave secret key (alternative) | `FLWSECK_TEST-xxxxx` |
| `STRIPE_SECRET_KEY` | Stripe secret key (alternative) | `sk_live_xxxxx` |

### Email Service

| Secret Name | Description | Example Values |
|-------------|-------------|----------------|
| `EMAIL_PROVIDER` | Email provider name | `resend`, `sendgrid`, `mailgun` |
| `EMAIL_API_KEY` | Provider's API key | `re_xxxxx` |
| `EMAIL_FROM` | Sender email address | `noreply@buoyance.ng` |
| `RESEND_API_KEY` | Resend API key (alternative) | `re_xxxxx` |
| `SENDGRID_API_KEY` | SendGrid API key (alternative) | `SG.xxxxx` |
| `MAILGUN_API_KEY` | Mailgun API key (alternative) | `key-xxxxx` |

### Banking Integration

| Secret Name | Description | Example Values |
|-------------|-------------|----------------|
| `BANKING_PROVIDER` | Banking provider name | `mono`, `okra`, `plaid` |
| `BANKING_SECRET_KEY` | Provider's secret key | `sk_xxxxx` |
| `MONO_SECRET_KEY` | Mono secret key (alternative) | `sk_live_xxxxx` |
| `OKRA_SECRET_KEY` | Okra secret key (alternative) | `sk_live_xxxxx` |
| `PLAID_SECRET_KEY` | Plaid secret key (alternative) | `access-sandbox-xxxxx` |

## Frontend Environment Variables (Vite)

These are PUBLIC keys only (safe to expose):

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | Supabase project URL | Yes |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon key | Yes |
| `VITE_PAYMENT_PUBLIC_KEY` | Payment provider's public key | Only if using client-side payment UI |
| `VITE_BANKING_PUBLIC_KEY` | Banking provider's public key | Only if using client-side bank UI |

## Health Check Endpoints

### For Authenticated Users

```
GET /functions/v1/integration-health
Authorization: Bearer <user_access_token>
```

Response:
```json
{
  "payment": { "configured": true },
  "email": { "configured": false },
  "banking": { "configured": false }
}
```

### For Admin Users

```
GET /functions/v1/integration-health-admin
Authorization: Bearer <admin_access_token>
```

Response:
```json
{
  "payment": { "configured": true, "provider": "paystack" },
  "email": { "configured": false, "provider": null },
  "banking": { "configured": false, "provider": null }
}
```

## Frontend Hooks

### useIntegrationStatus()

For normal authenticated users. Returns configured status without provider names.

```typescript
import { useIntegrationStatus } from '@/hooks/useIntegrationStatus';

function MyComponent() {
  const { payment, email, banking, loading, error } = useIntegrationStatus();
  
  if (loading) return <Spinner />;
  
  if (!payment.configured) {
    return <Badge>Coming Soon</Badge>;
  }
  
  return <PaymentButton />;
}
```

### useAdminIntegrationStatus()

For admin users. Returns configured status WITH provider names.

```typescript
import { useAdminIntegrationStatus } from '@/hooks/useIntegrationStatus';

function AdminSettings() {
  const { payment, email, banking, loading, error } = useAdminIntegrationStatus();
  
  if (payment.configured) {
    console.log('Active provider:', payment.provider); // e.g., "paystack"
  }
}
```

### invalidateIntegrationCache()

Call this after updating secrets to force a refresh.

```typescript
import { invalidateIntegrationCache } from '@/hooks/useIntegrationStatus';

function handleSecretsUpdated() {
  invalidateIntegrationCache();
  // Then refetch status
}
```

## Supported Providers

### Payment

| Provider | Documentation |
|----------|---------------|
| Paystack | https://paystack.com/docs |
| Flutterwave | https://developer.flutterwave.com |
| Stripe | https://stripe.com/docs |

### Email

| Provider | Documentation |
|----------|---------------|
| Resend | https://resend.com/docs |
| SendGrid | https://docs.sendgrid.com |
| Mailgun | https://documentation.mailgun.com |

### Banking

| Provider | Documentation |
|----------|---------------|
| Mono | https://docs.mono.co |
| Okra | https://docs.okra.ng |
| Plaid | https://plaid.com/docs |

## Troubleshooting

### Integration shows "Not Configured" after adding secrets

1. Ensure secret names are exactly as specified (case-sensitive)
2. Wait 30 seconds for edge function to pick up new secrets
3. Click "Refresh" in the API Settings page
4. Check edge function logs for errors

### "Admin access required" error

The integration-health-admin endpoint requires the user to have the `admin` role in the `user_roles` table.

### Network errors when fetching status

1. Check that `VITE_SUPABASE_URL` is correctly set
2. Verify the user is authenticated
3. Check browser console for CORS errors

## Security Checklist

- [ ] Never store secret keys in frontend code
- [ ] Never store secret keys in the database
- [ ] Only use `VITE_*` prefix for public/publishable keys
- [ ] Admin endpoints verify role server-side using service role key
- [ ] All health check responses include `Cache-Control: no-store`
- [ ] CORS headers are present on all response paths (including errors)
