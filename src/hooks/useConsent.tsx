import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";

// Constants defining current legal requirements
export const CURRENT_CONSENT_VERSION = "1.0";
export const CORE_CONSENT_TYPE = "tax_data_processing";

interface ConsentContextType {
  hasAgreedToLatestTerms: boolean;
  isLoadingConsent: boolean;
  recordConsent: (ipAddress?: string, userAgent?: string) => Promise<boolean>;
}

const ConsentContext = createContext<ConsentContextType | undefined>(undefined);

export function ConsentProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [hasAgreedToLatestTerms, setHasAgreedToLatestTerms] = useState<boolean>(true); // Default true so it doesn't flash before load
  const [isLoadingConsent, setIsLoadingConsent] = useState(true);

  useEffect(() => {
    async function checkConsentStatus() {
      if (!user) {
        setHasAgreedToLatestTerms(true); // Don't block unauthenticated routes
        setIsLoadingConsent(false);
        return;
      }

      try {
        setIsLoadingConsent(true);
        // Check if there is a record matching the current version
        const { data, error } = await supabase
          .from('consent_records')
          .select('id')
          .eq('user_id', user.id)
          .eq('consent_type', CORE_CONSENT_TYPE)
          .eq('consent_version', CURRENT_CONSENT_VERSION)
          .maybeSingle();

        if (error) throw error;

        setHasAgreedToLatestTerms(!!data);
      } catch (error) {
        console.error("Failed to check NDPA consent status:", error);
        // Fail open if database is down, but ideally this should fail closed for strict compliance
        setHasAgreedToLatestTerms(false);
      } finally {
        setIsLoadingConsent(false);
      }
    }

    checkConsentStatus();
  }, [user]);

  const recordConsent = async (ipAddress = "unknown", userAgent = navigator.userAgent) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('consent_records')
        .insert({
          user_id: user.id,
          consent_type: CORE_CONSENT_TYPE,
          consent_version: CURRENT_CONSENT_VERSION,
          ip_address: ipAddress,
          user_agent: userAgent
        });

      if (error) throw error;

      setHasAgreedToLatestTerms(true);
      return true;
    } catch (error: any) {
      console.error("Failed to record consent:", error);
      toast({
        title: "Agreement Failed",
        description: "Could not record your digital signature. Please try again.",
        variant: "destructive"
      });
      return false;
    }
  };

  return (
    <ConsentContext.Provider value={{
      hasAgreedToLatestTerms,
      isLoadingConsent,
      recordConsent
    }}>
      {children}
    </ConsentContext.Provider>
  );
}

export function useConsent() {
  const context = useContext(ConsentContext);
  if (context === undefined) {
    throw new Error("useConsent must be used within a ConsentProvider");
  }
  return context;
}
