import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldCheck, FileText, AlertCircle } from "lucide-react";
import { useConsent, CURRENT_CONSENT_VERSION } from "@/hooks/useConsent";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function ConsentBlockerModal() {
    const { hasAgreedToLatestTerms, isLoadingConsent, recordConsent } = useConsent();
    const [isOpen, setIsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);

    // Open the modal if they haven't agreed, locking them out of the app
    useEffect(() => {
        if (!isLoadingConsent && !hasAgreedToLatestTerms) {
            setIsOpen(true);
        } else {
            setIsOpen(false);
        }
    }, [hasAgreedToLatestTerms, isLoadingConsent]);

    const handleAgree = async () => {
        setIsSubmitting(true);
        try {
            // In a real app we might want to fetch their public IP from an API, 
            // but for privacy we'll just log the user agent.
            await recordConsent("client", navigator.userAgent);
            setIsOpen(false);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const target = e.currentTarget;
        const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 50; // 50px buffer
        if (isAtBottom && !hasScrolledToBottom) {
            setHasScrolledToBottom(true);
        }
    };

    if (isLoadingConsent || !isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={() => { }}>
            {/* preventClose makes it impossible to click outside or press escape to close */}
            <DialogContent
                className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden"
                onInteractOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
                showCloseButton={false}
            >
                <div className="p-6 pb-4 border-b bg-muted/30">
                    <DialogHeader>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-primary/10 rounded-full">
                                <ShieldCheck className="w-6 h-6 text-primary" />
                            </div>
                            <DialogTitle className="text-xl">Legal & Privacy Update</DialogTitle>
                        </div>
                        <DialogDescription className="text-base">
                            To continue using Buoyance, please review and accept our updated Data Processing Agreement (version {CURRENT_CONSENT_VERSION}).
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <ScrollArea className="flex-1 p-6" onScroll={handleScroll}>
                    <div className="prose prose-sm dark:prose-invert max-w-none space-y-4 text-muted-foreground">
                        <h3 className="text-foreground font-semibold flex items-center gap-2">
                            <FileText className="w-4 h-4" /> Data Processing Agreement
                        </h3>

                        <p>
                            By proceeding to use the Buoyance platform, you agree to the processing of your personal and corporate financial data in accordance with the <strong>Nigeria Data Protection Act 2023 (NDPA)</strong>.
                        </p>

                        <h4 className="text-foreground font-medium mt-6">1. Data Collection & Purpose</h4>
                        <p>
                            We collect and process your Tax Identification Number (TIN), business registration details, and financial ledgers strictly for the purpose of generating tax computations, compliance reports, and facilitating statutory filings.
                        </p>

                        <h4 className="text-foreground font-medium mt-6">2. Statutory Retention (Legal Hold)</h4>
                        <p>
                            In accordance with the Federal Inland Revenue Service (FIRS) Establishment Act and related tax laws, all finalised tax computations, evidence vaults, and financial ledgers processed on this platform <strong>are subject to a mandatory 6-year retention period</strong>.
                        </p>

                        <h4 className="text-foreground font-medium mt-6">3. Right to be Forgotten (DSAR)</h4>
                        <p>
                            You maintain the right to delete your account at any time via your Settings dashboard. Upon invoking account deletion, your Personally Identifiable Information (PII) will be immediately anonymised. However, to comply with Nigerian tax law, your financial ledgers and tax records will enter a <strong>Secure Legal Hold</strong> for 6 years before permanent deletion.
                        </p>

                        <h4 className="text-foreground font-medium mt-6">4. Third-Party Processors</h4>
                        <p>
                            We employ sub-processors (including AI models for transaction categorisation) to deliver our services. All data transmitted to sub-processors undergoes strict Personally Identifiable Information (PII) redaction and is handled under secure, NDPA-compliant Data Processing Agreements.
                        </p>
                    </div>
                </ScrollArea>

                <div className="p-6 pt-4 border-t bg-background mt-auto">
                    {!hasScrolledToBottom && (
                        <Alert className="mb-4 bg-amber-50 border-amber-200 dark:bg-amber-950/50 dark:border-amber-900 border text-amber-800 dark:text-amber-200 py-2">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle className="text-sm font-medium">Please scroll to the bottom</AlertTitle>
                            <AlertDescription className="text-xs opacity-90">
                                You must read through the entire agreement before accepting.
                            </AlertDescription>
                        </Alert>
                    )}

                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button
                            variant="outline"
                            className="w-full sm:w-auto"
                            onClick={() => {
                                // They refused. Redirect to a safe landing page or trigger logout.
                                window.location.href = "/privacy";
                            }}
                        >
                            I Disagree (Exit)
                        </Button>
                        <Button
                            onClick={handleAgree}
                            disabled={!hasScrolledToBottom || isSubmitting}
                            className="w-full sm:w-auto gap-2"
                        >
                            {isSubmitting ? "Recording Signature..." : "I Accept & Agree"}
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
}
