import { useState, useEffect } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, FileText, Send, Download, Loader2 } from "lucide-react";
import { calculateInvoiceTotals, type LineItem } from "@/lib/invoiceGenerator";
import { useToast } from "@/hooks/use-toast";
import { generateInvoicePDF } from "@/lib/invoicePdfGenerator";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface InvoiceRecord {
    id: string;
    invoice_number: string;
    client_name: string;
    issue_date: string;
    total_amount_kobo: number;
    payment_status: string;
}

function InvoicingContent() {
    const { toast } = useToast();
    const { user } = useAuth();
    const [saving, setSaving] = useState(false);
    const [clientName, setClientName] = useState("");
    const [clientTin, setClientTin] = useState("");
    const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
    const [dueDate, setDueDate] = useState("");
    const [vatRate, setVatRate] = useState("7.5");
    const [whtRate, setWhtRate] = useState("0");
    const [lineItems, setLineItems] = useState<LineItem[]>([
        { description: '', quantity: 1, unit_price_kobo: 0, amount_kobo: 0 },
    ]);
    const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
    const [loadingInvoices, setLoadingInvoices] = useState(true);

    // Load existing invoices from Supabase
    useEffect(() => {
        if (!user) return;
        (async () => {
            try {
                const { data, error } = await supabase
                    .from('invoices' as any)
                    .select('id, invoice_number, client_name, issue_date, total_amount_kobo, payment_status')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false });
                if (error) throw error;
                setInvoices((data || []) as InvoiceRecord[]);
            } catch {
                // Table may not exist yet - show empty list
                setInvoices([]);
            } finally {
                setLoadingInvoices(false);
            }
        })();
    }, [user]);

    const addLineItem = () => {
        setLineItems([...lineItems, { description: '', quantity: 1, unit_price_kobo: 0, amount_kobo: 0 }]);
    };

    const removeLineItem = (index: number) => {
        setLineItems(lineItems.filter((_, i) => i !== index));
    };

    const updateLineItem = (index: number, field: keyof LineItem, value: string) => {
        const updated = [...lineItems];
        if (field === 'description') {
            updated[index].description = value;
        } else if (field === 'quantity') {
            updated[index].quantity = parseInt(value) || 0;
        } else if (field === 'unit_price_kobo') {
            updated[index].unit_price_kobo = Math.round(parseFloat(value) * 100) || 0;
        }
        updated[index].amount_kobo = updated[index].quantity * updated[index].unit_price_kobo;
        setLineItems(updated);
    };

    const vatRateNum = parseFloat(vatRate) / 100;
    const whtRateNum = parseFloat(whtRate) / 100;
    const totals = calculateInvoiceTotals(lineItems, vatRateNum, whtRateNum);

    const formatNgn = (kobo: number) => `₦${(kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

    const generateInvoiceNumber = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        const rand = (n: number) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
        return `BUO-${rand(6)}`;
    };

    const createInvoice = async () => {
        if (!user || !clientName || totals.subtotal_kobo === 0) return;
        setSaving(true);

        try {
            const invoiceNumber = generateInvoiceNumber();
            const row = {
                user_id: user.id,
                invoice_number: invoiceNumber,
                client_name: clientName,
                client_tin: clientTin || null,
                issue_date: issueDate,
                due_date: dueDate || null,
                subtotal_kobo: totals.subtotal_kobo,
                vat_rate: parseFloat(vatRate),
                vat_amount_kobo: totals.vat_amount_kobo,
                wht_rate: parseFloat(whtRate),
                wht_amount_kobo: totals.wht_amount_kobo,
                total_amount_kobo: totals.total_amount_kobo,
                payment_status: 'unpaid',
                line_items: lineItems.filter(li => li.description && li.amount_kobo > 0),
            };

            const { data, error } = await supabase.from('invoices' as any).insert(row).select().single();
            if (error) throw error;

            setInvoices(prev => [data as InvoiceRecord, ...prev]);
            // Reset form
            setClientName("");
            setClientTin("");
            setDueDate("");
            setLineItems([{ description: '', quantity: 1, unit_price_kobo: 0, amount_kobo: 0 }]);

            toast({
                title: "Invoice Created!",
                description: `Invoice ${invoiceNumber} for ${clientName} — ${formatNgn(totals.total_amount_kobo)}`,
            });
        } catch (err: any) {
            toast({ title: "Failed to create invoice", description: err.message || String(err), variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Header />
            <main className="flex-grow pt-20 md:pt-28 pb-16">
                <div className="container mx-auto px-4 md:px-6 max-w-6xl">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-foreground">Invoicing</h1>
                        <p className="text-muted-foreground mt-2">Create professional invoices with auto-calculated VAT and WHT.</p>
                    </div>

                    <Tabs defaultValue="create" className="space-y-6">
                        <TabsList>
                            <TabsTrigger value="create">Create Invoice</TabsTrigger>
                            <TabsTrigger value="history">Invoice History ({invoices.length})</TabsTrigger>
                        </TabsList>

                        <TabsContent value="create">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Form */}
                                <div className="lg:col-span-2 space-y-6">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Client Details</CardTitle>
                                        </CardHeader>
                                        <CardContent className="grid grid-cols-2 gap-4">
                                            <div>
                                                <Label>Client Name *</Label>
                                                <Input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Company name" />
                                            </div>
                                            <div>
                                                <Label>Client TIN</Label>
                                                <Input value={clientTin} onChange={e => setClientTin(e.target.value)} placeholder="Optional" />
                                            </div>
                                            <div>
                                                <Label>Issue Date</Label>
                                                <Input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} />
                                            </div>
                                            <div>
                                                <Label>Due Date</Label>
                                                <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Line Items</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-3">
                                                {lineItems.map((item, i) => (
                                                    <div key={i} className="grid grid-cols-12 gap-2 items-end">
                                                        <div className="col-span-5">
                                                            {i === 0 && <Label className="text-xs">Description</Label>}
                                                            <Input value={item.description} onChange={e => updateLineItem(i, 'description', e.target.value)} placeholder="Service/product" />
                                                        </div>
                                                        <div className="col-span-2">
                                                            {i === 0 && <Label className="text-xs">Qty</Label>}
                                                            <Input type="number" value={item.quantity} onChange={e => updateLineItem(i, 'quantity', e.target.value)} min="1" />
                                                        </div>
                                                        <div className="col-span-3">
                                                            {i === 0 && <Label className="text-xs">Unit Price (₦)</Label>}
                                                            <Input type="number" value={item.unit_price_kobo / 100 || ''} onChange={e => updateLineItem(i, 'unit_price_kobo', e.target.value)} placeholder="0.00" />
                                                        </div>
                                                        <div className="col-span-1 text-right text-sm font-medium pt-1">
                                                            {formatNgn(item.amount_kobo)}
                                                        </div>
                                                        <div className="col-span-1">
                                                            {lineItems.length > 1 && (
                                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeLineItem(i)}>
                                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <Button variant="outline" className="mt-4" onClick={addLineItem}>
                                                <Plus className="h-4 w-4 mr-2" /> Add Item
                                            </Button>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Tax Settings</CardTitle>
                                        </CardHeader>
                                        <CardContent className="grid grid-cols-2 gap-4">
                                            <div>
                                                <Label>VAT Rate (%)</Label>
                                                <Select value={vatRate} onValueChange={setVatRate}>
                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="0">0% (Exempt)</SelectItem>
                                                        <SelectItem value="7.5">7.5% (Standard)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div>
                                                <Label>WHT Rate (%)</Label>
                                                <Select value={whtRate} onValueChange={setWhtRate}>
                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="0">0% (None)</SelectItem>
                                                        <SelectItem value="2.5">2.5% (Construction)</SelectItem>
                                                        <SelectItem value="5">5% (Contract/Supply)</SelectItem>
                                                        <SelectItem value="10">10% (Professional)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Summary */}
                                <div className="space-y-6">
                                    <Card className="sticky top-28">
                                        <CardHeader>
                                            <CardTitle>Invoice Summary</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">Subtotal</span>
                                                <span className="font-medium">{formatNgn(totals.subtotal_kobo)}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">VAT ({vatRate}%)</span>
                                                <span className="font-medium text-blue-600">+{formatNgn(totals.vat_amount_kobo)}</span>
                                            </div>
                                            {whtRateNum > 0 && (
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-muted-foreground">WHT ({whtRate}%)</span>
                                                    <span className="font-medium text-red-600">-{formatNgn(totals.wht_amount_kobo)}</span>
                                                </div>
                                            )}
                                            <div className="border-t pt-3 flex justify-between">
                                                <span className="font-semibold">Total</span>
                                                <span className="text-xl font-bold">{formatNgn(totals.total_amount_kobo)}</span>
                                            </div>
                                            <div className="space-y-2 pt-4">
                                                <Button className="w-full" disabled={!clientName || totals.subtotal_kobo === 0 || saving} onClick={createInvoice}>
                                                    {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                                                    Create Invoice
                                                </Button>
                                                <Button variant="outline" className="w-full" onClick={() => {
                                                    const fakeNumber = `BUO-DRAFT-${Math.floor(Math.random() * 1000)}`;
                                                    generateInvoicePDF({
                                                        invoice_number: fakeNumber,
                                                        client_name: clientName || "Draft Invoice",
                                                        client_tin: clientTin,
                                                        issue_date: issueDate,
                                                        due_date: dueDate,
                                                        subtotal_kobo: totals.subtotal_kobo,
                                                        vat_rate: parseFloat(vatRate),
                                                        vat_amount_kobo: totals.vat_amount_kobo,
                                                        wht_rate: parseFloat(whtRate),
                                                        wht_amount_kobo: totals.wht_amount_kobo,
                                                        total_amount_kobo: totals.total_amount_kobo,
                                                        line_items: lineItems.filter(li => li.description && li.amount_kobo > 0),
                                                    });
                                                }}>
                                                    <Download className="h-4 w-4 mr-2" /> Download PDF
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="history">
                            <Card>
                                <CardContent className="pt-6">
                                    {loadingInvoices ? (
                                        <div className="flex items-center justify-center py-12">
                                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                        </div>
                                    ) : invoices.length === 0 ? (
                                        <div className="text-center py-12 text-muted-foreground">
                                            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                            <p>No invoices yet. Create your first one!</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {invoices.map(inv => (
                                                <div key={inv.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                                                    <div className="flex items-center gap-3">
                                                        <FileText className="h-5 w-5 text-primary" />
                                                        <div>
                                                            <p className="font-medium">{inv.invoice_number}</p>
                                                            <p className="text-sm text-muted-foreground">{inv.client_name} • {inv.issue_date}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-medium">{formatNgn(inv.total_amount_kobo)}</span>
                                                        <Badge variant={inv.payment_status === 'paid' ? 'default' : inv.payment_status === 'overdue' ? 'destructive' : 'secondary'}>
                                                            {inv.payment_status}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </main>
            <Footer />
        </div>
    );
}

export default function Invoicing() {
    return (
        <AuthGuard>
            <InvoicingContent />
        </AuthGuard>
    );
}
