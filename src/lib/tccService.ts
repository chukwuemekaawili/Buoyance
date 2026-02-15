// TCC (Tax Clearance Certificate) Readiness Service
// Manages jurisdiction-specific checklists and evidence pack generation

import { supabase } from '@/integrations/supabase/client';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export interface TCCRequirement {
    id: string;
    jurisdiction: string;
    requirement_type: string;
    description: string;
    is_mandatory: boolean;
    sort_order: number;
}

export interface ChecklistItem {
    id: string;
    user_id: string;
    jurisdiction: string;
    requirement_id: string;
    status: 'missing' | 'uploaded' | 'verified';
    document_url: string | null;
    verified_at: string | null;
    requirement?: TCCRequirement;
}

export interface ReadinessResult {
    score: number;
    total_required: number;
    completed: number;
    missing: ChecklistItem[];
    verified: ChecklistItem[];
    jurisdiction: string;
}

// Default TCC requirements by jurisdiction
export const DEFAULT_REQUIREMENTS: Array<Omit<TCCRequirement, 'id'>> = [
    // Federal (FIRS)
    { jurisdiction: 'federal', requirement_type: 'tax_returns_3yr', description: 'Tax returns for 3 preceding years', is_mandatory: true, sort_order: 1 },
    { jurisdiction: 'federal', requirement_type: 'evidence_of_payment', description: 'Evidence of tax payment (receipts/DINs)', is_mandatory: true, sort_order: 2 },
    { jurisdiction: 'federal', requirement_type: 'tin_certificate', description: 'Tax Identification Number (TIN) certificate', is_mandatory: true, sort_order: 3 },
    { jurisdiction: 'federal', requirement_type: 'cac_certificate', description: 'CAC Certificate of Incorporation (companies)', is_mandatory: false, sort_order: 4 },
    { jurisdiction: 'federal', requirement_type: 'financial_statements', description: 'Audited financial statements (companies)', is_mandatory: false, sort_order: 5 },
    { jurisdiction: 'federal', requirement_type: 'id_document', description: 'Valid ID (NIN, passport, driver\'s license)', is_mandatory: true, sort_order: 6 },

    // Lagos (LIRS)
    { jurisdiction: 'lagos', requirement_type: 'paye_receipts', description: 'PAYE payment receipts for 3 years', is_mandatory: true, sort_order: 1 },
    { jurisdiction: 'lagos', requirement_type: 'annual_returns', description: 'Annual tax returns for 3 years', is_mandatory: true, sort_order: 2 },
    { jurisdiction: 'lagos', requirement_type: 'employer_letter', description: 'Letter from employer (if employed)', is_mandatory: false, sort_order: 3 },
    { jurisdiction: 'lagos', requirement_type: 'tin_certificate', description: 'TIN certificate', is_mandatory: true, sort_order: 4 },
    { jurisdiction: 'lagos', requirement_type: 'utility_bill', description: 'Recent utility bill (proof of address)', is_mandatory: true, sort_order: 5 },
    { jurisdiction: 'lagos', requirement_type: 'passport_photo', description: 'Passport photographs (2)', is_mandatory: true, sort_order: 6 },

    // FCT (FIRS)
    { jurisdiction: 'fct', requirement_type: 'tax_returns_3yr', description: 'Tax returns for 3 years', is_mandatory: true, sort_order: 1 },
    { jurisdiction: 'fct', requirement_type: 'evidence_of_payment', description: 'Evidence of payment', is_mandatory: true, sort_order: 2 },
    { jurisdiction: 'fct', requirement_type: 'tin_certificate', description: 'TIN certificate', is_mandatory: true, sort_order: 3 },
    { jurisdiction: 'fct', requirement_type: 'id_document', description: 'Valid ID', is_mandatory: true, sort_order: 4 },
    { jurisdiction: 'fct', requirement_type: 'residence_proof', description: 'Proof of FCT residency', is_mandatory: true, sort_order: 5 },
];

export async function seedRequirements() {
    const { error } = await supabase
        .from('tcc_requirements')
        .upsert(
            DEFAULT_REQUIREMENTS.map(r => ({ ...r })),
            { onConflict: 'jurisdiction,requirement_type' }
        );

    if (error) console.error('Failed to seed requirements:', error);
}

