import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AuthGuard } from "@/components/AuthGuard";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader2, Calculator, Calendar, TrendingUp, ArrowLeft, Tag, Archive, Building2, Receipt, Banknote, Landmark, FileDown, FileSpreadsheet, ChevronDown, Lock, CheckCircle2, Shield } from "lucide-react";
import { format, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { DateRange } from "react-day-picker";
import { formatKoboToNgn, stringToKobo } from "@/lib/money";
import { useToast } from "@/hooks/use-toast";
import { writeAuditLog, AuditActions } from "@/lib/auditLog";
import { exportCalculationPDF } from "@/lib/pdfExport";
import { exportCalculationCSV } from "@/lib/csvExport";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { finalizeCalculationAtomic } from "@/lib/atomicCorrections";

interface TaxCalculation {
  id: string;
  created_at: string;
  tax_type: string;
  rule_version: string;
  input_json: Record<string, unknown>;
  output_json: Record<string, unknown>;
  finalized: boolean;
  archived: boolean;
  status?: string;
  finalized_at?: string;
  effective_date_used?: string;
}

/**
 * Display helper that handles both KOBO and legacy formats.
 */
function displayCurrency(koboStr: string | undefined, legacyValue: number | undefined): string {
  if (koboStr) {
    return formatKoboToNgn(stringToKobo(koboStr));
  }
  if (legacyValue !== undefined) {
    return formatKoboToNgn(BigInt(Math.round(legacyValue * 100)));
  }
  return "₦0";
}

/**
 * Get the primary amount fields based on tax type
 */
function getAmountFields(calc: TaxCalculation): {
  inputLabel: string;
  inputKobo?: string;
  inputLegacy?: number;
  taxLabel: string;
  taxKobo?: string;
  taxLegacy?: number;
  netLabel: string;
  netKobo?: string;
  netLegacy?: number;
} {
  const input = calc.input_json as Record<string, unknown>;
  const output = calc.output_json as Record<string, unknown>;

  switch (calc.tax_type) {
    case "CIT":
      return {
        inputLabel: "Taxable Profit",
        inputKobo: input.taxableProfitKobo as string | undefined,
        inputLegacy: input.taxableProfit as number | undefined,
        taxLabel: "CIT Payable",
        taxKobo: output.taxPayableKobo as string | undefined,
        taxLegacy: output.taxPayable as number | undefined,
        netLabel: "Net Profit",
        netKobo: output.netProfitKobo as string | undefined,
        netLegacy: output.netProfit as number | undefined,
      };
    case "VAT":
      return {
        inputLabel: "Taxable Sales",
        inputKobo: input.taxableSalesKobo as string | undefined,
        inputLegacy: input.taxableSales as number | undefined,
        taxLabel: "VAT Payable",
        taxKobo: output.vatPayableKobo as string | undefined,
        taxLegacy: output.vatPayable as number | undefined,
        netLabel: "Total (incl. VAT)",
        netKobo: output.totalWithVatKobo as string | undefined,
        netLegacy: output.totalWithVat as number | undefined,
      };
    case "WHT":
      return {
        inputLabel: "Payment Amount",
        inputKobo: input.paymentAmountKobo as string | undefined,
        inputLegacy: input.paymentAmount as number | undefined,
        taxLabel: "WHT Deductible",
        taxKobo: output.whtPayableKobo as string | undefined,
        taxLegacy: output.whtPayable as number | undefined,
        netLabel: "Net Payment",
        netKobo: output.netPaymentKobo as string | undefined,
        netLegacy: output.netPayment as number | undefined,
      };
    case "CGT":
      return {
        inputLabel: "Sale Proceeds",
        inputKobo: input.proceedsKobo as string | undefined,
        inputLegacy: input.proceeds as number | undefined,
        taxLabel: "CGT Payable",
        taxKobo: output.cgtPayableKobo as string | undefined,
        taxLegacy: output.cgtPayable as number | undefined,
        netLabel: "Net Proceeds",
        netKobo: output.netProceedsKobo as string | undefined,
        netLegacy: output.netProceeds as number | undefined,
      };
    case "PIT":
    default:
      return {
        inputLabel: "Taxable Income",
        inputKobo: input.annualSalaryKobo as string | undefined,
        inputLegacy: input.annualSalary as number | undefined,
        taxLabel: "Tax Payable",
        taxKobo: output.totalTaxKobo as string | undefined,
        taxLegacy: output.totalTax as number | undefined,
        netLabel: "Net Income",
        netKobo: output.netAnnualIncomeKobo as string | undefined,
        netLegacy: output.netAnnualIncome as number | undefined,
      };
  }
}

function getTaxTypeIcon(taxType: string) {
  switch (taxType) {
    case "CIT":
      return Building2;
    case "VAT":
      return Receipt;
    case "WHT":
      return Banknote;
    case "CGT":
      return Landmark;
    default:
      return Calculator;
  }
}

function getTaxTypeBadgeColor(taxType: string) {
  switch (taxType) {
    case "CIT":
      return "bg-blue-600/10 text-blue-600 border-blue-600/20";
    case "VAT":
      return "bg-emerald-600/10 text-emerald-600 border-emerald-600/20";
    case "WHT":
      return "bg-amber-600/10 text-amber-600 border-amber-600/20";
    case "CGT":
      return "bg-purple-600/10 text-purple-600 border-purple-600/20";
    default:
      return "bg-primary/10 text-primary border-primary/20";
  }
}

function MyCalculationsContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [calculations, setCalculations] = useState<TaxCalculation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<TaxCalculation | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [finalizeTarget, setFinalizeTarget] = useState<TaxCalculation | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Filter calculations by date range and status
  const filteredCalculations = useMemo(() => {
    let filtered = calculations;
    
    // Status filter
    if (statusFilter !== "all") {
      if (statusFilter === "draft") {
        filtered = filtered.filter(c => !c.finalized);
      } else if (statusFilter === "finalized") {
        filtered = filtered.filter(c => c.finalized);
      }
    }
    
    // Date range filter
    if (dateRange?.from) {
      const from = startOfDay(dateRange.from!);
      const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from!);
      filtered = filtered.filter((calc) => {
        const calcDate = new Date(calc.created_at);
        return isWithinInterval(calcDate, { start: from, end: to });
      });
    }
    
    return filtered;
  }, [calculations, dateRange, statusFilter]);

  useEffect(() => {
    if (user) {
      fetchCalculations();
    }
  }, [user]);

  const fetchCalculations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch columns needed for list view including finalization info
      const { data, error } = await supabase
        .from("tax_calculations")
        .select("id, created_at, tax_type, rule_version, input_json, output_json, finalized, archived, status, finalized_at, effective_date_used")
        .eq("user_id", user!.id)
        .eq("archived", false)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setCalculations((data || []) as unknown as TaxCalculation[]);
    } catch (err: any) {
      setError(err.message || "Failed to load calculations");
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!archiveTarget) return;

    setIsArchiving(true);
    try {
      const { error } = await supabase
        .from("tax_calculations")
        .update({ archived: true })
        .eq("id", archiveTarget.id);

      if (error) throw error;

      await writeAuditLog({
        action: AuditActions.CALCULATION_ARCHIVED,
        entity_type: "tax_calculation",
        entity_id: archiveTarget.id,
        metadata: { tax_type: archiveTarget.tax_type, rule_version: archiveTarget.rule_version },
      });

      toast({
        title: "Calculation archived",
        description: "The calculation has been archived successfully.",
      });

      setArchiveTarget(null);
      fetchCalculations();
    } catch (err: any) {
      toast({
        title: "Failed to archive",
        description: err.message || "An error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsArchiving(false);
    }
  };

  const handleFinalize = async () => {
    if (!finalizeTarget) return;

    setIsFinalizing(true);
    try {
      const result = await finalizeCalculationAtomic(finalizeTarget.id);

      if (!result.success) {
        throw new Error(result.error || "Finalization failed");
      }

      toast({
        title: "Calculation Finalized",
        description: "This calculation is now immutable and cannot be modified.",
      });

      setFinalizeTarget(null);
      fetchCalculations();
    } catch (err: any) {
      toast({
        title: "Failed to finalize",
        description: err.message || "An error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsFinalizing(false);
    }
  };

  const handleExportPDF = async (calc: TaxCalculation) => {
    setExportingId(calc.id);
    try {
      exportCalculationPDF(calc);
      
      await writeAuditLog({
        action: "calculation.exported",
        entity_type: "tax_calculation",
        entity_id: calc.id,
        metadata: {
          tax_type: calc.tax_type,
          rule_version: calc.rule_version,
          export_format: "pdf",
        },
      });

      toast({
        title: "PDF Exported",
        description: "Your calculation has been exported as PDF.",
      });
    } catch (err: any) {
      toast({
        title: "Export Failed",
        description: err.message || "Could not export PDF.",
        variant: "destructive",
      });
    } finally {
      setExportingId(null);
    }
  };

  const handleExportCSV = async (calc: TaxCalculation) => {
    setExportingId(calc.id);
    try {
      exportCalculationCSV(calc);
      
      await writeAuditLog({
        action: "calculation.exported",
        entity_type: "tax_calculation",
        entity_id: calc.id,
        metadata: {
          tax_type: calc.tax_type,
          rule_version: calc.rule_version,
          export_format: "csv",
        },
      });

      toast({
        title: "CSV Exported",
        description: "Your calculation has been exported as CSV.",
      });
    } catch (err: any) {
      toast({
        title: "Export Failed",
        description: err.message || "Could not export CSV.",
        variant: "destructive",
      });
    } finally {
      setExportingId(null);
    }
  };


  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-grow pt-20 md:pt-28 pb-16">
        <div className="container mx-auto px-4 md:px-6 max-w-4xl">
          <div className="mb-8">
            <Link to="/" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Link>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground">My Calculations</h1>
                <p className="text-muted-foreground mt-2">Your saved tax calculations</p>
              </div>
              {calculations.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <select 
                    value={statusFilter} 
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-9 px-3 rounded-md border bg-background text-sm"
                  >
                    <option value="all">All Status</option>
                    <option value="draft">Draft</option>
                    <option value="finalized">Finalized</option>
                  </select>
                  <DateRangeFilter
                    dateRange={dateRange}
                    onDateRangeChange={setDateRange}
                  />
                </div>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <Card className="border-destructive/50">
              <CardContent className="pt-6">
                <p className="text-destructive text-center">{error}</p>
                <Button onClick={fetchCalculations} className="mt-4 mx-auto block">
                  Try Again
                </Button>
              </CardContent>
            </Card>
          ) : calculations.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center py-12">
                <Calculator className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No calculations yet</h3>
                <p className="text-muted-foreground mb-4">
                  Use our tax calculators to save your first calculation.
                </p>
                <Button asChild>
                  <Link to="/calculators">Go to Calculators</Link>
                </Button>
              </CardContent>
            </Card>
          ) : filteredCalculations.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No calculations in this date range</h3>
                <p className="text-muted-foreground mb-4">
                  Try selecting a different date range or clear the filter.
                </p>
                <Button variant="outline" onClick={() => setDateRange(undefined)}>
                  Clear Filter
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredCalculations.map((calc) => {
                const Icon = getTaxTypeIcon(calc.tax_type);
                const badgeColor = getTaxTypeBadgeColor(calc.tax_type);
                const amounts = getAmountFields(calc);
                const effectiveRate = (calc.output_json as Record<string, unknown>).effectiveRate as number | undefined;

                return (
                  <Card key={calc.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Icon className="h-5 w-5 text-primary" />
                          <Badge className={badgeColor} variant="outline">
                            {calc.tax_type}
                          </Badge>
                          Calculation
                          {calc.finalized ? (
                            <Badge className="bg-green-600/10 text-green-600 border-green-600/20 flex items-center gap-1">
                              <Lock className="h-3 w-3" />
                              Finalized
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">
                              Draft
                            </Badge>
                          )}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4 mr-1" />
                            {format(new Date(calc.created_at), "MMM d, yyyy 'at' h:mm a")}
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={exportingId === calc.id}
                                className="h-8 px-2"
                              >
                                {exportingId === calc.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <FileDown className="h-4 w-4 mr-1" />
                                    Export
                                    <ChevronDown className="h-3 w-3 ml-1" />
                                  </>
                                )}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleExportPDF(calc)}>
                                <FileDown className="h-4 w-4 mr-2" />
                                Export as PDF
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleExportCSV(calc)}>
                                <FileSpreadsheet className="h-4 w-4 mr-2" />
                                Export as CSV
                              </DropdownMenuItem>
                              {!calc.finalized && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => setFinalizeTarget(calc)}>
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                    Finalize
                                  </DropdownMenuItem>
                                </>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setArchiveTarget(calc)}>
                                <Archive className="h-4 w-4 mr-2" />
                                Archive
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      <CardDescription className="flex items-center gap-2 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Tag className="h-3 w-3" />
                          Rule: {calc.rule_version || "v1"}
                        </span>
                        {calc.finalized_at && (
                          <span className="text-green-600 flex items-center gap-1">
                            <Shield className="h-3 w-3" />
                            Finalized: {format(new Date(calc.finalized_at), "MMM d, yyyy")}
                          </span>
                        )}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-muted/50 rounded-lg p-3">
                          <p className="text-xs text-muted-foreground mb-1">{amounts.inputLabel}</p>
                          <p className="font-mono font-semibold">
                            {displayCurrency(amounts.inputKobo, amounts.inputLegacy)}
                          </p>
                        </div>
                        <div className="bg-destructive/10 rounded-lg p-3">
                          <p className="text-xs text-destructive mb-1">{amounts.taxLabel}</p>
                          <p className="font-mono font-semibold text-destructive">
                            {displayCurrency(amounts.taxKobo, amounts.taxLegacy)}
                          </p>
                        </div>
                        <div className="bg-secondary/10 rounded-lg p-3">
                          <p className="text-xs text-secondary mb-1">{amounts.netLabel}</p>
                          <p className="font-mono font-semibold text-secondary">
                            {displayCurrency(amounts.netKobo, amounts.netLegacy)}
                          </p>
                        </div>
                        {effectiveRate !== undefined && (
                          <div className="bg-primary/10 rounded-lg p-3">
                            <p className="text-xs text-primary mb-1 flex items-center gap-1">
                              <TrendingUp className="h-3 w-3" />
                              Effective Rate
                            </p>
                            <p className="font-mono font-semibold text-primary">
                              {effectiveRate.toFixed(2)}%
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />

      {/* Archive Confirmation */}
      <AlertDialog open={!!archiveTarget} onOpenChange={() => setArchiveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Calculation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive this {archiveTarget?.tax_type} calculation? 
              It will be removed from your list but not permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive} disabled={isArchiving}>
              {isArchiving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Finalize Confirmation */}
      <AlertDialog open={!!finalizeTarget} onOpenChange={() => setFinalizeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              Finalize Calculation
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Are you sure you want to finalize this {finalizeTarget?.tax_type} calculation?
              </p>
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <p className="text-amber-700 dark:text-amber-400 text-sm font-medium">
                  ⚠️ This action is irreversible
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Finalized calculations become immutable and cannot be corrected, 
                  edited, or deleted. They are preserved permanently for audit compliance.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleFinalize} 
              disabled={isFinalizing}
              className="bg-green-600 hover:bg-green-700"
            >
              {isFinalizing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Finalize
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function MyCalculations() {
  return (
    <AuthGuard>
      <MyCalculationsContent />
    </AuthGuard>
  );
}
