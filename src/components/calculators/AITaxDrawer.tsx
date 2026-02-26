import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Sparkles, AlertTriangle } from "lucide-react";
import { getExplanation, AIExplanationRequest } from "@/lib/aiService";
import { useToast } from "@/hooks/use-toast";
import { useFeatureGate } from "@/hooks/useFeatureGate";
import ReactMarkdown from 'react-markdown';

interface AITaxDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title?: string;
    contextParams: AIExplanationRequest['context'];
    onAIFinished?: () => void;
}

export function AITaxDrawer({
    open,
    onOpenChange,
    title = "AI Tax Breakdown",
    contextParams,
    onAIFinished
}: AITaxDrawerProps) {
    const [isLlmLoading, setIsLlmLoading] = useState(false);
    const [explanationText, setExplanationText] = useState<string | null>(null);

    const { toast } = useToast();
    const { checkQuota, recordUsage } = useFeatureGate();

    // Reset state when sheet is opened to trigger new fetch
    const handleOpenChange = (newOpen: boolean) => {
        if (newOpen) {
            setExplanationText(null);
            generateExplanation();
        } else {
            setExplanationText(null);
            setIsLlmLoading(false);
        }
        onOpenChange(newOpen);
    };

    const generateExplanation = async () => {
        // 1. Enforce Freemium Quota immediately
        const quota = await checkQuota('ai_explanations');
        if (!quota.allowed) {
            toast({
                title: "Quota Exceeded",
                description: "You have reached your workspace limit for AI Insights. Please upgrade to Pro.",
                variant: "destructive"
            });
            onOpenChange(false);
            return;
        }

        setIsLlmLoading(true);
        try {
            // 2. Transmit to LLM (PII is sanitized internally by aiService)
            const res = await getExplanation({
                question: `Explain how the final numbers in this context were derived, step by step. Mention references to the Nigeria Tax Act 2025 where relevant.`,
                context: contextParams
            });

            setExplanationText(res.answer);

            if (res.isStubbed) {
                toast({
                    title: "Network Unreachable",
                    description: "The AI Engine could not be reached. A fallback summary has been provided.",
                    variant: "destructive"
                });
            } else {
                // 3. Subtract quota upon successful LLM generation
                await recordUsage('ai_explanations');
            }

        } catch (err: any) {
            console.error(err);
            toast({
                title: "Analysis Failed",
                description: err.message || "An unexpected error occurred compiling the AI response.",
                variant: "destructive"
            });
            onOpenChange(false);
        } finally {
            setIsLlmLoading(false);
            if (onAIFinished) onAIFinished();
        }
    };

    return (
        <Sheet open={open} onOpenChange={handleOpenChange}>
            <SheetContent className="w-full sm:max-w-md overflow-hidden flex flex-col pt-12">
                <SheetHeader className="mb-4">
                    <SheetTitle className="flex items-center gap-2 text-primary">
                        <Sparkles className="h-5 w-5" />
                        {title}
                    </SheetTitle>
                    <SheetDescription>
                        Contextual interpretation powered by Buoyance AI
                    </SheetDescription>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto">
                    {isLlmLoading && !explanationText && (
                        <div className="flex flex-col items-center justify-center h-full space-y-4 py-12 text-muted-foreground">
                            <Loader2 className="h-10 w-10 animate-spin text-primary/60" />
                            <p className="animate-pulse">Analyzing calculation vectors...</p>
                            <div className="text-xs flex items-center gap-2 mt-4 opacity-50 px-8 text-center">
                                <AlertTriangle className="h-4 w-4" />
                                PII is automatically scrubbed before transmission.
                            </div>
                        </div>
                    )}

                    {!isLlmLoading && explanationText && (
                        <ScrollArea className="h-full pr-4 pb-12">
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                                <ReactMarkdown>{explanationText}</ReactMarkdown>
                            </div>
                        </ScrollArea>
                    )}
                </div>

                <div className="pt-4 mt-auto border-t">
                    <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
                        Close Analysis
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}
