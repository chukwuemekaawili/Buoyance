import { useState, useMemo, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Calculator, TrendingUp, FileText, Info, Save, Loader2, AlertCircle } from "lucide-react";
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

// Types for tax rules from database
interface TaxBandRule {
  threshold_kobo: number | null; // null = infinity
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

    // threshold_kobo is null for infinity band
    const thresholdKobo = band.threshold_kobo !== null
      ? BigInt(band.threshold_kobo)
      : remainingIncomeKobo; // Use remaining for infinity

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

export function TaxCalculator() {
  const [salaryInput, setSalaryInput] = useState<string>("");
  const [deductionsInput, setDeductionsInput] = useState<string>("");
  const [isMonthly, setIsMonthly] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [taxRule, setTaxRule] = useState<TaxRule | null>(null);
  const [ruleLoading, setRuleLoading] = useState(true);
  const [ruleError, setRuleError] = useState<string | null>(null);
  const { user } = useAuth();
  const { hasValidConsent } = useConsent();
  const { toast } = useToast();

  // Fetch the current published PIT rule
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
            setRuleError("No published tax rules found. Please contact support.");
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

  // Parse salary input to Kobo
  const annualSalaryKobo = useMemo(() => {
    const ngnValue = salaryInput.replace(/,/g, "");
    const kobo = parseNgnToKobo(ngnValue);
    return isMonthly ? kobo * 12n : kobo;
  }, [salaryInput, isMonthly]);

  // Parse deductions input to Kobo
  const annualDeductionsKobo = useMemo(() => {
    const ngnValue = deductionsInput.replace(/,/g, "");
    const kobo = parseNgnToKobo(ngnValue);
    return isMonthly ? kobo * 12n : kobo;
  }, [deductionsInput, isMonthly]);

  // Calculate taxable income after deductions
  const taxableIncomeKobo = useMemo(() => {
    const result = subKobo(annualSalaryKobo, annualDeductionsKobo);
    return result < 0n ? 0n : result;
  }, [annualSalaryKobo, annualDeductionsKobo]);

  // Calculate tax using bigint math
  const { totalTaxKobo, breakdown, effectiveRate } = useMemo(() => {
    if (!taxRule || taxableIncomeKobo === 0n) {
      return { totalTaxKobo: 0n, breakdown: [], effectiveRate: 0 };
    }
    return calculateProgressiveTaxKobo(taxableIncomeKobo, taxRule.rules_json.bands);
  }, [taxableIncomeKobo, taxRule]);

  const netAnnualIncomeKobo = subKobo(annualSalaryKobo, totalTaxKobo);
  const netMonthlyIncomeKobo = divKobo(netAnnualIncomeKobo, 12);
  const monthlyTaxKobo = divKobo(totalTaxKobo, 12);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    if (value === "") {
      setSalaryInput("");
      return;
    }
    const formatted = new Intl.NumberFormat("en-NG").format(parseInt(value));
    setSalaryInput(formatted);
  };

