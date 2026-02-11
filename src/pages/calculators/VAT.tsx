import { useState, useMemo, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Receipt, TrendingUp, TrendingDown, Info, Save, Loader2, AlertCircle, ArrowLeft, Scale } from "lucide-react";
import { OptimizationOpportunities } from "@/components/OptimizationOpportunities";
import { RecordsLoader } from "@/components/calculator/RecordsLoader";
import { RecordsSummary } from "@/hooks/useRecordsForPeriod";
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
  mulKoboByRate,
  koboToString,
  subKobo,
} from "@/lib/money";

interface VATRulesJson {
  currency: string;
  kobo_factor: number;
  vat_rate: number;
  exempt_categories: string[];
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
  rules_json: VATRulesJson;
  published: boolean;
}

export default function VATCalculator() {
  const [outputVatInput, setOutputVatInput] = useState<string>("");
  const [inputVatInput, setInputVatInput] = useState<string>("");
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

  // Handle records loaded - auto-fill VAT values
  const handleRecordsLoaded = useCallback((summary: RecordsSummary) => {
    setRecordsSummary(summary);
    // Auto-fill output VAT from vatable income
    const outputVatFormatted = new Intl.NumberFormat("en-NG").format(Number(summary.totalOutputVatKobo / 100n));
    setOutputVatInput(outputVatFormatted);
    // Auto-fill input VAT from vatable expenses
    const inputVatFormatted = new Intl.NumberFormat("en-NG").format(Number(summary.totalInputVatKobo / 100n));
    setInputVatInput(inputVatFormatted);
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
          .eq("tax_type", "VAT")
          .eq("published", true)
          .eq("archived", false)
          .order("effective_date", { ascending: false })
          .limit(1)
          .single();

        if (error) {
          if (error.code === "PGRST116") {
            setRuleError("No published VAT rules found. Please contact support.");
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

  const outputVatKobo = useMemo(() => {
    const ngnValue = outputVatInput.replace(/,/g, "");
    return parseNgnToKobo(ngnValue);
  }, [outputVatInput]);

  const inputVatKobo = useMemo(() => {
    const ngnValue = inputVatInput.replace(/,/g, "");
    return parseNgnToKobo(ngnValue);
  }, [inputVatInput]);

  const { netVatPayableKobo, vatCredit, vatRate } = useMemo(() => {
    if (!taxRule) {
      return { netVatPayableKobo: 0n, vatCredit: 0n, vatRate: 0 };
    }

    const rate = taxRule.rules_json.vat_rate;
    const netVat = outputVatKobo > inputVatKobo 
      ? outputVatKobo - inputVatKobo 
      : 0n;
    const credit = inputVatKobo > outputVatKobo 
      ? inputVatKobo - outputVatKobo 
      : 0n;

    return { netVatPayableKobo: netVat, vatCredit: credit, vatRate: rate };
  }, [outputVatKobo, inputVatKobo, taxRule]);

  const handleOutputVatChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    if (value === "") {
      setOutputVatInput("");
      return;
    }
    const formatted = new Intl.NumberFormat("en-NG").format(parseInt(value));
    setOutputVatInput(formatted);
  };

  const handleInputVatChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    if (value === "") {
      setInputVatInput("");
      return;
    }
    const formatted = new Intl.NumberFormat("en-NG").format(parseInt(value));
    setInputVatInput(formatted);
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
        tax_type: "VAT",
        rule_version: taxRule.version,
        input_json: {
          outputVatKobo: koboToString(outputVatKobo),
          outputVatNgn: formatKoboToNgn(outputVatKobo),
          inputVatKobo: koboToString(inputVatKobo),
          inputVatNgn: formatKoboToNgn(inputVatKobo),
          usedRecords: !!recordsSummary,
        },
        output_json: {
          netVatPayableKobo: koboToString(netVatPayableKobo),
          netVatPayableNgn: formatKoboToNgn(netVatPayableKobo),
          vatCreditKobo: koboToString(vatCredit),
          vatCreditNgn: formatKoboToNgn(vatCredit),
          vatRate,
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

  const hasResults = outputVatKobo > 0n || inputVatKobo > 0n;

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
                    <Receipt className="h-5 w-5 text-accent-foreground" />
                  </div>
                  <h3 className="text-xl font-bold">VAT Calculator</h3>
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
                  taxType="VAT"
                  onRecordsLoaded={handleRecordsLoaded}
                  onRecordsCleared={handleRecordsCleared}
                />

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="outputVat" className="text-sm font-semibold flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-destructive" />
                      Output VAT (VAT Collected)
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>VAT you charged on your sales/services. At {(vatRate * 100).toFixed(1)}% rate.</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <div className="relative mt-1">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-mono font-semibold">
                        ₦
                      </span>
                      <Input
                        id="outputVat"
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={outputVatInput}
                        onChange={handleOutputVatChange}
                        className="pl-10 h-12 text-lg font-mono font-semibold border-2"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="inputVat" className="text-sm font-semibold flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-secondary" />
                      Input VAT (VAT Paid on Purchases)
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>VAT you paid on business purchases with valid VAT invoices. This reduces your net VAT payable.</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <div className="relative mt-1">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-mono font-semibold">
                        ₦
                      </span>
                      <Input
                        id="inputVat"
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={inputVatInput}
                        onChange={handleInputVatChange}
                        className="pl-10 h-12 text-lg font-mono font-semibold border-2"
                      />
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    VAT Rate: {(vatRate * 100).toFixed(1)}% • Net VAT = Output VAT − Input VAT
                  </p>
                </div>

                {hasResults && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-destructive/10 rounded-xl p-4 border border-destructive/20">
                        <div className="flex items-center gap-2 text-sm text-destructive font-medium mb-1">
                          Net VAT Payable
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-3.5 w-3.5" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Output VAT minus Input VAT (when positive)</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <p className="text-2xl font-mono font-bold text-destructive">
                          {formatKoboToNgn(netVatPayableKobo)}
                        </p>
                      </div>

                      <div className="bg-secondary/10 rounded-xl p-4 border border-secondary/20">
                        <div className="flex items-center gap-2 text-sm text-secondary font-medium mb-1">
                          <TrendingDown className="h-4 w-4" />
                          VAT Credit
                        </div>
                        <p className="text-2xl font-mono font-bold text-secondary">
                          {formatKoboToNgn(vatCredit)}
                        </p>
                        {vatCredit > 0n && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Carry forward to next period
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Tax Impact from Records */}
                    {recordsSummary && (
                      <div className="bg-primary/5 rounded-lg p-4 border border-primary/10">
                        <div className="flex items-center gap-2 mb-2">
                          <Scale className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">VAT Optimization Applied</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Your Input VAT of {formatKoboToNgn(inputVatKobo)} from {recordsSummary.includedExpenses.filter(e => e.vatable).length} VAT invoices reduces your Net VAT payable.
                        </p>
                      </div>
                    )}

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
                {hasResults && (
                  <OptimizationOpportunities taxType="VAT" className="mt-6" />
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