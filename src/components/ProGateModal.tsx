import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lock, Zap, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ProGateModalProps {
    isOpen: boolean;
    onClose: () => void;
    featureName: string;
    description?: string;
}

export function ProGateModal({ isOpen, onClose, featureName, description }: ProGateModalProps) {
    const navigate = useNavigate();

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md w-full p-0 overflow-hidden bg-background">

                {/* Header Hero Area */}
                <div className="bg-gradient-to-br from-primary/20 via-primary/5 to-background p-6 md:p-8 text-center border-b">
                    <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                        <Lock className="w-8 h-8 text-primary" />
                    </div>
                    <DialogTitle className="text-2xl font-bold mb-2">Unlock {featureName}</DialogTitle>
                    <DialogDescription className="text-base text-muted-foreground">
                        {description || "This feature requires a premium workspace subscription."}
                    </DialogDescription>
                </div>

                {/* Features List */}
                <div className="p-6 md:p-8 space-y-4">
                    <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4">
                        Pro Plan Includes:
                    </h4>

                    <ul className="space-y-3">
                        {[
                            "Bulk multi-employee payroll processing",
                            "Unlimited automated tax explanations via AI",
                            "Up to 500 receipt OCR scans per month",
                            "Direct automated Bank Feeds (Mono)",
                            "Capital allowances & loss carry-forward for CIT",
                            "Priority email support"
                        ].map((feature, i) => (
                            <li key={i} className="flex items-start gap-3">
                                <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                                <span className="text-sm text-foreground">{feature}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Footer Actions */}
                <DialogFooter className="p-6 bg-muted/30 border-t flex-col sm:flex-row gap-3">
                    <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
                        Maybe Later
                    </Button>
                    <Button
                        className="w-full sm:w-auto gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary text-primary-foreground shadow-lg"
                        onClick={() => {
                            onClose();
                            navigate("/settings?tab=billing");
                        }}
                    >
                        <Zap className="w-4 h-4" />
                        Upgrade to Pro
                    </Button>
                </DialogFooter>

            </DialogContent>
        </Dialog>
    );
}
