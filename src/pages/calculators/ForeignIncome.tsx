import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe, TrendingUp, Info, Save, Loader2, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useConsent } from "@/hooks/useConsent";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { ConsentModal } from "@/components/ConsentModal";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { 
  calculateForeignIncomeTax, 
  formatForeignIncomeResult,
  getAvailableCurrencies,
  getDTACountries,
  hasTreatyWithNigeria,
  getExchangeRate
} from "@/lib/foreignIncomeTaxCalculator";
import { koboToString } from "@/lib/money";
import { OptimizationOpportunities } from "@/components/OptimizationOpportunities";

const INCOME_TYPES = [
  { value: "employment", label: "Employment Income" },
  { value: "business", label: "Business/Trade Income" },
  { value: "dividend", label: "Dividends" },
  { value: "interest", label: "Interest Income" },
  { value: "royalty", label: "Royalties" },
  { value: "rental", label: "Rental Income" },
  { value: "capital_gains", label: "Capital Gains" },
  { value: "pension", label: "Pension" },
  { value: "other", label: "Other" },
];

const COUNTRIES = [
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "CA", name: "Canada" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "NL", name: "Netherlands" },
  { code: "ZA", name: "South Africa" },
  { code: "CN", name: "China" },
  { code: "IN", name: "India" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "SG", name: "Singapore" },
  { code: "GH", name: "Ghana" },
  { code: "KE", name: "Kenya" },
  { code: "BE", name: "Belgium" },
  { code: "IT", name: "Italy" },
  { code: "ES", name: "Spain" },
  { code: "SE", name: "Sweden" },
  { code: "PL", name: "Poland" },
];

