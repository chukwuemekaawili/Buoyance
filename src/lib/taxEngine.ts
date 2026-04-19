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

// --- Reliefs and Allowances (NTA 2025) ---
export const RENT_RELIEF = {
  RATE_NUMERATOR: 20n,         // 20% of annual rent paid
  MAX_KOBO: 50000000n,         // ₦500,000 cap (NTA 2025 — raised from ₦200,000 under old PITA)
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
 * Applies progressive PIT bands to taxable income, with NTA 2025 minimum tax floor.
 * Minimum tax = 1% of gross income where band calculation yields less.
 * annualGrossKobo is required to compute the minimum tax floor.
 */
export function calculateGlobalPIT(taxableIncomeKobo: bigint, annualGrossKobo?: bigint): bigint {
  if (taxableIncomeKobo <= 0n) {
    // Minimum tax: 1% of gross (PwC Nigeria individual summary; verify against NTA 2025 gazette)
    return annualGrossKobo ? (annualGrossKobo / 100n) : 0n;
  }

  let tax = 0n;
  let remaining = taxableIncomeKobo;

  for (const bracket of NTA2025_PIT_BANDS) {
    if (remaining <= 0n) break;
    const bracketSize = bracket.maxKobo ? (bracket.maxKobo - bracket.minKobo) : remaining;
    const taxableInBracket = remaining < bracketSize ? remaining : bracketSize;
    tax += (taxableInBracket * bracket.rateNumerator) / 100n;
    remaining -= taxableInBracket;
  }

  // Apply minimum tax floor: tax must be at least 1% of gross income
  if (annualGrossKobo) {
    const minimumTax = annualGrossKobo / 100n;
    if (tax < minimumTax) return minimumTax;
  }

  return tax;
}

/**
 * Calculates Rent Relief under NTA 2025.
 * Relief = 20% of annual rent paid, capped at ₦500,000.
 * (Old PITA formula of MIN(rent, ₦200K, 1/6 gross) no longer applies.)
 */
export function calculateRentRelief(annualRentKobo: bigint, _annualGrossKobo: bigint): bigint {
  const relief = (annualRentKobo * RENT_RELIEF.RATE_NUMERATOR) / 100n;
  return relief < RENT_RELIEF.MAX_KOBO ? relief : RENT_RELIEF.MAX_KOBO;
}
