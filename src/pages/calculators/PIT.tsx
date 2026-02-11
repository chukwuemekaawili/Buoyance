import { useState, useMemo, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Calculator, TrendingUp, FileText, Info, Save, Loader2, AlertCircle, ArrowLeft, Scale } from "lucide-react";
import { OptimizationOpportunities } from "@/components/OptimizationOpportunities";
import { RecordsLoader } from "@/components/calculator/RecordsLoader";
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
import {
  parseNgnToKobo,
  formatKoboToNgn,
  addKobo,
  subKobo,
  mulKoboByRate,
  divKobo,
  calculateEffectiveRate,
  koboToString,
  minKobo,
} from "@/lib/money";
import { RecordsSummary } from "@/hooks/useRecordsForPeriod";

interface TaxBandRule {
  threshold_kobo: number | null;
  rate: number;
  label: string;
}

interface TaxRulesJson {
  bands: TaxBandRule[];
  currency: string;
  kobo_factor: number;
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
  rules_json: TaxRulesJson;
  published: boolean;
}

interface BandBreakdown {
  band: string;
  incomeKobo: bigint;
  rate: number;
  taxKobo: bigint;
}

function calculateProgressiveTaxKobo(
  annualIncomeKobo: bigint,
  bands: TaxBandRule[]
): {
  totalTaxKobo: bigint;
  breakdown: BandBreakdown[];
  effectiveRate: number;
} {
  let remainingIncomeKobo = annualIncomeKobo;
  let totalTaxKobo = 0n;
  const breakdown: BandBreakdown[] = [];

  for (const band of bands) {
    if (remainingIncomeKobo <= 0n) break;

    const thresholdKobo = band.threshold_kobo !== null
      ? BigInt(band.threshold_kobo)
      : remainingIncomeKobo;

    const taxableInBandKobo = minKobo(remainingIncomeKobo, thresholdKobo);
    const taxForBandKobo = mulKoboByRate(taxableInBandKobo, band.rate);

    if (taxableInBandKobo > 0n) {
      breakdown.push({
        band: band.label,
        incomeKobo: taxableInBandKobo,
        rate: band.rate,
        taxKobo: taxForBandKobo,
      });
    }

    totalTaxKobo = addKobo(totalTaxKobo, taxForBandKobo);
    remainingIncomeKobo = subKobo(remainingIncomeKobo, taxableInBandKobo);
  }

  const effectiveRate = calculateEffectiveRate(totalTaxKobo, annualIncomeKobo);

  return { totalTaxKobo, breakdown, effectiveRate };
}

