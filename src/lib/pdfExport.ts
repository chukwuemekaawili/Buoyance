import jsPDF from "jspdf";
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
 * Get the primary amount fields based on tax type
 */
function getAmountFields(calc: TaxCalculation): Array<{ label: string; value: string }> {
  const input = calc.input_json as Record<string, unknown>;
  const output = calc.output_json as Record<string, unknown>;

  const fields: Array<{ label: string; value: string }> = [];

  switch (calc.tax_type) {
    case "CIT":
      fields.push({ label: "Taxable Profit", value: displayCurrency(input.taxableProfitKobo as string, input.taxableProfit as number) });
      fields.push({ label: "CIT Payable", value: displayCurrency(output.taxPayableKobo as string, output.taxPayable as number) });
      fields.push({ label: "Net Profit", value: displayCurrency(output.netProfitKobo as string, output.netProfit as number) });
      if (input.companySize) fields.push({ label: "Company Size", value: String(input.companySize) });
      break;
    case "VAT":
      fields.push({ label: "Taxable Sales", value: displayCurrency(input.taxableSalesKobo as string, input.taxableSales as number) });
      fields.push({ label: "VAT Payable", value: displayCurrency(output.vatPayableKobo as string, output.vatPayable as number) });
      fields.push({ label: "Total (incl. VAT)", value: displayCurrency(output.totalWithVatKobo as string, output.totalWithVat as number) });
      break;
    case "WHT":
      fields.push({ label: "Payment Amount", value: displayCurrency(input.paymentAmountKobo as string, input.paymentAmount as number) });
      fields.push({ label: "WHT Rate", value: `${input.whtRate || output.whtRate || 10}%` });
      fields.push({ label: "WHT Deductible", value: displayCurrency(output.whtPayableKobo as string, output.whtPayable as number) });
      fields.push({ label: "Net Payment", value: displayCurrency(output.netPaymentKobo as string, output.netPayment as number) });
      if (input.paymentType) fields.push({ label: "Payment Type", value: String(input.paymentType) });
      break;
    case "CGT":
      fields.push({ label: "Sale Proceeds", value: displayCurrency(input.proceedsKobo as string, input.proceeds as number) });
      fields.push({ label: "Cost of Acquisition", value: displayCurrency(input.costKobo as string, input.cost as number) });
      fields.push({ label: "Capital Gain", value: displayCurrency(output.capitalGainKobo as string, output.capitalGain as number) });
      fields.push({ label: "CGT Payable", value: displayCurrency(output.cgtPayableKobo as string, output.cgtPayable as number) });
      fields.push({ label: "Net Proceeds", value: displayCurrency(output.netProceedsKobo as string, output.netProceeds as number) });
      break;
    case "PIT":
    default:
      fields.push({ label: "Annual Income", value: displayCurrency(input.annualSalaryKobo as string, input.annualSalary as number) });
      fields.push({ label: "Total Tax", value: displayCurrency(output.totalTaxKobo as string, output.totalTax as number) });
      fields.push({ label: "Net Annual Income", value: displayCurrency(output.netAnnualIncomeKobo as string, output.netAnnualIncome as number) });
      fields.push({ label: "Monthly Net", value: displayCurrency(output.netMonthlyIncomeKobo as string, output.netMonthlyIncome as number) });
      break;
  }

  // Add effective rate if available
  const effectiveRate = output.effectiveRate as number | undefined;
  if (effectiveRate !== undefined) {
    fields.push({ label: "Effective Rate", value: `${effectiveRate.toFixed(2)}%` });
  }

  return fields;
}

function getTaxTypeFullName(taxType: string): string {
  switch (taxType) {
    case "CIT": return "Company Income Tax";
    case "VAT": return "Value Added Tax";
    case "WHT": return "Withholding Tax";
    case "CGT": return "Capital Gains Tax";
    case "PIT": return "Personal Income Tax";
    default: return taxType;
  }
}

/**
 * Generates and downloads a PDF summary of a tax calculation.
 */
export function exportCalculationPDF(calc: TaxCalculation): void {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPos = margin;

  // Colors
  const primaryColor: [number, number, number] = [6, 95, 70]; // hsl(160, 88%, 20%) approximated
  const textColor: [number, number, number] = [30, 30, 30];
  const mutedColor: [number, number, number] = [100, 100, 100];

  // Header
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 40, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("BUOYANCE", margin, 20);

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text("Tax Calculation Summary", margin, 30);

  yPos = 55;

  // Tax Type Title
  doc.setTextColor(...primaryColor);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(getTaxTypeFullName(calc.tax_type), margin, yPos);
  yPos += 10;

  // Metadata
  doc.setTextColor(...mutedColor);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated: ${format(new Date(), "MMMM d, yyyy 'at' h:mm a")}`, margin, yPos);
  yPos += 6;
  doc.text(`Calculation Date: ${format(new Date(calc.created_at), "MMMM d, yyyy 'at' h:mm a")}`, margin, yPos);
  yPos += 6;
  doc.text(`Rule Version: ${calc.rule_version || "v1"}`, margin, yPos);
  yPos += 15;

  // Divider
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 15;

  // Calculation Details
  doc.setTextColor(...textColor);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Calculation Details", margin, yPos);
  yPos += 10;

  const fields = getAmountFields(calc);

  doc.setFontSize(11);
  fields.forEach((field) => {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...mutedColor);
    doc.text(field.label + ":", margin, yPos);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(...textColor);
    doc.text(field.value, margin + 60, yPos);

    yPos += 8;
  });

  yPos += 10;

  // Divider
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 15;

  // Footer note
  doc.setTextColor(...mutedColor);
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.text(
    "This document is for informational purposes only and does not constitute tax advice.",
    margin,
    yPos
  );
  yPos += 5;
  doc.text(
    "Please consult a qualified tax professional for official tax filings.",
    margin,
    yPos
  );

  // Footer with page branding
  const footerY = doc.internal.pageSize.getHeight() - 15;
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
  doc.setTextColor(...mutedColor);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Buoyance - Nigerian Tax Compliance Platform", margin, footerY);
  doc.text("buoyance.com", pageWidth - margin - 35, footerY);

  // Download the file
  const fileName = `buoyance-${calc.tax_type.toLowerCase()}-calculation-${format(new Date(calc.created_at), "yyyy-MM-dd")}.pdf`;
  doc.save(fileName);
}
