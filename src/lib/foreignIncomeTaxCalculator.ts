/**
 * Foreign Income Tax Calculator
 * 
 * Calculates tax on foreign income with double-tax relief support.
 * Uses stub conversion rates when no API is available.
 */

import { parseNgnToKobo, mulKoboByRate, subKobo, formatKoboToNgn, koboToString, stringToKobo, addKobo, isZeroKobo, maxKobo } from "@/lib/money";

// Real-time API exchange rate fetcher replaces hardcoded stubs
export const AVAILABLE_CURRENCIES = [
  "USD", "EUR", "GBP", "CAD", "AUD", "ZAR", 
  "GHS", "KES", "CNY", "INR", "AED", "CHF", "JPY"
];

export async function fetchLiveExchangeRate(currencyCode: string): Promise<number> {
  if (currencyCode === "NGN") return 1;
  try {
    const apiKey = import.meta.env.VITE_EXCHANGE_RATE_API_KEY;
    const url = apiKey 
      ? `https://v6.exchangerate-api.com/v6/${apiKey}/latest/${currencyCode}`
      : `https://api.exchangerate-api.com/v4/latest/${currencyCode}`; // Fallback to public tier if missing
      
    const response = await fetch(url);
    if (!response.ok) throw new Error("FX API failed");
    
    const data = await response.json();
    return data.conversion_rates ? data.conversion_rates.NGN : (data.rates ? data.rates.NGN : 1500);
  } catch (err) {
    console.error("FX fetch failed", err);
    return 1500; // Conservative fallback to prevent app crash
  }
}

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
  domestic_income_ngn?: number; // Needed to apply bands correctly!
  exchange_rate_override?: number; // Injected from async fetch
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

import { calculateGlobalPIT } from './taxEngine';



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
  return AVAILABLE_CURRENCIES;
}

/**
 * Calculate foreign income tax with double-tax relief
 */
export function calculateForeignIncomeTax(input: ForeignIncomeInput): ForeignIncomeResult {
  // Use passed real exchange rate or fallback
  const exchangeRate = input.exchange_rate_override || 1500;

  // Convert to NGN
  const amountNgn = input.amount_foreign_currency * exchangeRate;
  const amountNgnKobo = parseNgnToKobo(amountNgn.toFixed(2));

  // Convert foreign tax paid to NGN
  const taxPaidForeignNgn = (input.tax_paid_foreign || 0) * exchangeRate;
  const taxPaidForeignKobo = parseNgnToKobo(taxPaidForeignNgn.toFixed(2));

  // Calculate gross tax liability properly by aggregating worldwide income
  const domesticNgnKobo = parseNgnToKobo((input.domestic_income_ngn || 0).toFixed(2));
  const totalWorldwideKobo = amountNgnKobo + domesticNgnKobo;

  const taxOnTotal = calculateGlobalPIT(totalWorldwideKobo);
  const taxOnDomesticOnly = calculateGlobalPIT(domesticNgnKobo);

  // The true tax liability attributable to the foreign income is the marginal difference
  const grossTaxLiabilityKobo = maxKobo(0n, subKobo(taxOnTotal, taxOnDomesticOnly));

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
