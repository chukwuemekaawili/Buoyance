-- =========================================================================
-- 1. PRE-SPRINT FIXES: NTA 2025 Tax Rule Corrections
-- =========================================================================

-- Fix CIT: ₦100M threshold, 0% small rate, 4% Dev Levy added
UPDATE public.tax_rules
SET
  effective_date = '2026-01-01',
  law_reference_json = '{"act": "Nigeria Tax Act 2025", "section": "Companies Income Tax", "effective": "1 January 2026"}',
  rules_json = '{
    "currency": "NGN",
    "kobo_factor": 100,
    "rates": {
      "standard_rate": 0.30,
      "development_levy_rate": 0.04,
      "small_company_rate": 0.00,
      "small_company_threshold_kobo": 10000000000,
      "small_company_asset_threshold_kobo": 25000000000,
      "minimum_etr": 0.15,
      "mne_threshold_eur": 750000000
    },
    "description": "NTA 2025: Small company (≤₦100M turnover AND ≤₦250M assets): 0%. All others: 30% CIT + 4% Development Levy = 34%. Professional services excluded from small company classification."
  }'
WHERE version = 'CIT_2025_v1';

-- Fix WHT: 2024 Regulations Categories (e.g. 5% Professional, 2% General services)
UPDATE public.tax_rules
SET
  effective_date = '2025-01-01',
  law_reference_json = '{"act": "Deduction of Tax at Source (Withholding) Regulations 2024", "section": "Schedule 1", "effective": "1 January 2025"}',
  rules_json = '{
    "currency": "NGN",
    "kobo_factor": 100,
    "categories": [
      {"name": "Dividends",                  "corporate_rate": 0.10, "individual_rate": 0.10},
      {"name": "Interest",                   "corporate_rate": 0.10, "individual_rate": 0.10},
      {"name": "Rent",                       "corporate_rate": 0.10, "individual_rate": 0.10},
      {"name": "Royalties",                  "corporate_rate": 0.10, "individual_rate": 0.10},
      {"name": "Directors Fees",             "corporate_rate": 0.15, "individual_rate": 0.15},
      {"name": "Professional / Consultancy Fees", "corporate_rate": 0.05, "individual_rate": 0.05},
      {"name": "Technical / Management Fees","corporate_rate": 0.05, "individual_rate": 0.05},
      {"name": "General Services",           "corporate_rate": 0.02, "individual_rate": 0.02},
      {"name": "Sale of Goods (Businesses)", "corporate_rate": 0.02, "individual_rate": 0.02},
      {"name": "Commission / Brokerage",     "corporate_rate": 0.05, "individual_rate": 0.05},
      {"name": "Construction (Roads/Buildings)", "corporate_rate": 0.02, "individual_rate": 0.02},
      {"name": "Contracts / Supplies",       "corporate_rate": 0.02, "individual_rate": 0.02},
      {"name": "Winnings / Lottery",         "corporate_rate": 0.05, "individual_rate": 0.05}
    ],
    "non_resident_rates_note": "Non-residents: professional fees 10%, directors fees 20%, construction 5-10%.",
    "no_tin_penalty": "Double the applicable rate if recipient has no TIN registration.",
    "small_biz_exemption": "Businesses with turnover <₦25M are exempt from WHT obligation if supplier has valid TIN and single transaction ≤₦2M.",
    "description": "Withholding Tax rates per Deduction of Tax at Source (Withholding) Regulations 2024, effective 1 January 2025."
  }'
WHERE version = 'WHT_2025_v1';

-- Fix CGT: NTA 2025 (30% corporate rate, progressive for individuals)
UPDATE public.tax_rules
SET
  effective_date = '2026-01-01',
  law_reference_json = '{"act": "Nigeria Tax Act 2025", "section": "Part VI — Capital Gains Tax", "effective": "1 January 2026"}',
  rules_json = '{
    "currency": "NGN",
    "kobo_factor": 100,
    "cgt_rate": 0.30,
    "individual_rate_note": "Individuals: gains taxed at progressive PIT rates (0%-25%), not the 30% flat rate.",
    "small_company_exempt": true,
    "exempt_assets": [
      "NSE-listed shares",
      "Nigerian government securities",
      "Principal private residence (once per lifetime)",
      "Share disposals where total proceeds <₦150M AND total gains <₦10M in any 12 months",
      "Reinvestment of share proceeds into other Nigerian company shares"
    ],
    "new_scope": "Now applies to digital/virtual assets (crypto, NFTs) and indirect transfers of shares in Nigerian companies by non-residents.",
    "description": "CGT rate for companies: 30% (NTA 2025, up from 10%). Individuals: progressive PIT bands apply to capital gains. Small companies exempt."
  }'
WHERE version = 'CGT_2025_v1';
