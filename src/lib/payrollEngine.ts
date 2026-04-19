// Basic Payroll Engine (Single Employee)
// Calculates PAYE, pension, NHF, NHIA, and net salary

export type PayrollScheme = "organized_private_sector_basic_salary_assumed";
export type NHIABasisMode = "organized_private_sector_basic_salary";

export const DEFAULT_PAYROLL_SCHEME: PayrollScheme = "organized_private_sector_basic_salary_assumed";
export const DEFAULT_NHIA_BASIS_MODE: NHIABasisMode = "organized_private_sector_basic_salary";
export const NHIA_AUTO_CALCULATION_WARNING =
    "NHIA auto-calculation currently assumes organized private sector basic-salary treatment and may require configuration.";

export interface PayrollInput {
    employee_name: string;
    monthly_gross_kobo: bigint;
    annual_rent_paid_kobo?: bigint;
    work_state?: string;
    month: string; // YYYY-MM
    payroll_scheme?: PayrollScheme;
    nhia_basis_mode?: NHIABasisMode;
}

export interface PayrollResult {
    employee_name: string;
    month: string;

    earnings: {
        basic_salary_kobo: bigint;
        housing_allowance_kobo: bigint;
        transport_allowance_kobo: bigint;
        other_allowances_kobo: bigint;
        gross_salary_kobo: bigint;
    };

    deductions: {
        paye_kobo: bigint;
        pension_employee_kobo: bigint;
        nhf_kobo: bigint;
        nhia_employee_kobo: bigint;
        total_deductions_kobo: bigint;
    };

    net_salary_kobo: bigint;

    employer_contributions: {
        pension_employer_kobo: bigint;
        nsitf_kobo: bigint;
        nhia_employer_kobo: bigint;
        total_employer_kobo: bigint;
    };

    total_cost_to_employer_kobo: bigint;

    remittance_schedule: Array<{
        item: string;
        amount_kobo: bigint;
        remit_to: string;
        deadline: string;
        note: string;
    }>;
}

export interface BatchPayrollResult {
    month: string;
    total_employees: number;
    totals: {
        gross_salary_kobo: bigint;
        net_salary_kobo: bigint;
        paye_kobo: bigint;
        pension_employee_kobo: bigint;
        pension_employer_kobo: bigint;
        nhf_kobo: bigint;
        nhia_employee_kobo: bigint;
        nhia_employer_kobo: bigint;
        nsitf_kobo: bigint;
        total_cost_to_employer_kobo: bigint;
    };
    employees: PayrollResult[];
    company_remittance_schedule: Array<{
        item: string;
        amount_kobo: bigint;
        remit_to: string;
        deadline: string;
        note: string;
    }>;
}

import { 
    calculateGlobalPIT, 
    calculateRentRelief, 
    PAYROLL_RATES 
} from './taxEngine';

function resolvePayrollConfiguration(input?: Pick<PayrollInput, 'payroll_scheme' | 'nhia_basis_mode'>) {
    return {
        payroll_scheme: input?.payroll_scheme ?? DEFAULT_PAYROLL_SCHEME,
        nhia_basis_mode: input?.nhia_basis_mode ?? DEFAULT_NHIA_BASIS_MODE,
    };
}

function calculateNhiaEmployeeDeduction(basicSalaryKobo: bigint, nhiaBasisMode: NHIABasisMode): bigint {
    switch (nhiaBasisMode) {
        case "organized_private_sector_basic_salary":
        default:
            // TODO(config): Add scheme-specific NHIA calculation branches before supporting non-OPS payroll cases.
            return (basicSalaryKobo * PAYROLL_RATES.NHIA_EMPLOYEE) / 10000n;
    }
}

function calculateNhiaEmployerContribution(basicSalaryKobo: bigint, nhiaBasisMode: NHIABasisMode): bigint {
    switch (nhiaBasisMode) {
        case "organized_private_sector_basic_salary":
        default:
            // TODO(config): Current NHIA employer contribution path assumes OPS basic-salary treatment only.
            return (basicSalaryKobo * PAYROLL_RATES.NHIA_EMPLOYER) / 100n;
    }
}

