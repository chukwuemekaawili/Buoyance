import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";

// Constants defining current legal requirements
export const CURRENT_CONSENT_VERSION = "1.0";
export const CORE_CONSENT_TYPE = "tax_data_processing";

// Consent contexts used across the app
export type ConsentContext = "account_creation" | "calculation" | "filing";

interface ConsentContextType {
  hasAgreedToLatestTerms: boolean;
  isLoadingConsent: boolean;
  recordConsent: (ipAddress?: string, userAgent?: string) => Promise<boolean>;
  // Aliases expected by consumers (RequireConsent, calculators, etc.)
  hasConsent: (context?: ConsentContext) => boolean;
  loading: boolean;
  refreshConsent: () => Promise<void>;
}

const ConsentCtx = createContext<ConsentContextType | undefined>(undefined);

export function ConsentProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [hasAgreedToLatestTerms, setHasAgreedToLatestTerms] = useState<boolean>(true);
  const [isLoadingConsent, setIsLoadingConsent] = useState(true);

  const checkConsentStatus = useCallback(async () => {
    if (!user) {
      setHasAgreedToLatestTerms(true);
      setIsLoadingConsent(false);
      return;
    }

    try {
      setIsLoadingConsent(true);
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
      setHasAgreedToLatestTerms(false);
    } finally {
      setIsLoadingConsent(false);
    }
  }, [user]);

  useEffect(() => {
    checkConsentStatus();
  }, [checkConsentStatus]);

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

  // hasConsent function — used by RequireConsent and all calculator pages
  const hasConsent = useCallback((_context?: ConsentContext): boolean => {
    return hasAgreedToLatestTerms;
  }, [hasAgreedToLatestTerms]);

  // refreshConsent — re-checks consent status from the database
  const refreshConsent = useCallback(async () => {
    await checkConsentStatus();
  }, [checkConsentStatus]);

  return (
    <ConsentCtx.Provider value={{
      hasAgreedToLatestTerms,
      isLoadingConsent,
      recordConsent,
      hasConsent,
      loading: isLoadingConsent,
      refreshConsent,
    }}>
      {children}
    </ConsentCtx.Provider>
  );
}

export function useConsent() {
  const context = useContext(ConsentCtx);
  if (context === undefined) {
    throw new Error("useConsent must be used within a ConsentProvider");
  }
  return context;
}

