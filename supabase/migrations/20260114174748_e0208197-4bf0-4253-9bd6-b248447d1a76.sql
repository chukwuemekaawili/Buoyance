-- ================================================================
-- PHASE 2: Versioned Tax Rules + Tax Calculations Updates
-- ================================================================

-- 1. Create tax_rules table
CREATE TABLE public.tax_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tax_type text NOT NULL,
  version text NOT NULL UNIQUE,
  effective_date date NOT NULL,
  law_reference_json jsonb,
  rules_json jsonb NOT NULL,
  published boolean NOT NULL DEFAULT false,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for common queries
CREATE INDEX idx_tax_rules_type_published ON public.tax_rules(tax_type, published) WHERE archived = false;
CREATE INDEX idx_tax_rules_version ON public.tax_rules(version);

-- Enable RLS
ALTER TABLE public.tax_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tax_rules
-- Authenticated users can read published, non-archived rules
CREATE POLICY "tax_rules_select_published"
ON public.tax_rules
FOR SELECT
TO authenticated
USING (published = true AND archived = false);

-- Admins can read all rules (including unpublished/archived)
CREATE POLICY "tax_rules_select_admin"
ON public.tax_rules
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can insert rules
CREATE POLICY "tax_rules_insert_admin"
ON public.tax_rules
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can update rules
CREATE POLICY "tax_rules_update_admin"
ON public.tax_rules
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 2. Seed the PIT_2025_v1 rule with KOBO thresholds
-- Thresholds in KOBO (1 NGN = 100 Kobo)
INSERT INTO public.tax_rules (tax_type, version, effective_date, law_reference_json, rules_json, published)
VALUES (
  'PIT',
  'PIT_2025_v1',
  '2026-01-01',
  '{"act": "Nigeria Tax Act 2025", "section": "Personal Income Tax", "effective": "1 January 2026"}',
  '{
    "bands": [
      {"threshold_kobo": 80000000, "rate": 0, "label": "First ₦800,000"},
      {"threshold_kobo": 220000000, "rate": 0.15, "label": "Next ₦2,200,000"},
      {"threshold_kobo": 900000000, "rate": 0.18, "label": "Next ₦9,000,000"},
      {"threshold_kobo": 1300000000, "rate": 0.21, "label": "Next ₦13,000,000"},
      {"threshold_kobo": 2500000000, "rate": 0.23, "label": "Next ₦25,000,000"},
      {"threshold_kobo": null, "rate": 0.25, "label": "Above ₦50,000,000"}
    ],
    "currency": "NGN",
    "kobo_factor": 100
  }',
  true
);

-- 3. Update tax_calculations table with new columns
ALTER TABLE public.tax_calculations
ADD COLUMN IF NOT EXISTS tax_type text DEFAULT 'PIT',
ADD COLUMN IF NOT EXISTS finalized boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS archived boolean DEFAULT false;

-- 4. Backfill existing rows safely
UPDATE public.tax_calculations
SET 
  tax_type = 'PIT',
  finalized = true,
  archived = false
WHERE tax_type IS NULL OR finalized IS NULL OR archived IS NULL;

-- 5. Create index for archived filter
CREATE INDEX IF NOT EXISTS idx_tax_calculations_archived ON public.tax_calculations(user_id, archived) WHERE archived = false;