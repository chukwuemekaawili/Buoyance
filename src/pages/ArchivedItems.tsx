import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
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
  Loader2,
  ArrowLeft,
  Archive,
  RotateCcw,
  FileText,
  Calculator,
  CreditCard,
  Building2,
  Receipt,
  Banknote,
  Landmark,
  Calendar,
  CheckSquare,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatKoboToNgn, stringToKobo } from "@/lib/money";
import { writeAuditLog } from "@/lib/auditLog";

interface ArchivedCalculation {
  id: string;
  created_at: string;
  tax_type: string;
  rule_version: string;
  input_json: Record<string, unknown>;
  output_json: Record<string, unknown>;
}

interface ArchivedFiling {
  id: string;
  created_at: string;
  tax_type: string;
  period_start: string;
  period_end: string;
  status: string;
  rule_version: string;
  output_json: Record<string, unknown>;
}

interface ArchivedPayment {
  id: string;
  created_at: string;
  filing_id: string;
  amount_kobo: string;
  currency: string;
  payment_method: string | null;
  reference: string | null;
  status: string;
}

type RestoreTarget = 
  | { type: "calculation"; item: ArchivedCalculation }
  | { type: "filing"; item: ArchivedFiling }
  | { type: "payment"; item: ArchivedPayment }
  | null;

function getTaxTypeIcon(taxType: string) {
  switch (taxType) {
    case "CIT": return Building2;
    case "VAT": return Receipt;
    case "WHT": return Banknote;
    case "CGT": return Landmark;
    default: return Calculator;
  }
}

