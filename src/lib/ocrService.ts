// OCR Service - Client-side text extraction using Tesseract.js
// Handles WHT certificates, receipts, and general document OCR

import Tesseract from 'tesseract.js';

export interface WHTCertificateData {
    issuer_name: string | null;
    issuer_tin: string | null;
    beneficiary_name: string | null;
    beneficiary_tin: string | null;
    amount_kobo: number;
    wht_rate: number | null;
    certificate_number: string | null;
    issue_date: string | null;
    tax_year: number | null;
    ocr_confidence: number;
    raw_text: string;
}

export interface ReceiptData {
    vendor_name: string | null;
    amount_kobo: number;
    date: string | null;
    description: string | null;
    vat_amount_kobo: number | null;
    ocr_confidence: number;
    raw_text: string;
}

export interface OCRProgress {
    status: string;
    progress: number;
}

// Parse Nigerian currency amounts
function parseNairaAmount(text: string): number {
    // Match patterns like ₦1,234,567.89 or N1234567.89 or 1,234,567
    const match = text.match(/[₦N]?\s*([\d,]+(?:\.\d{1,2})?)/);
    if (!match) return 0;
    const amount = parseFloat(match[1].replace(/,/g, ''));
    return Math.round(amount * 100); // Convert to kobo
}

// Extract TIN (10 or 11 digit number)
function extractTIN(text: string): string | null {
    const match = text.match(/(?:TIN|T\.I\.N|Tax\s*ID)[:\s]*(\d{10,11})/i);
    if (match) return match[1];
    // Fallback: look for standalone 10-11 digit numbers
    const fallback = text.match(/\b(\d{10,11})\b/);
    return fallback ? fallback[1] : null;
}

// Extract date in various formats
function extractDate(text: string): string | null {
    // DD/MM/YYYY or DD-MM-YYYY
    const dmy = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;

    // Month name patterns
    const monthNames = text.match(/(\d{1,2})\s*(January|February|March|April|May|June|July|August|September|October|November|December)[,\s]*(\d{4})/i);
    if (monthNames) {
        const months: Record<string, string> = {
            january: '01', february: '02', march: '03', april: '04',
            may: '05', june: '06', july: '07', august: '08',
            september: '09', october: '10', november: '11', december: '12'
        };
        const m = months[monthNames[2].toLowerCase()];
        return `${monthNames[3]}-${m}-${monthNames[1].padStart(2, '0')}`;
    }

    return null;
}

// Extract tax year
function extractTaxYear(text: string): number | null {
    const match = text.match(/(?:Tax\s*Year|Year\s*of\s*Assessment|Assessment\s*Year)[:\s]*(\d{4})/i);
    if (match) return parseInt(match[1]);
    // Fallback: look for year in date
    const yearMatch = text.match(/20\d{2}/);
    return yearMatch ? parseInt(yearMatch[0]) : null;
}

export async function extractWHTCertificate(
    imageSource: string | File,
    onProgress?: (p: OCRProgress) => void
): Promise<WHTCertificateData> {
    const { data } = await Tesseract.recognize(imageSource, 'eng', {
        logger: (m) => {
            if (onProgress && m.status === 'recognizing text') {
                onProgress({ status: 'Extracting text...', progress: m.progress });
            }
        },
    });

    const text = data.text;
    const confidence = data.confidence / 100;

    // Extract issuer info
    const issuerMatch = text.match(/(?:Issuer|Payer|Issuing\s*Company|Company)[:\s]*(.+?)(?:\n|TIN)/i);
    const issuer_name = issuerMatch ? issuerMatch[1].trim() : null;

    // Extract beneficiary info
    const beneficiaryMatch = text.match(/(?:Beneficiary|Payee|Recipient)[:\s]*(.+?)(?:\n|TIN)/i);
    const beneficiary_name = beneficiaryMatch ? beneficiaryMatch[1].trim() : null;

    // Extract amounts
    const amountMatch = text.match(/(?:Amount|WHT\s*Amount|Tax\s*Deducted|Deducted)[:\s]*[₦N]?\s*([\d,]+(?:\.\d{1,2})?)/i);
    const amount_kobo = amountMatch ? parseNairaAmount(amountMatch[0]) : 0;

    // Extract WHT rate
    const rateMatch = text.match(/(?:Rate|WHT\s*Rate)[:\s]*(\d+(?:\.\d+)?)\s*%/i);
    const wht_rate = rateMatch ? parseFloat(rateMatch[1]) / 100 : null;

    // Extract certificate number
    const certNoMatch = text.match(/(?:Certificate\s*No|Cert\.?\s*No|Serial\s*No|Ref)[.:\s]*([A-Z0-9\-\/]+)/i);
    const certificate_number = certNoMatch ? certNoMatch[1].trim() : null;

    // Extract TINs
    const tins = text.match(/\b\d{10,11}\b/g) || [];
    const issuer_tin = tins[0] || null;
    const beneficiary_tin = tins.length > 1 ? tins[1] : null;

    return {
        issuer_name,
        issuer_tin,
        beneficiary_name,
        beneficiary_tin,
        amount_kobo,
        wht_rate,
        certificate_number,
        issue_date: extractDate(text),
        tax_year: extractTaxYear(text),
        ocr_confidence: confidence,
        raw_text: text,
    };
}

export async function extractReceipt(
    imageSource: string | File,
    onProgress?: (p: OCRProgress) => void
): Promise<ReceiptData> {
    const { data } = await Tesseract.recognize(imageSource, 'eng', {
        logger: (m) => {
            if (onProgress && m.status === 'recognizing text') {
                onProgress({ status: 'Scanning receipt...', progress: m.progress });
            }
        },
    });

    const text = data.text;
    const confidence = data.confidence / 100;

    // Vendor name is often the first line
    const lines = text.split('\n').filter(l => l.trim().length > 0);
    const vendor_name = lines.length > 0 ? lines[0].trim() : null;

    // Find the largest amount (likely the total)
    const amounts = text.match(/[₦N]?\s*[\d,]+\.\d{2}/g) || [];
    const parsedAmounts = amounts.map(a => parseNairaAmount(a)).filter(a => a > 0);
    const amount_kobo = parsedAmounts.length > 0 ? Math.max(...parsedAmounts) : 0;

    // VAT amount
    const vatMatch = text.match(/(?:VAT|V\.A\.T)[:\s]*[₦N]?\s*([\d,]+(?:\.\d{2})?)/i);
    const vat_amount_kobo = vatMatch ? parseNairaAmount(vatMatch[0]) : null;

    return {
        vendor_name,
        amount_kobo,
        date: extractDate(text),
        description: lines.slice(1, 4).join(' ').trim() || null,
        vat_amount_kobo,
        ocr_confidence: confidence,
        raw_text: text,
    };
}

export async function extractGenericText(
    imageSource: string | File,
    onProgress?: (p: OCRProgress) => void
): Promise<{ text: string; confidence: number }> {
    const { data } = await Tesseract.recognize(imageSource, 'eng', {
        logger: (m) => {
            if (onProgress && m.status === 'recognizing text') {
                onProgress({ status: 'Processing...', progress: m.progress });
            }
        },
    });

    return { text: data.text, confidence: data.confidence / 100 };
}
