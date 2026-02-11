import { ReactNode, useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useConsent, ConsentContext as ConsentContextType } from "@/hooks/useConsent";
import { ConsentModal } from "./ConsentModal";
import { Loader2 } from "lucide-react";

interface RequireConsentProps {
  children: ReactNode;
  fallback?: ReactNode;
  context?: ConsentContextType;
  /** If true, shows a blocking modal instead of just fallback content */
  blocking?: boolean;
}

/**
 * Wrapper component that requires consent before rendering children.
 * Shows consent modal if user hasn't accepted current consent version for the given context.
 * 
 * @param context - The consent context to check (account_creation, calculation, filing)
 * @param blocking - If true, shows a modal overlay that must be accepted
 */
export function RequireConsent({ 
  children, 
  fallback,
  context = "account_creation",
  blocking = true,
}: RequireConsentProps) {
  const { user, loading: authLoading } = useAuth();
  const { hasConsent, loading: consentLoading, refreshConsent } = useConsent();
  const [showModal, setShowModal] = useState(false);

  const hasValidConsentForContext = hasConsent(context);

  useEffect(() => {
    if (!authLoading && !consentLoading && user && !hasValidConsentForContext) {
      setShowModal(true);
    } else if (hasValidConsentForContext) {
      setShowModal(false);
    }
  }, [user, authLoading, consentLoading, hasValidConsentForContext]);

  // Still loading
  if (authLoading || consentLoading) {
    return (
      fallback || (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )
    );
  }

  // Not logged in - show children (they'll handle their own auth)
  if (!user) {
    return <>{children}</>;
  }

  // Has valid consent for this context - show children
  if (hasValidConsentForContext) {
    return <>{children}</>;
  }

  // Needs consent - show modal (blocking) or fallback
  const handleConsentGiven = async () => {
    await refreshConsent();
    setShowModal(false);
  };

  if (blocking) {
    return (
      <>
        {/* Show the content but with modal overlay */}
        {children}
        <ConsentModal
          open={showModal}
          onConsentGiven={handleConsentGiven}
          context={context}
        />
      </>
    );
  }

  return (
    <>
      {fallback || (
        <div className="flex items-center justify-center p-8">
          <p className="text-muted-foreground">
            Please accept our {context.replace("_", " ")} terms to continue.
          </p>
        </div>
      )}
      <ConsentModal
        open={showModal}
        onConsentGiven={handleConsentGiven}
        context={context}
      />
    </>
  );
}
