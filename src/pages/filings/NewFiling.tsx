import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useConsent } from "@/hooks/useConsent";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ConsentModal } from "@/components/ConsentModal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Loader2,
  ArrowLeft,
  ArrowRight,
  Calculator,
  Building2,
  Receipt,
  Banknote,
  Landmark,
  Save,
  FileText,
  Upload,
  Lock,
  CheckCircle,
  Info,
  TrendingUp,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createFilingDraft, updateFilingDraft, fetchFilingById, type TaxType } from "@/lib/filingService";
import { NotificationTriggers } from "@/lib/notificationService";
import { parseNgnToKobo, koboToString, formatKoboToNgnPlain, stringToKobo, formatKoboToNgn } from "@/lib/money";
import { useRecordsForPeriod } from "@/hooks/useRecordsForPeriod";
import { useIntegrationStatus } from "@/hooks/useIntegrationStatus";
import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subMonths, subQuarters, subYears } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

type PeriodType = "month" | "quarter" | "year" | "custom";
type FilingPathway = "self_file" | "auto_file";

// Canonical Tax Identity types matching Settings.tsx
type TaxIdentity = 
  | "freelancer"   // Freelancer / Sole Proprietor
  | "enterprise"   // Small Business Enterprise / Business Name
  | "ltd"          // Limited Company (LTD)
  | "salary"       // Salary Earner (PAYE)
  | "partnership"  // Partnership
  | "ngo"          // NGO / Non-Profit
  | "cooperative"; // Cooperative Society

// Context-aware deduction suggestions based on BOTH Tax Type AND Tax Identity
interface Suggestion {
  id: string;
  label: string;
  default: number;
  kind: 'opex' | 'relief' | 'cogs' | 'input_vat';
}

// Track individual deduction entries with amounts and notes
interface DeductionEntry {
  id: string;
  label: string;
  amount: number;
  note: string;
  kind: string;
}

// Industry categories for better suggestion targeting
const INDUSTRY_OPTIONS: { value: TaxIdentity; label: string; description: string }[] = [
  { value: 'freelancer', label: 'Freelancer / Sole Proprietor', description: 'Self-employed individuals, consultants, creatives' },
  { value: 'enterprise', label: 'Small Business / Enterprise', description: 'Registered business name, retail, trading' },
  { value: 'ltd', label: 'Limited Company (LTD)', description: 'Private or public limited company' },
  { value: 'salary', label: 'Salary Earner (PAYE)', description: 'Employed individual with regular salary' },
  { value: 'partnership', label: 'Partnership', description: 'Business owned by two or more partners' },
  { value: 'ngo', label: 'NGO / Non-Profit', description: 'Non-governmental or charitable organization' },
  { value: 'cooperative', label: 'Cooperative Society', description: 'Member-owned cooperative business' },
];

const SUGGESTIONS: {
  VAT: Suggestion[];
  CIT_PIT: Record<string, Suggestion[]>;
} = {
  VAT: [
    { id: 'vat_stock', label: 'VAT Paid on Stock/Raw Materials', default: 0, kind: 'input_vat' },
    { id: 'vat_asset', label: 'VAT Paid on Assets (Machines/Furniture)', default: 0, kind: 'input_vat' },
    { id: 'vat_service', label: 'VAT Paid on Professional Services', default: 0, kind: 'input_vat' }
  ],
  CIT_PIT: {
    salary: [
      { id: 'pension', label: 'Pension Contributions (8%)', default: 0, kind: 'relief' },
      { id: 'nhf', label: 'National Housing Fund (2.5%)', default: 0, kind: 'relief' },
      { id: 'nhis', label: 'Health Insurance (NHIS)', default: 0, kind: 'relief' },
      { id: 'life_insurance', label: 'Life Insurance Premium', default: 0, kind: 'relief' }
    ],
    freelancer: [
      { id: 'data', label: 'Internet & Data (Starlink/Mobile)', default: 25000, kind: 'opex' },
      { id: 'rent_home', label: 'Home Office Allowance (Rent %)', default: 0, kind: 'opex' },
      { id: 'power', label: 'Diesel/Electricity/Inverter', default: 0, kind: 'opex' },
      { id: 'transport', label: 'Client Meetings Transport', default: 0, kind: 'opex' },
      { id: 'pension', label: 'Voluntary Pension', default: 0, kind: 'relief' }
    ],
    enterprise: [
      { id: 'stock', label: 'Cost of Goods Sold (Stock)', default: 0, kind: 'cogs' },
      { id: 'rent_shop', label: 'Shop/Office Rent', default: 0, kind: 'opex' },
      { id: 'staff', label: 'Staff Salaries', default: 0, kind: 'opex' },
      { id: 'marketing', label: 'Ads (IG/FB) & Marketing', default: 0, kind: 'opex' },
      { id: 'logistics', label: 'Delivery & Logistics', default: 0, kind: 'opex' }
    ],
    ltd: [
      { id: 'directors', label: 'Directors Remuneration', default: 0, kind: 'opex' },
      { id: 'audit', label: 'Audit Fees', default: 0, kind: 'opex' },
      { id: 'donations', label: 'Donations (Approved Bodies)', default: 0, kind: 'opex' },
      { id: 'loan_int', label: 'Interest on Business Loans', default: 0, kind: 'opex' },
      { id: 'depreciation', label: 'Capital Allowance (Depreciation)', default: 0, kind: 'opex' }
    ],
    partnership: [
      { id: 'partner_costs', label: 'Partner/Staff Drawings & Allowances', default: 0, kind: 'opex' },
      { id: 'shared_office', label: 'Shared Office Costs', default: 0, kind: 'opex' },
      { id: 'professional', label: 'Professional Fees (Legal/Accounting)', default: 0, kind: 'opex' }
    ],
    ngo: [
      { id: 'program', label: 'Program / Outreach Costs', default: 0, kind: 'opex' },
      { id: 'admin', label: 'Admin & Operations', default: 0, kind: 'opex' },
      { id: 'beneficiary', label: 'Beneficiary Support', default: 0, kind: 'opex' }
    ],
    cooperative: [
      { id: 'member_welfare', label: 'Member Welfare & Support', default: 0, kind: 'opex' },
      { id: 'secretariat', label: 'Secretariat/Admin Costs', default: 0, kind: 'opex' },
      { id: 'governance', label: 'Meetings & Governance Costs', default: 0, kind: 'opex' }
    ]
  }
};

