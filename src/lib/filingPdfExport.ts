/**
 * Filing PDF Export
 * Generates official tax filing documents.
 */

import jsPDF from "jspdf";
import { formatKoboToNgn, stringToKobo } from "@/lib/money";
import { format } from "date-fns";
import type { Filing } from "@/lib/filingService";

/**
 * Display helper that handles KOBO string values.
 */
function displayCurrency(koboStr: string | undefined): string {
  if (koboStr) {
    return formatKoboToNgn(stringToKobo(koboStr));
  }
  return "₦0";
}

/**
 * Get full tax type name.
 */
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
 * Get filing amount fields based on tax type.
 */
function getFilingFields(filing: Filing): Array<{ label: string; value: string }> {
  const input = filing.input_json;
  const output = filing.output_json;
  const fields: Array<{ label: string; value: string }> = [];

  switch (filing.tax_type) {
    case "CIT":
      fields.push({ label: "Taxable Profit", value: displayCurrency(input.taxableProfitKobo as string) });
      fields.push({ label: "CIT Payable", value: displayCurrency(output.taxPayableKobo as string) });
      if (input.companySize) fields.push({ label: "Company Size", value: String(input.companySize) });
      break;
    case "VAT":
      fields.push({ label: "Taxable Sales", value: displayCurrency(input.taxableSalesKobo as string) });
      fields.push({ label: "VAT Payable", value: displayCurrency(output.vatPayableKobo as string) });
      break;
    case "WHT":
      fields.push({ label: "Payment Amount", value: displayCurrency(input.paymentAmountKobo as string) });
      fields.push({ label: "WHT Rate", value: `${input.whtRate || 10}%` });
      fields.push({ label: "WHT Deductible", value: displayCurrency(output.whtPayableKobo as string) });
      break;
    case "CGT":
      fields.push({ label: "Sale Proceeds", value: displayCurrency(input.proceedsKobo as string) });
      fields.push({ label: "Cost of Acquisition", value: displayCurrency(input.costKobo as string) });
      fields.push({ label: "Capital Gain", value: displayCurrency(output.capitalGainKobo as string) });
      fields.push({ label: "CGT Payable", value: displayCurrency(output.cgtPayableKobo as string) });
      break;
    case "PIT":
    default:
      fields.push({ label: "Annual Income", value: displayCurrency(input.annualSalaryKobo as string) });
      fields.push({ label: "Total Tax", value: displayCurrency(output.totalTaxKobo as string) });
      break;
  }

  // Add effective rate if available
  const effectiveRate = output.effectiveRate as number | undefined;
  if (effectiveRate !== undefined) {
    fields.push({ label: "Effective Rate", value: `${effectiveRate.toFixed(2)}%` });
  }

  return fields;
}

/**
 * Get status label styling.
 */
function getStatusLabel(status: string): string {
  switch (status) {
    case "draft": return "DRAFT";
    case "submitted": return "SUBMITTED";
    case "accepted": return "ACCEPTED";
    case "rejected": return "REJECTED";
    case "cancelled": return "CANCELLED";
    default: return status.toUpperCase();
  }
}

/**
 * Generate a filing PDF document.
 * Returns a Blob for upload to storage.
 */
export function generateFilingPDF(filing: Filing): Blob {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPos = margin;

  // Colors
  const primaryColor: [number, number, number] = [6, 95, 70];
  const textColor: [number, number, number] = [30, 30, 30];
  const mutedColor: [number, number, number] = [100, 100, 100];
  const successColor: [number, number, number] = [22, 163, 74];

  // Header
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 45, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("BUOYANCE", margin, 22);

  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.text("Tax Filing Document", margin, 34);

  yPos = 60;

  // Tax Type Title
  doc.setTextColor(...primaryColor);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(getTaxTypeFullName(filing.tax_type), margin, yPos);
  yPos += 12;

  // Status badge
  const statusLabel = getStatusLabel(filing.status);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  if (filing.status === "submitted" || filing.status === "accepted") {
    doc.setTextColor(...successColor);
  } else {
    doc.setTextColor(...mutedColor);
  }
  doc.text(`STATUS: ${statusLabel}`, margin, yPos);
  yPos += 12;

  // Filing Period
  doc.setTextColor(...textColor);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Filing Period", margin, yPos);
  yPos += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const periodStart = format(new Date(filing.period_start), "MMMM d, yyyy");
  const periodEnd = format(new Date(filing.period_end), "MMMM d, yyyy");
  doc.text(`${periodStart} - ${periodEnd}`, margin, yPos);
  yPos += 12;

  // Metadata
  doc.setTextColor(...mutedColor);
  doc.setFontSize(10);
  doc.text(`Filing ID: ${filing.id}`, margin, yPos);
  yPos += 5;
  doc.text(`Rule Version: ${filing.rule_version || "N/A"}`, margin, yPos);
  yPos += 5;
  if (filing.submitted_at) {
    doc.text(`Submitted: ${format(new Date(filing.submitted_at), "MMMM d, yyyy 'at' h:mm a")}`, margin, yPos);
    yPos += 5;
  }
  doc.text(`Generated: ${format(new Date(), "MMMM d, yyyy 'at' h:mm a")}`, margin, yPos);
  yPos += 15;

  // Divider
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 15;

  // Filing Details
  doc.setTextColor(...textColor);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Filing Details", margin, yPos);
  yPos += 10;

  const fields = getFilingFields(filing);

  doc.setFontSize(11);
  fields.forEach((field) => {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...mutedColor);
    doc.text(field.label + ":", margin, yPos);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(...textColor);
    doc.text(field.value, margin + 65, yPos);

    yPos += 8;
  });

  yPos += 15;

  // Tax Amount Due Box
  const taxDue = filing.output_json.taxPayableKobo ||
    filing.output_json.vatPayableKobo ||
    filing.output_json.whtPayableKobo ||
    filing.output_json.cgtPayableKobo ||
    filing.output_json.totalTaxKobo;

  if (taxDue) {
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(margin, yPos, pageWidth - margin * 2, 25, 3, 3, "F");

    doc.setTextColor(...primaryColor);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL TAX DUE", margin + 10, yPos + 10);

    doc.setFontSize(16);
    doc.text(displayCurrency(taxDue as string), margin + 10, yPos + 20);

    yPos += 35;
  }

  // Divider
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 15;

  // Disclaimer
  doc.setTextColor(...mutedColor);
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.text(
    "This document is generated by Buoyance for tax filing purposes.",
    margin,
    yPos
  );
  yPos += 5;
  doc.text(
    "Please verify all details before submission to relevant tax authorities.",
    margin,
    yPos
  );
  yPos += 5;
  doc.text(
    "This does not constitute official acceptance by the Federal Inland Revenue Service (FIRS).",
    margin,
    yPos
  );

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 15;
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
  doc.setTextColor(...mutedColor);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Buoyance - Nigerian Tax Compliance Platform", margin, footerY);
  doc.text("buoyance.com", pageWidth - margin - 35, footerY);

  // Return as Blob
  return doc.output("blob");
}

/**
 * Download filing PDF directly.
 */
export function downloadFilingPDF(filing: Filing): void {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // Generate the same PDF content
  const blob = generateFilingPDF(filing);

  // Create download
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `buoyance-${filing.tax_type.toLowerCase()}-filing-${format(new Date(filing.created_at), "yyyy-MM-dd")}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
