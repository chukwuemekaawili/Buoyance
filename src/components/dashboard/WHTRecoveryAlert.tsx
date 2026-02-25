import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatKoboToNgn, stringToKobo, addKobo } from "@/lib/money";

interface MissingCredit {
    category: string;
    totalKobo: bigint;
    count: number;
    expectedWhtRate: number;
    potentialCreditKobo: bigint;
}

// WHT-attracting expense categories and their standard rates
const WHT_CATEGORIES: Record<string, number> = {
    professional: 0.05,
    consultancy: 0.05,
    technical: 0.05,
    management: 0.05,
    rent: 0.10,
    commission: 0.05,
    construction: 0.02,
    contract: 0.02,
    legal: 0.05,
    audit: 0.05,
    accounting: 0.05,
};

/**
 * WHT Credit Recovery Alert
 * Cross-references expenses in WHT-attracting categories against uploaded WHT certificates.
 * Flags potential unclaimed credits. Grounded entirely in real Supabase data.
 */
export function WHTRecoveryAlert() {
    const { user } = useAuth();
    const [missingCredits, setMissingCredits] = useState<MissingCredit[]>([]);
    const [totalPotential, setTotalPotential] = useState(0n);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) analyzeWHTGap();
    }, [user]);

    const analyzeWHTGap = async () => {
        try {
            const currentYear = new Date().getFullYear();
            const yearStart = `${currentYear}-01-01`;

            const [{ data: expenses }, { data: whtCerts }] = await Promise.all([
                supabase.from("expenses").select("amount_kobo, category").gte("date", yearStart),
                supabase.from("wht_certificates").select("amount_kobo"),
            ]);

            // Sum expenses by WHT-attracting category
            const categoryTotals: Record<string, { total: bigint; count: number }> = {};
            (expenses || []).forEach((e: any) => {
                const cat = (e.category || "").toLowerCase().replace(/\s+/g, "_");
                const matchedKey = Object.keys(WHT_CATEGORIES).find(
                    (k) => cat.includes(k)
                );
                if (matchedKey) {
                    if (!categoryTotals[matchedKey]) {
                        categoryTotals[matchedKey] = { total: 0n, count: 0 };
                    }
                    categoryTotals[matchedKey].total = addKobo(
                        categoryTotals[matchedKey].total,
                        stringToKobo(e.amount_kobo)
                    );
                    categoryTotals[matchedKey].count++;
                }
            });

            // Sum existing WHT certificates
            let totalCertsKobo = 0n;
            (whtCerts || []).forEach((w: any) => {
                totalCertsKobo = addKobo(totalCertsKobo, stringToKobo(w.amount_kobo));
            });

            // Calculate potential WHT that SHOULD have been deducted
            const missing: MissingCredit[] = [];
            let potentialTotal = 0n;

            Object.entries(categoryTotals).forEach(([category, { total, count }]) => {
                const rate = WHT_CATEGORIES[category];
                const expectedWht = (total * BigInt(Math.round(rate * 10000))) / 10000n;
                if (expectedWht > 0n) {
                    missing.push({
                        category,
                        totalKobo: total,
                        count,
                        expectedWhtRate: rate,
                        potentialCreditKobo: expectedWht,
                    });
                    potentialTotal = addKobo(potentialTotal, expectedWht);
                }
            });

            // Subtract existing certificates from potential
            const netPotential = potentialTotal > totalCertsKobo
                ? potentialTotal - totalCertsKobo
                : 0n;

            setMissingCredits(missing);
            setTotalPotential(netPotential);
        } catch (err) {
            console.error("WHT Recovery analysis error:", err);
        } finally {
            setLoading(false);
        }
    };

    if (loading || totalPotential === 0n) return null;

    return (
        <Card className="border-amber-500/30 bg-amber-500/5">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="h-4 w-4" />
                    Potential Unclaimed WHT Credits
                    <Badge variant="outline" className="ml-auto text-xs border-amber-500/40 text-amber-700 dark:text-amber-400">
                        {formatKoboToNgn(totalPotential)}
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-xs text-muted-foreground mb-3">
                    Based on your {new Date().getFullYear()} expenses in WHT-attracting categories, you may have unclaimed credits.
                    Request WHT certificates from your vendors.
                </p>
                <div className="space-y-1.5 mb-3">
                    {missingCredits.slice(0, 3).map((mc) => (
                        <div key={mc.category} className="flex justify-between text-xs">
                            <span className="capitalize text-muted-foreground">
                                {mc.category.replace(/_/g, " ")} ({mc.count} payments × {mc.expectedWhtRate * 100}%)
                            </span>
                            <span className="font-mono font-medium">
                                {formatKoboToNgn(mc.potentialCreditKobo)}
                            </span>
                        </div>
                    ))}
                </div>
                <Button variant="outline" size="sm" asChild className="w-full text-xs h-8">
                    <Link to="/wht-credits">
                        Manage WHT Credits
                        <ArrowRight className="h-3 w-3 ml-1" />
                    </Link>
                </Button>
            </CardContent>
        </Card>
    );
}
