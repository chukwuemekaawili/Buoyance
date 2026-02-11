import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AuthGuard } from "@/components/AuthGuard";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  CreditCard, 
  MoreVertical, 
  Eye, 
  Archive, 
  CheckCircle, 
  XCircle, 
  Loader2,
  FileText
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  fetchUserPayments, 
  updatePaymentStatus, 
  archivePayment, 
  Payment, 
  PaymentStatus 
} from "@/lib/paymentService";
import { formatKoboToNgn } from "@/lib/money";
import { writeAuditLog, AuditActions } from "@/lib/auditLog";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  paid: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  refunded: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

const getPaymentAmount = (payment: Payment): string => {
  try {
    return formatKoboToNgn(payment.amount_kobo);
  } catch {
    return "₦0.00";
  }
};

function PaymentsContent() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [archiveTarget, setArchiveTarget] = useState<Payment | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const [updatingPaymentId, setUpdatingPaymentId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadPayments();
    }
  }, [user]);

  const loadPayments = async () => {
    setLoading(true);
    try {
      const data = await fetchUserPayments();
      setPayments(data);
    } catch (error) {
      console.error("Error loading payments:", error);
      toast({
        title: "Error",
        description: "Failed to load payments.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPaid = async (payment: Payment) => {
    setUpdatingPaymentId(payment.id);
    try {
      await updatePaymentStatus(payment.id, "paid");
      await writeAuditLog({
        action: AuditActions.PAYMENT_UPDATED,
        entity_type: "payment",
        entity_id: payment.id,
        after_json: { status: "paid" },
      });
      toast({
        title: "Payment Updated",
        description: "Payment marked as paid.",
      });
      loadPayments();
    } catch (error) {
      console.error("Error updating payment:", error);
      toast({
        title: "Error",
        description: "Failed to update payment status.",
        variant: "destructive",
      });
    } finally {
      setUpdatingPaymentId(null);
    }
  };

  const handleMarkFailed = async (payment: Payment) => {
    setUpdatingPaymentId(payment.id);
    try {
      await updatePaymentStatus(payment.id, "failed");
      await writeAuditLog({
        action: AuditActions.PAYMENT_UPDATED,
        entity_type: "payment",
        entity_id: payment.id,
        after_json: { status: "failed" },
      });
      toast({
        title: "Payment Updated",
        description: "Payment marked as failed.",
      });
      loadPayments();
    } catch (error) {
      console.error("Error updating payment:", error);
      toast({
        title: "Error",
        description: "Failed to update payment status.",
        variant: "destructive",
      });
    } finally {
      setUpdatingPaymentId(null);
    }
  };

  const handleArchive = async () => {
    if (!archiveTarget) return;
    setIsArchiving(true);
    try {
      await archivePayment(archiveTarget.id);
      await writeAuditLog({
        action: AuditActions.PAYMENT_ARCHIVED,
        entity_type: "payment",
        entity_id: archiveTarget.id,
      });
      toast({
        title: "Payment Archived",
        description: "The payment has been archived.",
      });
      setArchiveTarget(null);
      loadPayments();
    } catch (error) {
      console.error("Error archiving payment:", error);
      toast({
        title: "Error",
        description: "Failed to archive payment.",
        variant: "destructive",
      });
    } finally {
      setIsArchiving(false);
    }
  };

  const filteredPayments = payments.filter((p) => {
    if (activeTab === "all") return true;
    return p.status === activeTab;
  });


  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 pt-20 md:pt-28 pb-16">
        <div className="container mx-auto px-4 md:px-6 max-w-5xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Payments</h1>
              <p className="text-muted-foreground mt-1">Track and manage your tax payments</p>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="paid">Paid</TabsTrigger>
              <TabsTrigger value="failed">Failed</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-0">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredPayments.length === 0 ? (
                <Card>
                  <CardContent className="py-16 text-center">
                    <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No payments found</h3>
                    <p className="text-muted-foreground mb-6">
                      {activeTab === "all"
                        ? "You haven't recorded any payments yet."
                        : `No ${activeTab} payments found.`}
                    </p>
                    <Button asChild>
                      <Link to="/filings">View Filings</Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {filteredPayments.map((payment) => (
                    <Card key={payment.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <CreditCard className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <CardTitle className="text-lg">
                                {getPaymentAmount(payment)}
                              </CardTitle>
                              <p className="text-sm text-muted-foreground">
                                {payment.payment_method || "Unknown method"}
                                {payment.reference && ` • Ref: ${payment.reference}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={statusColors[payment.status]}>
                              {payment.status}
                            </Badge>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link to={`/filings/${payment.filing_id}`}>
                                    <FileText className="h-4 w-4 mr-2" />
                                    View Filing
                                  </Link>
                                </DropdownMenuItem>
                                {payment.status === "pending" && (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() => handleMarkPaid(payment)}
                                      disabled={updatingPaymentId === payment.id}
                                    >
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      Mark as Paid
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleMarkFailed(payment)}
                                      disabled={updatingPaymentId === payment.id}
                                    >
                                      <XCircle className="h-4 w-4 mr-2" />
                                      Mark as Failed
                                    </DropdownMenuItem>
                                  </>
                                )}
                                <DropdownMenuItem
                                  onClick={() => setArchiveTarget(payment)}
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
                      <CardContent className="pt-0">
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <span>
                            Created: {new Date(payment.created_at).toLocaleDateString()}
                          </span>
                          {payment.paid_at && (
                            <span>
                              Paid: {new Date(payment.paid_at).toLocaleDateString()}
                            </span>
                          )}
                          <span>Currency: {payment.currency}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
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
            <AlertDialogTitle>Archive Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive this payment? It will be hidden from your
              payment list but not deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isArchiving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive} disabled={isArchiving}>
              {isArchiving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Archiving...
                </>
              ) : (
                "Archive"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function Payments() {
  return (
    <AuthGuard>
      <PaymentsContent />
    </AuthGuard>
  );
}
