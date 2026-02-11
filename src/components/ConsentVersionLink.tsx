import { useState } from "react";
import { useConsent, CONSENT_VERSIONS, CONSENT_TEXTS, ConsentContext } from "@/hooks/useConsent";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, CheckCircle, XCircle, Eye } from "lucide-react";

interface ConsentVersionLinkProps {
  className?: string;
}

/**
 * Small link component that shows the current consent text versions.
 * Displays which contexts the user has consented to.
 */
export function ConsentVersionLink({ className }: ConsentVersionLinkProps) {
  const { consentStatus, getConsentVersion, getConsentText } = useConsent();
  const [open, setOpen] = useState(false);

  const contexts: ConsentContext[] = ["account_creation", "calculation", "filing"];

  const contextLabels: Record<ConsentContext, string> = {
    account_creation: "Account Creation",
    calculation: "Calculations",
    filing: "Filings",
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors ${className}`}
      >
        <Eye className="h-3 w-3" />
        View consent text versions
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <DialogTitle className="text-xl">Consent Text Versions</DialogTitle>
            </div>
            <DialogDescription>
              View the consent text for each context and your acceptance status.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Status summary */}
            <div className="flex flex-wrap gap-2">
              {contexts.map((ctx) => (
                <Badge 
                  key={ctx}
                  variant={consentStatus[ctx] ? "default" : "secondary"}
                  className="flex items-center gap-1"
                >
                  {consentStatus[ctx] ? (
                    <CheckCircle className="h-3 w-3" />
                  ) : (
                    <XCircle className="h-3 w-3" />
                  )}
                  {contextLabels[ctx]}
                </Badge>
              ))}
            </div>

            {/* Tabs for each context */}
            <Tabs defaultValue="account_creation" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                {contexts.map((ctx) => (
                  <TabsTrigger key={ctx} value={ctx} className="text-xs">
                    {contextLabels[ctx]}
                  </TabsTrigger>
                ))}
              </TabsList>

              {contexts.map((ctx) => (
                <TabsContent key={ctx} value={ctx} className="mt-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Version: {getConsentVersion(ctx)}</p>
                      <Badge variant={consentStatus[ctx] ? "default" : "outline"}>
                        {consentStatus[ctx] ? "Accepted" : "Not Accepted"}
                      </Badge>
                    </div>

                    <ScrollArea className="h-[250px] border rounded-md p-4 bg-muted/30">
                      <div className="text-sm text-muted-foreground whitespace-pre-line">
                        {getConsentText(ctx)}
                      </div>
                    </ScrollArea>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>

          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
