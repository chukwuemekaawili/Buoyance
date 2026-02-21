import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Banknote, Plus, Archive, Loader2, ArrowLeft, Search, Filter, BadgePercent, Receipt, Sparkles, CheckCircle2, AlertCircle, History, Edit } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { formatKoboToNgn, parseNgnToKobo, koboToString, stringToKobo } from "@/lib/money";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { DateRange } from "react-day-picker";
import { classifyTaxItem, ClassificationResult, getConfidenceBgColor, getConfidenceColor } from "@/lib/taxClassificationService";
import { IncomeCorrectionDialog } from "@/components/corrections/CorrectionDialog";

interface Income {
  id: string;
  source: string;
  amount_kobo: string;
  date: string;
  category: string | null;
  description: string | null;
  archived: boolean | null;
  created_at: string | null;
  vatable: boolean;
  output_vat_kobo: string | null;
  wht_deducted: boolean;
  wht_credit_kobo: number | null;
  tax_exempt: boolean;
  status?: string; // 'active' | 'superseded' | 'corrected' | 'archived'
  supersedes_id?: string | null;
}

// Category Logic Matrix: tax_exempt defaults based on category
const INCOME_CATEGORIES = [
  // Taxable categories (tax_exempt = false)
  { value: "salary", label: "Salary/Wages", defaultTaxExempt: false },
  { value: "freelance", label: "Freelance Gig", defaultTaxExempt: false },
  { value: "business", label: "Business Sales", defaultTaxExempt: false },
  { value: "consulting", label: "Consulting Fees", defaultTaxExempt: false },
  { value: "investment", label: "Investment Returns", defaultTaxExempt: false },
  { value: "rental", label: "Rental Income", defaultTaxExempt: false },
  { value: "dividend", label: "Dividends", defaultTaxExempt: false },
  { value: "interest", label: "Interest", defaultTaxExempt: false },
  // Non-taxable categories (tax_exempt = true)
  { value: "loan", label: "Personal Loan", defaultTaxExempt: true },
  { value: "gift", label: "Gift", defaultTaxExempt: true },
  { value: "grant", label: "Grant", defaultTaxExempt: true },
  { value: "refund", label: "Refund", defaultTaxExempt: true },
  { value: "other", label: "Other", defaultTaxExempt: false },
];

// Helper to get default tax exemption based on category
const getCategoryDefaultTaxExempt = (categoryValue: string): boolean => {
  const category = INCOME_CATEGORIES.find(c => c.value === categoryValue);
  return category?.defaultTaxExempt ?? false;
};

