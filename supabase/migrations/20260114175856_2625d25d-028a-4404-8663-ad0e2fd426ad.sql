-- Seed CIT published rule
INSERT INTO public.tax_rules (
  tax_type,
  version,
  effective_date,
  law_reference_json,
  rules_json,
  published,
  archived
) VALUES (
  'CIT',
  'CIT_2025_v1',
  '2025-01-01',
  '{"act": "Companies Income Tax Act (CITA)", "section": "Section 40", "effective": "2025-01-01"}'::jsonb,
  '{
    "currency": "NGN",
    "kobo_factor": 100,
    "rates": {
      "standard_rate": 0.30,
      "small_company_rate": 0.20,
      "small_company_threshold_kobo": 2500000000
    },
    "description": "Standard rate 30%, Small companies (turnover ≤ ₦25M) 20%"
  }'::jsonb,
  true,
  false
);

-- Seed VAT published rule
INSERT INTO public.tax_rules (
  tax_type,
  version,
  effective_date,
  law_reference_json,
  rules_json,
  published,
  archived
) VALUES (
  'VAT',
  'VAT_2025_v1',
  '2025-01-01',
  '{"act": "Value Added Tax Act (VATA)", "section": "Section 2", "effective": "2025-01-01"}'::jsonb,
  '{
    "currency": "NGN",
    "kobo_factor": 100,
    "vat_rate": 0.075,
    "exempt_categories": ["basic food items", "medical services", "educational services", "exported goods"],
    "description": "Standard VAT rate 7.5%"
  }'::jsonb,
  true,
  false
);

-- Seed WHT published rule
INSERT INTO public.tax_rules (
  tax_type,
  version,
  effective_date,
  law_reference_json,
  rules_json,
  published,
  archived
) VALUES (
  'WHT',
  'WHT_2025_v1',
  '2025-01-01',
  '{"act": "Companies Income Tax Act (CITA)", "section": "Section 78-83", "effective": "2025-01-01"}'::jsonb,
  '{
    "currency": "NGN",
    "kobo_factor": 100,
    "categories": [
      {"name": "Dividends", "corporate_rate": 0.10, "individual_rate": 0.10},
      {"name": "Interest", "corporate_rate": 0.10, "individual_rate": 0.10},
      {"name": "Rent", "corporate_rate": 0.10, "individual_rate": 0.10},
      {"name": "Royalties", "corporate_rate": 0.10, "individual_rate": 0.05},
      {"name": "Commission", "corporate_rate": 0.10, "individual_rate": 0.05},
      {"name": "Consultancy/Professional Fees", "corporate_rate": 0.10, "individual_rate": 0.05},
      {"name": "Technical Services", "corporate_rate": 0.10, "individual_rate": 0.05},
      {"name": "Management Fees", "corporate_rate": 0.10, "individual_rate": 0.05},
      {"name": "Construction", "corporate_rate": 0.05, "individual_rate": 0.05},
      {"name": "Contracts/Supplies", "corporate_rate": 0.05, "individual_rate": 0.05}
    ],
    "description": "Withholding Tax rates by payment category"
  }'::jsonb,
  true,
  false
);

-- Seed CGT published rule
INSERT INTO public.tax_rules (
  tax_type,
  version,
  effective_date,
  law_reference_json,
  rules_json,
  published,
  archived
) VALUES (
  'CGT',
  'CGT_2025_v1',
  '2025-01-01',
  '{"act": "Capital Gains Tax Act (CGTA)", "section": "Section 2", "effective": "2025-01-01"}'::jsonb,
  '{
    "currency": "NGN",
    "kobo_factor": 100,
    "cgt_rate": 0.10,
    "exempt_assets": ["principal private residence", "Nigerian government securities", "stocks and shares"],
    "description": "Standard CGT rate 10% on chargeable gains"
  }'::jsonb,
  true,
  false
);