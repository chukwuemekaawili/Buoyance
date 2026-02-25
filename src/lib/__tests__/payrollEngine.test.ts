import { describe, it, expect } from 'vitest';
import { calculateBasicPayroll, calculateBatchPayroll, type PayrollInput } from '../payrollEngine';

describe('Payroll Engine (NTA 2025 COMPLIANT)', () => {
    describe('calculateBasicPayroll', () => {
        it('should exempt low income earners (N70k monthly / N840k annual) from PAYE entirely', () => {
            const input: PayrollInput = {
                employee_name: 'Minimum Wage Earner',
                monthly_gross_kobo: 7000000n, // N70,000
                month: '2026-03'
            };

            const result = calculateBasicPayroll(input);
            expect(result.deductions.paye_kobo).toBe(0n);

            // Expected Deductions check
            const grossKobo = 7000000n;
            const basicSal = (grossKobo * 30n) / 100n; // N21,000

            const expectedPension = (grossKobo * 8n) / 100n; // N5,600 -> 560000kobo
            const expectedNhf = (basicSal * 25n) / 1000n; // N525 -> 52500kobo
            const expectedNhia = (grossKobo * 5n) / 100n; // N3,500 -> 350000kobo

            expect(result.deductions.pension_employee_kobo).toBe(expectedPension);
            expect(result.deductions.nhf_kobo).toBe(expectedNhf);
            expect(result.deductions.nhia_employee_kobo).toBe(expectedNhia);

            const expectedNet = grossKobo - expectedPension - expectedNhf - expectedNhia;
            expect(result.net_salary_kobo).toBe(expectedNet);
        });

        it('should accurately step through PAYE brackets for a mid-tier earner', () => {
            // N500k monthly -> N6,000,000 annual
            const input: PayrollInput = {
                employee_name: 'Mid Tier',
                monthly_gross_kobo: 50000000n, // N500,000
                month: '2026-03'
            };

            const result = calculateBasicPayroll(input);
            const annualGross = 50000000n * 12n; // 6,000,000.00 NGN -> 600,000,000 kobo

            // Allowable Deductions
            const pension = (annualGross * 8n) / 100n; // N480,000
            const basic = (annualGross * 30n) / 100n;
            const nhf = (basic * 25n) / 1000n; // 2.5% of basic -> N45,000
            const rentRelief = 0n; // No rent relief provided

            const taxableIncome = annualGross - pension - nhf; // 6,000,000 - 480,000 - 45,000 = 5,475,000

            // PAYE Brackets:
            // 1. First N800k @ 0% -> 0
            // 2. Next N2.2M @ 15% -> N330,000
            // 3. Next N3M (has 2.475M remaining) @ 18% -> N445,500
            // Total Annual PAYE: 330k + 445.5k = N775,500 -> 77,550,000 kobo
            // Monthly PAYE: 775,500 / 12 = N64,625 -> 6,462,500 kobo

            expect(result.deductions.paye_kobo).toBe(6462500n);
        });

        it('should correctly apply NTA Rent Relief capping rules (maximum N500k allowance)', () => {
            const input: PayrollInput = {
                employee_name: 'High Rent Earner',
                monthly_gross_kobo: 50000000n, // N500,000
                annual_rent_paid_kobo: 400000000n, // N4,000,000 annual rent
                month: '2026-03'
            };

            const result = calculateBasicPayroll(input);

            // 20% of N4,000,000 = N800,000. Under NTA 2025, rent relief is capped at N500,000!
            // Total taxable = 6,000,000 (Gross) - 480,000 (Pension) - 45,000 (NHF) - 500,000 (Rent Cap) = 4,975,000
            // Brackets:
            // 1. 800k @ 0% = 0
            // 2. 2.2M @ 15% = 330,000
            // 3. 1.975M remaining @ 18% = 355,500
            // Total Annual PAYE: N685,500
            // Monthly PAYE: N57,125

            expect(result.deductions.paye_kobo).toBe(5712500n);
        });

        it('should enforce proper employer matching percentages', () => {
            const input: PayrollInput = {
                employee_name: 'Employer Cost Test',
                monthly_gross_kobo: 30000000n, // N300,000
                month: '2026-03'
            };

            const result = calculateBasicPayroll(input);

            // Employer Pension = 10% of gross
            expect(result.employer_contributions.pension_employer_kobo).toBe(3000000n);

            // Employer NHIA = 10% of gross
            expect(result.employer_contributions.nhia_employer_kobo).toBe(3000000n);

            // Employer NSITF = 1% of gross
            expect(result.employer_contributions.nsitf_kobo).toBe(300000n);

            const totalCost = 30000000n + 3000000n + 3000000n + 300000n;
            expect(result.total_cost_to_employer_kobo).toBe(totalCost);
        });
    });

    describe('calculateBatchPayroll', () => {
        it('should accurately aggregate multiple employees', () => {
            const payloads: PayrollInput[] = [
                {
                    employee_name: 'Emp 1',
                    monthly_gross_kobo: 10000000n, // N100k
                    month: '2026-03'
                },
                {
                    employee_name: 'Emp 2',
                    monthly_gross_kobo: 20000000n, // N200k
                    month: '2026-03'
                }
            ];

            const batch = calculateBatchPayroll(payloads, '2026-03');

            expect(batch.total_employees).toBe(2);
            expect(batch.totals.gross_salary_kobo).toBe(30000000n); // 100k + 200k

            // Verify pension totals
            const p1 = (10000000n * 8n) / 100n;
            const p2 = (20000000n * 8n) / 100n;
            expect(batch.totals.pension_employee_kobo).toBe(p1 + p2);

            // Verify employer cost aggregations
            const expectedTotalCost = batch.employees[0].total_cost_to_employer_kobo + batch.employees[1].total_cost_to_employer_kobo;
            expect(batch.totals.total_cost_to_employer_kobo).toBe(expectedTotalCost);
        });
    });
});
