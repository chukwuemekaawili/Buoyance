// Smart Compliance Calendar Service
// Auto-generates tax deadlines based on user's tax types and jurisdictions

import { supabase } from '@/integrations/supabase/client';

export type TaskStatus = 'pending' | 'upcoming' | 'overdue' | 'completed' | 'filed';
export type TaxType = 'VAT' | 'PAYE' | 'CIT' | 'PIT' | 'WHT' | 'CGT' | 'EDT' | 'PENSION' | 'NHF' | 'NSITF' | 'NHIA';
export type Regulator = 'FIRS' | 'LIRS' | 'KWIRS' | 'KTIRS' | 'PENCOM' | 'NHF' | 'NSITF' | 'NHIA';

export interface ComplianceTask {
    id?: string;
    user_id: string;
    tax_type: TaxType;
    regulator: Regulator;
    due_date: string;
    status: TaskStatus;
    title: string;
    description: string;
    penalty_info?: string;
    filing_id?: string;
    payment_id?: string;
    priority: number;
}

// Nigerian tax deadline rules
const DEADLINE_RULES: Array<{
    tax_type: TaxType;
    regulator: Regulator;
    frequency: 'monthly' | 'annual' | 'quarterly';
    day_of_month: number;
    month_offset: number; // months after period end
    title_template: string;
    description: string;
    penalty_info: string;
    applies_to: string[];
}> = [
        // VAT - 21st of next month
        {
            tax_type: 'VAT',
            regulator: 'FIRS',
            frequency: 'monthly',
            day_of_month: 21,
            month_offset: 1,
            title_template: 'VAT Return ({period})',
            description: 'File and remit VAT to FIRS',
            penalty_info: '₦50,000 first month + ₦25,000/month + 5% p.a. interest',
            applies_to: ['business', 'sme', 'corporate'],
        },
        // PAYE - 10th of next month
        {
            tax_type: 'PAYE',
            regulator: 'LIRS',
            frequency: 'monthly',
            day_of_month: 10,
            month_offset: 1,
            title_template: 'PAYE Remittance ({period})',
            description: 'Remit employee PAYE to State IRS',
            penalty_info: '10% penalty + 5% p.a. interest',
            applies_to: ['business', 'sme', 'corporate'],
        },
        // WHT - 21st of next month
        {
            tax_type: 'WHT',
            regulator: 'FIRS',
            frequency: 'monthly',
            day_of_month: 21,
            month_offset: 1,
            title_template: 'WHT Remittance ({period})',
            description: 'Remit WHT deducted to FIRS',
            penalty_info: '₦25,000 penalty + interest',
            applies_to: ['business', 'sme', 'corporate'],
        },
        // CIT Annual - June 30
        {
            tax_type: 'CIT',
            regulator: 'FIRS',
            frequency: 'annual',
            day_of_month: 30,
            month_offset: 6,
            title_template: 'CIT Annual Return ({year})',
            description: 'File Company Income Tax return',
            penalty_info: '₦50,000 + ₦25,000/month overdue',
            applies_to: ['business', 'sme', 'corporate'],
        },
        // PIT Annual - March 31
        {
            tax_type: 'PIT',
            regulator: 'LIRS',
            frequency: 'annual',
            day_of_month: 31,
            month_offset: 3,
            title_template: 'Personal Income Tax Return ({year})',
            description: 'File annual PIT return to State IRS',
            penalty_info: '₦50,000 + ₦5,000/month + interest',
            applies_to: ['individual', 'freelancer'],
        },
        // Pension - 7 days after payment
        {
            tax_type: 'PENSION',
            regulator: 'PENCOM',
            frequency: 'monthly',
            day_of_month: 7,
            month_offset: 1,
            title_template: 'Pension Contribution ({period})',
            description: 'Remit pension contributions (employee 8% + employer 10%)',
            penalty_info: '2% per month penalty',
            applies_to: ['business', 'sme', 'corporate'],
        },
        // NHF - 30 days
        {
            tax_type: 'NHF',
            regulator: 'NHF',
            frequency: 'monthly',
            day_of_month: 30,
            month_offset: 1,
            title_template: 'NHF Contribution ({period})',
            description: 'Remit National Housing Fund contributions (2.5% of basic)',
            penalty_info: 'Penalty applies per NHF Act',
            applies_to: ['business', 'sme', 'corporate'],
        },
        // NSITF - 16th of next month
        {
            tax_type: 'NSITF',
            regulator: 'NSITF',
            frequency: 'monthly',
            day_of_month: 16,
            month_offset: 1,
            title_template: 'NSITF Contribution ({period})',
            description: 'Remit NSITF employee compensation (1% of payroll)',
            penalty_info: 'Penalty per ECA 2010',
            applies_to: ['business', 'sme', 'corporate'],
        },
    ];

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function generateTasksForYear(userId: string, year: number, userType: string = 'individual'): ComplianceTask[] {
    const tasks: ComplianceTask[] = [];

    for (const rule of DEADLINE_RULES) {
        if (!rule.applies_to.includes(userType)) continue;

        if (rule.frequency === 'monthly') {
            for (let month = 0; month < 12; month++) {
                const dueMonth = month + rule.month_offset;
                const dueYear = dueMonth >= 12 ? year + 1 : year;
                const adjustedMonth = dueMonth % 12;
                const dueDay = Math.min(rule.day_of_month, new Date(dueYear, adjustedMonth + 1, 0).getDate());

                const dueDate = new Date(dueYear, adjustedMonth, dueDay);
                const period = `${MONTH_NAMES[month]} ${year}`;

                tasks.push({
                    user_id: userId,
                    tax_type: rule.tax_type,
                    regulator: rule.regulator,
                    due_date: dueDate.toISOString().split('T')[0],
                    status: dueDate < new Date() ? 'overdue' : 'pending',
                    title: rule.title_template.replace('{period}', period),
                    description: rule.description,
                    penalty_info: rule.penalty_info,
                    priority: dueDate < new Date() ? 3 : 1,
                });
            }
        } else if (rule.frequency === 'annual') {
            const dueDate = new Date(year, rule.month_offset - 1, rule.day_of_month);
            tasks.push({
                user_id: userId,
                tax_type: rule.tax_type,
                regulator: rule.regulator,
                due_date: dueDate.toISOString().split('T')[0],
                status: dueDate < new Date() ? 'overdue' : 'pending',
                title: rule.title_template.replace('{year}', String(year - 1)),
                description: rule.description,
                penalty_info: rule.penalty_info,
                priority: 2,
            });
        }
    }

    return tasks.sort((a, b) => a.due_date.localeCompare(b.due_date));
}

