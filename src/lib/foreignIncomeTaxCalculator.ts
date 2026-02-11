/**
 * Foreign Income Tax Calculator
 * 
 * Calculates tax on foreign income with double-tax relief support.
 * Uses stub conversion rates when no API is available.
 */

import { parseNgnToKobo, mulKoboByRate, subKobo, formatKoboToNgn, koboToString, stringToKobo, addKobo, isZeroKobo, maxKobo } from "@/lib/money";

// Stub exchange rates (would be replaced by live API)
const STUB_EXCHANGE_RATES: Record<string, number> = {
  USD: 1550,  // 1 USD = 1550 NGN
  EUR: 1680,  // 1 EUR = 1680 NGN
  GBP: 1950,  // 1 GBP = 1950 NGN
  CAD: 1150,  // 1 CAD = 1150 NGN
  AUD: 1020,  // 1 AUD = 1020 NGN
  ZAR: 85,    // 1 ZAR = 85 NGN
  GHS: 125,   // 1 GHS = 125 NGN
  KES: 12,    // 1 KES = 12 NGN
  CNY: 215,   // 1 CNY = 215 NGN
  INR: 18.5,  // 1 INR = 18.5 NGN
  AED: 422,   // 1 AED = 422 NGN
  CHF: 1750,  // 1 CHF = 1750 NGN
  JPY: 10.5,  // 1 JPY = 10.5 NGN
};

// Countries with Double Taxation Agreements with Nigeria
const DTA_COUNTRIES: Record<string, { name: string; treatyYear: number }> = {
  BE: { name: "Belgium", treatyYear: 1989 },
  CA: { name: "Canada", treatyYear: 1992 },
  CN: { name: "China", treatyYear: 2002 },
  CZ: { name: "Czech Republic", treatyYear: 1990 },
  FR: { name: "France", treatyYear: 1990 },
  NL: { name: "Netherlands", treatyYear: 1991 },
  PK: { name: "Pakistan", treatyYear: 1989 },
  PH: { name: "Philippines", treatyYear: 1997 },
  RO: { name: "Romania", treatyYear: 1992 },
  ZA: { name: "South Africa", treatyYear: 2000 },
  ES: { name: "Spain", treatyYear: 2009 },
  SE: { name: "Sweden", treatyYear: 2004 },
  GB: { name: "United Kingdom", treatyYear: 1987 },
  SG: { name: "Singapore", treatyYear: 2017 },
  SK: { name: "Slovakia", treatyYear: 1990 },
  KR: { name: "South Korea", treatyYear: 2006 },
  IT: { name: "Italy", treatyYear: 2000 },
  PL: { name: "Poland", treatyYear: 1999 },
};

export interface ForeignIncomeInput {
  source_country: string;
  income_type: string;
  amount_foreign_currency: number;
  currency_code: string;
  tax_paid_foreign?: number;
  treaty_applicable?: boolean;
}

export interface ForeignIncomeResult {
  amountNgnKobo: bigint;
  taxPaidForeignKobo: bigint;
  grossTaxLiabilityKobo: bigint;
  foreignTaxCreditKobo: bigint;
  netTaxPayableKobo: bigint;
  treatyApplied: boolean;
  treatyCountry?: string;
  exchangeRate: number;
  effectiveRate: number;
}

const FOREIGN_INCOME_TAX_RATE = 0.24; // Top PIT marginal rate

/**
 * Get exchange rate for a currency
 */
export function getExchangeRate(currencyCode: string): { rate: number; isStub: boolean } {
  const rate = STUB_EXCHANGE_RATES[currencyCode.toUpperCase()];
  if (rate) {
    return { rate, isStub: true };
  }
  // Default fallback
  return { rate: 1550, isStub: true }; // Default to USD rate
}

/**
 * Check if a country has a DTA with Nigeria
 */
