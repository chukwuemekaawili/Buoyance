import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, User, Building2, Briefcase, Building, UserCog, CheckCircle2, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRBAC } from "@/hooks/useRBAC";
import { AuthGuard } from "@/components/AuthGuard";
import type { AppRole } from "@/hooks/useRBAC";
import { useConsent } from "@/hooks/useConsent";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { writeAuditLog, AuditActions } from "@/lib/auditLog";
import { ConsentModal } from "@/components/ConsentModal";
import { validateTINOptional } from "@/lib/validators";
import logoDark from "@/assets/buoyance_logo_dark.png";

const USER_TYPES: { value: AppRole; label: string; description: string; icon: React.ReactNode }[] = [
  {
    value: "individual",
    label: "Individual",
    description: "Personal income tax and financial management",
    icon: <User className="h-5 w-5" />,
  },
  {
    value: "freelancer",
    label: "Freelancer",
    description: "Self-employed with multiple income sources",
    icon: <Briefcase className="h-5 w-5" />,
  },
  {
    value: "sme",
    label: "Small Business (SME)",
    description: "Small to medium enterprise tax management",
    icon: <Building2 className="h-5 w-5" />,
  },
  {
    value: "corporate",
    label: "Corporate",
    description: "Large corporation tax compliance",
    icon: <Building className="h-5 w-5" />,
  },
  {
    value: "accountant",
    label: "Accountant / Tax Professional",
    description: "Managing taxes for multiple clients",
    icon: <UserCog className="h-5 w-5" />,
  },
];

function OnboardingContent() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refreshRole } = useRBAC();
  const { hasValidConsent, loading: consentLoading } = useConsent();
  const { toast } = useToast();

  const [displayName, setDisplayName] = useState("");
  const [tin, setTin] = useState("");
  const [tinError, setTinError] = useState("");
  const [userType, setUserType] = useState<AppRole>("individual");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  // Validate TIN on change
  const handleTinChange = (value: string) => {
    setTin(value);
    const result = validateTINOptional(value);
    setTinError(result.error || "");
  };

  // Check if user needs onboarding
  useEffect(() => {
    async function checkOnboardingStatus() {
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.onboarding_completed) {
        navigate("/");
      }
    }

    checkOnboardingStatus();
  }, [user, navigate]);

  // Show consent modal after form completion if consent not given
  useEffect(() => {
    if (onboardingComplete && !consentLoading && !hasValidConsent) {
      setShowConsentModal(true);
    } else if (onboardingComplete && hasValidConsent) {
      navigate("/");
    }
  }, [onboardingComplete, hasValidConsent, consentLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validate TIN if provided
    if (tin) {
      const tinValidation = validateTINOptional(tin);
      if (!tinValidation.isValid) {
        setTinError(tinValidation.error || "Invalid TIN");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Update profile with display name and user type
      // NOTE: Onboarding only updates profiles table. 
      // user_roles is managed by trigger (default) and admins only.
      // The user_type in profiles is for UI display/preference only.
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          display_name: displayName || null,
          user_type: userType,
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      // Log the onboarding completion
      await writeAuditLog({
        action: AuditActions.USER_ONBOARDING_COMPLETED,
        entity_type: "user",
        entity_id: user.id,
        after_json: { display_name: displayName, user_type: userType, tin: tin ? "***" : null },
      });

      // Refresh role data
      await refreshRole();

      toast({
        title: "Profile updated!",
        description: "Your account setup is complete.",
      });

      setOnboardingComplete(true);
    } catch (err: any) {
      console.error("Onboarding error:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to complete setup. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img
            src={logoDark}
            alt="Buoyance"
            className="h-10 w-auto dark:invert-0 invert"
          />
        </div>

        <Card className="border-2">
          <CardHeader className="text-center">
            <div className="mx-auto p-3 bg-primary/10 rounded-full w-fit mb-2">
              <CheckCircle2 className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
            <CardDescription>
              Tell us a bit about yourself to personalize your experience
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Display Name */}
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name (optional)</Label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder="How should we call you?"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={50}
                />
              </div>

              {/* TIN Field */}
              <div className="space-y-2">
                <Label htmlFor="tin">Tax Identification Number (optional)</Label>
                <Input
                  id="tin"
                  type="text"
                  placeholder="10-digit JTB TIN"
                  value={tin}
                  onChange={(e) => handleTinChange(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  maxLength={10}
                  className={tinError ? "border-destructive" : ""}
                />
                {tinError && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {tinError}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Required for filing submissions. You can add it later in Settings.
                </p>
              </div>

              {/* User Type Selection */}
              <div className="space-y-3">
                <Label>I am a...</Label>
                <RadioGroup
                  value={userType}
                  onValueChange={(value) => setUserType(value as AppRole)}
                  className="space-y-2"
                >
                  {USER_TYPES.map((type) => (
                    <label
                      key={type.value}
                      className={`flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        userType === type.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <RadioGroupItem value={type.value} className="sr-only" />
                      <div
                        className={`p-2 rounded-lg ${
                          userType === type.value
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {type.icon}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{type.label}</div>
                        <div className="text-sm text-muted-foreground">
                          {type.description}
                        </div>
                      </div>
                      {userType === type.value && (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      )}
                    </label>
                  ))}
                </RadioGroup>
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Continue"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Consent Modal */}
      <ConsentModal
        open={showConsentModal}
        onConsentGiven={() => {
          setShowConsentModal(false);
          navigate("/");
        }}
      />
    </div>
  );
}

export default function Onboarding() {
  return (
    <AuthGuard>
      <OnboardingContent />
    </AuthGuard>
  );
}
