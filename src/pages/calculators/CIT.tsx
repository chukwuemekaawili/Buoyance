import { useState, useMemo, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Building2, TrendingUp, Info, Save, Loader2, AlertCircle, ArrowLeft, Scale } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useConsent } from "@/hooks/useConsent";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { ConsentModal } from "@/components/ConsentModal";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { OptimizationOpportunities } from "@/components/OptimizationOpportunities";
import { RecordsLoader } from "@/components/calculator/RecordsLoader";
import { RecordsSummary } from "@/hooks/useRecordsForPeriod";
import {
  parseNgnToKobo,
  formatKoboToNgn,
  mulKoboByRate,
  subKobo,
  koboToString,
  calculateEffectiveRate,
} from "@/lib/money";

// Minimum Effective Tax Rate (OECD Pillar 2 / Nigeria Finance Act 2023)
const MINIMUM_ETR = 0.15; // 15%

interface CITRulesJson {
  currency: string;
  kobo_factor: number;
  rates: {
    standard_rate: number;
    small_company_rate: number;
    small_company_threshold_kobo: number;
    minimum_etr?: number;
    mne_threshold_eur?: number;
  };
  description: string;
}

interface TaxRule {
  id: string;
  tax_type: string;
  version: string;
  effective_date: string;
  law_reference_json: {
    act: string;
    section: string;
    effective: string;
  };
  rules_json: CITRulesJson;
  published: boolean;
}