  const handleDeductionsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    if (value === "") {
      setDeductionsInput("");
      return;
    }
    const formatted = new Intl.NumberFormat("en-NG").format(parseInt(value));
    setDeductionsInput(formatted);
  };

  const handleSaveCalculation = async () => {
    if (!user || !taxRule) return;
    
    // Check consent before saving
    if (!hasValidConsent) {
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
          annualDeductionsKobo: koboToString(annualDeductionsKobo),
          annualDeductionsNgn: formatKoboToNgn(annualDeductionsKobo),
          taxableIncomeKobo: koboToString(taxableIncomeKobo),
          taxableIncomeNgn: formatKoboToNgn(taxableIncomeKobo),
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
        finalized: true,
        archived: false,
      });

      if (error) {
        if (error.code === "42501") {
          toast({
            title: "Permission denied",
            description: "You don't have permission to save calculations. Please sign in again.",
            variant: "destructive",
          });
        } else {
          throw error;
        }
        return;
      }

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

  if (ruleLoading) {
    return (
      <Card className="w-full max-w-2xl mx-auto overflow-hidden border-2 border-border/50 shadow-xl">
        <div className="p-12 flex flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading tax rules...</p>
        </div>
      </Card>
    );
  }

  if (ruleError || !taxRule) {
    return (
      <Card className="w-full max-w-2xl mx-auto overflow-hidden border-2 border-destructive/50 shadow-xl">
        <div className="p-12 flex flex-col items-center justify-center">
          <AlertCircle className="h-8 w-8 text-destructive mb-4" />
          <p className="text-destructive font-medium">{ruleError || "Tax rules unavailable"}</p>
          <p className="text-muted-foreground text-sm mt-2">Please try again later.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto overflow-hidden border-2 border-border/50 shadow-xl">
      {/* Header */}
      <div className="bg-primary p-6 text-primary-foreground">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-accent rounded-lg">
            <Calculator className="h-5 w-5 text-accent-foreground" />
          </div>
          <h3 className="text-xl font-bold">2026 Tax Estimator</h3>
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

      {/* Input Section */}
      <div className="p-6 space-y-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="salary" className="text-base font-semibold">
              Gross Salary
            </Label>
            <div className="flex items-center gap-3">
              <span
                className={`text-sm transition-colors ${
                  isMonthly ? "text-foreground font-medium" : "text-muted-foreground"
                }`}
              >
                Monthly
              </span>
              <Switch
                checked={!isMonthly}
                onCheckedChange={(checked) => setIsMonthly(!checked)}
              />
              <span
                className={`text-sm transition-colors ${
                  !isMonthly ? "text-foreground font-medium" : "text-muted-foreground"
                }`}
              >
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
            className="pl-10 h-14 text-xl font-mono font-semibold border-2 focus:border-secondary focus:ring-secondary"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {isMonthly
            ? `Annual: ${formatKoboToNgn(annualSalaryKobo)}`
            : `Monthly: ${formatKoboToNgn(divKobo(annualSalaryKobo, 12))}`}
        </p>
      </div>

      {/* Deductions / Reliefs Input */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="deductions" className="text-base font-semibold">
            Deductions / Reliefs
          </Label>
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>Enter allowable deductions: pension contributions, NHF, life insurance, mortgage interest, etc. These reduce your taxable income.</p>
            </TooltipContent>
          </Tooltip>
        </div>
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
            className="pl-10 h-14 text-xl font-mono font-semibold border-2 focus:border-secondary focus:ring-secondary"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {isMonthly
            ? `Annual deductions: ${formatKoboToNgn(annualDeductionsKobo)}`
            : `Monthly: ${formatKoboToNgn(divKobo(annualDeductionsKobo, 12))}`}
        </p>
        {annualDeductionsKobo > 0n && (
          <p className="text-xs text-secondary font-medium">
            Taxable income after deductions: {formatKoboToNgn(taxableIncomeKobo)}
          </p>
        )}
      </div>

        {/* Results */}
        {taxableIncomeKobo > 0n && (
          <div className="space-y-4 animate-fade-in">
            {/* Tax Breakdown */}
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

            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-destructive/10 rounded-xl p-4 border border-destructive/20">
                <div className="flex items-center gap-2 text-sm text-destructive font-medium mb-1">
                  Total Tax Payable
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3.5 w-3.5" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Calculated using {taxRule.version} progressive tax bands. This is an estimate for informational purposes only.</p>
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

            {/* Effective Rate */}
            <div className="flex items-center justify-between bg-primary/5 rounded-lg p-4 border border-primary/10">
              <span className="text-sm font-medium">Effective Tax Rate</span>
              <span className="text-xl font-mono font-bold text-primary">
                {effectiveRate.toFixed(2)}%
              </span>
            </div>

            {/* Save Calculation Button */}
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

        {/* Legal Disclaimer */}
        <p className="text-xs text-muted-foreground text-center pt-2 border-t border-border">
          Calculations based on {taxRule.law_reference_json.act}. This estimate is for informational purposes only and does not constitute tax or legal advice.
        </p>
      </div>

      {/* Consent Modal */}
      <ConsentModal
        open={showConsentModal}
        onConsentGiven={() => setShowConsentModal(false)}
      />
    </Card>
  );
}
