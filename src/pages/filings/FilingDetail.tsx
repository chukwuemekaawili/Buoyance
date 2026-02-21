import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { scrollToId } from "@/components/ScrollToHash";
import { useAuth } from "@/hooks/useAuth";
import { useConsent } from "@/hooks/useConsent";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Loader2,
  ArrowLeft,
  FileText,
  Calendar,
  Download,
  Send,
  Plus,
  CreditCard,
  CheckCircle,
  Upload,
  FileSpreadsheet,
  ClipboardList,
  BookOpen,
  Archive,
  ExternalLink,
  Copy,
  CheckCheck,
  AlertTriangle,
  Rocket,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchFilingById,
  submitFiling,
  updateFilingDocument,
  uploadFilingPDF,
  archiveFiling,
  type Filing,
} from "@/lib/filingService";
import {
  fetchFilingPayments,
  createPayment,
  updatePaymentStatus,
  type Payment,
} from "@/lib/paymentService";
import { initiatePayment } from "@/lib/paymentGatewayService";
import { NotificationTriggers } from "@/lib/notificationService";
import { generateFilingPDF, downloadFilingPDF } from "@/lib/filingPdfExport";
import { downloadFilingXLS, supportsExcelExport } from "@/lib/excelExport";
import { formatKoboToNgn, stringToKobo, parseNgnToKobo, koboToString, addKobo } from "@/lib/money";
import { writeAuditLog, AuditActions } from "@/lib/auditLog";
import { PreFlightChecklist, hasBlockingErrors } from "@/components/filings/PreFlightChecklist";
import { SideBySideInstructions } from "@/components/filings/SideBySideInstructions";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-blue-600/10 text-blue-600 border-blue-600/20",
  accepted: "bg-green-600/10 text-green-600 border-green-600/20",
  rejected: "bg-red-600/10 text-red-600 border-red-600/20",
  cancelled: "bg-muted text-muted-foreground",
  pending: "bg-amber-600/10 text-amber-600 border-amber-600/20",
  paid: "bg-green-600/10 text-green-600 border-green-600/20",
  failed: "bg-red-600/10 text-red-600 border-red-600/20",
  verified: "bg-green-600/10 text-green-600 border-green-600/20",
};

// Track individual deduction entries with amounts and notes (matches NewFiling.tsx)
interface DeductionEntry {
  id: string;
  label: string;
  amount: number;
  note: string;
  kind: string;
}

function getTaxTypeLabel(taxType: string): string {
  switch (taxType) {
    case "CIT": return "Company Income Tax";
    case "VAT": return "Value Added Tax";
    case "WHT": return "Withholding Tax";
    case "CGT": return "Capital Gains Tax";
    case "PIT": return "Personal Income Tax";
    default: return taxType;
  }
}

function getDeductionEntries(filing: Filing): DeductionEntry[] {
  const input = filing.input_json;
  if (input.deductionEntries && Array.isArray(input.deductionEntries)) {
    return input.deductionEntries as DeductionEntry[];
  }
  return [];
}

function getFilingTaxKobo(filing: Filing): bigint {
  const output = filing.output_json;
  const taxKobo = output.taxPayableKobo || output.vatPayableKobo || output.whtPayableKobo || output.cgtPayableKobo || output.totalTaxKobo;
  if (taxKobo && typeof taxKobo === "string") return stringToKobo(taxKobo);
  return 0n;
}

