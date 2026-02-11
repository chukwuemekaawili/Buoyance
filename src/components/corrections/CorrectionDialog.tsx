/**
 * Correction Dialog Component
 * 
 * Reusable dialog for correcting financial records.
 * Used by Incomes and Expenses pages.
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatKoboToNgn, parseNgnToKobo, koboToString, stringToKobo } from "@/lib/money";

interface IncomeRecord {
  id: string;
  source: string;
  amount_kobo: string;
  date: string;
  category: string | null;
  description: string | null;
  vatable: boolean;
  output_vat_kobo: string | null;
  wht_deducted: boolean;
  wht_credit_kobo: number | null;
  tax_exempt: boolean;
}

interface ExpenseRecord {
  id: string;
  description: string;
  amount_kobo: string;
  date: string;
  category: string;
  deductible: boolean | null;
  vatable: boolean;
  input_vat_kobo: string | null;
  invoice_ref: string | null;
}

interface IncomeCorrectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: IncomeRecord;
  categories: { value: string; label: string }[];
  onCorrected: () => void;
}

export function IncomeCorrectionDialog({
  open,
  onOpenChange,
  record,
  categories,
  onCorrected,
}: IncomeCorrectionDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state initialized from original record - using safe BigInt formatting
  const [source, setSource] = useState(record.source);
  // Safe BigInt to display string conversion (no Number() overflow risk)
  const formatKoboForInput = (koboStr: string): string => {
    const kobo = stringToKobo(koboStr);
    const ngnWhole = kobo / 100n;
    const koboRemainder = kobo % 100n;
    const displayValue = ngnWhole.toString();
    return new Intl.NumberFormat("en-NG").format(BigInt(displayValue));
  };
  
  const [amount, setAmount] = useState(formatKoboForInput(record.amount_kobo));
  const [date, setDate] = useState(record.date);
  const [category, setCategory] = useState(record.category || "salary");
  const [description, setDescription] = useState(record.description || "");
  const [vatable, setVatable] = useState(record.vatable);
  const [vatAmount, setVatAmount] = useState(
    record.output_vat_kobo ? formatKoboForInput(record.output_vat_kobo) : ""
  );
  const [whtDeducted, setWhtDeducted] = useState(record.wht_deducted);
  const [whtAmount, setWhtAmount] = useState(
    record.wht_credit_kobo ? new Intl.NumberFormat("en-NG").format(Math.floor(record.wht_credit_kobo / 100)) : ""
  );
  const [taxExempt, setTaxExempt] = useState(record.tax_exempt);

  const handleAmountInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    if (value === "") {
      setAmount("");
      return;
    }
    setAmount(new Intl.NumberFormat("en-NG").format(parseInt(value)));
  };

  const handleCorrection = async () => {
    if (!source.trim() || !amount) {
      toast({
        title: "Validation Error",
        description: "Source and amount are required.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const amountKobo = koboToString(parseNgnToKobo(amount.replace(/,/g, "")));
      const outputVatKobo = vatable && vatAmount 
        ? koboToString(parseNgnToKobo(vatAmount.replace(/,/g, "")))
        : null;
      const whtKobo = whtDeducted && whtAmount 
        ? Number(parseNgnToKobo(whtAmount.replace(/,/g, "")))
        : 0;

      const { data, error } = await supabase.rpc("correct_income_atomic", {
        p_original_id: record.id,
        p_amount_kobo: amountKobo,
        p_source: source.trim(),
        p_date: date,
        p_category: category,
        p_description: description.trim() || null,
        p_vatable: vatable,
        p_output_vat_kobo: outputVatKobo,
        p_wht_deducted: whtDeducted,
        p_wht_credit_kobo: whtKobo,
        p_tax_exempt: taxExempt,
      });

      if (error) throw error;

      toast({
        title: "Record Corrected",
        description: "A new corrected record has been created. The original is now superseded.",
      });

      onOpenChange(false);
      onCorrected();
    } catch (err: any) {
      toast({
        title: "Correction Failed",
        description: err.message || "An error occurred while correcting the record.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Correct Income Record
          </DialogTitle>
          <DialogDescription>
            Create a corrected version of this record. The original will be marked as superseded
            and preserved for audit trail.
          </DialogDescription>
        </DialogHeader>

        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg mb-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-700 dark:text-amber-400">Immutable Records</p>
              <p className="text-muted-foreground">
                Records cannot be deleted. This correction creates a new record linked to the original.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Source *</Label>
            <Input value={source} onChange={(e) => setSource(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Amount (₦) *</Label>
              <Input
                type="text"
                inputMode="numeric"
                value={amount}
                onChange={handleAmountInput}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label>Date *</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <Label>Tax Exempt</Label>
            <Switch checked={taxExempt} onCheckedChange={setTaxExempt} />
          </div>

          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <Label>VATable</Label>
            <Switch checked={vatable} onCheckedChange={setVatable} />
          </div>

          {vatable && (
            <div className="space-y-2">
              <Label>Output VAT (₦)</Label>
              <Input
                type="text"
                inputMode="numeric"
                value={vatAmount}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, "");
                  setVatAmount(val ? new Intl.NumberFormat("en-NG").format(parseInt(val)) : "");
                }}
                className="font-mono"
              />
            </div>
          )}

          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <Label>WHT Deducted</Label>
            <Switch checked={whtDeducted} onCheckedChange={setWhtDeducted} />
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleCorrection} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Correction
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ExpenseCorrectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: ExpenseRecord;
  categories: { value: string; label: string }[];
  onCorrected: () => void;
}

export function ExpenseCorrectionDialog({
  open,
  onOpenChange,
  record,
  categories,
  onCorrected,
}: ExpenseCorrectionDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Safe BigInt to display string conversion
  const formatKoboForInput = (koboStr: string): string => {
    const kobo = stringToKobo(koboStr);
    const ngnWhole = kobo / 100n;
    return new Intl.NumberFormat("en-NG").format(BigInt(ngnWhole.toString()));
  };

  const [description, setDescription] = useState(record.description);
  const [amount, setAmount] = useState(formatKoboForInput(record.amount_kobo));
  const [date, setDate] = useState(record.date);
  const [category, setCategory] = useState(record.category);
  const [deductible, setDeductible] = useState(record.deductible ?? false);
  const [vatable, setVatable] = useState(record.vatable);
  const [vatAmount, setVatAmount] = useState(
    record.input_vat_kobo ? formatKoboForInput(record.input_vat_kobo) : ""
  );
  const [invoiceRef, setInvoiceRef] = useState(record.invoice_ref || "");

  const handleAmountInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    if (value === "") {
      setAmount("");
      return;
    }
    setAmount(new Intl.NumberFormat("en-NG").format(parseInt(value)));
  };

  const handleCorrection = async () => {
    if (!description.trim() || !amount) {
      toast({
        title: "Validation Error",
        description: "Description and amount are required.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const amountKobo = koboToString(parseNgnToKobo(amount.replace(/,/g, "")));
      const inputVatKobo = vatable && vatAmount 
        ? koboToString(parseNgnToKobo(vatAmount.replace(/,/g, "")))
        : null;

      const { data, error } = await supabase.rpc("correct_expense_atomic", {
        p_original_id: record.id,
        p_amount_kobo: amountKobo,
        p_category: category,
        p_description: description.trim(),
        p_date: date,
        p_vatable: vatable,
        p_input_vat_kobo: inputVatKobo,
        p_deductible: deductible,
        p_invoice_ref: invoiceRef.trim() || null,
      });

      if (error) throw error;

      toast({
        title: "Record Corrected",
        description: "A new corrected record has been created. The original is now superseded.",
      });

      onOpenChange(false);
      onCorrected();
    } catch (err: any) {
      toast({
        title: "Correction Failed",
        description: err.message || "An error occurred while correcting the record.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Correct Expense Record
          </DialogTitle>
          <DialogDescription>
            Create a corrected version of this record. The original will be marked as superseded
            and preserved for audit trail.
          </DialogDescription>
        </DialogHeader>

        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg mb-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-700 dark:text-amber-400">Immutable Records</p>
              <p className="text-muted-foreground">
                Records cannot be deleted. This correction creates a new record linked to the original.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Description *</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Amount (₦) *</Label>
              <Input
                type="text"
                inputMode="numeric"
                value={amount}
                onChange={handleAmountInput}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label>Date *</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Invoice Reference</Label>
            <Input
              value={invoiceRef}
              onChange={(e) => setInvoiceRef(e.target.value)}
              placeholder="Optional"
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <Label>Tax Deductible</Label>
            <Switch checked={deductible} onCheckedChange={setDeductible} />
          </div>

          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <Label>VATable</Label>
            <Switch checked={vatable} onCheckedChange={setVatable} />
          </div>

          {vatable && (
            <div className="space-y-2">
              <Label>Input VAT (₦)</Label>
              <Input
                type="text"
                inputMode="numeric"
                value={vatAmount}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, "");
                  setVatAmount(val ? new Intl.NumberFormat("en-NG").format(parseInt(val)) : "");
                }}
                className="font-mono"
              />
            </div>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleCorrection} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Correction
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
