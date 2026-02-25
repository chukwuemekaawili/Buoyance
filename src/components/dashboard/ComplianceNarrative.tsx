import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ComplianceNarrativeProps {
    score: number;
    overdueCount: number;
    upcomingCount: number;
    filingsSubmitted: number;
    filingsTotal: number;
}

/**
 * Converts the numeric compliance score into a plain-English AI narrative.
 * Grounded in real data: the score, number of overdue/upcoming deadlines, and filing counts.
 */
export function ComplianceNarrative({
    score,
    overdueCount,
    upcomingCount,
    filingsSubmitted,
    filingsTotal,
}: ComplianceNarrativeProps) {
    const [narrative, setNarrative] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const generateNarrative = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke("ai-chat", {
                body: {
                    messages: [
                        {
                            role: "user",
                            content: `A Nigerian taxpayer has a compliance score of ${score}%. They have ${overdueCount} overdue filing(s), ${upcomingCount} upcoming deadline(s) in the next 30 days, and have submitted ${filingsSubmitted} out of ${filingsTotal} total filings.

Write exactly 2 sentences: First sentence summarizes their compliance status. Second sentence states the single most urgent action they should take right now. Be specific and direct. Do not use markdown.`,
                        },
                    ],
                },
            });

            if (error) throw error;
            setNarrative(data?.content || "Unable to generate narrative.");
        } catch (err) {
            console.error("Compliance narrative error:", err);
            setNarrative(null);
        } finally {
            setLoading(false);
        }
    };

    if (narrative) {
        return (
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed italic border-l-2 border-primary/30 pl-3">
                {narrative}
            </p>
        );
    }

    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={generateNarrative}
            disabled={loading}
            className="mt-2 text-xs text-muted-foreground h-7 gap-1"
        >
            {loading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
                <Sparkles className="h-3 w-3" />
            )}
            {loading ? "Analyzing..." : "Explain my score"}
        </Button>
    );
}