export async function saveGeneratedTasks(tasks: ComplianceTask[]) {
    const { data, error } = await supabase
        .from('compliance_tasks')
        .insert(tasks.map(t => ({
            user_id: t.user_id,
            tax_type: t.tax_type,
            regulator: t.regulator,
            due_date: t.due_date,
            status: t.status,
            priority: t.priority,
        })));

    if (error) throw new Error(`Failed to save tasks: ${error.message}`);
    return data;
}

export async function getUpcomingTasks(userId: string, days: number = 30): Promise<ComplianceTask[]> {
    const today = new Date();
    const futureDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);

    const { data, error } = await supabase
        .from('compliance_tasks')
        .select('*')
        .eq('user_id', userId)
        .lte('due_date', futureDate.toISOString().split('T')[0])
        .neq('status', 'completed')
        .order('due_date', { ascending: true });

    if (error) throw new Error(`Failed to fetch tasks: ${error.message}`);
    return (data || []) as ComplianceTask[];
}

export async function getOverdueTasks(userId: string): Promise<ComplianceTask[]> {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
        .from('compliance_tasks')
        .select('*')
        .eq('user_id', userId)
        .lt('due_date', today)
        .neq('status', 'completed')
        .order('due_date', { ascending: true });

    if (error) throw new Error(`Failed to fetch tasks: ${error.message}`);
    return (data || []) as ComplianceTask[];
}

export async function completeTask(taskId: string, filingId?: string) {
    const updateData: Record<string, unknown> = {
        status: 'completed',
        completed_at: new Date().toISOString(),
    };

    if (filingId) updateData.filing_id = filingId;

    return supabase
        .from('compliance_tasks')
        .update(updateData)
        .eq('id', taskId);
}

export function getTaskPriorityColor(task: ComplianceTask): string {
    const now = new Date();
    const due = new Date(task.due_date);
    const daysUntilDue = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (task.status === 'completed') return 'green';
    if (daysUntilDue < 0) return 'red';
    if (daysUntilDue <= 3) return 'orange';
    if (daysUntilDue <= 7) return 'yellow';
    return 'blue';
}

export function getRegulatorLabel(regulator: Regulator): string {
    const labels: Record<Regulator, string> = {
        FIRS: 'Federal Inland Revenue Service',
        LIRS: 'Lagos State Internal Revenue Service',
        KWIRS: 'Kogi State Internal Revenue Service',
        KTIRS: 'Kaduna State Internal Revenue Service',
        PENCOM: 'National Pension Commission',
        NHF: 'Federal Mortgage Bank',
        NSITF: 'Nigeria Social Insurance Trust Fund',
        NHIA: 'National Health Insurance Authority',
    };
    return labels[regulator] || regulator;
}
