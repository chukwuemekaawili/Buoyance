/**
 * Admin System Settings Page
 * 
 * Manage global app settings including Free Mode toggle and security checklist.
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useRBAC } from "@/hooks/useRBAC";
import { useAppSettings } from "@/hooks/useAppSettings";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Settings,
  Shield,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
  Sparkles,
  Lock,
  Eye,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SecurityCheckItem {
  id: string;
  label: string;
  description: string;
  status: "pass" | "warning" | "action_required";
  actionUrl?: string;
  actionLabel?: string;
}

export default function SystemSettings() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: rbacLoading } = useRBAC();
  const { 
    loading: settingsLoading, 
    isFreeModeEnabled, 
    updateFreeModeEnabled,
    error: settingsError 
  } = useAppSettings();
  const { toast } = useToast();
  const [togglingFreeMode, setTogglingFreeMode] = useState(false);

  // Security checklist items
  const securityChecklist: SecurityCheckItem[] = [
    {
      id: "rls",
      label: "Row Level Security (RLS)",
      description: "RLS is enabled on all user data tables to prevent unauthorized access.",
      status: "pass",
    },
    {
      id: "leaked_password",
      label: "Leaked Password Protection",
      description: "Enable this in Supabase Auth settings to prevent use of compromised passwords.",
      status: "action_required",
      actionUrl: "https://supabase.com/dashboard/project/bajwsjrqrsglsndgtfpp/auth/providers",
      actionLabel: "Open Supabase Auth Settings",
    },
    {
      id: "rbac",
      label: "Role-Based Access Control",
      description: "RBAC is implemented with admin, auditor, and user roles.",
      status: "pass",
    },
    {
      id: "audit_logs",
      label: "Audit Logging",
      description: "All sensitive actions are logged with actor, timestamp, and changes.",
      status: "pass",
    },
    {
      id: "consent",
      label: "User Consent Management",
      description: "POPIA/GDPR consent is required before data processing.",
      status: "pass",
    },
    {
      id: "storage",
      label: "Private Storage Buckets",
      description: "Filing documents and payment receipts are stored in private buckets with signed URLs.",
      status: "pass",
    },
  ];

  const handleToggleFreeMode = async (enabled: boolean) => {
    setTogglingFreeMode(true);
    try {
      const success = await updateFreeModeEnabled(enabled);
      if (success) {
        toast({
          title: enabled ? "Free Mode Enabled" : "Free Mode Disabled",
          description: enabled 
            ? "All users can now access features without payment." 
            : "Standard payment flows are now active.",
        });
      } else {
        toast({
          title: "Failed to update",
          description: settingsError || "Could not update Free Mode setting.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setTogglingFreeMode(false);
    }
  };

  const passCount = securityChecklist.filter((c) => c.status === "pass").length;
  const actionCount = securityChecklist.filter((c) => c.status === "action_required").length;

  // Show loading while checking auth or RBAC
  if (authLoading || rbacLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-grow pt-20 md:pt-28 pb-16 flex items-center justify-center">
          <Card className="max-w-md">
            <CardContent className="pt-6 text-center">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Admin Access Required</h2>
              <p className="text-muted-foreground">
                You need admin permissions to access system settings.
              </p>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-grow pt-20 md:pt-28 pb-16">
        <div className="container mx-auto px-4 md:px-6 max-w-3xl">
          <Link
            to="/dashboard"
            className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>

          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Settings className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">System Settings</h1>
              <p className="text-muted-foreground">
                Manage global app configuration and security
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Free Mode Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Sparkles className="h-5 w-5 text-amber-500" />
                    <div>
                      <CardTitle className="text-lg">Free Public Beta Mode</CardTitle>
                      <CardDescription>
                        When enabled, all features are free without payment requirements
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant={isFreeModeEnabled ? "default" : "secondary"}>
                    {isFreeModeEnabled ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {settingsLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading settings...
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
                    <div>
                      <Label htmlFor="freeMode" className="font-medium">
                        Enable Free Mode
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {isFreeModeEnabled
                          ? "All users can access features without payment"
                          : "Users must complete payment flows"}
                      </p>
                    </div>
                    <Switch
                      id="freeMode"
                      checked={isFreeModeEnabled}
                      onCheckedChange={handleToggleFreeMode}
                      disabled={togglingFreeMode}
                    />
                  </div>
                )}

                {isFreeModeEnabled && (
                  <div className="mt-4 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20 text-sm">
                    <p className="font-medium text-amber-700 dark:text-amber-400">
                      Beta Mode Active
                    </p>
                    <p className="text-muted-foreground mt-1">
                      Payments are bypassed with zero-amount records marked as "free_beta". 
                      Disable this before production launch.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Security Checklist Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle className="text-lg">Security Checklist</CardTitle>
                      <CardDescription>
                        Review security configurations for your app
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-green-600/10 text-green-600 border-green-600/20">
                      {passCount} Pass
                    </Badge>
                    {actionCount > 0 && (
                      <Badge variant="outline" className="bg-amber-600/10 text-amber-600 border-amber-600/20">
                        {actionCount} Action Required
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {securityChecklist.map((item) => (
                    <div
                      key={item.id}
                      className={`p-4 rounded-lg border ${
                        item.status === "pass"
                          ? "bg-green-600/5 border-green-600/20"
                          : item.status === "action_required"
                          ? "bg-amber-600/5 border-amber-600/20"
                          : "bg-muted/50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          {item.status === "pass" ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                          )}
                          <div>
                            <p className="font-medium">{item.label}</p>
                            <p className="text-sm text-muted-foreground">
                              {item.description}
                            </p>
                          </div>
                        </div>
                        {item.actionUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            className="shrink-0"
                          >
                            <a
                              href={item.actionUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {item.actionLabel || "Configure"}
                              <ExternalLink className="h-3 w-3 ml-1" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Links */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Admin Quick Links
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <Button variant="outline" asChild>
                    <Link to="/admin/users">
                      <Lock className="h-4 w-4 mr-2" />
                      Users
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to="/admin/tax-rules">
                      <Settings className="h-4 w-4 mr-2" />
                      Tax Rules
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to="/admin/classification-rules">
                      <Sparkles className="h-4 w-4 mr-2" />
                      AI Classification
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to="/admin/classification-test">
                      <Sparkles className="h-4 w-4 mr-2" />
                      Test Classification
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to="/admin/audit-logs">
                      <Eye className="h-4 w-4 mr-2" />
                      Audit Logs
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to="/admin/api-settings">
                      <Shield className="h-4 w-4 mr-2" />
                      API Settings
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to="/admin/payment-verification">
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Payments
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}