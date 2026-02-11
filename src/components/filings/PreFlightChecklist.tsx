/**
 * Pre-Flight Checklist Component
 * Validates filing readiness before generating Filing Pack.
 * Includes T-Match validation for WHT beneficiaries.
 */

import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Info,
} from "lucide-react";
import type { Filing } from "@/lib/filingService";

interface CheckItem {
  id: string;
  label: string;
  description: string;
  severity: "blocking" | "warning" | "info";
  passed: boolean;
}

interface PreFlightChecklistProps {
  filing: Filing;
  hasConsent: boolean;
}

export function PreFlightChecklist({ filing, hasConsent }: PreFlightChecklistProps) {
  const checks = useMemo<CheckItem[]>(() => {
    const items: CheckItem[] = [];
    const input = filing.input_json;
    const output = filing.output_json;

    // 1. Consent present (blocking)
    items.push({
      id: "consent",
      label: "User consent recorded",
      description: hasConsent
        ? "Your consent to use the platform is on file."
        : "You must accept the terms and consent before filing.",
      severity: "blocking",
      passed: hasConsent,
    });

    // 2. Period validity (blocking if beyond current month)
    // We allow filing for current month - only block future months
    const periodEnd = new Date(filing.period_end);
    const now = new Date();
    
    // Compare year and month only - allow current month filings
    const periodYear = periodEnd.getFullYear();
    const periodMonth = periodEnd.getMonth();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    const isFuturePeriod = periodYear > currentYear || 
      (periodYear === currentYear && periodMonth > currentMonth);
    
    items.push({
      id: "period",
      label: "Filing period is valid",
      description: isFuturePeriod
        ? "Cannot file for a future period. The period end month must not be beyond the current month."
        : "Filing period is valid for submission.",
      severity: "blocking",
      passed: !isFuturePeriod,
    });

    // 3. Rule version attached (warning if missing)
    const hasRuleVersion = Boolean(filing.rule_version && filing.rule_version !== "N/A" && filing.rule_version !== "");
    items.push({
      id: "rule_version",
      label: "Tax rule version attached",
      description: hasRuleVersion
        ? `Using rule version: ${filing.rule_version}`
        : "No rule version recorded. The filing may use outdated rates.",
      severity: "warning",
      passed: hasRuleVersion,
    });

    // 4. VAT: State of Consumption (warning if unknown/missing)
    if (filing.tax_type === "VAT") {
      const stateOfConsumption = input.stateOfConsumption as string | undefined;
      const hasState = Boolean(stateOfConsumption && stateOfConsumption !== "UNKNOWN");
      items.push({
        id: "vat_state",
        label: "State of Consumption specified",
        description: hasState
          ? `State: ${stateOfConsumption}`
          : "State of Consumption is missing or unknown. FIRS requires this for VAT filings.",
        severity: "warning",
        passed: hasState,
      });
    }

    // 5. TIN present for relevant filing types
    if (["CIT", "WHT"].includes(filing.tax_type)) {
      const tin = input.tin as string | undefined;
      const hasTin = Boolean(tin && tin.trim().length > 0);
      items.push({
        id: "tin",
        label: "TIN (Tax Identification Number) present",
        description: hasTin
          ? `TIN: ${tin}`
          : "TIN is required for this filing type. Add it before portal submission.",
        severity: filing.tax_type === "WHT" ? "blocking" : "warning",
        passed: hasTin,
      });
    }

    // 6. WHT T-Match Validation (BLOCKING)
    if (filing.tax_type === "WHT") {
      const beneficiaries = input.beneficiaries as Array<{ tin_status?: string }> | undefined;
      let hasNoMatch = false;
      
      if (Array.isArray(beneficiaries)) {
        hasNoMatch = beneficiaries.some((b) => b.tin_status === "NoMatch");
      }

      items.push({
        id: "wht_tmatch",
        label: "WHT beneficiaries T-Match validated",
        description: hasNoMatch
          ? "TIN not T-Matched — TaxPro Max will reject this schedule. Verify all beneficiary TINs."
          : Array.isArray(beneficiaries) && beneficiaries.length > 0
            ? `${beneficiaries.length} beneficiaries validated.`
            : "No beneficiary schedule attached (single payee filing).",
        severity: "blocking",
        passed: !hasNoMatch,
      });
    }

    // 7. Output computed (info)
    const hasOutput = Object.keys(output).length > 0;
    items.push({
      id: "output",
      label: "Tax calculation complete",
      description: hasOutput
        ? "Tax amounts have been calculated."
        : "Run the calculation before generating the Filing Pack.",
      severity: "info",
      passed: hasOutput,
    });

    return items;
  }, [filing, hasConsent]);

  const blockingErrors = checks.filter((c) => c.severity === "blocking" && !c.passed);
  const warnings = checks.filter((c) => c.severity === "warning" && !c.passed);
  const passed = checks.filter((c) => c.passed);

  const hasBlockingErrors = blockingErrors.length > 0;

  const getSeverityIcon = (severity: CheckItem["severity"], passed: boolean) => {
    if (passed) {
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    }
    switch (severity) {
      case "blocking":
        return <XCircle className="h-5 w-5 text-red-600" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-amber-600" />;
      case "info":
        return <Info className="h-5 w-5 text-blue-600" />;
    }
  };

  const getSeverityBadge = (severity: CheckItem["severity"]) => {
    switch (severity) {
      case "blocking":
        return (
          <Badge variant="outline" className="bg-red-600/10 text-red-600 border-red-600/20">
            Blocking
          </Badge>
        );
      case "warning":
        return (
          <Badge variant="outline" className="bg-amber-600/10 text-amber-600 border-amber-600/20">
            Warning
          </Badge>
        );
      case "info":
        return (
          <Badge variant="outline" className="bg-blue-600/10 text-blue-600 border-blue-600/20">
            Info
          </Badge>
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Pre-Flight Checklist
            </CardTitle>
            <CardDescription>
              {hasBlockingErrors
                ? "Resolve blocking issues before generating the Filing Pack"
                : warnings.length > 0
                  ? "Review warnings before proceeding"
                  : "All checks passed!"}
            </CardDescription>
          </div>
          <Badge
            variant="outline"
            className={
              hasBlockingErrors
                ? "bg-red-600/10 text-red-600 border-red-600/20"
                : warnings.length > 0
                  ? "bg-amber-600/10 text-amber-600 border-amber-600/20"
                  : "bg-green-600/10 text-green-600 border-green-600/20"
            }
          >
            {passed.length}/{checks.length} passed
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {checks.map((check) => (
            <div
              key={check.id}
              className={`flex items-start gap-3 p-3 rounded-lg border ${
                check.passed
                  ? "bg-green-600/5 border-green-600/10"
                  : check.severity === "blocking"
                    ? "bg-red-600/5 border-red-600/10"
                    : check.severity === "warning"
                      ? "bg-amber-600/5 border-amber-600/10"
                      : "bg-blue-600/5 border-blue-600/10"
              }`}
            >
              {getSeverityIcon(check.severity, check.passed)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-sm">{check.label}</p>
                  {!check.passed && getSeverityBadge(check.severity)}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {check.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {hasBlockingErrors && (
          <div className="mt-6 p-4 bg-red-600/10 border border-red-600/20 rounded-lg">
            <p className="text-sm font-medium text-red-600">
              ⛔ Filing Pack generation is blocked until all blocking issues are resolved.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Check if the filing has any blocking errors.
 */
export function hasBlockingErrors(filing: Filing, hasConsent: boolean): boolean {
  const input = filing.input_json;
  
  // Consent check
  if (!hasConsent) return true;

  // Future period check - allow current month filings
  const periodEnd = new Date(filing.period_end);
  const now = new Date();
  const periodYear = periodEnd.getFullYear();
  const periodMonth = periodEnd.getMonth();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  
  const isFuturePeriod = periodYear > currentYear || 
    (periodYear === currentYear && periodMonth > currentMonth);
  if (isFuturePeriod) return true;

  // WHT T-Match check
  if (filing.tax_type === "WHT") {
    const beneficiaries = input.beneficiaries as Array<{ tin_status?: string }> | undefined;
    if (Array.isArray(beneficiaries)) {
      if (beneficiaries.some((b) => b.tin_status === "NoMatch")) return true;
    }
    // TIN required for WHT
    const tin = input.tin as string | undefined;
    if (!tin || tin.trim().length === 0) return true;
  }

  return false;
}
