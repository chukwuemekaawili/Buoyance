import React, { useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { extractReceiptWithAI, OCRProcessResult } from '@/lib/ocrService';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { UploadCloud, Loader2, FileImage, Camera, Sparkles, Info } from 'lucide-react';

interface ReceiptScannerProps {
    onScanComplete: (result: OCRProcessResult) => void;
    onCancel: () => void;
}

export function ReceiptScanner({ onScanComplete, onCancel }: ReceiptScannerProps) {
    const [isScanning, setIsScanning] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [aiTreatment, setAiTreatment] = useState<string | null>(null);
    const [treatmentLoading, setTreatmentLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { activeWorkspace } = useWorkspace();
    const { toast } = useToast();

    // Get AI tax treatment explanation for the extracted receipt
    const getAITaxTreatment = async (result: OCRProcessResult) => {
        setTreatmentLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke("ai-chat", {
                body: {
                    messages: [{
                        role: "user",
                        content: `A Nigerian taxpayer scanned a receipt. Based on the extracted data below, give ONE sentence explaining the tax treatment under NTA 2025. Be specific about whether it's deductible or not.

Merchant: ${result.merchant || 'Unknown'}
Amount: ₦${result.amount_ngn ? result.amount_ngn.toLocaleString() : 'Unknown'}
Category: ${result.tax_category || 'Unknown'}

Respond with just one sentence, no markdown.`
                    }],
                },
            });

            if (!error && data?.content) {
                setAiTreatment(data.content);
            }
        } catch (err) {
            console.error("AI tax treatment error:", err);
        } finally {
            setTreatmentLoading(false);
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
        setAiTreatment(null);

        if (!activeWorkspace) {
            toast({
                title: "Workspace Error",
                description: "You must have an active workspace to upload receipts.",
                variant: "destructive"
            });
            return;
        }

        setIsScanning(true);
        try {
            const result = await extractReceiptWithAI(file, activeWorkspace.id);

            toast({
                title: "Scan Successful",
                description: `Extracted data for ${result.merchant || 'Unknown Vendor'}`
            });

            // Fire AI tax treatment explanation (non-blocking)
            getAITaxTreatment(result);

            onScanComplete(result);
        } catch (err: any) {
            toast({
                title: "Scan Failed",
                description: err.message,
                variant: "destructive"
            });
            setPreviewUrl(null);
        } finally {
            setIsScanning(false);
        }
    };

    return (
        <Card className="p-6">
            <div className="text-center mb-6">
                <h3 className="text-lg font-semibold flex items-center justify-center gap-2">
                    <Camera className="h-5 w-5 text-primary" />
                    Smart Receipt Scanner
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                    Upload a receipt or invoice. Our AI will automatically extract the merchant, date, amount, and NTA 2025 tax category.
                </p>
            </div>

            <div className="space-y-4">
                {!previewUrl ? (
                    <div
                        className="border-2 border-dashed border-primary/20 rounded-xl p-8 text-center bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*,.pdf"
                            onChange={handleFileSelect}
                            capture="environment"
                        />
                        <UploadCloud className="h-12 w-12 mx-auto text-primary/40 mb-3" />
                        <p className="font-medium">Tap to Scan or Upload</p>
                        <p className="text-xs text-muted-foreground mt-1">Accepts images and PDFs up to 5MB</p>
                    </div>
                ) : (
                    <div className="relative rounded-xl overflow-hidden border bg-black/5 flex items-center justify-center h-48">
                        <img
                            src={previewUrl}
                            alt="Receipt Preview"
                            className="max-h-full object-contain opacity-50"
                        />
                        {isScanning && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
                                <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
                                <p className="font-medium animate-pulse">Running AI Vision Extraction...</p>
                                <p className="text-xs text-muted-foreground">Mapping to valid NTA 2025 categories</p>
                            </div>
                        )}
                    </div>
                )}

                {/* AI Tax Treatment Explanation - Feature 3 */}
                {(treatmentLoading || aiTreatment) && (
                    <div className="flex flex-col gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
                        <div className="flex items-start gap-2">
                            {treatmentLoading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0 mt-0.5" />
                                    <p className="text-sm text-muted-foreground animate-pulse">Analyzing tax treatment...</p>
                                </>
                            ) : (
                                <>
                                    <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                    <p className="text-sm text-foreground leading-snug">{aiTreatment}</p>
                                </>
                            )}
                        </div>
                        <div className="mt-1 pt-2 border-t text-xs text-amber-600/90 flex items-start gap-1">
                            <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                            <p>
                                <strong>Disclaimer:</strong> AI estimations may be inaccurate. Do not use for final filing without human verification.
                            </p>
                        </div>
                    </div>
                )}

                <div className="flex justify-end pt-2">
                    <Button variant="ghost" onClick={onCancel} disabled={isScanning}>
                        Cancel
                    </Button>
                </div>
            </div>
        </Card>
    );
}
