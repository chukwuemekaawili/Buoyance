import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Receipt, Plus, Archive, Loader2, ArrowLeft, Search, Filter, CheckCircle2, Sparkles, AlertCircle, Edit, History } from "lucide-react";
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
import { ExpenseCorrectionDialog } from "@/components/corrections/CorrectionDialog";
interface Expense {
  id: string;
  description: string;
  amount_kobo: string;
  date: string;
  category: string;
  deductible: boolean | null;
  archived: boolean | null;
  created_at: string | null;
  vatable: boolean;
  input_vat_kobo: string | null;
  invoice_ref: string | null;
  status?: string; // 'active' | 'superseded' | 'corrected' | 'archived'
  supersedes_id?: string | null;
}

// Category Logic Matrix: deductible defaults based on category
const EXPENSE_CATEGORIES = [
  { value: "rent", label: "Office Rent / Workspace", defaultDeductible: true },
  { value: "salaries", label: "Salaries / Wages", defaultDeductible: true },
  { value: "utilities", label: "Internet / Data", defaultDeductible: true },
  { value: "power", label: "Power / Diesel / Inverter", defaultDeductible: true },
  { value: "marketing", label: "Marketing / Ads", defaultDeductible: true },
  { value: "transport", label: "Transport / Logistics", defaultDeductible: true },
  { value: "cogs", label: "Cost of Goods Sold (COGS)", defaultDeductible: true },
  { value: "professional", label: "Professional Services (Legal/Audit)", defaultDeductible: true },
  { value: "office", label: "Office Supplies", defaultDeductible: true },
  { value: "equipment", label: "Equipment/Assets", defaultDeductible: true },
  { value: "insurance", label: "Insurance", defaultDeductible: true },
  { value: "maintenance", label: "Maintenance/Repairs", defaultDeductible: true },
  { value: "software", label: "Software/Subscriptions", defaultDeductible: true },
  { value: "training", label: "Training/Education", defaultDeductible: true },
  { value: "personal", label: "Personal / Groceries", defaultDeductible: false },
  { value: "entertainment", label: "Entertainment", defaultDeductible: false },
  { value: "fines", label: "Fines / Penalties", defaultDeductible: false },
  { value: "donations", label: "Donations (Non-approved)", defaultDeductible: false },
  { value: "other", label: "Other", defaultDeductible: false },
];

