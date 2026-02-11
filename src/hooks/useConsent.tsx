import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { useAuth } from "./useAuth";
import { supabase } from "@/integrations/supabase/client";

// Current consent versions for each context
export const CONSENT_VERSIONS = {
  account_creation: "1.0.0-account",
  calculation: "1.0.0-calculation",
  filing: "1.0.0-filing",
} as const;

export type ConsentContext = keyof typeof CONSENT_VERSIONS;

// Consent text for each context
export const CONSENT_TEXTS: Record<ConsentContext, string> = {
  account_creation: `By creating an account with Buoyance, you agree to our Terms of Service and Privacy Policy.

You consent to:
1. Collection and processing of your tax-related data for calculation purposes
2. Secure storage of your financial information for 7 years per regulatory requirements
3. Receiving service-related communications
4. Our use of analytics to improve the platform

Your data will be handled in accordance with Nigerian data protection regulations (NDPR/NDPA).

Important: Buoyance is a tax information and calculation tool. It does not constitute professional tax advice.`,

  calculation: `By running or saving this tax calculation, I confirm:

1. The accuracy of the data I have entered
2. I consent to Buoyance calculating my tax liability based on the active tax rules
3. I understand this calculation is for informational purposes only
4. I understand that calculations are stored with immutable audit trails

This calculation will be saved with the current tax rule version and can be finalized for record-keeping.`,

  filing: `By preparing this tax filing, I confirm:

1. All information in this filing is accurate and complete to the best of my knowledge
2. I understand that submitting false information may result in penalties under the Nigeria Tax Act 2025
3. I consent to Buoyance storing this filing record for 7 years per regulatory requirements
4. I understand this is a "Prepare & Record" filing—actual NRS submission is done separately

This filing will be recorded in the system with a full audit trail.`,
};

// Simple hash function for consent text
function hashText(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

// Generate hashes for each context
export const CONSENT_HASHES: Record<ConsentContext, string> = {
  account_creation: hashText(CONSENT_TEXTS.account_creation),
  calculation: hashText(CONSENT_TEXTS.calculation),
  filing: hashText(CONSENT_TEXTS.filing),
};

interface ConsentStatus {
  account_creation: boolean;
  calculation: boolean;
  filing: boolean;
}

interface ConsentContextType {
  // Check if user has valid consent for a specific context
  hasConsent: (context: ConsentContext) => boolean;
  // Legacy: check if user has any valid consent (for backward compatibility)
  hasValidConsent: boolean;
  loading: boolean;
  // Accept consent for a specific context
  acceptConsent: (context: ConsentContext) => Promise<boolean>;
  // Get version for a context
  getConsentVersion: (context: ConsentContext) => string;
  // Get consent text for a context
  getConsentText: (context: ConsentContext) => string;
  // Get all consent statuses
  consentStatus: ConsentStatus;
  // Refresh consent status
  refreshConsent: () => Promise<void>;
  // Legacy exports for backward compatibility
  consentVersion: string;
  consentText: string;
}

const ConsentContext = createContext<ConsentContextType | undefined>(undefined);

export function ConsentProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [consentStatus, setConsentStatus] = useState<ConsentStatus>({
    account_creation: false,
    calculation: false,
    filing: false,
  });
  const [loading, setLoading] = useState(true);

  const checkConsent = useCallback(async () => {
    if (!user) {
      setConsentStatus({
        account_creation: false,
        calculation: false,
        filing: false,
      });
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("consents")
        .select("consent_version, context")
        .eq("user_id", user.id);

      if (error) {
        console.error("Error checking consent:", error);
        setConsentStatus({
          account_creation: false,
          calculation: false,
          filing: false,
        });
      } else {
        // Check each context
        const status: ConsentStatus = {
          account_creation: data?.some(
            (c) =>
              c.consent_version === CONSENT_VERSIONS.account_creation ||
              (c.context === "account_creation" && c.consent_version)
          ) ?? false,
          calculation: data?.some(
            (c) =>
              c.consent_version === CONSENT_VERSIONS.calculation ||
              (c.context === "calculation" && c.consent_version)
          ) ?? false,
          filing: data?.some(
            (c) =>
              c.consent_version === CONSENT_VERSIONS.filing ||
              (c.context === "filing" && c.consent_version)
          ) ?? false,
        };
        setConsentStatus(status);
      }
    } catch (err) {
      console.error("Consent check error:", err);
      setConsentStatus({
        account_creation: false,
        calculation: false,
        filing: false,
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      checkConsent();
    }
  }, [user, authLoading, checkConsent]);

  const hasConsent = useCallback(
    (context: ConsentContext): boolean => {
      return consentStatus[context];
    },
    [consentStatus]
  );

  const acceptConsent = async (context: ConsentContext): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase.from("consents").insert({
        user_id: user.id,
        consent_version: CONSENT_VERSIONS[context],
        consent_text_hash: CONSENT_HASHES[context],
        context: context,
        ip_address: null,
        user_agent: navigator.userAgent,
      });

      if (error) {
        console.error("Error saving consent:", error);
        return false;
      }

      // Update local state
      setConsentStatus((prev) => ({
        ...prev,
        [context]: true,
      }));

      return true;
    } catch (err) {
      console.error("Accept consent error:", err);
      return false;
    }
  };

  const getConsentVersion = (context: ConsentContext): string => {
    return CONSENT_VERSIONS[context];
  };

  const getConsentText = (context: ConsentContext): string => {
    return CONSENT_TEXTS[context];
  };

  const refreshConsent = async () => {
    setLoading(true);
    await checkConsent();
  };

  // Legacy: hasValidConsent checks if any consent is given (for backward compat)
  const hasValidConsent = consentStatus.account_creation;

  return (
    <ConsentContext.Provider
      value={{
        hasConsent,
        hasValidConsent,
        loading,
        acceptConsent,
        getConsentVersion,
        getConsentText,
        consentStatus,
        refreshConsent,
        // Legacy exports
        consentVersion: CONSENT_VERSIONS.account_creation,
        consentText: CONSENT_TEXTS.account_creation,
      }}
    >
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

// Legacy exports for backward compatibility
export const CURRENT_CONSENT_VERSION = CONSENT_VERSIONS.account_creation;
export const CONSENT_TEXT = CONSENT_TEXTS.account_creation;
export const CONSENT_TEXT_HASH = CONSENT_HASHES.account_creation;