export function hasTreatyWithNigeria(countryCode: string): boolean {
  return countryCode.toUpperCase() in DTA_COUNTRIES;
}

/**
 * Get DTA info for a country
 */
export function getTreatyInfo(countryCode: string): { name: string; treatyYear: number } | null {
  return DTA_COUNTRIES[countryCode.toUpperCase()] || null;
}

/**
 * Get list of DTA countries
 */
export function getDTACountries(): Array<{ code: string; name: string; treatyYear: number }> {
  return Object.entries(DTA_COUNTRIES).map(([code, info]) => ({
    code,
    ...info,
  }));
}

/**
 * Get available currencies
 */
export function getAvailableCurrencies(): string[] {
  return Object.keys(STUB_EXCHANGE_RATES);
}

/**
 * Calculate foreign income tax with double-tax relief
 */
export function calculateForeignIncomeTax(input: ForeignIncomeInput): ForeignIncomeResult {
  // Get exchange rate
  const { rate: exchangeRate } = getExchangeRate(input.currency_code);
  
  // Convert to NGN
  const amountNgn = input.amount_foreign_currency * exchangeRate;
  const amountNgnKobo = parseNgnToKobo(amountNgn.toFixed(2));
  
  // Convert foreign tax paid to NGN
  const taxPaidForeignNgn = (input.tax_paid_foreign || 0) * exchangeRate;
  const taxPaidForeignKobo = parseNgnToKobo(taxPaidForeignNgn.toFixed(2));
  
  // Calculate gross Nigerian tax liability
  const grossTaxLiabilityKobo = mulKoboByRate(amountNgnKobo, FOREIGN_INCOME_TAX_RATE);
  
  // Check treaty applicability
  const treatyApplied = input.treaty_applicable ?? hasTreatyWithNigeria(input.source_country);
  const treatyInfo = getTreatyInfo(input.source_country);
  
  // Calculate foreign tax credit
  // Credit is limited to the Nigerian tax on the foreign income
  let foreignTaxCreditKobo = 0n;
  if (treatyApplied && !isZeroKobo(taxPaidForeignKobo)) {
    foreignTaxCreditKobo = taxPaidForeignKobo;
    // Cap at Nigerian tax liability
    if (foreignTaxCreditKobo > grossTaxLiabilityKobo) {
      foreignTaxCreditKobo = grossTaxLiabilityKobo;
    }
  }
  
  // Calculate net tax payable
  const netTaxPayableKobo = maxKobo(0n, subKobo(grossTaxLiabilityKobo, foreignTaxCreditKobo));
  
  // Calculate effective rate
  const effectiveRate = !isZeroKobo(amountNgnKobo) 
    ? Number(netTaxPayableKobo * 10000n / amountNgnKobo) / 100
    : 0;
  
  return {
    amountNgnKobo,
    taxPaidForeignKobo,
    grossTaxLiabilityKobo,
    foreignTaxCreditKobo,
    netTaxPayableKobo,
    treatyApplied,
    treatyCountry: treatyInfo?.name,
    exchangeRate,
    effectiveRate,
  };
}

/**
 * Format result for display
 */
export function formatForeignIncomeResult(result: ForeignIncomeResult) {
  return {
    amountNgn: formatKoboToNgn(result.amountNgnKobo),
    taxPaidForeign: formatKoboToNgn(result.taxPaidForeignKobo),
    grossTaxLiability: formatKoboToNgn(result.grossTaxLiabilityKobo),
    foreignTaxCredit: formatKoboToNgn(result.foreignTaxCreditKobo),
    netTaxPayable: formatKoboToNgn(result.netTaxPayableKobo),
    treatyApplied: result.treatyApplied ? "Yes" : "No",
    treatyCountry: result.treatyCountry || "N/A",
    exchangeRate: `₦${result.exchangeRate.toLocaleString()}`,
    effectiveRate: result.effectiveRate.toFixed(2) + "%",
  };
}
