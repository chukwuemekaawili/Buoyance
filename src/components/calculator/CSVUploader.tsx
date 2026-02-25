import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { categorizeTransaction } from "@/lib/categorizationEngine";
import { Upload, Loader2, FileSpreadsheet, CheckCircle2 } from 'lucide-react';

interface CSVUploaderProps {
    type: 'income' | 'expense';
    onSuccess: () => void;
    children?: React.ReactNode;
}

interface ParsedRow {
    date: string;
    description: string;
    amount_kobo: string;
    category: string;
    is_valid: boolean;
}

export function CSVUploader({ type, onSuccess, children }: CSVUploaderProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);

    const { user } = useAuth();
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const resetState = () => {
        setParsedRows([]);
        setIsProcessing(false);
        setIsSaving(false);
    };

    const handleOpenChange = (open: boolean) => {
        setIsOpen(open);
        if (!open) resetState();
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsProcessing(true);

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                try {
                    const rows: ParsedRow[] = [];

                    results.data.forEach((r: any) => {
                        // Fuzzy match column headers
                        const keys = Object.keys(r);
                        const dateKey = keys.find(k => k.toLowerCase().includes('date')) || keys[0];
                        const descKey = keys.find(k => k.toLowerCase().includes('desc') || k.toLowerCase().includes('narration') || k.toLowerCase().includes('memo'));
                        const amountKey = keys.find(k => k.toLowerCase().includes('amount') || k.toLowerCase().includes('value') || (type === 'income' ? k.toLowerCase().includes('credit') : k.toLowerCase().includes('debit')));

                        if (!dateKey || !descKey || !amountKey) return;

                        const rawAmount = String(r[amountKey]).replace(/[^0-9.-]+/g, "");
                        const numAmount = parseFloat(rawAmount);
                        if (isNaN(numAmount) || numAmount === 0) return;

                        // Only pick positive numbers for income, or negative for expenses (or absolute values if it's strictly a debit/credit column)
                        // Handle variations: sometimes absolute amounts are provided, sometimes signed
                        const absAmount = Math.abs(numAmount);

                        // Map to NTA 2025 category using the AI/Regex Categorization Engine
                        const categoryMatch = categorizeTransaction(String(r[descKey]), absAmount * 100, type === 'expense');

                        rows.push({
                            date: r[dateKey],
                            description: String(r[descKey]),
                            amount_kobo: Math.round(absAmount * 100).toString(),
                            category: categoryMatch.category,
                            is_valid: true
                        });
                    });

                    setParsedRows(rows);
                } catch (err) {
                    toast({ title: 'Error parsing CSV', description: String(err), variant: 'destructive' });
                } finally {
                    setIsProcessing(false);
                }
            },
            error: (error) => {
                toast({ title: 'CSV Error', description: error.message, variant: 'destructive' });
                setIsProcessing(false);
            }
        });
    };

    const handleSave = async () => {
        if (!user || parsedRows.length === 0) return;

        setIsSaving(true);
        try {
            const dbTable = type === 'income' ? 'incomes' : 'expenses';

            const insertPayload = parsedRows.map(row => {
                const base = {
                    user_id: user.id,
                    date: new Date(row.date).toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
                    amount_kobo: row.amount_kobo,
                    category: row.category,
                    archived: false,
                };

                if (type === 'income') {
                    return {
                        ...base,
                        source: row.description, // 'source' is the description column counterpart in incomes
                        description: row.description,
                        tax_exempt: false,
                        vatable: false,
                        wht_deducted: false
                    };
                } else {
                    return {
                        ...base,
                        description: row.description,
                        deductible: true, // Optimistic default, user should review
                        vatable: false,
                    };
                }
            });

            const { error } = await supabase.from(dbTable).insert(insertPayload);

            if (error) throw error;

            toast({
                title: 'Bulk Import Successful',
                description: `Successfully injected ${parsedRows.length} ${type} records into the ledger.`
            });

            onSuccess();
            setIsOpen(false);
            resetState();

        } catch (err: any) {
            toast({ title: 'Import Failed', description: err.message, variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                {children || (
                    <Button variant="outline">
                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                        Import CSV
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5 text-primary" />
                        Bulk Import {type === 'income' ? 'Incomes' : 'Expenses'}
                    </DialogTitle>
                    <DialogDescription>
                        Upload a CSV exported from your bank or counting software. We will automatically map the columns and categorize transactions.
                    </DialogDescription>
                </DialogHeader>

                {parsedRows.length === 0 ? (
                    <div
                        className="border-2 border-dashed border-primary/20 rounded-xl p-12 text-center bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer mt-4"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept=".csv"
                            onChange={handleFileUpload}
                        />
                        {isProcessing ? (
                            <>
                                <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary mb-3" />
                                <p className="font-medium">Parsing CSV...</p>
                            </>
                        ) : (
                            <>
                                <Upload className="h-12 w-12 mx-auto text-primary/40 mb-3" />
                                <p className="font-medium text-lg">Click to select a .csv file</p>
                                <p className="text-sm text-muted-foreground mt-1">Headers should include Date, Description, and Amount</p>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="mt-4 space-y-4">
                        <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                            <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                                <CheckCircle2 className="h-5 w-5" />
                                <span className="font-medium">Found {parsedRows.length} valid rows</span>
                            </div>
                            <Button variant="outline" size="sm" onClick={resetState}>Upload Different File</Button>
                        </div>

                        <div className="border rounded-md">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted text-muted-foreground">
                                    <tr>
                                        <th className="px-4 py-3 font-medium">Date</th>
                                        <th className="px-4 py-3 font-medium">Description</th>
                                        <th className="px-4 py-3 font-medium text-right">Amount (₦)</th>
                                        <th className="px-4 py-3 font-medium">Auto-Category</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {parsedRows.slice(0, 5).map((row, i) => (
                                        <tr key={i} className="bg-background">
                                            <td className="px-4 py-3 truncate max-w-[100px]">{row.date}</td>
                                            <td className="px-4 py-3 truncate max-w-[200px]" title={row.description}>{row.description}</td>
                                            <td className="px-4 py-3 text-right font-mono">
                                                {(parseInt(row.amount_kobo) / 100).toLocaleString('en-NG')}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="px-2 py-1 bg-secondary/10 text-secondary rounded-full text-xs">
                                                    {row.category}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {parsedRows.length > 5 && (
                                        <tr>
                                            <td colSpan={4} className="px-4 py-3 text-center text-muted-foreground text-xs italic bg-muted/30">
                                                ... and {parsedRows.length - 5} more rows
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <DialogFooter className="mt-6">
                            <Button variant="ghost" onClick={() => handleOpenChange(false)}>Cancel</Button>
                            <Button onClick={handleSave} disabled={isSaving || parsedRows.length === 0}>
                                {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 mr-2" />}
                                Confirm & Import {parsedRows.length} Records
                            </Button>
                        </DialogFooter>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
