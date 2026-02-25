import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AuthGuard } from "@/components/AuthGuard";
import { useIntegrationStatus } from "@/hooks/useIntegrationStatus";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useFeatureGate, MetricName, PLAN_LIMITS } from "@/hooks/useFeatureGate";
import { useSearchParams } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import {
  Loader2,
  ArrowLeft,
  User,
  Lock,
  Shield,
  Bell,
  Mail,
  Save,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  Clock,
  AlertCircle,
  FileText,
  Briefcase,
  CreditCard,
  Zap,
  Activity,
  Server
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { validateTINOptional } from "@/lib/validators";
import { ConsentVersionLink } from "@/components/ConsentVersionLink";
import { TeamSettingsCard } from "@/components/settings/TeamSettingsCard";

// Canonical Tax Identity types for Nigeria
export type TaxIdentity =
  | "freelancer"   // Freelancer / Sole Proprietor
  | "enterprise"   // Small Business Enterprise / Business Name
  | "ltd"          // Limited Company (LTD)
  | "salary"       // Salary Earner (PAYE)
  | "partnership"  // Partnership
  | "ngo"          // NGO / Non-Profit
  | "cooperative"; // Cooperative Society

interface TaxIdentityOption {
  value: TaxIdentity;
  label: string;
  description: string;
}

const TAX_IDENTITY_OPTIONS: TaxIdentityOption[] = [
  { value: "salary", label: "Salary Earner (PAYE)", description: "Employed with taxes deducted at source by employer" },
  { value: "freelancer", label: "Freelancer / Sole Proprietor", description: "Self-employed individual providing professional services" },
  { value: "enterprise", label: "Small Business Enterprise", description: "Registered business name (unincorporated)" },
  { value: "ltd", label: "Limited Company (LTD)", description: "Incorporated company registered with CAC" },
  { value: "partnership", label: "Partnership", description: "Business owned by two or more partners" },
  { value: "ngo", label: "NGO / Non-Profit", description: "Non-governmental organization or charity" },
  { value: "cooperative", label: "Cooperative Society", description: "Member-owned cooperative organization" },
];

// Notifications Card Component with integration status
function NotificationsCard({
  emailNotifications,
  setEmailNotifications,
  deadlineReminders,
  setDeadlineReminders,
  complianceAlerts,
  setComplianceAlerts,
}: {
  emailNotifications: boolean;
  setEmailNotifications: (value: boolean) => void;
  deadlineReminders: boolean;
  setDeadlineReminders: (value: boolean) => void;
  complianceAlerts: boolean;
  setComplianceAlerts: (value: boolean) => void;
}) {
  const { email, loading: statusLoading, error: statusError } = useIntegrationStatus();
  const emailConfigured = email?.configured ?? false;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notifications
        </CardTitle>
        <CardDescription>Configure how you receive notifications</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* In-App Notifications - Always available */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium flex items-center gap-2">
              <Bell className="h-4 w-4" />
              In-App Notifications
            </p>
            <p className="text-sm text-muted-foreground">
              Receive notifications in your dashboard
            </p>
          </div>
          <Badge variant="outline" className="text-success border-success">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Active
          </Badge>
        </div>

        <Separator />

        {/* Email Notifications - Depends on integration */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Notifications
              {!emailConfigured && !statusLoading && (
                <Badge variant="outline" className="text-muted-foreground ml-2">
                  <Clock className="h-3 w-3 mr-1" />
                  Coming Soon
                </Badge>
              )}
            </p>
            <p className="text-sm text-muted-foreground">
              Receive important updates via email
            </p>
            {statusError && (
              <p className="text-xs text-amber-500 flex items-center gap-1 mt-1">
                <AlertCircle className="h-3 w-3" />
                Status unavailable
              </p>
            )}
          </div>
          {statusLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Switch
                    checked={emailConfigured && emailNotifications}
                    onCheckedChange={setEmailNotifications}
                    disabled={!emailConfigured}
                  />
                </div>
              </TooltipTrigger>
              {!emailConfigured && (
                <TooltipContent>
                  <p>Email service not configured</p>
                </TooltipContent>
              )}
            </Tooltip>
          )}
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Deadline Reminders</p>
            <p className="text-sm text-muted-foreground">
              Get notified before tax filing deadlines
            </p>
          </div>
          <Switch
            checked={deadlineReminders}
            onCheckedChange={setDeadlineReminders}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Compliance Alerts</p>
            <p className="text-sm text-muted-foreground">
              Receive alerts about compliance issues
            </p>
          </div>
          <Switch
            checked={complianceAlerts}
            onCheckedChange={setComplianceAlerts}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function SettingsContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") || "profile";
  const { plan, isPro, isLoading: billingLoading, checkQuota } = useFeatureGate();
  const { currentWorkspace } = useWorkspace();

  const [promoCode, setPromoCode] = useState("");
  const [isProcessingPromo, setIsProcessingPromo] = useState(false);

  const handlePromoUpgrade = async () => {
    if (!currentWorkspace?.id) return;
    if (!promoCode.trim()) return;

    if (promoCode.trim().toUpperCase() === "FEEE2025") {
      setIsProcessingPromo(true);
      const { error } = await supabase
        .from('workspaces')
        .update({ billing_plan: 'pro', subscription_status: 'active' })
        .eq('id', currentWorkspace.id);

      setIsProcessingPromo(false);

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Pro Unlocked!", description: "Promo code FEEE2025 applied successfully." });
        window.location.reload();
      }
    } else {
      toast({ title: "Invalid Code", description: "The promo code entered is not valid.", variant: "destructive" });
    }
  };

  // Metrics state for Billing dashboard
  const [metrics, setMetrics] = useState<Record<MetricName, { allowed: boolean; remaining: number; limit: number } | null>>({
    ai_explanations: null,
    ocr_receipts: null,
    api_requests: null,
    bank_syncs: null
  });

  const loadMetrics = async () => {
    const ai = await checkQuota('ai_explanations');
    const ocr = await checkQuota('ocr_receipts');
    const api = await checkQuota('api_requests');
    const bank = await checkQuota('bank_syncs');
    setMetrics({ ai_explanations: ai, ocr_receipts: ocr, api_requests: api, bank_syncs: bank });
  };

  useEffect(() => {
    if (defaultTab === 'billing' && !billingLoading) {
      loadMetrics();
    }
  }, [defaultTab, billingLoading, plan]);

  // Profile state
  const [displayName, setDisplayName] = useState("");
  const [tin, setTin] = useState("");
  const [tinError, setTinError] = useState("");
  const [taxIdentity, setTaxIdentity] = useState<TaxIdentity | "">("");
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [identitySaving, setIdentitySaving] = useState(false);

  // TIN validation handler
  const handleTinChange = (value: string) => {
    setTin(value);
    const result = validateTINOptional(value);
    setTinError(result.error || "");
  };

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  // Notification preferences
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [deadlineReminders, setDeadlineReminders] = useState(true);
  const [complianceAlerts, setComplianceAlerts] = useState(true);

  // Dialogs
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    setProfileLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("display_name, tin, tax_identity")
        .eq("id", user!.id)
        .single();

      if (error) throw error;
      setDisplayName(data?.display_name || "");
      setTin(data?.tin || "");
      // Load tax_identity directly from the dedicated column
      if (data?.tax_identity && TAX_IDENTITY_OPTIONS.some(opt => opt.value === data.tax_identity)) {
        setTaxIdentity(data.tax_identity as TaxIdentity);
      } else {
        setTaxIdentity(""); // Not set
      }
    } catch (err: any) {
      console.error("Failed to load profile:", err);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    // Validate TIN if provided
    if (tin) {
      const tinValidation = validateTINOptional(tin);
      if (!tinValidation.isValid) {
        setTinError(tinValidation.error || "Invalid TIN");
        return;
      }
    }

    setProfileSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName,
          tin: tin || null,
          updated_at: new Date().toISOString()
        })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "Profile updated",
        description: "Your profile has been saved successfully.",
      });
    } catch (err: any) {
      toast({
        title: "Failed to save",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleSaveTaxIdentity = async () => {
    if (!user || !taxIdentity) return;

    setIdentitySaving(true);
    try {
      // Save to the dedicated tax_identity column
      const { error } = await supabase
        .from("profiles")
        .update({
          tax_identity: taxIdentity,
          updated_at: new Date().toISOString()
        })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "Tax Identity updated",
        description: "Your tax identity has been saved successfully.",
      });
    } catch (err: any) {
      toast({
        title: "Failed to save",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIdentitySaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please ensure both password fields match.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: "Password too short",
        description: "Password must be at least 8 characters.",
        variant: "destructive",
      });
      return;
    }

    setPasswordSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      toast({
        title: "Password changed",
        description: "Your password has been updated successfully.",
      });
    } catch (err: any) {
      toast({
        title: "Failed to change password",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setPasswordSaving(false);
    }
  };

  const passwordStrength = (password: string): { label: string; color: string } => {
    if (password.length === 0) return { label: "", color: "" };
    if (password.length < 8) return { label: "Weak", color: "text-destructive" };
    if (password.length < 12) return { label: "Fair", color: "text-amber-500" };
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    const strength = [hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;
    if (strength >= 3) return { label: "Strong", color: "text-success" };
    return { label: "Good", color: "text-amber-500" };
  };

  const strength = passwordStrength(newPassword);

  const handleDeleteAccount = async () => {
    if (!user) return;
    setIsDeleting(true);

    try {
      // 1. Call the Secure RPC to anonymize PII and archive ledgers (Legal Hold)
      const { error: rpcError } = await supabase.rpc('dsar_delete_account', {
        target_user_id: user.id
      });
      if (rpcError) throw rpcError;

      // 2. Sign the user out locally
      await supabase.auth.signOut();

      toast({
        title: "Account Deleted",
        description: "Your personal data has been anonymised. Financial records enter a statutory 6-year secure archive in compliance with Nigerian tax law.",
      });

      // Force reload to clear all state
      window.location.href = "/";
    } catch (error: any) {
      console.error("DSAR Delete Failed:", error);
      toast({
        title: "Deletion Failed",
        description: error.message || "An error occurred during account deletion.",
        variant: "destructive",
      });
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };


  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-grow pt-20 md:pt-28 pb-16">
        <div className="container mx-auto px-4 md:px-6 max-w-3xl">
          <div className="mb-6">
            <Link
              to="/dashboard"
              className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-foreground">Settings</h1>
            <p className="text-muted-foreground mt-1">
              Manage your account settings and preferences
            </p>
          </div>

          <Tabs defaultValue={defaultTab} onValueChange={(v) => setSearchParams({ tab: v })} className="space-y-6">
            <TabsList className="grid w-full grid-cols-5 lg:w-[500px]">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="team">Team</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
              <TabsTrigger value="notifications">Alerts</TabsTrigger>
              <TabsTrigger value="billing">Billing</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-6 mt-4">
              {/* Profile Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Profile
                  </CardTitle>
                  <CardDescription>Your account information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="email"
                        type="email"
                        value={user?.email || ""}
                        disabled
                        className="bg-muted"
                      />
                      <Badge variant="outline" className="shrink-0">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input
                      id="displayName"
                      placeholder="Enter your display name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      disabled={profileLoading}
                    />
                  </div>

                  {/* TIN Field */}
                  <div className="space-y-2">
                    <Label htmlFor="tin" className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Tax Identification Number (TIN)
                    </Label>
                    <Input
                      id="tin"
                      type="text"
                      placeholder="10-digit JTB TIN"
                      value={tin}
                      onChange={(e) => handleTinChange(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      maxLength={10}
                      disabled={profileLoading}
                      className={tinError ? "border-destructive" : ""}
                    />
                    {tinError ? (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {tinError}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Required for filing submissions. Format: 10 digits (e.g., 1234567890)
                      </p>
                    )}
                  </div>

                  <Button
                    onClick={handleSaveProfile}
                    disabled={profileSaving || profileLoading}
                  >
                    {profileSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Profile
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Tax Identity Section */}
              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Briefcase className="h-5 w-5" />
                    Tax Identity
                  </CardTitle>
                  <CardDescription>
                    Select your tax identity to receive personalized deduction suggestions and filing guidance
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {profileLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <>
                      <RadioGroup
                        value={taxIdentity}
                        onValueChange={(value) => setTaxIdentity(value as TaxIdentity)}
                        className="grid gap-3"
                      >
                        {TAX_IDENTITY_OPTIONS.map((option) => (
                          <div
                            key={option.value}
                            className={`flex items-start space-x-3 p-4 rounded-lg border cursor-pointer transition-all ${taxIdentity === option.value
                              ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                              : "border-border hover:border-primary/50"
                              }`}
                            onClick={() => setTaxIdentity(option.value)}
                          >
                            <RadioGroupItem value={option.value} id={option.value} className="mt-1" />
                            <div className="flex-1">
                              <Label htmlFor={option.value} className="font-medium cursor-pointer">
                                {option.label}
                              </Label>
                              <p className="text-sm text-muted-foreground mt-0.5">
                                {option.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </RadioGroup>

                      <Button
                        onClick={handleSaveTaxIdentity}
                        disabled={identitySaving || !taxIdentity}
                        className="mt-4"
                      >
                        {identitySaving ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Save Tax Identity
                          </>
                        )}
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="team" className="space-y-6 mt-4">
              <TeamSettingsCard />
            </TabsContent>

            <TabsContent value="security" className="space-y-6 mt-4">
              {/* Security Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Lock className="h-5 w-5" />
                    Security
                  </CardTitle>
                  <CardDescription>Manage your password and security settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showPasswords ? "text" : "password"}
                        placeholder="Enter new password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 -translate-y-1/2"
                        onClick={() => setShowPasswords(!showPasswords)}
                      >
                        {showPasswords ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    {strength.label && (
                      <p className={`text-xs ${strength.color}`}>
                        Password strength: {strength.label}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type={showPasswords ? "text" : "password"}
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    {confirmPassword && newPassword !== confirmPassword && (
                      <p className="text-xs text-destructive">Passwords don't match</p>
                    )}
                  </div>

                  <Button
                    onClick={handleChangePassword}
                    disabled={passwordSaving || !newPassword || newPassword !== confirmPassword}
                  >
                    {passwordSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      "Update Password"
                    )}
                  </Button>

                  <Separator className="my-4" />

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Two-Factor Authentication
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Add an extra layer of security to your account
                      </p>
                    </div>
                    <Badge variant="outline" className="text-muted-foreground">
                      Coming Soon
                    </Badge>
                  </div>

                  <Separator className="my-4" />

                  {/* Consent Transparency */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Consent Records
                      </p>
                      <p className="text-sm text-muted-foreground">
                        View the terms you've agreed to
                      </p>
                    </div>
                    <ConsentVersionLink />
                  </div>
                </CardContent>
              </Card>

              {/* Danger Zone */}
              <Card className="border-destructive/50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                    Danger Zone
                  </CardTitle>
                  <CardDescription>Irreversible account actions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Delete Account</p>
                      <p className="text-sm text-muted-foreground">
                        Permanently anonymise your account and archive ledgers (DSAR)
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      onClick={() => setShowDeleteDialog(true)}
                    >
                      Delete Account
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-6 mt-4">
              {/* Notifications Section */}
              <NotificationsCard
                emailNotifications={emailNotifications}
                setEmailNotifications={setEmailNotifications}
                deadlineReminders={deadlineReminders}
                setDeadlineReminders={setDeadlineReminders}
                complianceAlerts={complianceAlerts}
                setComplianceAlerts={setComplianceAlerts}
              />
            </TabsContent>

            <TabsContent value="billing" className="space-y-6 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Subscription Plan
                  </CardTitle>
                  <CardDescription>Manage your workspace billing and features</CardDescription>
                </CardHeader>
                <CardContent>
                  {billingLoading ? (
                    <div className="flex justify-center p-6"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                  ) : (
                    <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between p-4 border rounded-lg bg-muted/20">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-xl font-bold capitalize">{plan} Plan</h3>
                          {isPro && <Badge variant="default" className="bg-primary text-primary-foreground">Active</Badge>}
                          {!isPro && <Badge variant="secondary">Current</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {isPro
                            ? "You have access to all premium features and expanded limits."
                            : "You are on the free tier with basic features and limited monthly quotas."}
                        </p>
                      </div>
                      {!isPro && (
                        <div className="flex flex-col gap-2 w-full md:w-auto mt-4 md:mt-0">
                          <div className="flex items-center space-x-2">
                            <Input
                              placeholder="Have a promo code?"
                              value={promoCode}
                              onChange={(e) => setPromoCode(e.target.value)}
                              className="w-[200px]"
                            />
                            <Button
                              onClick={handlePromoUpgrade}
                              disabled={isProcessingPromo || !promoCode.trim()}
                              className="shrink-0 gap-2 shadow-md bg-gradient-to-r from-primary to-primary/80"
                            >
                              {isProcessingPromo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                              Upgrade
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground self-end">Paystack integration disabled</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Monthly Usage Metrics
                  </CardTitle>
                  <CardDescription>Your feature consumption for the current billing period</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {[
                    { key: 'ai_explanations', label: 'AI Tax Explanations', icon: Zap, color: 'text-amber-500' },
                    { key: 'ocr_receipts', label: 'Receipt OCR Scans', icon: FileText, color: 'text-blue-500' },
                    { key: 'api_requests', label: 'API Interactions', icon: Server, color: 'text-purple-500' },
                  ].map((m) => {
                    const metricData = metrics[m.key as MetricName];
                    if (!metricData) return <div key={m.key} className="h-12 flex items-center"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>;

                    const usage = metricData.limit - metricData.remaining;
                    const percent = metricData.limit > 0 ? (usage / metricData.limit) * 100 : 0;

                    return (
                      <div key={m.key} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 font-medium">
                            <m.icon className={`h-4 w-4 ${m.color}`} />
                            {m.label}
                          </div>
                          <span className="text-muted-foreground font-mono">
                            {usage} / {metricData.limit} {metricData.limit === 999999 ? '(Unlimited)' : ''}
                          </span>
                        </div>
                        <Progress value={Math.min(100, percent)} className="h-2" />
                        {percent >= 90 && !isPro && (
                          <p className="text-xs text-destructive flex gap-1 items-center mt-1">
                            <AlertCircle className="h-3 w-3" /> Nearing limit. Upgrade to Pro for more capacity.
                          </p>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </TabsContent>

          </Tabs>
        </div>
      </main>
      <Footer />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Data Subject Access Request (DSAR)</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 pt-2">
              <p>
                <strong>This action is irreversible.</strong> It will permanently anonymise your personal profile data.
              </p>
              <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950/50 dark:border-amber-900 border text-amber-800 dark:text-amber-200 py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="text-sm font-medium">Statutory Legal Hold</AlertTitle>
                <AlertDescription className="text-xs opacity-90">
                  To comply with the Federal Inland Revenue Service (FIRS) Establishment Act, any processed financial ledgers, tax filings, or receipts <strong>will not be deleted</strong>, but instead enter a secure, anonymised archive for a mandatory period of 6 years.
                </AlertDescription>
              </Alert>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="gap-2"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Understand & Delete"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function Settings() {
  return (
    <AuthGuard>
      <SettingsContent />
    </AuthGuard>
  );
}