export default function Incomes() {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [taxStatusFilter, setTaxStatusFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [showHistory, setShowHistory] = useState(false); // Toggle to show superseded records

  // Form state
  const [source, setSource] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [category, setCategory] = useState("salary");
  const [description, setDescription] = useState("");
  const [vatable, setVatable] = useState(false);
  const [outputVatAmount, setOutputVatAmount] = useState("");
  const [whtDeducted, setWhtDeducted] = useState(false);
  const [whtAmount, setWhtAmount] = useState("");
  const [taxExempt, setTaxExempt] = useState(false);

  // AI Classification state
  const [isClassifying, setIsClassifying] = useState(false);
  const [classification, setClassification] = useState<ClassificationResult | null>(null);
  const [correctionTarget, setCorrectionTarget] = useState<Income | null>(null);

  // AI-powered classification when source or category changes
  const runAIClassification = useCallback(async (src: string, cat: string, desc: string) => {
    if (!src.trim() || src.length < 3) {
      setClassification(null);
      return;
    }

    setIsClassifying(true);
    try {
      const result = await classifyTaxItem({
        type: 'income',
        description: `${src}${desc ? ` - ${desc}` : ''}`,
        category: cat,
      });
      setClassification(result);
      if (result.tax_exempt !== undefined) {
        setTaxExempt(result.tax_exempt);
      }
    } catch (err) {
      console.error('Classification failed:', err);
    } finally {
      setIsClassifying(false);
    }
  }, []);

  // Debounced AI classification trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      if (source.trim().length >= 3) {
        runAIClassification(source, category, description);
      }
    }, 800); // Wait 800ms after user stops typing

    return () => clearTimeout(timer);
  }, [source, category, description, runAIClassification]);

  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Handle ?action=add query parameter - with timeout to prevent render loops
  useEffect(() => {
    const timer = setTimeout(() => {
      const action = searchParams.get("action");
      if (action === "add" && user) {
        setShowAddDialog(true);
        // Remove the query parameter after opening dialog
        const newParams = new URLSearchParams(searchParams);
        newParams.delete("action");
        setSearchParams(newParams, { replace: true });
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []); // Empty dependency array - only run once on mount

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/signin");
      return;
    }
    fetchIncomes();
  }, [user, authLoading, navigate, showHistory]);

  const fetchIncomes = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Only fetch ACTIVE records by default (archived=false AND status='active')
      // This ensures superseded records don't appear in the main list
      let query = supabase
        .from("incomes")
        .select("*")
        .eq("user_id", user.id)
        .eq("archived", false);

      // Filter out superseded records unless showHistory is enabled
      if (!showHistory) {
        query = query.eq("status", "active");
      }

      const { data, error } = await query.order("date", { ascending: false });

      if (error) throw error;
      setIncomes(data || []);
    } catch (err: any) {
      toast({
        title: "Failed to load incomes",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!user || !source.trim() || !amount) return;

    setIsAdding(true);
    try {
      const amountKobo = parseNgnToKobo(amount.replace(/,/g, ""));
      const outputVatKobo = vatable && outputVatAmount
        ? koboToString(parseNgnToKobo(outputVatAmount.replace(/,/g, "")))
        : null;
      const whtKobo = whtDeducted && whtAmount
        ? Number(parseNgnToKobo(whtAmount.replace(/,/g, "")))
        : 0;

      const { error } = await supabase.from("incomes").insert({
        user_id: user.id,
        source: source.trim(),
        amount_kobo: koboToString(amountKobo),
        date,
        category,
        description: description.trim() || null,
        vatable,
        output_vat_kobo: outputVatKobo,
        wht_deducted: whtDeducted,
        wht_credit_kobo: whtKobo,
        tax_exempt: taxExempt,
        archived: false,
      });

      if (error) throw error;

      toast({ title: "Income recorded successfully" });
      setShowAddDialog(false);
      resetForm();
      fetchIncomes();
    } catch (err: any) {
      toast({
        title: "Failed to add income",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleArchive = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("incomes")
        .update({ archived: true })
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;

      toast({ title: "Income archived" });
      fetchIncomes();
    } catch (err: any) {
      toast({
        title: "Failed to archive",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setSource("");
    setAmount("");
    setDate(new Date().toISOString().split("T")[0]);
    setCategory("salary");
    setDescription("");
    setVatable(false);
    setOutputVatAmount("");
    setWhtDeducted(false);
    setWhtAmount("");
    setTaxExempt(false);
    setClassification(null);
  };

  const handleVatAmountInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    if (value === "") {
      setOutputVatAmount("");
      return;
    }
    const formatted = new Intl.NumberFormat("en-NG").format(parseInt(value));
    setOutputVatAmount(formatted);
  };

  const handleWhtAmountInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    if (value === "") {
      setWhtAmount("");
      return;
    }
    const formatted = new Intl.NumberFormat("en-NG").format(parseInt(value));
    setWhtAmount(formatted);
  };

  const handleAmountInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    if (value === "") {
      setAmount("");
      return;
    }
    const formatted = new Intl.NumberFormat("en-NG").format(parseInt(value));
    setAmount(formatted);
  };

  // Filter incomes
  const filteredIncomes = incomes.filter(income => {
    const matchesSearch =
      income.source.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (income.description?.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = categoryFilter === "all" || income.category === categoryFilter;

    const matchesTaxStatus =
      taxStatusFilter === "all" ||
      (taxStatusFilter === "taxable" && !income.tax_exempt) ||
      (taxStatusFilter === "exempt" && income.tax_exempt);

    const incomeDate = new Date(income.date);
    const matchesDateFrom = !dateRange?.from || incomeDate >= dateRange.from;
    const matchesDateTo = !dateRange?.to || incomeDate <= dateRange.to;

    return matchesSearch && matchesCategory && matchesTaxStatus && matchesDateFrom && matchesDateTo;
  });

  // Calculate totals
  const totalIncome = filteredIncomes.reduce((sum, income) => {
    return sum + stringToKobo(income.amount_kobo);
  }, 0n);

  const taxableIncome = filteredIncomes
    .filter(i => !i.tax_exempt)
    .reduce((sum, income) => sum + stringToKobo(income.amount_kobo), 0n);

  const exemptIncome = filteredIncomes
    .filter(i => i.tax_exempt)
    .reduce((sum, income) => sum + stringToKobo(income.amount_kobo), 0n);

  const getCategoryLabel = (value: string | null) => {
    if (!value) return "Uncategorized";
    return INCOME_CATEGORIES.find(c => c.value === value)?.label || value;
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-grow pt-20 md:pt-28 pb-16 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-grow pt-20 md:pt-28 pb-16">
        <div className="container mx-auto px-4 md:px-6 max-w-4xl" data-tour="income-expenses">
          <Link to="/dashboard" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>

          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">Income Records</h1>
              <p className="text-muted-foreground">Track your income sources for tax calculations</p>
            </div>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Income
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Record New Income</DialogTitle>
                  <DialogDescription>
                    Add an income entry for tracking and tax calculations.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                  <div className="space-y-2">
                    <Label>Source *</Label>
                    <Input
                      placeholder="e.g., ABC Company, Client Name"
                      value={source}
                      onChange={(e) => setSource(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Amount (₦) *</Label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={amount}
                        onChange={handleAmountInput}
                        className="font-mono"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Date *</Label>
                      <Input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {INCOME_CATEGORIES.map(c => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* AI-Powered Tax Classification */}
                  <div className={`p-4 rounded-lg border ${isClassifying
                      ? 'bg-muted/50 border-muted-foreground/20'
                      : classification
                        ? getConfidenceBgColor(classification.confidence)
                        : taxExempt
                          ? 'bg-blue-500/10 border-blue-500/20'
                          : 'bg-amber-500/10 border-amber-500/20'
                    }`}>
                    <div className="flex items-start gap-3">
                      {isClassifying ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-medium flex items-center gap-2">
                              <Sparkles className="h-4 w-4" />
                              AI Analyzing...
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Checking against Nigerian tax rules
                            </p>
                          </div>
                        </>
                      ) : classification ? (
                        <>
                          <div className="flex-shrink-0 mt-0.5">
                            {taxExempt ? (
                              <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            ) : (
                              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className={`font-medium ${taxExempt ? 'text-blue-700 dark:text-blue-400' : 'text-amber-700 dark:text-amber-400'}`}>
                                {taxExempt ? '🔵 Tax Exempt' : '💰 Taxable Income'}
                              </p>
                              <span className={`text-xs px-2 py-0.5 rounded-full border flex items-center gap-1 ${getConfidenceBgColor(classification.confidence)} ${getConfidenceColor(classification.confidence)}`}>
                                <Sparkles className="h-3 w-3" />
                                {classification.confidence} confidence
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {classification.reasoning}
                            </p>
                            {classification.legal_reference && (
                              <p className="text-xs text-muted-foreground mt-1 font-mono">
                                📖 {classification.legal_reference}
                              </p>
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex-shrink-0 mt-0.5">
                            {taxExempt ? (
                              <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            ) : (
                              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                            )}
                          </div>
                          <div>
                            <p className={`font-medium ${taxExempt ? 'text-blue-700 dark:text-blue-400' : 'text-amber-700 dark:text-amber-400'}`}>
                              {taxExempt ? '🔵 Tax Exempt' : '💰 Taxable Income'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Enter a source to get AI classification
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium">Override Classification</p>
                      <p className="text-sm text-muted-foreground">
                        Manually set if AI got it wrong
                      </p>
                    </div>
                    <Switch checked={taxExempt} onCheckedChange={setTaxExempt} />
                  </div>

                  <div className="space-y-2">
                    <Label>Description (Optional)</Label>
                    <Textarea
                      placeholder="Additional notes..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={2}
                    />
                  </div>

                  {/* WHT Section */}
                  <div className="flex items-center justify-between p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    <div>
                      <p className="font-medium flex items-center gap-2">
                        <BadgePercent className="h-4 w-4 text-amber-500" />
                        WHT Deducted at Source?
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Toggle if WHT was already deducted from this income
                      </p>
                    </div>
                    <Switch checked={whtDeducted} onCheckedChange={setWhtDeducted} />
                  </div>
                  {whtDeducted && (
                    <div className="space-y-2">
                      <Label>WHT Amount Deducted (₦)</Label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="e.g., 10,000"
                        value={whtAmount}
                        onChange={handleWhtAmountInput}
                        className="font-mono"
                      />
                      <p className="text-xs text-muted-foreground">
                        This amount will be credited against your PIT/CIT liability
                      </p>
                    </div>
                  )}

                  {/* VAT Section */}
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium flex items-center gap-2">
                        <Receipt className="h-4 w-4" />
                        VATable Income?
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Toggle if this income is subject to VAT
                      </p>
                    </div>
                    <Switch checked={vatable} onCheckedChange={setVatable} />
                  </div>
                  {vatable && (
                    <div className="space-y-2">
                      <Label>Output VAT Amount (₦)</Label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="Auto-calculated at 7.5% if empty"
                        value={outputVatAmount}
                        onChange={handleVatAmountInput}
                        className="font-mono"
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter the actual VAT charged, or leave blank for 7.5% default
                      </p>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAdd} disabled={isAdding || !source.trim() || !amount}>
                    {isAdding ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      "Add Income"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="p-4 bg-secondary/10 border-secondary/20">
              <p className="text-sm text-muted-foreground">Total Income</p>
              <p className="text-2xl font-mono font-bold text-secondary">
                {formatKoboToNgn(totalIncome)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {filteredIncomes.length} records
              </p>
            </Card>
            <Card className="p-4 bg-amber-500/10 border-amber-500/20">
              <p className="text-sm text-muted-foreground">Taxable Income</p>
              <p className="text-2xl font-mono font-bold text-amber-600 dark:text-amber-400">
                {formatKoboToNgn(taxableIncome)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {filteredIncomes.filter(i => !i.tax_exempt).length} taxable records
              </p>
            </Card>
            <Card className="p-4 bg-blue-500/10 border-blue-500/20">
              <p className="text-sm text-muted-foreground">Tax Exempt</p>
              <p className="text-2xl font-mono font-bold text-blue-600 dark:text-blue-400">
                {formatKoboToNgn(exemptIncome)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {filteredIncomes.filter(i => i.tax_exempt).length} exempt records
              </p>
            </Card>
          </div>

          {/* Filters */}
          <Card className="p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by source or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {INCOME_CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={taxStatusFilter} onValueChange={setTaxStatusFilter}>
                <SelectTrigger className="w-full md:w-40">
                  <SelectValue placeholder="Tax Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="taxable">Taxable</SelectItem>
                  <SelectItem value="exempt">Tax Exempt</SelectItem>
                </SelectContent>
              </Select>
              <DateRangeFilter
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
              />
              {/* Show history toggle */}
              <div className="flex items-center gap-2">
                <Switch
                  checked={showHistory}
                  onCheckedChange={setShowHistory}
                  id="show-history"
                />
                <Label htmlFor="show-history" className="text-sm cursor-pointer flex items-center gap-1">
                  <History className="h-4 w-4" />
                  Show history
                </Label>
              </div>
            </div>
          </Card>

          {/* Income List */}
          {isLoading ? (
            <Card className="p-12 flex flex-col items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Loading incomes...</p>
            </Card>
          ) : filteredIncomes.length === 0 ? (
            <Card className="p-12 text-center">
              <Banknote className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <h3 className="text-lg font-semibold mb-2">
                {incomes.length === 0 ? "No income records yet" : "No matching records"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {incomes.length === 0
                  ? "Start tracking your income for accurate tax calculations."
                  : "Try adjusting your filters."}
              </p>
              {incomes.length === 0 && (
                <Button onClick={() => setShowAddDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Income
                </Button>
              )}
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredIncomes.map(income => {
                const isSuperseded = income.status === 'superseded';
                return (
                  <Card key={income.id} className={`p-4 ${isSuperseded ? 'opacity-60 border-dashed' : ''}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-semibold">{income.source}</h3>
                          <span className="text-xs px-2 py-0.5 bg-muted rounded-full">
                            {getCategoryLabel(income.category)}
                          </span>
                          {isSuperseded && (
                            <span className="text-xs px-2 py-0.5 bg-gray-500/10 text-gray-500 border border-gray-500/20 rounded-full">
                              ⛔ Superseded
                            </span>
                          )}
                          {!isSuperseded && income.tax_exempt ? (
                            <span className="text-xs px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded-full">
                              🔵 Tax Exempt
                            </span>
                          ) : !isSuperseded ? (
                            <span className="text-xs px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-full">
                              💰 Taxable
                            </span>
                          ) : null}
                          {income.wht_deducted && (
                            <span className="text-xs px-2 py-0.5 bg-purple-500/10 text-purple-600 border border-purple-500/20 rounded-full flex items-center gap-1">
                              <BadgePercent className="h-3 w-3" />
                              WHT: {formatKoboToNgn(BigInt(income.wht_credit_kobo || 0))}
                            </span>
                          )}
                          {income.vatable && (
                            <span className="text-xs px-2 py-0.5 bg-green-500/10 text-green-600 border border-green-500/20 rounded-full">
                              VATable
                            </span>
                          )}
                        </div>
                        {income.description && (
                          <p className="text-sm text-muted-foreground mb-2">{income.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {new Date(income.date).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className={`text-xl font-mono font-bold ${isSuperseded ? 'text-muted-foreground line-through' : 'text-secondary'}`}>
                          {formatKoboToNgn(stringToKobo(income.amount_kobo))}
                        </p>
                        {!isSuperseded && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setCorrectionTarget(income)}
                              className="text-muted-foreground hover:text-primary"
                              title="Correct Record"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleArchive(income.id)}
                              className="text-muted-foreground hover:text-destructive"
                              title="Archive"
                            >
                              <Archive className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />

      {/* Correction Dialog */}
      {correctionTarget && (
        <IncomeCorrectionDialog
          open={!!correctionTarget}
          onOpenChange={(open) => !open && setCorrectionTarget(null)}
          record={correctionTarget}
          categories={INCOME_CATEGORIES}
          onCorrected={() => {
            setCorrectionTarget(null);
            fetchIncomes();
          }}
        />
      )}
    </div>
  );
}
