import { useState } from "react";
import { useParams, Link } from "react-router-dom";

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
    ArrowLeft,
    ArrowRight,
    BookOpen,
    CheckCircle2,
    Award,
    HelpCircle,
} from "lucide-react";

interface Lesson {
    id: string;
    title: string;
    content: string[];
    quiz?: {
        question: string;
        options: string[];
        correctIndex: number;
        explanation: string;
    };
}

interface CourseData {
    id: string;
    title: string;
    description: string;
    lessons: Lesson[];
}

// Course content database
const courseDatabase: Record<string, CourseData> = {
    "nta-basics": {
        id: "nta-basics",
        title: "Nigeria Tax Act 2025 — Essentials",
        description: "Understand the core principles of Nigeria's tax framework under the NTA 2025.",
        lessons: [
            {
                id: "l1",
                title: "Introduction to Nigerian Taxation",
                content: [
                    "Nigeria's tax system is administered at three levels: Federal (NRS), State (various SIRS), and Local Government.",
                    "The Nigeria Revenue Service (NRS) — formerly the Federal Inland Revenue Service (FIRS), renamed in June 2025 and effective January 1, 2026 — is responsible for collecting federal taxes, including Company Income Tax (CIT), Value Added Tax (VAT), and Withholding Tax (WHT).",
                    "State Internal Revenue Services (SIRS) handle Personal Income Tax (PIT) for residents of each state.",
                    "The Nigeria Tax Act 2025, signed into law on June 26, 2025 and effective January 1, 2026, is the most significant overhaul of Nigeria's tax framework since 1999. It replaces the old Personal Income Tax Act (PITA), Companies Income Tax Act (CITA), and Capital Gains Tax Act (CGTA) with a unified, modernized framework.",
                ],
                quiz: {
                    question: "What is the Nigeria Revenue Service (NRS)?",
                    options: ["A new agency created in 2025", "The renamed Federal Inland Revenue Service (FIRS)", "A state-level tax agency", "The Central Bank's tax division"],
                    correctIndex: 1,
                    explanation: "The FIRS was renamed to the Nigeria Revenue Service (NRS) under the NRS Establishment Act 2025, effective January 1, 2026.",
                },
            },
            {
                id: "l2",
                title: "Personal Income Tax (PIT) Bands",
                content: [
                    "The NTA 2025 introduces a completely new progressive PIT structure with 6 bands, effective January 1, 2026:",
                    "The new PIT rates are:\n• ₦0 – ₦800,000: 0% (fully exempt)\n• ₦800,001 – ₦3,000,000: 15%\n• ₦3,000,001 – ₦12,000,000: 18%\n• ₦12,000,001 – ₦25,000,000: 21%\n• ₦25,000,001 – ₦50,000,000: 23%\n• Above ₦50,000,000: 25%",
                    "The old Consolidated Relief Allowance (CRA) has been abolished and replaced by Rent Relief — the lower of 20% of annual rent paid or ₦500,000 per year. Other deductible items include pension contributions, NHF, NHIS, life insurance premiums, and mortgage interest.",
                    "The 0% band up to ₦800,000 is a significant change — it means low-income earners (roughly ₦66,667/month or less) pay no income tax at all. Under the old PITA, even small incomes were taxed at 7% after CRA.",
                ],
                quiz: {
                    question: "What is the highest PIT rate under the Nigeria Tax Act 2025?",
                    options: ["21%", "24%", "25%", "30%"],
                    correctIndex: 2,
                    explanation: "The highest marginal PIT rate is 25%, applicable to income above ₦50,000,000.",
                },
            },
            {
                id: "l3",
                title: "Value Added Tax (VAT)",
                content: [
                    "VAT is a consumption tax charged at 7.5% on the supply of goods and services in Nigeria. This rate has been in effect since February 2020 and is retained under the NTA 2025.",
                    "Zero-rated supplies (0% VAT, input VAT recoverable): basic food items, medical and pharmaceutical products, educational materials, and exports. VAT-exempt supplies (no VAT, no input recovery): humanitarian goods, assistive devices for persons with disabilities.",
                    "Businesses with annual turnover above ₦25 million are required to register for VAT. Below this threshold, registration is voluntary but may be beneficial for claiming input VAT credits.",
                    "VAT returns must be filed monthly, by the 21st day of the following month, via the NRS TaxPro-Max portal. The NTA 2025 also introduces mandatory e-invoicing for VAT transactions.",
                ],
                quiz: {
                    question: "What is the current VAT rate in Nigeria?",
                    options: ["5%", "7.5%", "10%", "15%"],
                    correctIndex: 1,
                    explanation: "Nigeria's VAT rate is 7.5%, effective since February 2020. The NTA 2025 retains this rate.",
                },
            },
            {
                id: "l4",
                title: "Company Income Tax (CIT)",
                content: [
                    "CIT is charged on the profits of companies operating in Nigeria. The NTA 2025 simplifies the classification from three tiers to two:",
                    "Small companies (annual gross turnover ≤ ₦50 million AND total fixed assets ≤ ₦250 million) are EXEMPT from CIT, CGT, and the Development Levy. Note: Professional service firms (law, accounting, consulting) are excluded from this classification regardless of size. A separate 'small business' threshold of ₦100M applies for VAT purposes only.",
                    "All other companies pay CIT at the standard rate of 30% on assessable profits, plus a 4% Development Levy on assessable profits. This means the effective combined rate is 34% for non-small companies.",
                    "Companies must file annual CIT returns within 6 months of their financial year-end. New companies must file their first return within 18 months of incorporation.",
                ],
                quiz: {
                    question: "Under the NTA 2025, what is the CIT status of a company with ₦40M turnover and ₦200M in assets?",
                    options: ["0% — qualifies as small company", "20% — medium rate", "30% — standard rate", "34% — CIT plus levy"],
                    correctIndex: 0,
                    explanation: "With turnover ≤ ₦50M AND fixed assets ≤ ₦250M, this company qualifies as 'small' and is fully exempt from CIT.",
                },
            },
            {
                id: "l5",
                title: "Withholding Tax (WHT)",
                content: [
                    "WHT is an advance payment of income tax deducted at source from certain payments. It is NOT an additional tax — it reduces your final tax liability.",
                    "Under the Deduction of Tax at Source (Withholding) Regulations 2024 (effective January 1, 2025), key rates for residents are:\n• General services: 2%\n• Professional/consultancy fees: 5%\n• Directors' fees: 15%\n• Dividends: 10%\n• Rent: 10%\n• Interest: 10%",
                    "WHT receipts issued by payers now serve as proof of credit, even if the payer hasn't yet remitted to the NRS. This eliminates the old frustration of losing credits due to payer non-remittance.",
                    "Small businesses (turnover < ₦25M) are exempt from WHT deduction obligations when the supplier has a valid TIN and the transaction is ₦2M or less.",
                ],
                quiz: {
                    question: "Under the 2024 WHT Regulations, what is the rate on professional fees for residents?",
                    options: ["2%", "5%", "10%", "15%"],
                    correctIndex: 1,
                    explanation: "Professional, management, technical, and consultancy fees for residents were reduced from 10% to 5% under the 2024 Regulations.",
                },
            },
            {
                id: "l6",
                title: "Capital Gains Tax (CGT)",
                content: [
                    "CGT under the NTA 2025 has been significantly reformed. For companies, the rate increased from 10% to 30%, aligning with the CIT rate. For individuals, capital gains are now taxed at progressive PIT rates (up to 25%).",
                    "Exemptions for shares: disposals of shares in Nigerian companies are exempt from CGT if BOTH conditions are met in any 12 months: (1) total sales proceeds are below ₦150 million, AND (2) total chargeable gains are below ₦10 million. Gains from government securities and listed shares remain exempt. Reinvestment of proceeds into Nigerian shares also qualifies for exemption.",
                    "New scope: CGT now applies to digital/virtual assets (crypto, NFTs) and indirect transfers of shares in Nigerian companies by foreign entities.",
                    "Small companies (≤ ₦50M turnover, ≤ ₦250M assets) are exempt from CGT. Sales of a principal private residence are exempt once per lifetime.",
                ],
                quiz: {
                    question: "What is the CGT rate for companies under the NTA 2025?",
                    options: ["10%", "20%", "25%", "30%"],
                    correctIndex: 3,
                    explanation: "CGT for companies was increased from 10% to 30% under the NTA 2025, aligning with the standard CIT rate.",
                },
            },
            {
                id: "l7",
                title: "Tax Identification Number (TIN)",
                content: [
                    "Every taxable person or entity in Nigeria must have a Tax Identification Number (TIN). Under the NTA 2025, an individual's National Identification Number (NIN) now serves as their TIN, streamlining the system.",
                    "TIN/NIN is required for: opening bank accounts, importing goods, obtaining government contracts, property transactions, and many other financial activities.",
                    "Companies register for TIN through the NRS TaxPro-Max portal. Without a TIN, you may face double WHT rates on payments received.",
                    "The Joint Tax Board (JTB) maintains a unified database of all TINs issued across federal and state levels, allowing electronic verification.",
                ],
            },
            {
                id: "l8",
                title: "Tax Clearance Certificate (TCC)",
                content: [
                    "A TCC confirms that a taxpayer has fulfilled their tax obligations for the preceding 3 years of assessment.",
                    "TCCs are required for: government contracts and tenders, foreign exchange transactions, company registration renewals, property transactions, bank loans, and professional licenses.",
                    "To obtain a TCC, you must have filed returns and paid all taxes for the relevant years. Apply through TaxPro-Max (for federal taxes) or your state IRS portal. Authenticity can be verified through the JTB portal.",
                    "Use Buoyance's TCC Readiness tool to automatically check your compliance status and generate the required evidence pack.",
                ],
                quiz: {
                    question: "How many years of tax compliance does a TCC typically cover?",
                    options: ["1 year", "2 years", "3 years", "5 years"],
                    correctIndex: 2,
                    explanation: "A TCC covers the 3 preceding years of assessment, confirming tax obligations were met.",
                },
            },
        ],
    },
    "vat-mastery": {
        id: "vat-mastery",
        title: "VAT Compliance Masterclass",
        description: "Master VAT registration, filing, input tax recovery, and exemptions under Nigerian law.",
        lessons: [
            {
                id: "v1",
                title: "VAT Fundamentals in Nigeria",
                content: [
                    "Value Added Tax (VAT) is a consumption tax charged at 7.5% on the supply of goods and services in Nigeria. This rate has been in effect since February 2020.",
                    "VAT is administered by the Nigeria Revenue Service (NRS), formerly the Federal Inland Revenue Service (FIRS). It applies at every stage of the supply chain, but the final burden falls on the end consumer.",
                    "The Nigeria Tax Act 2025 (signed June 2025, effective January 1, 2026) retains the 7.5% rate but significantly modernizes VAT administration, including mandatory e-invoicing and expanded scope for non-resident digital service providers.",
                    "Understanding VAT is essential for any business in Nigeria — non-compliance can lead to penalties of ₦50,000 for the first month and ₦25,000 for each subsequent month of default.",
                ],
                quiz: {
                    question: "What is the current VAT rate in Nigeria?",
                    options: ["5%", "7.5%", "10%", "12.5%"],
                    correctIndex: 1,
                    explanation: "Nigeria's VAT rate is 7.5%, effective since February 2020. Proposals to increase it to 10% were rejected by the National Assembly.",
                },
            },
            {
                id: "v2",
                title: "VAT Registration Requirements",
                content: [
                    "Businesses with annual turnover above ₦25 million are required to register for VAT with the NRS via the TaxPro-Max portal. Below ₦25 million, registration is voluntary but can be beneficial for claiming input VAT credits.",
                    "Non-resident suppliers providing digital services (streaming platforms, software providers, e-commerce) to Nigerian consumers are now required to register and remit VAT under the NTA 2025.",
                    "Registration involves obtaining a Tax Identification Number (TIN) and completing the VAT registration form on TaxPro-Max. Upon registration, you receive a VAT registration certificate.",
                    "Digital platforms acting as intermediaries must also collect VAT on the full value of supplies made through their platforms, not just their commission.",
                ],
                quiz: {
                    question: "Under the NTA 2025, who must now register for VAT in Nigeria?",
                    options: ["Only companies with turnover above ₦25M", "Only Nigerian-registered businesses", "All businesses making taxable supplies, including non-resident digital service providers", "Only manufacturers"],
                    correctIndex: 2,
                    explanation: "The NTA 2025 broadens the scope to include non-resident suppliers providing digital services to Nigerian consumers.",
                },
            },
            {
                id: "v3",
                title: "Filing VAT Returns",
                content: [
                    "VAT returns must be filed monthly, by the 21st day of the month following the transaction month. For example, January transactions must be filed by February 21st.",
                    "Returns are filed electronically through the NRS TaxPro-Max portal. Each return must include details of output VAT (collected from customers) and input VAT (paid on purchases).",
                    "When filing, you must upload schedules showing: (1) input VAT claimed on purchases, (2) withholding VAT deducted, and (3) VAT on imports. These schedules are mandatory under the NTA 2025.",
                    "Late filing attracts a penalty of ₦50,000 for the first month and ₦25,000 for each subsequent month. Late payment of VAT attracts interest at the prevailing Central Bank monetary policy rate.",
                ],
            },
            {
                id: "v4",
                title: "Input VAT Recovery",
                content: [
                    "Input VAT is the VAT you pay when purchasing goods and services for your business. You can recover this by offsetting it against the output VAT you collect.",
                    "The NTA 2025 significantly expands input VAT recovery. Businesses can now claim input VAT on capital expenditure (fixed assets) and input services, provided they are directly related to making taxable supplies.",
                    "Claims for excess input VAT (where input exceeds output) must be submitted within 12 months. The NRS is expected to process refund claims within a reasonable statutory timeframe.",
                    "Key tip: Keep meticulous records of all VAT invoices. Only valid tax invoices with the supplier's TIN, VAT registration number, and transaction details qualify for input VAT recovery.",
                ],
                quiz: {
                    question: "Under the NTA 2025, within how many months must excess input VAT refund claims be submitted?",
                    options: ["3 months", "6 months", "12 months", "24 months"],
                    correctIndex: 2,
                    explanation: "Claims for excess input VAT must be submitted within 12 months. The NRS is expected to process them within a reasonable statutory timeframe.",
                },
            },
            {
                id: "v5",
                title: "VAT Exemptions & Zero-Rated Supplies",
                content: [
                    "Zero-rated supplies (0% VAT, but full input VAT recovery allowed): basic food items (unprocessed agricultural produce, staple foods), medical and pharmaceutical products, educational materials and books, exports of goods and services, and electricity supplied to the national grid.",
                    "VAT-exempt supplies (no VAT charged, no input VAT recovery): humanitarian project goods, assistive devices for persons with disabilities, supplies consumed within Export Processing Zones and Free Trade Zones.",
                    "The distinction matters: zero-rated suppliers CAN recover input VAT; exempt suppliers CANNOT. This makes zero-rating more favorable for businesses.",
                    "Professional tip: If your business primarily makes zero-rated supplies (e.g., food processing for export), you may consistently have excess input VAT eligible for refund from the NRS.",
                ],
            },
            {
                id: "v6",
                title: "E-Invoicing & VAT Fiscalization",
                content: [
                    "The NTA 2025 introduces mandatory VAT e-invoicing and fiscalization rules — a major step toward digital tax administration. This positions Nigeria as an early adopter of e-invoicing in Africa.",
                    "Under the new system, all VAT invoices must be validated in real-time through the NRS-approved e-invoicing platform. This means every taxable transaction generates a digital trail automatically.",
                    "Benefits for businesses: reduced audit burden (since records are pre-validated), faster input VAT recovery, and simplified filing. Benefits for the NRS: reduced evasion and real-time revenue monitoring.",
                    "Action items: (1) Ensure your accounting software supports e-invoicing, (2) Register on the NRS e-invoicing platform when available, (3) Train your accounts team on digital invoice generation, (4) Update your invoicing templates to include all mandatory fields (supplier TIN, VAT registration number, transaction details).",
                ],
                quiz: {
                    question: "What does the NTA 2025 mandate for VAT invoicing?",
                    options: ["Paper invoices only", "Real-time e-invoicing through an NRS-approved system", "Monthly batch uploads", "No change from current system"],
                    correctIndex: 1,
                    explanation: "The NTA 2025 mandates real-time e-invoicing through an NRS-approved system, creating automatic digital trails for all taxable transactions.",
                },
            },
        ],
    },
    "wht-credit": {
        id: "wht-credit",
        title: "WHT Credit Management",
        description: "Master withholding tax credits — from certificate collection to matching and filing for refunds.",
        lessons: [
            {
                id: "w1",
                title: "Understanding Withholding Tax",
                content: [
                    "Withholding Tax (WHT) is an advance payment of income tax deducted at source by the payer from certain types of payments. It is NOT an additional tax — it's a prepayment that reduces your final tax bill.",
                    "The Deduction of Tax at Source (Withholding) Regulations 2024, effective January 1, 2025, introduced significant changes to WHT rates and administration in Nigeria.",
                    "WHT applies to payments such as contracts, rent, dividends, professional fees, directors' fees, and interest. The rates vary depending on the type of payment and whether the recipient is a resident or non-resident.",
                    "Important: If a recipient is NOT registered for tax (no TIN), the payer must apply DOUBLE the normal WHT rate. This makes TIN registration essential for all businesses.",
                ],
                quiz: {
                    question: "What happens if a WHT recipient is not registered for tax?",
                    options: ["WHT is waived entirely", "The standard rate applies", "Double the applicable WHT rate is applied", "The transaction is blocked"],
                    correctIndex: 2,
                    explanation: "Under the 2024 Regulations, a duplicate WHT rate (twice the applicable rate) applies if the recipient has no TIN registration.",
                },
            },
            {
                id: "w2",
                title: "Key WHT Rates (2025)",
                content: [
                    "The 2024 Regulations revised many WHT rates. Here are the key ones for residents:\n• General services: 2% (reduced from 5%)\n• Professional/management/consultancy fees: 5% (reduced from 10%)\n• Co-location & telecom tower services: 2% (reduced from 5%)\n• Directors' fees: 15% (increased)\n• Sale of goods by Nigerian businesses: 2% (new)\n• Brokerage fees: 5%",
                    "Non-resident rates remain higher:\n• Professional/consultancy fees: 10%\n• Directors' fees: 20%\n• Construction activities: 5% (increased from 2.5%)\n• Entertainers/sportspersons: 15% (final tax)\n• Lottery/gaming winnings: 15% (final tax)",
                    "Small business exemption: Businesses with annual turnover below ₦25 million are exempt from WHT deduction obligations if the supplier has a valid TIN and the single transaction is ₦2 million or less.",
                    "New exemptions: Across-the-counter sales, telephone charges, internet data subscriptions, and airline tickets are now exempt from WHT.",
                ],
                quiz: {
                    question: "What is the WHT rate on professional fees paid to a Nigerian resident under the 2024 Regulations?",
                    options: ["2%", "5%", "10%", "15%"],
                    correctIndex: 1,
                    explanation: "Professional, management, technical, and consultancy fees for Nigerian residents were reduced from 10% to 5% under the 2024 Regulations.",
                },
            },
            {
                id: "w3",
                title: "WHT Credit Notes & Receipts",
                content: [
                    "Under the new regulations, businesses that deduct WHT must issue a WHT receipt directly to their suppliers. This is a major simplification — you no longer need to wait for the NRS to issue credit notes.",
                    "The WHT receipt serves as proof of tax payment and entitles the recipient to claim a tax credit when filing their returns, EVEN if the payer has not yet remitted the tax to the NRS.",
                    "This change eliminates one of the biggest frustrations in Nigerian tax — previously, taxpayers would lose credits because the payer failed to remit, and the FIRS would deny the credit. That is no longer the case.",
                    "Best practice: Issue WHT receipts immediately upon deduction. Keep copies of all receipts issued and received. Upload them to TaxPro-Max for automated tracking.",
                ],
                quiz: {
                    question: "Under the new rules, can a recipient claim WHT credit even if the payer hasn't remitted the tax?",
                    options: ["No, remittance must be confirmed first", "Yes, the WHT receipt alone entitles the credit", "Only if NRS approves a waiver", "Only for amounts under ₦1 million"],
                    correctIndex: 1,
                    explanation: "The 2024 Regulations allow recipients to claim WHT credits based on the receipt alone, regardless of whether the payer has remitted the tax.",
                },
            },
            {
                id: "w4",
                title: "Matching WHT Credits to Tax Liability",
                content: [
                    "WHT credits are offset against your final income tax or company tax liability. If your total WHT credits exceed your tax liability, you have excess credits eligible for refund.",
                    "To use WHT credits effectively: (1) Collect all WHT receipts throughout the year, (2) Record them in your accounting system with the payer's TIN, (3) Reconcile credits against your computed tax liability before filing.",
                    "The NRS is working toward full automation of WHT credit accounting. Eventually, credits will be automatically linked to your taxpayer record on TaxPro-Max, reducing manual reconciliation.",
                    "Common mistake to avoid: Don't let WHT receipts accumulate without recording them. Missing credits means overpaying tax. Use Buoyance's WHT Credits tracker to stay organized throughout the year.",
                ],
            },
            {
                id: "w5",
                title: "WHT Refund Strategies",
                content: [
                    "If your WHT credits exceed your tax liability, you are entitled to a refund from the NRS. The refund claim process has been streamlined under the new regulations.",
                    "Steps to claim a refund: (1) Ensure all WHT receipts are uploaded to TaxPro-Max, (2) File your annual tax return showing excess credits, (3) Submit a formal refund application to the NRS, (4) The NRS should process refunds within a statutory timeframe.",
                    "Industry-specific tips: Businesses in sectors with high WHT deductions (e.g., contractors, consultants, landlords) should proactively plan for refunds. Consider adjusting quarterly tax payments to account for expected WHT credits.",
                    "Alternative to refund: You can request the NRS to apply excess credits to future tax periods, which is often faster than waiting for a cash refund. This is called a 'credit carry-forward.'",
                ],
                quiz: {
                    question: "What is an alternative to claiming a cash refund for excess WHT credits?",
                    options: ["Write off the credits", "Credit carry-forward to future periods", "Donate the credits to charity", "Transfer credits to another taxpayer"],
                    correctIndex: 1,
                    explanation: "Excess WHT credits can be carried forward and applied against future tax liabilities, which is often faster than waiting for a cash refund.",
                },
            },
        ],
    },
    "paye-payroll": {
        id: "paye-payroll",
        title: "PAYE & Payroll Tax Guide",
        description: "Calculate PAYE correctly under the NTA 2025, understand the new tax bands, Rent Relief, and employer obligations.",
        lessons: [
            {
                id: "p1",
                title: "PAYE Overview & NTA 2025 Changes",
                content: [
                    "Pay-As-You-Earn (PAYE) is the system by which employers deduct personal income tax from employees' salaries each month and remit it to the State Internal Revenue Service (SIRS).",
                    "The Nigeria Tax Act 2025 introduces sweeping changes to personal income tax, effective January 1, 2026. The most impactful change: individuals earning ₦800,000 or less per year (approx. ₦66,667/month) are now FULLY EXEMPT from income tax.",
                    "The old Consolidated Relief Allowance (CRA) — ₦200,000 + 20% of gross income — has been ABOLISHED. It is replaced by a simpler Rent Relief system.",
                    "Employers must update their payroll systems to reflect these new bands and reliefs. Failure to apply the correct rates can result in over-deduction (employee grievance) or under-deduction (employer liability).",
                ],
                quiz: {
                    question: "What major change did the NTA 2025 make to the Consolidated Relief Allowance (CRA)?",
                    options: ["Increased it to 25% of gross income", "Abolished it and replaced it with Rent Relief", "Kept it the same", "Made it optional for employers"],
                    correctIndex: 1,
                    explanation: "The CRA has been abolished under the NTA 2025 and replaced by a Rent Relief system based on actual rent paid.",
                },
            },
            {
                id: "p2",
                title: "New PIT Tax Bands (Effective 2026)",
                content: [
                    "The NTA 2025 introduces a new progressive tax structure with 6 bands:\n• ₦0 – ₦800,000: 0% (fully exempt)\n• ₦800,001 – ₦3,000,000: 15%\n• ₦3,000,001 – ₦12,000,000: 18%\n• ₦12,000,001 – ₦25,000,000: 21%\n• ₦25,000,001 – ₦50,000,000: 23%\n• Above ₦50,000,000: 25%",
                    "Key difference from the old system: The 0% band up to ₦800,000 means low-income earners pay NO tax at all. Previously, even small incomes were taxed at 7% after CRA.",
                    "The maximum marginal rate increased slightly from 24% to 25%, but only applies above ₦50 million — affecting very high earners.",
                    "Example: An employee earning ₦5,000,000 annually pays: ₦0 on the first ₦800,000 + 15% × ₦2,200,000 (= ₦330,000) + 18% × ₦2,000,000 (= ₦360,000) = ₦690,000 total tax before reliefs.",
                ],
                quiz: {
                    question: "What is the tax rate on annual income up to ₦800,000 under the NTA 2025?",
                    options: ["7%", "5%", "0%", "15%"],
                    correctIndex: 2,
                    explanation: "Individuals earning ₦800,000 or less annually are fully exempt from income tax — a 0% rate designed to provide relief to low-income earners.",
                },
            },
            {
                id: "p3",
                title: "Rent Relief (Replacing CRA)",
                content: [
                    "Rent Relief replaces the old CRA and is calculated as the LOWER of: (a) 20% of your annual rent paid, or (b) ₦500,000 per year.",
                    "To claim Rent Relief, you must: (1) Declare your annual rent amount, (2) Provide supporting documentation (rent receipt, tenancy agreement), (3) Submit the claim through your employer or directly.",
                    "Important: Homeowners or people who do not pay rent are NOT eligible for Rent Relief. This is a significant departure from the CRA, which applied universally.",
                    "Example: If you pay ₦1,500,000 annual rent → 20% = ₦300,000 (lower than ₦500,000 cap) → Your Rent Relief is ₦300,000. If you pay ₦3,000,000 rent → 20% = ₦600,000 (exceeds cap) → Your relief is capped at ₦500,000.",
                ],
                quiz: {
                    question: "What is the maximum Rent Relief claimable per year under the NTA 2025?",
                    options: ["₦200,000", "₦300,000", "₦500,000", "₦1,000,000"],
                    correctIndex: 2,
                    explanation: "Rent Relief is capped at ₦500,000 per year, or 20% of annual rent paid — whichever is lower.",
                },
            },
            {
                id: "p4",
                title: "Pension & Other Deductions",
                content: [
                    "Pension contributions under the Pension Reform Act 2014 remain deductible. The minimum rates are: 8% by the employee + 10% by the employer = 18% of monthly emoluments (basic salary + housing + transport allowances).",
                    "If the employer bears the full cost, the minimum contribution is 20% of monthly emoluments. These contributions are deducted BEFORE computing taxable income.",
                    "Other allowable deductions under the NTA 2025:\n• National Housing Fund (NHF) contributions — 2.5% of basic salary\n• National Health Insurance Scheme (NHIS) contributions\n• Life insurance premiums\n• Interest on mortgage loans for owner-occupied residential property",
                    "All deductions must be claimed in writing with proper documentation. Employers should ensure these are applied correctly in payroll calculations each month.",
                ],
            },
            {
                id: "p5",
                title: "Employer PAYE Obligations",
                content: [
                    "Employers are legally responsible for deducting PAYE from employees' salaries and remitting to the relevant SIRS by the 10th of the following month.",
                    "Key employer obligations: (1) Register with the SIRS in the state where employees are resident, (2) Deduct correct PAYE monthly, (3) Remit deductions by the 10th, (4) File annual returns by January 31st of the following year.",
                    "Failure to remit PAYE attracts penalties: 10% of the unremitted tax per annum, plus interest at the prevailing CBN monetary policy rate. Directors can be held personally liable.",
                    "Multi-state employers: If you have employees in multiple states, you must register and remit PAYE to each state's IRS based on where the employee is resident, not where your head office is.",
                ],
                quiz: {
                    question: "By what date must employers remit PAYE deductions each month?",
                    options: ["21st of the following month", "End of the same month", "10th of the following month", "15th of the following month"],
                    correctIndex: 2,
                    explanation: "Employers must remit PAYE deductions to the SIRS by the 10th day of the month following the deduction.",
                },
            },
            {
                id: "p6",
                title: "Reading a Nigerian Payslip",
                content: [
                    "A compliant Nigerian payslip should show: Gross Pay → Pension Deduction → NHF → NHIS → Taxable Income → PAYE Tax → Net Pay. Understanding each line helps you verify your employer's calculations.",
                    "Step-by-step breakdown:\n1. Start with gross monthly pay (basic + allowances)\n2. Deduct employee pension (8% of gross emoluments)\n3. Deduct NHF (2.5% of basic salary)\n4. Apply Rent Relief (monthly portion of annual relief)\n5. Compute taxable income\n6. Apply progressive tax bands to get monthly PAYE",
                    "Red flags to watch for: (1) CRA still being applied (should be Rent Relief from 2026), (2) Pension calculated on basic only instead of emoluments, (3) PAYE deducted from employees earning under ₦800,000/year.",
                    "Use Buoyance's Payroll Calculator to verify your payslip calculations and ensure your employer is deducting the correct amount.",
                ],
            },
            {
                id: "p7",
                title: "Annual Reconciliation & Filing",
                content: [
                    "At year-end, employers must reconcile all PAYE deductions and file an annual return with the SIRS by January 31st. This return must show each employee's total income, deductions, and tax paid.",
                    "Employees should also verify their annual tax position. If you had additional income sources (investments, freelance work, rental income), you may need to file a personal return and pay additional tax.",
                    "Common reconciliation issues: (1) Mid-year salary changes not properly prorated, (2) Employees who changed states of residence, (3) Expatriate staff with split tax obligations, (4) Bonus and 13th-month payments not taxed correctly.",
                    "Pro tip: Start reconciliation in November, not January. This gives you time to identify discrepancies and collect missing documentation before the filing deadline.",
                ],
                quiz: {
                    question: "By what date must employers file annual PAYE returns?",
                    options: ["March 31st", "January 31st", "December 31st", "June 30th"],
                    correctIndex: 1,
                    explanation: "Employers must file annual PAYE returns with the SIRS by January 31st of the year following the relevant tax year.",
                },
            },
        ],
    },
    "cit-planning": {
        id: "cit-planning",
        title: "CIT Planning for SMBs",
        description: "Learn how small and medium businesses can optimize CIT through legitimate deductions, incentives, and the new EDTI scheme.",
        lessons: [
            {
                id: "c1",
                title: "Company Classification & CIT Rates",
                content: [
                    "Under the NTA 2025 (effective January 1, 2026), company classification has been simplified from three tiers to two:",
                    "Small Companies: Annual gross turnover ≤ ₦100 million AND total fixed assets ≤ ₦250 million. These companies are EXEMPT from CIT, Capital Gains Tax (CGT), and the Development Levy. Note: Professional service firms (law, accounting, consulting) are excluded from small company classification regardless of turnover.",
                    "All other companies (turnover > ₦100M or assets > ₦250M) pay CIT at the standard rate of 30% on assessable profits.",
                    "This is a significant improvement for SMBs — the old system had a complex three-tier structure (0% under ₦25M, 20% between ₦25M–₦100M, 30% above ₦100M). The new ₦100M threshold gives more businesses breathing room.",
                ],
                quiz: {
                    question: "Under the NTA 2025, what is the CIT rate for a company with ₦80M turnover and ₦200M in fixed assets?",
                    options: ["0% — it qualifies as small", "20% — medium rate", "30% — standard rate", "25% — reduced rate"],
                    correctIndex: 0,
                    explanation: "With turnover ≤ ₦100M AND fixed assets ≤ ₦250M, this company qualifies as 'small' and is exempt from CIT under the NTA 2025.",
                },
            },
            {
                id: "c2",
                title: "Development Levy & Minimum Tax",
                content: [
                    "The NTA 2025 introduces a 4% Development Levy on assessable profits for all companies EXCEPT those classified as small. This levy consolidates various sectoral levies that previously existed.",
                    "The Development Levy is calculated on assessable profits (not turnover) and is payable alongside CIT. Effectively, non-small companies now face a combined burden of 30% CIT + 4% Development Levy = 34% on profits.",
                    "Minimum Effective Tax Rate (ETR): Companies that are part of large multinational groups with Nigerian operations, or Nigerian companies with turnover ≥ ₦50 billion, must ensure a minimum 15% effective tax rate. This aligns with the OECD Pillar II framework.",
                    "Planning tip: For SMBs approaching the ₦50M small company threshold (or the ₦100M small business threshold for VAT), carefully plan your revenue recognition and asset acquisition timing to manage your classification.",
                ],
                quiz: {
                    question: "What is the Development Levy rate under the NTA 2025?",
                    options: ["2% of turnover", "4% of assessable profits", "5% of net income", "10% of dividends"],
                    correctIndex: 1,
                    explanation: "The Development Levy is 4% of assessable profits, applicable to all companies except those classified as 'small.'",
                },
            },
            {
                id: "c3",
                title: "Economic Development Tax Incentive (EDTI)",
                content: [
                    "The EDTI replaces the old Pioneer Status Incentive (PSI), which offered blanket tax holidays. The PSI stopped accepting new applications as of November 10, 2025.",
                    "How EDTI works: Qualifying companies in priority sectors receive a 5% annual tax credit on eligible capital expenditures over a 5-year incentive period. Unused credits can be carried forward for up to 5 additional years.",
                    "Key difference: Instead of a full tax holiday (PSI), the EDTI ties relief directly to verifiable capital investment. You must actually spend on qualifying assets to earn credits.",
                    "To apply: Submit your application to the Nigeria Revenue Service with evidence of capital expenditure in a designated priority sector. The NRS will verify expenditure before granting credits.",
                ],
                quiz: {
                    question: "What annual tax credit rate does the EDTI provide on eligible capital expenditure?",
                    options: ["3%", "5%", "10%", "15%"],
                    correctIndex: 1,
                    explanation: "The EDTI offers a 5% annual tax credit on eligible capital expenditures over a 5-year period, with unused credits carried forward up to 5 more years.",
                },
            },
            {
                id: "c4",
                title: "Legitimate Deductions & Allowances",
                content: [
                    "Maximizing deductions is the most effective CIT planning strategy. The following are fully deductible against assessable profits:",
                    "Operating expenses: Staff costs, rent, utilities, professional fees, insurance, advertising, travel (wholly, exclusively, and necessarily for business). Capital allowances: Initial allowances (first year) and annual allowances on qualifying capital expenditure (plant, machinery, vehicles, buildings).",
                    "R&D deduction: Companies can deduct qualifying research and development expenses — up to 5% of annual revenue, subject to NRS guidelines on what constitutes qualifying R&D. This is a powerful incentive for innovative SMBs.",
                    "Manufacturing incentives: Manufacturers are explicitly exempted from WHT on the sale of locally manufactured goods under the NTA 2025, improving cash flow.",
                ],
            },
            {
                id: "c5",
                title: "Capital Gains Tax Changes",
                content: [
                    "Important change: CGT for companies has increased from 10% to 30% under the NTA 2025, aligning with the CIT rate. This affects the disposal of shares, land, buildings, and other capital assets.",
                    "Share exemption: Disposals of shares are exempt from CGT if total sales proceeds in a 12-month period are below ₦150 million AND total chargeable gains are below ₦10 million. If you exceed these thresholds, you can still qualify for exemption by reinvesting proceeds into other Nigerian company shares within the same year.",
                    "New scope: CGT now applies to indirect transfers of shares in Nigerian companies. If a foreign entity sells shares in a holding company that owns Nigerian assets, CGT may be triggered.",
                    "Government securities and stock exchange-listed shares remain exempt from CGT, encouraging investment in public markets.",
                ],
                quiz: {
                    question: "What is the CGT rate for companies under the NTA 2025?",
                    options: ["10%", "20%", "25%", "30%"],
                    correctIndex: 3,
                    explanation: "CGT for companies was increased from 10% to 30% under the NTA 2025, aligning it with the standard CIT rate.",
                },
            },
            {
                id: "c6",
                title: "Filing & Compliance Calendar",
                content: [
                    "CIT returns must be filed within 6 months of the company's financial year-end. For a December year-end, the deadline is June 30th of the following year.",
                    "Key filing requirements: (1) Audited financial statements, (2) Tax computation showing assessable profits, (3) Capital allowance schedule, (4) WHT credit certificates/receipts, (5) Evidence of EDTI claims if applicable.",
                    "Provisional tax: Companies may be required to pay provisional tax based on estimated profits. Ensure estimates are reasonable — significant underestimation can attract penalties.",
                    "Use Buoyance to track all your filing deadlines, generate compliant computations, and store all supporting documents in one place. Start your filing preparation at least 2 months before the deadline.",
                ],
            },
        ],
    },
    "tcc-readiness": {
        id: "tcc-readiness",
        title: "Tax Clearance Certificate (TCC)",
        description: "Prepare your TCC evidence pack, understand requirements, and avoid common rejection reasons.",
        lessons: [
            {
                id: "t1",
                title: "What Is a TCC & Why You Need One",
                content: [
                    "A Tax Clearance Certificate (TCC) is an official document confirming that a taxpayer has fulfilled their tax obligations for the preceding 3 years of assessment.",
                    "A TCC is required for: government contracts and tenders, foreign exchange transactions, import/export licenses, company registration renewals, property transactions, loan applications from banks, and obtaining certain professional licenses.",
                    "Without a valid TCC, you may be locked out of major business opportunities. Many government agencies and financial institutions now verify TCCs electronically through the Joint Tax Board (JTB) portal.",
                    "TCCs are issued by the NRS (for companies) or the relevant SIRS (for individuals) and are typically valid for one year, covering the 3 preceding assessment years.",
                ],
                quiz: {
                    question: "How many years of tax compliance does a TCC typically cover?",
                    options: ["1 year", "2 years", "3 years", "5 years"],
                    correctIndex: 2,
                    explanation: "A TCC covers the 3 preceding years of assessment, confirming that all tax obligations were met during that period.",
                },
            },
            {
                id: "t2",
                title: "Building Your Evidence Pack",
                content: [
                    "A successful TCC application requires a complete evidence pack. For individuals, you need:\n• Filed tax returns for the last 3 years\n• Evidence of PAYE deductions (from employer)\n• Receipts for direct tax payments\n• TIN registration certificate\n• Proof of identity (NIN, passport, or voter's card)",
                    "For companies, you additionally need:\n• Audited financial statements for each year\n• CIT computations and payment receipts\n• VAT returns and payment evidence\n• WHT remittance receipts\n• CAC registration documents",
                    "Pro tip: Use Buoyance's TCC Readiness tool to automatically generate a compliance checklist based on your filing history. It identifies gaps before you apply.",
                    "Start gathering documents at least 2 months before you need the TCC. Missing documents are the #1 cause of delays and rejections.",
                ],
            },
            {
                id: "t3",
                title: "Application Process",
                content: [
                    "Step 1: Ensure all tax returns are filed and taxes paid for the relevant 3-year period. This is a prerequisite — you cannot apply with outstanding filings.",
                    "Step 2: Submit your application through TaxPro-Max (for federal taxes) or the relevant state IRS portal. Attach your complete evidence pack.",
                    "Step 3: The tax authority reviews your application and cross-checks against their records. They may request additional documentation or clarification.",
                    "Step 4: If approved, the TCC is issued (typically within 2–4 weeks). You can verify its authenticity through the JTB verification portal at https://jtb.gov.ng.",
                ],
                quiz: {
                    question: "Where can you verify the authenticity of a TCC?",
                    options: ["FIRS website only", "Any commercial bank", "Joint Tax Board (JTB) verification portal", "Nigeria Police Force"],
                    correctIndex: 2,
                    explanation: "TCCs can be verified electronically through the JTB verification portal, which maintains a database of all issued certificates across federal and state levels.",
                },
            },
            {
                id: "t4",
                title: "Avoiding Common Rejection Reasons",
                content: [
                    "Top reasons for TCC rejection:\n1. Unfiled returns (even if taxes were paid, returns must be formally filed)\n2. Outstanding tax liabilities from previous years\n3. Mismatch between reported income and third-party data (bank statements, WHT certificates)\n4. Incomplete documentation (missing receipts or financial statements)\n5. Applying to the wrong jurisdiction",
                    "Jurisdiction tips: Individuals apply to the state where they are resident. Companies apply to the NRS. If you relocated during the 3-year period, you may need clearance from both the old and new state.",
                    "If your application is rejected, you have the right to be informed of the specific reasons. Address each issue and resubmit — rejections are not permanent.",
                    "Best practice: Maintain a compliance calendar and file all returns on time throughout the year. A TCC should be a formality, not a scramble. Use Buoyance to stay ahead of deadlines.",
                ],
            },
        ],
    },
    "audit-defence": {
        id: "audit-defence",
        title: "Surviving a Tax Audit",
        description: "Know your rights during a tax audit, organize documentation, and respond to assessment notices.",
        lessons: [
            {
                id: "a1",
                title: "Types of Tax Audits in Nigeria",
                content: [
                    "The Nigeria Revenue Service (NRS) conducts three types of audits:",
                    "Desk Audit: A review of your submitted returns, financial statements, and supporting documents at the NRS office. This is the most common and least intrusive type. It involves cross-checking your filings for consistency and accuracy.",
                    "Field Audit: NRS officials physically visit your business premises to inspect books, records, and operations. They may interview staff, examine inventory, and verify the existence of assets claimed in your filings.",
                    "Investigative Audit: The most intensive type, triggered by suspected fraud, evasion, or significant discrepancies. May involve multiple agencies and can lead to criminal proceedings. Under the NTA 2025, authorities can inspect both physical and electronic records.",
                ],
                quiz: {
                    question: "Which type of tax audit involves NRS officials visiting your business premises?",
                    options: ["Desk Audit", "Field Audit", "Investigative Audit", "Remote Audit"],
                    correctIndex: 1,
                    explanation: "A Field Audit involves physical visits to business premises for comprehensive inspection of records, assets, and operations.",
                },
            },
            {
                id: "a2",
                title: "Your Rights During an Audit",
                content: [
                    "Nigerian taxpayers have important rights during a tax audit that are protected by law:",
                    "Right to privacy: Your tax information is confidential. NRS officers cannot disclose it to unauthorized parties. Right to know: You must be informed of the reason for the audit and how any information collected will be used.",
                    "Right to representation: You can be represented by an authorized tax professional (accountant, lawyer, or tax consultant) at all stages of the audit. Right to be heard: You must be given the opportunity to explain any discrepancies before an assessment is raised.",
                    "Under the NTA 2025, a new Tax Ombuds office has been created to enhance taxpayer protection. If you believe your rights are being violated during an audit, you can file a complaint with the Tax Ombuds.",
                ],
                quiz: {
                    question: "What new office was created under the NTA 2025 to protect taxpayer rights?",
                    options: ["Tax Police", "Revenue Guard", "Tax Ombuds", "Taxpayer Defense Bureau"],
                    correctIndex: 2,
                    explanation: "The Tax Ombuds office was established under the NTA 2025 to enhance taxpayer protection and handle complaints about tax authority conduct.",
                },
            },
            {
                id: "a3",
                title: "Preparing Your Documentation",
                content: [
                    "The best defense in a tax audit is organized documentation. The NRS can request access to: financial statements, bank statements, invoices (sales and purchases), payroll records, contracts, tax returns, and supporting schedules.",
                    "Digital readiness: Under the NTA 2025, authorities can inspect electronic records. Ensure your accounting software data is backed up, accessible, and reconciled. Cloud-based systems like Buoyance provide easy access to all records.",
                    "Retention period: Keep all tax-related documents for a minimum of 6 years. Electronic records should be stored in non-editable formats where possible.",
                    "Pre-audit checklist: (1) Reconcile all bank accounts, (2) Ensure all invoices are numbered and filed, (3) Verify that tax returns match financial statements, (4) Prepare a summary of any known discrepancies with explanations.",
                ],
            },
            {
                id: "a4",
                title: "Responding to Assessment Notices",
                content: [
                    "After an audit, the NRS may issue a 'Notice of Assessment' if they believe additional tax is due. You have 30 days from receipt to respond.",
                    "Option 1 — Agree: If the assessment is correct, pay the additional tax and any interest due. Request a formal settlement letter for your records.",
                    "Option 2 — Object: File a formal 'Notice of Objection' within 30 days. This must be in writing, clearly state your grounds for disagreement, and include supporting evidence. CRITICAL: Missing the 30-day deadline can make the assessment final and binding.",
                    "If the NRS upholds their assessment after considering your objection, you can escalate to the Tax Appeal Tribunal (TAT). Always respond formally and in writing — verbal disagreements carry no legal weight.",
                ],
                quiz: {
                    question: "How many days do you have to file a Notice of Objection after receiving an assessment?",
                    options: ["14 days", "21 days", "30 days", "60 days"],
                    correctIndex: 2,
                    explanation: "You must file a formal Notice of Objection within 30 days of receiving the assessment. Missing this deadline can make the assessment final.",
                },
            },
            {
                id: "a5",
                title: "Tax Appeal Tribunal (TAT)",
                content: [
                    "The Tax Appeal Tribunal (TAT) is an independent body established to adjudicate tax disputes. It serves as the first formal forum for resolving disputes between taxpayers and tax authorities.",
                    "To appeal to the TAT: File a Notice of Appeal (Form TAT 1A) within 30 days of the NRS's decision on your objection. The TAT encourages e-filing and conducts virtual hearings for accessibility.",
                    "The TAT process: Pre-trial conference → Presentation of cases → Evidence examination → Tribunal decision. Both parties can present witnesses, documents, and expert testimony.",
                    "If you disagree with the TAT's decision, you can appeal to the Federal High Court within 30 days — but only on points of law, not facts. Further appeals go to the Court of Appeal and, in exceptional cases, the Supreme Court.",
                ],
                quiz: {
                    question: "An appeal from the TAT to the Federal High Court can only be on what basis?",
                    options: ["Points of fact only", "Points of law only", "Both fact and law", "New evidence only"],
                    correctIndex: 1,
                    explanation: "Appeals from the TAT to the Federal High Court can only be made on points of law, not on factual findings.",
                },
            },
        ],
    },
    "crypto-tax": {
        id: "crypto-tax",
        title: "Digital Assets & Crypto Taxation",
        description: "Understand how Nigeria taxes cryptocurrency gains, NFT income, and digital asset transfers under the NTA 2025.",
        lessons: [
            {
                id: "cr1",
                title: "How Nigeria Classifies Digital Assets",
                content: [
                    "Under the Nigeria Tax Act 2025 and the Investments and Securities Act (ISA) 2025, cryptocurrencies are classified as 'digital assets' and 'chargeable assets' — treated as investment property, NOT as legal tender or currency.",
                    "The SEC is the primary regulatory authority for digital assets since the ISA 2025. All Virtual Asset Service Providers (VASPs), exchanges, custodians, and investment advisers must register with the SEC and obtain licenses. Operating without registration is a criminal offense.",
                    "Taxable digital assets include: cryptocurrencies (Bitcoin, Ethereum, etc.), stablecoins, NFTs, tokenized securities, DeFi yields, and any other blockchain-based assets that generate income or gains.",
                    "The regulatory shift from the CBN's 2021 banking ban to the SEC's 2025 licensing framework represents a fundamental change — Nigeria now actively regulates rather than restricts crypto activity.",
                ],
                quiz: {
                    question: "Under Nigerian law, how are cryptocurrencies classified for tax purposes?",
                    options: ["As legal tender/currency", "As digital assets and chargeable assets (investment property)", "As commodities only", "They are not classified yet"],
                    correctIndex: 1,
                    explanation: "Cryptocurrencies are classified as digital assets and chargeable assets under the NTA 2025 and ISA 2025, treated as investment property subject to capital gains and income tax.",
                },
            },
            {
                id: "cr2",
                title: "Taxable Events & Rates",
                content: [
                    "Capital gains from selling cryptocurrency: For individuals, gains are subject to personal income tax rates (15%–25%) under the NTA 2025. For companies, gains attract the 30% CIT rate. The old flat 10% CGT rate no longer applies after January 1, 2026.",
                    "Every crypto-to-crypto exchange is a taxable disposal event. Trading BTC for ETH, for example, triggers a capital gains calculation on the BTC with the Naira value at the time of the exchange.",
                    "Income from crypto activities: Mining rewards, staking yields, airdrops, and salaries paid in crypto are all taxable as income at personal income tax rates (15%–25%). DeFi lending income is likewise treated as taxable income.",
                    "VAT: A 7.5% VAT applies to service fees charged by trading platforms and exchanges, but NOT to the digital assets themselves. Small gains below ₦10 million may qualify for reduced rates or exemptions.",
                ],
                quiz: {
                    question: "Under the NTA 2025, how are crypto capital gains taxed for individuals?",
                    options: ["Flat 10% CGT", "Personal income tax rates up to 25%", "30% company rate", "0% — crypto is exempt"],
                    correctIndex: 1,
                    explanation: "From January 1, 2026, individual crypto capital gains are subject to personal income tax rates (up to 25%), replacing the old 10% CGT rate.",
                },
            },
            {
                id: "cr3",
                title: "VASP Reporting & Your Obligations",
                content: [
                    "VASPs (exchanges like Binance, Luno, Quidax operating in Nigeria) are now mandated to file periodic reports to the NRS detailing: customer transaction values, dates, wallet addresses linked to TINs and NINs. The exact reporting frequency (monthly or quarterly) is prescribed by the NRS.",
                    "As a crypto user, this means your trading activity is increasingly transparent to tax authorities. VASPs must collect KYC information including your TIN. Failure to provide your TIN can result in service restrictions.",
                    "Record-keeping requirements: Maintain detailed records of all crypto transactions including: date, type (buy/sell/swap/transfer), amount, Naira value at time of transaction, counterparty details, and platform used. Keep records for at least 6 years.",
                    "Penalties for non-compliance include fines, monthly surcharges, interest on unpaid taxes, and potential imprisonment for intentional tax evasion. VASPs face license revocation for failing to report customer transactions.",
                ],
                quiz: {
                    question: "How often must VASPs report customer transactions to the NRS?",
                    options: ["Annually", "Quarterly", "Monthly", "Only when requested"],
                    correctIndex: 2,
                    explanation: "VASPs are mandated to file monthly reports detailing customer transactions, including values, dates, and linked TINs/NINs.",
                },
            },
            {
                id: "cr4",
                title: "Compliance Strategies for Crypto Users",
                content: [
                    "Strategy 1 — Track every transaction: Use a crypto tax tracking tool or spreadsheet. For each transaction, record: acquisition cost, disposal value, date, and calculate gain/loss in Naira. This is your tax computation foundation.",
                    "Strategy 2 — Offset losses against gains: Losses from crypto disposals in the same tax year can be used to reduce your taxable gains. Sell underperforming assets before year-end if you have large gains to offset.",
                    "Strategy 3 — Choose the right cost basis method: Use FIFO (First In, First Out) or average cost method consistently. Once you choose a method, stick with it — switching methods can trigger scrutiny.",
                    "Strategy 4 — File voluntarily: Even if the NRS hasn't specifically asked, voluntarily declaring crypto income demonstrates good faith and protects you from future penalties. Use Buoyance's crypto tools to generate compliant tax computations from your trading history.",
                ],
            },
        ],
    },
    "tax-optimization": {
        id: "tax-optimization",
        title: "Tax Optimization Playbook",
        description: "Legal strategies to minimize your tax burden — reliefs, deductions, timing, structuring, and industry-specific tips.",
        lessons: [
            {
                id: "to1",
                title: "The Tax Optimization Mindset",
                content: [
                    "Tax optimization (also called tax planning) is the legal practice of structuring your financial affairs to minimize your tax liability. It is NOT tax evasion — evasion is illegal and involves hiding income or fabricating deductions.",
                    "The key principle: You have NO obligation to pay more tax than the law requires. The NTA 2025 provides numerous legitimate tools — reliefs, deductions, exemptions, credits, and incentives — designed to reduce your tax burden.",
                    "The three pillars of tax optimization:\n1. Maximize deductions — claim every allowable expense\n2. Timing — accelerate deductions and defer income strategically\n3. Structuring — choose the right legal entity and compensation structure",
                    "Start early: Tax planning should happen throughout the year, not in December. Every financial decision you make has tax implications — from hiring staff to buying equipment to choosing where to bank.",
                ],
                quiz: {
                    question: "What is the difference between tax optimization and tax evasion?",
                    options: ["They are the same thing", "Optimization is legal use of reliefs and deductions; evasion is illegal concealment of income", "Optimization is only for companies", "Evasion is legal for small amounts"],
                    correctIndex: 1,
                    explanation: "Tax optimization legally uses available reliefs and deductions to minimize tax. Tax evasion illegally hides income or fabricates deductions — it's a criminal offense.",
                },
            },
            {
                id: "to2",
                title: "Personal Tax Reliefs Deep Dive",
                content: [
                    "Under the NTA 2025, the key personal reliefs are:\n• Zero-rate band: First ₦800,000 of income is tax-free — if you earn under this, you pay NOTHING\n• Rent Relief: Lower of 20% of annual rent or ₦500,000\n• Pension contributions: Employee's 8% is fully deductible\n• NHF: 2.5% of basic salary\n• NHIS premiums: Fully deductible\n• Life insurance premiums: Fully deductible",
                    "Optimization trick #1 — Maximize pension contributions: Consider voluntary contributions above the mandatory 8%. These are deductible NOW, grow tax-free, and are only taxed on withdrawal. It's essentially forced savings with a tax benefit.",
                    "Optimization trick #2 — Rent documentation: Many Nigerians pay rent but don't claim Rent Relief because they lack documentation. Get a formal tenancy agreement and bank transfer receipts — this alone can save you up to ₦500,000 × your marginal tax rate.",
                    "Optimization trick #3 — Mortgage interest: If you have a mortgage on your primary residence, the interest payments are deductible. This can be a powerful incentive to buy rather than rent, depending on your numbers.",
                ],
                quiz: {
                    question: "What is the maximum tax-free income under the NTA 2025?",
                    options: ["₦200,000", "₦500,000", "₦800,000", "₦1,000,000"],
                    correctIndex: 2,
                    explanation: "The first ₦800,000 of annual income is fully exempt from personal income tax under the NTA 2025.",
                },
            },
            {
                id: "to3",
                title: "Business Deductions Masterclass",
                content: [
                    "For business owners, the goal is simple: maximize legitimate business expenses that reduce your assessable profits. Every Naira of deductible expense saves you 30 kobo in CIT (at the 30% rate).",
                    "Commonly overlooked deductions:\n• Staff training and development costs\n• Professional association memberships\n• Bad debt write-offs (must be genuinely irrecoverable)\n• Donations to approved institutions (up to 10% of assessable profits)\n• Vehicle running costs (if used for business)\n• Home office expenses (proportional to business use)",
                    "Capital allowances strategy: Instead of expensing an asset over many years, consider whether you can claim an initial allowance (up to 95% for certain assets) in the first year. This front-loads the tax benefit.",
                    "R&D super-deduction: The NTA 2025 allows up to 5% of revenue as R&D deduction. If you're investing in product development, software, or process improvement, document it as R&D to claim this powerful deduction.",
                ],
                quiz: {
                    question: "What percentage of revenue can be deducted for qualifying R&D expenses under the NTA 2025?",
                    options: ["2%", "5%", "10%", "15%"],
                    correctIndex: 1,
                    explanation: "Companies can deduct up to 5% of annual revenue on qualifying research and development expenses.",
                },
            },
            {
                id: "to4",
                title: "Timing Strategies",
                content: [
                    "Timing is one of the most powerful optimization tools. The principle: defer income to later periods and accelerate deductions to the current period.",
                    "Income deferral: If you control when you invoice (common for consultants and service businesses), consider deferring December invoices to January if you're close to a higher tax band. This delays the tax liability by an entire year.",
                    "Expense acceleration: Make planned purchases (equipment, software, vehicles) before your financial year-end rather than after. This brings the capital allowance into the current year, reducing current-year profits.",
                    "Bonus timing: For employers, paying bonuses before year-end creates a deductible expense in the current period. For employees, deferring a bonus to the next year might keep you in a lower tax band — run the numbers both ways.",
                ],
            },
            {
                id: "to5",
                title: "Structuring Your Affairs",
                content: [
                    "Should you operate as a sole proprietor, partnership, or limited company? Each structure has different tax implications:",
                    "Sole proprietor: Income taxed at PIT rates (0%–25%). Simple but no liability protection. Best for: low-turnover freelancers and consultants under the ₦800,000 tax-free threshold.",
                    "Limited company (turnover ≤ ₦50M): EXEMPT from CIT under the NTA 2025 small company rule. This is incredibly powerful — you can pay yourself a salary (taxed at PIT rates) and retain profits in the company tax-free. Note: Professional firms are excluded.",
                    "Compensation structuring: For company directors, the optimal mix of salary vs. dividends depends on the numbers. Salary is deductible for the company but taxed as PIT for the individual. Dividends are not deductible but may attract lower effective rates. Use Buoyance's calculator to model scenarios.",
                ],
                quiz: {
                    question: "Under the NTA 2025, what is the CIT rate for a qualifying small company (turnover ≤ ₦50M)?",
                    options: ["10%", "20%", "30%", "0% — fully exempt"],
                    correctIndex: 3,
                    explanation: "Small companies (turnover ≤ ₦50M AND fixed assets ≤ ₦250M) are fully exempt from CIT, CGT, and the Development Levy.",
                },
            },
            {
                id: "to6",
                title: "Industry-Specific Optimization Tips",
                content: [
                    "Tech & Software: Maximize R&D deductions (5% of revenue). Consider whether your team's coding work qualifies as R&D. Software development, algorithm design, and system architecture often qualify.",
                    "Real Estate & Construction: Capital allowances on buildings typically offer 15% initial + 10% annual. Timing property acquisitions before year-end can create significant first-year deductions. Rental income? Structure through a company for the small company exemption if possible.",
                    "E-commerce & Retail: Take advantage of the WHT exemption for across-the-counter sales. If you're below ₦25M turnover, most of your transactions are WHT-exempt. Inventory write-downs for obsolete stock are deductible.",
                    "Professional Services (Law, Accounting, Consulting): Remember you CANNOT claim the small company CIT exemption. Focus on maximizing staff training deductions, professional subscriptions, and consider pension top-ups as a tax-efficient way to extract value from the business.",
                ],
            },
        ],
    },
    "penalties-enforcement": {
        id: "penalties-enforcement",
        title: "Penalties, Interest & Enforcement",
        description: "Understand every penalty, interest charge, and prosecution risk in Nigerian tax law — and how to avoid them.",
        lessons: [
            {
                id: "pe1",
                title: "Late Filing Penalties",
                content: [
                    "Filing penalties vary by tax type. Here's the complete breakdown:",
                    "VAT late filing: ₦50,000 for the first month of default, ₦25,000 for each subsequent month. This is PER return — if you miss 3 months, you face ₦100,000 in penalties (₦50,000 + ₦25,000 + ₦25,000).",
                    "CIT late filing: Penalty of ₦100,000 for the first month of default, plus ₦50,000 for each subsequent month the default continues. For a 3-month delay, that's ₦100,000 + ₦50,000 + ₦50,000 = ₦200,000.",
                    "PAYE late filing/remittance: 10% of the unremitted tax per annum, plus interest. Directors and principal officers can be held personally liable for PAYE non-remittance — this is one of the few tax offenses where personal liability pierces the corporate veil.",
                ],
                quiz: {
                    question: "What is the penalty for the first month of late VAT filing?",
                    options: ["₦10,000", "₦25,000", "₦50,000", "₦100,000"],
                    correctIndex: 2,
                    explanation: "The first month of VAT late filing attracts a ₦50,000 penalty, with ₦25,000 for each subsequent month.",
                },
            },
            {
                id: "pe2",
                title: "Late Payment Interest",
                content: [
                    "Late payment of tax attracts interest at the prevailing Central Bank of Nigeria (CBN) monetary policy rate. As of 2025, this rate fluctuates but has been in the range of 18%–27.5%.",
                    "Interest runs from the due date until the date of actual payment. It is calculated on a simple interest basis on the outstanding amount.",
                    "Example: If you owe ₦1,000,000 in CIT and pay 6 months late with a CBN rate of 27.5%, the interest is approximately: ₦1,000,000 × 27.5% × (6/12) = ₦137,500.",
                    "WHT late remittance: The payer (not the beneficiary) is liable for 10% penalty plus interest on the unremitted amount. Under the 2024 Regulations, failing to deduct WHT when required also attracts a penalty equal to the undeducted amount.",
                ],
                quiz: {
                    question: "What rate determines interest on late tax payments?",
                    options: ["A flat 5% per year", "CBN monetary policy rate", "10% per annum", "Prime lending rate"],
                    correctIndex: 1,
                    explanation: "Interest on late tax payments is charged at the prevailing CBN monetary policy rate, which fluctuates based on monetary policy decisions.",
                },
            },
            {
                id: "pe3",
                title: "Criminal Prosecution Risks",
                content: [
                    "Tax evasion is a criminal offense in Nigeria. The NTA 2025 strengthens enforcement powers significantly.",
                    "Offenses that can lead to prosecution:\n• Deliberately failing to file returns with intent to evade tax\n• Making false statements or returns\n• Failing to keep proper records\n• Obstructing NRS officials during an audit or investigation\n• Operating without a TIN when required",
                    "Penalties for criminal tax offenses can include: fines, imprisonment, or both. Companies may face additional sanctions including business closure orders. The severity of sentence depends on the scale of evasion and the court's discretion.",
                    "The NRS has signaled increasingly aggressive enforcement. The NTA 2025 expands investigation powers, including the ability to access electronic records and freeze bank accounts during investigations. The message is clear: compliance is not optional.",
                ],
            },
            {
                id: "pe4",
                title: "Voluntary Disclosure & Amnesty",
                content: [
                    "If you have unpaid taxes from previous years, voluntary disclosure is almost always better than waiting to be caught. Here's why:",
                    "When you come forward voluntarily, the NRS generally: reduces or waives penalties (though interest still applies), does not pursue criminal prosecution, and may offer a payment plan for the outstanding amount.",
                    "When the NRS finds you through an audit or investigation: full penalties apply, interest is calculated from the original due date, and criminal prosecution is possible for significant cases.",
                    "How to make a voluntary disclosure: (1) Engage a tax professional, (2) Calculate all outstanding liabilities accurately, (3) Prepare amended returns for all affected years, (4) Submit a formal letter to the NRS explaining the situation and requesting penalty waiver, (5) Pay the principal tax and interest promptly.",
                ],
                quiz: {
                    question: "Why is voluntary disclosure usually better than being caught?",
                    options: ["Tax is waived entirely", "Penalties are typically reduced/waived and prosecution is avoided", "Interest is cancelled", "You get a TCC automatically"],
                    correctIndex: 1,
                    explanation: "Voluntary disclosure typically results in reduced or waived penalties and avoids criminal prosecution, though interest on late payment still applies.",
                },
            },
            {
                id: "pe5",
                title: "How to Stay Penalty-Free",
                content: [
                    "The simplest way to avoid penalties is to file and pay on time, every time. Here's your penalty-avoidance checklist:",
                    "Monthly deadlines:\n• 10th — Remit PAYE deductions to SIRS\n• 21st — File VAT returns and remit VAT to NRS\n• 21st — Remit WHT deductions to NRS",
                    "Annual deadlines:\n• January 31st — File employer's annual PAYE return\n• June 30th — File CIT return (for December year-end)\n• Within 6 months of financial year-end — CIT for non-December year-ends\n• Within 18 months of incorporation — First CIT filing for new companies",
                    "Set up automated reminders in Buoyance for every deadline. Pay taxes via direct debit or standing order where possible. Keep a cash reserve specifically for tax payments — a good rule of thumb is 25–30% of profits set aside monthly.",
                ],
            },
        ],
    },
    "freelancer-tax": {
        id: "freelancer-tax",
        title: "Freelancer & Self-Employed Tax Guide",
        description: "Tax obligations for gig workers, sole proprietors, and independent contractors in Nigeria.",
        lessons: [
            {
                id: "f1",
                title: "Am I Self-Employed? Tax Registration",
                content: [
                    "If you earn income outside of traditional employment — freelancing, consulting, gig work, content creation, ride-hailing, or running your own small business — you are considered self-employed for tax purposes.",
                    "Self-employed individuals must: (1) Obtain a Tax Identification Number (TIN) from the SIRS in your state of residence, (2) Register for personal income tax, (3) File annual returns, (4) If your turnover involves taxable supplies, register for VAT.",
                    "Key advantage under NTA 2025: If your total annual income is ₦800,000 or less, you owe ZERO income tax. This is a huge relief for gig workers and part-time freelancers.",
                    "Don't assume you're invisible to the tax authority. The NRS increasingly uses data from banks, platforms (Uber, Bolt, Fiverr, Upwork), and social media to identify unregistered self-employed individuals.",
                ],
                quiz: {
                    question: "What is the first step for a freelancer to become tax compliant?",
                    options: ["Open a business bank account", "Obtain a TIN from the SIRS", "Register a company", "Hire an accountant"],
                    correctIndex: 1,
                    explanation: "The first step is obtaining a Tax Identification Number (TIN) from the State Internal Revenue Service in your state of residence.",
                },
            },
            {
                id: "f2",
                title: "Tracking Income & Invoicing",
                content: [
                    "As a self-employed person, YOU are responsible for tracking all your income — there's no employer doing it for you. This includes cash payments, bank transfers, mobile money, and crypto payments.",
                    "Best practices: (1) Open a separate bank account for business income, (2) Issue an invoice for every job (even if the client doesn't ask), (3) Record income as it's received — don't wait until year-end, (4) Keep copies of all client contracts and payment confirmations.",
                    "If you receive income from foreign sources (Upwork, Fiverr, remote work), you must declare it in Naira using the CBN exchange rate on the date of receipt. Foreign income earned by Nigerian residents is taxable.",
                    "Pro tip: Use Buoyance to automatically categorize your income by source and generate compliant invoices. This makes year-end filing dramatically easier.",
                ],
            },
            {
                id: "f3",
                title: "Deductible Business Expenses",
                content: [
                    "Self-employed individuals can deduct expenses that are 'wholly, exclusively, and necessarily' incurred for the purpose of earning income. This is the golden rule of deductibility.",
                    "Common deductible expenses for freelancers:\n• Internet and phone bills (business proportion)\n• Computer, phone, and equipment (capital allowances)\n• Software subscriptions (Canva, Adobe, Zoom, etc.)\n• Co-working space or home office rent\n• Transportation to client sites\n• Professional development courses and books\n• Website hosting and domain fees\n• Marketing and advertising costs",
                    "Home office deduction: If you work from home, you can deduct a proportion of rent, electricity, and internet based on the floor area used for business compared to total floor area.",
                    "WARNING: Personal expenses are NEVER deductible. Meals, clothing (unless uniforms), personal travel, and entertainment are not deductible even if they feel business-related. Keep clear separation between personal and business expenses.",
                ],
                quiz: {
                    question: "What is the test for whether an expense is deductible for a self-employed person?",
                    options: ["It must be over ₦10,000", "It must be wholly, exclusively, and necessarily incurred for business", "Any expense is deductible", "Only expenses with receipts are deductible"],
                    correctIndex: 1,
                    explanation: "The legal test is that the expense must be 'wholly, exclusively, and necessarily' incurred for the purpose of earning income.",
                },
            },
            {
                id: "f4",
                title: "Filing & Paying Your Tax",
                content: [
                    "Self-employed individuals file an annual tax return with the SIRS by March 31st of the year following the relevant tax year (e.g., 2026 income filed by March 31, 2027).",
                    "How to calculate your tax: Gross Income – Deductible Expenses = Net Income. Apply Rent Relief if eligible. Apply the NTA 2025 progressive rates (0% up to ₦800k, then 15%–25%). Deduct any WHT credits received during the year.",
                    "Payment can be made via bank deposit, online transfer through TaxPro-Max, or through designated collection banks. Keep all payment receipts — you'll need them for your TCC.",
                    "Consider making quarterly estimated payments to avoid a large year-end bill. Divide your expected annual tax by 4 and pay each quarter. This also demonstrates good faith if the NRS ever queries your compliance.",
                ],
                quiz: {
                    question: "By what date must self-employed individuals file their annual tax return?",
                    options: ["January 31st", "March 31st", "June 30th", "December 31st"],
                    correctIndex: 1,
                    explanation: "Self-employed individuals must file their annual tax return by March 31st of the year following the relevant tax year.",
                },
            },
            {
                id: "f5",
                title: "VAT for Freelancers & Platform Workers",
                content: [
                    "If you provide taxable services (most professional services are taxable), you must charge your clients 7.5% VAT on your invoices and remit it to the NRS monthly.",
                    "Many freelancers forget about VAT because they don't think of themselves as businesses. But if you're earning from consulting, design, software development, writing, or other professional services, VAT likely applies.",
                    "Platform workers: If you earn through platforms like Uber, Bolt, or Airbnb, the platform may be required to collect and remit VAT on your behalf under the NTA 2025. Check whether your platform handles VAT or whether you need to handle it yourself.",
                    "VAT filing is monthly, by the 21st. Even if you had no transactions in a month, you should file a nil return to avoid the ₦50,000 penalty. Use Buoyance to set reminders and file quickly.",
                ],
            },
        ],
    },
    "compliance-calendar": {
        id: "compliance-calendar",
        title: "Tax Compliance Calendar",
        description: "Month-by-month guide to every Nigerian tax deadline, filing requirement, and compliance milestone.",
        lessons: [
            {
                id: "cc1",
                title: "Monthly Obligations (Every Month)",
                content: [
                    "These deadlines repeat EVERY month and missing any of them triggers automatic penalties:",
                    "By the 10th of each month:\n• Remit PAYE deductions to the relevant SIRS\n• Remit employee pension contributions to PFA\n• Remit NHF contributions to Federal Mortgage Bank",
                    "By the 21st of each month:\n• File VAT returns and remit VAT to NRS via TaxPro-Max\n• Remit WHT deductions to NRS\n• VASPs: Submit monthly crypto transaction reports",
                    "Pro tip: Set up standing bank instructions for recurring tax payments. Create a monthly checklist in Buoyance that auto-reminds you 5 days before each deadline. Never leave tax remittance to the last day — bank processing delays can push you past the deadline.",
                ],
                quiz: {
                    question: "By which day must PAYE deductions be remitted to the SIRS each month?",
                    options: ["5th", "10th", "15th", "21st"],
                    correctIndex: 1,
                    explanation: "PAYE deductions must be remitted to the relevant State Internal Revenue Service by the 10th of the month following the deduction.",
                },
            },
            {
                id: "cc2",
                title: "Quarterly Planning Milestones",
                content: [
                    "Q1 (January – March):\n• January 31 — File employer's annual PAYE return for previous year\n• March 31 — Self-employed individuals file personal income tax return\n• Q1 is the busiest tax period — start preparing in December",
                    "Q2 (April – June):\n• June 30 — CIT filing deadline for companies with December year-end\n• Review mid-year financial performance and adjust tax estimates\n• Start gathering WHT receipts for the year so far",
                    "Q3 (July – September):\n• September 30 — CIT filing deadline for March year-end companies\n• Review capital expenditure plans — accelerate purchases for maximum capital allowances\n• Mid-year tax health check: are you on track?",
                    "Q4 (October – December):\n• Final quarter for tax optimization decisions (bonus timing, expense acceleration, asset purchases)\n• November — Begin annual PAYE reconciliation for employer returns\n• December — Finalize all year-end tax positions before books close",
                ],
                quiz: {
                    question: "When is the CIT filing deadline for companies with a December financial year-end?",
                    options: ["March 31st", "June 30th", "September 30th", "December 31st"],
                    correctIndex: 1,
                    explanation: "Companies with a December year-end must file CIT returns by June 30th — within 6 months of their financial year-end.",
                },
            },
            {
                id: "cc3",
                title: "Annual Obligations Checklist",
                content: [
                    "Every year, ensure you complete ALL of the following:\n✅ File 12 monthly VAT returns\n✅ File 12 monthly WHT remittance schedules\n✅ Remit 12 monthly PAYE deductions\n✅ File annual CIT return (within 6 months of year-end)\n✅ File employer's annual PAYE return (by Jan 31)\n✅ File personal income tax return if self-employed (by March 31)\n✅ Renew VAT registration certificate if required",
                    "Additional annual tasks:\n✅ Reconcile all WHT credits received vs. applied\n✅ Review and update TaxPro-Max registration details\n✅ Obtain or renew Tax Clearance Certificate\n✅ Audit previous year's compliance for gaps\n✅ Update company registration with CAC if any changes",
                    "For companies with employees:\n✅ Issue annual tax deduction cards to all employees\n✅ Submit Schedule of PAYE deductions with annual return\n✅ Update payroll system for any rate changes (especially important with NTA 2025 bands)\n✅ Communicate tax changes to employees",
                    "Document everything: Keep copies of all filings, receipts, and correspondence with tax authorities for a minimum of 6 years. Buoyance automatically archives all your submissions for easy retrieval.",
                ],
            },
            {
                id: "cc4",
                title: "New Business Compliance Checklist",
                content: [
                    "Starting a new business? Here's your tax compliance setup checklist in order:",
                    "Immediately after registration:\n1. Register with FIRS/NRS for TIN (within 1 month of incorporation)\n2. Register for VAT on TaxPro-Max\n3. Register with SIRS in the state(s) where employees will work\n4. Register with Pension Fund Administrator (PFA)",
                    "Within the first year:\n5. Set up payroll system with correct PIT bands and reliefs\n6. Begin monthly VAT and WHT filings (even nil returns)\n7. Open a dedicated tax savings account (set aside 25–30% of profits monthly)\n8. File your first CIT return within 18 months of incorporation",
                    "Ongoing:\n9. Maintain proper books of account (required by law)\n10. Issue WHT receipts for all applicable payments\n11. Keep employee records updated for PAYE\n12. Apply for TCC once you have 3 years of compliance history",
                ],
                quiz: {
                    question: "Within how many months of incorporation must a new company file its first CIT return?",
                    options: ["6 months", "12 months", "18 months", "24 months"],
                    correctIndex: 2,
                    explanation: "New companies must file their first CIT return within 18 months of incorporation.",
                },
            },
        ],
    },
    "transfer-pricing": {
        id: "transfer-pricing",
        title: "Transfer Pricing Essentials",
        description: "Understand Nigeria's arm's length rules, documentation requirements, and how to manage related-party transactions.",
        lessons: [
            {
                id: "tp1",
                title: "What Is Transfer Pricing?",
                content: [
                    "Transfer pricing refers to the prices at which goods, services, or intangibles are transferred between related parties (connected persons). The NRS closely scrutinizes these transactions to ensure they reflect market-rate pricing.",
                    "The Arm's Length Principle (ALP) is the cornerstone of Nigeria's transfer pricing rules: transactions between related parties must be conducted at prices and conditions that unrelated parties would agree to in comparable circumstances.",
                    "Nigeria's TP regime is governed by the Income Tax (Transfer Pricing) Regulations 2018 (TPR), which superseded the 2012 regulations. The NTA 2025 reinforces these rules under Section 192, requiring that both the pricing OUTCOME and the PROCESS used to determine it align with the ALP.",
                    "TP applies to BOTH cross-border AND domestic related-party transactions. Many Nigerian businesses mistakenly think TP only applies to multinational companies — it doesn't.",
                ],
                quiz: {
                    question: "What is the fundamental principle behind Nigeria's transfer pricing rules?",
                    options: ["Lowest price principle", "Arm's Length Principle", "Fair market value", "Cost-plus principle"],
                    correctIndex: 1,
                    explanation: "The Arm's Length Principle requires that related-party transactions be conducted at prices comparable to those between independent parties in similar circumstances.",
                },
            },
            {
                id: "tp2",
                title: "Who Are 'Connected Persons'?",
                content: [
                    "The TPR defines 'connected persons' broadly: enterprises where one person directly or indirectly participates in the management, control, or capital of the other, or where a third person controls both.",
                    "Examples of connected persons:\n• A parent company and its subsidiary\n• Two subsidiaries of the same parent\n• A company and its director (or director's close relatives)\n• A company and another entity sharing common shareholders\n• A Nigerian company and its foreign affiliate",
                    "If you are a connected person, ALL transactions between you — sales, purchases, loans, management fees, royalties, cost-sharing arrangements — are subject to the ALP and may require TP documentation.",
                    "The NRS can adjust your taxable profits if they determine your related-party transactions don't conform to the ALP. This can lead to additional tax, penalties, and interest.",
                ],
            },
            {
                id: "tp3",
                title: "TP Documentation Requirements",
                content: [
                    "Nigerian TP regulations mandate contemporaneous documentation to prove your related-party pricing follows the ALP. This documentation is your primary defense during a TP audit.",
                    "Companies with total intercompany transactions of ₦300 million or more per year must maintain contemporaneous TP documentation. Below ₦300 million, documentation must be prepared within 90 days of receiving an NRS notice.",
                    "Required documentation includes:\n• Organization structure and business overview\n• Description of each controlled transaction\n• Functional analysis (functions performed, assets used, risks assumed)\n• Comparability analysis and benchmarking study\n• Selection and application of the most appropriate TP method\n• Financial data supporting the arm's length pricing",
                    "Additionally, all taxpayers must file a TP Declaration form as part of their annual tax return, and a TP Disclosure form detailing each related-party transaction.",
                ],
                quiz: {
                    question: "Above what total annual intercompany transaction value must contemporaneous TP documentation be maintained?",
                    options: ["₦100 million", "₦200 million", "₦300 million", "₦500 million"],
                    correctIndex: 2,
                    explanation: "Companies with total intercompany transactions of ₦300 million or more per year must maintain contemporaneous TP documentation at all times.",
                },
            },
            {
                id: "tp4",
                title: "Advance Pricing Agreements (APAs)",
                content: [
                    "In January 2025, the NRS introduced Nigeria's first-ever Advance Pricing Agreement (APA) Guidelines. An APA allows you to agree your TP methodology with the NRS in advance, providing certainty for up to 3 years.",
                    "To qualify, you must meet minimum thresholds: USD 10 million per year for each covered transaction, or USD 50 million aggregate for a group of transactions. The non-refundable application fee is USD 20,000, with a renewal fee of USD 5,000.",
                    "Benefits of an APA: eliminates TP audit risk for covered transactions, provides certainty for tax planning, and can be rolled back to cover up to 3 prior years if the transactions were identical.",
                    "APAs are recommended for companies with large, recurring related-party transactions (e.g., management fees, royalty payments, intercompany financing). The upfront cost is high, but the audit protection and certainty can be extremely valuable.",
                ],
                quiz: {
                    question: "What is the maximum duration of an Advance Pricing Agreement in Nigeria?",
                    options: ["1 year", "2 years", "3 years", "5 years"],
                    correctIndex: 2,
                    explanation: "APAs in Nigeria have a maximum duration of 3 years and can be renewed upon expiration.",
                },
            },
            {
                id: "tp5",
                title: "Penalties for TP Non-Compliance",
                content: [
                    "Transfer pricing penalties are severe. The minimum administrative penalty for unmet TP compliance requirements is ₦10 million — one of the highest minimum penalties in Nigerian tax law.",
                    "Specific penalties include:\n• Failure to file a TP declaration: fines and potential prosecution\n• Failure to file a TP disclosure form: fines per transaction\n• Incorrect disclosure of transactions: fines plus potential TP adjustment\n• Failure to provide TP documentation on request: fines plus adverse inference (NRS assumes the worst)",
                    "If the NRS adjusts your profits after a TP audit, you face: additional CIT at 30% on the adjusted amount, plus the 4% Development Levy, plus interest at the CBN monetary policy rate from the original due date.",
                    "Best practice: Invest in proper TP documentation proactively. The cost of compliance is far less than the cost of a TP adjustment. Use Buoyance to track all related-party transactions and generate documentation templates.",
                ],
            },
        ],
    },
    "stamp-duty": {
        id: "stamp-duty",
        title: "Stamp Duty & Electronic Levies",
        description: "Navigate Nigeria's stamp duty rules, the ₦50 electronic transfer levy, and property duty rates under the NTA 2025.",
        lessons: [
            {
                id: "sd1",
                title: "What Is Stamp Duty?",
                content: [
                    "Stamp duty is a tax you pay to make certain documents legally enforceable. Under the NTA 2025 (Sections 124–127), it replaces the old Stamp Duties Act, Cap S8 LFN 2004.",
                    "Dutiable instruments include: agreements, contracts, leases, property transfers, share allotments, loan agreements, powers of attorney, insurance policies, and receipts.",
                    "A key 2020 reform expanded the definition of 'instrument' to include electronic documents, e-mails, SMS, instant messages, and even documents stored on cloud platforms. If an electronic document executed outside Nigeria is accessed from a device within Nigeria, it is deemed received in Nigeria and subject to stamp duty.",
                    "Who pays? Generally, the party required to bear the cost is specified in the instrument. If not specified, the buyer or recipient typically pays. NRS collects duties on corporate transactions; state IRS handles transactions between individuals.",
                ],
                quiz: {
                    question: "Under the NTA 2025, which law governs stamp duty?",
                    options: ["Stamp Duties Act Cap S8", "Finance Act 2019", "NTA 2025 Sections 124-127", "Companies Income Tax Act"],
                    correctIndex: 2,
                    explanation: "The NTA 2025 consolidates stamp duty provisions under Sections 124-127, replacing the old Stamp Duties Act.",
                },
            },
            {
                id: "sd2",
                title: "The ₦50 Electronic Transfer Levy (EMTL)",
                content: [
                    "The most commonly encountered stamp duty is the ₦50 Electronic Money Transfer Levy — a flat fee on electronic transfers of ₦10,000 or more.",
                    "Key details:\n• Applies to bank transfers, POS transactions, mobile money, and online payments of ₦10,000+\n• The fee is ₦50 per transaction — it does NOT scale with the transfer amount\n• Effective January 1, 2026, the levy is now paid by the SENDER (previously the recipient)\n• Exemptions: transfers below ₦10,000, salary payments, and transfers between your own accounts at the same bank",
                    "This levy generates billions in revenue annually. Every time you make a transfer of ₦10,000 or more, that ₦50 is automatically deducted by your bank and remitted to the NRS.",
                    "For businesses processing many transactions, this adds up. Consider consolidating smaller payments into fewer, larger transfers where practical to minimize the per-transaction cost.",
                ],
                quiz: {
                    question: "Who pays the ₦50 EMTL from January 1, 2026?",
                    options: ["The recipient", "The sender", "Both parties share it", "The bank absorbs it"],
                    correctIndex: 1,
                    explanation: "From January 1, 2026, the ₦50 Electronic Money Transfer Levy is now paid by the sender, not the recipient.",
                },
            },
            {
                id: "sd3",
                title: "Property & Share Transfer Duties",
                content: [
                    "Property transfers attract some of the highest stamp duty rates. Under the NTA 2025, conveyance rates are tiered:\n• First ₦10 million: 1.5%\n• ₦10 million to ₦50 million: 2%\n• Above ₦50 million: 2.5%",
                    "Share capital and allotments: ₦50–₦75 per ₦1,000 of share value, depending on the type. Loan capital: ₦50 per ₦1,000. Bills of exchange: ₦50 per ₦1,000.",
                    "Lease agreements: 0.78% of the total rent over the lease term. For a 3-year lease at ₦2 million/year, the duty would be: ₦6,000,000 × 0.78% = ₦46,800.",
                    "General agreements (non-transfer): A flat fee of ₦1,000. This covers most commercial contracts, NDAs, service agreements, and similar documents.",
                ],
            },
            {
                id: "sd4",
                title: "Stamp Duty Compliance Tips",
                content: [
                    "An unstamped or inadequately stamped document is NOT admissible as evidence in Nigerian courts. This is the primary enforcement mechanism — it makes compliance essential for legal protection.",
                    "Stamping methods available: adhesive stamps, die stamps, direct electronic printing, electronic tagging, or a stamp duty certificate. Electronic stamping through the NRS portal is increasingly the standard.",
                    "Timing: Instruments should be stamped within 40 days of execution. Late stamping attracts penalties — typically the duty amount plus a percentage surcharge. The longer you wait, the higher the penalty.",
                    "Practical tips:\n• Stamp all contracts and agreements at execution — don't wait until litigation\n• Include stamp duty costs in your project budgets\n• For property transactions, factor in stamp duty when calculating total acquisition cost\n• Keep stamped copies of all instruments in your records for at least 6 years",
                ],
                quiz: {
                    question: "What is the consequence of failing to stamp a dutiable document in Nigeria?",
                    options: ["A small fine", "The document is not admissible in court", "Nothing happens", "The NRS automatically stamps it"],
                    correctIndex: 1,
                    explanation: "Unstamped or inadequately stamped documents are not admissible as evidence in Nigerian courts, making stamping essential for legal enforceability.",
                },
            },
        ],
    },
    "development-levy": {
        id: "development-levy",
        title: "Development Levy & Other Levies",
        description: "Understand the 4% Development Levy, its components (TETFund, NASENI, NITDA), and which companies are exempt.",
        lessons: [
            {
                id: "dl1",
                title: "The 4% Development Levy Explained",
                content: [
                    "The NTA 2025 introduces a unified 4% Development Levy on the assessable profits of companies chargeable to CIT. This replaces several previously separate levies including the Tertiary Education Tax.",
                    "The 4% is distributed to designated development agencies:\n• TETFund (Tertiary Education Trust Fund): 50% — funding universities, polytechnics, and colleges of education\n• NASENI (National Agency for Science & Engineering Infrastructure): receives a portion for R&D funding\n• NITDA (National Information Technology Development Agency): receives a portion for ICT development",
                    "Effectively, the 4% Development Levy functions as a surcharge on top of the 30% CIT rate for non-small companies. This means the combined rate is 34% (30% CIT + 4% Development Levy).",
                    "The Development Levy is calculated on ASSESSABLE PROFITS — the same base used for CIT. It is payable alongside CIT and filed as part of the annual CIT return.",
                ],
                quiz: {
                    question: "What percentage of the Development Levy goes to TETFund?",
                    options: ["25%", "33%", "50%", "100%"],
                    correctIndex: 2,
                    explanation: "TETFund receives 50% of the 4% Development Levy proceeds, meaning an effective 2% of assessable profits funds tertiary education.",
                },
            },
            {
                id: "dl2",
                title: "Tertiary Education Tax Background",
                content: [
                    "The Tertiary Education Tax (TET) existed since 1993, originally at 2%. The Finance Act 2023 increased it to 3% of assessable profits. Under the NTA 2025, it has been merged into the unified Development Levy.",
                    "TETFund uses the proceeds to: construct and renovate university buildings, equip laboratories and libraries, provide academic staff training and development, fund research grants, and support Book Development.",
                    "Although the standalone TET no longer exists, its funding is preserved through the Development Levy structure. Companies effectively still contribute approximately 2% (50% of the 4% levy) to education.",
                    "This matters for your tax calculations: when budgeting for tax, don't forget the Development Levy. A company with ₦100 million in assessable profits pays ₦30M in CIT + ₦4M in Development Levy = ₦34M total federal tax.",
                ],
            },
            {
                id: "dl3",
                title: "NASENI Levy & NITDA Levy",
                content: [
                    "NASENI Levy: Before the NTA 2025, companies with turnover above ₦100 million paid a separate 0.25% levy on pre-tax profits to fund NASENI. This has been consolidated into the Development Levy.",
                    "NITDA Levy: Companies in the ICT sector (or companies whose turnover exceeded certain thresholds) previously paid 1% of pre-tax profits to NITDA. This too has been consolidated under the Development Levy.",
                    "The consolidation simplifies compliance — instead of tracking and filing three separate levies (TET, NASENI, NITDA), companies now file a single 4% Development Levy with their CIT return.",
                    "For tax planning purposes, remember that these levies are NOT deductible when calculating CIT. The Development Levy is computed on the same assessable profits figure used for CIT, not on the post-CIT amount.",
                ],
                quiz: {
                    question: "What was the previous NASENI levy rate before consolidation into the Development Levy?",
                    options: ["0.1% of pre-tax profits", "0.25% of pre-tax profits", "1% of pre-tax profits", "2% of pre-tax profits"],
                    correctIndex: 1,
                    explanation: "The NASENI levy was 0.25% of pre-tax profits for companies with turnover above ₦100 million, now consolidated into the 4% Development Levy.",
                },
            },
            {
                id: "dl4",
                title: "Exemptions & Practical Tips",
                content: [
                    "Small companies (turnover ≤ ₦100 million AND fixed assets ≤ ₦250 million) are EXEMPT from the Development Levy — just as they are exempt from CIT and CGT. This makes the small company classification extremely valuable.",
                    "Unincorporated businesses (sole proprietors, partnerships) are NOT subject to the Development Levy. It only applies to incorporated companies chargeable to CIT.",
                    "Companies in a loss position: The Development Levy is charged on assessable profits. If your assessable profit is zero or negative (loss), no Development Levy is payable for that year.",
                    "Planning tip: The combined 34% federal tax rate (CIT + Development Levy) means that for every ₦100 in profit, ₦34 goes to federal taxes. Factor this into pricing, budgeting, and investment decisions. Use Buoyance's CIT calculator to model your total liability including the Development Levy.",
                ],
            },
        ],
    },
    "double-taxation": {
        id: "double-taxation",
        title: "Double Taxation Treaties",
        description: "Understand how Nigeria's DTTs prevent being taxed twice, which countries are covered, and how to claim relief.",
        lessons: [
            {
                id: "dt1",
                title: "What Are Double Taxation Treaties?",
                content: [
                    "A Double Taxation Treaty (DTT) — also called a Double Taxation Agreement (DTA) — is a bilateral agreement between two countries to prevent the same income from being taxed in both jurisdictions.",
                    "DTTs work by: allocating taxing rights between the two countries (source country vs. residence country), providing reduced withholding tax rates on cross-border payments (dividends, interest, royalties), and allowing foreign tax credits to offset domestic tax liability.",
                    "For Nigerian businesses with international operations — importing, exporting, receiving foreign investment, or paying foreign consultants — DTTs can significantly reduce your overall tax burden.",
                    "Nigeria also participates in the ECOWAS Community rules for Elimination of Double Taxation, effective from January 1, 2024, which applies to all ECOWAS member states.",
                ],
                quiz: {
                    question: "What is the primary purpose of a Double Taxation Treaty?",
                    options: ["To increase tax collection", "To prevent the same income from being taxed in two countries", "To eliminate all cross-border taxes", "To standardize tax rates globally"],
                    correctIndex: 1,
                    explanation: "DTTs prevent double taxation by allocating taxing rights, reducing WHT rates, and allowing foreign tax credits between the treaty countries.",
                },
            },
            {
                id: "dt2",
                title: "Nigeria's Treaty Partners",
                content: [
                    "Nigeria currently has active DTTs with 15 countries:\n• Belgium\n• Canada (effective 2000)\n• China\n• Czech Republic\n• France\n• Netherlands (effective 1993, being renegotiated in 2025)\n• Pakistan\n• Philippines\n• Romania\n• Singapore\n• Slovakia\n• South Africa (effective 2009)\n• Spain\n• Sweden\n• United Kingdom (effective 1988)",
                    "The UK treaty is Nigeria's oldest (1987) and most frequently used. The Netherlands treaty is being renegotiated as of July 2025 to align with recent Nigerian tax reforms and OECD standards.",
                    "If you do business with countries NOT on this list (e.g., USA, Germany, India, UAE), there is no DTT protection. You may be subject to double taxation, mitigated only by unilateral foreign tax credit provisions in the NTA 2025.",
                    "ECOWAS members (Ghana, Senegal, Côte d'Ivoire, etc.) are covered by the Community rules, providing some DTT-like protections even without bilateral treaties.",
                ],
                quiz: {
                    question: "How many countries does Nigeria currently have active DTTs with?",
                    options: ["5", "10", "15", "25"],
                    correctIndex: 2,
                    explanation: "Nigeria has active Double Taxation Treaties with 15 countries, including the UK, Canada, South Africa, Netherlands, China, and France.",
                },
            },
            {
                id: "dt3",
                title: "How DTTs Reduce Withholding Tax",
                content: [
                    "One of the most practical benefits of DTTs is reduced WHT rates on cross-border payments. Without a DTT, Nigeria applies domestic WHT rates (which can be high for non-residents).",
                    "Example: A Nigerian company paying management fees to a UK consultant. Without the DTT, WHT would be 10% (non-resident rate). Under the Nigeria-UK DTT, the rate may be reduced depending on the specific treaty article.",
                    "To claim DTT benefits: (1) Confirm the treaty exists and covers the payment type, (2) Obtain a Certificate of Residence from the recipient's tax authority, (3) Apply the reduced treaty rate when making the deduction, (4) File the WHT return indicating the treaty application.",
                    "Important: You CANNOT claim DTT benefits retroactively if you applied the full domestic rate. Get it right at the time of payment. Engage a tax professional for complex cross-border arrangements.",
                ],
            },
            {
                id: "dt4",
                title: "Foreign Tax Credits",
                content: [
                    "If you've paid tax in a treaty country, you can generally claim a foreign tax credit against your Nigerian tax liability on the same income. This prevents paying full tax in both countries.",
                    "Under the NTA 2025: foreign tax paid in a country with a DTT is allowed as a credit against Nigerian tax payable on that income. The credit is limited to the Nigerian tax attributable to that foreign income.",
                    "For countries WITHOUT a DTT, the NTA 2025 still provides unilateral relief — but the rules are more restrictive. Consult a tax professional to maximize available credits.",
                    "Documentation required: foreign tax return, evidence of tax payment in the other country, proof of income earned abroad, and the relevant DTT article under which you're claiming relief.",
                ],
                quiz: {
                    question: "If Nigeria has no DTT with a country, can you still get relief from double taxation?",
                    options: ["No, you pay full tax in both countries", "Yes, through unilateral foreign tax credit provisions in the NTA 2025", "Only if the other country offers the relief", "Only for amounts under ₦1 million"],
                    correctIndex: 1,
                    explanation: "Even without a DTT, the NTA 2025 provides unilateral relief through foreign tax credit provisions, though the rules are more restrictive than under a treaty.",
                },
            },
        ],
    },
    "state-local-taxes": {
        id: "state-local-taxes",
        title: "State & Local Taxes",
        description: "Navigate state-level taxes beyond PAYE — hotel occupancy, land use charge, business premises, and development levies.",
        lessons: [
            {
                id: "sl1",
                title: "Overview: Who Collects What?",
                content: [
                    "Nigeria's tax system operates at three levels, each with distinct taxes:\n• Federal (NRS): CIT, VAT, WHT, Stamp Duty, CGT (companies), Development Levy\n• State (SIRS): PIT/PAYE, WHT (individuals), CGT (individuals), State Development Levy, Business Premises, Hotel Occupancy\n• Local Government: Market taxes, parking levies, naming fees, tenement rates",
                    "The Taxes and Levies (Approved List for Collection) Act specifies which government level can collect which taxes. Paying the wrong authority doesn't discharge your obligation — you must pay the correct one.",
                    "Many businesses focus on federal taxes and forget state obligations. But state taxes — especially PIT/PAYE, business premises, and hotel occupancy — can add up significantly and non-compliance triggers penalties.",
                    "Each state has its own Internal Revenue Service (SIRS) with different administration, systems, and sometimes different interpretations of the same laws. Lagos LIRS, for example, has a fully digital filing system.",
                ],
                quiz: {
                    question: "Which level of government collects Personal Income Tax in Nigeria?",
                    options: ["Federal (NRS)", "State (SIRS)", "Local Government", "All three"],
                    correctIndex: 1,
                    explanation: "Personal Income Tax is collected by the State Internal Revenue Service (SIRS) in the state where the individual is resident.",
                },
            },
            {
                id: "sl2",
                title: "Hotel Occupancy & Consumption Tax",
                content: [
                    "Several states impose a Hotel Occupancy and Restaurant Consumption (HORC) tax. This is separate from and IN ADDITION TO the 7.5% federal VAT.",
                    "Lagos State example: A 5% Hotel Occupancy and Restaurant Consumption Tax applies to accommodation charges, use of hotel facilities, and sale of food and beverages in hotels, restaurants, and event centers. The LIRS administers and collects this tax.",
                    "Other states have similar laws — Oyo, Rivers, and Abuja FCT all have hotel consumption taxes. Rates and scope vary by state, so check your specific state's laws.",
                    "If you operate in the hospitality sector: you must register with your state IRS for this tax, collect it from guests (separately identifiable on invoices), and remit it monthly. Non-compliance can lead to venue closure orders.",
                ],
            },
            {
                id: "sl3",
                title: "Business Premises & Land Use Charge",
                content: [
                    "Business Premises Registration: Every business operating in a state must register its premises with the state government. Registration fees vary by location (urban vs. rural) and business size.",
                    "Land Use Charge: A property tax imposed on land and building owners, calculated based on property value, location, type, and use. Lagos State reviewed its Land Use Charge Law in 2020 with reduced rates compared to the 2018 version.",
                    "Rates are typically different for: owner-occupied residential properties (lowest), commercial properties, and industrial properties (highest). Market valuations by the state determine the assessment.",
                    "Consequences of non-payment: penalties, fines, legal action, and in extreme cases, government seizure of the property. Pay your Land Use Charge annually — it's a small cost compared to the risk.",
                ],
                quiz: {
                    question: "What is the Land Use Charge based on?",
                    options: ["Business turnover", "Number of employees", "Property value, location, and type", "Monthly rent paid"],
                    correctIndex: 2,
                    explanation: "Land Use Charge is a property tax calculated based on the value, location, type, and use of land and buildings.",
                },
            },
            {
                id: "sl4",
                title: "State Development Levy & Other Levies",
                content: [
                    "State Development Levy: A mandatory contribution to fund state infrastructure and services. Rates vary by state, typically ₦100–₦500 annually for individuals. Businesses may face higher scaled fees.",
                    "This is separate from the federal 4% Development Levy on company profits. A company can owe BOTH the federal and state development levies — they are imposed by different government tiers.",
                    "Other common state/local levies:\n• Signage/advertisement fees — for outdoor signs and billboards\n• Liquor license fees — for businesses selling alcohol\n• Market stall fees — for market traders\n• Parking levies — in commercial areas\n• Naming fees — for naming buildings or streets",
                    "Best practice: When setting up a business in a new state, visit the state IRS website or office to understand ALL applicable state and local taxes. Register proactively — it's cheaper than being discovered and penalized.",
                ],
            },
        ],
    },
    "employment-benefits-tax": {
        id: "employment-benefits-tax",
        title: "Employment Benefits Taxation",
        description: "How employer-provided housing, company cars, meals, and other benefits are taxed under the NTA 2025.",
        lessons: [
            {
                id: "eb1",
                title: "Benefits in Kind (BIK) Overview",
                content: [
                    "Under the NTA 2025, all forms of remuneration — including non-cash benefits — are included in the PAYE base. If your employer provides you with housing, a car, meals, or other perks, these have a taxable value.",
                    "Benefits in Kind (BIK) are valued and added to your gross income before computing PAYE. The NTA 2025 introduces specific valuation rules for common benefits, replacing the previous ad hoc approach.",
                    "This affects both employers (who must calculate and withhold PAYE on BIK values) and employees (who see the BIK value on their payslips and should verify calculations).",
                    "The key principle: if your employer provides something that would otherwise cost you money, it's likely a taxable benefit unless specifically exempted by law.",
                ],
                quiz: {
                    question: "Under the NTA 2025, how are non-cash employment benefits treated for tax?",
                    options: ["They are all tax-exempt", "They are valued and added to gross income for PAYE", "Only benefits over ₦1 million are taxed", "They are taxed separately from salary"],
                    correctIndex: 1,
                    explanation: "All forms of remuneration including non-cash benefits are included in the PAYE base under the NTA 2025, with specific valuation rules for common benefits.",
                },
            },
            {
                id: "eb2",
                title: "Employer-Provided Housing",
                content: [
                    "If your employer provides rent-free accommodation, the taxable value is capped at 20% of your gross income (excluding the accommodation value itself). This cap prevents over-taxation in areas with expensive housing.",
                    "The valuation is typically based on the local government's property assessment or the tax authority's determination. If you share the accommodation or occupy it for only part of the year, the benefit is prorated.",
                    "Important distinction: Rent Relief (the deduction of 20% of rent paid, capped at ₦500,000) is for employees who pay their OWN rent. If your employer provides housing, you get the BIK instead — you cannot claim BOTH.",
                    "Planning tip for employers: Consider providing a housing allowance instead of actual accommodation. This gives the employee flexibility and may result in a lower taxable amount if their actual rent is below the BIK valuation.",
                ],
            },
            {
                id: "eb3",
                title: "Company Cars & Other Assets",
                content: [
                    "A company car provided for personal use is valued at 5% of the asset's acquisition cost per year. If the cost is unknown, the market value at acquisition is used.",
                    "Example: Company car acquired for ₦15,000,000 → Annual BIK = ₦15,000,000 × 5% = ₦750,000 added to your taxable income. At a 25% marginal rate, this costs you ₦187,500 in additional tax per year.",
                    "Employee contributions reduce the taxable value: if you contribute ₦200,000 toward the car's costs (fuel, maintenance), the BIK is reduced by that amount.",
                    "Other taxable benefits include: employer-paid school fees for employee's children, club memberships, personal phone bills, personal travel funded by employer, and interest-free or below-market-rate loans.",
                ],
                quiz: {
                    question: "At what rate is a company car valued as a benefit in kind?",
                    options: ["2% of cost per year", "5% of cost per year", "10% of cost per year", "20% of cost per year"],
                    correctIndex: 1,
                    explanation: "Company cars are valued at 5% of the asset's acquisition cost per year for benefit in kind purposes.",
                },
            },
            {
                id: "eb4",
                title: "Exempt Benefits & Planning Tips",
                content: [
                    "Certain employer-provided benefits are NOT taxable:\n• Pension contributions (employer's share, within statutory limits)\n• Group life insurance premiums (mandatory under Pension Act)\n• Medical expenses or health insurance (NHIS contributions)\n• Meals provided in employer canteens (general staff benefit)\n• Relocation expenses (reasonable, documented, one-time)\n• Training and development costs directly related to the job",
                    "Planning for employers: Structure compensation packages to maximize exempt benefits. For example, providing health insurance and pension top-ups is more tax-efficient than equivalent cash salary increases.",
                    "Planning for employees: Review your payslip to ensure BIK values are correctly calculated. An overvalued housing benefit or company car means you're overpaying PAYE.",
                    "Record-keeping: Both employers and employees should document all benefits provided, their valuation basis, and any employee contributions. This is essential for PAYE reconciliation and audit defense.",
                ],
            },
        ],
    },
    "taxpro-max-guide": {
        id: "taxpro-max-guide",
        title: "TaxPro-Max Portal Guide",
        description: "Step-by-step guide to registering, filing returns, making payments, and managing your tax account on the NRS TaxPro-Max portal.",
        lessons: [
            {
                id: "tm1",
                title: "Getting Started: Registration",
                content: [
                    "TaxPro-Max (https://taxpromax.firs.gov.ng) is the NRS's official online platform for tax registration, filing, payment, and compliance management. All federal tax filings must go through TaxPro-Max.",
                    "For NEW companies: (1) Register your business with CAC first and receive a TIN, (2) Go to TaxPro-Max and click 'Register', (3) Select 'Corporate Affairs Commission' as your registration source, (4) Enter your CAC registration number (RC for companies, BN for enterprises), (5) The system auto-populates your company details from CAC.",
                    "Next: Request an OTP via email or phone → Validate the OTP → Update your taxpayer information (address, phone, email, business description) → Set your accounting year-end → Select your preferred NRS tax office → Create your authorized user login → Submit.",
                    "Upon successful registration, your username and password are sent to your email. Log in and you'll see your dashboard with all taxes due, filing history, and compliance status.",
                ],
                quiz: {
                    question: "What is the first step to register on TaxPro-Max for a new company?",
                    options: ["File your first return", "Register with CAC and obtain a TIN", "Pay a registration fee to NRS", "Visit the nearest NRS office"],
                    correctIndex: 1,
                    explanation: "You must first register with CAC and obtain a TIN, then use your CAC registration number to self-register on the TaxPro-Max portal.",
                },
            },
            {
                id: "tm2",
                title: "Filing Tax Returns",
                content: [
                    "To file a return: Log in → Click 'Taxes Due' on your dashboard → Select the tax type (VAT, CIT, WHT, etc.) → Under 'Action', click 'Process' to begin.",
                    "For VAT returns: Complete the required schedules — sales adjustment, exempt and zero-rated goods/services, input VAT details. The VAT form auto-loads after all schedules are completed. Enter total sales/income (exclusive of VAT), select currency (NGN), and tick the declaration box.",
                    "For CIT returns: Upload or enter your audited financial statements, complete the tax computation schedule (assessable profits, capital allowances, reliefs), attach WHT credit certificates, and submit.",
                    "After submission, a Document Identity Number (DIN) is generated. This DIN is your receipt — save it. The system then prompts you to pay (full or installments). Payment goes through the Remita platform or you can print a payment slip for bank deposit.",
                ],
            },
            {
                id: "tm3",
                title: "Making Payments & Tracking Status",
                content: [
                    "Payment options: (1) Online via Remita (credit/debit card, bank transfer), (2) Bank deposit using the generated Payment Reference (RR) code, (3) USSD for mobile payments where available.",
                    "After payment, print or save the payment acknowledgment slip. This is your proof of tax payment. Upload it to your records and keep copies for TCC applications.",
                    "Tracking your compliance: Your TaxPro-Max dashboard shows all filings, outstanding obligations, payment history, and compliance status. Check this regularly — especially before applying for a TCC.",
                    "Tax Clearance Certificate: Once your compliance is confirmed on TaxPro-Max, you can request and download your TCC directly from the portal. This is much faster than the manual process.",
                ],
                quiz: {
                    question: "What reference code is needed for bank deposit tax payments?",
                    options: ["TIN number", "DIN number", "Payment Reference (RR) code", "CAC registration number"],
                    correctIndex: 2,
                    explanation: "The Payment Reference (RR) code generated by TaxPro-Max is used when making tax payments via bank deposit. The system connects through the Remita platform.",
                },
            },
            {
                id: "tm4",
                title: "Tips & Troubleshooting",
                content: [
                    "Common issues and solutions:\n• Can't log in: Verify email/password, check internet connection, try a different browser. If your account isn't activated, contact your assigned NRS tax office.\n• Missing taxes on dashboard: Your tax types may not be registered. Visit your NRS tax office to add missing obligations.\n• Filing errors: Double-check all schedules before submitting. Once submitted, amendments require contacting NRS directly.",
                    "Authorized agents: You can authorize your accountant or tax consultant to file on your behalf. This is done through the 'E-Service Activation' section of your account settings.",
                    "Hard copy option: If you prefer, you can visit a local NRS tax office where staff can upload your documents. Do this at least 2 weeks before the deadline to avoid queues.",
                    "Pro tips:\n• File early — don't wait until the deadline day (system often slows under heavy load)\n• Save draft returns if you can't complete in one session\n• Use Buoyance to generate compliant computations and schedules, then upload to TaxPro-Max\n• Cross-check every field — the system doesn't auto-detect errors",
                ],
            },
        ],
    },
};