// Helper to get suggestions based on tax type and identity
function getSuggestionsForContext(taxType: string, identity: TaxIdentity): Suggestion[] {
  if (taxType === 'VAT') {
    return SUGGESTIONS.VAT;
  }
  if (taxType === 'PIT' || taxType === 'CIT') {
    return SUGGESTIONS.CIT_PIT[identity] || SUGGESTIONS.CIT_PIT.freelancer;
  }
  return [];
}

// Map legacy user_type values to new TaxIdentity
function mapLegacyIdentity(userType: string | null): TaxIdentity {
  if (!userType) return 'freelancer';
  
  const mapping: Record<string, TaxIdentity> = {
    'individual': 'salary',
    'sme': 'enterprise',
    'corporate': 'ltd',
    'freelancer': 'freelancer',
    'enterprise': 'enterprise',
    'ltd': 'ltd',
    'salary': 'salary',
    'partnership': 'partnership',
    'ngo': 'ngo',
    'cooperative': 'cooperative',
    'accountant': 'freelancer', // Map accountant role to freelancer identity
    'admin': 'freelancer',
    'auditor': 'freelancer',
  };
  
  return mapping[userType] || 'freelancer';
}

interface TaxTypeOption {
  value: TaxType;
  label: string;
  description: string;
  icon: typeof Calculator;
}

const taxTypes: TaxTypeOption[] = [
  { value: "PIT", label: "Personal Income Tax", description: "Individual income taxation", icon: Calculator },
  { value: "CIT", label: "Company Income Tax", description: "Corporate profit taxation", icon: Building2 },
  { value: "VAT", label: "Value Added Tax", description: "Consumption tax on goods/services", icon: Receipt },
  { value: "WHT", label: "Withholding Tax", description: "Tax deducted at source", icon: Banknote },
  { value: "CGT", label: "Capital Gains Tax", description: "Tax on asset disposals", icon: Landmark },
];

