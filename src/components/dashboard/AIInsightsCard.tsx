import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw, AlertTriangle, TrendingUp, FileWarning, Coins } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFeatureGate } from "@/hooks/useFeatureGate";
import { formatKoboToNgn, stringToKobo, addKobo } from "@/lib/money";
import { cn } from "@/lib/utils";

interface Insight {
    icon: "warning" | "opportunity" | "info" | "action";
    text: string;
}

/**
 * AI Dashboard Insights Card
 * Queries the user's REAL financial data from Supabase, aggregates it,
 * and sends the aggregated totals (not PII) to Claude for analysis.
 */
export function AIInsightsCard() {
    const { user } = useAuth();
    const [insights, setInsights] = useState<Insight[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasLoaded, setHasLoaded] = useState(false);

    const generateInsights = async () => {
        if (!user) return;

        setLoading(true);
        setError(null);

        try {
            // 1. Query REAL data from Supabase
            const currentYear = new Date().getFullYear();
            const yearStart = `${currentYear}-01-01`;

            const [
                { data: incomes },
                { data: expenses },
                { data: filings },
                { data: whtCerts },
                { data: filingEvents },
            ] = await Promise.all([
                supabase.from("incomes").select("amount_kobo, category, date").gte("date", yearStart),
                supabase.from("expenses").select("amount_kobo, category, date, deductible").gte("date", yearStart),
                supabase.from("filings").select("tax_type, status, period_start, period_end"),
                supabase.from("wht_certificates" as any).select("amount_kobo, status"),
                supabase.from("filing_events").select("tax_type, due_date, filed"),
            ]);

            // 2. Aggregate totals (no PII sent to Claude)
            let totalIncomeKobo = 0n;
            let totalExpensesKobo = 0n;
            let totalDeductibleKobo = 0n;
            let totalWhtCreditsKobo = 0n;
            const incomeCategories: Record<string, number> = {};
            const expenseCategories: Record<string, number> = {};

            (incomes || []).forEach((i: any) => {
                const k = stringToKobo(i.amount_kobo);
                totalIncomeKobo = addKobo(totalIncomeKobo, k);
                incomeCategories[i.category || "uncategorized"] = (incomeCategories[i.category || "uncategorized"] || 0) + 1;
            });

            (expenses || []).forEach((e: any) => {
                const k = stringToKobo(e.amount_kobo);
                totalExpensesKobo = addKobo(totalExpensesKobo, k);
                if (e.deductible) totalDeductibleKobo = addKobo(totalDeductibleKobo, k);
                expenseCategories[e.category || "uncategorized"] = (expenseCategories[e.category || "uncategorized"] || 0) + 1;
            });

            (whtCerts || []).forEach((w: any) => {
                totalWhtCreditsKobo = addKobo(totalWhtCreditsKobo, stringToKobo(w.amount_kobo));
            });

            const filingsBreakdown = (filings || []).reduce((acc: Record<string, string>, f: any) => {
                acc[f.tax_type] = f.status;
                return acc;
            }, {});

            const overdueFilings = (filingEvents || []).filter(
                (e: any) => !e.filed && new Date(e.due_date) < new Date()
            );

            const upcomingFilings = (filingEvents || []).filter(
                (e: any) => !e.filed && new Date(e.due_date) >= new Date() &&
                    new Date(e.due_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            );

            // 3. Build context for Claude (aggregated, no PII)
            const context = {
                year: currentYear,
                totalIncome: formatKoboToNgn(totalIncomeKobo),
                totalExpenses: formatKoboToNgn(totalExpensesKobo),
                totalDeductible: formatKoboToNgn(totalDeductibleKobo),
                totalWhtCredits: formatKoboToNgn(totalWhtCreditsKobo),
                incomeEntries: incomes?.length || 0,
                expenseEntries: expenses?.length || 0,
                whtCertificates: whtCerts?.length || 0,
                filingsStatus: filingsBreakdown,
                overdueFilingsCount: overdueFilings.length,
                overdueTypes: overdueFilings.map((e: any) => e.tax_type),
                upcomingDeadlines: upcomingFilings.map((e: any) => ({
                    type: e.tax_type,
                    due: e.due_date,
                })),
                uncategorizedExpenses: expenseCategories["uncategorized"] || 0,
                hasDeductionsEnabled: totalDeductibleKobo > 0n,
            };

            // 4. Send to Claude via Edge Function
            const { data, error: fnError } = await supabase.functions.invoke("ai-chat", {
                body: {
                    messages: [
                        {
                            role: "user",
                            content: `Analyze this Nigerian taxpayer's ${currentYear} financial summary and give exactly 4 short, actionable insights. Each insight must reference specific numbers from the data. Do NOT give generic advice. If there's nothing actionable, say so.

DATA:
${JSON.stringify(context, null, 2)}

Respond ONLY with a JSON array of 4 objects, each having:
- "icon": one of "warning", "opportunity", "info", "action"
- "text": a single sentence insight (max 30 words)

Example format:
[{"icon":"warning","text":"Your February VAT return is 5 days overdue. File immediately to avoid penalties."}]`
                        },
                    ],
                },
            });

            if (fnError) throw fnError;

            // 5. Parse response
            const content = data?.content || "";
            try {
                const jsonStr = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
                const parsed = JSON.parse(jsonStr);
                if (Array.isArray(parsed)) {
                    setInsights(parsed.slice(0, 4));
                }
            } catch {
                // If Claude doesn't return valid JSON, show a fallback
                setInsights([{ icon: "info", text: content.substring(0, 120) }]);
            }

            setHasLoaded(true);
        } catch (err: any) {
            console.error("AI Insights error:", err);
            setError("Couldn't load your insights — the AI service may be busy right now.");
        } finally {
            setLoading(false);
        }
    };

    const getBorderColor = (icon: string) => {
        switch (icon) {
            case "warning":     return "border-l-amber-500";
            case "opportunity": return "border-l-green-500";
            case "action":      return "border-l-blue-500";
            default:            return "border-l-primary";
        }
    };

    const getIconComponent = (icon: string) => {
        switch (icon) {
            case "warning": return <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />;
            case "opportunity": return <TrendingUp className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />;
            case "action": return <FileWarning className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />;
            default: return <Coins className="h-4 w-4 text-primary shrink-0 mt-0.5" />;
        }
    };

    return (
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        AI Tax Insights
                    </CardTitle>
                    {hasLoaded && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={generateInsights}
                            disabled={loading}
                            className="h-8 text-xs"
                        >
                            <RefreshCw className={`h-3 w-3 mr-1 ${loading ? "animate-spin" : ""}`} />
                            Refresh
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                {!hasLoaded && !loading && (
                    <div className="text-center py-6 space-y-3">
                        <div className="h-12 w-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                            <Sparkles className="h-6 w-6 text-primary" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-medium">See what your numbers say</p>
                            <p className="text-xs text-muted-foreground">
                                I'll scan your {new Date().getFullYear()} data and flag anything worth your attention.
                            </p>
                        </div>
                        <Button onClick={generateInsights} size="sm" className="gap-2 mt-1">
                            <Sparkles className="h-4 w-4" />
                            Show my insights
                        </Button>
                    </div>
                )}

                {loading && (
                    <div className="flex flex-col items-center justify-center py-8 gap-3">
                        <Sparkles className="h-6 w-6 text-primary animate-pulse" />
                        <p className="text-sm text-muted-foreground animate-pulse">Looking at your numbers...</p>
                        <div className="h-1.5 rounded-full w-40 bg-gradient-to-r from-muted via-primary/20 to-muted animate-pulse" />
                    </div>
                )}

                {error && (
                    <div className="text-center py-4 space-y-2">
                        <p className="text-sm text-muted-foreground">
                            Couldn't load insights right now — the AI service may be busy.
                        </p>
                        <Button onClick={generateInsights} size="sm" variant="outline" className="gap-1.5">
                            <RefreshCw className="h-3 w-3" />
                            Try again
                        </Button>
                    </div>
                )}

                {hasLoaded && !loading && insights.length > 0 && (
                    <div className="space-y-3">
                        {insights.map((insight, idx) => (
                            <div
                                key={idx}
                                className={cn(
                                    "flex items-start gap-3 text-sm pl-3 border-l-2 py-0.5",
                                    getBorderColor(insight.icon)
                                )}
                            >
                                {getIconComponent(insight.icon)}
                                <p className="text-foreground leading-snug">{insight.text}</p>
                            </div>
                        ))}
                        <div className="mt-4 pt-3 border-t text-xs text-muted-foreground flex items-start gap-2">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-500" />
                            <p>
                                <strong>Disclaimer:</strong> AI estimations may be inaccurate. Do not use for final filing without human verification.
                            </p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
