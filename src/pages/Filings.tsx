import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AuthGuard } from "@/components/AuthGuard";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Loader2,
  Plus,
  ArrowLeft,
  FileText,
  Calendar,
  MoreVertical,
  Archive,
  Download,
  Eye,
  Building2,
  Receipt,
  Banknote,
  Landmark,
  Calculator,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import {
  fetchUserFilings,
  archiveFiling,
  getFilingDocumentUrl,
  type Filing,
  type FilingStatus,
} from "@/lib/filingService";
import { fetchFilingPayments, type Payment } from "@/lib/paymentService";
import { writeAuditLog, AuditActions } from "@/lib/auditLog";
import { formatKoboToNgn, stringToKobo, addKobo } from "@/lib/money";
import { useIntegrationStatus } from "@/hooks/useIntegrationStatus";

const statusColors: Record<FilingStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-blue-600/10 text-blue-600 border-blue-600/20",
  accepted: "bg-green-600/10 text-green-600 border-green-600/20",
  rejected: "bg-red-600/10 text-red-600 border-red-600/20",
  cancelled: "bg-muted text-muted-foreground",
};

const taxTypeIcons: Record<string, typeof FileText> = {
  PIT: Calculator,
  CIT: Building2,
  VAT: Receipt,
  WHT: Banknote,
  CGT: Landmark,
};

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

function getFilingTaxAmount(filing: Filing): string | null {
  const output = filing.output_json;
  const taxKobo =
    output.taxPayableKobo ||
    output.vatPayableKobo ||
    output.whtPayableKobo ||
    output.cgtPayableKobo ||
    output.totalTaxKobo;

  if (taxKobo && typeof taxKobo === "string") {
    return formatKoboToNgn(stringToKobo(taxKobo));
  }
  return null;
}

// Helper to compute payment status for a filing
type PaymentStatusType = "unpaid" | "partial" | "paid";

function getPaymentStatusBadge(status: PaymentStatusType) {
  switch (status) {
    case "unpaid":
      return <Badge variant="destructive">UNPAID</Badge>;
    case "partial":
      return <Badge className="bg-amber-500 hover:bg-amber-500/80 text-white">PARTIAL</Badge>;
    case "paid":
      return <Badge className="bg-green-600 hover:bg-green-600/80 text-white">PAID</Badge>;
  }
}

function FilingsContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { payment: paymentIntegration, loading: integrationLoading } = useIntegrationStatus();

  const [filings, setFilings] = useState<Filing[]>([]);
  const [filingPayments, setFilingPayments] = useState<Record<string, Payment[]>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | FilingStatus>("all");
  const [archiveTarget, setArchiveTarget] = useState<Filing | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);

  // Check if auto-file is available (requires payment integration)
  const autoFileAvailable = paymentIntegration?.configured ?? false;

  useEffect(() => {
    if (user) {
      loadFilings();
    }
  }, [user]);

  const loadFilings = async () => {
    try {
      setLoading(true);
      const data = await fetchUserFilings();
      setFilings(data);

      // Load payments for each filing to compute payment status
      const paymentsMap: Record<string, Payment[]> = {};
      await Promise.all(
        data.map(async (filing) => {
          try {
            const payments = await fetchFilingPayments(filing.id);
            paymentsMap[filing.id] = payments;
          } catch (err) {
            paymentsMap[filing.id] = [];
          }
        })
      );
      setFilingPayments(paymentsMap);
    } catch (err: any) {
      toast({
        title: "Failed to load filings",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Compute payment status for a filing
  const computePaymentStatus = (filing: Filing): PaymentStatusType | null => {
    // Get the raw kobo string, not the formatted amount
    const taxKoboString = getFilingTaxKoboString(filing);
    if (!taxKoboString) return null;

    const totalTax = stringToKobo(taxKoboString);
    if (totalTax === 0n) return "paid";

    const payments = filingPayments[filing.id] || [];
    const paidSum = payments
      .filter((p) => p.status === "paid")
      .reduce((sum, p) => addKobo(sum, stringToKobo(p.amount_kobo)), 0n);

    if (paidSum === 0n) return "unpaid";
    if (paidSum < totalTax) return "partial";
    return "paid";
  };

  // Get raw tax amount in kobo string format
  const getFilingTaxKoboString = (filing: Filing): string | null => {
    const output = filing.output_json;
    const taxKobo =
      output.taxPayableKobo ||
      output.vatPayableKobo ||
      output.whtPayableKobo ||
      output.cgtPayableKobo ||
      output.totalTaxKobo;

    if (taxKobo && typeof taxKobo === "string") {
      return taxKobo;
    }
    return null;
  };

  const handleArchive = async () => {
    if (!archiveTarget) return;

    setIsArchiving(true);
    try {
      await archiveFiling(archiveTarget.id);

      await writeAuditLog({
        action: AuditActions.FILING_ARCHIVED,
        entity_type: "filing",
        entity_id: archiveTarget.id,
        metadata: { tax_type: archiveTarget.tax_type },
      });

      toast({
        title: "Filing archived",
        description: "The filing has been archived successfully.",
      });

      setArchiveTarget(null);
      loadFilings();
    } catch (err: any) {
      toast({
        title: "Failed to archive",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsArchiving(false);
    }
  };

  const handleDownload = async (filing: Filing) => {
    try {
      if (!filing.document_url || !user) {
        toast({
          title: "No document",
          description: "This filing does not have a generated document.",
          variant: "destructive",
        });
        return;
      }

      const url = await getFilingDocumentUrl(user.id, filing.id);
      if (url) {
        window.open(url, "_blank");
      }
    } catch (err: any) {
      toast({
        title: "Download failed",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const filteredFilings = activeTab === "all"
    ? filings
    : filings.filter((f) => f.status === activeTab);


  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-grow pt-20 md:pt-28 pb-16">
        <div className="container mx-auto px-4 md:px-6 max-w-5xl" data-tour="filings">
          <div className="mb-6">
            <Link
              to="/dashboard"
              className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Tax Filings</h1>
                <p className="text-muted-foreground mt-2">Manage your tax filing submissions</p>
              </div>
              <Button asChild>
                <Link to="/filings/new">
                  <Plus className="h-4 w-4 mr-2" />
                  New Filing
                </Link>
              </Button>
            </div>
          </div>

          {/* Filing Options Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Self-File Pack
                  <Badge variant="outline" className="ml-auto text-green-600 border-green-600/30 bg-green-600/10">
                    Available Now
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Generate a complete PDF/Excel filing pack with all calculations and supporting documents.
                  You download it and submit manually to FIRS/SIRS.
                </p>
              </CardContent>
            </Card>

            <Card className="border-muted">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  Auto-File Service
                  <Badge variant="outline" className="ml-auto">
                    {autoFileAvailable ? "Available" : "Coming Soon"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {autoFileAvailable
                    ? "Submit directly through licensed partner integration with FIRS."
                    : "Direct submission via licensed partner/API. Requires payment integration."}
                </p>
              </CardContent>
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
            <TabsList className="mb-6">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="draft">Draft</TabsTrigger>
              <TabsTrigger value="submitted">Submitted</TabsTrigger>
              <TabsTrigger value="accepted">Accepted</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab}>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredFilings.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-center py-12">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      {activeTab === "all" ? "No filings yet" : `No ${activeTab} filings`}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Create your first tax filing to get started.
                    </p>
                    <Button asChild>
                      <Link to="/filings/new">
                        <Plus className="h-4 w-4 mr-2" />
                        Create Filing
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {filteredFilings.map((filing) => {
                    const Icon = taxTypeIcons[filing.tax_type] || FileText;
                    const taxAmount = getFilingTaxAmount(filing);

                    return (
                      <Card key={filing.id} className="hover:shadow-md transition-shadow">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-primary/10">
                                <Icon className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <CardTitle className="text-base">
                                  {getTaxTypeLabel(filing.tax_type)}
                                </CardTitle>
                                <CardDescription className="flex items-center gap-2 mt-1">
                                  <Calendar className="h-3 w-3" />
                                  {format(new Date(filing.period_start), "MMM d, yyyy")} -{" "}
                                  {format(new Date(filing.period_end), "MMM d, yyyy")}
                                </CardDescription>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={statusColors[filing.status]}
                              >
                                {filing.status}
                              </Badge>
                              {/* Payment Status Badge - computed live */}
                              {filing.status !== "draft" && (() => {
                                const paymentStatus = computePaymentStatus(filing);
                                return paymentStatus ? getPaymentStatusBadge(paymentStatus) : null;
                              })()}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem asChild>
                                    <Link to={`/filings/${filing.id}`}>
                                      <Eye className="h-4 w-4 mr-2" />
                                      View Details
                                    </Link>
                                  </DropdownMenuItem>
                                  {filing.document_url && (
                                    <DropdownMenuItem onClick={() => handleDownload(filing)}>
                                      <Download className="h-4 w-4 mr-2" />
                                      Download PDF
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem
                                    onClick={() => setArchiveTarget(filing)}
                                    className="text-destructive"
                                  >
                                    <Archive className="h-4 w-4 mr-2" />
                                    Archive
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              {filing.rule_version && (
                                <span>Rule: {filing.rule_version}</span>
                              )}
                              {filing.submitted_at && (
                                <span>
                                  Submitted: {format(new Date(filing.submitted_at), "MMM d, yyyy")}
                                </span>
                              )}
                            </div>
                            {taxAmount && (
                              <p className="font-mono font-semibold text-primary">
                                {taxAmount}
                              </p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={!!archiveTarget} onOpenChange={() => setArchiveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this filing?</AlertDialogTitle>
            <AlertDialogDescription>
              This filing will be archived and removed from your active list. You can still access
              archived filings if needed. This action cannot be undone from the UI.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isArchiving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive} disabled={isArchiving}>
              {isArchiving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function Filings() {
  return (
    <AuthGuard>
      <FilingsContent />
    </AuthGuard>
  );
}
