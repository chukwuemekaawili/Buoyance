/**
 * Kobo Money Math Utilities
 * All monetary values are stored as KOBO (bigint) internally.
 * 1 NGN = 100 Kobo
 */

const KOBO_FACTOR = 100n;

/**
 * Parse a string or number NGN amount to Kobo (bigint).
 * Handles comma-formatted strings like "1,000,000".
 * Rounds to nearest kobo for fractional inputs.
 */
export function parseNgnToKobo(ngnValue: string | number): bigint {
  if (typeof ngnValue === "string") {
    // Remove commas and whitespace
    const cleaned = ngnValue.replace(/[,\s]/g, "");
    if (cleaned === "" || cleaned === "-") return 0n;
    
    // Handle decimal values by multiplying by 100 and rounding
    const numValue = parseFloat(cleaned);
    if (isNaN(numValue)) return 0n;
    
    // Round to nearest kobo to avoid floating point issues
    return BigInt(Math.round(numValue * 100));
  }
  
  // Handle number input
  if (isNaN(ngnValue)) return 0n;
  return BigInt(Math.round(ngnValue * 100));
}

/**
 * Format Kobo (bigint) to NGN display string.
 * Returns formatted currency string like "₦1,000,000".
 */
export function formatKoboToNgn(koboValue: bigint | string): string {
  // Handle string input (from JSON serialization)
  const kobo = typeof koboValue === "string" ? BigInt(koboValue) : koboValue;
  
  // Convert to NGN (integer division)
  const ngnWhole = kobo / KOBO_FACTOR;
  const koboRemainder = kobo % KOBO_FACTOR;
  
  // Format with Intl for proper comma formatting
  const formatter = new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: koboRemainder !== 0n ? 2 : 0,
    maximumFractionDigits: 2,
  });
  
  // Convert to number for formatting (safe for display purposes)
  const displayValue = Number(ngnWhole) + Number(koboRemainder) / 100;
  return formatter.format(displayValue);
}

/**
 * Format Kobo to plain number string (no currency symbol).
 */
export function formatKoboToNgnPlain(koboValue: bigint | string): string {
  const kobo = typeof koboValue === "string" ? BigInt(koboValue) : koboValue;
  const ngnWhole = kobo / KOBO_FACTOR;
  const koboRemainder = kobo % KOBO_FACTOR;
  
  const formatter = new Intl.NumberFormat("en-NG", {
    minimumFractionDigits: koboRemainder !== 0n ? 2 : 0,
    maximumFractionDigits: 2,
  });
  
  const displayValue = Number(ngnWhole) + Number(koboRemainder) / 100;
  return formatter.format(displayValue);
}

/**
 * Safe bigint addition.
 */
export function addKobo(a: bigint, b: bigint): bigint {
  return a + b;
}

/**
 * Safe bigint subtraction.
 */
export function subKobo(a: bigint, b: bigint): bigint {
  return a - b;
}

/**
 * Multiply kobo by a rate (0-1). Returns bigint kobo.
 * Uses integer math to avoid floating point errors.
 * Rate is expected as a decimal (e.g., 0.15 for 15%).
 */
export function mulKoboByRate(kobo: bigint, rate: number): bigint {
  // Convert rate to basis points (0.15 -> 1500) to avoid float issues
  // Use 10000 basis points = 100%
  const basisPoints = BigInt(Math.round(rate * 10000));
  return (kobo * basisPoints) / 10000n;
}

/**
 * Divide kobo by a number. Returns bigint kobo (floor division).
 */
export function divKobo(kobo: bigint, divisor: number): bigint {
  if (divisor === 0) return 0n;
  return kobo / BigInt(Math.round(divisor));
}

/**
 * Calculate effective rate as a percentage (returns number).
 */
export function calculateEffectiveRate(taxKobo: bigint, incomeKobo: bigint): number {
  if (incomeKobo === 0n) return 0;
  // Use high precision then convert to percentage
  const rateBasisPoints = (taxKobo * 10000n) / incomeKobo;
  return Number(rateBasisPoints) / 100;
}

/**
 * Convert bigint to string for JSON serialization.
 * Use this when saving to database.
 */
export function koboToString(kobo: bigint): string {
  return kobo.toString();
}

/**
 * Parse string back to bigint. Use when reading from database.
 */
export function stringToKobo(str: string): bigint {
  if (!str || str === "") return 0n;
  return BigInt(str);
}

/**
 * Check if a value represents zero kobo.
 */
export function isZeroKobo(kobo: bigint): boolean {
  return kobo === 0n;
}

/**
 * Get minimum of two kobo values.
 */
export function minKobo(a: bigint, b: bigint): bigint {
  return a < b ? a : b;
}

/**
 * Get maximum of two kobo values.
 */
export function maxKobo(a: bigint, b: bigint): bigint {
  return a > b ? a : b;
}