// Helper to get default deductibility based on category
const getCategoryDefaultDeductible = (categoryValue: string): boolean => {
  const category = EXPENSE_CATEGORIES.find(c => c.value === categoryValue);
  return category?.defaultDeductible ?? false;
};

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [deductibleFilter, setDeductibleFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [showHistory, setShowHistory] = useState(false); // Toggle to show superseded records

  // Form state
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [category, setCategory] = useState("rent");
  const [deductible, setDeductible] = useState(true);
  const [vatable, setVatable] = useState(false);
  const [inputVatAmount, setInputVatAmount] = useState("");
  
  // AI Classification state
  const [isClassifying, setIsClassifying] = useState(false);
  const [classification, setClassification] = useState<ClassificationResult | null>(null);
  const [correctionTarget, setCorrectionTarget] = useState<Expense | null>(null);

  // AI-powered classification when description or category changes
  const runAIClassification = useCallback(async (desc: string, cat: string) => {
    if (!desc.trim() || desc.length < 3) {
      setClassification(null);
      return;
    }
    
    setIsClassifying(true);
    try {
      const result = await classifyTaxItem({
        type: 'expense',
        description: desc,
        category: cat,
      });
      setClassification(result);
      if (result.deductible !== undefined) {
        setDeductible(result.deductible);
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
      if (description.trim().length >= 3) {
        runAIClassification(description, category);
      }
    }, 800); // Wait 800ms after user stops typing
    
    return () => clearTimeout(timer);
  }, [description, category, runAIClassification]);

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
    fetchExpenses();
  }, [user, authLoading, navigate, showHistory]);

  const fetchExpenses = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Only fetch ACTIVE records by default (archived=false AND status='active')
      // This ensures superseded records don't appear in the main list
      let query = supabase
        .from("expenses")
        .select("*")
        .eq("user_id", user.id)
        .eq("archived", false);
      
      // Filter out superseded records unless showHistory is enabled
      if (!showHistory) {
        query = query.eq("status", "active");
      }
      
      const { data, error } = await query.order("date", { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
    } catch (err: any) {
      toast({
        title: "Failed to load expenses",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!user || !description.trim() || !amount) return;

    setIsAdding(true);
    try {
      const amountKobo = parseNgnToKobo(amount.replace(/,/g, ""));
      const inputVatKobo = vatable && inputVatAmount 
        ? koboToString(parseNgnToKobo(inputVatAmount.replace(/,/g, "")))
        : null;
      
      const { error } = await supabase.from("expenses").insert({
        user_id: user.id,
        description: description.trim(),
        amount_kobo: koboToString(amountKobo),
        date,
        category,
        deductible,
        vatable,
        input_vat_kobo: inputVatKobo,
        archived: false,
      });

      if (error) throw error;

      toast({ title: "Expense recorded successfully" });
      setShowAddDialog(false);
      resetForm();
      fetchExpenses();
    } catch (err: any) {
      toast({
        title: "Failed to add expense",
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
        .from("expenses")
        .update({ archived: true })
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;

      toast({ title: "Expense archived" });
      fetchExpenses();
    } catch (err: any) {
      toast({
        title: "Failed to archive",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setDescription("");
    setAmount("");
    setDate(new Date().toISOString().split("T")[0]);
    setCategory("rent");
    setDeductible(true);
    setVatable(false);
    setInputVatAmount("");
    setClassification(null);
  };

  const handleVatAmountInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    if (value === "") {
      setInputVatAmount("");
      return;
    }
    const formatted = new Intl.NumberFormat("en-NG").format(parseInt(value));
    setInputVatAmount(formatted);
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

  // Filter expenses
  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = expense.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || expense.category === categoryFilter;
    const matchesDeductible = 
      deductibleFilter === "all" || 
      (deductibleFilter === "deductible" && expense.deductible) ||
      (deductibleFilter === "non-deductible" && !expense.deductible);
    
    const expenseDate = new Date(expense.date);
    const matchesDateFrom = !dateRange?.from || expenseDate >= dateRange.from;
    const matchesDateTo = !dateRange?.to || expenseDate <= dateRange.to;

    return matchesSearch && matchesCategory && matchesDeductible && matchesDateFrom && matchesDateTo;
  });

  // Calculate totals
  const totalExpenses = filteredExpenses.reduce((sum, expense) => {
    return sum + stringToKobo(expense.amount_kobo);
  }, 0n);

  const deductibleExpenses = filteredExpenses
    .filter(e => e.deductible)
    .reduce((sum, expense) => {
      return sum + stringToKobo(expense.amount_kobo);
    }, 0n);

  const getCategoryLabel = (value: string) => {
    return EXPENSE_CATEGORIES.find(c => c.value === value)?.label || value;
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
        <div className="container mx-auto px-4 md:px-6 max-w-4xl">
          <Link to="/dashboard" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>

          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">Expense Records</h1>
              <p className="text-muted-foreground">Track your expenses for tax deductions</p>
            </div>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Expense
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Record New Expense</DialogTitle>
                  <DialogDescription>
                    Add an expense entry. Mark as deductible if it qualifies for tax relief.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                  <div className="space-y-2">
                    <Label>Description *</Label>
                    <Textarea
                      placeholder="What was this expense for?"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={2}
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
                        {EXPENSE_CATEGORIES.map(c => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* AI-Powered Tax Classification */}
                  <div className={`p-4 rounded-lg border ${
                    isClassifying 
                      ? 'bg-muted/50 border-muted-foreground/20' 
                      : classification 
                        ? getConfidenceBgColor(classification.confidence)
                        : deductible 
                          ? 'bg-green-500/10 border-green-500/20' 
                          : 'bg-red-500/10 border-red-500/20'
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
                            {deductible ? (
                              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                            ) : (
                              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className={`font-medium ${deductible ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                                {deductible ? '✅ Tax Deductible' : '❌ Non-Deductible'}
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
                            {deductible ? (
                              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                            ) : (
                              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                            )}
                          </div>
                          <div>
                            <p className={`font-medium ${deductible ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                              {deductible ? '✅ Tax Deductible' : '❌ Non-Deductible'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Enter a description to get AI classification
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
                    <Switch checked={deductible} onCheckedChange={setDeductible} />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium">Has VAT Invoice</p>
                      <p className="text-sm text-muted-foreground">
                        Mark if you have a valid VAT invoice for input VAT credit
                      </p>
                    </div>
                    <Switch checked={vatable} onCheckedChange={setVatable} />
                  </div>
                  {vatable && (
                    <div className="space-y-2">
                      <Label>Input VAT Amount (₦)</Label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="Auto-calculated at 7.5% if empty"
                        value={inputVatAmount}
                        onChange={handleVatAmountInput}
                        className="font-mono"
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter the actual VAT amount from your invoice, or leave blank for 7.5% default
                      </p>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAdd} disabled={isAdding || !description.trim() || !amount}>
                    {isAdding ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      "Add Expense"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Card className="p-4 bg-destructive/10 border-destructive/20">
              <p className="text-sm text-muted-foreground">Total Expenses (Filtered)</p>
              <p className="text-2xl font-mono font-bold text-destructive">
                {formatKoboToNgn(totalExpenses)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {filteredExpenses.length} records
              </p>
            </Card>
            <Card className="p-4 bg-secondary/10 border-secondary/20">
              <p className="text-sm text-muted-foreground">Tax Deductible</p>
              <p className="text-2xl font-mono font-bold text-secondary">
                {formatKoboToNgn(deductibleExpenses)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {filteredExpenses.filter(e => e.deductible).length} deductible records
              </p>
            </Card>
          </div>

          {/* Filters */}
          <Card className="p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search expenses..."
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
                  {EXPENSE_CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={deductibleFilter} onValueChange={setDeductibleFilter}>
                <SelectTrigger className="w-full md:w-40">
                  <SelectValue placeholder="Deductible" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="deductible">Deductible</SelectItem>
                  <SelectItem value="non-deductible">Non-Deductible</SelectItem>
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

          {/* Expense List */}
          {isLoading ? (
            <Card className="p-12 flex flex-col items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Loading expenses...</p>
            </Card>
          ) : filteredExpenses.length === 0 ? (
            <Card className="p-12 text-center">
              <Receipt className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <h3 className="text-lg font-semibold mb-2">
                {expenses.length === 0 ? "No expense records yet" : "No matching records"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {expenses.length === 0 
                  ? "Start tracking your expenses to maximize tax deductions."
                  : "Try adjusting your filters."}
              </p>
              {expenses.length === 0 && (
                <Button onClick={() => setShowAddDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Expense
                </Button>
              )}
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredExpenses.map(expense => {
                const isSuperseded = expense.status === 'superseded';
                return (
                <Card key={expense.id} className={`p-4 ${isSuperseded ? 'opacity-60 border-dashed' : ''}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{expense.description}</h3>
                        <span className="text-xs px-2 py-0.5 bg-muted rounded-full">
                          {getCategoryLabel(expense.category)}
                        </span>
                        {isSuperseded && (
                          <span className="text-xs px-2 py-0.5 bg-gray-500/10 text-gray-500 border border-gray-500/20 rounded-full">
                            ⛔ Superseded
                          </span>
                        )}
                        {!isSuperseded && expense.deductible && (
                          <span className="text-xs px-2 py-0.5 bg-secondary/20 text-secondary rounded-full flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Deductible
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(expense.date).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className={`text-xl font-mono font-bold ${isSuperseded ? 'text-muted-foreground line-through' : 'text-destructive'}`}>
                        {formatKoboToNgn(stringToKobo(expense.amount_kobo))}
                      </p>
                      {!isSuperseded && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setCorrectionTarget(expense)}
                            className="text-muted-foreground hover:text-primary"
                            title="Correct Record"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleArchive(expense.id)}
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
              )})}
            </div>
          )}
        </div>
      </main>
      <Footer />

      {/* Correction Dialog */}
      {correctionTarget && (
        <ExpenseCorrectionDialog
          open={!!correctionTarget}
          onOpenChange={(open) => !open && setCorrectionTarget(null)}
          record={correctionTarget}
          categories={EXPENSE_CATEGORIES}
          onCorrected={() => {
            setCorrectionTarget(null);
            fetchExpenses();
          }}
        />
      )}
    </div>
  );
}
