import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Shield, Calculator, FileText, UserPlus } from "lucide-react";
import { useConsent, ConsentContext as ConsentContextType } from "@/hooks/useConsent";
import { useToast } from "@/hooks/use-toast";
import { writeAuditLog, AuditActions } from "@/lib/auditLog";

interface ConsentModalProps {
  open: boolean;
  onConsentGiven?: () => void;
  context?: ConsentContextType;
}

const CONTEXT_CONFIG: Record<ConsentContextType, { 
  title: string; 
  description: string;
  icon: typeof Shield;
  buttonText: string;
}> = {
  account_creation: {
    title: "Terms & Consent",
    description: "Please review and accept our terms before using Buoyance.",
    icon: UserPlus,
    buttonText: "Accept and Continue",
  },
  calculation: {
    title: "Calculation Consent",
    description: "Please confirm before running or saving this calculation.",
    icon: Calculator,
    buttonText: "Accept and Run Calculation",
  },
  filing: {
    title: "Filing Consent",
    description: "Please confirm before preparing this tax filing.",
    icon: FileText,
    buttonText: "Accept and Prepare Filing",
  },
};

export function ConsentModal({ 
  open, 
  onConsentGiven,
  context = "account_creation" 
}: ConsentModalProps) {
  const [agreed, setAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { acceptConsent, getConsentVersion, getConsentText } = useConsent();
  const { toast } = useToast();

  const config = CONTEXT_CONFIG[context];
  const Icon = config.icon;
  const consentText = getConsentText(context);
  const consentVersion = getConsentVersion(context);

  const handleAccept = async () => {
    if (!agreed) return;

    setIsSubmitting(true);
    const success = await acceptConsent(context);

    if (success) {
      // Log consent acceptance with context
      await writeAuditLog({
        action: AuditActions.CONSENT_ACCEPTED,
        entity_type: "consent",
        entity_id: context,
        after_json: { 
          version: consentVersion,
          context: context,
          user_agent: navigator.userAgent,
          timestamp: new Date().toISOString(),
        },
      });

      toast({
        title: "Consent recorded",
        description: `Thank you for agreeing to the ${context.replace("_", " ")} terms.`,
      });
      setAgreed(false);
      onConsentGiven?.();
    } else {
      toast({
        title: "Error",
        description: "Failed to record consent. Please try again.",
        variant: "destructive",
      });
    }

    setIsSubmitting(false);
  };

  return (
    <Dialog open={open}>
      <DialogContent 
        className="sm:max-w-lg" 
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle className="text-xl">{config.title}</DialogTitle>
          </div>
          <DialogDescription>
            {config.description}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[250px] border rounded-md p-4 bg-muted/30">
          <div className="text-sm text-muted-foreground whitespace-pre-line">
            {consentText}
          </div>
        </ScrollArea>

        <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
          <Checkbox
            id="consent-agree"
            checked={agreed}
            onCheckedChange={(checked) => setAgreed(checked === true)}
            className="mt-1"
          />
          <label
            htmlFor="consent-agree"
            className="text-sm font-medium leading-relaxed cursor-pointer"
          >
            I have read and agree to the terms above.
            I consent to the collection and processing of my data as described.
          </label>
        </div>

        <DialogFooter>
          <div className="flex flex-col gap-2 w-full">
            <Button
              onClick={handleAccept}
              disabled={!agreed || isSubmitting}
              className="w-full"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                config.buttonText
              )}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Version {consentVersion}
            </p>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
