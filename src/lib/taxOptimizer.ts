/**
 * Tax Optimization Engine
 * 
 * Analyzes tax calculations and provides optimization suggestions.
 * All suggestions are informational and do NOT alter computed tax amounts.
 */

export type TaxType = "PIT" | "CIT" | "VAT" | "WHT" | "CGT" | "CRYPTO" | "FOREIGN_INCOME";

export interface OptimizationSuggestion {
  id: string;
  title: string;
  description: string;
  potentialSavingsPercent?: number;
  potentialSavingsKobo?: string;
  legalBasis: string;
  actionSteps: string[];
  category: "relief" | "deduction" | "exemption" | "incentive" | "strategy";
  priority: "high" | "medium" | "low";
  applicableTo: TaxType[];
}

interface AnalysisInput {
  taxType: TaxType;
  incomeKobo?: string;
  profitKobo?: string;
  isSmallCompany?: boolean;
  hasContributedToPension?: boolean;
  hasNHFContributions?: boolean;
  hasLifeInsurance?: boolean;
  isManufacturing?: boolean;
  hasRnDExpenses?: boolean;
  employeeCount?: number;
  turnoverKobo?: string;
}

// Central repository of optimization suggestions
const OPTIMIZATION_DATABASE: OptimizationSuggestion[] = [
  // PIT Optimizations
  {
    id: "pension-contribution",
    title: "Pension Contribution Relief",
    description: "Contributions to a Retirement Savings Account (RSA) are tax-deductible. You can contribute up to 8% of your gross emoluments.",
    potentialSavingsPercent: 8,
    legalBasis: "Personal Income Tax Act (PITA) Section 4",
    actionSteps: [
      "Ensure you're enrolled in a Pension Fund Administrator (PFA)",
      "Maximize monthly contributions up to 8% of gross salary",
      "Keep records of all contribution receipts",
      "Claim deduction in your annual tax return",
    ],
    category: "relief",
    priority: "high",
    applicableTo: ["PIT"],
  },
  {
    id: "nhf-contribution",
    title: "National Housing Fund (NHF) Relief",
    description: "NHF contributions of 2.5% of basic salary are tax-deductible and can reduce your taxable income.",
    potentialSavingsPercent: 2.5,
    legalBasis: "National Housing Fund Act 1992",
    actionSteps: [
      "Register with the Federal Mortgage Bank of Nigeria",
      "Ensure employer deducts NHF contributions",
      "Obtain annual contribution statement",
      "Include in tax relief claims",
    ],
    category: "relief",
    priority: "medium",
    applicableTo: ["PIT"],
  },
  {
    id: "life-insurance",
    title: "Life Insurance Premium Relief",
    description: "Premiums paid on life insurance policies are deductible for PIT purposes, providing both tax savings and financial protection.",
    legalBasis: "Personal Income Tax Act (PITA) Section 33",
    actionSteps: [
      "Purchase a qualifying life insurance policy",
      "Ensure premiums are paid and documented",
      "Obtain annual premium payment certificate",
      "Claim deduction in tax return",
    ],
    category: "relief",
    priority: "medium",
    applicableTo: ["PIT"],
  },
  // CIT Optimizations
  {
    id: "capital-allowances",
    title: "Capital Allowances",
    description: "Claim depreciation on qualifying capital expenditure including plant, machinery, buildings, and motor vehicles.",
    potentialSavingsPercent: 5,
    legalBasis: "Companies Income Tax Act (CITA) Second Schedule",
    actionSteps: [
      "Maintain a fixed asset register",
      "Calculate initial and annual allowances",
      "Ensure assets are used for business purposes",
      "Document all capital expenditure with invoices",
    ],
    category: "deduction",
    priority: "high",
    applicableTo: ["CIT"],
  },
  {
    id: "rd-incentive",
    title: "Research & Development Incentives",
    description: "Companies engaged in R&D activities may claim enhanced deductions on qualifying R&D expenditure.",
    potentialSavingsPercent: 20,
    legalBasis: "Companies Income Tax Act (CITA) Section 26",
    actionSteps: [
      "Document all R&D activities and expenses",
      "Ensure R&D is related to business operations",
      "Apply for R&D tax credit certification",
      "Claim enhanced deduction in tax computation",
    ],
    category: "incentive",
    priority: "high",
    applicableTo: ["CIT"],
  },
  {
    id: "pioneer-status",
    title: "Pioneer Status Incentive",
    description: "Qualifying industries may obtain pioneer status providing tax holiday of 3-5 years on profits.",
    legalBasis: "Industrial Development (Income Tax Relief) Act",
    actionSteps: [
      "Check if your industry qualifies for pioneer status",
      "Apply to Nigerian Investment Promotion Commission",
      "Maintain compliance records during tax holiday",
      "Plan for transition when pioneer status expires",
    ],
    category: "exemption",
    priority: "medium",
    applicableTo: ["CIT"],
  },
  {
    id: "export-incentive",
    title: "Export Expansion Grant",
    description: "Non-oil exporters may qualify for grants and tax incentives based on export performance.",
    legalBasis: "Export (Incentives and Miscellaneous Provisions) Act",
    actionSteps: [
      "Register with Nigerian Export Promotion Council (NEPC)",
      "Maintain export documentation and proceeds repatriation records",
      "Apply for Export Expansion Grant",
      "Claim related tax benefits in annual returns",
    ],
    category: "incentive",
    priority: "medium",
    applicableTo: ["CIT"],
  },
  // VAT Optimizations
  {
    id: "input-vat-recovery",
    title: "Input VAT Recovery",
    description: "Ensure you recover all input VAT paid on business purchases. This reduces your net VAT liability.",
    potentialSavingsPercent: 7.5,
    legalBasis: "Value Added Tax Act Section 16",
    actionSteps: [
      "Maintain proper VAT invoices from all suppliers",
      "Ensure invoices contain supplier's TIN and VAT registration",
      "Reconcile input VAT monthly before filing",
      "Claim input VAT credit in monthly returns",
    ],
    category: "deduction",
    priority: "high",
    applicableTo: ["VAT"],
  },
  {
    id: "zero-rated-exports",
    title: "Zero-Rated Export Supplies",
    description: "Exports of goods and services are zero-rated for VAT. You can claim refund of input VAT on zero-rated supplies.",
    legalBasis: "Value Added Tax Act First Schedule",
    actionSteps: [
      "Classify export supplies correctly",
      "Maintain export documentation (bills of lading, customs forms)",
      "Apply for VAT refund on input VAT related to exports",
      "File zero-rated supplies in monthly VAT returns",
    ],
    category: "exemption",
    priority: "medium",
    applicableTo: ["VAT"],
  },
  // WHT Optimizations
  {
    id: "wht-credit-utilization",
    title: "WHT Credit Utilization",
    description: "WHT deducted from your income can be credited against your final income tax liability. Ensure you claim all credits.",
    legalBasis: "Companies Income Tax Act Section 81",
    actionSteps: [
      "Collect all WHT credit notes from payers",
      "Verify WHT has been remitted to FIRS",
      "Include WHT credits in annual tax computation",
      "Apply for refund if credits exceed liability",
    ],
    category: "relief",
    priority: "high",
    applicableTo: ["WHT"],
  },
  {
    id: "treaty-reduced-wht",
    title: "Treaty-Reduced WHT Rates",
    description: "Double tax treaties may provide reduced WHT rates for certain payment types to treaty country residents.",
    legalBasis: "Various Double Taxation Agreements",
    actionSteps: [
      "Check if recipient country has a treaty with Nigeria",
      "Verify reduced rates applicable to payment type",
      "Obtain Certificate of Residence from recipient",
      "Apply reduced rate and document treaty claim",
    ],
    category: "relief",
    priority: "medium",
    applicableTo: ["WHT"],
  },
  // CGT Optimizations
  {
    id: "reinvestment-relief",
    title: "Rollover Relief on Reinvestment",
    description: "CGT may be deferred if proceeds from disposal are reinvested in similar qualifying assets within specified period.",
    legalBasis: "Capital Gains Tax Act Section 32",
    actionSteps: [
      "Plan asset disposal strategically",
      "Reinvest proceeds within the required timeframe",
      "Document the reinvestment trail",
      "Apply for rollover relief in CGT computation",
    ],
    category: "relief",
    priority: "high",
    applicableTo: ["CGT"],
  },
  {
    id: "exempt-gains",
    title: "Exempt Gains Categories",
    description: "Certain gains are exempt from CGT, including gains on government securities, bonds, and stocks listed on NSE.",
    legalBasis: "Capital Gains Tax Act Section 30",
    actionSteps: [
      "Identify if disposed assets qualify for exemption",
      "Document the asset type and listing status",
      "Exclude exempt gains from CGT computation",
      "Keep records for potential FIRS queries",
    ],
    category: "exemption",
    priority: "high",
    applicableTo: ["CGT"],
  },
  // Crypto Optimizations
  {
    id: "crypto-holding-period",
    title: "Long-Term Holding Strategy",
    description: "Consider holding crypto assets for longer periods to potentially qualify for preferential tax treatment on capital gains.",
    legalBasis: "Subject to evolving Nigerian tax regulations on digital assets",
    actionSteps: [
      "Track acquisition dates and holding periods",
      "Distinguish between short-term and long-term gains",
      "Document all transactions with timestamps",
      "Consult a tax professional on latest regulations",
    ],
    category: "strategy",
    priority: "medium",
    applicableTo: ["CRYPTO"],
  },
  // Foreign Income Optimizations
  {
    id: "double-tax-treaty",
    title: "Double Taxation Treaty Relief",
    description: "Nigeria has tax treaties with several countries. Foreign tax paid may be credited against Nigerian tax liability.",
    legalBasis: "Various Double Taxation Agreements; Income Tax (Foreign Income) Order",
    actionSteps: [
      "Verify if a treaty exists with the source country",
      "Obtain tax residency certificate from Nigeria",
      "Document foreign taxes paid",
      "Claim foreign tax credit in Nigerian return",
    ],
    category: "relief",
    priority: "high",
    applicableTo: ["PIT", "CIT", "FOREIGN_INCOME"],
  },
];