export default function NewFiling() {
  const { user, loading: authLoading } = useAuth();
  const { hasConsent } = useConsent();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { summary, loading: recordsLoading, loadRecords } = useRecordsForPeriod();
  const { autofileConfigured, loading: integrationLoading } = useIntegrationStatus();
  const hasFilingConsent = hasConsent("filing");
  const [showConsentModal, setShowConsentModal] = useState(false);

  // Check if editing an existing draft
  const editFilingId = searchParams.get("edit");
  const [editLoading, setEditLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1: Tax type and period
  const [taxType, setTaxType] = useState<TaxType | "">("");
  const [periodType, setPeriodType] = useState<PeriodType>("month");
  const [periodOffset, setPeriodOffset] = useState("0");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [filingPathway, setFilingPathway] = useState<FilingPathway>("self_file");

  // Step 2: Input fields (varies by tax type)
  const [inputAmount, setInputAmount] = useState("");
  const [deductionsAmount, setDeductionsAmount] = useState("");
  const [whtCreditsAmount, setWhtCreditsAmount] = useState("");
  const [companySize, setCompanySize] = useState<"small" | "medium" | "large">("medium");
  const [whtRate, setWhtRate] = useState("10");
  const [costBasis, setCostBasis] = useState("");
  const [useRecords, setUseRecords] = useState(false);
  const [identity, setIdentity] = useState<TaxIdentity>("freelancer");
  const [identityLoading, setIdentityLoading] = useState(true);
  const [selectedSuggestions, setSelectedSuggestions] = useState<string[]>([]);
  
  // Custom amount dialog state
  const [customAmountDialogOpen, setCustomAmountDialogOpen] = useState(false);
  const [customAmountSuggestion, setCustomAmountSuggestion] = useState<Suggestion | null>(null);
  const [customAmountValue, setCustomAmountValue] = useState("");
  const [customAmountNote, setCustomAmountNote] = useState("");
  // Track individual deduction entries with amounts and notes
  const [deductionEntries, setDeductionEntries] = useState<DeductionEntry[]>([]);
  // Show industry selector if not already set
  const [showIndustrySelector, setShowIndustrySelector] = useState(false);
  // Edit mode for existing entries
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);

  // Load existing draft if editing
  useEffect(() => {
    async function loadDraft() {
      if (!editFilingId || !user) return;
      
      setEditLoading(true);
      try {
        const filing = await fetchFilingById(editFilingId);
        if (!filing || filing.status !== "draft") {
          toast({ title: "Filing not found or not editable", variant: "destructive" });
          navigate("/filings");
          return;
        }

        setIsEditMode(true);
        setTaxType(filing.tax_type as TaxType);
        setCustomStartDate(filing.period_start);
        setCustomEndDate(filing.period_end);
        setPeriodType("custom"); // Use custom since we have specific dates

        // Populate input fields from input_json
        const input = filing.input_json;
        
        // Load identity if saved
        if (input.identity) {
          setIdentity(input.identity as TaxIdentity);
        }

        // Load deduction entries if saved
        if (input.deductionEntries && Array.isArray(input.deductionEntries)) {
          const entries = input.deductionEntries as DeductionEntry[];
          setDeductionEntries(entries);
          setSelectedSuggestions(entries.map(e => e.id));
        }

        // Load amounts based on tax type
        switch (filing.tax_type) {
          case "PIT":
            if (input.annualSalaryKobo) {
              const salaryNgn = Number(BigInt(input.annualSalaryKobo as string)) / 100;
              setInputAmount(new Intl.NumberFormat("en-NG").format(salaryNgn));
            }
            if (input.deductionsKobo) {
              const deductNgn = Number(BigInt(input.deductionsKobo as string)) / 100;
              setDeductionsAmount(new Intl.NumberFormat("en-NG").format(deductNgn));
            }
            if (input.whtCreditsKobo) {
              const whtNgn = Number(BigInt(input.whtCreditsKobo as string)) / 100;
              setWhtCreditsAmount(new Intl.NumberFormat("en-NG").format(whtNgn));
            }
            break;
          case "CIT":
            if (input.revenueKobo) {
              const revNgn = Number(BigInt(input.revenueKobo as string)) / 100;
              setInputAmount(new Intl.NumberFormat("en-NG").format(revNgn));
            }
            if (input.expensesKobo) {
              const expNgn = Number(BigInt(input.expensesKobo as string)) / 100;
              setDeductionsAmount(new Intl.NumberFormat("en-NG").format(expNgn));
            }
            if (input.companySize) {
              setCompanySize(input.companySize as "small" | "medium" | "large");
            }
            if (input.whtCreditsKobo) {
              const whtNgn = Number(BigInt(input.whtCreditsKobo as string)) / 100;
              setWhtCreditsAmount(new Intl.NumberFormat("en-NG").format(whtNgn));
            }
            break;
          case "VAT":
            if (input.outputVatKobo) {
              const outNgn = Number(BigInt(input.outputVatKobo as string)) / 100;
              setInputAmount(new Intl.NumberFormat("en-NG").format(outNgn));
            }
            if (input.inputVatKobo) {
              const inNgn = Number(BigInt(input.inputVatKobo as string)) / 100;
              setDeductionsAmount(new Intl.NumberFormat("en-NG").format(inNgn));
            }
            break;
          case "WHT":
            if (input.paymentAmountKobo) {
              const amtNgn = Number(BigInt(input.paymentAmountKobo as string)) / 100;
              setInputAmount(new Intl.NumberFormat("en-NG").format(amtNgn));
            }
            if (input.whtRate) {
              setWhtRate(String(input.whtRate));
            }
            break;
          case "CGT":
            if (input.proceedsKobo) {
              const procNgn = Number(BigInt(input.proceedsKobo as string)) / 100;
              setInputAmount(new Intl.NumberFormat("en-NG").format(procNgn));
            }
            if (input.costKobo) {
              const costNgn = Number(BigInt(input.costKobo as string)) / 100;
              setCostBasis(new Intl.NumberFormat("en-NG").format(costNgn));
            }
            break;
        }

        // Skip to step 2 since we have the tax type
        setStep(2);
        
        toast({ title: "Draft loaded", description: "You can now edit your draft filing." });
      } catch (err: any) {
        console.error("Failed to load draft:", err);
        toast({ title: "Failed to load draft", description: err.message, variant: "destructive" });
        navigate("/filings");
      } finally {
        setEditLoading(false);
      }
    }
    
    loadDraft();
  }, [editFilingId, user]);

  // Fetch user's tax identity from the dedicated column
  useEffect(() => {
    async function fetchIdentity() {
      if (!user) return;
      try {
        setIdentityLoading(true);
        const { data, error } = await supabase
          .from("profiles")
          .select("tax_identity")
          .eq("id", user.id)
          .single();
        
        if (error) throw error;
        // Use tax_identity directly if set, otherwise use mapping for legacy
        if (data?.tax_identity) {
          setIdentity(data.tax_identity as TaxIdentity);
        } else {
          // Default to freelancer if not set
          setIdentity("freelancer");
        }
      } catch (err) {
        console.error("Failed to fetch profile identity:", err);
        setIdentity("freelancer");
      } finally {
        setIdentityLoading(false);
      }
    }
    fetchIdentity();
  }, [user]);

  // Get suggestions based on BOTH tax type AND identity
  const currentSuggestions = taxType ? getSuggestionsForContext(taxType, identity) : [];

  // Calculate running total from deduction entries
  const runningTotal = deductionEntries.reduce((sum, entry) => sum + entry.amount, 0);

  // Sync deductionsAmount with running total when entries change
  useEffect(() => {
    if (deductionEntries.length > 0) {
      setDeductionsAmount(new Intl.NumberFormat("en-NG").format(runningTotal));
    }
  }, [runningTotal, deductionEntries.length]);

  // Helper to get entry for a suggestion
  const getEntryForSuggestion = (suggestionId: string) => 
    deductionEntries.find(e => e.id === suggestionId);

  const handleToggleSuggestion = (suggestionId: string) => {
    const suggestion = currentSuggestions.find(s => s.id === suggestionId);
    if (!suggestion) return;

    const existingEntry = getEntryForSuggestion(suggestionId);
    
    if (existingEntry) {
      // Remove the entry
      setDeductionEntries(prev => prev.filter(e => e.id !== suggestionId));
      setSelectedSuggestions(prev => prev.filter(id => id !== suggestionId));
      return;
    }
    
    // For all items, open the dialog to enter amount and note
    setCustomAmountSuggestion(suggestion);
    setCustomAmountValue(suggestion.default > 0 ? suggestion.default.toString() : "");
    setCustomAmountNote("");
    setCustomAmountDialogOpen(true);
  };

  const handleCustomAmountSubmit = () => {
    if (!customAmountSuggestion) return;
    
    // Parse the custom amount (remove commas, convert to number)
    const cleanedValue = customAmountValue.replace(/,/g, "");
    const amount = parseFloat(cleanedValue);
    
    // Validation: prevent negative and zero amounts
    if (isNaN(amount) || amount < 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount (zero or greater).",
        variant: "destructive",
      });
      return;
    }

    if (amount === 0) {
      toast({
        title: "Zero amount",
        description: "Amount must be greater than zero.",
        variant: "destructive",
      });
      return;
    }

    // Create/update entry
    const entryData: DeductionEntry = {
      id: customAmountSuggestion.id,
      label: customAmountSuggestion.label,
      amount,
      note: customAmountNote.trim(),
      kind: customAmountSuggestion.kind,
    };

    if (editingEntryId) {
      // Update existing entry
      setDeductionEntries(prev => prev.map(e => e.id === editingEntryId ? entryData : e));
      toast({
        title: "Deduction updated",
        description: `${customAmountSuggestion.label} updated to ₦${amount.toLocaleString()}`,
      });
    } else {
      // Add new entry
      setDeductionEntries(prev => [...prev, entryData]);
      setSelectedSuggestions(prev => [...prev, customAmountSuggestion.id]);
      toast({
        title: "Deduction added",
        description: `₦${amount.toLocaleString()} added for ${customAmountSuggestion.label}`,
      });
    }
    
    // Close dialog and reset
    setCustomAmountDialogOpen(false);
    setCustomAmountSuggestion(null);
    setCustomAmountValue("");
    setCustomAmountNote("");
    setEditingEntryId(null);
  };

  // Handle editing an existing entry
  const handleEditEntry = (entry: DeductionEntry) => {
    // Find the matching suggestion to get the kind
    const suggestion = currentSuggestions.find(s => s.id === entry.id);
    if (suggestion) {
      setCustomAmountSuggestion(suggestion);
    } else {
      // Create a temporary suggestion-like object for custom entries
      setCustomAmountSuggestion({
        id: entry.id,
        label: entry.label,
        default: entry.amount,
        kind: entry.kind as Suggestion['kind'],
      });
    }
    setCustomAmountValue(entry.amount.toString());
    setCustomAmountNote(entry.note);
    setEditingEntryId(entry.id);
    setCustomAmountDialogOpen(true);
  };

  // Handle industry change
  const handleIndustryChange = async (newIdentity: TaxIdentity) => {
    setIdentity(newIdentity);
    // Clear current selections when industry changes
    setSelectedSuggestions([]);
    setDeductionEntries([]);
    setDeductionsAmount("");
    setShowIndustrySelector(false);
    
    // Optionally save to profile
    if (user) {
      try {
        await supabase
          .from("profiles")
          .update({ tax_identity: newIdentity })
          .eq("id", user.id);
      } catch (err) {
        console.error("Failed to save industry preference:", err);
      }
    }
  };

  // Remove a specific deduction entry
  const handleRemoveEntry = (entryId: string) => {
    setDeductionEntries(prev => prev.filter(e => e.id !== entryId));
    setSelectedSuggestions(prev => prev.filter(id => id !== entryId));
  };

  const getPeriodDates = (): { start: string; end: string } => {
    const offset = parseInt(periodOffset, 10);
    const now = new Date();

    if (periodType === "custom") {
      return { start: customStartDate, end: customEndDate };
    }

    let start: Date;
    let end: Date;

    switch (periodType) {
      case "month":
        const monthDate = subMonths(now, offset);
        start = startOfMonth(monthDate);
        end = endOfMonth(monthDate);
        break;
      case "quarter":
        const quarterDate = subQuarters(now, offset);
        start = startOfQuarter(quarterDate);
        end = endOfQuarter(quarterDate);
        break;
      case "year":
        const yearDate = subYears(now, offset);
        start = startOfYear(yearDate);
        end = endOfYear(yearDate);
        break;
      default:
        start = startOfMonth(now);
        end = endOfMonth(now);
    }

    return {
      start: format(start, "yyyy-MM-dd"),
      end: format(end, "yyyy-MM-dd"),
    };
  };

  // Load records when step 2 is mounted
  useEffect(() => {
    if (step === 2 && taxType && user) {
      const { start, end } = getPeriodDates();
      if (start && end) {
        loadRecords(start, end, taxType);
      }
    }
  }, [step, taxType]);

  // Auto-fill from records when loaded
  useEffect(() => {
    if (summary && useRecords) {
      // PIT/CIT: fill income, deductions, and WHT credits
      if (taxType === "PIT" || taxType === "CIT") {
        const incomeNgn = Number(summary.totalIncomeKobo) / 100;
        setInputAmount(new Intl.NumberFormat("en-NG").format(incomeNgn));
        const deductNgn = Number(summary.totalDeductibleExpensesKobo) / 100;
        setDeductionsAmount(new Intl.NumberFormat("en-NG").format(deductNgn));
        const whtNgn = Number(summary.totalWhtCreditsKobo) / 100;
        setWhtCreditsAmount(new Intl.NumberFormat("en-NG").format(whtNgn));
      }
      // VAT: fill output/input vat
      if (taxType === "VAT") {
        const outputNgn = Number(summary.totalOutputVatKobo) / 100;
        setInputAmount(new Intl.NumberFormat("en-NG").format(outputNgn));
        const inputNgn = Number(summary.totalInputVatKobo) / 100;
        setDeductionsAmount(new Intl.NumberFormat("en-NG").format(inputNgn));
      }
    }
  }, [summary, useRecords, taxType]);

  const buildInputJson = (): Record<string, unknown> => {
    const amountKobo = koboToString(parseNgnToKobo(inputAmount));
    const deductKobo = koboToString(parseNgnToKobo(deductionsAmount || "0"));
    const whtCreditKobo = koboToString(parseNgnToKobo(whtCreditsAmount || "0"));

    // Common fields to include deduction entries for persistence
    const deductionEntriesData = deductionEntries.length > 0 ? { deductionEntries } : {};

    switch (taxType) {
      case "PIT":
        return { annualSalaryKobo: amountKobo, deductionsKobo: deductKobo, whtCreditsKobo: whtCreditKobo, identity, ...deductionEntriesData };
      case "CIT":
        return { revenueKobo: amountKobo, expensesKobo: deductKobo, companySize, whtCreditsKobo: whtCreditKobo, identity, ...deductionEntriesData };
      case "VAT":
        return { outputVatKobo: amountKobo, inputVatKobo: deductKobo, identity, ...deductionEntriesData };
      case "WHT":
        return { paymentAmountKobo: amountKobo, whtRate: parseFloat(whtRate) };
      case "CGT":
        return {
          proceedsKobo: amountKobo,
          costKobo: koboToString(parseNgnToKobo(costBasis)),
        };
      default:
        return {};
    }
  };

  const getInputLabel = (): string => {
    switch (taxType) {
      case "PIT": return "Gross Income (₦)";
      case "CIT": return "Revenue / Gross Income (₦)";
      case "VAT": return "Output VAT (₦)";
      case "WHT": return "Payment Amount (₦)";
      case "CGT": return "Sale Proceeds (₦)";
      default: return "Amount (₦)";
    }
  };

  const getDeductionsLabel = (): string => {
    switch (taxType) {
      case "PIT": return "Deductions / Reliefs (₦)";
      case "CIT": return "Allowable Expenses (₦)";
      case "VAT": return "Input VAT (₦)";
      default: return "";
    }
  };

  const handleSaveDraft = async () => {
    if (!taxType) {
      toast({ title: "Select tax type", variant: "destructive" });
      return;
    }

    // Check filing consent before saving
    if (!hasFilingConsent) {
      setShowConsentModal(true);
      return;
    }

    const { start, end } = getPeriodDates();
    if (!start || !end) {
      toast({ title: "Invalid period dates", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      let filingId: string;
      
      if (isEditMode && editFilingId) {
        // Update existing draft
        await updateFilingDraft(editFilingId, buildInputJson());
        filingId = editFilingId;
        toast({
          title: "Draft updated",
          description: "Your filing draft has been updated.",
        });
      } else {
        // Create new draft
        filingId = await createFilingDraft({
          taxType,
          periodStart: start,
          periodEnd: end,
          inputJson: buildInputJson(),
        });
        // Trigger notification for draft creation
        await NotificationTriggers.filingDraftCreated(filingId, taxType);
        toast({
          title: "Draft saved",
          description: "Your filing draft has been created.",
        });
      }

      navigate(`/filings/${filingId}`);
    } catch (err: any) {
      toast({
        title: "Failed to save draft",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const canProceedStep1 = taxType && (periodType !== "custom" || (customStartDate && customEndDate));
  const canProceedStep2 = inputAmount && parseFloat(inputAmount.replace(/,/g, "")) > 0;

  if (authLoading || editLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    navigate("/signin");
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-grow pt-20 md:pt-28 pb-16">
        <div className="container mx-auto px-4 md:px-6 max-w-2xl">
          <div className="mb-6">
            <Link
              to={isEditMode && editFilingId ? `/filings/${editFilingId}` : "/filings"}
              className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {isEditMode ? "Back to Filing" : "Back to Filings"}
            </Link>
            <h1 className="text-3xl font-bold text-foreground">
              {isEditMode ? "Edit Draft Filing" : "New Tax Filing"}
            </h1>
            <p className="text-muted-foreground mt-2">
              Step {step} of 2: {step === 1 ? "Choose tax type and period" : "Enter filing details"}
            </p>
          </div>

          {/* Progress indicator */}
          <div className="flex items-center gap-2 mb-8">
            <div className={`h-2 flex-1 rounded-full ${step >= 1 ? "bg-primary" : "bg-muted"}`} />
            <div className={`h-2 flex-1 rounded-full ${step >= 2 ? "bg-primary" : "bg-muted"}`} />
          </div>

          {step === 1 && (
            <div className="space-y-6">
              {/* Filing Pathway Selection */}
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Filing Method
                  </CardTitle>
                  <CardDescription>Choose how you want to file your taxes</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div 
                    onClick={() => setFilingPathway("self_file")}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      filingPathway === "self_file" 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-full ${filingPathway === "self_file" ? "bg-primary/10" : "bg-muted"}`}>
                        <Upload className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">Self-File Pack</h3>
                          <Badge variant="default" className="bg-green-600">Available Now</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Generate your tax schedule and file manually on the government portal. 
                          You'll download a PDF/Excel pack and submit it yourself.
                        </p>
                        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                          <li className="flex items-center gap-2">
                            <CheckCircle className="h-3 w-3 text-green-600" />
                            Download filing pack (PDF/Excel)
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="h-3 w-3 text-green-600" />
                            Submit on FIRS TaxPro Max or State IRS
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="h-3 w-3 text-green-600" />
                            Record payment and upload receipt
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div 
                    onClick={() => autofileConfigured && setFilingPathway("auto_file")}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      !autofileConfigured 
                        ? "border-border bg-muted/30 cursor-not-allowed opacity-60" 
                        : filingPathway === "auto_file"
                          ? "border-primary bg-primary/5 cursor-pointer"
                          : "border-border hover:border-primary/50 cursor-pointer"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-full ${filingPathway === "auto_file" && autofileConfigured ? "bg-primary/10" : "bg-muted"}`}>
                        <Lock className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">Auto-File Service</h3>
                          <Badge variant="outline" className="text-muted-foreground">
                            {autofileConfigured ? "Available" : "Coming Soon"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Direct submission to tax authorities via licensed partner integration.
                        </p>
                        {!autofileConfigured && (
                          <Alert className="mt-2 bg-muted/50 border-muted">
                            <Info className="h-4 w-4" />
                            <AlertDescription className="text-xs">
                              Requires licensed partner and API keys. Contact support for setup.
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tax Type Selection */}
              <Card>
                <CardHeader>
                  <CardTitle>Tax Type</CardTitle>
                  <CardDescription>Select the type of tax filing you want to create</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {taxTypes.map((type) => {
                      const Icon = type.icon;
                      return (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => setTaxType(type.value)}
                          className={`p-4 rounded-lg border text-left transition-all ${
                            taxType === type.value
                              ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Icon className={`h-5 w-5 ${taxType === type.value ? "text-primary" : "text-muted-foreground"}`} />
                            <div>
                              <p className="font-medium">{type.label}</p>
                              <p className="text-xs text-muted-foreground">{type.description}</p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="space-y-4">
                    <Label>Filing Period</Label>
                    <RadioGroup value={periodType} onValueChange={(v) => setPeriodType(v as PeriodType)}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="month" id="month" />
                        <Label htmlFor="month" className="font-normal cursor-pointer">Monthly</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="quarter" id="quarter" />
                        <Label htmlFor="quarter" className="font-normal cursor-pointer">Quarterly</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="year" id="year" />
                        <Label htmlFor="year" className="font-normal cursor-pointer">Annual</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="custom" id="custom" />
                        <Label htmlFor="custom" className="font-normal cursor-pointer">Custom Range</Label>
                      </div>
                    </RadioGroup>

                    {periodType !== "custom" && (
                      <div>
                        <Label htmlFor="offset">Period</Label>
                        <Select value={periodOffset} onValueChange={setPeriodOffset}>
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">Current {periodType}</SelectItem>
                            <SelectItem value="1">Previous {periodType}</SelectItem>
                            <SelectItem value="2">2 {periodType}s ago</SelectItem>
                            <SelectItem value="3">3 {periodType}s ago</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {periodType === "custom" && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="start">Start Date</Label>
                          <Input
                            id="start"
                            type="date"
                            value={customStartDate}
                            onChange={(e) => setCustomStartDate(e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="end">End Date</Label>
                          <Input
                            id="end"
                            type="date"
                            value={customEndDate}
                            onChange={(e) => setCustomEndDate(e.target.value)}
                            className="mt-1"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button onClick={() => setStep(2)} disabled={!canProceedStep1}>
                      Continue
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Filing Details</CardTitle>
                <CardDescription>Enter the required information for your {taxType} filing</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Records Loading Card */}
                {user && (taxType === "PIT" || taxType === "CIT" || taxType === "VAT") && (
                  <div className="p-4 rounded-lg border bg-muted/30">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium">Use My Records</h4>
                        <p className="text-sm text-muted-foreground">
                          Auto-fill from your income and expense records for this period
                        </p>
                      </div>
                      <Button 
                        variant={useRecords ? "default" : "outline"} 
                        size="sm"
                        onClick={() => setUseRecords(!useRecords)}
                        disabled={recordsLoading}
                      >
                        {recordsLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : useRecords ? (
                          "Using Records"
                        ) : (
                          "Load Records"
                        )}
                      </Button>
                    </div>
                    {summary && useRecords && (
                      <div className="grid grid-cols-2 gap-3 mt-3 p-3 bg-background rounded-lg">
                        <div>
                          <p className="text-xs text-muted-foreground">Total Income</p>
                          <p className="font-mono font-semibold">{formatKoboToNgn(summary.totalIncomeKobo)}</p>
                          <p className="text-xs text-muted-foreground">{summary.incomeCount} records</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Deductible Expenses</p>
                          <p className="font-mono font-semibold">{formatKoboToNgn(summary.totalDeductibleExpensesKobo)}</p>
                          <p className="text-xs text-muted-foreground">{summary.includedExpenses.filter(e => e.deductible).length} records</p>
                        </div>
                        {taxType === "VAT" && (
                          <>
                            <div>
                              <p className="text-xs text-muted-foreground">Output VAT</p>
                              <p className="font-mono font-semibold">{formatKoboToNgn(summary.totalOutputVatKobo)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Input VAT (Credit)</p>
                              <p className="font-mono font-semibold text-green-600">{formatKoboToNgn(summary.totalInputVatKobo)}</p>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                    {summary && summary.incomeCount === 0 && summary.expenseCount === 0 && (
                      <Alert className="mt-2">
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          No records found for this period.{" "}
                          <Link to="/incomes" className="text-primary underline">Add Income</Link> or{" "}
                          <Link to="/expenses" className="text-primary underline">Add Expense</Link>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}

                <div>
                  <Label htmlFor="amount">{getInputLabel()}</Label>
                  <Input
                    id="amount"
                    type="text"
                    placeholder="0"
                    value={inputAmount}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9.,]/g, "");
                      setInputAmount(val);
                    }}
                    className="mt-1 font-mono"
                  />
                  {inputAmount && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatKoboToNgnPlain(parseNgnToKobo(inputAmount))} NGN
                    </p>
                  )}
                </div>

                {/* Deductions field for PIT/CIT/VAT */}
                {(taxType === "PIT" || taxType === "CIT" || taxType === "VAT") && (
                  <div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="deductions">{getDeductionsLabel()}</Label>
                      {deductionEntries.length > 0 && (
                        <span className="text-xs text-green-600 font-medium">
                          Auto-calculated from {deductionEntries.length} item(s)
                        </span>
                      )}
                    </div>
                    <Input
                      id="deductions"
                      type="text"
                      placeholder="0"
                      value={deductionsAmount}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9.,]/g, "");
                        // Validate: prevent negative values
                        const numVal = parseFloat(val.replace(/,/g, "") || "0");
                        if (numVal < 0) return;
                        setDeductionsAmount(val);
                      }}
                      className={`mt-1 font-mono ${deductionEntries.length > 0 ? "bg-muted" : ""}`}
                      readOnly={deductionEntries.length > 0}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {taxType === "VAT" 
                        ? "Input VAT from valid VAT invoices reduces your Net VAT payable"
                        : deductionEntries.length > 0
                          ? "Total is calculated from your added deductions below"
                          : "Add deductions using the suggestions below, or enter a total manually"}
                    </p>
                  </div>
                )}

                {/* Industry Selector + Smart Suggestions */}
                {(taxType === "PIT" || taxType === "CIT" || taxType === "VAT") && !identityLoading && (
                  <div className="space-y-4">
                    {/* Industry Selector */}
                    <div className="p-4 rounded-lg border bg-muted/30">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="font-medium text-sm">Your Industry / Business Type</h4>
                          <p className="text-xs text-muted-foreground">
                            Select your industry to see relevant deduction suggestions
                          </p>
                        </div>
                        {!showIndustrySelector && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowIndustrySelector(true)}
                          >
                            {INDUSTRY_OPTIONS.find(o => o.value === identity)?.label || "Select Industry"}
                          </Button>
                        )}
                      </div>
                      
                      {showIndustrySelector && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                          {INDUSTRY_OPTIONS.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => handleIndustryChange(option.value)}
                              className={`p-3 rounded-lg border text-left transition-all ${
                                identity === option.value
                                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                                  : "border-border hover:border-primary/50"
                              }`}
                            >
                              <p className="font-medium text-sm">{option.label}</p>
                              <p className="text-xs text-muted-foreground">{option.description}</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Smart Suggestions based on Tax Type AND Tax Identity */}
                    {currentSuggestions.length > 0 && (
                      <div className="p-4 rounded-lg border bg-secondary/5 border-secondary/20">
                        <div className="flex items-center gap-2 mb-3">
                          <TrendingUp className="h-4 w-4 text-secondary" />
                          <h4 className="font-medium text-sm">
                            {taxType === "VAT" 
                              ? "Common Input VAT Claims" 
                              : `Suggested Deductions for ${INDUSTRY_OPTIONS.find(o => o.value === identity)?.label || identity}`
                            }
                          </h4>
                        </div>
                        <p className="text-xs text-muted-foreground mb-3">
                          Click to add deductions. You'll enter the amount and optional documentation.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {currentSuggestions.map((suggestion) => {
                            const entry = getEntryForSuggestion(suggestion.id);
                            return (
                              <Badge
                                key={suggestion.id}
                                variant={entry ? "default" : "outline"}
                                className="cursor-pointer hover:bg-secondary/20 transition-colors"
                                onClick={() => handleToggleSuggestion(suggestion.id)}
                              >
                                {suggestion.label}
                                {entry ? (
                                  <span className="ml-1 opacity-70">₦{entry.amount.toLocaleString()}</span>
                                ) : suggestion.default > 0 ? (
                                  <span className="ml-1 opacity-50 text-xs">~₦{suggestion.default.toLocaleString()}</span>
                                ) : (
                                  <span className="ml-1 opacity-50 text-xs">+ Add</span>
                                )}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Deduction Entries List with Running Total */}
                    {deductionEntries.length > 0 && (
                      <div className="p-4 rounded-lg border bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-800">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="font-medium text-sm text-green-800 dark:text-green-200">
                              Added Deductions ({deductionEntries.length})
                            </h4>
                            <p className="text-xs text-muted-foreground">Click to edit</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Running Total</p>
                            <p className="font-mono font-bold text-green-700 dark:text-green-300">
                              ₦{runningTotal.toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {deductionEntries.map((entry) => (
                            <div 
                              key={entry.id} 
                              className="flex items-start justify-between p-2 bg-background rounded-md border hover:border-primary/50 cursor-pointer transition-colors group"
                              onClick={() => handleEditEntry(entry)}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">{entry.label}</p>
                                  <Badge variant="outline" className="text-xs">
                                    {entry.kind}
                                  </Badge>
                                </div>
                                <p className="font-mono text-sm text-primary">₦{entry.amount.toLocaleString()}</p>
                                {entry.note && (
                                  <p className="text-xs text-muted-foreground mt-1 italic">
                                    "{entry.note}"
                                  </p>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveEntry(entry.id);
                                }}
                              >
                                ×
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* WHT Credits for PIT/CIT */}
                {(taxType === "PIT" || taxType === "CIT") && (
                  <div>
                    <Label htmlFor="whtCredits">WHT Credits (₦)</Label>
                    <Input
                      id="whtCredits"
                      type="text"
                      placeholder="0"
                      value={whtCreditsAmount}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9.,]/g, "");
                        setWhtCreditsAmount(val);
                      }}
                      className="mt-1 font-mono"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      WHT already deducted at source reduces your final tax payable
                    </p>
                  </div>
                )}

                {taxType === "CIT" && (
                  <div>
                    <Label>Company Size</Label>
                    <RadioGroup value={companySize} onValueChange={(v) => setCompanySize(v as typeof companySize)} className="mt-2">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="small" id="small" />
                        <Label htmlFor="small" className="font-normal cursor-pointer">Small (Turnover {"<"} ₦25M)</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="medium" id="medium" />
                        <Label htmlFor="medium" className="font-normal cursor-pointer">Medium (₦25M - ₦100M)</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="large" id="large" />
                        <Label htmlFor="large" className="font-normal cursor-pointer">Large ({">"} ₦100M)</Label>
                      </div>
                    </RadioGroup>
                  </div>
                )}

                {taxType === "WHT" && (
                  <div>
                    <Label htmlFor="whtRate">WHT Rate (%)</Label>
                    <Select value={whtRate} onValueChange={setWhtRate}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5%</SelectItem>
                        <SelectItem value="10">10%</SelectItem>
                        <SelectItem value="15">15%</SelectItem>
                        <SelectItem value="20">20%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {taxType === "CGT" && (
                  <div>
                    <Label htmlFor="cost">Cost of Acquisition (₦)</Label>
                    <Input
                      id="cost"
                      type="text"
                      placeholder="0"
                      value={costBasis}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9.,]/g, "");
                        setCostBasis(val);
                      }}
                      className="mt-1 font-mono"
                    />
                  </div>
                )}

                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={() => setStep(1)}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                  <Button onClick={handleSaveDraft} disabled={!canProceedStep2 || saving}>
                    {saving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    {isEditMode ? "Update Draft" : "Save Draft & Continue"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <Footer />
      
      {/* Custom Amount Dialog for deduction entry */}
      <Dialog open={customAmountDialogOpen} onOpenChange={setCustomAmountDialogOpen}>
        <DialogContent className="sm:max-w-md bg-background">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              {editingEntryId ? "Edit Deduction" : "Add Deduction"}
            </DialogTitle>
            <DialogDescription>
              {customAmountSuggestion && (
                <>
                  Enter the amount and optional documentation for{" "}
                  <strong>{customAmountSuggestion.label}</strong>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="customAmount">Amount (₦) *</Label>
              <Input
                id="customAmount"
                type="text"
                placeholder="e.g. 50,000"
                value={customAmountValue}
                onChange={(e) => {
                  // Allow only numbers and commas for formatting
                  const val = e.target.value.replace(/[^0-9,]/g, "");
                  setCustomAmountValue(val);
                }}
                className="font-mono text-lg"
                autoFocus
              />
              {customAmountValue && (
                <p className="text-xs text-muted-foreground">
                  ₦{parseFloat(customAmountValue.replace(/,/g, "") || "0").toLocaleString()}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="customNote">Documentation / Reason (optional)</Label>
              <Textarea
                id="customNote"
                placeholder="e.g. Starlink subscription Jan-Dec 2024, Receipt #12345"
                value={customAmountNote}
                onChange={(e) => setCustomAmountNote(e.target.value)}
                rows={2}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Add a note to help you remember what this deduction is for (receipts, dates, etc.)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCustomAmountDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCustomAmountSubmit}>
              {editingEntryId ? "Update Deduction" : "Add Deduction"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Filing Consent Modal */}
      <ConsentModal
        open={showConsentModal}
        onConsentGiven={() => setShowConsentModal(false)}
        context="filing"
      />
    </div>
  );
}