function getTaxTypeBadgeColor(taxType: string) {
  switch (taxType) {
    case "CIT": return "bg-blue-600/10 text-blue-600 border-blue-600/20";
    case "VAT": return "bg-emerald-600/10 text-emerald-600 border-emerald-600/20";
    case "WHT": return "bg-amber-600/10 text-amber-600 border-amber-600/20";
    case "CGT": return "bg-purple-600/10 text-purple-600 border-purple-600/20";
    default: return "bg-primary/10 text-primary border-primary/20";
  }
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

function displayCurrency(koboStr: string | undefined): string {
  if (koboStr) {
    return formatKoboToNgn(stringToKobo(koboStr));
  }
  return "₦0";
}

export default function ArchivedItems() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"calculations" | "filings" | "payments">("calculations");
  const [calculations, setCalculations] = useState<ArchivedCalculation[]>([]);
  const [filings, setFilings] = useState<ArchivedFiling[]>([]);
  const [payments, setPayments] = useState<ArchivedPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoreTarget, setRestoreTarget] = useState<RestoreTarget>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isBulkRestoring, setIsBulkRestoring] = useState(false);
  const [showBulkRestoreDialog, setShowBulkRestoreDialog] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/signin");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      loadArchivedItems();
    }
  }, [user]);

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const loadArchivedItems = async () => {
    setLoading(true);
    try {
      const [calcResult, filingResult, paymentResult] = await Promise.all([
        supabase
          .from("tax_calculations")
          .select("*")
          .eq("user_id", user!.id)
          .eq("archived", true)
          .order("created_at", { ascending: false }),
        supabase
          .from("filings")
          .select("*")
          .eq("user_id", user!.id)
          .eq("archived", true)
          .order("created_at", { ascending: false }),
        supabase
          .from("payments")
          .select("*")
          .eq("user_id", user!.id)
          .eq("archived", true)
          .order("created_at", { ascending: false }),
      ]);

      if (calcResult.error) throw calcResult.error;
      if (filingResult.error) throw filingResult.error;
      if (paymentResult.error) throw paymentResult.error;

      setCalculations((calcResult.data || []) as unknown as ArchivedCalculation[]);
      setFilings((filingResult.data || []) as unknown as ArchivedFiling[]);
      setPayments((paymentResult.data || []) as unknown as ArchivedPayment[]);
    } catch (err: any) {
      toast({
        title: "Failed to load archived items",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!restoreTarget) return;

    setIsRestoring(true);
    try {
      const itemId = restoreTarget.item.id;

      if (restoreTarget.type === "calculation") {
        const { error } = await supabase
          .from("tax_calculations")
          .update({ archived: false })
          .eq("id", itemId);
        if (error) throw error;
      } else if (restoreTarget.type === "filing") {
        const { error } = await supabase
          .from("filings")
          .update({ archived: false })
          .eq("id", itemId);
        if (error) throw error;
      } else if (restoreTarget.type === "payment") {
        // Note: This requires the payment to have pending verification status per RLS
        await supabase
          .from("payments")
          .update({ archived: false } as any)
          .eq("id", itemId);
      }

      await writeAuditLog({
        action: `${restoreTarget.type}.restored`,
        entity_type: restoreTarget.type === "calculation" ? "tax_calculation" : restoreTarget.type,
        entity_id: itemId,
        metadata: { restored_from: "archived" },
      });

      toast({
        title: "Item restored",
        description: `The ${restoreTarget.type} has been restored successfully.`,
      });

      setRestoreTarget(null);
      loadArchivedItems();
    } catch (err: any) {
      toast({
        title: "Failed to restore",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsRestoring(false);
    }
  };

  const toggleItemSelection = (id: string) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAllInTab = () => {
    const items = activeTab === "calculations" ? calculations : activeTab === "filings" ? filings : payments;
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(items.map((i) => i.id)));
    }
  };

  const handleBulkRestore = async () => {
    if (selectedItems.size === 0) return;

    setIsBulkRestoring(true);
    try {
      const itemIds = Array.from(selectedItems);
      const tableName = activeTab === "calculations" ? "tax_calculations" : activeTab === "filings" ? "filings" : "payments";

      for (const itemId of itemIds) {
        if (tableName === "payments") {
          await supabase.from(tableName).update({ archived: false } as any).eq("id", itemId);
        } else {
          await supabase.from(tableName).update({ archived: false }).eq("id", itemId);
        }

        await writeAuditLog({
          action: `${activeTab.slice(0, -1)}.restored`,
          entity_type: activeTab === "calculations" ? "tax_calculation" : activeTab.slice(0, -1),
          entity_id: itemId,
          metadata: { restored_from: "archived", bulk_operation: true },
        });
      }

      toast({
        title: "Items restored",
        description: `${itemIds.length} item(s) have been restored successfully.`,
      });

      setSelectedItems(new Set());
      setShowBulkRestoreDialog(false);
      loadArchivedItems();
    } catch (err: any) {
      toast({
        title: "Failed to restore items",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsBulkRestoring(false);
    }
  };

  const totalArchived = calculations.length + filings.length + payments.length;
  const currentItems = activeTab === "calculations" ? calculations : activeTab === "filings" ? filings : payments;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-grow pt-20 md:pt-28 pb-16">
        <div className="container mx-auto px-4 md:px-6 max-w-5xl">
          <div className="mb-6">
            <Link
              to="/dashboard"
              className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Archive className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Archived Items</h1>
                <p className="text-muted-foreground mt-1">
                  {totalArchived === 0
                    ? "No archived items"
                    : `${totalArchived} archived item${totalArchived === 1 ? "" : "s"}`}
                </p>
              </div>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as typeof activeTab); setSelectedItems(new Set()); }}>
            <div className="flex items-center justify-between mb-6">
              <TabsList>
                <TabsTrigger value="calculations" className="gap-2">
                  <Calculator className="h-4 w-4" />
                  Calculations ({calculations.length})
                </TabsTrigger>
                <TabsTrigger value="filings" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Filings ({filings.length})
                </TabsTrigger>
                <TabsTrigger value="payments" className="gap-2">
                  <CreditCard className="h-4 w-4" />
                  Payments ({payments.length})
                </TabsTrigger>
              </TabsList>

              {currentItems.length > 0 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectAllInTab}
                  >
                    <CheckSquare className="h-4 w-4 mr-1" />
                    {selectedItems.size === currentItems.length ? "Deselect All" : "Select All"}
                  </Button>
                  {selectedItems.size > 0 && (
                    <Button
                      size="sm"
                      onClick={() => setShowBulkRestoreDialog(true)}
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Restore ({selectedItems.size})
                    </Button>
                  )}
                </div>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* Calculations Tab */}
                <TabsContent value="calculations">
                  {calculations.length === 0 ? (
                    <Card>
                      <CardContent className="pt-6 text-center py-12">
                        <Calculator className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No archived calculations</h3>
                        <p className="text-muted-foreground">
                          Calculations you archive will appear here.
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {calculations.map((calc) => {
                        const Icon = getTaxTypeIcon(calc.tax_type);
                        const badgeColor = getTaxTypeBadgeColor(calc.tax_type);
                        const output = calc.output_json as Record<string, unknown>;
                        const taxAmount = output.taxPayableKobo || output.vatPayableKobo || output.whtPayableKobo || output.cgtPayableKobo || output.totalTaxKobo;

                        return (
                          <Card key={calc.id} className="hover:shadow-md transition-shadow opacity-75 hover:opacity-100">
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <CardTitle className="text-lg flex items-center gap-2">
                                  <Icon className="h-5 w-5 text-muted-foreground" />
                                  <Badge className={badgeColor} variant="outline">
                                    {calc.tax_type}
                                  </Badge>
                                  Calculation
                                </CardTitle>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                                    <Calendar className="h-4 w-4" />
                                    {format(new Date(calc.created_at), "MMM d, yyyy")}
                                  </span>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setRestoreTarget({ type: "calculation", item: calc })}
                                  >
                                    <RotateCcw className="h-4 w-4 mr-1" />
                                    Restore
                                  </Button>
                                </div>
                              </div>
                              <CardDescription>Rule version: {calc.rule_version || "v1"}</CardDescription>
                            </CardHeader>
                            <CardContent>
                              {taxAmount && (
                                <p className="font-mono font-semibold text-primary">
                                  Tax: {displayCurrency(taxAmount as string)}
                                </p>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>

                {/* Filings Tab */}
                <TabsContent value="filings">
                  {filings.length === 0 ? (
                    <Card>
                      <CardContent className="pt-6 text-center py-12">
                        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No archived filings</h3>
                        <p className="text-muted-foreground">
                          Filings you archive will appear here.
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {filings.map((filing) => {
                        const Icon = getTaxTypeIcon(filing.tax_type);
                        const output = filing.output_json as Record<string, unknown>;
                        const taxAmount = output.taxPayableKobo || output.vatPayableKobo || output.whtPayableKobo || output.cgtPayableKobo || output.totalTaxKobo;

                        return (
                          <Card key={filing.id} className="hover:shadow-md transition-shadow opacity-75 hover:opacity-100">
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 rounded-lg bg-muted">
                                    <Icon className="h-5 w-5 text-muted-foreground" />
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
                                  <Badge variant="outline" className="bg-muted text-muted-foreground">
                                    {filing.status}
                                  </Badge>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setRestoreTarget({ type: "filing", item: filing })}
                                  >
                                    <RotateCcw className="h-4 w-4 mr-1" />
                                    Restore
                                  </Button>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <div className="flex items-center justify-between text-sm text-muted-foreground">
                                <span>Rule: {filing.rule_version || "N/A"}</span>
                                {taxAmount && (
                                  <span className="font-mono font-semibold text-primary">
                                    {displayCurrency(taxAmount as string)}
                                  </span>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>

                {/* Payments Tab */}
                <TabsContent value="payments">
                  {payments.length === 0 ? (
                    <Card>
                      <CardContent className="pt-6 text-center py-12">
                        <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No archived payments</h3>
                        <p className="text-muted-foreground">
                          Payments you archive will appear here.
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {payments.map((payment) => (
                        <Card key={payment.id} className="hover:shadow-md transition-shadow opacity-75 hover:opacity-100">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-muted">
                                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <div>
                                  <CardTitle className="text-base">
                                    {formatKoboToNgn(stringToKobo(payment.amount_kobo))}
                                  </CardTitle>
                                  <CardDescription>
                                    {payment.payment_method || "Unknown method"}
                                    {payment.reference && ` • Ref: ${payment.reference}`}
                                  </CardDescription>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="bg-muted text-muted-foreground">
                                  {payment.status}
                                </Badge>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setRestoreTarget({ type: "payment", item: payment })}
                                >
                                  <RotateCcw className="h-4 w-4 mr-1" />
                                  Restore
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>Created: {format(new Date(payment.created_at), "MMM d, yyyy")}</span>
                              <span>Currency: {payment.currency}</span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </>
            )}
          </Tabs>
        </div>
      </main>
      <Footer />

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={!!restoreTarget} onOpenChange={() => setRestoreTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore this item?</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore the {restoreTarget?.type} back to your active list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRestoring}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore} disabled={isRestoring}>
              {isRestoring && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Restore Dialog */}
      <AlertDialog open={showBulkRestoreDialog} onOpenChange={setShowBulkRestoreDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore {selectedItems.size} items?</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore all selected {activeTab} back to your active list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkRestoring}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkRestore} disabled={isBulkRestoring}>
              {isBulkRestoring && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Restore All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
