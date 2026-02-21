import { useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, Download, Banknote, Building2, Heart, Home, Briefcase, Loader2, Save } from "lucide-react";
import { calculateBasicPayroll, formatCurrency, getPayslipData, type PayrollResult } from "@/lib/payrollEngine";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { generatePayslipPDF } from "@/lib/payslipGenerator";

function PayrollContent() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [saving, setSaving] = useState(false);
    const [employeeName, setEmployeeName] = useState("");
    const [monthlyGross, setMonthlyGross] = useState("");
    const [annualRent, setAnnualRent] = useState("");
    const [workState, setWorkState] = useState("Lagos");
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
    const [result, setResult] = useState<PayrollResult | null>(null);

    const handleCalculate = () => {
        if (!employeeName || !monthlyGross) return;
        const res = calculateBasicPayroll({
            employee_name: employeeName,
            monthly_gross_kobo: Math.round(parseFloat(monthlyGross) * 100),
            annual_rent_paid_kobo: annualRent ? Math.round(parseFloat(annualRent) * 100) : undefined,
            work_state: workState,
            month,
        });
        setResult(res);
    };

    const payslip = result ? getPayslipData(result) : null;

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
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Calculator className="h-5 w-5" /> Employee Details
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <Label>Employee Name</Label>
                                    <Input value={employeeName} onChange={e => setEmployeeName(e.target.value)} placeholder="Full name" />
                                </div>
                                <div>
                                    <Label>Monthly Gross Salary (₦)</Label>
                                    <Input type="number" value={monthlyGross} onChange={e => setMonthlyGross(e.target.value)} placeholder="e.g. 500000" />
                                </div>
                                <div>
                                    <Label>Annual Rent Paid (₦) — for Rent Relief</Label>
                                    <Input type="number" value={annualRent} onChange={e => setAnnualRent(e.target.value)} placeholder="Optional — replaces old CRA" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>Work State</Label>
                                        <Select value={workState} onValueChange={setWorkState}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Lagos">Lagos</SelectItem>
                                                <SelectItem value="FCT">FCT Abuja</SelectItem>
                                                <SelectItem value="Rivers">Rivers</SelectItem>
                                                <SelectItem value="Ogun">Ogun</SelectItem>
                                                <SelectItem value="Oyo">Oyo</SelectItem>
                                                <SelectItem value="Kano">Kano</SelectItem>
                                                <SelectItem value="Kaduna">Kaduna</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label>Month</Label>
                                        <Input type="month" value={month} onChange={e => setMonth(e.target.value)} />
                                    </div>
                                </div>
                                <Button className="w-full" onClick={handleCalculate} disabled={!employeeName || !monthlyGross}>
                                    <Calculator className="h-4 w-4 mr-2" /> Calculate Payroll
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Results */}
                        {result && payslip && (
                            <div className="space-y-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Payslip — {result.month}</CardTitle>
                                        <CardDescription>{result.employee_name}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {/* Earnings */}
                                        <div>
                                            <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                                                <Banknote className="h-4 w-4" /> EARNINGS
                                            </h3>
                                            {payslip.earnings.map((e, i) => (
                                                <div key={i} className="flex justify-between py-1 text-sm">
                                                    <span>{e.label}</span>
                                                    <span className="font-medium text-green-600">{formatCurrency(e.amount)}</span>
                                                </div>
                                            ))}
                                            <div className="flex justify-between py-2 border-t font-semibold">
                                                <span>Gross Salary</span>
                                                <span className="text-green-600">{formatCurrency(payslip.gross)}</span>
                                            </div>
                                        </div>

                                        {/* Deductions */}
                                        <div>
                                            <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                                                <Building2 className="h-4 w-4" /> DEDUCTIONS
                                            </h3>
                                            {payslip.deductions.map((d, i) => (
                                                <div key={i} className="flex justify-between py-1 text-sm">
                                                    <span>{d.label}</span>
                                                    <span className="font-medium text-red-500">-{formatCurrency(d.amount)}</span>
                                                </div>
                                            ))}
                                            <div className="flex justify-between py-2 border-t font-semibold">
                                                <span>Total Deductions</span>
                                                <span className="text-red-500">-{formatCurrency(payslip.total_deductions)}</span>
                                            </div>
                                        </div>

                                        {/* Net */}
                                        <div className="bg-primary/5 rounded-lg p-4 flex justify-between items-center">
                                            <span className="text-lg font-bold">Net Salary</span>
                                            <span className="text-2xl font-bold text-primary">{formatCurrency(payslip.net)}</span>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Employer Cost */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">Employer Contributions</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="flex items-center gap-2"><Home className="h-3 w-3" /> Pension (10%)</span>
                                            <span>{formatCurrency(result.employer_contributions.pension_employer_kobo)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="flex items-center gap-2"><Briefcase className="h-3 w-3" /> NSITF (1%)</span>
                                            <span>{formatCurrency(result.employer_contributions.nsitf_kobo)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="flex items-center gap-2"><Heart className="h-3 w-3" /> NHIA (10%)</span>
                                            <span>{formatCurrency(result.employer_contributions.nhia_employer_kobo)}</span>
                                        </div>
                                        <div className="flex justify-between pt-2 border-t font-semibold">
                                            <span>Total Cost to Employer</span>
                                            <span className="text-primary">{formatCurrency(result.total_cost_to_employer_kobo)}</span>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Remittance */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">Remittance Schedule</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-3">
                                            {result.remittance_schedule.map((r, i) => (
                                                <div key={i} className="bg-muted/50 rounded-lg p-3">
                                                    <div className="flex justify-between">
                                                        <span className="font-medium text-sm">{r.item}</span>
                                                        <span className="font-medium text-sm">{formatCurrency(r.amount_kobo)}</span>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-1">{r.remit_to}</p>
                                                    <p className="text-xs text-orange-600">Due: {r.deadline}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>

                                <div className="flex gap-3">
                                    <Button variant="outline" className="flex-1" onClick={() => generatePayslipPDF(result, "Your Company Ltd")}>
                                        <Download className="h-4 w-4 mr-2" /> Export Payslip PDF
                                    </Button>
                                    <Button className="flex-1" disabled={saving} onClick={async () => {
                                        if (!user || !result) return;
                                        setSaving(true);
                                        try {
                                            const { error } = await supabase.from('payroll_calculations' as any).insert({
                                                user_id: user.id,
                                                employee_name: result.employee_name,
                                                month: result.month,
                                                monthly_gross_kobo: result.gross_income_kobo,
                                                net_salary_kobo: result.net_salary_kobo,
                                                paye_kobo: result.paye_kobo,
                                                pension_employee_kobo: result.deductions.pension_employee_kobo,
                                                nhf_kobo: result.deductions.nhf_kobo,
                                                nhia_employee_kobo: result.deductions.nhia_employee_kobo,
                                                total_cost_kobo: result.total_cost_to_employer_kobo,
                                                work_state: result.work_state,
                                            });
                                            if (error) throw error;
                                            toast({ title: "Payroll saved!", description: `${result.employee_name} — ${result.month}` });
                                        } catch (err: any) {
                                            toast({ title: "Save failed", description: err.message || String(err), variant: "destructive" });
                                        } finally {
                                            setSaving(false);
                                        }
                                    }}>
                                        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                                        Save Payroll
                                    </Button>
                                </div>
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