export default function PITCalculator() {
  const [salaryInput, setSalaryInput] = useState<string>("");
  const [isMonthly, setIsMonthly] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [taxRule, setTaxRule] = useState<TaxRule | null>(null);
  const [ruleLoading, setRuleLoading] = useState(true);
  const [ruleError, setRuleError] = useState<string | null>(null);
  const [recordsSummary, setRecordsSummary] = useState<RecordsSummary | null>(null);
  const [deductionsInput, setDeductionsInput] = useState<string>("");
  const { user } = useAuth();
  const { hasConsent } = useConsent();
  const { toast } = useToast();
  const hasCalculationConsent = hasConsent("calculation");

  // When records are loaded, auto-fill income and deductions
  const handleRecordsLoaded = useCallback((summary: RecordsSummary) => {
    setRecordsSummary(summary);
    // Auto-fill salary from total income (as annual)
    const incomeNgn = Number(summary.totalIncomeKobo) / 100;
    setSalaryInput(new Intl.NumberFormat("en-NG").format(incomeNgn));
    setIsMonthly(false); // Switch to yearly since records are period totals
    
    // Auto-fill deductions from deductible expenses
    const deductionsNgn = Number(summary.totalDeductibleExpensesKobo) / 100;
    setDeductionsInput(new Intl.NumberFormat("en-NG").format(deductionsNgn));
  }, []);

  const handleRecordsCleared = useCallback(() => {
    setRecordsSummary(null);
    setDeductionsInput("");
  }, []);

  useEffect(() => {
    async function fetchTaxRule() {
      try {
        setRuleLoading(true);
        setRuleError(null);
        
        const { data, error } = await supabase
          .from("tax_rules")
          .select("*")
          .eq("tax_type", "PIT")
          .eq("published", true)
          .eq("archived", false)
          .order("effective_date", { ascending: false })
          .limit(1)
          .single();

        if (error) {
          if (error.code === "PGRST116") {
            setRuleError("No published PIT rules found. Please contact support.");
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

  const deductionsKobo = useMemo(() => {
    const ngnValue = deductionsInput.replace(/,/g, "");
    return parseNgnToKobo(ngnValue);
  }, [deductionsInput]);

  const annualSalaryKobo = useMemo(() => {
    const ngnValue = salaryInput.replace(/,/g, "");
    const kobo = parseNgnToKobo(ngnValue);
    const grossKobo = isMonthly ? kobo * 12n : kobo;
    // Apply deductions to reduce taxable income
    return grossKobo > deductionsKobo ? grossKobo - deductionsKobo : 0n;
  }, [salaryInput, isMonthly, deductionsKobo]);

  const { totalTaxKobo, breakdown, effectiveRate } = useMemo(() => {
    if (!taxRule || annualSalaryKobo === 0n) {
      return { totalTaxKobo: 0n, breakdown: [], effectiveRate: 0 };
    }
    return calculateProgressiveTaxKobo(annualSalaryKobo, taxRule.rules_json.bands);
  }, [annualSalaryKobo, taxRule]);

  const netAnnualIncomeKobo = subKobo(annualSalaryKobo, totalTaxKobo);
  const netMonthlyIncomeKobo = divKobo(netAnnualIncomeKobo, 12);
  const monthlyTaxKobo = divKobo(totalTaxKobo, 12);

  const handleDeductionsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    if (value === "") {
      setDeductionsInput("");
      return;
    }
    const formatted = new Intl.NumberFormat("en-NG").format(parseInt(value));
    setDeductionsInput(formatted);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    if (value === "") {
      setSalaryInput("");
      return;
    }
    const formatted = new Intl.NumberFormat("en-NG").format(parseInt(value));
    setSalaryInput(formatted);
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
        tax_type: "PIT",
        rule_version: taxRule.version,
        input_json: {
          annualSalaryKobo: koboToString(annualSalaryKobo),
          annualSalaryNgn: formatKoboToNgn(annualSalaryKobo),
          isMonthly,
        },
        output_json: {
          totalTaxKobo: koboToString(totalTaxKobo),
          totalTaxNgn: formatKoboToNgn(totalTaxKobo),
          netAnnualIncomeKobo: koboToString(netAnnualIncomeKobo),
          netAnnualIncomeNgn: formatKoboToNgn(netAnnualIncomeKobo),
          effectiveRate,
          breakdown: breakdown.map((b) => ({
            band: b.band,
            incomeKobo: koboToString(b.incomeKobo),
            rate: b.rate,
            taxKobo: koboToString(b.taxKobo),
          })),
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
                    <Calculator className="h-5 w-5 text-accent-foreground" />
                  </div>
                  <h3 className="text-xl font-bold">PIT Calculator</h3>
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
                  taxType="PIT"
                  onRecordsLoaded={handleRecordsLoaded}
                  onRecordsCleared={handleRecordsCleared}
                />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="salary" className="text-base font-semibold">
                      Gross Income
                    </Label>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm ${isMonthly ? "font-medium" : "text-muted-foreground"}`}>
                        Monthly
                      </span>
                      <Switch
                        checked={!isMonthly}
                        onCheckedChange={(checked) => setIsMonthly(!checked)}
                      />
                      <span className={`text-sm ${!isMonthly ? "font-medium" : "text-muted-foreground"}`}>
                        Yearly
                      </span>
                    </div>
                  </div>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-mono font-semibold">
                      ₦
                    </span>
                    <Input
                      id="salary"
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={salaryInput}
                      onChange={handleInputChange}
                      className="pl-10 h-14 text-xl font-mono font-semibold border-2"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {isMonthly
                      ? `Annual gross: ${formatKoboToNgn(parseNgnToKobo(salaryInput.replace(/,/g, "")) * 12n)}`
                      : `Monthly: ${formatKoboToNgn(divKobo(parseNgnToKobo(salaryInput.replace(/,/g, "")), 12))}`}
                  </p>
                </div>

                {/* Deductions Input */}
                <div className="space-y-3">
                  <Label htmlFor="deductions" className="text-base font-semibold flex items-center gap-2">
                    Deductions / Reliefs
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>Enter tax-deductible expenses and reliefs (pension, NHF, NHIS, life insurance, etc.)</p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-mono font-semibold">
                      ₦
                    </span>
                    <Input
                      id="deductions"
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={deductionsInput}
                      onChange={handleDeductionsChange}
                      className="pl-10 h-12 font-mono border-2"
                    />
                  </div>
                  {deductionsKobo > 0n && (
                    <p className="text-xs text-secondary">
                      Taxable income reduced by {formatKoboToNgn(deductionsKobo)}
                    </p>
                  )}
                </div>

                {annualSalaryKobo > 0n && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm font-medium">Taxable Income (after deductions)</p>
                    <p className="text-xl font-mono font-bold text-primary">
                      {formatKoboToNgn(annualSalaryKobo)}
                    </p>
                  </div>
                )}

                {annualSalaryKobo > 0n && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <FileText className="h-4 w-4 text-secondary" />
                        Tax Breakdown by Band
                      </div>
                      <div className="space-y-2">
                        {breakdown.map((item, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between text-sm py-2 border-b border-border/50 last:border-0"
                          >
                            <div className="space-y-0.5">
                              <span className="font-medium">{item.band}</span>
                              <div className="text-xs text-muted-foreground font-mono">
                                {formatKoboToNgn(item.incomeKobo)} @ {(item.rate * 100).toFixed(0)}%
                              </div>
                            </div>
                            <span className="font-mono font-semibold text-foreground">
                              {formatKoboToNgn(item.taxKobo)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-destructive/10 rounded-xl p-4 border border-destructive/20">
                        <div className="flex items-center gap-2 text-sm text-destructive font-medium mb-1">
                          Total Tax Payable
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-3.5 w-3.5" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>Calculated using {taxRule.version} progressive tax bands.</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <p className="text-2xl font-mono font-bold text-destructive">
                          {formatKoboToNgn(totalTaxKobo)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 font-mono">
                          {formatKoboToNgn(monthlyTaxKobo)}/month
                        </p>
                      </div>

                      <div className="bg-secondary/10 rounded-xl p-4 border border-secondary/20">
                        <div className="flex items-center gap-2 text-sm text-secondary font-medium mb-1">
                          <TrendingUp className="h-4 w-4" />
                          Net Income
                        </div>
                        <p className="text-2xl font-mono font-bold text-secondary">
                          {formatKoboToNgn(netAnnualIncomeKobo)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 font-mono">
                          {formatKoboToNgn(netMonthlyIncomeKobo)}/month
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between bg-primary/5 rounded-lg p-4 border border-primary/10">
                      <span className="text-sm font-medium">Effective Tax Rate</span>
                      <span className="text-xl font-mono font-bold text-primary">
                        {effectiveRate.toFixed(2)}%
                      </span>
                    </div>

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

                {/* Optimization Opportunities */}
                {annualSalaryKobo > 0n && (
                  <OptimizationOpportunities taxType="PIT" className="mt-6" />
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
