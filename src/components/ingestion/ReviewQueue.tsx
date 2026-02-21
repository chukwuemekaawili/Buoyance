import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
    CheckCircle2,
    XCircle,
    ChevronDown,
    ChevronUp,
    ArrowUpDown,
    Loader2,
} from "lucide-react";
import { categorizeTransaction, getCategoryIcon, getAllCategories, type CategorySuggestion } from "@/lib/categorizationEngine";
import { formatKoboToNgn } from "@/lib/money";
import { useToast } from "@/hooks/use-toast";

export interface QueueTransaction {
    id: string;
    date: string;
    description: string;
    amount_kobo: number;
    debit_credit: "debit" | "credit";
    source: string; // e.g., "bank_import", "csv_upload"
}

interface ReviewItem extends QueueTransaction {
    suggestion: CategorySuggestion;
    overrideCategory: string | null;
    accepted: boolean | null; // null = pending, true = accepted, false = rejected
}

interface ReviewQueueProps {
    transactions: QueueTransaction[];
    onAccept: (items: Array<{ id: string; category: string; subcategory?: string; taxDeductible: boolean; vatApplicable: boolean }>) => void;
    onReject: (ids: string[]) => void;
}

export function ReviewQueue({ transactions, onAccept, onReject }: ReviewQueueProps) {
    const { toast } = useToast();
    const [sortField, setSortField] = useState<"date" | "amount" | "confidence">("confidence");
    const [sortAsc, setSortAsc] = useState(true);
    const [processing, setProcessing] = useState(false);

    const allCategories = getAllCategories();

    // Build review items with auto-categorization
    const [items, setItems] = useState<ReviewItem[]>(() =>
        transactions.map((txn) => {
            const suggestion = categorizeTransaction(txn.description, txn.amount_kobo, txn.debit_credit === "debit");
            return { ...txn, suggestion, overrideCategory: null, accepted: null };
        })
    );

    const pendingItems = items.filter((i) => i.accepted === null);
    const acceptedItems = items.filter((i) => i.accepted === true);
    const rejectedItems = items.filter((i) => i.accepted === false);

    const sorted = [...pendingItems].sort((a, b) => {
        let cmp = 0;
        if (sortField === "date") cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
        else if (sortField === "amount") cmp = a.amount_kobo - b.amount_kobo;
        else cmp = a.suggestion.confidence - b.suggestion.confidence;
        return sortAsc ? cmp : -cmp;
    });

    const toggleSort = (field: typeof sortField) => {
        if (sortField === field) setSortAsc(!sortAsc);
        else { setSortField(field); setSortAsc(true); }
    };

    const handleAcceptOne = (id: string) => {
        setItems((prev) => prev.map((i) => (i.id === id ? { ...i, accepted: true } : i)));
    };

    const handleRejectOne = (id: string) => {
        setItems((prev) => prev.map((i) => (i.id === id ? { ...i, accepted: false } : i)));
    };

    const handleOverrideCategory = (id: string, category: string) => {
        setItems((prev) =>
            prev.map((i) => (i.id === id ? { ...i, overrideCategory: category } : i))
        );
    };

    const handleAcceptAll = () => {
        setItems((prev) =>
            prev.map((i) => (i.accepted === null ? { ...i, accepted: true } : i))
        );
    };

    const handleSubmit = async () => {
        setProcessing(true);
        try {
            const toAccept = items
                .filter((i) => i.accepted === true)
                .map((i) => ({
                    id: i.id,
                    category: i.overrideCategory || i.suggestion.category,
                    subcategory: i.suggestion.subcategory,
                    taxDeductible: i.suggestion.tax_deductible,
                    vatApplicable: i.suggestion.vat_applicable,
                }));

            const toReject = items.filter((i) => i.accepted === false).map((i) => i.id);

            if (toAccept.length > 0) await onAccept(toAccept);
            if (toReject.length > 0) await onReject(toReject);

            toast({
                title: "Review complete",
                description: `${toAccept.length} accepted, ${toReject.length} rejected.`,
            });
        } catch (err: any) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        } finally {
            setProcessing(false);
        }
    };

    const getConfidenceBadge = (confidence: number) => {
        if (confidence >= 0.8) return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">High</Badge>;
        if (confidence >= 0.5) return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">Medium</Badge>;
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Low</Badge>;
    };

    return (
        <div className="space-y-4">
            {/* Summary Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-3 text-sm">
                    <span className="text-muted-foreground">{pendingItems.length} pending</span>
                    <span className="text-green-600">{acceptedItems.length} accepted</span>
                    <span className="text-red-600">{rejectedItems.length} rejected</span>
                </div>
                <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={handleAcceptAll} disabled={pendingItems.length === 0}>
                        <CheckCircle2 className="h-4 w-4 mr-1" /> Accept All
                    </Button>
                    <Button size="sm" onClick={handleSubmit} disabled={processing || (acceptedItems.length === 0 && rejectedItems.length === 0)}>
                        {processing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                        Submit Review ({acceptedItems.length + rejectedItems.length})
                    </Button>
                </div>
            </div>

            {/* Sort Controls */}
            <div className="flex gap-2 text-xs">
                <span className="text-muted-foreground pt-1">Sort by:</span>
                {(["date", "amount", "confidence"] as const).map((f) => (
                    <Button key={f} variant="ghost" size="sm" className="h-7 text-xs" onClick={() => toggleSort(f)}>
                        {f} {sortField === f && (sortAsc ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />)}
                    </Button>
                ))}
            </div>

            {/* Transaction List */}
            {sorted.length === 0 ? (
                <Card className="p-8 text-center">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500 opacity-50" />
                    <h3 className="text-lg font-semibold mb-1">All reviewed!</h3>
                    <p className="text-muted-foreground text-sm">
                        {acceptedItems.length + rejectedItems.length > 0
                            ? "Click 'Submit Review' to finalize your decisions."
                            : "No transactions to review."}
                    </p>
                </Card>
            ) : (
                <div className="space-y-2">
                    {sorted.map((item) => (
                        <Card key={item.id} className="p-3">
                            <div className="flex items-start gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                        <span className="text-sm font-medium truncate">{item.description}</span>
                                        <Badge variant="outline" className="text-xs">{item.debit_credit}</Badge>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                        <span className="font-mono font-semibold text-foreground">
                                            {formatKoboToNgn(BigInt(item.amount_kobo))}
                                        </span>
                                        <span>{new Date(item.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                                        <span className="capitalize">{item.source.replace("_", " ")}</span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="text-xs text-muted-foreground">AI suggestion:</span>
                                        <span className="text-xs">
                                            {getCategoryIcon(item.overrideCategory || item.suggestion.category)}{" "}
                                            {item.overrideCategory || item.suggestion.category}
                                        </span>
                                        {getConfidenceBadge(item.suggestion.confidence)}
                                        {item.suggestion.tax_deductible && <Badge variant="outline" className="text-xs">Tax Deductible</Badge>}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <Select
                                        value={item.overrideCategory || item.suggestion.category}
                                        onValueChange={(v) => handleOverrideCategory(item.id, v)}
                                    >
                                        <SelectTrigger className="w-[140px] h-8 text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {allCategories.map((cat) => (
                                                <SelectItem key={cat} value={cat} className="text-xs">
                                                    {getCategoryIcon(cat)} {cat}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => handleAcceptOne(item.id)}>
                                        <CheckCircle2 className="h-4 w-4" />
                                    </Button>
                                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleRejectOne(item.id)}>
                                        <XCircle className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
