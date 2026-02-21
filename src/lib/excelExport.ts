/**
 * Excel Export for Filing Pack
 * Generates .xls (Excel 97-2003) files for TaxPro Max compatibility.
 * NTA 2026 compliant: CIT includes 4% Development Levy.
 */

import * as XLSX from "xlsx";
import { format } from "date-fns";
import { stringToKobo } from "@/lib/money";
import type { Filing } from "@/lib/filingService";

/**
 * Convert Kobo string to display Naira number.
 */
function koboToNumber(koboStr: string | undefined): number {
  if (!koboStr) return 0;
  return Number(stringToKobo(koboStr)) / 100;
}

/**
 * Format Naira for display in Excel.
 */
function formatNaira(amount: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Generate CIT Filing Pack as .xls ArrayBuffer
 * NTA 2026: Includes 4% Development Levy
 */
export function generateCITWorkbookXLS(filing: Filing): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  const input = filing.input_json;
  const output = filing.output_json;

  const taxableProfitKobo = stringToKobo(input.taxableProfitKobo as string || "0");
  const citPayableKobo = stringToKobo(output.taxPayableKobo as string || "0");

  // NTA 2026: 4% Development Levy on assessable profit
  const developmentLevyKobo = (taxableProfitKobo * 4n) / 100n;
  const totalDueKobo = citPayableKobo + developmentLevyKobo;

  const taxableProfit = koboToNumber(input.taxableProfitKobo as string);
  const citPayable = koboToNumber(output.taxPayableKobo as string);
  const developmentLevy = Number(developmentLevyKobo) / 100;
  const totalDue = Number(totalDueKobo) / 100;

  // Summary Sheet
  const summaryData = [
    ["BUOYANCE - CIT Filing Pack"],
    ["Generated:", format(new Date(), "yyyy-MM-dd HH:mm:ss")],
    [],
    ["Filing Information"],
    ["Filing ID:", filing.id],
    ["Tax Type:", "Company Income Tax (CIT)"],
    ["Period:", `${format(new Date(filing.period_start), "MMM yyyy")} - ${format(new Date(filing.period_end), "MMM yyyy")}`],
    ["Rule Version:", filing.rule_version || "N/A"],
    ["Status:", filing.status.toUpperCase()],
    [],
    ["Tax Calculation Summary"],
    ["Taxable Profit:", formatNaira(taxableProfit)],
    ["Company Size:", String(input.companySize || "medium")],
    ["CIT Rate:", `${output.effectiveRate || 30}%`],
    [],
    ["Amounts Due"],
    ["CIT Payable:", formatNaira(citPayable)],
    ["Development Levy (4%):", formatNaira(developmentLevy)],
    ["TOTAL DUE:", formatNaira(totalDue)],
    [],
    ["Note: Development Levy is 4% of assessable profit per NTA 2026 requirements."],
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

  // Instructions Sheet
  const instructionsData = [
    ["TaxPro Max Upload Instructions"],
    [],
    ["1. Log in to TaxPro Max portal at https://taxpromax.firs.gov.ng"],
    ["2. Navigate to CIT > Annual Returns > File New Return"],
    ["3. Select the appropriate tax period"],
    ["4. Upload the 'Schedule' sheet from this workbook"],
    ["5. Verify all figures match your records"],
    ["6. Submit and note the acknowledgment reference"],
    [],
    ["IMPORTANT:"],
    ["- This file is in .xls format for maximum compatibility"],
    ["- If portal rejects, try saving as CSV from the Schedule sheet"],
    ["- Keep this file for your records"],
    [],
    ["Support: support@buoyance.com"],
  ];
  const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionsData);
  XLSX.utils.book_append_sheet(wb, instructionsSheet, "Instructions");

  // Schedule Sheet (TaxPro Max Compatible)
  const scheduleData = [
    ["TaxPro Max Compatible CIT Schedule (v1)"],
    [],
    ["Field", "Value", "Currency"],
    ["Tax Period Start", format(new Date(filing.period_start), "yyyy-MM-dd"), ""],
    ["Tax Period End", format(new Date(filing.period_end), "yyyy-MM-dd"), ""],
    ["Assessable Profit", taxableProfit, "NGN"],
    ["Company Classification", String(input.companySize || "medium").toUpperCase(), ""],
    ["Applicable CIT Rate (%)", output.effectiveRate || 30, ""],
    ["CIT Liability", citPayable, "NGN"],
    ["Development Levy Rate (%)", 4, ""],
    ["Development Levy Amount", developmentLevy, "NGN"],
    ["Total Tax Due", totalDue, "NGN"],
  ];
  const scheduleSheet = XLSX.utils.aoa_to_sheet(scheduleData);
  XLSX.utils.book_append_sheet(wb, scheduleSheet, "Schedule");

  // Write as .xls (Excel 97-2003)
  return XLSX.write(wb, { bookType: "xls", type: "array" });
}

