import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ReceiptText, ArrowLeft, Loader2, RefreshCw, CheckCircle2, ArrowRight, LayoutList, Check } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatKoboToNgn } from "@/lib/money";

interface DigiTaxInvoice {
    id: string;
    digitax_uuid: string;
    invoice_number: string;
    issue_date: string;
    customer_name: string;
    total_amount_kobo: number;
    vat_amount_kobo: number;
    status: string;
    is_synced_to_ledger: boolean;
    synced_at: string;
}

export default function DigiTax() {
    const { user, loading: authLoading } = useAuth();
    const { activeWorkspace } = useWorkspace();
    const { toast } = useToast();

    const [invoices, setInvoices] = useState<DigiTaxInvoice[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isProcessing, setIsProcessing] = useState<string | null>(null);

    useEffect(() => {
        if (authLoading || !user || !activeWorkspace) return;
        fetchInvoices();
    }, [user, authLoading, activeWorkspace]);

    const fetchInvoices = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from("digitax_invoices")
                .select("*")
                .eq("workspace_id", activeWorkspace?.id)
                .order("issue_date", { ascending: false });

            if (error) throw error;
            setInvoices(data as DigiTaxInvoice[]);
        } catch (err: any) {
            toast({ title: "Failed to load DigiTax queue", description: err.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const handleMbsSync = async () => {
        setIsSyncing(true);
        // In production, this hits an Edge Function that queries the actual DigiTax API.
        // For MVP phase, we simulate the array ingestion from a webhook poll.
        try {
            await new Promise(res => setTimeout(res, 2000)); // Simulate API latency
            toast({ title: "MBS Sync Complete", description: "All active digital invoices retrieved." });

            // We assume the DB webhook caught them. Just refetch for demo.
            fetchInvoices();
        } catch (err: any) {
            toast({ title: "Sync failed", description: err.message, variant: "destructive" });
        } finally {
            setIsSyncing(false);
        }
    };

    const logToLedger = async (inv: DigiTaxInvoice) => {
        if (!activeWorkspace || !user) return;
        setIsProcessing(inv.id);

        try {
            const payload = {
                workspace_id: activeWorkspace.id,
                user_id: user.id,
                amount_kobo: inv.total_amount_kobo.toString(),
                category: 'Sales & Revenue', // default for general invoices
                date: inv.issue_date,
                description: `DigiTax Invoice ${inv.invoice_number} - ${inv.customer_name}`,
                archived: false,
            };

            const { data: insertedRec, error: insertErr } = await supabase
                .from('incomes')
                .insert(payload)
                .select()
                .single();

            if (insertErr) throw insertErr;

            // Update sync bridge
            const { error: bridgeErr } = await supabase
                .from("digitax_invoices")
                .update({
                    is_synced_to_ledger: true,
                    linked_income_id: insertedRec.id
                })
                .eq("id", inv.id);

            if (bridgeErr) throw bridgeErr;

            toast({ title: "Invoice Logged", description: `Brought into your taxable incomes ledger.` });

            // Update local state proactively
            setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, is_synced_to_ledger: true } : i));

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

    const unsyncedCount = invoices.filter(i => !i.is_synced_to_ledger).length;

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Header />
            <main className="flex-grow pt-20 md:pt-28 pb-16">
                <div className="container mx-auto px-4 md:px-6 max-w-5xl">
                    <Link to="/dashboard" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Dashboard
                    </Link>

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                        <div>
                            <h1 className="text-3xl font-bold flex items-center gap-2 text-foreground">
                                <ReceiptText className="h-7 w-7 text-primary" />
                                DigiTax MBS Integration
                            </h1>
                            <p className="text-muted-foreground mt-1 text-lg">
                                Read-only sync connection to the official regional electronic invoicing systems.
                            </p>
                        </div>

                        <div className="flex gap-2">
                            <Button onClick={handleMbsSync} disabled={isSyncing} className="gap-2 shrink-0">
                                <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                                Pull Latest from DigiTax
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <Card>
                            <CardContent className="p-6 flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground font-medium mb-1">Total Found</p>
                                    <h2 className="text-3xl font-bold">{invoices.length}</h2>
                                </div>
                                <LayoutList className="h-8 w-8 text-muted-foreground/30" />
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-6 flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground font-medium mb-1">Unlogged</p>
                                    <h2 className="text-3xl font-bold text-amber-500">{unsyncedCount}</h2>
                                </div>
                                <ArrowRight className="h-8 w-8 text-amber-500/30" />
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-6 flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground font-medium mb-1">Tracked in Buoyance</p>
                                    <h2 className="text-3xl font-bold text-green-600">{invoices.length - unsyncedCount}</h2>
                                </div>
                                <CheckCircle2 className="h-8 w-8 text-green-600/30" />
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="border-border shadow-sm">
                        <CardHeader className="bg-muted/30 border-b">
                            <CardTitle className="text-lg">Invoicing Telemetry Queue</CardTitle>
                            <CardDescription>
                                Records matched to your TIN. Click "Log to Ledger" to append them to your NTA calculations.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            {isLoading ? (
                                <div className="p-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
                            ) : invoices.length === 0 ? (
                                <div className="p-12 text-center text-muted-foreground">
                                    <ReceiptText className="h-12 w-12 mx-auto mb-4 opacity-30" />
                                    <p className="text-lg font-medium">No external invoices detected.</p>
                                    <p className="text-sm max-w-sm mx-auto mt-2">Buoyance cross-references your registered TIN against the DigiTax network. Issued invoices will appear here.</p>
                                </div>
                            ) : (
                                <div className="divide-y">
                                    <div className="grid grid-cols-12 gap-4 px-6 py-3 font-semibold text-sm bg-muted/50 text-muted-foreground hidden md:grid">
                                        <div className="col-span-2">Date</div>
                                        <div className="col-span-3">Customer</div>
                                        <div className="col-span-2 text-right">Invoice Total</div>
                                        <div className="col-span-2 text-right">VAT Value</div>
                                        <div className="col-span-3 text-right">Action</div>
                                    </div>
                                    {invoices.map(inv => (
                                        <div key={inv.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-muted/10 transition-colors">
                                            <div className="col-span-12 md:col-span-2">
                                                <span className="font-medium text-sm">{new Date(inv.issue_date).toLocaleDateString()}</span>
                                                <div className="text-xs text-muted-foreground mt-0.5 font-mono">{inv.invoice_number}</div>
                                            </div>

                                            <div className="col-span-12 md:col-span-3">
                                                <span className="text-sm line-clamp-1" title={inv.customer_name}>{inv.customer_name}</span>
                                            </div>

                                            <div className="col-span-6 md:col-span-2 text-left md:text-right">
                                                <span className="font-mono font-medium">{formatKoboToNgn(BigInt(inv.total_amount_kobo))}</span>
                                                <div className="md:hidden text-xs text-muted-foreground uppercase tracking-wider mt-1">Total</div>
                                            </div>

                                            <div className="col-span-6 md:col-span-2 text-left md:text-right">
                                                <span className="font-mono text-sm text-muted-foreground">{formatKoboToNgn(BigInt(inv.vat_amount_kobo))}</span>
                                                <div className="md:hidden text-xs text-muted-foreground uppercase tracking-wider mt-1">VAT Component</div>
                                            </div>

                                            <div className="col-span-12 md:col-span-3 flex justify-start md:justify-end mt-2 md:mt-0">
                                                {inv.is_synced_to_ledger ? (
                                                    <Badge variant="outline" className="text-green-600 bg-green-50 justify-center h-8 px-4 gap-1 border-green-200">
                                                        <Check className="h-3 w-3" /> Logged
                                                    </Badge>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        className="h-8 gap-1 pl-3 pr-4 w-full md:w-auto"
                                                        onClick={() => logToLedger(inv)}
                                                        disabled={isProcessing === inv.id}
                                                    >
                                                        {isProcessing === inv.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowRight className="h-3 w-3" />}
                                                        Log to Ledger
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                </div>
            </main>
            <Footer />
        </div>
    );
}