// Fallback for courses not yet in the database
function getFallbackCourse(courseId: string): CourseData {
    return {
        id: courseId,
        title: courseId.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
        description: "This course is being prepared. Check back soon for full content.",
        lessons: [
            {
                id: "preview",
                title: "Course Preview",
                content: [
                    "This course content is currently being developed by our tax education team.",
                    "In the meantime, explore the Tax Library for reference material on this topic.",
                    "Check the Knowledge Base for searchable Nigerian tax law excerpts.",
                ],
            },
        ],
    };
}

function CourseViewerContent() {
    const { courseId } = useParams<{ courseId: string }>();
    const [currentLesson, setCurrentLesson] = useState(0);
    const [quizAnswer, setQuizAnswer] = useState<string | null>(null);
    const [quizSubmitted, setQuizSubmitted] = useState(false);
    const [completedLessons, setCompletedLessons] = useState<Set<number>>(new Set());

    const course = courseDatabase[courseId || ""] || getFallbackCourse(courseId || "unknown");
    const lesson = course.lessons[currentLesson];
    const progress = Math.round((completedLessons.size / course.lessons.length) * 100);

    const handleNext = () => {
        setCompletedLessons((prev) => new Set([...prev, currentLesson]));
        if (currentLesson < course.lessons.length - 1) {
            setCurrentLesson(currentLesson + 1);
            setQuizAnswer(null);
            setQuizSubmitted(false);
        }
    };

    const handlePrev = () => {
        if (currentLesson > 0) {
            setCurrentLesson(currentLesson - 1);
            setQuizAnswer(null);
            setQuizSubmitted(false);
        }
    };

    const isCorrect = lesson.quiz && quizAnswer === String(lesson.quiz.correctIndex);
    const allCompleted = completedLessons.size === course.lessons.length;

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Header />
            <main className="flex-1 pt-20 md:pt-28 pb-16">
                <div className="container mx-auto px-4 md:px-6 max-w-4xl">
                    {/* Back link */}
                    <Link to="/academy" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6">
                        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Academy
                    </Link>

                    {/* Course Header */}
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold mb-2">{course.title}</h1>
                        <p className="text-muted-foreground mb-4">{course.description}</p>
                        <div className="flex items-center gap-4">
                            <div className="flex-1">
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-muted-foreground">
                                        Lesson {currentLesson + 1} of {course.lessons.length}
                                    </span>
                                    <span className="font-medium">{progress}% complete</span>
                                </div>
                                <Progress value={progress} className="h-2" />
                            </div>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-[240px_1fr] gap-6">
                        {/* Lesson Sidebar */}
                        <Card className="h-fit">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">LESSONS</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-1 p-3">
                                {course.lessons.map((l, i) => (
                                    <button
                                        key={l.id}
                                        onClick={() => { setCurrentLesson(i); setQuizAnswer(null); setQuizSubmitted(false); }}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${i === currentLesson
                                            ? "bg-primary/10 text-primary font-medium"
                                            : "hover:bg-muted text-muted-foreground"
                                            }`}
                                    >
                                        {completedLessons.has(i) ? (
                                            <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                                        ) : (
                                            <BookOpen className="h-4 w-4 flex-shrink-0" />
                                        )}
                                        <span className="truncate">{l.title}</span>
                                    </button>
                                ))}
                            </CardContent>
                        </Card>

                        {/* Lesson Content */}
                        <div className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline">Lesson {currentLesson + 1}</Badge>
                                        {completedLessons.has(currentLesson) && (
                                            <Badge className="bg-green-100 text-green-800">Completed</Badge>
                                        )}
                                    </div>
                                    <CardTitle className="text-xl">{lesson.title}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {lesson.content.map((paragraph, i) => (
                                        <p key={i} className="text-sm leading-relaxed whitespace-pre-line">
                                            {paragraph}
                                        </p>
                                    ))}
                                </CardContent>
                            </Card>

                            {/* Quiz Section */}
                            {lesson.quiz && (
                                <Card className="border-primary/20">
                                    <CardHeader>
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <HelpCircle className="h-5 w-5 text-primary" />
                                            Knowledge Check
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <p className="font-medium">{lesson.quiz.question}</p>
                                        <RadioGroup value={quizAnswer || ""} onValueChange={setQuizAnswer} disabled={quizSubmitted}>
                                            {lesson.quiz.options.map((option, i) => (
                                                <div
                                                    key={i}
                                                    className={`flex items-center space-x-2 p-3 rounded-lg border transition-colors ${quizSubmitted && i === lesson.quiz!.correctIndex
                                                        ? "border-green-500 bg-green-50 dark:bg-green-950"
                                                        : quizSubmitted && quizAnswer === String(i) && i !== lesson.quiz!.correctIndex
                                                            ? "border-red-500 bg-red-50 dark:bg-red-950"
                                                            : "border-border"
                                                        }`}
                                                >
                                                    <RadioGroupItem value={String(i)} id={`q-${i}`} />
                                                    <Label htmlFor={`q-${i}`} className="flex-1 cursor-pointer">
                                                        {option}
                                                    </Label>
                                                </div>
                                            ))}
                                        </RadioGroup>

                                        {!quizSubmitted ? (
                                            <Button onClick={() => setQuizSubmitted(true)} disabled={!quizAnswer}>
                                                Check Answer
                                            </Button>
                                        ) : (
                                            <div
                                                className={`p-4 rounded-lg ${isCorrect
                                                    ? "bg-green-50 border border-green-200 dark:bg-green-950 dark:border-green-800"
                                                    : "bg-red-50 border border-red-200 dark:bg-red-950 dark:border-red-800"
                                                    }`}
                                            >
                                                <p className="font-medium mb-1">
                                                    {isCorrect ? "✅ Correct!" : "❌ Not quite."}
                                                </p>
                                                <p className="text-sm text-muted-foreground">{lesson.quiz.explanation}</p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )}

                            {/* Navigation */}
                            <div className="flex justify-between">
                                <Button variant="outline" onClick={handlePrev} disabled={currentLesson === 0}>
                                    <ArrowLeft className="h-4 w-4 mr-2" /> Previous
                                </Button>
                                {currentLesson < course.lessons.length - 1 ? (
                                    <Button onClick={handleNext}>
                                        Next Lesson <ArrowRight className="h-4 w-4 ml-2" />
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={() => setCompletedLessons((prev) => new Set([...prev, currentLesson]))}
                                        disabled={allCompleted}
                                    >
                                        {allCompleted ? (
                                            <>
                                                <Award className="h-4 w-4 mr-2" /> Course Complete!
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle2 className="h-4 w-4 mr-2" /> Mark Complete
                                            </>
                                        )}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}

export default function CourseViewer() {
    return (
        <CourseViewerContent />
    );
}
