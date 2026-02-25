import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Copy, CheckCircle2, AlertCircle, ExternalLink, Columns, ChevronRight, Calculator } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface PortalFieldMapProps {
    filingId: string;
    taxType: string; // e.g., 'CIT', 'VAT', 'PAYE'
}

interface PortalField {
    id: string;
    schedule_name: string;
    field_name: string;
    field_type: string;
    is_calculated_by_portal: boolean;
    mapping_path: string | null;
    display_order: number;
}

interface PortalForm {
    id: string;
    agency: string;
    form_name: string;
    version: string;
    portal_fields: PortalField[];
}

export function PortalFieldMap({ filingId, taxType }: PortalFieldMapProps) {
    const [formConfig, setFormConfig] = useState<PortalForm | null>(null);
    const [calcData, setCalcData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
    const [portalRefNo, setPortalRefNo] = useState("");
    const { toast } = useToast();

    useEffect(() => {
        fetchMappingData();
    }, [filingId, taxType]);

    const fetchMappingData = async () => {
        setIsLoading(true);
        try {
            // 1. Fetch the relevant portal form configuration
            const { data: form, error: formErr } = await supabase
                .from('portal_forms')
                .select(`
          id, agency, form_name, version,
          portal_fields ( id, schedule_name, field_name, field_type, is_calculated_by_portal, mapping_path, display_order )
        `)
                .eq('tax_type', taxType)
                .order('display_order', { referencedTable: 'portal_fields', ascending: true })
                .limit(1)
                .single();

            if (formErr && formErr.code !== 'PGRST116') {
                throw formErr;
            }

            setFormConfig(form as unknown as PortalForm);

            // 2. Fetch the corresponding specific tax calculation
            const { data: filingData, error: filingErr } = await supabase
                .from('filings')
                .select(`
          tax_period_start,
          tax_calculations (
            gross_income,
            allowable_expenses,
            taxable_profit,
            tax_amount,
            breakdown_json
          )
        `)
                .eq('id', filingId)
                .single();

            if (filingErr) throw filingErr;
            setCalcData(filingData);

        } catch (err: any) {
            console.error("Mapping data fail:", err);
            toast({
                title: "Mapping Generation Failed",
                description: err.message,
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const resolvePath = (path: string | null, data: any): number | string => {
        if (!path || !data?.tax_calculations?.[0]) return 0;

        const calcRow = data.tax_calculations[0];
        const breakdown = typeof calcRow.breakdown_json === 'string'
            ? JSON.parse(calcRow.breakdown_json)
            : (calcRow.breakdown_json || {});

        // Quick top-level string maps
        if (path === 'grossIncome') return calcRow.gross_income;
        if (path === 'allowableExpenses') return calcRow.allowable_expenses;
        if (path === 'taxableProfit') return calcRow.taxable_profit;
        if (path === 'taxAmount') return calcRow.tax_amount;

        // Deep drill into breakdown JSON via dot notation (e.g. "breakdown.capital_allowance")
        if (path.startsWith('breakdown.')) {
            const keys = path.split('.').slice(1);
            let val = breakdown;
            for (const key of keys) {
                val = val?.[key];
                if (val === undefined) return 0;
            }
            return val;
        }

        return 0;
    };

    const markAsSubmitted = async () => {
        if (!portalRefNo.trim() || !formConfig) return;

        try {
            const { data: currentUser } = await supabase.auth.getUser();

            const { error } = await supabase
                .from('portal_submissions')
                .insert({
                    filing_id: filingId,
                    form_id: formConfig.id,
                    portal_reference_number: portalRefNo,
                    status: 'submitted',
                    submitted_at: new Date().toISOString(),
                    submitted_by: currentUser.user?.id,
                    workspace_id: (calcData as any)?.workspace_id // requires active workspace context normally, but RLS drops in via edge function usually. For local, we rely on the filing context
                });

            if (error) {
                // If unique constraint hits, do an update instead
                if (error.code === '23505') {
                    await supabase.from('portal_submissions').update({
                        portal_reference_number: portalRefNo,
                        status: 'submitted',
                        submitted_at: new Date().toISOString()
                    }).eq('filing_id', filingId);
                } else {
                    throw error;
                }
            }

            toast({
                title: "Filing Logged",
                description: `External reference ${portalRefNo} mapped to this local record.`
            });
            setIsSubmitDialogOpen(false);

        } catch (err: any) {
            toast({
                title: "Registration Failed",
                description: err.message,
                variant: "destructive"
            });
        }
    };

    if (isLoading) {
        return (
            <Card className="w-full flex justify-center py-8 bg-muted/20 border-border shadow-none">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground delay-200" />
            </Card>
        );
    }

    if (!formConfig) {
        return (
            <Card className="w-full bg-accent/20 border-accent/30 shadow-none">
                <CardContent className="pt-6 pb-6 text-center text-muted-foreground text-sm">
                    <Columns className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    No external portal map available for {taxType} yet. Our engineers are constantly updating FIRS schema definitions.
                </CardContent>
            </Card>
        );
    }

    // Group fields by Schedule/Tab
    const schedules = formConfig.portal_fields.reduce((acc, field) => {
        const key = field.schedule_name || 'General';
        if (!acc[key]) acc[key] = [];
        acc[key].push(field);
        return acc;
    }, {} as Record<string, PortalField[]>);

    const formatCurrency = (kobo: number | string) => {
        const num = typeof kobo === 'string' ? parseFloat(kobo) : kobo;
        return (num / 100).toLocaleString('en-NG', { style: 'currency', currency: 'NGN' });
    };

    return (
        <Card className="w-full shadow-sm border-primary/20">
            <CardHeader className="bg-primary/5 pb-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <Badge variant="outline" className="mb-2 bg-background">
                            {formConfig.agency} • {formConfig.version}
                        </Badge>
                        <CardTitle className="text-xl flex items-center gap-2">
                            <Columns className="h-5 w-5 text-primary" />
                            {formConfig.form_name} Pack
                        </CardTitle>
                        <CardDescription className="max-w-xl">
                            Copy these exact values point-for-point into the Nigerian government portal to complete your manual filing accurately.
                        </CardDescription>
                    </div>
                    <Button variant="default" asChild className="hidden md:flex">
                        <a href="https://taxpromax.firs.gov.ng/" target="_blank" rel="noopener noreferrer">
                            Open Portal <ExternalLink className="ml-2 h-4 w-4" />
                        </a>
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="p-0">
                <Accordion type="multiple" defaultValue={Object.keys(schedules)} className="w-full">
                    {Object.entries(schedules).map(([scheduleName, fields]) => (
                        <AccordionItem value={scheduleName} key={scheduleName} className="border-b last:border-0 px-4 md:px-6">
                            <AccordionTrigger className="hover:no-underline py-4">
                                <span className="font-semibold text-foreground flex items-center gap-2">
                                    <Calculator className="h-4 w-4 text-muted-foreground" />
                                    {scheduleName}
                                </span>
                            </AccordionTrigger>
                            <AccordionContent className="pb-4">
                                <div className="grid grid-cols-1 divide-y border rounded-lg bg-card">
                                    {fields.map((field) => {
                                        const rawVal = resolvePath(field.mapping_path, calcData);
                                        const isCurrency = field.field_type === 'number';
                                        const displayVal = isCurrency ? formatCurrency(rawVal as number) : String(rawVal);
                                        const rawCopyString = isCurrency ? (Number(rawVal) / 100).toString() : String(rawVal);

                                        return (
                                            <div key={field.id} className="grid grid-cols-12 items-center p-3 hover:bg-muted/30 transition-colors">
                                                <div className="col-span-12 md:col-span-5 flex flex-col mb-2 md:mb-0">
                                                    <span className="text-sm font-medium">{field.field_name}</span>
                                                    {field.is_calculated_by_portal && (
                                                        <span className="text-[10px] text-amber-600 dark:text-amber-500 font-medium flex items-center mt-1">
                                                            <AlertCircle className="h-3 w-3 mr-1" />
                                                            Portal Auto-Calculates This
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="col-span-10 md:col-span-5 text-right md:text-left text-sm font-mono p-2 bg-background border rounded-md">
                                                    {displayVal}
                                                </div>

                                                <div className="col-span-2 md:col-span-2 flex justify-end pl-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 group"
                                                        onClick={() => handleCopy(rawCopyString, field.id)}
                                                        disabled={field.is_calculated_by_portal}
                                                        title={field.is_calculated_by_portal ? "You don't type this; match it." : "Copy value"}
                                                    >
                                                        {copiedId === field.id ? (
                                                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                        ) : (
                                                            <Copy className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                                                        )}
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </CardContent>

            <CardFooter className="bg-muted/50 flex justify-between p-4 border-t">
                <div className="text-sm text-muted-foreground max-w-sm hidden md:block">
                    Done typing this into the portal? Log your submission hash.
                </div>

                <Dialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="w-full md:w-auto">
                            Log External Submission
                            <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Log Portal Submission</DialogTitle>
                            <DialogDescription>
                                Record the FIRS / LIRS confirmation number for your records. This locks your local Buoyance ledger.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none">Assessment / Payment Ref Number</label>
                                <Input
                                    placeholder="e.g. FIRS-CIT-2026-X839"
                                    value={portalRefNo}
                                    onChange={(e) => setPortalRefNo(e.target.value)}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsSubmitDialogOpen(false)}>Cancel</Button>
                            <Button onClick={markAsSubmitted} disabled={!portalRefNo.trim()}>Lock Record</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardFooter>
        </Card>
    );
}
