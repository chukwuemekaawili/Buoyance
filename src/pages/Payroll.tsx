import { useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, Download, Banknote, Building2, Heart, Home, Briefcase, Loader2, Save, Plus, Trash2, Users } from "lucide-react";
import { calculateBatchPayroll, formatCurrency, getPayslipData, type BatchPayrollResult } from "@/lib/payrollEngine";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { NIGERIAN_STATES } from "@/lib/states";
import { generatePayslipPDF } from "@/lib/payslipGenerator";
import { AITaxDrawer } from "@/components/calculators/AITaxDrawer";
import { Sparkles } from "lucide-react";

function PayrollContent() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [saving, setSaving] = useState(false);
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
    const [defaultWorkState, setDefaultWorkState] = useState("");
    const [employees, setEmployees] = useState([
        { id: crypto.randomUUID(), employeeName: "", monthlyGross: "", annualRent: "", workState: "" }
    ]);
    const [result, setResult] = useState<BatchPayrollResult | null>(null);
    const [isAIDrawerOpen, setIsAIDrawerOpen] = useState(false);

    // Fetch user's registered work state to use as default payroll location
    useState(() => {
        if (!user) return;
        (async () => {
            const { data } = await supabase.from('profiles').select('work_state').eq('id', user.id).single();
            if (data?.work_state) {
                setDefaultWorkState(data.work_state);
                setEmployees(prev => prev.map(e => e.workState === "" ? { ...e, workState: data.work_state } : e));
            }
        })();
    });

    const addEmployee = () => {
        setEmployees(prev => [...prev, { id: crypto.randomUUID(), employeeName: "", monthlyGross: "", annualRent: "", workState: defaultWorkState }]);
    };

    const removeEmployee = (id: string) => {
        setEmployees(prev => prev.filter(e => e.id !== id));
    };

    const updateEmployee = (id: string, field: string, value: string) => {
        setEmployees(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
    };

    const handleCalculate = () => {
        const validEmployees = employees.filter(e => e.employeeName && e.monthlyGross);
        if (validEmployees.length === 0) {
            toast({ title: "No valid employees", description: "Please enter at least a name and a gross salary.", variant: "destructive" });
            return;
        }

        const payload = validEmployees.map(e => ({
            employee_name: e.employeeName,
            monthly_gross_kobo: BigInt(Math.round(parseFloat(e.monthlyGross) * 100)),
            annual_rent_paid_kobo: e.annualRent ? BigInt(Math.round(parseFloat(e.annualRent) * 100)) : undefined,
            work_state: e.workState,
            month,
        }));

        const res = calculateBatchPayroll(payload, month);
        setResult(res);
    };

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Header />
            <main className="flex-grow pt-20 md:pt-28 pb-16">
                <div className="container mx-auto px-4 md:px-6 max-w-6xl">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-foreground">Payroll Calculator</h1>
                        <p className="text-muted-foreground mt-2">
                            Calculate PAYE, pension, NHF, NHIA, and net salary per NTA 2025 rates.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Input */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                                <CardTitle className="text-xl font-bold flex items-center gap-2">
                                    <Users className="h-5 w-5" /> Employees
                                </CardTitle>
                                <Button size="sm" variant="outline" onClick={addEmployee}>
                                    <Plus className="h-4 w-4 mr-2" /> Add Employee
                                </Button>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-4">
                                <div className="space-y-2 mb-6">
                                    <Label>Payroll Cycle Month</Label>
                                    <Input type="month" value={month} onChange={e => setMonth(e.target.value)} className="w-full md:w-1/2" />
                                </div>

                                <div className="space-y-6">
                                    {employees.map((emp, index) => (
                                        <div key={emp.id} className="p-4 border rounded-lg bg-muted/30 relative">
                                            <div className="absolute top-2 right-2">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => removeEmployee(emp.id)} disabled={employees.length === 1}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            <h4 className="font-medium text-sm mb-3">Employee {index + 1}</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <Label className="text-xs">Full Name</Label>
                                                    <Input className="h-9" value={emp.employeeName} onChange={e => updateEmployee(emp.id, "employeeName", e.target.value)} placeholder="e.g. John Doe" />
                                                </div>
                                                <div>
                                                    <Label className="text-xs">Monthly Gross (₦)</Label>
                                                    <Input className="h-9 font-mono" type="number" value={emp.monthlyGross} onChange={e => updateEmployee(emp.id, "monthlyGross", e.target.value)} placeholder="0.00" />
                                                </div>
                                                <div>
                                                    <Label className="text-xs">Annual Rent (Optional Relief)</Label>
                                                    <Input className="h-9 font-mono" type="number" value={emp.annualRent} onChange={e => updateEmployee(emp.id, "annualRent", e.target.value)} placeholder="0.00" />
                                                </div>
                                                <div>
                                                    <Label className="text-xs">Work State</Label>
                                                    <Select value={emp.workState} onValueChange={(v) => updateEmployee(emp.id, "workState", v)}>
                                                        <SelectTrigger className="h-9"><SelectValue placeholder="Select State..." /></SelectTrigger>
                                                        <SelectContent>
                                                            {NIGERIAN_STATES.map(state => (
                                                                <SelectItem key={state} value={state}>{state}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <Button className="w-full mt-6" onClick={handleCalculate} disabled={employees.every(e => !e.employeeName || !e.monthlyGross)}>
                                    <Calculator className="h-4 w-4 mr-2" /> Calculate Batch Payroll
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Results */}
                        {result && (
                            <div className="space-y-6 animate-fade-in">
                                <Card>
                                    <CardHeader className="flex flex-row items-start justify-between">
                                        <div>
                                            <CardTitle>Batch Summary — {result.month}</CardTitle>
                                            <CardDescription>{result.total_employees} Employee(s) Processed</CardDescription>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="gap-2 text-primary border-primary/20 hover:bg-primary/10 transition-colors"
                                            onClick={() => setIsAIDrawerOpen(true)}
                                        >
                                            <Sparkles className="h-4 w-4" />
                                            Explain Batch Totals
                                        </Button>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-muted/50 rounded-lg p-3">
                                                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Total Gross</p>
                                                <p className="text-lg font-mono">{formatCurrency(result.totals.gross_salary_kobo)}</p>
                                            </div>
                                            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
                                                <p className="text-xs text-primary uppercase tracking-wider font-semibold mb-1">Total Net Pay</p>
                                                <p className="text-xl font-mono font-bold text-primary">{formatCurrency(result.totals.net_salary_kobo)}</p>
                                            </div>
                                        </div>

                                        <div className="space-y-2 pt-2 border-t mt-4">
                                            <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                                                <Building2 className="h-4 w-4" /> Company Liability Totals
                                            </h3>
                                            <div className="flex justify-between text-sm py-1">
                                                <span>Total PAYE (State Taxes)</span>
                                                <span className="font-medium text-amber-600">{formatCurrency(result.totals.paye_kobo)}</span>
                                            </div>
                                            <div className="flex justify-between text-sm py-1">
                                                <span>Total Pension (Emp + Employer)</span>
                                                <span className="font-medium">{formatCurrency(result.totals.pension_employee_kobo + result.totals.pension_employer_kobo)}</span>
                                            </div>
                                            <div className="flex justify-between text-sm py-1">
                                                <span>Total NHIA (Emp + Employer)</span>
                                                <span className="font-medium">{formatCurrency(result.totals.nhia_employee_kobo + result.totals.nhia_employer_kobo)}</span>
                                            </div>
                                            <div className="flex justify-between font-bold text-sm py-2 border-t mt-2">
                                                <span>Total Cost to Employer</span>
                                                <span>{formatCurrency(result.totals.total_cost_to_employer_kobo)}</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Remittance */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">Consolidated Remittance Schedule</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-3">
                                            {result.company_remittance_schedule.map((r, i) => (
                                                <div key={i} className="bg-muted/30 border border-muted rounded-lg p-3 space-y-1">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <span className="font-medium text-sm block">{r.item}</span>
                                                            <span className="text-xs text-muted-foreground">{r.remit_to}</span>
                                                        </div>
                                                        <span className="font-bold font-mono text-sm">{formatCurrency(r.amount_kobo)}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center pt-2">
                                                        <span className="text-[10px] uppercase text-muted-foreground bg-accent px-2 py-0.5 rounded">{r.note}</span>
                                                        <span className="text-xs text-destructive font-medium">Due: {r.deadline}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>

                                <div className="flex gap-3">
                                    <Button variant="outline" className="flex-1" onClick={() => {
                                        // For now, generate the first employee's payslip as a demo
                                        if (result.employees.length > 0) {
                                            generatePayslipPDF(result.employees[0], "Your Company Ltd");
                                        }
                                    }}>
                                        <Download className="h-4 w-4 mr-2" /> DL First Payslip
                                    </Button>
                                    <Button className="flex-1" disabled={saving} onClick={async () => {
                                        if (!user || !result) return;
                                        setSaving(true);
                                        try {
                                            const payloads = result.employees.map(emp => ({
                                                user_id: user.id,
                                                employee_name: emp.employee_name,
                                                month: result.month + "-01",
                                                gross_salary_kobo: Number(emp.earnings.gross_salary_kobo),
                                                paye_kobo: Number(emp.deductions.paye_kobo),
                                                pension_kobo: Number(emp.deductions.pension_employee_kobo),
                                                nhf_kobo: Number(emp.deductions.nhf_kobo),
                                                nhia_kobo: Number(emp.deductions.nhia_employee_kobo),
                                                net_salary_kobo: Number(emp.net_salary_kobo),
                                            }));

                                            const { error } = await supabase.from('payroll_calculations' as any).insert(payloads);

                                            if (error) throw error;
                                            toast({ title: "Batch Payroll saved!", description: `${result.total_employees} employees securely logged.` });
                                        } catch (err: any) {
                                            toast({ title: "Save failed", description: err.message || String(err), variant: "destructive" });
                                        } finally {
                                            setSaving(false);
                                        }
                                    }}>
                                        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                                        Save Batch
                                    </Button>
                                </div>

                                <AITaxDrawer
                                    open={isAIDrawerOpen}
                                    onOpenChange={setIsAIDrawerOpen}
                                    title="Batch Payroll Explained"
                                    contextParams={{
                                        taxType: "PAYE / Batch Payroll",
                                        calculationType: "Employer Aggregate Liability Breakdown",
                                        values: {
                                            month: result.month,
                                            total_employees_processed: result.total_employees,
                                            total_gross_salary_ngn: formatCurrency(result.totals.gross_salary_kobo),
                                            total_net_salary_ngn: formatCurrency(result.totals.net_salary_kobo),
                                            total_employer_pension_contribution_ngn: formatCurrency(result.totals.pension_employer_kobo),
                                            total_employee_pension_deduction_ngn: formatCurrency(result.totals.pension_employee_kobo),
                                            total_employer_nhia_contribution_ngn: formatCurrency(result.totals.nhia_employer_kobo),
                                            total_employee_nhia_deduction_ngn: formatCurrency(result.totals.nhia_employee_kobo),
                                            total_paye_withheld_ngn: formatCurrency(result.totals.paye_kobo),
                                            total_cost_to_employer_ngn: formatCurrency(result.totals.total_cost_to_employer_kobo)
                                        },
                                        ruleVersion: "NTA_2025"
                                    }}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}

export default function Payroll() {
    return (
        <AuthGuard>
            <PayrollContent />
        </AuthGuard>
    );
}
