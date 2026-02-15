import { useState, useCallback, useEffect } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useDropzone } from "react-dropzone";
import { Upload, Search, CheckCircle, AlertTriangle, FileText, Loader2, Eye } from "lucide-react";
import { extractWHTCertificate, type WHTCertificateData, type OCRProgress } from "@/lib/ocrService";
import { formatCredit } from "@/lib/whtCreditService";

interface CreditRecord {
    id: string;
    issuer_name: string;
    amount_kobo: number;
    tax_year: number;
    status: string;
    remaining_kobo: number;
}

function WHTCreditsContent() {
    const { toast } = useToast();
    const { user } = useAuth();
    const [ocrProgress, setOcrProgress] = useState<OCRProgress | null>(null);
    const [extractedData, setExtractedData] = useState<WHTCertificateData | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [credits, setCredits] = useState<CreditRecord[]>([]);
    const [loadingCredits, setLoadingCredits] = useState(true);

    // Load credits from Supabase
    useEffect(() => {
        if (!user) return;
        (async () => {
            try {
                const { data, error } = await supabase
                    .from('wht_credit_ledger' as any)
                    .select('id, issuer_name, amount_kobo, tax_year, status, remaining_kobo')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false });
                if (error) throw error;
                setCredits((data || []) as CreditRecord[]);
            } catch {
                setCredits([]);
            } finally {
                setLoadingCredits(false);
            }
        })();
    }, [user]);

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (!file) return;

        setPreviewUrl(URL.createObjectURL(file));
        setLoading(true);
        setExtractedData(null);

        try {
            const data = await extractWHTCertificate(file, (p) => setOcrProgress(p));
            setExtractedData(data);
            toast({
                title: "Certificate scanned!",
                description: `Confidence: ${(data.ocr_confidence * 100).toFixed(0)}%. Review the extracted data below.`,
            });
        } catch (err) {
            toast({ title: "OCR Failed", description: String(err), variant: "destructive" });
        } finally {
            setLoading(false);
            setOcrProgress(null);
        }
    }, [toast]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': ['.png', '.jpg', '.jpeg'], 'application/pdf': ['.pdf'] },
        maxFiles: 1,
    });

    const confirmAndAdd = async () => {
        if (!user || !extractedData) return;
        setSaving(true);

        try {
            // Save certificate
            const certRow = {
                user_id: user.id,
                issuer_name: extractedData.issuer_name || 'Unknown',
                issuer_tin: extractedData.issuer_tin || null,
                amount_kobo: extractedData.amount_kobo || 0,
                wht_rate: extractedData.wht_rate || 0,
                issue_date: extractedData.issue_date || null,
                tax_year: extractedData.tax_year || new Date().getFullYear(),
                ocr_confidence: extractedData.ocr_confidence,
                status: 'verified',
            };

            const { error: certError } = await supabase.from('wht_certificates' as any).insert(certRow);
            if (certError) throw certError;

            // Add to credit ledger
            const creditRow = {
                user_id: user.id,
                certificate_id: null, // Would link if we select the inserted cert
                issuer_name: certRow.issuer_name,
                amount_kobo: certRow.amount_kobo,
                remaining_kobo: certRow.amount_kobo,
                tax_year: certRow.tax_year,
                status: 'available',
                expiry_date: `${certRow.tax_year + 6}-12-31`, // WHT credits expire after 6 years
            };

            const { data: newCredit, error: ledgerError } = await supabase.from('wht_credit_ledger' as any).insert(creditRow).select().single();
            if (ledgerError) throw ledgerError;

            setCredits(prev => [newCredit as CreditRecord, ...prev]);
            setExtractedData(null);
            setPreviewUrl(null);

            toast({ title: "Certificate added!", description: `${formatCredit(certRow.amount_kobo)} credit from ${certRow.issuer_name}` });
        } catch (err: any) {
            toast({ title: "Save Failed", description: err.message || String(err), variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const totalAvailable = credits.reduce((s, c) => s + (c.remaining_kobo || 0), 0);

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Header />
            <main className="flex-grow pt-20 md:pt-28 pb-16">
                <div className="container mx-auto px-4 md:px-6 max-w-6xl">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-foreground">WHT Credits</h1>
                        <p className="text-muted-foreground mt-2">
                            Upload WHT certificates, track credits, and apply them to filings.
                        </p>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription>Available Credit</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-bold text-green-600">{formatCredit(totalAvailable)}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription>Certificates</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-bold">{credits.length}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription>Applied This Year</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-bold text-blue-600">
                                    {formatCredit(credits.reduce((s, c) => s + ((c.amount_kobo || 0) - (c.remaining_kobo || 0)), 0))}
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <Tabs defaultValue="upload" className="space-y-6">
                        <TabsList>
                            <TabsTrigger value="upload">Upload Certificate</TabsTrigger>
                            <TabsTrigger value="ledger">Credit Ledger</TabsTrigger>
                        </TabsList>

                        {/* Upload Tab */}
                        <TabsContent value="upload" className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Upload WHT Certificate</CardTitle>
                                    <CardDescription>
                                        Drag & drop a WHT certificate image or PDF. OCR will auto-extract issuer, amount, TIN, and date.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div
                                        {...getRootProps()}
                                        className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors
                      ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/20 hover:border-primary/50'}`}
                                    >
                                        <input {...getInputProps()} />
                                        {loading ? (
                                            <div className="space-y-3">
                                                <Loader2 className="h-10 w-10 mx-auto animate-spin text-primary" />
                                                <p className="text-sm text-muted-foreground">
                                                    {ocrProgress?.status || 'Processing...'} ({((ocrProgress?.progress || 0) * 100).toFixed(0)}%)
                                                </p>
                                            </div>
                                        ) : (
                                            <>
                                                <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                                                <p className="font-medium">Drop WHT certificate here</p>
                                                <p className="text-sm text-muted-foreground mt-1">PNG, JPG, or PDF</p>
                                            </>
                                        )}
                                    </div>

                                    {/* Preview & Extracted Data */}
                                    {extractedData && (
                                        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {previewUrl && (
                                                <div className="border rounded-lg p-2">
                                                    <img src={previewUrl} alt="Certificate preview" className="rounded max-h-64 mx-auto" />
                                                </div>
                                            )}
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-2 mb-4">
                                                    {extractedData.ocr_confidence > 0.7 ? (
                                                        <Badge className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" /> High Confidence</Badge>
                                                    ) : (
                                                        <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" /> Review Needed</Badge>
                                                    )}
                                                    <span className="text-sm text-muted-foreground">{(extractedData.ocr_confidence * 100).toFixed(0)}% accuracy</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <Label className="text-xs text-muted-foreground">Issuer</Label>
                                                        <Input defaultValue={extractedData.issuer_name || ''} />
                                                    </div>
                                                    <div>
                                                        <Label className="text-xs text-muted-foreground">Issuer TIN</Label>
                                                        <Input defaultValue={extractedData.issuer_tin || ''} />
                                                    </div>
                                                    <div>
                                                        <Label className="text-xs text-muted-foreground">Amount</Label>
                                                        <Input defaultValue={extractedData.amount_kobo ? `₦${(extractedData.amount_kobo / 100).toLocaleString()}` : ''} />
                                                    </div>
                                                    <div>
                                                        <Label className="text-xs text-muted-foreground">WHT Rate</Label>
                                                        <Input defaultValue={extractedData.wht_rate ? `${(extractedData.wht_rate * 100).toFixed(1)}%` : ''} />
                                                    </div>
                                                    <div>
                                                        <Label className="text-xs text-muted-foreground">Date</Label>
                                                        <Input defaultValue={extractedData.issue_date || ''} />
                                                    </div>
                                                    <div>
                                                        <Label className="text-xs text-muted-foreground">Tax Year</Label>
                                                        <Input defaultValue={extractedData.tax_year?.toString() || ''} />
                                                    </div>
                                                </div>
                                                <Button className="w-full" onClick={confirmAndAdd} disabled={saving}>
                                                    {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                                                    Confirm & Add to Ledger
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Ledger Tab */}
                        <TabsContent value="ledger">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Credit Ledger</CardTitle>
                                    <CardDescription>All WHT credits from uploaded certificates</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {loadingCredits ? (
                                        <div className="flex items-center justify-center py-12">
                                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                        </div>
                                    ) : credits.length === 0 ? (
                                        <div className="text-center py-12 text-muted-foreground">
                                            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                            <p>No credits yet. Upload a WHT certificate to get started.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {credits.map(credit => (
                                                <div key={credit.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                                                    <div className="flex items-center gap-3">
                                                        <FileText className="h-5 w-5 text-primary" />
                                                        <div>
                                                            <p className="font-medium">{credit.issuer_name}</p>
                                                            <p className="text-sm text-muted-foreground">Tax Year: {credit.tax_year}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-medium">{formatCredit(credit.amount_kobo)}</p>
                                                        <Badge variant={credit.status === 'available' ? 'default' : credit.status === 'partially_applied' ? 'secondary' : 'outline'}>
                                                            {credit.status === 'available' ? 'Available' : credit.status === 'partially_applied' ? `${formatCredit(credit.remaining_kobo)} remaining` : 'Fully Applied'}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </main>
            <Footer />
        </div>
    );
}

export default function WHTCredits() {
    return (
        <AuthGuard>
            <WHTCreditsContent />
        </AuthGuard>
    );
}
