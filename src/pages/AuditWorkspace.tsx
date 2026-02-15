import { useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, FileText, Clock, Download, AlertTriangle, CheckCircle } from "lucide-react";
import { createCase, getCases, getCaseTypeLabel, getStatusColor, getDaysUntilDeadline, type DisputeCase, type CaseType } from "@/lib/disputeService";
import { useAuth } from "@/hooks/useAuth";

function AuditWorkspaceContent() {
    const { user } = useAuth();
    const [cases, setCases] = useState<DisputeCase[]>(() => getCases(user?.id || 'demo'));
    const [showNewForm, setShowNewForm] = useState(false);

    // New case form
    const [title, setTitle] = useState("");
    const [caseType, setCaseType] = useState<CaseType>("tax_audit");
    const [taxType, setTaxType] = useState("CIT");
    const [taxYear, setTaxYear] = useState("2025");
    const [authority, setAuthority] = useState("FIRS");
    const [description, setDescription] = useState("");
    const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0]);
    const [assessedAmount, setAssessedAmount] = useState("");
    const [disputedAmount, setDisputedAmount] = useState("");

    const handleCreate = () => {
        if (!title) return;
        const newCase = createCase({
            user_id: user?.id || 'demo',
            case_type: caseType,
            title,
            description,
            tax_year: parseInt(taxYear),
            tax_type: taxType,
            authority,
            received_date: receivedDate,
            assessed_amount_kobo: assessedAmount ? Math.round(parseFloat(assessedAmount) * 100) : undefined,
            disputed_amount_kobo: disputedAmount ? Math.round(parseFloat(disputedAmount) * 100) : undefined,
        });
        setCases([newCase, ...cases]);
        setShowNewForm(false);
        setTitle(""); setDescription("");
    };

    const formatNgn = (kobo: number) => `₦${(kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

    const activeCases = cases.filter(c => c.status !== 'closed' && c.status !== 'resolved');
    const resolvedCases = cases.filter(c => c.status === 'closed' || c.status === 'resolved');

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Header />
            <main className="flex-grow pt-20 md:pt-28 pb-16">
                <div className="container mx-auto px-4 md:px-6 max-w-6xl">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-foreground">Audit Workspace</h1>
                            <p className="text-muted-foreground mt-2">Manage tax audits, disputes, and objection deadlines.</p>
                        </div>
                        <Button onClick={() => setShowNewForm(!showNewForm)}>
                            <Plus className="h-4 w-4 mr-2" /> New Case
                        </Button>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription className="flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4 text-red-500" /> Active Cases
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-bold">{activeCases.length}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-yellow-600" /> Deadlines This Month
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-bold text-yellow-600">
                                    {activeCases.filter(c => c.objection_deadline && getDaysUntilDeadline(c.objection_deadline) <= 30).length}
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription className="flex items-center gap-2">
                                    <CheckCircle className="h-4 w-4 text-green-600" /> Resolved
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-bold text-green-600">{resolvedCases.length}</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* New Case Form */}
                    {showNewForm && (
                        <Card className="mb-8 border-primary/30">
                            <CardHeader>
                                <CardTitle>Create New Case</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div><Label>Case Title *</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. FIRS Best of Judgment Assessment 2024" /></div>
                                    <div>
                                        <Label>Case Type</Label>
                                        <Select value={caseType} onValueChange={(v: CaseType) => setCaseType(v)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="tax_audit">Tax Audit</SelectItem>
                                                <SelectItem value="best_of_judgment">Best of Judgment</SelectItem>
                                                <SelectItem value="query_letter">Query Letter</SelectItem>
                                                <SelectItem value="refund_claim">Refund Claim</SelectItem>
                                                <SelectItem value="penalty_dispute">Penalty Dispute</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label>Tax Type</Label>
                                        <Select value={taxType} onValueChange={setTaxType}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="CIT">CIT</SelectItem>
                                                <SelectItem value="VAT">VAT</SelectItem>
                                                <SelectItem value="WHT">WHT</SelectItem>
                                                <SelectItem value="PAYE">PAYE</SelectItem>
                                                <SelectItem value="PIT">PIT</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div><Label>Tax Year</Label><Input value={taxYear} onChange={e => setTaxYear(e.target.value)} /></div>
                                    <div><Label>Authority</Label><Input value={authority} onChange={e => setAuthority(e.target.value)} /></div>
                                    <div><Label>Notice Received</Label><Input type="date" value={receivedDate} onChange={e => setReceivedDate(e.target.value)} /></div>
                                    <div><Label>Assessed Amount (₦)</Label><Input type="number" value={assessedAmount} onChange={e => setAssessedAmount(e.target.value)} placeholder="Optional" /></div>
                                    <div><Label>Disputed Amount (₦)</Label><Input type="number" value={disputedAmount} onChange={e => setDisputedAmount(e.target.value)} placeholder="Optional" /></div>
                                </div>
                                <div><Label>Description</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description of the case" /></div>
                                <div className="flex gap-3">
                                    <Button onClick={handleCreate} disabled={!title}>Create Case</Button>
                                    <Button variant="ghost" onClick={() => setShowNewForm(false)}>Cancel</Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Cases List */}
                    <Tabs defaultValue="active" className="space-y-6">
                        <TabsList>
                            <TabsTrigger value="active">Active ({activeCases.length})</TabsTrigger>
                            <TabsTrigger value="resolved">Resolved ({resolvedCases.length})</TabsTrigger>
                        </TabsList>

                        <TabsContent value="active">
                            {activeCases.length === 0 ? (
                                <Card>
                                    <CardContent className="text-center py-12 text-muted-foreground">
                                        <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                        <p>No active cases. That's a good thing! 🎉</p>
                                    </CardContent>
                                </Card>
                            ) : (
                                <div className="space-y-4">
                                    {activeCases.map(c => (
                                        <Card key={c.id}>
                                            <CardContent className="pt-6">
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <h3 className="font-semibold">{c.title}</h3>
                                                        <div className="flex gap-2 mt-1">
                                                            <Badge variant="outline">{getCaseTypeLabel(c.case_type)}</Badge>
                                                            <Badge variant="secondary">{c.tax_type}</Badge>
                                                            <Badge variant="secondary">{c.authority}</Badge>
                                                        </div>
                                                        <p className="text-sm text-muted-foreground mt-2">{c.description}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        {c.objection_deadline && (
                                                            <div className={`text-sm font-medium ${getDaysUntilDeadline(c.objection_deadline) <= 7 ? 'text-red-500' : 'text-yellow-600'}`}>
                                                                <Clock className="h-3 w-3 inline mr-1" />
                                                                {getDaysUntilDeadline(c.objection_deadline)} days to deadline
                                                            </div>
                                                        )}
                                                        {c.assessed_amount_kobo && (
                                                            <p className="text-sm mt-1">Assessed: {formatNgn(c.assessed_amount_kobo)}</p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 mt-4">
                                                    <Button variant="outline" size="sm"><FileText className="h-3 w-3 mr-1" /> Add Document</Button>
                                                    <Button variant="outline" size="sm"><Download className="h-3 w-3 mr-1" /> Defense Pack</Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="resolved">
                            {resolvedCases.length === 0 ? (
                                <Card>
                                    <CardContent className="text-center py-12 text-muted-foreground">
                                        <p>No resolved cases yet.</p>
                                    </CardContent>
                                </Card>
                            ) : (
                                <div className="space-y-4">
                                    {resolvedCases.map(c => (
                                        <Card key={c.id} className="opacity-70">
                                            <CardContent className="pt-6">
                                                <h3 className="font-semibold">{c.title}</h3>
                                                <Badge variant="default" className="mt-1">Resolved</Badge>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </div>
            </main>
            <Footer />
        </div>
    );
}

export default function AuditWorkspace() {
    return (
        <AuthGuard>
            <AuditWorkspaceContent />
        </AuthGuard>
    );
}
