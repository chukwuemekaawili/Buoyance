// Audit & Dispute Workspace Service
// Manages FIRS audit responses, case files, and objection deadlines

import { supabase } from '@/integrations/supabase/client';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export type CaseStatus = 'open' | 'in_progress' | 'objection_filed' | 'resolved' | 'closed';
export type CaseType = 'tax_audit' | 'best_of_judgment' | 'query_letter' | 'refund_claim' | 'penalty_dispute';

export interface DisputeCase {
    id: string;
    user_id: string;
    case_type: CaseType;
    title: string;
    description: string;
    tax_year: number;
    tax_type: string;
    assessed_amount_kobo?: number;
    disputed_amount_kobo?: number;
    authority: string;
    reference_number?: string;
    received_date: string;
    objection_deadline?: string;
    status: CaseStatus;
    documents: CaseDocument[];
    notes: CaseNote[];
    created_at: string;
}

export interface CaseDocument {
    id: string;
    case_id: string;
    document_type: string;
    file_name: string;
    file_url: string;
    uploaded_at: string;
}

export interface CaseNote {
    id: string;
    case_id: string;
    content: string;
    author: string;
    created_at: string;
}

// Calculate objection deadline (30 days from notice date per FIRS rules)
export function calculateObjectionDeadline(noticeDate: string): string {
    const date = new Date(noticeDate);
    date.setDate(date.getDate() + 30);
    return date.toISOString().split('T')[0];
}

export function getDaysUntilDeadline(deadline: string): number {
    const now = new Date();
    const due = new Date(deadline);
    return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// Case management functions (use local state since table doesn't exist yet)
let localCases: DisputeCase[] = [];

export function createCase(input: {
    user_id: string;
    case_type: CaseType;
    title: string;
    description: string;
    tax_year: number;
    tax_type: string;
    assessed_amount_kobo?: number;
    disputed_amount_kobo?: number;
    authority: string;
    reference_number?: string;
    received_date: string;
}): DisputeCase {
    const newCase: DisputeCase = {
        id: crypto.randomUUID(),
        ...input,
        objection_deadline: calculateObjectionDeadline(input.received_date),
        status: 'open',
        documents: [],
        notes: [],
        created_at: new Date().toISOString(),
    };

    localCases.push(newCase);

    // Persist to localStorage
    try {
        localStorage.setItem('buoyance_dispute_cases', JSON.stringify(localCases));
    } catch { /* silently fail */ }

    return newCase;
}

export function getCases(userId: string): DisputeCase[] {
    // Try loading from localStorage
    try {
        const stored = localStorage.getItem('buoyance_dispute_cases');
        if (stored) localCases = JSON.parse(stored);
    } catch { /* use in-memory */ }

    return localCases.filter(c => c.user_id === userId);
}

export function addDocument(caseId: string, doc: Omit<CaseDocument, 'id' | 'case_id' | 'uploaded_at'>): CaseDocument {
    const newDoc: CaseDocument = {
        ...doc,
        id: crypto.randomUUID(),
        case_id: caseId,
        uploaded_at: new Date().toISOString(),
    };

    const caseItem = localCases.find(c => c.id === caseId);
    if (caseItem) {
        caseItem.documents.push(newDoc);
        try {
            localStorage.setItem('buoyance_dispute_cases', JSON.stringify(localCases));
        } catch { /* silently fail */ }
    }

    return newDoc;
}

export function addNote(caseId: string, content: string, author: string): CaseNote {
    const newNote: CaseNote = {
        id: crypto.randomUUID(),
        case_id: caseId,
        content,
        author,
        created_at: new Date().toISOString(),
    };

    const caseItem = localCases.find(c => c.id === caseId);
    if (caseItem) {
        caseItem.notes.push(newNote);
        try {
            localStorage.setItem('buoyance_dispute_cases', JSON.stringify(localCases));
        } catch { /* silently fail */ }
    }

    return newNote;
}

export function updateCaseStatus(caseId: string, status: CaseStatus) {
    const caseItem = localCases.find(c => c.id === caseId);
    if (caseItem) {
        caseItem.status = status;
        try {
            localStorage.setItem('buoyance_dispute_cases', JSON.stringify(localCases));
        } catch { /* silently fail */ }
    }
}

export async function generateDefensePack(caseItem: DisputeCase): Promise<void> {
    if (caseItem.documents.length === 0) {
        throw new Error('No documents uploaded. Add documents to the case before generating a defense pack.');
    }

    const zip = new JSZip();

    // Cover page
    const cover = `
DEFENSE PACK
============
Case: ${caseItem.title}
Type: ${getCaseTypeLabel(caseItem.case_type)}
Tax Year: ${caseItem.tax_year}
Authority: ${caseItem.authority}
Reference: ${caseItem.reference_number || 'N/A'}
Generated: ${new Date().toLocaleDateString('en-NG')}

Assessed Amount: ₦${((caseItem.assessed_amount_kobo || 0) / 100).toLocaleString()}
Disputed Amount: ₦${((caseItem.disputed_amount_kobo || 0) / 100).toLocaleString()}
Objection Deadline: ${caseItem.objection_deadline || 'N/A'}

Documents Included: ${caseItem.documents.length}
${caseItem.documents.map((d, i) => `${i + 1}. ${d.document_type}: ${d.file_name}`).join('\n')}

Notes:
${caseItem.notes.map(n => `[${n.created_at}] ${n.content}`).join('\n')}
`.trim();

    zip.file('00_Defense_Pack_Summary.txt', cover);

    // Download and add documents
    for (const doc of caseItem.documents) {
        try {
            const response = await fetch(doc.file_url);
            const blob = await response.blob();
            zip.file(doc.file_name, blob);
        } catch {
            console.error(`Failed to download: ${doc.file_url}`);
        }
    }

    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, `Defense_Pack_${caseItem.tax_year}_${caseItem.case_type}.zip`);
}

export function getCaseTypeLabel(type: CaseType): string {
    const labels: Record<CaseType, string> = {
        tax_audit: 'Tax Audit',
        best_of_judgment: 'Best of Judgment Assessment',
        query_letter: 'Query Letter',
        refund_claim: 'Refund Claim',
        penalty_dispute: 'Penalty Dispute',
    };
    return labels[type] || type;
}

export function getStatusColor(status: CaseStatus): string {
    const colors: Record<CaseStatus, string> = {
        open: 'red',
        in_progress: 'yellow',
        objection_filed: 'blue',
        resolved: 'green',
        closed: 'gray',
    };
    return colors[status] || 'gray';
}