export default function CITCalculator() {
  const [revenueInput, setRevenueInput] = useState<string>("");
  const [expensesInput, setExpensesInput] = useState<string>("");
  const [isSmallCompany, setIsSmallCompany] = useState(false);
  const [isLargeMNE, setIsLargeMNE] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [taxRule, setTaxRule] = useState<TaxRule | null>(null);
  const [ruleLoading, setRuleLoading] = useState(true);
  const [ruleError, setRuleError] = useState<string | null>(null);
  const [recordsSummary, setRecordsSummary] = useState<RecordsSummary | null>(null);
  const { user } = useAuth();
  const { hasConsent } = useConsent();
  const { toast } = useToast();
  const hasCalculationConsent = hasConsent("calculation");

  // Handle records loaded from RecordsLoader
  const handleRecordsLoaded = useCallback((summary: RecordsSummary) => {
    setRecordsSummary(summary);
    // Auto-fill revenue from incomes
    const revenueFormatted = new Intl.NumberFormat("en-NG").format(Number(summary.totalIncomeKobo / 100n));
    setRevenueInput(revenueFormatted);
    // Auto-fill allowable expenses from deductible expenses
    const expensesFormatted = new Intl.NumberFormat("en-NG").format(Number(summary.totalDeductibleExpensesKobo / 100n));
    setExpensesInput(expensesFormatted);
  }, []);

  const handleRecordsCleared = useCallback(() => {
    setRecordsSummary(null);
  }, []);

  useEffect(() => {
    async function fetchTaxRule() {
      try {
        setRuleLoading(true);
        setRuleError(null);
        
        const { data, error } = await supabase
          .from("tax_rules")
          .select("*")
          .eq("tax_type", "CIT")
          .eq("published", true)
          .eq("archived", false)
          .order("effective_date", { ascending: false })
          .limit(1)
          .single();

        if (error) {
          if (error.code === "PGRST116") {
            setRuleError("No published CIT rules found. Please contact support.");
          } else {
            throw error;
          }
          return;
        }

        setTaxRule(data as unknown as TaxRule);
      } catch (err: any) {
        console.error("Failed to fetch tax rule:", err);
        setRuleError("Failed to load tax rules. Please refresh the page.");
      } finally {
        setRuleLoading(false);
      }
    }

    fetchTaxRule();
  }, []);

  const revenueKobo = useMemo(() => {
    const ngnValue = revenueInput.replace(/,/g, "");
    return parseNgnToKobo(ngnValue);
  }, [revenueInput]);

  const allowableExpensesKobo = useMemo(() => {
    const ngnValue = expensesInput.replace(/,/g, "");
    return parseNgnToKobo(ngnValue);
  }, [expensesInput]);

  const taxableProfitKobo = useMemo(() => {
    const profit = revenueKobo - allowableExpensesKobo;
    return profit > 0n ? profit : 0n;
  }, [revenueKobo, allowableExpensesKobo]);

  const { taxPayableKobo, effectiveRate, appliedRate, minimumETRApplied, topUpTaxKobo } = useMemo(() => {
    if (!taxRule || taxableProfitKobo === 0n) {
      return { taxPayableKobo: 0n, effectiveRate: 0, appliedRate: 0, minimumETRApplied: false, topUpTaxKobo: 0n };
    }

    const { rates } = taxRule.rules_json;
    const thresholdKobo = BigInt(rates.small_company_threshold_kobo);
    
    const useSmallRate = isSmallCompany || taxableProfitKobo <= thresholdKobo;
    const baseRate = useSmallRate ? rates.small_company_rate : rates.standard_rate;
    
    let baseTax = mulKoboByRate(taxableProfitKobo, baseRate);
    let topUp = 0n;
    let finalTax = baseTax;
    let minETRUsed = false;
    
    if (isLargeMNE && !useSmallRate) {
      const minETR = rates.minimum_etr ?? MINIMUM_ETR;
      const currentETR = calculateEffectiveRate(baseTax, taxableProfitKobo) / 100;
      
      if (currentETR < minETR) {
        const minimumTax = mulKoboByRate(taxableProfitKobo, minETR);
        topUp = minimumTax - baseTax;
        finalTax = minimumTax;
        minETRUsed = true;
      }
    }
    
    const effRate = calculateEffectiveRate(finalTax, taxableProfitKobo);

    return { 
      taxPayableKobo: finalTax, 
      effectiveRate: effRate, 
      appliedRate: baseRate,
      minimumETRApplied: minETRUsed,
      topUpTaxKobo: topUp
    };
  }, [taxableProfitKobo, taxRule, isSmallCompany, isLargeMNE]);

  const netProfitKobo = subKobo(taxableProfitKobo, taxPayableKobo);

  const handleRevenueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    if (value === "") {
      setRevenueInput("");
      return;
    }
    const formatted = new Intl.NumberFormat("en-NG").format(parseInt(value));
    setRevenueInput(formatted);
  };

  const handleExpensesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    if (value === "") {
      setExpensesInput("");
      return;
    }
    const formatted = new Intl.NumberFormat("en-NG").format(parseInt(value));
    setExpensesInput(formatted);
  };

  const handleSaveCalculation = async () => {
    if (!user || !taxRule) return;
    
    if (!hasCalculationConsent) {
      setShowConsentModal(true);
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from("tax_calculations").insert({
        user_id: user.id,
        tax_type: "CIT",
        rule_version: taxRule.version,
        input_json: {
          revenueKobo: koboToString(revenueKobo),
          revenueNgn: formatKoboToNgn(revenueKobo),
          allowableExpensesKobo: koboToString(allowableExpensesKobo),
          allowableExpensesNgn: formatKoboToNgn(allowableExpensesKobo),
          taxableProfitKobo: koboToString(taxableProfitKobo),
          taxableProfitNgn: formatKoboToNgn(taxableProfitKobo),
          isSmallCompany,
          isLargeMNE,
          usedRecords: !!recordsSummary,
        },
        output_json: {
          taxPayableKobo: koboToString(taxPayableKobo),
          taxPayableNgn: formatKoboToNgn(taxPayableKobo),
          netProfitKobo: koboToString(netProfitKobo),
          netProfitNgn: formatKoboToNgn(netProfitKobo),
          effectiveRate,
          appliedRate,
          minimumETRApplied,
          topUpTaxKobo: koboToString(topUpTaxKobo),
        },
        finalized: false,
        status: 'draft',
        archived: false,
      });

      if (error) throw error;

      toast({
        title: "Calculation saved!",
        description: "View your saved calculations in My Calculations.",
      });
    } catch (err: any) {
      toast({
        title: "Failed to save",
        description: err.message || "An error occurred while saving.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-grow pt-20 md:pt-28 pb-16">
        <div className="container mx-auto px-4 md:px-6 max-w-2xl">
          <Link to="/calculators" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Calculators
          </Link>

          {ruleLoading ? (
            <Card className="p-12 flex flex-col items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Loading tax rules...</p>
            </Card>
          ) : ruleError || !taxRule ? (
            <Card className="p-12 flex flex-col items-center justify-center border-destructive/50">
              <AlertCircle className="h-8 w-8 text-destructive mb-4" />
              <p className="text-destructive font-medium">{ruleError || "Tax rules unavailable"}</p>
            </Card>
          ) : (
            <Card className="overflow-hidden border-2 border-border/50 shadow-xl">
              <div className="bg-primary p-6 text-primary-foreground">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-accent rounded-lg">
                    <Building2 className="h-5 w-5 text-accent-foreground" />
                  </div>
                  <h3 className="text-xl font-bold">CIT Calculator</h3>
                </div>
                <p className="text-primary-foreground/80 text-sm">
                  {taxRule.law_reference_json.act} • {taxRule.law_reference_json.section}
                </p>
                <div className="flex items-center gap-4 mt-2 text-xs text-primary-foreground/60">
                  <span>Version: {taxRule.version}</span>
                  <span>•</span>
                  <span>Effective: {new Date(taxRule.effective_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Records Loader */}
                <RecordsLoader
                  taxType="CIT"
                  onRecordsLoaded={handleRecordsLoaded}
                  onRecordsCleared={handleRecordsCleared}
                />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Company Details</Label>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm ${!isSmallCompany ? "font-medium" : "text-muted-foreground"}`}>
                        Standard Rate
                      </span>
                      <Switch
                        checked={isSmallCompany}
                        onCheckedChange={(checked) => {
                          setIsSmallCompany(checked);
                          if (checked) setIsLargeMNE(false);
                        }}
                      />
                      <span className={`text-sm ${isSmallCompany ? "font-medium" : "text-muted-foreground"}`}>
                        Small Company
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="revenue" className="text-sm">
                        Revenue / Gross Income
                      </Label>
                      <div className="relative mt-1">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-mono font-semibold">
                          ₦
                        </span>
                        <Input
                          id="revenue"
                          type="text"
                          inputMode="numeric"
                          placeholder="0"
                          value={revenueInput}
                          onChange={handleRevenueChange}
                          className="pl-10 h-12 text-lg font-mono font-semibold border-2"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="expenses" className="text-sm">
                        Allowable Expenses / Deductions
                      </Label>
                      <div className="relative mt-1">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-mono font-semibold">
                          ₦
                        </span>
                        <Input
                          id="expenses"
                          type="text"
                          inputMode="numeric"
                          placeholder="0"
                          value={expensesInput}
                          onChange={handleExpensesChange}
                          className="pl-10 h-12 text-lg font-mono font-semibold border-2"
                        />
                      </div>
                    </div>

                    {/* Taxable Profit (calculated) */}
                    <div className="bg-muted/50 rounded-lg p-3 border">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Taxable Profit</span>
                        <span className="font-mono font-bold text-lg text-primary">
                          {formatKoboToNgn(taxableProfitKobo)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Revenue minus Allowable Expenses
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Small company threshold: ₦25,000,000 turnover
                  </p>
                </div>

                {!isSmallCompany && (
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
                    <div>
                      <p className="font-medium flex items-center gap-2">
                        Large Multinational Enterprise
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>MNEs with consolidated revenue ≥ €750M are subject to a 15% minimum effective tax rate under OECD Pillar 2 (Global Anti-Base Erosion rules).</p>
                          </TooltipContent>
                        </Tooltip>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Subject to 15% minimum ETR (OECD Pillar 2)
                      </p>
                    </div>
                    <Switch
                      checked={isLargeMNE}
                      onCheckedChange={setIsLargeMNE}
                    />
                  </div>
                )}

                {taxableProfitKobo > 0n && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="bg-muted/50 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Applied Rate</span>
                        <span className="font-mono font-bold text-primary">
                          {(appliedRate * 100).toFixed(0)}%
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {isSmallCompany ? "Small company rate" : "Standard rate"} applied
                      </p>
                    </div>

                    {minimumETRApplied && (
                      <div className="flex items-start gap-3 p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
                        <Scale className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-amber-700 dark:text-amber-400">
                            Minimum ETR Applied (Pillar 2)
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Top-up tax of {formatKoboToNgn(topUpTaxKobo)} added to reach 15% minimum effective rate.
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-destructive/10 rounded-xl p-4 border border-destructive/20">
                        <div className="flex items-center gap-2 text-sm text-destructive font-medium mb-1">
                          CIT Payable
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-3.5 w-3.5" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Companies Income Tax {minimumETRApplied ? "(incl. top-up)" : `at ${(appliedRate * 100).toFixed(0)}%`}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <p className="text-2xl font-mono font-bold text-destructive">
                          {formatKoboToNgn(taxPayableKobo)}
                        </p>
                      </div>

                      <div className="bg-secondary/10 rounded-xl p-4 border border-secondary/20">
                        <div className="flex items-center gap-2 text-sm text-secondary font-medium mb-1">
                          <TrendingUp className="h-4 w-4" />
                          Net Profit
                        </div>
                        <p className="text-2xl font-mono font-bold text-secondary">
                          {formatKoboToNgn(netProfitKobo)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between bg-primary/5 rounded-lg p-4 border border-primary/10">
                      <span className="text-sm font-medium">Effective Tax Rate</span>
                      <span className="text-xl font-mono font-bold text-primary">
                        {effectiveRate.toFixed(2)}%
                      </span>
                    </div>

                    <div className="bg-muted/30 rounded-lg p-4 border">
                      <div className="flex items-center gap-2 mb-2">
                        <Scale className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Legal Basis</span>
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p>
                          <strong>Act:</strong> {taxRule.law_reference_json.act}
                        </p>
                        <p>
                          <strong>Section:</strong> {taxRule.law_reference_json.section}
                        </p>
                        <p>
                          <strong>Effective:</strong> {taxRule.law_reference_json.effective}
                        </p>
                        {isLargeMNE && minimumETRApplied && (
                          <p className="mt-2 pt-2 border-t border-border">
                            <strong>Pillar 2:</strong> OECD GloBE Rules (2023) — Minimum 15% ETR for MNEs ≥ €750M
                          </p>
                        )}
                      </div>
                    </div>

                    <OptimizationOpportunities taxType="CIT" />

                    <div className="pt-2">
                      {user ? (
                        <Button
                          onClick={handleSaveCalculation}
                          disabled={isSaving}
                          className="w-full"
                          variant="outline"
                        >
                          {isSaving ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="mr-2 h-4 w-4" />
                              Save Calculation
                            </>
                          )}
                        </Button>
                      ) : (
                        <Link to="/signin" className="block">
                          <Button variant="outline" className="w-full">
                            <Save className="mr-2 h-4 w-4" />
                            Sign in to save calculation
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                )}

                <p className="text-xs text-muted-foreground text-center pt-2 border-t border-border">
                  Calculations based on {taxRule.law_reference_json.act}. This is for informational purposes only.
                </p>
              </div>

              <ConsentModal
                open={showConsentModal}
                onConsentGiven={() => setShowConsentModal(false)}
                context="calculation"
              />
            </Card>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}