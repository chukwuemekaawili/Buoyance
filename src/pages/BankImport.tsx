import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, RefreshCw, CheckCircle2, XCircle, ArrowRight, Landmark, Filter } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { categorizeTransaction } from "@/lib/categorizationEngine";

interface ImportedTransaction {
    id: string;
    bank_connection_id: string;
    raw_description: string;
    amount_kobo: number;
    transaction_date: string;
    suggested_category: string | null;
    confidence_score: number | null;
    status: "pending" | "approved" | "dismissed";
    bank_name?: string;
}

export default function BankImport() {
    const { user, loading: authLoading } = useAuth();
    const { activeWorkspace } = useWorkspace();
    const { toast } = useToast();
    const navigate = useNavigate();

    const [transactions, setTransactions] = useState<ImportedTransaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterBank, setFilterBank] = useState<string>("all");
    const [uniqueBanks, setUniqueBanks] = useState<{ id: string, name: string }[]>([]);

    // Action states
    const [isProcessing, setIsProcessing] = useState<string | null>(null);

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            navigate("/signin");
            return;
        }
        fetchPendingTransactions();
    }, [user, authLoading, activeWorkspace]);

    const fetchPendingTransactions = async () => {
        if (!activeWorkspace) return;
        setIsLoading(true);

        try {
            const { data, error } = await supabase
                .from("imported_transactions")
                .select(`
          *,
          bank_connections ( id, account_name, provider )
        `)
                .eq("workspace_id", activeWorkspace.id)
                .eq("status", "pending")
                .order("transaction_date", { ascending: false });

            if (error) throw error;

            // Extract unique banks for filter dropdown
            const banksMap = new Map();
            const mappedTxs = (data || []).map((tx: any) => {
                const bconn = tx.bank_connections;
                if (bconn) {
                    banksMap.set(bconn.id, bconn.account_name || bconn.provider);
                }
                return {
                    ...tx,
                    bank_name: bconn ? (bconn.account_name || bconn.provider) : 'Unknown Bank'
                };
            });

            setUniqueBanks(Array.from(banksMap, ([id, name]) => ({ id, name })));
            setTransactions(mappedTxs);
        } catch (err: any) {
            toast({
                title: "Failed to load un-reconciled items",
                description: err.message,
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleReconcile = async (tx: ImportedTransaction, action: "approve" | "dismiss") => {
        if (!activeWorkspace || !user) return;
        setIsProcessing(tx.id);

        try {
            if (action === "dismiss") {
                const { error } = await supabase
                    .from("imported_transactions")
                    .update({ status: "dismissed" })
                    .eq("id", tx.id);
                if (error) throw error;
                toast({ title: "Transaction dismissed", description: "Removed from reconciliation queue." });
            }

            else if (action === "approve") {
                // Run it through the categorization engine one final time to ensure standard tagging natively
                const isExpense = tx.amount_kobo < 0;
                const categoryMatch = categorizeTransaction(tx.raw_description, Math.abs(tx.amount_kobo), isExpense);

                const ledgerTable = isExpense ? "expenses" : "incomes";
                const payload = {
                    workspace_id: activeWorkspace.id,
                    user_id: user.id,
                    amount_kobo: Math.abs(tx.amount_kobo).toString(),
                    category: tx.suggested_category || categoryMatch.category,
                    date: tx.transaction_date,
                    description: tx.raw_description,
                    archived: false,
                };

                // Insert into core ledger
                const { data: insertedRec, error: insertErr } = await supabase
                    .from(ledgerTable)
                    .insert(payload)
                    .select()
                    .single();

                if (insertErr) throw insertErr;

                // Update the imported_transactions bridge linking the two explicitly
                const { error: bridgeErr } = await supabase
                    .from("imported_transactions")
                    .update({
                        status: "approved",
                        reconciled_ledger_type: isExpense ? "expense" : "income",
                        reconciled_ledger_id: insertedRec.id
                    })
                    .eq("id", tx.id);

                if (bridgeErr) throw bridgeErr;

                toast({ title: "Reconciled", description: `Added to your ${ledgerTable} ledger.` });
            }

            // Slice out of local state
            setTransactions(prev => prev.filter(t => t.id !== tx.id));
        } catch (err: any) {
            toast({
                title: "Reconciliation Failed",
                description: err.message,
                variant: "destructive"
            });
        } finally {
            setIsProcessing(null);
        }
    };

    // derived filtered state
    const visibleTransactions = filterBank === "all"
        ? transactions
        : transactions.filter(t => t.bank_connection_id === filterBank);

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Header />
            <main className="flex-grow pt-20 md:pt-28 pb-16">
                <div className="container mx-auto px-4 md:px-6 max-w-5xl">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                        <div>
                            <Link to="/dashboard" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to Dashboard
                            </Link>
                            <h1 className="text-3xl font-bold flex items-center gap-2 text-foreground">
                                <ArrowRight className="h-6 w-6 text-primary" />
                                Bank Reconciliation
                            </h1>
                            <p className="text-muted-foreground mt-1">
                                Map unassigned transactions from your connected banks into the permanent tax ledgers.
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <Select value={filterBank} onValueChange={setFilterBank}>
                                <SelectTrigger className="w-[180px]">
                                    <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                                    <SelectValue placeholder="All Connections" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Connections</SelectItem>
                                    {uniqueBanks.map(b => (
                                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button variant="outline" onClick={fetchPendingTransactions} disabled={isLoading}>
                                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                                Refresh
                            </Button>
                        </div>
                    </div>

                    <div className="grid gap-6">
                        {isLoading ? (
                            <Card className="p-12 flex flex-col items-center justify-center bg-muted/20 border-border">
                                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                                <p className="text-muted-foreground">Pulling queue arrays from the database...</p>
                            </Card>
                        ) : visibleTransactions.length === 0 ? (
                            <Card className="p-12 text-center shadow-none border-dashed bg-muted/10">
                                <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500/50" />
                                <h3 className="text-xl font-semibold mb-2">You're all caught up!</h3>
                                <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-6">
                                    There are zero pending Bank transactions left to reconcile for this workspace. Use the Sync function on the Connections page to pull new batches.
                                </p>
                                <Button variant="outline" asChild>
                                    <Link to="/bank-connections">Manage Bank Connections</Link>
                                </Button>
                            </Card>
                        ) : (
                            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
                                <div className="grid grid-cols-12 gap-4 p-4 font-semibold text-sm border-b bg-muted/50 text-muted-foreground">
                                    <div className="col-span-2">Date</div>
                                    <div className="col-span-4">Raw Bank Description</div>
                                    <div className="col-span-2 text-right">Amount</div>
                                    <div className="col-span-2">AI Guess</div>
                                    <div className="col-span-2 text-center">Action</div>
                                </div>

                                <ScrollArea className="h-[60vh]">
                                    <div className="flex flex-col">
                                        {visibleTransactions.map((tx) => {
                                            const isExpense = tx.amount_kobo < 0;
                                            const displayAmount = Math.abs(tx.amount_kobo) / 100;

                                            return (
                                                <div key={tx.id} className="grid grid-cols-12 gap-4 p-4 border-b last:border-0 hover:bg-muted/10 items-center transition-colors">
                                                    {/* Date & Source */}
                                                    <div className="col-span-2 flex flex-col">
                                                        <span className="text-sm font-medium">{new Date(tx.transaction_date).toLocaleDateString()}</span>
                                                        <span className="text-xs text-muted-foreground flex items-center gap-1 mt-1 truncate">
                                                            <Landmark className="h-3 w-3" />
                                                            {tx.bank_name}
                                                        </span>
                                                    </div>

                                                    {/* Description */}
                                                    <div className="col-span-4 flex items-center">
                                                        <span className="text-sm line-clamp-2" title={tx.raw_description}>
                                                            {tx.raw_description}
                                                        </span>
                                                    </div>

                                                    {/* Amount */}
                                                    <div className={`col-span-2 text-right font-mono font-medium ${isExpense ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                        {isExpense ? '- ' : '+ '}₦{displayAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </div>

                                                    {/* Categorization Pre-fill */}
                                                    <div className="col-span-2">
                                                        <Badge variant={isExpense ? "outline" : "secondary"} className="text-xs">
                                                            {tx.suggested_category || categorizeTransaction(tx.raw_description, Math.abs(tx.amount_kobo), isExpense).category}
                                                        </Badge>
                                                    </div>

                                                    {/* Decision Actions */}
                                                    <div className="col-span-2 flex justify-end gap-2 pr-2">
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                            onClick={() => handleReconcile(tx, "dismiss")}
                                                            disabled={isProcessing === tx.id}
                                                            title="Dismiss / Ignore"
                                                        >
                                                            <XCircle className="h-5 w-5" />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="default"
                                                            className="h-8 gap-1 pl-2 pr-3 bg-primary hover:bg-primary/90 text-primary-foreground"
                                                            onClick={() => handleReconcile(tx, "approve")}
                                                            disabled={isProcessing === tx.id}
                                                        >
                                                            {isProcessing === tx.id ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <CheckCircle2 className="h-4 w-4" />
                                                            )}
                                                            Accept
                                                        </Button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </ScrollArea>
                            </div>
                        )}
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
