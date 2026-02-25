import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Loader2, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatKoboToNgn, stringToKobo, addKobo } from "@/lib/money";

interface AIPreSubmitCheckProps {
    filingTaxType: string;
    filingPeriodStart: string;
    filingPeriodEnd: string;
    declaredIncomeKobo: bigint;
    declaredDeductionsKobo: bigint;
    declaredTaxKobo: bigint;
}

interface CheckResult {
    icon: "pass" | "warning" | "info";
    text: string;
}

/**
 * Filing Pre-Submit AI Check (Feature 2)
 * Before submitting a filing, this queries the user's ledger for the filing period,
 * compares totals against declared amounts, and has Claude flag discrepancies.
 */
export function AIPreSubmitCheck({
    filingTaxType,
    filingPeriodStart,
    filingPeriodEnd,
    declaredIncomeKobo,
    declaredDeductionsKobo,
    declaredTaxKobo,
}: AIPreSubmitCheckProps) {
    const [results, setResults] = useState<CheckResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [checked, setChecked] = useState(false);

    const runCheck = async () => {
        setLoading(true);
        try {
            // Query actual ledger data for the filing period
            const [{ data: incomes }, { data: expenses }] = await Promise.all([
                supabase
                    .from("incomes")
                    .select("amount_kobo")
                    .gte("date", filingPeriodStart)
                    .lte("date", filingPeriodEnd),
                supabase
                    .from("expenses")
                    .select("amount_kobo, is_deductible")
                    .gte("date", filingPeriodStart)
                    .lte("date", filingPeriodEnd),
            ]);

            let ledgerIncomeKobo = 0n;
            let ledgerDeductibleKobo = 0n;
            (incomes || []).forEach((i: any) => {
                ledgerIncomeKobo = addKobo(ledgerIncomeKobo, stringToKobo(i.amount_kobo));
            });
            (expenses || []).forEach((e: any) => {
                if (e.is_deductible) {
                    ledgerDeductibleKobo = addKobo(ledgerDeductibleKobo, stringToKobo(e.amount_kobo));
                }
            });

            const comparison = {
                taxType: filingTaxType,
                period: `${filingPeriodStart} to ${filingPeriodEnd}`,
                declaredIncome: formatKoboToNgn(declaredIncomeKobo),
                ledgerIncome: formatKoboToNgn(ledgerIncomeKobo),
                declaredDeductions: formatKoboToNgn(declaredDeductionsKobo),
                ledgerDeductible: formatKoboToNgn(ledgerDeductibleKobo),
                declaredTax: formatKoboToNgn(declaredTaxKobo),
                incomeEntries: incomes?.length || 0,
                expenseEntries: expenses?.length || 0,
            };

            const { data, error } = await supabase.functions.invoke("ai-chat", {
                body: {
                    messages: [
                        {
                            role: "user",
                            content: `A Nigerian taxpayer is about to submit a ${filingTaxType} filing. Compare their declared amounts against their actual ledger records and give exactly 3 checks.

COMPARISON:
${JSON.stringify(comparison, null, 2)}

Respond ONLY with a JSON array of 3 objects:
- "icon": "pass" (numbers match), "warning" (discrepancy found), or "info" (suggestion)
- "text": one sentence (max 25 words) referencing specific numbers

If ledger has zero entries, note that the filing may be based on manual data.`,
                        },
                    ],
                },
            });

            if (error) throw error;

            const content = data?.content || "";
            try {
                const jsonStr = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
                const parsed = JSON.parse(jsonStr);
                if (Array.isArray(parsed)) {
                    setResults(parsed.slice(0, 3));
                }
            } catch {
                setResults([{ icon: "info", text: content.substring(0, 100) }]);
            }

            setChecked(true);
        } catch (err: any) {
            console.error("Pre-submit check error:", err);
            setResults([{ icon: "info", text: "AI check unavailable. You may still submit." }]);
            setChecked(true);
        } finally {
            setLoading(false);
        }
    };

    const getIcon = (icon: string) => {
        switch (icon) {
            case "pass": return <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />;
            case "warning": return <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />;
            default: return <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />;
        }
    };

    if (!checked) {
        return (
            <Card className="border-dashed border-primary/30 bg-primary/5">
                <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm">
                            <Shield className="h-4 w-4 text-primary" />
                            <span className="font-medium">AI Pre-Submit Check</span>
                            <span className="text-muted-foreground">— Verify your filing against your ledger</span>
                        </div>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={runCheck}
                            disabled={loading}
                            className="h-8 text-xs gap-1"
                        >
                            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Shield className="h-3 w-3" />}
                            {loading ? "Checking..." : "Run Check"}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-primary/20 bg-primary/5">
            <CardContent className="py-4 space-y-2">
                <p className="text-xs font-semibold text-primary flex items-center gap-1 mb-2">
                    <Shield className="h-3.5 w-3.5" /> AI Pre-Submit Check Results
                </p>
                {results.map((r, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm">
                        {getIcon(r.icon)}
                        <p className="text-foreground leading-snug">{r.text}</p>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
