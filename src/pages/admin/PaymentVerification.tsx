/**
 * Admin Payment Verification Page
 * Admin can verify/reject payment receipts.
 * Auditors can view but not verify.
 */

import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2,
  Shield,
  ChevronLeft,
  ChevronRight,
  FileText,
  ExternalLink,
  CheckCircle,
  XCircle,
  Clock,
  Receipt,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { useRBAC } from "@/hooks/useRBAC";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { formatKoboToNgn, stringToKobo } from "@/lib/money";
import { NotificationTriggers } from "@/lib/notificationService";

interface PaymentWithFiling {
  id: string;
  user_id: string;
  filing_id: string;
  amount_kobo: string;
  currency: string;
  payment_method: string | null;
  reference: string | null;
  status: string;
  created_at: string;
  receipt_path: string | null;
  receipt_file_name: string | null;
  receipt_uploaded_at: string | null;
  verification_status: string;
  verified_by: string | null;
  verified_at: string | null;
  verification_notes: string | null;
  filing_tax_type: string;
  filing_period_start: string;
  filing_period_end: string;
}

const PAGE_SIZE = 20;

const verificationStatusColors: Record<string, string> = {
  pending: "bg-amber-600/10 text-amber-600 border-amber-600/20",
  verified: "bg-green-600/10 text-green-600 border-green-600/20",
  rejected: "bg-red-600/10 text-red-600 border-red-600/20",
};

const verificationStatusIcons: Record<string, typeof Clock> = {
  pending: Clock,
  verified: CheckCircle,
  rejected: XCircle,
};

