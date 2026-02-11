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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { validateTINOptional } from "@/lib/validators";
import { ConsentVersionLink } from "@/components/ConsentVersionLink";

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

          <div className="space-y-6">
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
                          className={`flex items-start space-x-3 p-4 rounded-lg border cursor-pointer transition-all ${
                            taxIdentity === option.value
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

            {/* Notifications Section */}
            <NotificationsCard
              emailNotifications={emailNotifications}
              setEmailNotifications={setEmailNotifications}
              deadlineReminders={deadlineReminders}
              setDeadlineReminders={setDeadlineReminders}
              complianceAlerts={complianceAlerts}
              setComplianceAlerts={setComplianceAlerts}
            />

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
                      Permanently delete your account and all data
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
          </div>
        </div>
      </main>
      <Footer />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your account
              and remove all your data from our servers. Please contact support to
              proceed with account deletion.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                toast({
                  title: "Contact Support",
                  description: "Please email support@buoyance.ng to request account deletion.",
                });
                setShowDeleteDialog(false);
              }}
            >
              Contact Support
            </AlertDialogAction>
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