/**
 * Generate VAT Filing Pack as .xls ArrayBuffer
 * Includes State of Consumption column per requirements.
 */
export function generateVATWorkbookXLS(filing: Filing): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  const input = filing.input_json;
  const output = filing.output_json;

  const taxableSales = koboToNumber(input.taxableSalesKobo as string);
  const vatPayable = koboToNumber(output.vatPayableKobo as string);
  const stateOfConsumption = (input.stateOfConsumption as string) || "UNKNOWN";

  // Summary Sheet
  const summaryData = [
    ["BUOYANCE - VAT Filing Pack"],
    ["Generated:", format(new Date(), "yyyy-MM-dd HH:mm:ss")],
    [],
    ["Filing Information"],
    ["Filing ID:", filing.id],
    ["Tax Type:", "Value Added Tax (VAT)"],
    ["Period:", `${format(new Date(filing.period_start), "MMM yyyy")} - ${format(new Date(filing.period_end), "MMM yyyy")}`],
    ["Rule Version:", filing.rule_version || "N/A"],
    ["Status:", filing.status.toUpperCase()],
    [],
    ["Tax Calculation Summary"],
    ["Taxable Sales:", formatNaira(taxableSales)],
    ["VAT Rate:", "7.5%"],
    ["VAT Payable:", formatNaira(vatPayable)],
    [],
    ["State of Consumption:", stateOfConsumption],
    stateOfConsumption === "UNKNOWN"
      ? ["WARNING: State of Consumption not specified. Update before portal submission."]
      : [],
  ].filter(row => row.length > 0);
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

  // Instructions Sheet
  const instructionsData = [
    ["TaxPro Max Upload Instructions"],
    [],
    ["1. Log in to TaxPro Max portal at https://taxpromax.firs.gov.ng"],
    ["2. Navigate to VAT > Monthly Returns > File New Return"],
    ["3. Select the appropriate tax period"],
    ["4. Upload the 'Schedule' sheet from this workbook"],
    ["5. Ensure State of Consumption is correctly filled"],
    ["6. Verify all figures match your records"],
    ["7. Submit and note the acknowledgment reference"],
    [],
    ["IMPORTANT:"],
    ["- This file is in .xls format for maximum compatibility"],
    ["- State of Consumption is REQUIRED by FIRS"],
    ["- If portal rejects, try saving as CSV from the Schedule sheet"],
    [],
    ["Support: support@buoyance.com"],
  ];
  const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionsData);
  XLSX.utils.book_append_sheet(wb, instructionsSheet, "Instructions");

  // Schedule Sheet (TaxPro Max Compatible with State of Consumption)
  const scheduleData = [
    ["TaxPro Max Compatible VAT Schedule (v1)"],
    [],
    ["Field", "Value", "Currency", "State of Consumption"],
    ["Tax Period Start", format(new Date(filing.period_start), "yyyy-MM-dd"), "", ""],
    ["Tax Period End", format(new Date(filing.period_end), "yyyy-MM-dd"), "", ""],
    ["Taxable Sales", taxableSales, "NGN", stateOfConsumption],
    ["VAT Rate (%)", 7.5, "", ""],
    ["VAT Liability", vatPayable, "NGN", ""],
  ];
  const scheduleSheet = XLSX.utils.aoa_to_sheet(scheduleData);
  XLSX.utils.book_append_sheet(wb, scheduleSheet, "Schedule");

  // Write as .xls (Excel 97-2003)
  return XLSX.write(wb, { bookType: "xls", type: "array" });
}