function calculatePAYE(
    annualGrossKobo: bigint,
    annualRentKobo: bigint = 0n,
    nhiaBasisMode: NHIABasisMode = DEFAULT_NHIA_BASIS_MODE
): bigint {
    // 3. Rent Relief (if any)
    const rentRelief = calculateRentRelief(annualRentKobo, annualGrossKobo);

    // Pension deduction (8% employee)
    const pensionDeduction = (annualGrossKobo * PAYROLL_RATES.PENSION_EMPLOYEE) / 100n;

    // NHF deduction (2.5% of basic salary)
    const basicSalary = (annualGrossKobo * 30n) / 100n;
    const nhfDeduction = (basicSalary * PAYROLL_RATES.NHF) / 1000n;

    // TODO(config): This auto-calculation is intentionally limited to the OPS basic-salary assumption for now.
    const nhiaDeduction = calculateNhiaEmployeeDeduction(basicSalary, nhiaBasisMode);

    // Taxable income (gross minus all allowable deductions)
    const taxableIncome = annualGrossKobo - rentRelief - pensionDeduction - nhfDeduction - nhiaDeduction;

    // Pass gross for minimum tax floor (1% of gross where band calc yields less)
    return calculateGlobalPIT(taxableIncome, annualGrossKobo);
}

export function calculateBasicPayroll(input: PayrollInput): PayrollResult {
    const gross = input.monthly_gross_kobo;
    const annualGross = gross * 12n;
    const annualRent = input.annual_rent_paid_kobo || 0n;
    const payrollConfig = resolvePayrollConfiguration(input);

    // Salary breakdown (typical Nigerian structure)
    const basic = (gross * 30n) / 100n;
    const housing = (gross * 35n) / 100n;
    const transport = (gross * 15n) / 100n;
    const others = gross - basic - housing - transport;

    // Employee deductions
    const annualPAYE = calculatePAYE(annualGross, annualRent, payrollConfig.nhia_basis_mode);
    const monthlyPAYE = annualPAYE / 12n;
    const pensionEmployee = (gross * PAYROLL_RATES.PENSION_EMPLOYEE) / 100n;
    const nhf = (basic * PAYROLL_RATES.NHF) / 1000n;
    // TODO(config): Do not treat this NHIA path as universal until payroll_scheme / nhia_basis_mode is configurable in-product.
    const nhiaEmployee = calculateNhiaEmployeeDeduction(basic, payrollConfig.nhia_basis_mode);
    const totalDeductions = monthlyPAYE + pensionEmployee + nhf + nhiaEmployee;

    const netSalary = gross - totalDeductions;

    // Employer contributions
    const pensionEmployer = (gross * PAYROLL_RATES.PENSION_EMPLOYER) / 100n;
    const nsitf = (gross * PAYROLL_RATES.NSITF) / 100n;
    // TODO(config): This employer NHIA contribution also assumes OPS basic-salary treatment.
    const nhiaEmployer = calculateNhiaEmployerContribution(basic, payrollConfig.nhia_basis_mode);
    const totalEmployer = pensionEmployer + nsitf + nhiaEmployer;

    const workState = input.work_state || 'Not Specified';

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
                note: 'Assumed OPS basic-salary treatment; may require configuration',
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

export function formatCurrency(kobo: bigint | number): string {
    const koboNum = typeof kobo === 'bigint' ? Number(kobo) : kobo;
    return `₦${(koboNum / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
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
            { label: 'NHIA (Auto, assumed OPS basic salary)', amount: result.deductions.nhia_employee_kobo },
        ],
        gross: result.earnings.gross_salary_kobo,
        total_deductions: result.deductions.total_deductions_kobo,
        net: result.net_salary_kobo,
    };
}

export function calculateBatchPayroll(inputs: PayrollInput[], month: string): BatchPayrollResult {
    const results = inputs.map(calculateBasicPayroll);
    const batchPayrollConfig = resolvePayrollConfiguration(inputs[0]);

    let gross_salary_kobo = 0n;
    let net_salary_kobo = 0n;
    let paye_kobo = 0n;
    let pension_employee_kobo = 0n;
    let pension_employer_kobo = 0n;
    let nhf_kobo = 0n;
    let nhia_employee_kobo = 0n;
    let nhia_employer_kobo = 0n;
    let nsitf_kobo = 0n;
    let total_cost_to_employer_kobo = 0n;

    for (const res of results) {
        gross_salary_kobo += res.earnings.gross_salary_kobo;
        net_salary_kobo += res.net_salary_kobo;
        paye_kobo += res.deductions.paye_kobo;
        pension_employee_kobo += res.deductions.pension_employee_kobo;
        pension_employer_kobo += res.employer_contributions.pension_employer_kobo;
        nhf_kobo += res.deductions.nhf_kobo;
        nhia_employee_kobo += res.deductions.nhia_employee_kobo;
        nhia_employer_kobo += res.employer_contributions.nhia_employer_kobo;
        nsitf_kobo += res.employer_contributions.nsitf_kobo;
        total_cost_to_employer_kobo += res.total_cost_to_employer_kobo;
    }

    // Aggregate PAYE by state
    const groupedPayeByState: Record<string, bigint> = {};
    for (const res of results) {
        const state = inputs.find(i => i.employee_name === res.employee_name)?.work_state || 'Not Specified';
        groupedPayeByState[state] = (groupedPayeByState[state] || 0n) + res.deductions.paye_kobo;
    }

    const company_remittance_schedule = [];

    for (const [state, amount] of Object.entries(groupedPayeByState)) {
        if (amount > 0n) {
            company_remittance_schedule.push({
                item: `PAYE - ${state} State`,
                amount_kobo: amount,
                remit_to: `${state} State Internal Revenue Service`,
                deadline: '10th of following month',
                note: 'State tax',
            });
        }
    }

    if (pension_employee_kobo + pension_employer_kobo > 0n) {
        company_remittance_schedule.push({
            item: 'Pension (Employee + Employer)',
            amount_kobo: pension_employee_kobo + pension_employer_kobo,
            remit_to: 'PFA (Pension Fund Administrator)',
            deadline: '7 days after salary payment',
            note: 'Employee 8% + Employer 10%',
        });
    }

    if (nhf_kobo > 0n) {
        company_remittance_schedule.push({
            item: 'NHF',
            amount_kobo: nhf_kobo,
            remit_to: 'Federal Mortgage Bank of Nigeria',
            deadline: 'Within 30 days',
            note: '2.5% of basic salary',
        });
    }

    if (nhia_employee_kobo + nhia_employer_kobo > 0n) {
        company_remittance_schedule.push({
            item: 'NHIA (Employee + Employer)',
            amount_kobo: nhia_employee_kobo + nhia_employer_kobo,
            remit_to: 'National Health Insurance Authority',
            deadline: '10th of following month',
            note: `Assumed OPS basic-salary treatment (${batchPayrollConfig.payroll_scheme}); may require configuration`,
        });
    }

    if (nsitf_kobo > 0n) {
        company_remittance_schedule.push({
            item: 'NSITF',
            amount_kobo: nsitf_kobo,
            remit_to: 'Nigeria Social Insurance Trust Fund',
            deadline: '16th of following month',
            note: '1% of payroll (employer only)',
        });
    }

    return {
        month,
        total_employees: results.length,
        totals: {
            gross_salary_kobo,
            net_salary_kobo,
            paye_kobo,
            pension_employee_kobo,
            pension_employer_kobo,
            nhf_kobo,
            nhia_employee_kobo,
            nhia_employer_kobo,
            nsitf_kobo,
            total_cost_to_employer_kobo
        },
        employees: results,
        company_remittance_schedule,
    };
}
