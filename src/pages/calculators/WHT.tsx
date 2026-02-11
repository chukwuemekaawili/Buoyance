import { useState, useMemo, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Banknote, TrendingUp, Info, Save, Loader2, AlertCircle, ArrowLeft, Scale } from "lucide-react";
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

interface WHTCategory {
  name: string;
  corporate_rate: number;
  individual_rate: number;
}

interface WHTRulesJson {
  currency: string;
  kobo_factor: number;
  categories: WHTCategory[];
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
  rules_json: WHTRulesJson;
  published: boolean;
}

export default function WHTCalculator() {
  const [amountInput, setAmountInput] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [isCorporate, setIsCorporate] = useState(true);
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
          .eq("tax_type", "WHT")
          .eq("published", true)
          .eq("archived", false)
          .order("effective_date", { ascending: false })
          .limit(1)
          .single();

        if (error) {
          if (error.code === "PGRST116") {
            setRuleError("No published WHT rules found. Please contact support.");
          } else {
            throw error;
          }
          return;
        }

        setTaxRule(data as unknown as TaxRule);
        // Set default category
        if ((data as any).rules_json?.categories?.length > 0) {
          setSelectedCategory((data as any).rules_json.categories[0].name);
        }
      } catch (err: any) {
        console.error("Failed to fetch tax rule:", err);
        setRuleError("Failed to load tax rules. Please refresh the page.");
      } finally {
        setRuleLoading(false);
      }
    }

    fetchTaxRule();
  }, []);

  const paymentAmountKobo = useMemo(() => {
    const ngnValue = amountInput.replace(/,/g, "");
    return parseNgnToKobo(ngnValue);
  }, [amountInput]);

  const { whtPayableKobo, netPaymentKobo, appliedRate, category } = useMemo(() => {
    if (!taxRule || paymentAmountKobo === 0n || !selectedCategory) {
      return { whtPayableKobo: 0n, netPaymentKobo: 0n, appliedRate: 0, category: null };
    }

    const cat = taxRule.rules_json.categories.find(c => c.name === selectedCategory);
    if (!cat) {
      return { whtPayableKobo: 0n, netPaymentKobo: 0n, appliedRate: 0, category: null };
    }

    const rate = isCorporate ? cat.corporate_rate : cat.individual_rate;
    const wht = mulKoboByRate(paymentAmountKobo, rate);
    const net = subKobo(paymentAmountKobo, wht);

    return { whtPayableKobo: wht, netPaymentKobo: net, appliedRate: rate, category: cat };
  }, [paymentAmountKobo, taxRule, selectedCategory, isCorporate]);

  const effectiveRate = calculateEffectiveRate(whtPayableKobo, paymentAmountKobo);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    if (value === "") {
      setAmountInput("");
      return;
    }
    const formatted = new Intl.NumberFormat("en-NG").format(parseInt(value));
    setAmountInput(formatted);
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
        tax_type: "WHT",
        rule_version: taxRule.version,
        input_json: {
          paymentAmountKobo: koboToString(paymentAmountKobo),
          paymentAmountNgn: formatKoboToNgn(paymentAmountKobo),
          category: selectedCategory,
          isCorporate,
        },
        output_json: {
          whtPayableKobo: koboToString(whtPayableKobo),
          whtPayableNgn: formatKoboToNgn(whtPayableKobo),
          netPaymentKobo: koboToString(netPaymentKobo),
          netPaymentNgn: formatKoboToNgn(netPaymentKobo),
          effectiveRate,
          appliedRate,
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
                    <Banknote className="h-5 w-5 text-accent-foreground" />
                  </div>
                  <h3 className="text-xl font-bold">WHT Calculator</h3>
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
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Recipient Type</Label>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm ${!isCorporate ? "font-medium" : "text-muted-foreground"}`}>
                        Individual
                      </span>
                      <Switch
                        checked={isCorporate}
                        onCheckedChange={setIsCorporate}
                      />
                      <span className={`text-sm ${isCorporate ? "font-medium" : "text-muted-foreground"}`}>
                        Corporate
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-base font-semibold">Payment Category</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {taxRule.rules_json.categories.map((cat) => (
                        <SelectItem key={cat.name} value={cat.name}>
                          {cat.name} ({(isCorporate ? cat.corporate_rate : cat.individual_rate) * 100}%)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="amount" className="text-base font-semibold">
                    Payment Amount
                  </Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-mono font-semibold">
                      ₦
                    </span>
                    <Input
                      id="amount"
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={amountInput}
                      onChange={handleInputChange}
                      className="pl-10 h-14 text-xl font-mono font-semibold border-2"
                    />
                  </div>
                </div>

                {paymentAmountKobo > 0n && selectedCategory && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="bg-muted/50 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Applied Rate ({selectedCategory})</span>
                        <span className="font-mono font-bold text-primary">
                          {(appliedRate * 100).toFixed(0)}%
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {isCorporate ? "Corporate" : "Individual"} rate applied
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-destructive/10 rounded-xl p-4 border border-destructive/20">
                        <div className="flex items-center gap-2 text-sm text-destructive font-medium mb-1">
                          WHT Deductible
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-3.5 w-3.5" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Withholding Tax at {(appliedRate * 100).toFixed(0)}%</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <p className="text-2xl font-mono font-bold text-destructive">
                          {formatKoboToNgn(whtPayableKobo)}
                        </p>
                      </div>

                      <div className="bg-secondary/10 rounded-xl p-4 border border-secondary/20">
                        <div className="flex items-center gap-2 text-sm text-secondary font-medium mb-1">
                          <TrendingUp className="h-4 w-4" />
                          Net Payment
                        </div>
                        <p className="text-2xl font-mono font-bold text-secondary">
                          {formatKoboToNgn(netPaymentKobo)}
                        </p>
                      </div>
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
                {paymentAmountKobo > 0n && selectedCategory && (
                  <OptimizationOpportunities taxType="WHT" className="mt-6" />
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