/**
 * Generate WHT Filing Pack as .xls ArrayBuffer
 */
export function generateWHTWorkbookXLS(filing: Filing): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  const input = filing.input_json;
  const output = filing.output_json;

  const paymentAmount = koboToNumber(input.paymentAmountKobo as string);
  const whtPayable = koboToNumber(output.whtPayableKobo as string);
  const whtRate = (input.whtRate as number) || 10;

  // Summary Sheet
  const summaryData = [
    ["BUOYANCE - WHT Filing Pack"],
    ["Generated:", format(new Date(), "yyyy-MM-dd HH:mm:ss")],
    [],
    ["Filing Information"],
    ["Filing ID:", filing.id],
    ["Tax Type:", "Withholding Tax (WHT)"],
    ["Period:", `${format(new Date(filing.period_start), "MMM yyyy")} - ${format(new Date(filing.period_end), "MMM yyyy")}`],
    ["Rule Version:", filing.rule_version || "N/A"],
    ["Status:", filing.status.toUpperCase()],
    [],
    ["Tax Calculation Summary"],
    ["Gross Payment:", formatNaira(paymentAmount)],
    ["WHT Rate:", `${whtRate}%`],
    ["WHT Deductible:", formatNaira(whtPayable)],
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

  // Instructions Sheet
  const instructionsData = [
    ["TaxPro Max Upload Instructions"],
    [],
    ["1. Log in to TaxPro Max portal at https://taxpromax.firs.gov.ng"],
    ["2. Navigate to WHT > Remittance > File New Return"],
    ["3. Upload beneficiary schedule if multiple payees"],
    ["4. Verify TIN matching for all beneficiaries"],
    ["5. Submit and note the acknowledgment reference"],
    [],
    ["IMPORTANT:"],
    ["- TIN T-Match is REQUIRED for all beneficiaries"],
    ["- Unmatched TINs will be REJECTED by TaxPro Max"],
    [],
    ["Support: support@buoyance.com"],
  ];
  const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionsData);
  XLSX.utils.book_append_sheet(wb, instructionsSheet, "Instructions");

  // Schedule Sheet
  const scheduleData = [
    ["TaxPro Max Compatible WHT Schedule (v1)"],
    [],
    ["Field", "Value", "Currency"],
    ["Tax Period Start", format(new Date(filing.period_start), "yyyy-MM-dd"), ""],
    ["Tax Period End", format(new Date(filing.period_end), "yyyy-MM-dd"), ""],
    ["Gross Payment Amount", paymentAmount, "NGN"],
    ["WHT Rate (%)", whtRate, ""],
    ["WHT Deductible", whtPayable, "NGN"],
  ];
  const scheduleSheet = XLSX.utils.aoa_to_sheet(scheduleData);
  XLSX.utils.book_append_sheet(wb, scheduleSheet, "Schedule");

  return XLSX.write(wb, { bookType: "xls", type: "array" });
}

/**
 * Generate CGT Filing Pack as .xls ArrayBuffer
 */