/**
 * Get optimization suggestions for a specific tax type
 */
export function getOptimizationSuggestions(taxType: TaxType): OptimizationSuggestion[] {
  return OPTIMIZATION_DATABASE
    .filter(s => s.applicableTo.includes(taxType))
    .sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
}

/**
 * Analyze input and return personalized suggestions
 */
export function analyzeForOptimizations(input: AnalysisInput): OptimizationSuggestion[] {
  const baseSuggestions = getOptimizationSuggestions(input.taxType);
  const personalized: OptimizationSuggestion[] = [];

  for (const suggestion of baseSuggestions) {
    // Filter based on input conditions
    if (suggestion.id === "pension-contribution" && input.hasContributedToPension) {
      continue; // Already contributing
    }
    if (suggestion.id === "nhf-contribution" && input.hasNHFContributions) {
      continue; // Already contributing
    }
    if (suggestion.id === "life-insurance" && input.hasLifeInsurance) {
      continue; // Already has insurance
    }
    if (suggestion.id === "rd-incentive" && !input.hasRnDExpenses) {
      continue; // No R&D expenses to claim
    }

    personalized.push(suggestion);
  }

  return personalized;
}

/**
 * Get all available optimization categories
 */
export function getOptimizationCategories(): string[] {
  return ["relief", "deduction", "exemption", "incentive", "strategy"];
}

/**
 * Get suggestions by category
 */
export function getSuggestionsByCategory(
  taxType: TaxType, 
  category: OptimizationSuggestion["category"]
): OptimizationSuggestion[] {
  return getOptimizationSuggestions(taxType).filter(s => s.category === category);
}
