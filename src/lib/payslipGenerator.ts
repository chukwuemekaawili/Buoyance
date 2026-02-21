import jsPDF from "jspdf";
import { format } from "date-fns";
import { formatCurrency, type PayrollResult, getPayslipData } from "./payrollEngine";

export function generatePayslipPDF(result: PayrollResult, employerName: string = "Employer") {
    const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
    });

    const payslip = getPayslipData(result);
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let yPos = margin;

    // Colors
    const primaryColor: [number, number, number] = [15, 23, 42];
    const successColor: [number, number, number] = [22, 163, 74]; // Green-600
    const dangerColor: [number, number, number] = [220, 38, 38]; // Red-600
    const textColor: [number, number, number] = [30, 30, 30];
    const mutedColor: [number, number, number] = [100, 100, 100];

    // Header Box
    doc.setFillColor(248, 250, 252); // Slate-50
    doc.setDrawColor(226, 232, 240); // Slate-200
    doc.roundedRect(margin, yPos, pageWidth - (margin * 2), 35, 3, 3, "FD");

    // Title
    doc.setTextColor(...primaryColor);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("PAYSLIP", margin + 10, yPos + 15);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...mutedColor);
    doc.text("PAY PERIOD:", margin + 10, yPos + 25);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...textColor);

    // Format MM/YYYY or YYYY-MM into readable month
    const dateObj = new Date(result.month + "-01");
    const periodText = isNaN(dateObj.getTime()) ? result.month : format(dateObj, "MMMM yyyy");
    doc.text(periodText.toUpperCase(), margin + 35, yPos + 25);

    // Employer Info (Right aligned in box)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(employerName, pageWidth - margin - 10, yPos + 15, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...mutedColor);
    doc.text("Generated via Buoyance", pageWidth - margin - 10, yPos + 25, { align: "right" });

    yPos += 50;

    // Employee Details
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...primaryColor);
    doc.text("EMPLOYEE DETAILS", margin, yPos);

    yPos += 8;
    doc.setFontSize(10);
    doc.setTextColor(...textColor);
    doc.text("Name:", margin, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(result.employee_name, margin + 40, yPos);

    yPos += 7;
    doc.setFont("helvetica", "bold");
    doc.text("Location:", margin, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(result.work_state, margin + 40, yPos);

    yPos += 20;

    class TableColumn {
        constructor(
            public title: string,
            public x: number,
            public width: number
        ) { }
    }

    // Earnings & Deductions Layout (2 columns)
    const colWidth = (pageWidth - (margin * 2) - 10) / 2;
    const leftCol = margin;
    const rightCol = margin + colWidth + 10;

    let leftY = yPos;
    let rightY = yPos;

    // --- EARNINGS ---
    doc.setFillColor(...primaryColor);
    doc.rect(leftCol, leftY, colWidth, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text("EARNINGS", leftCol + 3, leftY + 5.5);
    doc.text("AMOUNT", leftCol + colWidth - 3, leftY + 5.5, { align: "right" });

    leftY += 12;
    doc.setTextColor(...textColor);

    payslip.earnings.forEach((item) => {
        doc.setFont("helvetica", "normal");
        doc.text(item.label, leftCol + 3, leftY);
        doc.text(formatCurrency(item.amount), leftCol + colWidth - 3, leftY, { align: "right" });
        leftY += 7;
    });

    leftY += 3;
    doc.setDrawColor(220, 220, 220);
    doc.line(leftCol, leftY, leftCol + colWidth, leftY);
    leftY += 6;
    doc.setFont("helvetica", "bold");
    doc.text("Gross Earnings:", leftCol + 3, leftY);
    doc.setTextColor(...successColor);
    doc.text(formatCurrency(payslip.gross), leftCol + colWidth - 3, leftY, { align: "right" });

    // --- DEDUCTIONS ---
    doc.setFillColor(...primaryColor);
    doc.rect(rightCol, rightY, colWidth, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text("DEDUCTIONS", rightCol + 3, rightY + 5.5);
    doc.text("AMOUNT", rightCol + colWidth - 3, rightY + 5.5, { align: "right" });

    rightY += 12;
    doc.setTextColor(...textColor);

    payslip.deductions.forEach((item) => {
        doc.setFont("helvetica", "normal");
        doc.text(item.label, rightCol + 3, rightY);
        doc.text(formatCurrency(item.amount), rightCol + colWidth - 3, rightY, { align: "right" });
        rightY += 7;
    });

    rightY += 3;
    doc.setDrawColor(220, 220, 220);
    doc.line(rightCol, rightY, rightCol + colWidth, rightY);
    rightY += 6;
    doc.setFont("helvetica", "bold");
    doc.text("Total Deductions:", rightCol + 3, rightY);
    doc.setTextColor(...dangerColor);
    doc.text(formatCurrency(payslip.total_deductions), rightCol + colWidth - 3, rightY, { align: "right" });

    yPos = Math.max(leftY, rightY) + 20;

    // --- NET PAY ---
    doc.setFillColor(240, 253, 244); // Green-50
    doc.setDrawColor(...successColor);
    doc.roundedRect(margin, yPos, pageWidth - (margin * 2), 20, 2, 2, "FD");

    doc.setTextColor(...primaryColor);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("NET PAY", margin + 10, yPos + 13);

    doc.setTextColor(...successColor);
    doc.setFontSize(18);
    doc.text(formatCurrency(payslip.net), pageWidth - margin - 10, yPos + 14, { align: "right" });

    // Footer notes
    const footerY = doc.internal.pageSize.getHeight() - 20;

    doc.setDrawColor(220, 220, 220);
    doc.line(margin, footerY, pageWidth - margin, footerY);

    doc.setTextColor(...mutedColor);
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.text("This is a system generated payslip. Tax calculations are based on Nigeria Tax Act 2025.", margin, footerY + 6);
    doc.text("Buoyance.ng", pageWidth - margin - 10, footerY + 6, { align: "right" });

    // Save the PDF
    const safeName = result.employee_name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    doc.save(`Payslip_${safeName}_${result.month}.pdf`);
}
