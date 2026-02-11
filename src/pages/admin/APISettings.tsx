import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useRBAC } from "@/hooks/useRBAC";
import { useAdminIntegrationStatus, invalidateIntegrationCache } from "@/hooks/useIntegrationStatus";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Loader2,
  ArrowLeft,
  CreditCard,
  Mail,
  Landmark,
  CheckCircle2,
  XCircle,
  Copy,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  Info,
  Settings,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProviderInfo {
  id: string;
  name: string;
  docsUrl: string;
}

const PAYMENT_PROVIDERS: ProviderInfo[] = [
  { id: "paystack", name: "Paystack", docsUrl: "https://paystack.com/docs" },
  { id: "flutterwave", name: "Flutterwave", docsUrl: "https://developer.flutterwave.com" },
  { id: "stripe", name: "Stripe", docsUrl: "https://stripe.com/docs" },
];

const EMAIL_PROVIDERS: ProviderInfo[] = [
  { id: "resend", name: "Resend", docsUrl: "https://resend.com/docs" },
  { id: "sendgrid", name: "SendGrid", docsUrl: "https://docs.sendgrid.com" },
  { id: "mailgun", name: "Mailgun", docsUrl: "https://documentation.mailgun.com" },
];

const BANKING_PROVIDERS: ProviderInfo[] = [
  { id: "mono", name: "Mono", docsUrl: "https://docs.mono.co" },
  { id: "okra", name: "Okra", docsUrl: "https://docs.okra.ng" },
  { id: "plaid", name: "Plaid", docsUrl: "https://plaid.com/docs" },
];

interface IntegrationCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  configured: boolean;
  activeProvider: string | null;
  providers: ProviderInfo[];
  envVars: { name: string; description: string }[];
  loading: boolean;
}

