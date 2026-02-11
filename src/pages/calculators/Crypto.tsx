import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bitcoin, TrendingUp, TrendingDown, Plus, Trash2, Save, Loader2, ArrowLeft, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useConsent } from "@/hooks/useConsent";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { ConsentModal } from "@/components/ConsentModal";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { calculateCryptoTax, formatCryptoTaxResult, CryptoTransaction } from "@/lib/cryptoTaxCalculator";
import { parseNgnToKobo, formatKoboToNgn, koboToString } from "@/lib/money";
import { OptimizationOpportunities } from "@/components/OptimizationOpportunities";

const TRANSACTION_TYPES = [
  { value: "buy", label: "Buy" },
  { value: "sell", label: "Sell" },
  { value: "mining", label: "Mining Income" },
  { value: "staking", label: "Staking Rewards" },
  { value: "airdrop", label: "Airdrop" },
];

const POPULAR_ASSETS = ["BTC", "ETH", "BNB", "SOL", "XRP", "USDT", "USDC", "ADA", "DOGE", "DOT"];

export default function CryptoCalculator() {
  const [transactions, setTransactions] = useState<Array<{
    id: string;
    type: string;
    asset: string;
    amount: string;
    priceNgn: string;
    date: string;
  }>>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const { user } = useAuth();
  const { hasConsent } = useConsent();
  const { toast } = useToast();
  const hasCalculationConsent = hasConsent("calculation");

  const addTransaction = () => {
    setTransactions(prev => [...prev, {
      id: crypto.randomUUID(),
      type: "buy",
      asset: "BTC",
      amount: "",
      priceNgn: "",
      date: new Date().toISOString().split("T")[0],
    }]);
  };

  const removeTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const updateTransaction = (id: string, field: string, value: string) => {
    setTransactions(prev => prev.map(t => 
      t.id === id ? { ...t, [field]: value } : t
    ));
  };

  const handleNumberInput = (value: string): string => {
    const cleaned = value.replace(/[^0-9.]/g, "");
    const parts = cleaned.split(".");
    if (parts.length > 2) return parts[0] + "." + parts.slice(1).join("");
    return cleaned;
  };

  const formatNumberInput = (value: string): string => {
    if (!value) return "";
    const num = parseFloat(value.replace(/,/g, ""));
    if (isNaN(num)) return value;
    return new Intl.NumberFormat("en-NG").format(num);
  };

  const taxResult = useMemo(() => {
    const validTransactions: CryptoTransaction[] = transactions
      .filter(t => t.amount && t.priceNgn)
      .map(t => {
        const amount = parseFloat(t.amount.replace(/,/g, ""));
        const priceNgn = parseFloat(t.priceNgn.replace(/,/g, ""));
        const totalNgn = amount * priceNgn;
        
        return {
          id: t.id,
          transaction_type: t.type as CryptoTransaction["transaction_type"],
          asset_symbol: t.asset,
          amount,
          price_ngn_kobo: koboToString(parseNgnToKobo(priceNgn.toString())),
          total_ngn_kobo: koboToString(parseNgnToKobo(totalNgn.toString())),
          transaction_date: t.date,
        };
      });

    if (validTransactions.length === 0) return null;
    return calculateCryptoTax(validTransactions);
  }, [transactions]);

  const formattedResult = taxResult ? formatCryptoTaxResult(taxResult) : null;

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
        tax_type: "CRYPTO",
        rule_version: "1.0.0",
        input_json: {
          transactions: transactions.map(t => ({
            type: t.type,
            asset: t.asset,
            amount: t.amount,
            priceNgn: t.priceNgn,
            date: t.date,
          })),
        },
        output_json: {
          totalCapitalGainsKobo: koboToString(taxResult.totalCapitalGainsKobo),
          totalMiningIncomeKobo: koboToString(taxResult.totalMiningIncomeKobo),
          totalStakingIncomeKobo: koboToString(taxResult.totalStakingIncomeKobo),
          cgtPayableKobo: koboToString(taxResult.cgtPayableKobo),
          pitOnIncomeKobo: koboToString(taxResult.pitOnIncomeKobo),
          totalTaxPayableKobo: koboToString(taxResult.totalTaxPayableKobo),
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
        <div className="container mx-auto px-4 md:px-6 max-w-3xl">
          <Link to="/calculators" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Calculators
          </Link>

          <Card className="overflow-hidden border-2 border-border/50 shadow-xl">
            <div className="bg-primary p-6 text-primary-foreground">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-accent rounded-lg">
                  <Bitcoin className="h-5 w-5 text-accent-foreground" />
                </div>
                <h3 className="text-xl font-bold">Crypto Tax Calculator</h3>
              </div>
              <p className="text-primary-foreground/80 text-sm">
                Calculate capital gains tax using FIFO cost basis method
              </p>
              <div className="flex items-center gap-4 mt-2 text-xs text-primary-foreground/60">
                <span>CGT Rate: 10%</span>
                <span>•</span>
                <span>Mining/Staking: Treated as Income</span>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Transactions</Label>
                <Button onClick={addTransaction} size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Transaction
                </Button>
              </div>

              {transactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Bitcoin className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No transactions added yet</p>
                  <p className="text-sm">Click "Add Transaction" to get started</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {transactions.map((tx, index) => (
                    <div key={tx.id} className="p-4 border rounded-lg bg-muted/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Transaction {index + 1}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTransaction(tx.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <Label className="text-xs">Type</Label>
                          <Select
                            value={tx.type}
                            onValueChange={(v) => updateTransaction(tx.id, "type", v)}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {TRANSACTION_TYPES.map(t => (
                                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-xs">Asset</Label>
                          <Select
                            value={tx.asset}
                            onValueChange={(v) => updateTransaction(tx.id, "asset", v)}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {POPULAR_ASSETS.map(a => (
                                <SelectItem key={a} value={a}>{a}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-xs">Amount</Label>
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder="0.00"
                            value={tx.amount}
                            onChange={(e) => updateTransaction(tx.id, "amount", handleNumberInput(e.target.value))}
                            className="h-9 font-mono"
                          />
                        </div>

                        <div>
                          <Label className="text-xs">Price (₦)</Label>
                          <Input
                            type="text"
                            inputMode="numeric"
                            placeholder="0"
                            value={tx.priceNgn}
                            onChange={(e) => updateTransaction(tx.id, "priceNgn", handleNumberInput(e.target.value))}
                            className="h-9 font-mono"
                          />
                        </div>
                      </div>

                      <div className="w-full md:w-1/2">
                        <Label className="text-xs">Date</Label>
                        <Input
                          type="date"
                          value={tx.date}
                          onChange={(e) => updateTransaction(tx.id, "date", e.target.value)}
                          className="h-9"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {taxResult && formattedResult && (
                <div className="space-y-4 animate-fade-in">
                  <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <TrendingUp className="h-4 w-4 text-secondary" />
                      Income Breakdown
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Capital Gains</span>
                        <span className="font-mono">{formattedResult.totalCapitalGains}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Mining Income</span>
                        <span className="font-mono">{formattedResult.totalMiningIncome}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Staking Income</span>
                        <span className="font-mono">{formattedResult.totalStakingIncome}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Airdrop Income</span>
                        <span className="font-mono">{formattedResult.totalAirdropIncome}</span>
                      </div>
                    </div>
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
                            <p>10% Capital Gains Tax on crypto disposals</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <p className="text-xl font-mono font-bold text-destructive">
                        {formattedResult.cgtPayable}
                      </p>
                    </div>

                    <div className="bg-destructive/10 rounded-xl p-4 border border-destructive/20">
                      <div className="flex items-center gap-2 text-sm text-destructive font-medium mb-1">
                        PIT on Income
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-3.5 w-3.5" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Mining/staking/airdrops taxed as ordinary income</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <p className="text-xl font-mono font-bold text-destructive">
                        {formattedResult.pitOnIncome}
                      </p>
                    </div>
                  </div>

                  <div className="bg-primary/5 rounded-lg p-4 border border-primary/10">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold">Total Tax Payable</span>
                      <span className="text-2xl font-mono font-bold text-primary">
                        {formattedResult.totalTaxPayable}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Effective Rate</span>
                      <span className="font-mono">{formattedResult.effectiveRate}</span>
                    </div>
                  </div>

                  <OptimizationOpportunities taxType="CRYPTO" />

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
                Based on Nigeria's Capital Gains Tax Act. Mining and staking income treated as ordinary income.
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