export function generateCGTWorkbookXLS(filing: Filing): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  const input = filing.input_json;
  const output = filing.output_json;

  const proceeds = koboToNumber(input.proceedsKobo as string);
  const cost = koboToNumber(input.costKobo as string);
  const capitalGain = koboToNumber(output.capitalGainKobo as string);
  const cgtPayable = koboToNumber(output.cgtPayableKobo as string);

  // Summary Sheet
  const summaryData = [
    ["BUOYANCE - CGT Filing Pack"],
    ["Generated:", format(new Date(), "yyyy-MM-dd HH:mm:ss")],
    [],
    ["Filing Information"],
    ["Filing ID:", filing.id],
    ["Tax Type:", "Capital Gains Tax (CGT)"],
    ["Period:", `${format(new Date(filing.period_start), "MMM yyyy")} - ${format(new Date(filing.period_end), "MMM yyyy")}`],
    ["Rule Version:", filing.rule_version || "N/A"],
    ["Status:", filing.status.toUpperCase()],
    [],
    ["Tax Calculation Summary"],
    ["Sale Proceeds:", formatNaira(proceeds)],
    ["Cost of Acquisition:", formatNaira(cost)],
    ["Capital Gain:", formatNaira(capitalGain)],
    ["CGT Rate:", "10%"],
    ["CGT Payable:", formatNaira(cgtPayable)],
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

  // Instructions Sheet
  const instructionsData = [
    ["TaxPro Max Upload Instructions"],
    [],
    ["1. Log in to TaxPro Max portal at https://taxpromax.firs.gov.ng"],
    ["2. Navigate to CGT > File New Return"],
    ["3. Upload supporting documents for asset disposal"],
    ["4. Verify all figures match your records"],
    ["5. Submit and note the acknowledgment reference"],
    [],
    ["Support: support@buoyance.com"],
  ];
  const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionsData);
  XLSX.utils.book_append_sheet(wb, instructionsSheet, "Instructions");

  // Schedule Sheet
  const scheduleData = [
    ["TaxPro Max Compatible CGT Schedule (v1)"],
    [],
    ["Field", "Value", "Currency"],
    ["Tax Period Start", format(new Date(filing.period_start), "yyyy-MM-dd"), ""],
    ["Tax Period End", format(new Date(filing.period_end), "yyyy-MM-dd"), ""],
    ["Sale Proceeds", proceeds, "NGN"],
    ["Cost of Acquisition", cost, "NGN"],
    ["Capital Gain", capitalGain, "NGN"],
    ["CGT Rate (%)", 10, ""],
    ["CGT Liability", cgtPayable, "NGN"],
  ];
  const scheduleSheet = XLSX.utils.aoa_to_sheet(scheduleData);
  XLSX.utils.book_append_sheet(wb, scheduleSheet, "Schedule");

  return XLSX.write(wb, { bookType: "xls", type: "array" });
}

/**
 * Download Filing Pack as .xls file.
 */
export function downloadFilingXLS(filing: Filing): void {
  let arrayBuffer: ArrayBuffer;
  let filename: string;

  const dateStr = format(new Date(filing.created_at), "yyyy-MM-dd");

  switch (filing.tax_type) {
    case "CIT":
      arrayBuffer = generateCITWorkbookXLS(filing);
      filename = `buoyance-cit-filing-pack-${dateStr}.xls`;
      break;
    case "VAT":
      arrayBuffer = generateVATWorkbookXLS(filing);
      filename = `buoyance-vat-filing-pack-${dateStr}.xls`;
      break;
    case "WHT":
      arrayBuffer = generateWHTWorkbookXLS(filing);
      filename = `buoyance-wht-filing-pack-${dateStr}.xls`;
      break;
    case "CGT":
      arrayBuffer = generateCGTWorkbookXLS(filing);
      filename = `buoyance-cgt-filing-pack-${dateStr}.xls`;
      break;
    default:
      console.warn(`Excel export not supported for tax type: ${filing.tax_type}`);
      return;
  }

  // Create and trigger download
  const blob = new Blob([arrayBuffer], { type: "application/vnd.ms-excel" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Check if filing type supports Excel export.
 */
export function supportsExcelExport(taxType: string): boolean {
  return ["CIT", "VAT", "WHT", "CGT"].includes(taxType);
}