function IntegrationCard({
  title,
  description,
  icon,
  configured,
  activeProvider,
  providers,
  envVars,
  loading,
}: IntegrationCardProps) {
  const { toast } = useToast();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `"${text}" copied to clipboard`,
    });
  };

  return (
    <Card className={configured ? "border-success/50" : "border-muted"}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${configured ? "bg-success/10" : "bg-muted"}`}>
              {icon}
            </div>
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : configured ? (
            <Badge variant="default" className="bg-success text-success-foreground">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Active
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">
              <XCircle className="h-3 w-3 mr-1" />
              Not Configured
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {configured && activeProvider && (
          <div className="p-3 bg-success/5 border border-success/20 rounded-lg">
            <p className="text-sm font-medium text-success">
              Provider: <span className="capitalize">{activeProvider}</span>
            </p>
          </div>
        )}

        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="providers" className="border-b-0">
            <AccordionTrigger className="text-sm py-2">
              Supported Providers
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                {providers.map((provider) => (
                  <div
                    key={provider.id}
                    className="flex items-center justify-between p-2 bg-muted/50 rounded"
                  >
                    <span className="text-sm font-medium">{provider.name}</span>
                    <a
                      href={provider.docsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      Docs <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="env-vars" className="border-b-0">
            <AccordionTrigger className="text-sm py-2">
              Required Secrets (Edge Functions)
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                {envVars.map((envVar) => (
                  <div
                    key={envVar.name}
                    className="flex items-center justify-between p-2 bg-muted/50 rounded"
                  >
                    <div>
                      <code className="text-xs font-mono bg-background px-1.5 py-0.5 rounded">
                        {envVar.name}
                      </code>
                      <p className="text-xs text-muted-foreground mt-1">
                        {envVar.description}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(envVar.name)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}

export default function APISettings() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: rbacLoading } = useRBAC();
  const { payment, email, banking, loading: statusLoading, error, refetch } = useAdminIntegrationStatus();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !rbacLoading) {
      if (!user) {
        navigate("/signin");
      } else if (!isAdmin) {
        toast({
          title: "Access Denied",
          description: "You need admin privileges to access this page.",
          variant: "destructive",
        });
        navigate("/dashboard");
      }
    }
  }, [user, isAdmin, authLoading, rbacLoading, navigate, toast]);

  const handleRefresh = () => {
    invalidateIntegrationCache();
    refetch();
    toast({
      title: "Refreshing...",
      description: "Fetching latest integration status",
    });
  };

  if (authLoading || rbacLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-grow pt-20 md:pt-28 pb-16">
        <div className="container mx-auto px-4 md:px-6 max-w-4xl">
          <div className="mb-6">
            <Link
              to="/dashboard"
              className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                  <Settings className="h-8 w-8" />
                  API Settings
                </h1>
                <p className="text-muted-foreground mt-1">
                  Configure external service integrations
                </p>
              </div>
              <Button variant="outline" onClick={handleRefresh} disabled={statusLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${statusLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>

          {error && (
            <Card className="mb-6 border-destructive/50 bg-destructive/5">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                  <div>
                    <p className="font-medium text-destructive">Status Unavailable</p>
                    <p className="text-sm text-muted-foreground">{error}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-6">
            {/* Payment Integration */}
            <IntegrationCard
              title="Payment Gateway"
              description="Process online payments for tax filings"
              icon={<CreditCard className={`h-5 w-5 ${payment.configured ? "text-success" : "text-muted-foreground"}`} />}
              configured={payment.configured}
              activeProvider={payment.provider || null}
              providers={PAYMENT_PROVIDERS}
              envVars={[
                { name: "PAYMENT_PROVIDER", description: "paystack, flutterwave, or stripe" },
                { name: "PAYMENT_SECRET_KEY", description: "Your provider's secret/API key" },
              ]}
              loading={statusLoading}
            />

            {/* Email Integration */}
            <IntegrationCard
              title="Email Service"
              description="Send notification emails and alerts"
              icon={<Mail className={`h-5 w-5 ${email.configured ? "text-success" : "text-muted-foreground"}`} />}
              configured={email.configured}
              activeProvider={email.provider || null}
              providers={EMAIL_PROVIDERS}
              envVars={[
                { name: "EMAIL_PROVIDER", description: "resend, sendgrid, or mailgun" },
                { name: "EMAIL_API_KEY", description: "Your provider's API key" },
                { name: "EMAIL_FROM", description: "Sender email address (e.g., noreply@buoyance.ng)" },
              ]}
              loading={statusLoading}
            />

            {/* Banking Integration */}
            <IntegrationCard
              title="Banking Integration"
              description="Connect bank accounts and sync transactions"
              icon={<Landmark className={`h-5 w-5 ${banking.configured ? "text-success" : "text-muted-foreground"}`} />}
              configured={banking.configured}
              activeProvider={banking.provider || null}
              providers={BANKING_PROVIDERS}
              envVars={[
                { name: "BANKING_PROVIDER", description: "mono, okra, or plaid" },
                { name: "BANKING_SECRET_KEY", description: "Your provider's secret key" },
              ]}
              loading={statusLoading}
            />

            <Separator className="my-8" />

            {/* Setup Instructions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  Setup Instructions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <h4 className="font-medium">1. Add Secrets in Supabase</h4>
                  <p className="text-sm text-muted-foreground">
                    Go to your Supabase project → Settings → Edge Functions → Secrets.
                    Add the required secrets for each integration you want to enable.
                  </p>
                  <a
                    href="https://supabase.com/dashboard/project/bajwsjrqrsglsndgtfpp/settings/functions"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm text-primary hover:underline"
                  >
                    Open Supabase Edge Functions Secrets
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="font-medium">2. Verify Configuration</h4>
                  <p className="text-sm text-muted-foreground">
                    After adding secrets, click the "Refresh" button above to verify
                    the integration status. Active integrations will show a green badge.
                  </p>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="font-medium">3. Test the Integration</h4>
                  <p className="text-sm text-muted-foreground">
                    Once configured, test each integration by performing a relevant action
                    (e.g., initiate a payment, send a test email, connect a bank account).
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* FAQ */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Frequently Asked Questions</CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="q1">
                    <AccordionTrigger className="text-sm">
                      Why are my secrets not being detected?
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground">
                      Ensure you've added secrets with the exact names shown above.
                      Secret names are case-sensitive. After adding secrets, wait a few
                      seconds and click "Refresh" to check the status.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="q2">
                    <AccordionTrigger className="text-sm">
                      Can I use multiple payment providers?
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground">
                      Currently, only one provider per integration type is supported.
                      Set the PAYMENT_PROVIDER secret to your preferred provider.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="q3">
                    <AccordionTrigger className="text-sm">
                      How do I switch providers?
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground">
                      Update the provider secret (e.g., PAYMENT_PROVIDER) to the new
                      provider name and update the corresponding API key secret.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="q4">
                    <AccordionTrigger className="text-sm">
                      Are my API keys secure?
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground">
                      Yes. API keys are stored securely in Supabase Edge Function secrets
                      and are never exposed to the frontend. Only the configuration status
                      (configured/not configured) and provider names are returned to the UI.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
