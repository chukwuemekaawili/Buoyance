import jsPDF from "jspdf";
import { format } from "date-fns";
import { formatKoboToNgn } from "./money";

export interface InvoiceData {
  invoice_number: string;
  client_name: string;
  client_tin?: string;
  issue_date: string;
  due_date?: string;
  subtotal_kobo: number;
  vat_rate: number;
  vat_amount_kobo: number;
  wht_rate: number;
  wht_amount_kobo: number;
  total_amount_kobo: number;
  line_items: Array<{
    description: string;
    quantity: number;
    unit_price_kobo: number;
    amount_kobo: number;
  }>;
}

export function generateInvoicePDF(invoice: InvoiceData) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPos = margin;

  // Colors matching Buoyance brand (hsl(222.2 47.4% 11.2%))
  const primaryColor: [number, number, number] = [15, 23, 42]; 
  const accentColor: [number, number, number] = [37, 99, 235]; // Blue-600
  const textColor: [number, number, number] = [30, 30, 30];
  const mutedColor: [number, number, number] = [100, 100, 100];

  // Header
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 40, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.text("INVOICE", margin, 25);

  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.text("BUOYANCE", pageWidth - margin - 35, 20);
  doc.setFontSize(9);
  doc.text("Nigerian Tax Compliance Platform", pageWidth - margin - 55, 26);
  doc.text("hello@buoyance.ng", pageWidth - margin - 35, 32);

  yPos = 55;

  // Invoice Details
  doc.setTextColor(...textColor);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("INVOICE NO:", margin, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(invoice.invoice_number, margin + 40, yPos);
  
  yPos += 7;
  doc.setFont("helvetica", "bold");
  doc.text("ISSUE DATE:", margin, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(format(new Date(invoice.issue_date), "MMM dd, yyyy"), margin + 40, yPos);
  
  if (invoice.due_date) {
    yPos += 7;
    doc.setFont("helvetica", "bold");
    doc.text("DUE DATE:", margin, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(format(new Date(invoice.due_date), "MMM dd, yyyy"), margin + 40, yPos);
  }

  // Client Details (Right side)
  let rightY = 55;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...mutedColor);
  doc.text("BILLED TO:", pageWidth - margin - 70, rightY);
  
  rightY += 7;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...textColor);
  doc.setFontSize(12);
  doc.text(invoice.client_name, pageWidth - margin - 70, rightY);
  
  if (invoice.client_tin) {
    rightY += 6;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...mutedColor);
    doc.text(`TIN: ${invoice.client_tin}`, pageWidth - margin - 70, rightY);
  }

  yPos = Math.max(yPos, rightY) + 20;

  // Table Header
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, yPos, pageWidth - (margin * 2), 10, "F");
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...textColor);
  doc.text("DESCRIPTION", margin + 5, yPos + 7);
  doc.text("QTY", pageWidth - margin - 70, yPos + 7, { align: "right" });
  doc.text("UNIT PRICE", pageWidth - margin - 40, yPos + 7, { align: "right" });
  doc.text("AMOUNT", pageWidth - margin - 5, yPos + 7, { align: "right" });

  yPos += 15;

  // Line Items
  doc.setFont("helvetica", "normal");
  invoice.line_items.forEach((item) => {
    // Description text wrapping
    const splitDesc = doc.splitTextToSize(item.description, pageWidth - margin - 90);
    
    doc.text(splitDesc, margin + 5, yPos);
    doc.text(item.quantity.toString(), pageWidth - margin - 70, yPos, { align: "right" });
    doc.text(formatKoboToNgn(BigInt(item.unit_price_kobo)), pageWidth - margin - 40, yPos, { align: "right" });
    doc.text(formatKoboToNgn(BigInt(item.amount_kobo)), pageWidth - margin - 5, yPos, { align: "right" });

    yPos += Math.max(8, splitDesc.length * 5);
  });

  yPos += 10;
  
  // Divider
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  // Totals Section
  const totalsX = pageWidth - margin - 80;
  
  doc.setFont("helvetica", "normal");
  doc.text("Subtotal:", totalsX, yPos);
  doc.text(formatKoboToNgn(BigInt(invoice.subtotal_kobo)), pageWidth - margin - 5, yPos, { align: "right" });
  yPos += 7;

  if (invoice.vat_amount_kobo > 0) {
    doc.text(`VAT (${invoice.vat_rate}%):`, totalsX, yPos);
    doc.text(`+${formatKoboToNgn(BigInt(invoice.vat_amount_kobo))}`, pageWidth - margin - 5, yPos, { align: "right" });
    yPos += 7;
  }

  if (invoice.wht_amount_kobo > 0) {
    doc.text(`WHT Deduction (${invoice.wht_rate}%):`, totalsX, yPos);
    doc.setTextColor(220, 38, 38); // Red
    doc.text(`-${formatKoboToNgn(BigInt(invoice.wht_amount_kobo))}`, pageWidth - margin - 5, yPos, { align: "right" });
    doc.setTextColor(...textColor);
    yPos += 7;
  }

  yPos += 3;
  doc.setDrawColor(220, 220, 220);
  doc.line(totalsX, yPos, pageWidth - margin, yPos);
  yPos += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("TOTAL DUE:", totalsX, yPos);
  doc.text(formatKoboToNgn(BigInt(invoice.total_amount_kobo)), pageWidth - margin - 5, yPos, { align: "right" });

  // Footer notes
  const footerY = doc.internal.pageSize.getHeight() - 30;
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...mutedColor);
  doc.text("Payment Terms:", margin, footerY - 10);
  doc.text("Please make payment within the specified due date.", margin, footerY - 5);
  
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, footerY, pageWidth - margin, footerY);
  
  doc.setFontSize(8);
  doc.text("Generated via Buoyance Tax Platform - buoyance.ng", margin, footerY + 7);

  // Save the PDF
  const safeClientName = invoice.client_name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  doc.save(`Invoice_${invoice.invoice_number}_${safeClientName}.pdf`);
}
