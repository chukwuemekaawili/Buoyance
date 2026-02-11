/**
 * RecordsLoader Component
 * 
 * UI component for loading income/expense records into calculators.
 * Provides period selection, summary display, and explainability.
 */

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Database,
  Loader2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  XCircle,
  TrendingDown,
  TrendingUp,
  Link as LinkIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useRecordsForPeriod, RecordsSummary } from "@/hooks/useRecordsForPeriod";
import { formatKoboToNgn, koboToString } from "@/lib/money";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";

interface RecordsLoaderProps {
  taxType: "PIT" | "CIT" | "VAT" | "WHT" | "CGT" | "CRYPTO";
  onRecordsLoaded?: (summary: RecordsSummary) => void;
  onRecordsCleared?: () => void;
  className?: string;
}

export function RecordsLoader({
  taxType,
  onRecordsLoaded,
  onRecordsCleared,
  className = "",
}: RecordsLoaderProps) {
  const { user } = useAuth();
  const { loading, error, summary, loadRecords, clearRecords } = useRecordsForPeriod();
  
  const [useRecords, setUseRecords] = useState(false);
  const [periodStart, setPeriodStart] = useState(() => 
    format(startOfMonth(subMonths(new Date(), 1)), "yyyy-MM-dd")
  );
  const [periodEnd, setPeriodEnd] = useState(() => 
    format(endOfMonth(subMonths(new Date(), 1)), "yyyy-MM-dd")
  );
  const [showDetails, setShowDetails] = useState(false);

  const handleToggle = (checked: boolean) => {
    setUseRecords(checked);
    if (!checked) {
      clearRecords();
      onRecordsCleared?.();
    }
  };

  const handleLoad = async () => {
    await loadRecords(periodStart, periodEnd, taxType);
  };

  // Notify parent when summary changes
  if (summary && useRecords) {
    onRecordsLoaded?.(summary);
  }

  if (!user) {
    return (
      <Card className={`p-4 bg-muted/30 ${className}`}>
        <div className="flex items-center gap-3">
          <Database className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1">
            <p className="font-medium text-sm">Use My Records</p>
            <p className="text-xs text-muted-foreground">
              Sign in to load your income and expenses for this calculation.
            </p>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link to="/signin">Sign In</Link>
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`p-4 ${className}`}>
      <div className="space-y-4">
        {/* Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Database className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium text-sm">Use My Records for This Period</p>
              <p className="text-xs text-muted-foreground">
                Load your saved income and expenses
              </p>
            </div>
          </div>
          <Switch checked={useRecords} onCheckedChange={handleToggle} />
        </div>

        {/* Period Selection */}
        {useRecords && (
          <div className="space-y-4 pt-2 border-t">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">From</Label>
                <Input
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-xs">To</Label>
                <Input
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>

            <Button
              onClick={handleLoad}
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading Records...
                </>
              ) : (
                <>
                  <Database className="h-4 w-4 mr-2" />
                  Load Records
                </>
              )}
            </Button>

            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            {/* Summary */}
            {summary && (
              <div className="space-y-3 pt-2">
                {/* Quick stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-secondary/10 rounded-lg">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      Included Income
                    </p>
                    <p className="font-mono font-semibold text-secondary">
                      {formatKoboToNgn(summary.totalIncomeKobo)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {summary.incomeCount} records
                    </p>
                  </div>
                  <div className="p-3 bg-destructive/10 rounded-lg">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <TrendingDown className="h-3 w-3" />
                      Deductible Expenses
                    </p>
                    <p className="font-mono font-semibold text-destructive">
                      {formatKoboToNgn(summary.totalDeductibleExpensesKobo)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {summary.includedExpenses.filter(e => e.deductible).length} records
                    </p>
                  </div>
                </div>

                {/* VAT-specific stats */}
                {taxType === "VAT" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground">Output VAT</p>
                      <p className="font-mono font-semibold">
                        {formatKoboToNgn(summary.totalOutputVatKobo)}
                      </p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground">Input VAT</p>
                      <p className="font-mono font-semibold">
                        {formatKoboToNgn(summary.totalInputVatKobo)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Excluded records warning */}
                {(summary.excludedIncomeCount > 0 || summary.excludedExpenseCount > 0) && (
                  <div className="flex items-center gap-2 text-amber-600 text-xs p-2 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>
                      {summary.excludedIncomeCount + summary.excludedExpenseCount} records excluded
                    </span>
                  </div>
                )}

                {/* Expandable details */}
                <Collapsible open={showDetails} onOpenChange={setShowDetails}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full">
                      {showDetails ? (
                        <>
                          <ChevronUp className="h-4 w-4 mr-2" />
                          Hide Details
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4 mr-2" />
                          Show Details
                        </>
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-3 pt-2">
                    {/* Included Incomes */}
                    {summary.includedIncomes.length > 0 && (
                      <div>
                        <p className="text-xs font-medium mb-2 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-secondary" />
                          Included Incomes ({summary.includedIncomes.length})
                        </p>
                        <div className="max-h-32 overflow-y-auto space-y-1 text-xs">
                          {summary.includedIncomes.slice(0, 5).map((inc) => (
                            <div key={inc.id} className="flex justify-between py-1 border-b">
                              <span className="truncate flex-1">{inc.source}</span>
                              <span className="font-mono ml-2">
                                {formatKoboToNgn(BigInt(inc.amount_kobo))}
                              </span>
                            </div>
                          ))}
                          {summary.includedIncomes.length > 5 && (
                            <p className="text-muted-foreground">
                              +{summary.includedIncomes.length - 5} more
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Excluded Expenses */}
                    {summary.excludedExpenses.length > 0 && (
                      <div>
                        <p className="text-xs font-medium mb-2 flex items-center gap-1">
                          <XCircle className="h-3 w-3 text-destructive" />
                          Excluded Expenses ({summary.excludedExpenses.length})
                        </p>
                        <div className="max-h-32 overflow-y-auto space-y-1 text-xs">
                          {summary.excludedExpenses.slice(0, 5).map(({ expense, reason }) => (
                            <div key={expense.id} className="flex justify-between py-1 border-b items-center">
                              <span className="truncate flex-1">{expense.description}</span>
                              <Badge variant="outline" className="text-[10px] ml-2">
                                {reason}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Links to manage records */}
                    <div className="flex gap-2 pt-2">
                      <Button asChild size="sm" variant="outline" className="flex-1">
                        <Link to="/incomes">
                          <LinkIcon className="h-3 w-3 mr-1" />
                          Manage Income
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="outline" className="flex-1">
                        <Link to="/expenses">
                          <LinkIcon className="h-3 w-3 mr-1" />
                          Manage Expenses
                        </Link>
                      </Button>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}

            {/* Empty state */}
            {summary && summary.incomeCount === 0 && summary.expenseCount === 0 && (
              <div className="text-center py-4 text-muted-foreground">
                <Database className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-medium">No records found</p>
                <p className="text-xs">Add income and expenses to use this feature.</p>
                <div className="flex gap-2 mt-3 justify-center">
                  <Button asChild size="sm" variant="outline">
                    <Link to="/incomes">Add Income</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/expenses">Add Expense</Link>
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