export async function getRequirements(jurisdiction: string): Promise<TCCRequirement[]> {
    const { data, error } = await supabase
        .from('tcc_requirements')
        .select('*')
        .eq('jurisdiction', jurisdiction)
        .order('sort_order');

    if (error) throw new Error(`Failed to fetch requirements: ${error.message}`);

    // If no data in DB, return defaults
    if (!data || data.length === 0) {
        return DEFAULT_REQUIREMENTS
            .filter(r => r.jurisdiction === jurisdiction)
            .map((r, i) => ({ ...r, id: `default-${i}` }));
    }

    return data as TCCRequirement[];
}

export async function getChecklistItems(userId: string, jurisdiction: string): Promise<ChecklistItem[]> {
    const { data, error } = await supabase
        .from('tcc_checklist_items')
        .select('*, requirement:tcc_requirements(*)')
        .eq('user_id', userId)
        .eq('jurisdiction', jurisdiction);

    if (error) throw new Error(`Failed to fetch checklist: ${error.message}`);
    return (data || []) as ChecklistItem[];
}

export async function getReadinessScore(userId: string, jurisdiction: string): Promise<ReadinessResult> {
    const requirements = await getRequirements(jurisdiction);
    const items = await getChecklistItems(userId, jurisdiction);

    const mandatoryReqs = requirements.filter(r => r.is_mandatory);
    const completedItems = items.filter(i =>
        i.status === 'uploaded' || i.status === 'verified'
    );
    const missingItems = items.filter(i => i.status === 'missing');

    const completed = completedItems.length;
    const total = mandatoryReqs.length;
    const score = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
        score,
        total_required: total,
        completed,
        missing: missingItems,
        verified: completedItems,
        jurisdiction,
    };
}

export async function uploadDocument(
    userId: string,
    jurisdiction: string,
    requirementId: string,
    file: File
): Promise<ChecklistItem> {
    // Upload to storage
    const fileName = `tcc/${userId}/${jurisdiction}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage
        .from('evidence-packs')
        .upload(fileName, file);

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    const { data: urlData } = supabase.storage
        .from('evidence-packs')
        .getPublicUrl(fileName);

    // Upsert checklist item
    const { data, error } = await supabase
        .from('tcc_checklist_items')
        .upsert({
            user_id: userId,
            jurisdiction,
            requirement_id: requirementId,
            status: 'uploaded',
            document_url: urlData.publicUrl,
        }, { onConflict: 'user_id,jurisdiction,requirement_id' })
        .select()
        .single();

    if (error) throw new Error(`Failed to update checklist: ${error.message}`);
    return data as ChecklistItem;
}

export async function generateEvidencePack(userId: string, jurisdiction: string): Promise<void> {
    const items = await getChecklistItems(userId, jurisdiction);
    const uploadedItems = items.filter(i => i.document_url);

    if (uploadedItems.length === 0) {
        throw new Error('No documents uploaded yet. Upload at least one document to generate evidence pack.');
    }

    const zip = new JSZip();

    // Add cover page
    const coverPage = `
TCC Evidence Pack
=================
Jurisdiction: ${jurisdiction.toUpperCase()}
Generated: ${new Date().toLocaleDateString('en-NG')}
Documents: ${uploadedItems.length}

Contents:
${uploadedItems.map((item, i) => `${i + 1}. ${item.requirement?.description || item.requirement_id}`).join('\n')}
`.trim();

    zip.file('00_cover_page.txt', coverPage);

    // Download and add each document
    for (const item of uploadedItems) {
        if (item.document_url) {
            try {
                const response = await fetch(item.document_url);
                const blob = await response.blob();
                const ext = item.document_url.split('.').pop() || 'pdf';
                const name = (item.requirement?.requirement_type || item.requirement_id).replace(/[^a-zA-Z0-9]/g, '_');
                zip.file(`${name}.${ext}`, blob);
            } catch {
                console.error(`Failed to download: ${item.document_url}`);
            }
        }
    }

    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, `TCC_Evidence_Pack_${jurisdiction}_${new Date().toISOString().split('T')[0]}.zip`);
}

export function getJurisdictionLabel(jurisdiction: string): string {
    const labels: Record<string, string> = {
        federal: 'Federal (FIRS)',
        lagos: 'Lagos (LIRS)',
        fct: 'FCT (FIRS)',
        rivers: 'Rivers (RIRS)',
        ogun: 'Ogun (OGIRS)',
        oyo: 'Oyo State IRS',
    };
    return labels[jurisdiction] || jurisdiction;
}

export function getReadinessColor(score: number): string {
    if (score >= 80) return 'green';
    if (score >= 50) return 'yellow';
    return 'red';
}
