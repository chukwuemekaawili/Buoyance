/**
 * Centralized Tax Engine - Single Source of Truth
 * 
 * Contains all NTA 2025 PIT bands, deductions, relief caps,
 * payroll deduction rules, and compliance deadlines.
 */

// --- NTA 2025 PIT Progressive Bands ---
export const NTA2025_PIT_BANDS = [
  { minKobo: 0n, maxKobo: 80000000n, rateNumerator: 0n },         // First ₦800K exempt
  { minKobo: 80000000n, maxKobo: 300000000n, rateNumerator: 15n },  // ₦800K - ₦3M: 15%
  { minKobo: 300000000n, maxKobo: 1200000000n, rateNumerator: 18n }, // ₦3M - ₦12M: 18%
  { minKobo: 1200000000n, maxKobo: 2500000000n, rateNumerator: 21n }, // ₦12M - ₦25M: 21%
  { minKobo: 2500000000n, maxKobo: 5000000000n, rateNumerator: 23n }, // ₦25M - ₦50M: 23%
  { minKobo: 5000000000n, maxKobo: null, rateNumerator: 25n },   // Above ₦50M: 25%
];

// --- Reliefs and Allowances ---
export const RENT_RELIEF = {
  MAX_KOBO: 20000000n,         // ₦200,000 max
};

// --- Payroll Deduction Rates ---
export const PAYROLL_RATES = {
  PENSION_EMPLOYEE: 8n,        // 8% of gross
  PENSION_EMPLOYER: 10n,       // 10% of gross
  NHF: 25n,                    // 2.5% (numerator 25, denominator 1000) of basic salary
  // Organized Private Sector (OPS) NHIA Rates (15% of basic salary total)
  NHIA_EMPLOYEE: 500n,         // 5% (numerator 500, denominator 10000) of basic salary
  NHIA_EMPLOYER: 10n,          // 10% of basic salary
  NSITF: 1n,                   // 1% of gross (employer only)
};

// --- Compliance Deadlines ---
export const COMPLIANCE_DEADLINES = {
  VAT: '21st of following month',
  WHT: '21st of following month',
  PAYE: '10th of following month',
  PIT: '31 March',             // Annual return
  CIT: '6 months after year-end',
};

// --- Centralized Tax Calculation Functions ---

/**
 * Applies progressive PIT bands to a globally aggregated taxable income.
 */
export function calculateGlobalPIT(taxableIncomeKobo: bigint): bigint {
  if (taxableIncomeKobo <= 0n) return 0n;

  let tax = 0n;
  let remaining = taxableIncomeKobo;

  for (const bracket of NTA2025_PIT_BANDS) {
    if (remaining <= 0n) break;
    const bracketSize = bracket.maxKobo ? (bracket.maxKobo - bracket.minKobo) : remaining;
    const taxableInBracket = remaining < bracketSize ? remaining : bracketSize;
    tax += (taxableInBracket * bracket.rateNumerator) / 100n;
    remaining -= taxableInBracket;
  }

  return tax;
}

/**
 * Calculates correct Rent Relief according to NTA 2025.
 * Cap is MIN(Rent Paid, 200,000, 1/6 of gross)
 */
export function calculateRentRelief(annualRentKobo: bigint, annualGrossKobo: bigint): bigint {
  const cap1 = RENT_RELIEF.MAX_KOBO;
  const cap2 = annualGrossKobo / 6n;
  
  let actualRelief = annualRentKobo;
  if (cap1 < actualRelief) actualRelief = cap1;
  if (cap2 < actualRelief) actualRelief = cap2;
  
  return actualRelief;
}
