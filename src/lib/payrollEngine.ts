// Basic Payroll Engine (Single Employee)
// Calculates PAYE, pension, NHF, NHIA, and net salary

export interface PayrollInput {
    employee_name: string;
    monthly_gross_kobo: number;
    annual_rent_paid_kobo?: number;
    work_state?: string;
    month: string; // YYYY-MM
}

export interface PayrollResult {
    employee_name: string;
    month: string;

    earnings: {
        basic_salary_kobo: number;
        housing_allowance_kobo: number;
        transport_allowance_kobo: number;
        other_allowances_kobo: number;
        gross_salary_kobo: number;
    };

    deductions: {
        paye_kobo: number;
        pension_employee_kobo: number;
        nhf_kobo: number;
        nhia_employee_kobo: number;
        total_deductions_kobo: number;
    };

    net_salary_kobo: number;

    employer_contributions: {
        pension_employer_kobo: number;
        nsitf_kobo: number;
        nhia_employer_kobo: number;
        total_employer_kobo: number;
    };

    total_cost_to_employer_kobo: number;

    remittance_schedule: Array<{
        item: string;
        amount_kobo: number;
        remit_to: string;
        deadline: string;
        note: string;
    }>;
}

// NTA 2025 PAYE brackets
const PAYE_BRACKETS = [
    { min: 0, max: 80000000, rate: 0.00 },         // First ₦800K exempt
    { min: 80000000, max: 300000000, rate: 0.15 },  // ₦800K-₦3M: 15%
    { min: 300000000, max: 1200000000, rate: 0.18 }, // ₦3M-₦12M: 18%
    { min: 1200000000, max: 2500000000, rate: 0.21 }, // ₦12M-₦25M: 21%
    { min: 2500000000, max: 5000000000, rate: 0.23 }, // ₦25M-₦50M: 23%
    { min: 5000000000, max: Infinity, rate: 0.25 },   // Above ₦50M: 25%
];

function calculatePAYE(annualGrossKobo: number, annualRentKobo: number = 0): number {
    // Rent Relief (replaces abolished CRA)
    const rentRelief = Math.min(annualRentKobo * 0.20, 50000000); // Max ₦500K

    // Pension deduction (8% employee)
    const pensionDeduction = Math.round(annualGrossKobo * 0.08);

    // NHF deduction (2.5% of basic)
    const basicSalary = Math.round(annualGrossKobo * 0.30);
    const nhfDeduction = Math.round(basicSalary * 0.025);

    // Taxable income
    const taxableIncome = annualGrossKobo - rentRelief - pensionDeduction - nhfDeduction;
    if (taxableIncome <= 0) return 0;

    // Apply progressive tax brackets
    let tax = 0;
    let remaining = taxableIncome;

    for (const bracket of PAYE_BRACKETS) {
        if (remaining <= 0) break;
        const bracketSize = bracket.max - bracket.min;
        const taxableInBracket = Math.min(remaining, bracketSize);
        tax += Math.round(taxableInBracket * bracket.rate);
        remaining -= taxableInBracket;
    }

    return tax;
}

export function calculateBasicPayroll(input: PayrollInput): PayrollResult {
    const gross = input.monthly_gross_kobo;
    const annualGross = gross * 12;
    const annualRent = input.annual_rent_paid_kobo || 0;

    // Salary breakdown (typical Nigerian structure)
    const basic = Math.round(gross * 0.30);
    const housing = Math.round(gross * 0.35);
    const transport = Math.round(gross * 0.15);
    const others = gross - basic - housing - transport;

    // Employee deductions
    const annualPAYE = calculatePAYE(annualGross, annualRent);
    const monthlyPAYE = Math.round(annualPAYE / 12);
    const pensionEmployee = Math.round(gross * 0.08);
    const nhf = Math.round(basic * 0.025);
    const nhiaEmployee = Math.round(gross * 0.05);
    const totalDeductions = monthlyPAYE + pensionEmployee + nhf + nhiaEmployee;

    const netSalary = gross - totalDeductions;

    // Employer contributions
    const pensionEmployer = Math.round(gross * 0.10);
    const nsitf = Math.round(gross * 0.01);
    const nhiaEmployer = Math.round(gross * 0.10);
    const totalEmployer = pensionEmployer + nsitf + nhiaEmployer;

    const workState = input.work_state || 'Lagos';

    return {
        employee_name: input.employee_name,
        month: input.month,

        earnings: {
            basic_salary_kobo: basic,
            housing_allowance_kobo: housing,
            transport_allowance_kobo: transport,
            other_allowances_kobo: others,
            gross_salary_kobo: gross,
        },

        deductions: {
            paye_kobo: monthlyPAYE,
            pension_employee_kobo: pensionEmployee,
            nhf_kobo: nhf,
            nhia_employee_kobo: nhiaEmployee,
            total_deductions_kobo: totalDeductions,
        },

        net_salary_kobo: netSalary,

        employer_contributions: {
            pension_employer_kobo: pensionEmployer,
            nsitf_kobo: nsitf,
            nhia_employer_kobo: nhiaEmployer,
            total_employer_kobo: totalEmployer,
        },

        total_cost_to_employer_kobo: gross + totalEmployer,

        remittance_schedule: [
            {
                item: 'PAYE',
                amount_kobo: monthlyPAYE,
                remit_to: `${workState} State Internal Revenue Service`,
                deadline: '10th of following month',
                note: 'State tax',
            },
            {
                item: 'Pension (Employee + Employer)',
                amount_kobo: pensionEmployee + pensionEmployer,
                remit_to: 'PFA (Pension Fund Administrator)',
                deadline: '7 days after salary payment',
                note: 'Employee 8% + Employer 10%',
            },
            {
                item: 'NHF',
                amount_kobo: nhf,
                remit_to: 'Federal Mortgage Bank of Nigeria',
                deadline: 'Within 30 days',
                note: '2.5% of basic salary',
            },
            {
                item: 'NHIA (Employee + Employer)',
                amount_kobo: nhiaEmployee + nhiaEmployer,
                remit_to: 'National Health Insurance Authority',
                deadline: '10th of following month',
                note: 'Employee 5% + Employer 10%',
            },
            {
                item: 'NSITF',
                amount_kobo: nsitf,
                remit_to: 'Nigeria Social Insurance Trust Fund',
                deadline: '16th of following month',
                note: '1% of payroll (employer only)',
            },
        ],
    };
}

export function formatCurrency(kobo: number): string {
    return `₦${(kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
}

export function getPayslipData(result: PayrollResult) {
    return {
        title: `Payslip - ${result.month}`,
        employee: result.employee_name,
        period: result.month,
        earnings: [
            { label: 'Basic Salary', amount: result.earnings.basic_salary_kobo },
            { label: 'Housing Allowance', amount: result.earnings.housing_allowance_kobo },
            { label: 'Transport Allowance', amount: result.earnings.transport_allowance_kobo },
            { label: 'Other Allowances', amount: result.earnings.other_allowances_kobo },
        ],
        deductions: [
            { label: 'PAYE Tax', amount: result.deductions.paye_kobo },
            { label: 'Pension (8%)', amount: result.deductions.pension_employee_kobo },
            { label: 'NHF (2.5%)', amount: result.deductions.nhf_kobo },
            { label: 'NHIA (5%)', amount: result.deductions.nhia_employee_kobo },
        ],
        gross: result.earnings.gross_salary_kobo,
        total_deductions: result.deductions.total_deductions_kobo,
        net: result.net_salary_kobo,
    };
}
