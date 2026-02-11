import { useState, useMemo, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Landmark, TrendingUp, Info, Save, Loader2, AlertCircle, ArrowLeft, Scale } from "lucide-react";
import { OptimizationOpportunities } from "@/components/OptimizationOpportunities";
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
  subKobo,
  koboToString,
  calculateEffectiveRate,
} from "@/lib/money";

interface CGTRulesJson {
  currency: string;
  kobo_factor: number;
  cgt_rate: number;
  exempt_assets: string[];
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
  rules_json: CGTRulesJson;
  published: boolean;
}

export default function CGTCalculator() {
  const [proceedsInput, setProceedsInput] = useState<string>("");
  const [costBasisInput, setCostBasisInput] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [taxRule, setTaxRule] = useState<TaxRule | null>(null);
  const [ruleLoading, setRuleLoading] = useState(true);
  const [ruleError, setRuleError] = useState<string | null>(null);
  const { user } = useAuth();
  const { hasConsent } = useConsent();
  const { toast } = useToast();
  const hasCalculationConsent = hasConsent("calculation");

  useEffect(() => {
    async function fetchTaxRule() {
      try {
        setRuleLoading(true);
        setRuleError(null);
        
        const { data, error } = await supabase
          .from("tax_rules")
          .select("*")
          .eq("tax_type", "CGT")
          .eq("published", true)
          .eq("archived", false)
          .order("effective_date", { ascending: false })
          .limit(1)
          .single();

        if (error) {
          if (error.code === "PGRST116") {
            setRuleError("No published CGT rules found. Please contact support.");
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

  const proceedsKobo = useMemo(() => {
    const ngnValue = proceedsInput.replace(/,/g, "");
    return parseNgnToKobo(ngnValue);
  }, [proceedsInput]);

  const costBasisKobo = useMemo(() => {
    const ngnValue = costBasisInput.replace(/,/g, "");
    return parseNgnToKobo(ngnValue);
  }, [costBasisInput]);

  const { gainKobo, cgtPayableKobo, netProceedsKobo, cgtRate } = useMemo(() => {
    if (!taxRule || proceedsKobo === 0n) {
      return { gainKobo: 0n, cgtPayableKobo: 0n, netProceedsKobo: 0n, cgtRate: 0 };
    }

    const rate = taxRule.rules_json.cgt_rate;
    
    // Calculate gain (proceeds - cost basis)
    // If negative, no CGT applies
    const rawGain = subKobo(proceedsKobo, costBasisKobo);
    const gain = rawGain > 0n ? rawGain : 0n;
    
    // CGT only applies to positive gains
    const cgt = gain > 0n ? mulKoboByRate(gain, rate) : 0n;
    const net = subKobo(proceedsKobo, cgt);

    return { gainKobo: gain, cgtPayableKobo: cgt, netProceedsKobo: net, cgtRate: rate };
  }, [proceedsKobo, costBasisKobo, taxRule]);

  const effectiveRate = proceedsKobo > 0n ? calculateEffectiveRate(cgtPayableKobo, proceedsKobo) : 0;

  const handleProceedsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    if (value === "") {
      setProceedsInput("");
      return;
    }
    const formatted = new Intl.NumberFormat("en-NG").format(parseInt(value));
    setProceedsInput(formatted);
  };

  const handleCostBasisChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    if (value === "") {
      setCostBasisInput("");
      return;
    }
    const formatted = new Intl.NumberFormat("en-NG").format(parseInt(value));
    setCostBasisInput(formatted);
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
        tax_type: "CGT",
        rule_version: taxRule.version,
        input_json: {
          proceedsKobo: koboToString(proceedsKobo),
          proceedsNgn: formatKoboToNgn(proceedsKobo),
          costBasisKobo: koboToString(costBasisKobo),
          costBasisNgn: formatKoboToNgn(costBasisKobo),
        },
        output_json: {
          gainKobo: koboToString(gainKobo),
          gainNgn: formatKoboToNgn(gainKobo),
          cgtPayableKobo: koboToString(cgtPayableKobo),
          cgtPayableNgn: formatKoboToNgn(cgtPayableKobo),
          netProceedsKobo: koboToString(netProceedsKobo),
          netProceedsNgn: formatKoboToNgn(netProceedsKobo),
          effectiveRate,
          cgtRate,
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

  const isLoss = proceedsKobo > 0n && costBasisKobo > proceedsKobo;

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
                    <Landmark className="h-5 w-5 text-accent-foreground" />
                  </div>
                  <h3 className="text-xl font-bold">CGT Calculator</h3>
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
                <div className="space-y-3">
                  <Label htmlFor="proceeds" className="text-base font-semibold">
                    Sale Proceeds
                  </Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-mono font-semibold">
                      ₦
                    </span>
                    <Input
                      id="proceeds"
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={proceedsInput}
                      onChange={handleProceedsChange}
                      className="pl-10 h-14 text-xl font-mono font-semibold border-2"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="costBasis" className="text-base font-semibold">
                    Cost Basis (Acquisition Cost)
                  </Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-mono font-semibold">
                      ₦
                    </span>
                    <Input
                      id="costBasis"
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={costBasisInput}
                      onChange={handleCostBasisChange}
                      className="pl-10 h-14 text-xl font-mono font-semibold border-2"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    CGT Rate: {(cgtRate * 100).toFixed(0)}% • Exempt: {taxRule.rules_json.exempt_assets.join(", ")}
                  </p>
                </div>

                {proceedsKobo > 0n && (
                  <div className="space-y-4 animate-fade-in">
                    <div className={`rounded-xl p-4 ${isLoss ? "bg-muted" : "bg-muted/50"}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">
                          {isLoss ? "Capital Loss (No CGT)" : "Chargeable Gain"}
                        </span>
                        <span className={`font-mono font-bold ${isLoss ? "text-muted-foreground" : "text-primary"}`}>
                          {isLoss ? "(No Gain)" : formatKoboToNgn(gainKobo)}
                        </span>
                      </div>
                      {isLoss && (
                        <p className="text-xs text-muted-foreground">
                          No CGT applies when cost basis exceeds proceeds
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-destructive/10 rounded-xl p-4 border border-destructive/20">
                        <div className="flex items-center gap-2 text-sm text-destructive font-medium mb-1">
                          CGT Payable
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-3.5 w-3.5" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Capital Gains Tax at {(cgtRate * 100).toFixed(0)}% on gains</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <p className="text-2xl font-mono font-bold text-destructive">
                          {formatKoboToNgn(cgtPayableKobo)}
                        </p>
                      </div>

                      <div className="bg-secondary/10 rounded-xl p-4 border border-secondary/20">
                        <div className="flex items-center gap-2 text-sm text-secondary font-medium mb-1">
                          <TrendingUp className="h-4 w-4" />
                          Net Proceeds
                        </div>
                        <p className="text-2xl font-mono font-bold text-secondary">
                          {formatKoboToNgn(netProceedsKobo)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between bg-primary/5 rounded-lg p-4 border border-primary/10">
                      <span className="text-sm font-medium">Effective Tax Rate (on Proceeds)</span>
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
                {proceedsKobo > 0n && (
                  <OptimizationOpportunities taxType="CGT" className="mt-6" />
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
