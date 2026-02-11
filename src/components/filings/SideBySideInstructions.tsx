/**
 * Submission Steps (formerly Side-by-Side Instructions)
 * Action-driven linear guide for completing the filing process.
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ExternalLink,
  Copy,
  Check,
  Download,
  AlertTriangle,
  CheckCircle2,
  CreditCard,
} from "lucide-react";
import { format } from "date-fns";
import { formatKoboToNgn, stringToKobo } from "@/lib/money";
import type { Filing } from "@/lib/filingService";

interface SideBySideInstructionsProps {
  filing: Filing;
}

interface CopyableField {
  label: string;
  value: string;
  format?: "currency" | "date" | "text";
}

export function SideBySideInstructions({ filing }: SideBySideInstructionsProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(label);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const input = filing.input_json;
  const output = filing.output_json;
  const isDraft = filing.status === "draft";

  // Get fields based on tax type
  const getFields = (): CopyableField[] => {
    const fields: CopyableField[] = [
      {
        label: "Period Start",
        value: format(new Date(filing.period_start), "dd/MM/yyyy"),
        format: "date",
      },
      {
        label: "Period End",
        value: format(new Date(filing.period_end), "dd/MM/yyyy"),
        format: "date",
      },
    ];

    switch (filing.tax_type) {
      case "CIT": {
        const taxableProfit = stringToKobo(input.taxableProfitKobo as string || input.revenueKobo as string || "0");
        const citPayable = stringToKobo(output.taxPayableKobo as string || "0");
        const devLevy = (taxableProfit * 4n) / 100n;
        const total = citPayable + devLevy;

        fields.push(
          { label: "Assessable Profit", value: formatKoboToNgn(taxableProfit), format: "currency" },
          { label: "Company Size", value: String(input.companySize || "medium").toUpperCase(), format: "text" },
          { label: "CIT Liability", value: formatKoboToNgn(citPayable), format: "currency" },
          { label: "Development Levy (4%)", value: formatKoboToNgn(devLevy), format: "currency" },
          { label: "Total Due", value: formatKoboToNgn(total), format: "currency" }
        );
        break;
      }
      case "VAT": {
        const outputVat = stringToKobo(input.outputVatKobo as string || input.taxableSalesKobo as string || "0");
        const inputVat = stringToKobo(input.inputVatKobo as string || "0");
        const vatPayable = stringToKobo(output.vatPayableKobo as string || "0");

        fields.push(
          { label: "Output VAT", value: formatKoboToNgn(outputVat), format: "currency" },
          { label: "Input VAT (Credit)", value: formatKoboToNgn(inputVat), format: "currency" },
          { label: "VAT Rate", value: "7.5%", format: "text" },
          { label: "Net VAT Payable", value: formatKoboToNgn(vatPayable), format: "currency" }
        );
        break;
      }
      case "WHT": {
        const paymentAmount = stringToKobo(input.paymentAmountKobo as string || "0");
        const whtPayable = stringToKobo(output.whtPayableKobo as string || "0");
        const whtRate = (input.whtRate as number) || 10;

        fields.push(
          { label: "Gross Payment", value: formatKoboToNgn(paymentAmount), format: "currency" },
          { label: "WHT Rate", value: `${whtRate}%`, format: "text" },
          { label: "WHT Deductible", value: formatKoboToNgn(whtPayable), format: "currency" }
        );
        break;
      }
      case "CGT": {
        const proceeds = stringToKobo(input.proceedsKobo as string || "0");
        const cost = stringToKobo(input.costKobo as string || "0");
        const capitalGain = stringToKobo(output.capitalGainKobo as string || "0");
        const cgtPayable = stringToKobo(output.cgtPayableKobo as string || "0");

        fields.push(
          { label: "Sale Proceeds", value: formatKoboToNgn(proceeds), format: "currency" },
          { label: "Cost of Acquisition", value: formatKoboToNgn(cost), format: "currency" },
          { label: "Capital Gain", value: formatKoboToNgn(capitalGain), format: "currency" },
          { label: "CGT Payable", value: formatKoboToNgn(cgtPayable), format: "currency" }
        );
        break;
      }
      case "PIT": {
        const income = stringToKobo(input.annualSalaryKobo as string || "0");
        const deductions = stringToKobo(input.deductionsKobo as string || "0");
        const whtCredits = stringToKobo(input.whtCreditsKobo as string || "0");
        const taxPayable = stringToKobo(output.totalTaxKobo as string || "0");

        fields.push(
          { label: "Gross Income", value: formatKoboToNgn(income), format: "currency" },
          { label: "Deductions", value: formatKoboToNgn(deductions), format: "currency" },
          { label: "WHT Credits", value: formatKoboToNgn(whtCredits), format: "currency" },
          { label: "Tax Payable", value: formatKoboToNgn(taxPayable), format: "currency" }
        );
        break;
      }
    }

    return fields;
  };

  const fields = getFields();

  // Get portal URL based on tax type
  const getPortalInfo = () => {
    if (filing.tax_type === "PIT") {
      return {
        name: "State IRS Portal",
        url: "https://lirs.gov.ng",
        description: "PIT is filed with your State IRS (e.g., LIRS for Lagos, KGIRS for Kaduna)"
      };
    }
    return {
      name: "FIRS TaxPro Max",
      url: "https://taxpromax.firs.gov.ng",
      description: "Federal taxes are filed on the FIRS TaxPro Max portal"
    };
  };

  const portal = getPortalInfo();

  return (
    <div className="space-y-6">
      {/* Step-by-Step Linear Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Submission Steps
          </CardTitle>
          <CardDescription>
            Complete these steps to file your {filing.tax_type} return
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Step 1: Download Schedule */}
          <div className="flex gap-4 p-4 rounded-lg border bg-muted/30">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
              1
            </div>
            <div className="flex-1">
              <h4 className="font-semibold">Download Schedule</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Download your filing pack with all calculated figures and supporting schedules.
              </p>
              {filing.document_url ? (
                <div className="flex flex-wrap gap-2 mt-3">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => window.open(filing.document_url || '', '_blank')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </Button>
                </div>
              ) : isDraft ? (
                <p className="text-xs text-amber-500 mt-2">
                  <AlertTriangle className="h-3 w-3 inline mr-1" />
                  Submit your filing first to generate documents
                </p>
              ) : (
                <p className="text-xs text-muted-foreground mt-2">
                  Documents will appear here after submission
                </p>
              )}
            </div>
          </div>

          {/* Step 2: Open Portal */}
          <div className="flex gap-4 p-4 rounded-lg border bg-muted/30">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
              2
            </div>
            <div className="flex-1">
              <h4 className="font-semibold">Open Portal</h4>
              <p className="text-sm text-muted-foreground mt-1">
                {portal.description}
              </p>
              <Button 
                size="sm" 
                className="mt-3"
                onClick={() => window.open(portal.url, "_blank")}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open {portal.name}
              </Button>
            </div>
          </div>

          {/* Step 3: Upload & Pay */}
          <div className="flex gap-4 p-4 rounded-lg border bg-muted/30">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
              3
            </div>
            <div className="flex-1">
              <h4 className="font-semibold">Upload & Pay</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Upload your schedule to the portal, verify the figures match, generate your Remita RRR, and complete payment.
              </p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                <li>• Log in with your FIRS/SIRS credentials</li>
                <li>• Navigate to the appropriate filing section</li>
                <li>• Upload the schedule document</li>
                <li>• Generate payment reference (RRR)</li>
                <li>• Pay via bank or Remita</li>
              </ul>
            </div>
          </div>

          {/* Step 4: Record Payment */}
          <div className="flex gap-4 p-4 rounded-lg border bg-primary/5 border-primary/20">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
              4
            </div>
            <div className="flex-1">
              <h4 className="font-semibold flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Record Tax Payment
              </h4>
              <p className="text-sm text-muted-foreground mt-1">
                Return to Buoyance and click "Record Tax Payment" in the Verify & Archive tab to log your payment and turn your status to PAID.
              </p>
              <p className="text-xs text-primary mt-2 font-medium">
                → Go to the "Verify & Archive" tab to record your payment
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Field Values Cheat Sheet */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Quick Reference (Copy Values)
          </CardTitle>
          <CardDescription>
            Click to copy values for pasting into the tax portal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {fields.map((field) => (
              <div
                key={field.label}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group cursor-pointer"
                onClick={() => handleCopy(field.label, field.value.replace(/[₦,]/g, ''))}
              >
                <div>
                  <p className="text-sm text-muted-foreground">{field.label}</p>
                  <p className={`font-medium ${field.format === "currency" ? "font-mono" : ""}`}>
                    {field.value}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {copiedField === field.label ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <Badge variant="outline" className="mt-0.5">Tip</Badge>
              <span>Save your acknowledgment reference after successful submission.</span>
            </li>
            <li className="flex items-start gap-2">
              <Badge variant="outline" className="mt-0.5">Tip</Badge>
              <span>Take a screenshot of the confirmation page for your records.</span>
            </li>
            <li className="flex items-start gap-2">
              <Badge variant="outline" className="mt-0.5">Tip</Badge>
              <span>Keep your Remita RRR handy when recording the payment here.</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
