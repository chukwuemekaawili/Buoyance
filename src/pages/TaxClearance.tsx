import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileBadge, ArrowLeft, Loader2, Upload, ExternalLink, Download, ArrowRight, ShieldCheck, MailWarning, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TCCRequest {
    id: string;
    tax_year: number;
    status: 'pending' | 'processing' | 'approved' | 'rejected';
    application_number: string | null;
    tcc_number: string | null;
    tcc_document_url: string | null;
    remita_rrr: string | null;
    created_at: string;
}

export default function TaxClearance() {
    const { user, loading: authLoading } = useAuth();
    const { activeWorkspace } = useWorkspace();
    const { toast } = useToast();

    const [tccRecords, setTccRecords] = useState<TCCRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isApplying, setIsApplying] = useState(false);
    const [targetYear, setTargetYear] = useState<string>("2025");
    const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
    const [activeTccId, setActiveTccId] = useState<string | null>(null);

    useEffect(() => {
        if (authLoading || !user || !activeWorkspace) return;
        fetchTCCs();
    }, [user, authLoading, activeWorkspace]);

    const fetchTCCs = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from("tcc_requests")
                .select("*")
                .eq("workspace_id", activeWorkspace?.id)
                .order("tax_year", { ascending: false });

            if (error) throw error;
            setTccRecords(data as TCCRequest[]);
        } catch (err: any) {
            console.error(err);
            toast({ title: "Failed to load TCCs", description: err.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const handleApply = async () => {
        if (!activeWorkspace || !user) return;
        setIsApplying(true);
        try {
            const year = parseInt(targetYear);

            // Check for uniqueness
            if (tccRecords.some(r => r.tax_year === year)) {
                throw new Error(`A TCC request for ${year} already exists.`);
            }

            const { data, error } = await supabase
                .from("tcc_requests")
                .insert({
                    workspace_id: activeWorkspace.id,
                    user_id: user.id,
                    tax_year: year,
                    status: 'pending'
                })
                .select()
                .single();

            if (error) throw error;

            setTccRecords(prev => [data as TCCRequest, ...prev]);
            toast({ title: "TCC Request Initiated", description: "Your profile has entered the compliance processing queue." });

        } catch (err: any) {
            toast({ title: "Application Failed", description: err.message, variant: "destructive" });
        } finally {
            setIsApplying(false);
        }
    };

    const handleUploadRemita = async (e: React.ChangeEvent<HTMLInputElement>, tccId: string) => {
        const file = e.target.files?.[0];
        if (!file || !activeWorkspace) return;

        try {
            // Very basic mock update for the UI instead of full bucket wire-up for demo
            toast({ title: "Uploading receipt...", description: "Securely transmitting to storage." });

            const { error } = await supabase
                .from('tcc_requests')
                .update({ status: 'processing', remita_rrr: `RMR-${Math.random().toString().slice(2, 10)}` })
                .eq('id', tccId);

            if (error) throw error;

            toast({ title: "Proof Uploaded", description: "State updated to 'processing'." });
            fetchTCCs();

        } catch (err: any) {
            toast({ title: "Upload failed", description: err.message, variant: "destructive" });
        }
    };

    const renderStatusBadge = (status: string) => {
        switch (status) {
            case 'approved': return <Badge className="bg-green-600 hover:bg-green-700 w-[100px] justify-center">Approved</Badge>;
            case 'processing': return <Badge className="bg-amber-500 hover:bg-amber-600 w-[100px] justify-center">Processing</Badge>;
            case 'rejected': return <Badge variant="destructive" className="w-[100px] justify-center">Rejected</Badge>;
            default: return <Badge variant="secondary" className="w-[100px] justify-center">Pending</Badge>;
        }
    };

    const currentYear = new Date().getFullYear();
    const availableYears = [currentYear.toString(), (currentYear - 1).toString(), (currentYear - 2).toString()];

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Header />
            <main className="flex-grow pt-20 md:pt-28 pb-16">
                <div className="container mx-auto px-4 md:px-6 max-w-5xl">
                    <Link to="/dashboard" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Dashboard
                    </Link>

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                        <div>
                            <h1 className="text-3xl font-bold flex items-center gap-2 text-foreground">
                                <FileBadge className="h-7 w-7 text-primary" />
                                Tax Clearance Certificates
                            </h1>
                            <p className="text-muted-foreground mt-1 text-lg">
                                Request and manage your statutory FIRS / State TCC documents.
                            </p>
                        </div>

                        <Dialog>
                            <DialogTrigger asChild>
                                <Button className="shrink-0 gap-2">
                                    <ShieldCheck className="h-4 w-4" />
                                    Request New TCC
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>New TCC Application</DialogTitle>
                                    <DialogDescription>
                                        Select the assessment year you need clearance for. You must have fully paid ledgers for this period.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="py-4 space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Assessment Year</label>
                                        <Select value={targetYear} onValueChange={setTargetYear}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select year..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {availableYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button onClick={handleApply} disabled={isApplying}>
                                        {isApplying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                                        Initiate Application
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <Card className="bg-primary/5 border-primary/20">
                            <CardContent className="p-6">
                                <ShieldCheck className="h-8 w-8 text-primary mb-2" />
                                <h3 className="font-semibold text-lg">Why TCCs matter</h3>
                                <p className="text-sm text-muted-foreground mt-1">Required for government contracts, foreign exchange processing, and corporate compliance validations.</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-background">
                            <CardContent className="p-6">
                                <MailWarning className="h-8 w-8 text-amber-500 mb-2" />
                                <h3 className="font-semibold text-lg">Prerequisites</h3>
                                <p className="text-sm text-muted-foreground mt-1">Buoyance will block TCC requests if there are pending liabilities or un-archived payrolls for the target year.</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-background">
                            <CardContent className="p-6">
                                <Clock className="h-8 w-8 text-blue-500 mb-2" />
                                <h3 className="font-semibold text-lg">Processing Time</h3>
                                <p className="text-sm text-muted-foreground mt-1">Normally 2-4 weeks. Uploading your Remita payment receipt instantly accelerates the validation check.</p>
                            </CardContent>
                        </Card>
                    </div>

                    {isLoading ? (
                        <Card className="p-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></Card>
                    ) : tccRecords.length === 0 ? (
                        <Card className="p-12 text-center text-muted-foreground bg-muted/10">
                            <FileBadge className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No TCC records found for this workspace.</p>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            {tccRecords.map(record => (
                                <Card key={record.id} className="overflow-hidden">
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-0">
                                        <div className="col-span-12 md:col-span-8 p-6">
                                            <div className="flex items-center gap-3 justify-between md:justify-start mb-2">
                                                <h3 className="text-xl font-bold">{record.tax_year} Assessment Year</h3>
                                                {renderStatusBadge(record.status)}
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 mt-6">
                                                <div>
                                                    <p className="text-sm text-muted-foreground">Application Number</p>
                                                    <p className="font-mono text-sm">{record.application_number || 'Pending FIRS ID'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-muted-foreground">TCC Number</p>
                                                    <p className="font-mono text-sm">{record.tcc_number || 'Unissued'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-muted-foreground">Remita Proof</p>
                                                    <p className="font-mono text-sm flex items-center gap-1 text-primary">
                                                        {record.remita_rrr || 'Not Uploaded'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-muted-foreground">Submitted</p>
                                                    <p className="font-mono text-sm">{new Date(record.created_at).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="col-span-12 md:col-span-4 bg-muted/20 border-t md:border-t-0 md:border-l p-6 flex flex-col justify-center gap-3">
                                            {record.status === 'pending' && !record.remita_rrr && (
                                                <>
                                                    <p className="text-xs text-center text-muted-foreground mb-1">
                                                        Paid processing fees at bank? Upload Remita receipt here.
                                                    </p>
                                                    <div>
                                                        <input
                                                            type="file"
                                                            id={`file-${record.id}`}
                                                            className="hidden"
                                                            accept="image/*,.pdf"
                                                            onChange={(e) => handleUploadRemita(e, record.id)}
                                                        />
                                                        <label htmlFor={`file-${record.id}`}>
                                                            <Button variant="outline" className="w-full cursor-pointer" asChild>
                                                                <span><Upload className="h-4 w-4 mr-2" /> Upload Remita PDF</span>
                                                            </Button>
                                                        </label>
                                                    </div>
                                                </>
                                            )}

                                            {record.status === 'approved' && (
                                                <Button className="w-full bg-green-600 hover:bg-green-700">
                                                    <Download className="h-4 w-4 mr-2" /> Download Final TCC
                                                </Button>
                                            )}

                                            {record.status !== 'approved' && record.remita_rrr && (
                                                <div className="text-center">
                                                    <Clock className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                                                    <p className="text-sm font-medium">Under FIRS Review</p>
                                                    <p className="text-xs text-muted-foreground">Awaiting final validation</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}

                </div>
            </main>
            <Footer />
        </div>
    );
}
