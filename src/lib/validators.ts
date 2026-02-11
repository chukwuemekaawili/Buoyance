/**
 * Input Validation Rules
 * 
 * Centralized validation for all form inputs.
 * Single source of truth for validation logic.
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface ValidationRule<T = unknown> {
  validate: (value: T) => ValidationResult;
  message: string;
}

// ============================================
// Numeric Validators
// ============================================

export function validateRequired(value: unknown, fieldName = "This field"): ValidationResult {
  if (value === null || value === undefined || value === "") {
    return { isValid: false, error: `${fieldName} is required` };
  }
  return { isValid: true };
}

export function validatePositiveNumber(value: string | number, fieldName = "Amount"): ValidationResult {
  const num = typeof value === "string" ? parseFloat(value.replace(/,/g, "")) : value;
  
  if (isNaN(num)) {
    return { isValid: false, error: `${fieldName} must be a valid number` };
  }
  
  if (num < 0) {
    return { isValid: false, error: `${fieldName} cannot be negative` };
  }
  
  return { isValid: true };
}

export function validateNumberRange(
  value: string | number,
  min: number,
  max: number,
  fieldName = "Value"
): ValidationResult {
  const num = typeof value === "string" ? parseFloat(value.replace(/,/g, "")) : value;
  
  if (isNaN(num)) {
    return { isValid: false, error: `${fieldName} must be a valid number` };
  }
  
  if (num < min || num > max) {
    return { isValid: false, error: `${fieldName} must be between ${min.toLocaleString()} and ${max.toLocaleString()}` };
  }
  
  return { isValid: true };
}

export function validatePercentage(value: string | number, fieldName = "Rate"): ValidationResult {
  const num = typeof value === "string" ? parseFloat(value) : value;
  
  if (isNaN(num)) {
    return { isValid: false, error: `${fieldName} must be a valid number` };
  }
  
  if (num < 0 || num > 100) {
    return { isValid: false, error: `${fieldName} must be between 0% and 100%` };
  }
  
  return { isValid: true };
}

// ============================================
// Currency Validators
// ============================================

export function validateNairaAmount(value: string, fieldName = "Amount"): ValidationResult {
  // Remove currency symbols and commas
  const cleaned = value.replace(/[₦,\s]/g, "");
  
  if (!cleaned) {
    return { isValid: false, error: `${fieldName} is required` };
  }
  
  const num = parseFloat(cleaned);
  
  if (isNaN(num)) {
    return { isValid: false, error: `${fieldName} must be a valid amount` };
  }
  
  if (num < 0) {
    return { isValid: false, error: `${fieldName} cannot be negative` };
  }
  
  // Check for maximum reasonable amount (100 trillion Naira)
  if (num > 100_000_000_000_000) {
    return { isValid: false, error: `${fieldName} exceeds maximum allowed value` };
  }
  
  return { isValid: true };
}

export function validateKoboAmount(value: string, fieldName = "Amount"): ValidationResult {
  if (!value || value === "0") {
    return { isValid: false, error: `${fieldName} is required` };
  }
  
  try {
    const bigint = BigInt(value);
    if (bigint < 0n) {
      return { isValid: false, error: `${fieldName} cannot be negative` };
    }
    return { isValid: true };
  } catch {
    return { isValid: false, error: `${fieldName} is invalid` };
  }
}

// ============================================
// Date Validators
// ============================================

export function validateDate(value: string, fieldName = "Date"): ValidationResult {
  if (!value) {
    return { isValid: false, error: `${fieldName} is required` };
  }
  
  const date = new Date(value);
  
  if (isNaN(date.getTime())) {
    return { isValid: false, error: `${fieldName} is not a valid date` };
  }
  
  return { isValid: true };
}

export function validateDateRange(
  startDate: string,
  endDate: string,
  startFieldName = "Start date",
  endFieldName = "End date"
): ValidationResult {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime())) {
    return { isValid: false, error: `${startFieldName} is not valid` };
  }
  
  if (isNaN(end.getTime())) {
    return { isValid: false, error: `${endFieldName} is not valid` };
  }
  
  if (end < start) {
    return { isValid: false, error: `${endFieldName} must be after ${startFieldName.toLowerCase()}` };
  }
  
  return { isValid: true };
}

export function validateFutureDate(value: string, fieldName = "Date"): ValidationResult {
  const dateResult = validateDate(value, fieldName);
  if (!dateResult.isValid) return dateResult;
  
  const date = new Date(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (date < today) {
    return { isValid: false, error: `${fieldName} must be in the future` };
  }
  
  return { isValid: true };
}

export function validatePastDate(value: string, fieldName = "Date"): ValidationResult {
  const dateResult = validateDate(value, fieldName);
  if (!dateResult.isValid) return dateResult;
  
  const date = new Date(value);
  const today = new Date();
  
  if (date > today) {
    return { isValid: false, error: `${fieldName} cannot be in the future` };
  }
  
  return { isValid: true };
}

// ============================================
// String Validators
// ============================================

export function validateMinLength(value: string, minLength: number, fieldName = "Field"): ValidationResult {
  if (!value || value.length < minLength) {
    return { isValid: false, error: `${fieldName} must be at least ${minLength} characters` };
  }
  return { isValid: true };
}

export function validateMaxLength(value: string, maxLength: number, fieldName = "Field"): ValidationResult {
  if (value && value.length > maxLength) {
    return { isValid: false, error: `${fieldName} must not exceed ${maxLength} characters` };
  }
  return { isValid: true };
}

export function validateEmail(value: string): ValidationResult {
  if (!value) {
    return { isValid: false, error: "Email is required" };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value)) {
    return { isValid: false, error: "Please enter a valid email address" };
  }
  
  return { isValid: true };
}

export function validateTIN(value: string): ValidationResult {
  if (!value) {
    return { isValid: false, error: "Tax Identification Number is required" };
  }
  
  // Nigerian TIN format: exactly 10 digits (JTB standard)
  const cleaned = value.replace(/[\s-]/g, "");
  
  if (!/^\d{10}$/.test(cleaned)) {
    return { isValid: false, error: "TIN must be a valid 10-digit JTB number" };
  }
  
  return { isValid: true };
}

export function validateTINOptional(value: string): ValidationResult {
  if (!value || value.trim() === "") {
    return { isValid: true }; // Optional, so empty is valid
  }
  return validateTIN(value);
}

// ============================================
// Select/Enum Validators
// ============================================

export function validateOption<T extends string>(
  value: T,
  validOptions: readonly T[],
  fieldName = "Selection"
): ValidationResult {
  if (!value) {
    return { isValid: false, error: `${fieldName} is required` };
  }
  
  if (!validOptions.includes(value)) {
    return { isValid: false, error: `${fieldName} is not a valid option` };
  }
  
  return { isValid: true };
}

// ============================================
// Tax-Specific Validators
// ============================================

export const TAX_TYPES = ["PIT", "CIT", "VAT", "WHT", "CGT"] as const;
export type TaxType = typeof TAX_TYPES[number];

export function validateTaxType(value: string): ValidationResult {
  return validateOption(value as TaxType, TAX_TYPES, "Tax type");
}

export const FILING_STATUSES = ["draft", "submitted", "accepted", "rejected", "cancelled"] as const;
export type FilingStatus = typeof FILING_STATUSES[number];

export function validateFilingStatus(value: string): ValidationResult {
  return validateOption(value as FilingStatus, FILING_STATUSES, "Filing status");
}

// ============================================
// Composite Validators
// ============================================

export function validateAll(...results: ValidationResult[]): ValidationResult {
  for (const result of results) {
    if (!result.isValid) {
      return result;
    }
  }
  return { isValid: true };
}

export function validateAny(...results: ValidationResult[]): ValidationResult {
  const errors: string[] = [];
  
  for (const result of results) {
    if (result.isValid) {
      return { isValid: true };
    }
    if (result.error) {
      errors.push(result.error);
    }
  }
  
  return { isValid: false, error: errors.join("; ") };
}