export default function ForeignIncomeCalculator() {
  const [sourceCountry, setSourceCountry] = useState("US");
  const [incomeType, setIncomeType] = useState("employment");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [taxPaidForeign, setTaxPaidForeign] = useState("");
  const [applyTreaty, setApplyTreaty] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const { user } = useAuth();
  const { hasConsent } = useConsent();
  const { toast } = useToast();
  const hasCalculationConsent = hasConsent("calculation");

  const currencies = getAvailableCurrencies();
  const dtaCountries = getDTACountries();
  const hasTreaty = hasTreatyWithNigeria(sourceCountry);
  const { rate: exchangeRate, isStub } = getExchangeRate(currency);

  const handleNumberInput = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9.]/g, "");
    setter(value);
  };

  const taxResult = useMemo(() => {
    const amountNum = parseFloat(amount) || 0;
    const taxPaidNum = parseFloat(taxPaidForeign) || 0;
    
    if (amountNum <= 0) return null;

    return calculateForeignIncomeTax({
      source_country: sourceCountry,
      income_type: incomeType,
      amount_foreign_currency: amountNum,
      currency_code: currency,
      tax_paid_foreign: taxPaidNum,
      treaty_applicable: hasTreaty && applyTreaty,
    });
  }, [sourceCountry, incomeType, amount, currency, taxPaidForeign, hasTreaty, applyTreaty]);

  const formattedResult = taxResult ? formatForeignIncomeResult(taxResult) : null;

  const handleSaveCalculation = async () => {
    if (!user || !taxResult) return;
    
    if (!hasCalculationConsent) {
      setShowConsentModal(true);
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from("tax_calculations").insert({
        user_id: user.id,
        tax_type: "FOREIGN_INCOME",
        rule_version: "1.0.0",
        input_json: {
          sourceCountry,
          incomeType,
          amount: parseFloat(amount),
          currency,
          taxPaidForeign: parseFloat(taxPaidForeign) || 0,
          treatyApplied: hasTreaty && applyTreaty,
        },
        output_json: {
          amountNgnKobo: koboToString(taxResult.amountNgnKobo),
          taxPaidForeignKobo: koboToString(taxResult.taxPaidForeignKobo),
          grossTaxLiabilityKobo: koboToString(taxResult.grossTaxLiabilityKobo),
          foreignTaxCreditKobo: koboToString(taxResult.foreignTaxCreditKobo),
          netTaxPayableKobo: koboToString(taxResult.netTaxPayableKobo),
          treatyApplied: taxResult.treatyApplied,
          effectiveRate: taxResult.effectiveRate,
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

          <Card className="overflow-hidden border-2 border-border/50 shadow-xl">
            <div className="bg-primary p-6 text-primary-foreground">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-accent rounded-lg">
                  <Globe className="h-5 w-5 text-accent-foreground" />
                </div>
                <h3 className="text-xl font-bold">Foreign Income Calculator</h3>
              </div>
              <p className="text-primary-foreground/80 text-sm">
                Calculate tax on foreign income with double taxation relief
              </p>
              <div className="flex items-center gap-4 mt-2 text-xs text-primary-foreground/60">
                <span>DTA Countries: {dtaCountries.length}</span>
                <span>•</span>
                <span>Exchange rates are indicative</span>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Source Country</Label>
                  <Select value={sourceCountry} onValueChange={setSourceCountry}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map(c => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.name}
                          {hasTreatyWithNigeria(c.code) && " 🤝"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {hasTreaty && (
                    <p className="text-xs text-secondary flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Has DTA with Nigeria
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Income Type</Label>
                  <Select value={incomeType} onValueChange={setIncomeType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INCOME_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Rate: 1 {currency} = ₦{exchangeRate.toLocaleString()} {isStub && "(indicative)"}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Amount ({currency})</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={amount}
                    onChange={handleNumberInput(setAmount)}
                    className="font-mono"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tax Paid in Source Country ({currency})</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={taxPaidForeign}
                  onChange={handleNumberInput(setTaxPaidForeign)}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Enter withholding or income tax already paid abroad
                </p>
              </div>

              {hasTreaty && (
                <div className="flex items-center justify-between p-4 bg-secondary/10 rounded-lg border border-secondary/20">
                  <div>
                    <p className="font-medium">Apply Double Taxation Relief</p>
                    <p className="text-sm text-muted-foreground">
                      Claim credit for foreign tax paid under DTA
                    </p>
                  </div>
                  <Switch checked={applyTreaty} onCheckedChange={setApplyTreaty} />
                </div>
              )}

              {!hasTreaty && parseFloat(taxPaidForeign) > 0 && (
                <div className="flex items-start gap-3 p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                  <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-destructive">No Treaty Available</p>
                    <p className="text-sm text-muted-foreground">
                      Nigeria does not have a Double Taxation Agreement with this country.
                      You may not be able to claim full relief for foreign tax paid.
                    </p>
                  </div>
                </div>
              )}

              {taxResult && formattedResult && (
                <div className="space-y-4 animate-fade-in">
                  <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <TrendingUp className="h-4 w-4 text-secondary" />
                      Calculation Summary
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Income in NGN</span>
                        <span className="font-mono">{formattedResult.amountNgn}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Gross Tax Liability (24%)</span>
                        <span className="font-mono">{formattedResult.grossTaxLiability}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Foreign Tax Paid (NGN)</span>
                        <span className="font-mono">{formattedResult.taxPaidForeign}</span>
                      </div>
                      {taxResult.treatyApplied && (
                        <div className="flex justify-between text-secondary">
                          <span>Foreign Tax Credit</span>
                          <span className="font-mono">-{formattedResult.foreignTaxCredit}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-destructive/10 rounded-xl p-4 border border-destructive/20">
                    <div className="flex items-center gap-2 text-sm text-destructive font-medium mb-1">
                      Net Tax Payable
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3.5 w-3.5" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>After applying double taxation relief (if eligible)</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <p className="text-2xl font-mono font-bold text-destructive">
                      {formattedResult.netTaxPayable}
                    </p>
                  </div>

                  <div className="flex items-center justify-between bg-primary/5 rounded-lg p-4 border border-primary/10">
                    <span className="text-sm font-medium">Effective Tax Rate</span>
                    <span className="text-xl font-mono font-bold text-primary">
                      {formattedResult.effectiveRate}
                    </span>
                  </div>

                  {taxResult.treatyApplied && taxResult.treatyCountry && (
                    <div className="flex items-center gap-2 p-3 bg-secondary/10 rounded-lg text-sm">
                      <CheckCircle2 className="h-4 w-4 text-secondary" />
                      <span>
                        DTA with {taxResult.treatyCountry} applied — credit of {formattedResult.foreignTaxCredit}
                      </span>
                    </div>
                  )}

                  <OptimizationOpportunities taxType="FOREIGN_INCOME" />

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
                Based on Nigeria's Personal Income Tax Act and relevant DTAs. Consult a tax professional for specific advice.
              </p>
            </div>

            <ConsentModal
              open={showConsentModal}
              onConsentGiven={() => setShowConsentModal(false)}
              context="calculation"
            />
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
