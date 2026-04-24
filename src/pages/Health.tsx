import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

type HealthStatus = "idle" | "loading" | "pass" | "warn" | "fail";

interface HealthCheck {
  label: string;
  status: HealthStatus;
  summary: string;
  details?: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

function statusVariant(status: HealthStatus): "default" | "secondary" | "destructive" | "outline" {
  if (status === "pass") return "default";
  if (status === "fail") return "destructive";
  return "secondary";
}

function statusLabel(status: HealthStatus) {
  if (status === "pass") return "Pass";
  if (status === "warn") return "Needs attention";
  if (status === "fail") return "Fail";
  if (status === "loading") return "Checking";
  return "Idle";
}

function StatusIcon({ status }: { status: HealthStatus }) {
  if (status === "pass") {
    return <CheckCircle2 className="h-5 w-5 text-green-600" />;
  }

  if (status === "fail" || status === "warn") {
    return <AlertCircle className="h-5 w-5 text-amber-600" />;
  }

  return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
}

export default function Health() {
  const { session, user, loading: authLoading } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(true);
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);
  const [checks, setChecks] = useState<HealthCheck[]>([
    {
      label: "Frontend build configuration",
      status: "loading",
      summary: "Checking whether the frontend has the required Supabase environment variables.",
    },
    {
      label: "Supabase auth reachability",
      status: "loading",
      summary: "Checking whether the public auth endpoint is reachable.",
    },
    {
      label: "Browser session",
      status: "loading",
      summary: "Checking whether this browser currently has an active user session.",
    },
    {
      label: "Authenticated integration probe",
      status: "loading",
      summary: "Checking whether an authenticated request can reach the integration-health function.",
    },
  ]);

  const runChecks = useCallback(async () => {
    setIsRefreshing(true);

    const nextChecks: HealthCheck[] = [];

    if (SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY) {
      nextChecks.push({
        label: "Frontend build configuration",
        status: "pass",
        summary: "Supabase URL and publishable key are present in the frontend build.",
        details: SUPABASE_URL,
      });
    } else {
      nextChecks.push({
        label: "Frontend build configuration",
        status: "fail",
        summary: "One or more required Supabase frontend environment variables are missing.",
        details: "Expected VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.",
      });
    }

    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
      nextChecks.push(
        {
          label: "Supabase auth reachability",
          status: "fail",
          summary: "Skipped because the frontend build configuration is incomplete.",
        },
        {
          label: "Browser session",
          status: authLoading ? "loading" : "warn",
          summary: authLoading ? "Auth state is still loading." : "Cannot validate the current session without valid frontend configuration.",
        },
        {
          label: "Authenticated integration probe",
          status: "fail",
          summary: "Skipped because the frontend build configuration is incomplete.",
        },
      );

      setChecks(nextChecks);
      setLastCheckedAt(new Date().toLocaleString());
      setIsRefreshing(false);
      return;
    }

    try {
      const response = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
        headers: {
          apikey: SUPABASE_PUBLISHABLE_KEY,
        },
      });

      nextChecks.push({
        label: "Supabase auth reachability",
        status: response.ok ? "pass" : "fail",
        summary: response.ok
          ? "Supabase auth endpoint is reachable from the browser."
          : "Supabase auth endpoint responded, but not successfully.",
        details: `HTTP ${response.status}`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      nextChecks.push({
        label: "Supabase auth reachability",
        status: "fail",
        summary: "Supabase auth endpoint is not reachable from the browser.",
        details: message,
      });
    }

    if (authLoading) {
      nextChecks.push({
        label: "Browser session",
        status: "loading",
        summary: "Auth state is still loading.",
      });
    } else if (session?.access_token && user) {
      nextChecks.push({
        label: "Browser session",
        status: "pass",
        summary: "This browser has an active authenticated session.",
        details: user.email ?? user.id,
      });
    } else {
      nextChecks.push({
        label: "Browser session",
        status: "warn",
        summary: "No active authenticated session is present in this browser.",
        details: "Sign in first if you want to test authenticated flows.",
      });
    }

    if (session?.access_token && user) {
      try {
        const { data, error } = await supabase.functions.invoke("integration-health", {
          body: {},
        });

        if (error) {
          nextChecks.push({
            label: "Authenticated integration probe",
            status: "fail",
            summary: "Authenticated integration probe failed.",
            details: error.message,
          });
        } else {
          const payment = data?.payment?.configured ? "payment:configured" : "payment:pending";
          const banking = data?.banking?.configured ? "banking:configured" : "banking:pending";
          const email = data?.email?.configured ? "email:configured" : "email:pending";

          nextChecks.push({
            label: "Authenticated integration probe",
            status: "pass",
            summary: "Authenticated integration probe succeeded.",
            details: [payment, banking, email].join(" | "),
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        nextChecks.push({
          label: "Authenticated integration probe",
          status: "fail",
          summary: "Authenticated integration probe failed.",
          details: message,
        });
      }
    } else {
      nextChecks.push({
        label: "Authenticated integration probe",
        status: "warn",
        summary: "Skipped because there is no active authenticated session.",
        details: "Sign in to verify the protected Supabase function path.",
      });
    }

    setChecks(nextChecks);
    setLastCheckedAt(new Date().toLocaleString());
    setIsRefreshing(false);
  }, [authLoading, session?.access_token, user]);

  useEffect(() => {
    void runChecks();
  }, [runChecks]);

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <Badge variant="outline">System Health</Badge>
            <h1 className="text-3xl font-semibold tracking-tight">Deployment Health</h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Use this page to confirm the frontend build config, Supabase reachability,
              browser session state, and the authenticated integration probe before or after a deploy.
            </p>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" asChild>
              <Link to="/signin">Sign in</Link>
            </Button>
            <Button onClick={() => void runChecks()} disabled={isRefreshing}>
              {isRefreshing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Re-run checks
                </>
              )}
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Current Summary</CardTitle>
            <CardDescription>
              {lastCheckedAt ? `Last checked: ${lastCheckedAt}` : "Checks have not run yet."}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {checks.map((check) => (
              <div
                key={check.label}
                className="rounded-lg border bg-card p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h2 className="text-sm font-semibold">{check.label}</h2>
                    <p className="text-sm text-muted-foreground">{check.summary}</p>
                  </div>
                  <StatusIcon status={check.status} />
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <Badge variant={statusVariant(check.status)}>{statusLabel(check.status)}</Badge>
                  {check.details ? (
                    <span className="text-xs text-muted-foreground">{check.details}</span>
                  ) : null}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