function computeOutput(filing: Filing): Record<string, unknown> {
  const input = filing.input_json;
  switch (filing.tax_type) {
    case "PIT": {
      const incomeKobo = stringToKobo(input.annualSalaryKobo as string || "0");
      const taxKobo = (incomeKobo * 24n) / 100n;
      const netKobo = incomeKobo - taxKobo;
      return { totalTaxKobo: koboToString(taxKobo), netAnnualIncomeKobo: koboToString(netKobo), effectiveRate: incomeKobo > 0n ? Number((taxKobo * 10000n) / incomeKobo) / 100 : 0 };
    }
    case "CIT": {
      const profitKobo = stringToKobo(input.taxableProfitKobo as string || "0");
      const size = input.companySize as string || "medium";
      let rate = 30n;
      if (size === "small") rate = 0n;
      else if (size === "medium") rate = 20n;
      const taxKobo = (profitKobo * rate) / 100n;
      return { taxPayableKobo: koboToString(taxKobo), netProfitKobo: koboToString(profitKobo - taxKobo), effectiveRate: Number(rate) };
    }
    case "VAT": {
      const salesKobo = stringToKobo(input.taxableSalesKobo as string || "0");
      const vatKobo = (salesKobo * 75n) / 1000n;
      return { vatPayableKobo: koboToString(vatKobo), totalWithVatKobo: koboToString(salesKobo + vatKobo), effectiveRate: 7.5 };
    }
    case "WHT": {
      const amountKobo = stringToKobo(input.paymentAmountKobo as string || "0");
      const rate = BigInt(Math.round((input.whtRate as number || 10) * 100));
      const whtKobo = (amountKobo * rate) / 10000n;
      return { whtPayableKobo: koboToString(whtKobo), netPaymentKobo: koboToString(amountKobo - whtKobo), whtRate: Number(rate) / 100 };
    }
    case "CGT": {
      const proceedsKobo = stringToKobo(input.proceedsKobo as string || "0");
      const costKobo = stringToKobo(input.costKobo as string || "0");
      const gainKobo = proceedsKobo > costKobo ? proceedsKobo - costKobo : 0n;
      const cgtKobo = (gainKobo * 10n) / 100n;
      return { capitalGainKobo: koboToString(gainKobo), cgtPayableKobo: koboToString(cgtKobo), netProceedsKobo: koboToString(proceedsKobo - cgtKobo), effectiveRate: 10 };
    }
    default: return {};
  }
}

interface ExtendedPayment extends Payment {
  receipt_path?: string | null;
  receipt_file_name?: string | null;
  receipt_uploaded_at?: string | null;
  verification_status?: string;
}

// Copy button component
function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button variant="outline" size="sm" onClick={handleCopy}>
      {copied ? <CheckCheck className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
      {copied ? "Copied!" : "Copy"}
    </Button>
  );
}