export default function PaymentVerification() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isAuditor, loading: rbacLoading } = useRBAC();
  const { toast } = useToast();

  const [payments, setPayments] = useState<PaymentWithFiling[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // Verification dialog state
  const [verifyTarget, setVerifyTarget] = useState<PaymentWithFiling | null>(null);
  const [verifyAction, setVerifyAction] = useState<"verified" | "rejected">("verified");
  const [verifyNotes, setVerifyNotes] = useState("");
  const [verifying, setVerifying] = useState(false);

  // Authorization check
  useEffect(() => {
    if (!authLoading && !rbacLoading) {
      if (!user) {
        navigate("/signin");
      } else if (!isAdmin && !isAuditor) {
        navigate("/");
      }
    }
  }, [user, authLoading, rbacLoading, isAdmin, isAuditor, navigate]);

  // Fetch payments with receipts
  useEffect(() => {
    async function fetchPayments() {
      if (!user || (!isAdmin && !isAuditor)) return;

      setLoading(true);
      try {
        // Query payments with receipt_path IS NOT NULL
        // Join with filings to get tax_type and period info
        let query = supabase
          .from("payments")
          .select(`
            id,
            user_id,
            filing_id,
            amount_kobo,
            currency,
            payment_method,
            reference,
            status,
            created_at,
            receipt_path,
            receipt_file_name,
            receipt_uploaded_at,
            verification_status,
            verified_by,
            verified_at,
            verification_notes,
            filings!inner (
              tax_type,
              period_start,
              period_end
            )
          `, { count: "exact" })
          .not("receipt_path", "is", null)
          .order("created_at", { ascending: false })
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

        if (statusFilter !== "all") {
          query = query.eq("verification_status", statusFilter);
        }

        const { data, error, count } = await query;

        if (error) throw error;

        // Map data to include filing info at top level
        const mapped = (data || []).map((p: any) => ({
          id: p.id,
          user_id: p.user_id,
          filing_id: p.filing_id,
          amount_kobo: p.amount_kobo,
          currency: p.currency,
          payment_method: p.payment_method,
          reference: p.reference,
          status: p.status,
          created_at: p.created_at,
          receipt_path: p.receipt_path,
          receipt_file_name: p.receipt_file_name,
          receipt_uploaded_at: p.receipt_uploaded_at,
          verification_status: p.verification_status,
          verified_by: p.verified_by,
          verified_at: p.verified_at,
          verification_notes: p.verification_notes,
          filing_tax_type: p.filings?.tax_type,
          filing_period_start: p.filings?.period_start,
          filing_period_end: p.filings?.period_end,
        }));

        setPayments(mapped);
        setTotalCount(count || 0);
      } catch (err) {
        console.error("Error fetching payments for verification:", err);
        toast({
          title: "Failed to load payments",
          description: "Please try again later.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    if (!rbacLoading && (isAdmin || isAuditor)) {
      fetchPayments();
    }
  }, [user, isAdmin, isAuditor, rbacLoading, page, statusFilter]);

  const getSignedReceiptUrl = async (receiptPath: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.storage
        .from("payment-receipts")
        .createSignedUrl(receiptPath, 3600); // 1 hour expiry

      if (error) throw error;
      return data.signedUrl;
    } catch (err) {
      console.error("Failed to get signed URL:", err);
      return null;
    }
  };

  const handleViewReceipt = async (payment: PaymentWithFiling) => {
    if (!payment.receipt_path) return;

    const url = await getSignedReceiptUrl(payment.receipt_path);
    if (url) {
      window.open(url, "_blank");
    } else {
      toast({
        title: "Failed to load receipt",
        description: "Could not generate download link.",
        variant: "destructive",
      });
    }
  };

  const openVerifyDialog = (payment: PaymentWithFiling, action: "verified" | "rejected") => {
    setVerifyTarget(payment);
    setVerifyAction(action);
    setVerifyNotes("");
  };

  const handleVerify = async () => {
    if (!verifyTarget) return;

    setVerifying(true);
    try {
      const { error } = await supabase.rpc("admin_verify_payment", {
        p_payment_id: verifyTarget.id,
        p_status: verifyAction,
        p_notes: verifyNotes || null,
        p_ip: null, // Server-side capture not available from client
        p_user_agent: navigator.userAgent,
      });

      if (error) throw error;

      // Trigger notification for payment verification
      if (verifyAction === "verified") {
        await NotificationTriggers.paymentVerified(
          verifyTarget.id,
          formatKoboToNgn(stringToKobo(verifyTarget.amount_kobo))
        );
      } else if (verifyAction === "rejected") {
        await NotificationTriggers.paymentRejected(
          verifyTarget.id,
          verifyNotes || "Your payment could not be verified."
        );
      }

      toast({
        title: verifyAction === "verified" ? "Payment verified" : "Payment rejected",
        description: `Payment has been ${verifyAction}.`,
      });

      setVerifyTarget(null);
      // Refresh the list
      setPage(0);
    } catch (err: any) {
      console.error("Verification failed:", err);
      toast({
        title: "Verification failed",
        description: err.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setVerifying(false);
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  if (authLoading || rbacLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin && !isAuditor) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 pt-20 md:pt-28 pb-12">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Receipt className="h-5 w-5 text-primary" />
              </div>
              <h1 className="text-3xl font-bold">Payment Verification</h1>
            </div>
            <p className="text-muted-foreground">
              {isAdmin
                ? "Review and verify payment receipts"
                : "View payment receipts (read-only)"}
            </p>
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
                <div>
                  <CardTitle>Pending Receipts</CardTitle>
                  <CardDescription>{totalCount} payments with receipts</CardDescription>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Select
                    value={statusFilter}
                    onValueChange={(value) => {
                      setStatusFilter(value);
                      setPage(0);
                    }}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="verified">Verified</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : payments.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-1">No payments found</h3>
                  <p className="text-muted-foreground">
                    {statusFilter !== "all"
                      ? "Try adjusting your filters"
                      : "No payments with receipts uploaded yet"}
                  </p>
                </div>
              ) : (
                <>
                  <ScrollArea className="w-full">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Tax Type</TableHead>
                          <TableHead>Period</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Reference</TableHead>
                          <TableHead>Receipt</TableHead>
                          <TableHead>Status</TableHead>
                          {isAdmin && <TableHead>Actions</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payments.map((payment) => {
                          const StatusIcon = verificationStatusIcons[payment.verification_status] || Clock;

                          return (
                            <TableRow key={payment.id}>
                              <TableCell className="whitespace-nowrap">
                                <span className="text-sm font-mono">
                                  {format(new Date(payment.created_at), "yyyy-MM-dd")}
                                </span>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {payment.filing_tax_type}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm">
                                {payment.filing_period_start && payment.filing_period_end && (
                                  <>
                                    {format(new Date(payment.filing_period_start), "MMM yyyy")} -{" "}
                                    {format(new Date(payment.filing_period_end), "MMM yyyy")}
                                  </>
                                )}
                              </TableCell>
                              <TableCell className="font-mono font-semibold">
                                {formatKoboToNgn(stringToKobo(payment.amount_kobo))}
                              </TableCell>
                              <TableCell>
                                <code className="text-xs bg-muted px-2 py-1 rounded">
                                  {payment.reference || "—"}
                                </code>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewReceipt(payment)}
                                  className="text-primary"
                                >
                                  <ExternalLink className="h-4 w-4 mr-1" />
                                  View
                                </Button>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={verificationStatusColors[payment.verification_status]}
                                >
                                  <StatusIcon className="h-3 w-3 mr-1" />
                                  {payment.verification_status}
                                </Badge>
                              </TableCell>
                              {isAdmin && (
                                <TableCell>
                                  {payment.verification_status === "pending" && (
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-green-600 hover:text-green-700"
                                        onClick={() => openVerifyDialog(payment, "verified")}
                                      >
                                        <CheckCircle className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-red-600 hover:text-red-700"
                                        onClick={() => openVerifyDialog(payment, "rejected")}
                                      >
                                        <XCircle className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  )}
                                  {payment.verification_status !== "pending" && payment.verified_at && (
                                    <span className="text-xs text-muted-foreground">
                                      {format(new Date(payment.verified_at), "MMM d, yyyy")}
                                    </span>
                                  )}
                                </TableCell>
                              )}
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </ScrollArea>

                  {/* Pagination */}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Showing {page * PAGE_SIZE + 1} - {Math.min((page + 1) * PAGE_SIZE, totalCount)} of{" "}
                      {totalCount}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                        disabled={page === 0}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => p + 1)}
                        disabled={page >= totalPages - 1}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />

      {/* Verification Dialog */}
      <Dialog open={!!verifyTarget} onOpenChange={(open) => !open && setVerifyTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {verifyAction === "verified" ? "Verify Payment" : "Reject Payment"}
            </DialogTitle>
            <DialogDescription>
              {verifyAction === "verified"
                ? "Confirm that this payment receipt is valid."
                : "Reject this payment receipt with a reason."}
            </DialogDescription>
          </DialogHeader>

          {verifyTarget && (
            <div className="space-y-4 py-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="text-sm">
                  <span className="text-muted-foreground">Amount:</span>{" "}
                  <span className="font-mono font-semibold">
                    {formatKoboToNgn(stringToKobo(verifyTarget.amount_kobo))}
                  </span>
                </p>
                <p className="text-sm">
                  <span className="text-muted-foreground">Reference:</span>{" "}
                  <code className="bg-muted px-2 py-0.5 rounded">
                    {verifyTarget.reference || "—"}
                  </code>
                </p>
                <p className="text-sm">
                  <span className="text-muted-foreground">Uploaded:</span>{" "}
                  {verifyTarget.receipt_uploaded_at
                    ? format(new Date(verifyTarget.receipt_uploaded_at), "MMM d, yyyy 'at' h:mm a")
                    : "Unknown"}
                </p>
              </div>

              <div>
                <Label htmlFor="verification-notes">
                  Notes {verifyAction === "rejected" && "(recommended)"}
                </Label>
                <Textarea
                  id="verification-notes"
                  placeholder={
                    verifyAction === "rejected"
                      ? "Reason for rejection..."
                      : "Optional verification notes..."
                  }
                  value={verifyNotes}
                  onChange={(e) => setVerifyNotes(e.target.value)}
                  className="mt-1"
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setVerifyTarget(null)} disabled={verifying}>
              Cancel
            </Button>
            <Button
              onClick={handleVerify}
              disabled={verifying}
              className={verifyAction === "rejected" ? "bg-red-600 hover:bg-red-700" : ""}
            >
              {verifying && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {verifyAction === "verified" ? "Verify" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
