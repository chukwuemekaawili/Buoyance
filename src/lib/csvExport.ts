import { formatKoboToNgn, stringToKobo } from "@/lib/money";
import { format } from "date-fns";

interface TaxCalculation {
  id: string;
  created_at: string;
  tax_type: string;
  rule_version: string;
  input_json: Record<string, unknown>;
  output_json: Record<string, unknown>;
}

/**
 * Display helper that handles both KOBO and legacy formats.
 */
function displayCurrency(koboStr: string | undefined, legacyValue: number | undefined): string {
  if (koboStr) {
    return formatKoboToNgn(stringToKobo(koboStr));
  }
  if (legacyValue !== undefined) {
    return formatKoboToNgn(BigInt(Math.round(legacyValue * 100)));
  }
  return "₦0";
}

/**
 * Get the primary amount fields based on tax type for CSV export
 */
function getAmountFieldsForCSV(calc: TaxCalculation): Record<string, string> {
  const input = calc.input_json as Record<string, unknown>;
  const output = calc.output_json as Record<string, unknown>;

  const fields: Record<string, string> = {};

  switch (calc.tax_type) {
    case "CIT":
      fields["Taxable Profit"] = displayCurrency(input.taxableProfitKobo as string, input.taxableProfit as number);
      fields["CIT Payable"] = displayCurrency(output.taxPayableKobo as string, output.taxPayable as number);
      fields["Net Profit"] = displayCurrency(output.netProfitKobo as string, output.netProfit as number);
      if (input.companySize) fields["Company Size"] = String(input.companySize);
      break;
    case "VAT":
      fields["Taxable Sales"] = displayCurrency(input.taxableSalesKobo as string, input.taxableSales as number);
      fields["VAT Payable"] = displayCurrency(output.vatPayableKobo as string, output.vatPayable as number);
      fields["Total (incl. VAT)"] = displayCurrency(output.totalWithVatKobo as string, output.totalWithVat as number);
      break;
    case "WHT":
      fields["Payment Amount"] = displayCurrency(input.paymentAmountKobo as string, input.paymentAmount as number);
      fields["WHT Rate"] = `${input.whtRate || output.whtRate || 10}%`;
      fields["WHT Deductible"] = displayCurrency(output.whtPayableKobo as string, output.whtPayable as number);
      fields["Net Payment"] = displayCurrency(output.netPaymentKobo as string, output.netPayment as number);
      if (input.paymentType) fields["Payment Type"] = String(input.paymentType);
      break;
    case "CGT":
      fields["Sale Proceeds"] = displayCurrency(input.proceedsKobo as string, input.proceeds as number);
      fields["Cost of Acquisition"] = displayCurrency(input.costKobo as string, input.cost as number);
      fields["Capital Gain"] = displayCurrency(output.capitalGainKobo as string, output.capitalGain as number);
      fields["CGT Payable"] = displayCurrency(output.cgtPayableKobo as string, output.cgtPayable as number);
      fields["Net Proceeds"] = displayCurrency(output.netProceedsKobo as string, output.netProceeds as number);
      break;
    case "PIT":
    default:
      fields["Annual Income"] = displayCurrency(input.annualSalaryKobo as string, input.annualSalary as number);
      fields["Total Tax"] = displayCurrency(output.totalTaxKobo as string, output.totalTax as number);
      fields["Net Annual Income"] = displayCurrency(output.netAnnualIncomeKobo as string, output.netAnnualIncome as number);
      fields["Monthly Net"] = displayCurrency(output.netMonthlyIncomeKobo as string, output.netMonthlyIncome as number);
      break;
  }

  // Add effective rate if available
  const effectiveRate = output.effectiveRate as number | undefined;
  if (effectiveRate !== undefined) {
    fields["Effective Rate"] = `${effectiveRate.toFixed(2)}%`;
  }

  return fields;
}

/**
 * Escapes a CSV value (handles commas, quotes, newlines)
 */
function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Exports a single calculation to CSV and triggers download.
 */
export function exportCalculationCSV(calc: TaxCalculation): void {
  const fields = getAmountFieldsForCSV(calc);
  
  const rows: string[][] = [
    ["Buoyance Tax Calculation Export"],
    [],
    ["Tax Type", calc.tax_type],
    ["Calculation Date", format(new Date(calc.created_at), "MMMM d, yyyy 'at' h:mm a")],
    ["Rule Version", calc.rule_version || "v1"],
    ["Export Date", format(new Date(), "MMMM d, yyyy 'at' h:mm a")],
    [],
    ["Field", "Value"],
  ];

  Object.entries(fields).forEach(([label, value]) => {
    rows.push([label, value]);
  });

  rows.push([]);
  rows.push(["Note", "This document is for informational purposes only and does not constitute tax advice."]);

  const csvContent = rows
    .map((row) => row.map(escapeCSV).join(","))
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.href = url;
  link.download = `buoyance-${calc.tax_type.toLowerCase()}-calculation-${format(new Date(calc.created_at), "yyyy-MM-dd")}.csv`;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports multiple calculations to a single CSV file.
 */
export function exportCalculationsCSV(calculations: TaxCalculation[]): void {
  if (calculations.length === 0) return;

  // Collect all unique field names across all calculations
  const allFieldNames = new Set<string>();
  const calcFields: Record<string, string>[] = [];

  calculations.forEach((calc) => {
    const fields = getAmountFieldsForCSV(calc);
    calcFields.push(fields);
    Object.keys(fields).forEach((key) => allFieldNames.add(key));
  });

  const fieldNamesArray = Array.from(allFieldNames);

  // Header row
  const headers = ["Tax Type", "Calculation Date", "Rule Version", ...fieldNamesArray];

  const rows: string[][] = [headers];

  calculations.forEach((calc, index) => {
    const fields = calcFields[index];
    const row = [
      calc.tax_type,
      format(new Date(calc.created_at), "yyyy-MM-dd HH:mm"),
      calc.rule_version || "v1",
      ...fieldNamesArray.map((name) => fields[name] || ""),
    ];
    rows.push(row);
  });

  const csvContent = rows
    .map((row) => row.map(escapeCSV).join(","))
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `buoyance-calculations-${format(new Date(), "yyyy-MM-dd")}.csv`;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