export default function FilingDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const { hasValidConsent } = useConsent();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [filing, setFiling] = useState<Filing | null>(null);
  const [payments, setPayments] = useState<ExtendedPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [activeTab, setActiveTab] = useState("checklist");

  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [paymentReference, setPaymentReference] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [addingPayment, setAddingPayment] = useState(false);
  const [initiatingOnline, setInitiatingOnline] = useState(false);

  useEffect(() => { if (!authLoading && !user) navigate("/signin"); }, [user, authLoading, navigate]);
  useEffect(() => { if (user && id) loadFiling(); }, [user, id]);

  const loadFiling = async () => {
    try {
      setLoading(true);
      const data = await fetchFilingById(id!);
      if (!data) { toast({ title: "Filing not found", variant: "destructive" }); navigate("/filings"); return; }
      setFiling(data);
      const paymentsData = await fetchFilingPayments(id!);
      setPayments(paymentsData as ExtendedPayment[]);
    } catch (err: any) {
      toast({ title: "Failed to load filing", description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  const handleSubmit = async () => {
    if (!filing || !user) return;
    setSubmitting(true);
    try {
      const output = computeOutput(filing);
      await submitFiling(filing.id, output);
      const updatedFiling = { ...filing, output_json: output, status: "submitted" as const };
      const pdfBlob = generateFilingPDF(updatedFiling);
      const documentUrl = await uploadFilingPDF(user.id, filing.id, pdfBlob);
      await updateFilingDocument(filing.id, documentUrl);
      await writeAuditLog({ action: AuditActions.FILING_DOCUMENT_GENERATED, entity_type: "filing", entity_id: filing.id, metadata: { tax_type: filing.tax_type } });

      // Trigger notification for filing submission
      await NotificationTriggers.filingSubmitted(filing.id, filing.tax_type);

      toast({ title: "Filing submitted", description: "Your tax filing has been submitted." });
      loadFiling();
    } catch (err: any) { toast({ title: "Submission failed", description: err.message, variant: "destructive" }); }
    finally { setSubmitting(false); }
  };

  const handleAddPayment = async () => {
    if (!filing || !user || !paymentAmount) return;
    setAddingPayment(true);
    try {
      const amountKobo = koboToString(parseNgnToKobo(paymentAmount));
      const paymentId = await createPayment({ filingId: filing.id, amountKobo, method: paymentMethod, reference: paymentReference });

      // CRITICAL: Mark payment as "paid" immediately since user is recording an already-made payment
      await updatePaymentStatus(paymentId, "paid");

      // Upload receipt if provided
      if (receiptFile) {
        const timestamp = Date.now();
        const filePath = `${user.id}/${paymentId}/${timestamp}-${receiptFile.name}`;
        const { error: uploadError } = await supabase.storage.from("payment-receipts").upload(filePath, receiptFile);
        if (uploadError) throw uploadError;

        await supabase.from("payments").update({ receipt_path: filePath, receipt_file_name: receiptFile.name, receipt_uploaded_at: new Date().toISOString() }).eq("id", paymentId);
      }

      // Trigger notification for payment recorded
      await NotificationTriggers.paymentVerified(paymentId, formatKoboToNgn(stringToKobo(amountKobo)));

      toast({ title: "Payment recorded", description: "Your payment has been logged and your filing status updated to PAID." });
      setShowPaymentDialog(false);
      setPaymentAmount(""); setPaymentReference(""); setReceiptFile(null);
      loadFiling();
    } catch (err: any) { toast({ title: "Failed to add payment", description: err.message, variant: "destructive" }); }
    finally { setAddingPayment(false); }
  };

  const handleMarkPaid = async (paymentId: string) => {
    try { await updatePaymentStatus(paymentId, "paid"); toast({ title: "Payment marked as paid" }); loadFiling(); }
    catch (err: any) { toast({ title: "Failed to update payment", description: err.message, variant: "destructive" }); }
  };

  const handleDownloadPDF = () => { if (filing) downloadFilingPDF(filing); };
  const handleDownloadXLS = () => { if (filing) downloadFilingXLS(filing); };

  const handleArchive = async () => {
    if (!filing) return;
    setArchiving(true);
    try { await archiveFiling(filing.id); toast({ title: "Filing archived" }); navigate("/filings"); }
    catch (err: any) { toast({ title: "Archive failed", description: err.message, variant: "destructive" }); }
    finally { setArchiving(false); }
  };

  const getReceiptSignedUrl = async (path: string) => {
    const { data } = await supabase.storage.from("payment-receipts").createSignedUrl(path, 3600);
    return data?.signedUrl;
  };

  const computedOutput = filing ? computeOutput(filing) : {};
  const taxDueKobo = filing ? getFilingTaxKobo({ ...filing, output_json: computedOutput }) : 0n;
  const totalPaidKobo = payments.filter((p) => p.status === "paid").reduce((sum, p) => addKobo(sum, stringToKobo(p.amount_kobo)), 0n);
  const balanceKobo = taxDueKobo > totalPaidKobo ? taxDueKobo - totalPaidKobo : 0n;

  // Compute payment status
  const getPaymentStatus = (): "unpaid" | "partial" | "paid" | null => {
    if (taxDueKobo === 0n) return null;
    if (totalPaidKobo === 0n) return "unpaid";
    if (totalPaidKobo < taxDueKobo) return "partial";
    return "paid";
  };
  const paymentStatus = getPaymentStatus();

  // Set default tab to "instructions" if submitted but unpaid
  useEffect(() => {
    if (filing && filing.status === "submitted" && balanceKobo > 0n) {
      setActiveTab("instructions");
    }
  }, [filing?.id, filing?.status]);

  // Handle "Complete Submission" CTA click
  const handleCompleteSubmission = () => {
    setActiveTab("instructions");
    // Scroll to tabs section with proper offset
    setTimeout(() => {
      scrollToId("filing-tabs");
    }, 100);
  };

  if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!filing) return null;

  const isDraft = filing.status === "draft";
  const canAddPayment = filing.status === "submitted" || filing.status === "accepted";
  const canGeneratePack = !hasBlockingErrors(filing, hasValidConsent);
  const isSubmittedButUnpaid = filing.status === "submitted" && paymentStatus === "unpaid";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-grow pt-20 md:pt-28 pb-16">
        <div className="container mx-auto px-4 md:px-6 max-w-4xl">
          <div className="mb-6">
            <Link to="/filings" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4"><ArrowLeft className="h-4 w-4 mr-2" />Back to Filings</Link>
          </div>

          {/* Filing Header */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-3"><FileText className="h-5 w-5 text-primary" />{getTaxTypeLabel(filing.tax_type)} Filing</CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-2"><Calendar className="h-3 w-3" />{format(new Date(filing.period_start), "MMM d, yyyy")} - {format(new Date(filing.period_end), "MMM d, yyyy")}</CardDescription>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  {/* Filing Status Badge */}
                  <Badge variant="outline" className={statusColors[filing.status]}>{filing.status}</Badge>

                  {/* Payment Status Badge - TASK 1 */}
                  {!isDraft && paymentStatus && (
                    paymentStatus === "unpaid" ? (
                      <Badge variant="destructive">UNPAID</Badge>
                    ) : paymentStatus === "partial" ? (
                      <Badge className="bg-amber-500 hover:bg-amber-500/80 text-white">PARTIAL</Badge>
                    ) : (
                      <Badge className="bg-green-600 hover:bg-green-600/80 text-white">PAID</Badge>
                    )
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/50 rounded-lg p-4 mb-4">
                <h3 className="font-medium mb-3">Tax Summary</h3>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(computedOutput).map(([key, value]) => {
                    if (key.endsWith("Kobo") && typeof value === "string") {
                      const label = key.replace("Kobo", "").replace(/([A-Z])/g, " $1").trim();
                      return <div key={key}><p className="text-xs text-muted-foreground capitalize">{label}</p><p className="font-mono font-semibold">{formatKoboToNgn(stringToKobo(value))}</p></div>;
                    }
                    if (key === "effectiveRate" || key === "whtRate") return <div key={key}><p className="text-xs text-muted-foreground">{key === "effectiveRate" ? "Effective Rate" : "WHT Rate"}</p><p className="font-mono font-semibold">{String(value)}%</p></div>;
                    return null;
                  })}
                </div>
              </div>

              {/* Deduction Entries Section */}
              {getDeductionEntries(filing).length > 0 && (
                <div className="bg-muted/50 rounded-lg p-4 mb-4">
                  <h3 className="font-medium mb-3">Claimed Deductions</h3>
                  <div className="space-y-2">
                    {getDeductionEntries(filing).map((entry) => (
                      <div key={entry.id} className="flex items-start justify-between p-2 rounded bg-background/50">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{entry.label}</span>
                            <Badge variant="outline" className="text-xs capitalize">{entry.kind}</Badge>
                          </div>
                          {entry.note && <p className="text-xs text-muted-foreground mt-1">{entry.note}</p>}
                        </div>
                        <span className="font-mono text-sm font-semibold">{formatKoboToNgn(BigInt(entry.amount * 100))}</span>
                      </div>
                    ))}
                    <div className="flex justify-between pt-2 border-t mt-2">
                      <span className="font-medium text-sm">Total Deductions</span>
                      <span className="font-mono font-bold">
                        {formatKoboToNgn(BigInt(getDeductionEntries(filing).reduce((sum, e) => sum + e.amount, 0) * 100))}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="text-sm text-muted-foreground space-y-1">
                <p>Filing ID: {filing.id}</p>
                {filing.rule_version && <p>Rule Version: {filing.rule_version}</p>}
                {filing.submitted_at && <p>Submitted: {format(new Date(filing.submitted_at), "MMMM d, yyyy 'at' h:mm a")}</p>}
              </div>
              {isDraft && (
                <div className="flex flex-wrap gap-3 pt-4">
                  <Button variant="outline" onClick={() => navigate(`/filings/new?edit=${filing.id}`)}>
                    <FileText className="h-4 w-4 mr-2" />Edit Draft
                  </Button>
                  <Button onClick={handleSubmit} disabled={submitting}>{submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}Submit Filing</Button>
                </div>
              )}

              {/* TASK 2: Complete Submission CTA Button */}
              {isSubmittedButUnpaid && (
                <div className="flex flex-wrap gap-3 pt-4 border-t mt-4">
                  <Button onClick={handleCompleteSubmission} className="gap-2">
                    <Rocket className="h-4 w-4" />
                    Complete Submission
                  </Button>
                  <p className="text-sm text-muted-foreground w-full">
                    Your filing is recorded but not yet paid. Click above to view payment instructions.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 4-Tab Launchpad - TASK 3: Default tab based on payment status */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4" id="filing-tabs">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="checklist" className="flex items-center gap-2"><ClipboardList className="h-4 w-4" /><span className="hidden sm:inline">Checklist</span></TabsTrigger>
              <TabsTrigger value="files" className="flex items-center gap-2"><FileText className="h-4 w-4" /><span className="hidden sm:inline">Files</span></TabsTrigger>
              <TabsTrigger value="instructions" className="flex items-center gap-2 relative">
                <BookOpen className="h-4 w-4" />
                <span className="hidden sm:inline">Submission Steps</span>
                {isSubmittedButUnpaid && <span className="absolute -top-1 -right-1 h-2 w-2 bg-destructive rounded-full" />}
              </TabsTrigger>
              <TabsTrigger value="verify" className="flex items-center gap-2"><CreditCard className="h-4 w-4" /><span className="hidden sm:inline">Verify & Archive</span></TabsTrigger>
            </TabsList>

            {/* Checklist Tab */}
            <TabsContent value="checklist"><PreFlightChecklist filing={filing} hasConsent={hasValidConsent} /></TabsContent>

            {/* Files Tab with Portal Routing */}
            <TabsContent value="files">
              <Card>
                <CardHeader><CardTitle>Filing Documents</CardTitle><CardDescription>Download your filing documents</CardDescription></CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex flex-wrap gap-3">
                    {filing.document_url && <Button variant="outline" onClick={handleDownloadPDF}><Download className="h-4 w-4 mr-2" />Download PDF</Button>}
                    {supportsExcelExport(filing.tax_type) && (
                      <Button variant="outline" onClick={handleDownloadXLS} disabled={!canGeneratePack} title={!canGeneratePack ? "Resolve checklist errors first" : ""}>
                        <FileSpreadsheet className="h-4 w-4 mr-2" />Download Filing Pack (.xls)
                      </Button>
                    )}
                  </div>

                  {/* Portal Routing Section */}
                  {filing.status !== "draft" && (
                    <div className="border-t pt-4 space-y-4">
                      <h4 className="font-medium">Submit to Tax Authority</h4>
                      {(filing.tax_type === "CIT" || filing.tax_type === "VAT" || filing.tax_type === "WHT") ? (
                        <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                          <p className="text-sm text-muted-foreground">
                            Federal taxes are filed on the FIRS TaxPro Max portal.
                          </p>
                          <Button
                            variant="default"
                            onClick={() => window.open("https://taxpromax.firs.gov.ng", "_blank")}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Open FIRS TaxPro Max
                          </Button>
                        </div>
                      ) : filing.tax_type === "PIT" ? (
                        <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                          <p className="text-sm text-muted-foreground">
                            Personal Income Tax is filed with your State IRS (e.g., LIRS for Lagos, KGIRS for Kaduna).
                          </p>
                          <Button variant="outline" onClick={() => window.open("https://lirs.gov.ng", "_blank")}>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Open State Portal (LIRS Example)
                          </Button>
                        </div>
                      ) : (
                        <div className="p-4 bg-muted/50 rounded-lg">
                          <p className="text-sm text-muted-foreground">
                            Check with your tax authority for the appropriate filing portal.
                          </p>
                        </div>
                      )}

                      {/* Copy Final Tax Amount */}
                      <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
                        <div className="flex-1">
                          <p className="text-xs text-muted-foreground">Final Tax Amount</p>
                          <p className="text-lg font-mono font-bold">{formatKoboToNgn(taxDueKobo)}</p>
                        </div>
                        <CopyButton value={String(Number(taxDueKobo) / 100)} />
                      </div>
                    </div>
                  )}

                  <div className="text-sm text-muted-foreground pt-4 border-t">
                    <p><strong>Filing ID:</strong> {filing.id}</p>
                    <p><strong>Rule Version:</strong> {filing.rule_version || "N/A"}</p>
                    {filing.submitted_at && <p><strong>Submitted:</strong> {format(new Date(filing.submitted_at), "dd/MM/yyyy 'at' HH:mm")}</p>}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Side-by-Side Instructions Tab */}
            <TabsContent value="instructions"><SideBySideInstructions filing={filing} /></TabsContent>

            {/* Verify & Archive Tab */}
            <TabsContent value="verify">
              <div className="space-y-6">
                {canAddPayment && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <CreditCard className="h-5 w-5" />
                            Tax Payment Ledger
                          </CardTitle>
                          <CardDescription>
                            Tax Due: {formatKoboToNgn(taxDueKobo)} | Paid: {formatKoboToNgn(totalPaidKobo)}
                            {totalPaidKobo >= taxDueKobo && taxDueKobo > 0n && (
                              <Badge className="ml-2 bg-green-600">PAID IN FULL</Badge>
                            )}
                            {totalPaidKobo === 0n && taxDueKobo > 0n && (
                              <Badge variant="destructive" className="ml-2">UNPAID</Badge>
                            )}
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="default" disabled={initiatingOnline || balanceKobo === 0n} onClick={async () => {
                            if (!user?.email || !filing) return;
                            setInitiatingOnline(true);
                            try {
                              const amountKobo = balanceKobo.toString();
                              const paymentId = await createPayment({ filingId: filing.id, amountKobo, method: "paystack", reference: "" });
                              const result = await initiatePayment(paymentId, amountKobo, user.email);
                              if (result.success && result.authorizationUrl) {
                                window.open(result.authorizationUrl, "_blank");
                                toast({ title: "Redirecting to Paystack", description: "Complete your payment in the new tab." });
                                loadFiling();
                              } else {
                                toast({ title: "Payment Gateway", description: result.error || "Could not initiate payment.", variant: result.isStubbed ? "default" : "destructive" });
                              }
                            } catch (err: any) {
                              toast({ title: "Payment Error", description: err.message, variant: "destructive" });
                            } finally { setInitiatingOnline(false); }
                          }}>
                            {initiatingOnline ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CreditCard className="h-4 w-4 mr-2" />}
                            Pay Online
                          </Button>
                          <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline">
                                <Plus className="h-4 w-4 mr-2" />
                                Record Manual Payment
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-h-[85vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Log External Payment</DialogTitle>
                                <DialogDescription>
                                  This ledger tracks compliance. Make the actual payment via Remita or the government portal, then log it here.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div>
                                  <Label>Amount (₦)</Label>
                                  <Input
                                    type="text"
                                    placeholder="0"
                                    value={paymentAmount}
                                    onChange={(e) => setPaymentAmount(e.target.value.replace(/[^0-9.,]/g, ""))}
                                    className="mt-1 font-mono"
                                  />
                                </div>
                                <div>
                                  <Label>Payment Method</Label>
                                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                                      <SelectItem value="card">Card Payment</SelectItem>
                                      <SelectItem value="cash">Cash</SelectItem>
                                      <SelectItem value="remita">Remita</SelectItem>
                                      <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label>Remita RRR / Reference (optional)</Label>
                                  <Input
                                    type="text"
                                    placeholder="e.g., 123456789012"
                                    value={paymentReference}
                                    onChange={(e) => setPaymentReference(e.target.value)}
                                    className="mt-1"
                                  />
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Enter your Remita Retrieval Reference or bank transaction reference
                                  </p>
                                </div>
                                <div>
                                  <Label>Receipt (optional)</Label>
                                  <Input
                                    type="file"
                                    accept="image/*,.pdf"
                                    onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                                    className="mt-1"
                                  />
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Upload payment evidence for admin verification
                                  </p>
                                </div>
                              </div>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>Cancel</Button>
                                <Button onClick={handleAddPayment} disabled={addingPayment || !paymentAmount}>
                                  {addingPayment && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                  Record Payment
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Alert className="mb-4 bg-muted/50">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          This ledger tracks your tax compliance. Make the actual payment via Remita or the FIRS/State portal, then record it here with your reference number.
                        </AlertDescription>
                      </Alert>
                      {payments.length === 0 ? (
                        <p className="text-muted-foreground text-center py-4">No payments recorded yet. Record your payment after making it via Remita or the tax portal.</p>
                      ) : (
                        <div className="space-y-3">
                          {payments.map((payment) => (
                            <div key={payment.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                              <div>
                                <p className="font-mono font-semibold">{formatKoboToNgn(stringToKobo(payment.amount_kobo))}</p>
                                <p className="text-xs text-muted-foreground">{payment.payment_method?.replace("_", " ")} • {format(new Date(payment.created_at), "dd/MM/yyyy")}{payment.reference && ` • Ref: ${payment.reference}`}</p>
                                {payment.receipt_path && <p className="text-xs text-primary mt-1"><Upload className="h-3 w-3 inline mr-1" />Receipt uploaded</p>}
                              </div>
                              <div className="flex items-center gap-2">
                                {payment.verification_status && <Badge variant="outline" className={statusColors[payment.verification_status]}>{payment.verification_status}</Badge>}
                                <Badge variant="outline" className={statusColors[payment.status]}>{payment.status}</Badge>
                                {payment.status === "pending" && <Button size="sm" variant="ghost" onClick={() => handleMarkPaid(payment.id)}><CheckCircle className="h-4 w-4" /></Button>}
                                {payment.receipt_path && <Button size="sm" variant="ghost" onClick={async () => { const url = await getReceiptSignedUrl(payment.receipt_path!); if (url) window.open(url, "_blank"); }}><ExternalLink className="h-4 w-4" /></Button>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2"><Archive className="h-5 w-5" />Archive Filing</CardTitle><CardDescription>Archive this filing to remove it from your active list.</CardDescription></CardHeader>
                  <CardContent><Button variant="outline" onClick={handleArchive} disabled={archiving}>{archiving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}<Archive className="h-4 w-4 mr-2" />Archive Filing</Button></CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
}
