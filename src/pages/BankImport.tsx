import { useState, useCallback } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useDropzone } from "react-dropzone";
import { Upload, FileSpreadsheet, CheckCircle, ArrowRight, Loader2, Check, X } from "lucide-react";
import { parseStatementFile, type ParseResult, type ParsedTransaction } from "@/lib/parsers/bankStatementParser";
import { categorizeTransaction, getCategoryIcon } from "@/lib/categorizationEngine";

function BankImportContent() {
    const { toast } = useToast();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [parseResult, setParseResult] = useState<ParseResult | null>(null);
    const [categorized, setCategorized] = useState<Map<number, { category: string; confidence: number; tax_deductible: boolean }>>(new Map());
    const [approved, setApproved] = useState<Set<number>>(new Set());

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (!file) return;

        setLoading(true);
        setParseResult(null);
        setCategorized(new Map());
        setApproved(new Set());

        try {
            const result = await parseStatementFile(file);
            setParseResult(result);

            // Auto-categorize all transactions
            const cats = new Map<number, { category: string; confidence: number; tax_deductible: boolean }>();
            result.transactions.forEach((txn, i) => {
                const suggestion = categorizeTransaction(txn.description, txn.amount_kobo, txn.debit_credit === 'debit');
                cats.set(i, { category: suggestion.category, confidence: suggestion.confidence, tax_deductible: suggestion.tax_deductible });
            });
            setCategorized(cats);

            toast({
                title: `${result.transactions.length} transactions imported!`,
                description: `Bank detected: ${result.bank_detected}. Review and approve below.`,
            });
        } catch (err) {
            toast({ title: "Parse Failed", description: String(err), variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'text/csv': ['.csv'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'application/vnd.ms-excel': ['.xls'],
        },
        maxFiles: 1,
    });

    const toggleApprove = (i: number) => {
        setApproved(prev => {
            const next = new Set(prev);
            if (next.has(i)) next.delete(i);
            else next.add(i);
            return next;
        });
    };

    const approveAll = () => {
        if (parseResult) {
            setApproved(new Set(parseResult.transactions.map((_, i) => i)));
        }
    };

    const saveApproved = async () => {
        if (!user || !parseResult || approved.size === 0) return;
        setSaving(true);

        try {
            const rows = Array.from(approved).map(i => {
                const txn = parseResult.transactions[i];
                const cat = categorized.get(i);
                return {
                    user_id: user.id,
                    source_type: 'bank_statement',
                    transaction_date: txn.date || null,
                    description: txn.description,
                    amount_kobo: txn.amount_kobo,
                    debit_credit: txn.debit_credit,
                    raw_data: { bank: parseResult.bank_detected, balance_kobo: txn.balance_kobo },
                    confidence_score: cat?.confidence ?? 0,
                    category_suggestion: cat?.category ?? 'uncategorized',
                    status: 'approved',
                    approved_at: new Date().toISOString(),
                };
            });

            const { error } = await supabase.from('imported_transactions' as any).insert(rows);
            if (error) throw error;

            toast({
                title: `${approved.size} transactions saved!`,
                description: "They're now available in your records.",
            });
            setParseResult(null);
            setCategorized(new Map());
            setApproved(new Set());
        } catch (err: any) {
            toast({ title: "Save Failed", description: err.message || String(err), variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const formatNgn = (kobo: number) => `₦${(kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Header />
            <main className="flex-grow pt-20 md:pt-28 pb-16">
                <div className="container mx-auto px-4 md:px-6 max-w-6xl">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-foreground">Bank Statement Import</h1>
                        <p className="text-muted-foreground mt-2">
                            Upload your bank statement. We'll auto-detect the bank, parse transactions, and categorize them.
                        </p>
                    </div>

                    {/* Upload Area */}
                    {!parseResult && (
                        <Card>
                            <CardContent className="pt-6">
                                <div
                                    {...getRootProps()}
                                    className={`border-2 border-dashed rounded-lg p-16 text-center cursor-pointer transition-colors
                    ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/20 hover:border-primary/50'}`}
                                >
                                    <input {...getInputProps()} />
                                    {loading ? (
                                        <div className="space-y-3">
                                            <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
                                            <p className="text-sm text-muted-foreground">Parsing transactions...</p>
                                        </div>
                                    ) : (
                                        <>
                                            <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                            <p className="text-lg font-medium">Drop bank statement here</p>
                                            <p className="text-sm text-muted-foreground mt-2">Supports CSV and Excel files from GTBank, Access, UBA, and more</p>
                                        </>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Results */}
                    {parseResult && (
                        <>
                            {/* Summary */}
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
                                <Card>
                                    <CardHeader className="pb-2"><CardDescription>Transactions</CardDescription></CardHeader>
                                    <CardContent><p className="text-2xl font-bold">{parseResult.transactions.length}</p></CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="pb-2"><CardDescription>Bank Detected</CardDescription></CardHeader>
                                    <CardContent><p className="text-xl font-bold capitalize">{parseResult.bank_detected}</p></CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="pb-2"><CardDescription>Total Debits</CardDescription></CardHeader>
                                    <CardContent><p className="text-lg font-bold text-red-500">{formatNgn(parseResult.total_debits_kobo)}</p></CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="pb-2"><CardDescription>Total Credits</CardDescription></CardHeader>
                                    <CardContent><p className="text-lg font-bold text-green-600">{formatNgn(parseResult.total_credits_kobo)}</p></CardContent>
                                </Card>
                            </div>

                            {/* Controls */}
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex gap-3">
                                    <Button variant="outline" onClick={approveAll}>
                                        <CheckCircle className="h-4 w-4 mr-2" /> Approve All ({parseResult.transactions.length})
                                    </Button>
                                    <Button onClick={() => { setParseResult(null); setCategorized(new Map()); setApproved(new Set()); }}>
                                        <Upload className="h-4 w-4 mr-2" /> Upload New
                                    </Button>
                                </div>
                                <Button disabled={approved.size === 0 || saving} onClick={saveApproved}>
                                    {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ArrowRight className="h-4 w-4 mr-2" />}
                                    Save {approved.size} Transactions
                                </Button>
                            </div>

                            {/* Transaction List */}
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="space-y-2">
                                        {parseResult.transactions.map((txn, i) => {
                                            const cat = categorized.get(i);
                                            const isApproved = approved.has(i);
                                            return (
                                                <div key={i} className={`flex items-center justify-between p-3 rounded-lg transition-colors
                          ${isApproved ? 'bg-green-500/5 border border-green-500/20' : 'bg-muted/50'}`}>
                                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => toggleApprove(i)}>
                                                            {isApproved ? <Check className="h-4 w-4 text-green-600" /> : <div className="h-4 w-4 border rounded" />}
                                                        </Button>
                                                        <div className="min-w-0">
                                                            <p className="font-medium text-sm truncate">{txn.description || 'No description'}</p>
                                                            <p className="text-xs text-muted-foreground">{txn.date}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3 shrink-0">
                                                        {cat && (
                                                            <Badge variant="outline" className="text-xs">
                                                                {getCategoryIcon(cat.category)} {cat.category}
                                                                {cat.tax_deductible && <span className="ml-1 text-green-600">✓ deductible</span>}
                                                            </Badge>
                                                        )}
                                                        <span className={`font-medium text-sm ${txn.debit_credit === 'debit' ? 'text-red-500' : 'text-green-600'}`}>
                                                            {txn.debit_credit === 'debit' ? '-' : '+'}{formatNgn(txn.amount_kobo)}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        </>
                    )}
                </div>
            </main>
            <Footer />
        </div>
    );
}

export default function BankImport() {
    return (
        <AuthGuard>
            <BankImportContent />
        </AuthGuard>
    );
}
