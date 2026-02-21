import { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Camera,
    Upload,
    RotateCcw,
    Check,
    X,
    Image as ImageIcon,
    Loader2,
    Smartphone,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CameraCaptureProps {
    onCapture: (file: File) => Promise<void>;
    acceptTypes?: string; // e.g., "image/*,.pdf"
    label?: string;
    description?: string;
    maxSizeMb?: number;
}

export function CameraCapture({
    onCapture,
    acceptTypes = "image/*,.pdf",
    label = "Scan Document",
    description = "Use your camera to capture receipts, invoices, or tax documents.",
    maxSizeMb = 10,
}: CameraCaptureProps) {
    const { toast } = useToast();
    const [preview, setPreview] = useState<string | null>(null);
    const [capturedFile, setCapturedFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    const handleFile = useCallback(
        (file: File) => {
            // Validate size
            if (file.size > maxSizeMb * 1024 * 1024) {
                toast({
                    title: "File too large",
                    description: `Maximum file size is ${maxSizeMb}MB.`,
                    variant: "destructive",
                });
                return;
            }

            setCapturedFile(file);

            // Generate preview for images
            if (file.type.startsWith("image/")) {
                const reader = new FileReader();
                reader.onload = (e) => setPreview(e.target?.result as string);
                reader.readAsDataURL(file);
            } else {
                setPreview(null); // PDFs don't get a visual preview
            }
        },
        [maxSizeMb, toast]
    );

    const handleCameraCapture = () => {
        cameraInputRef.current?.click();
    };

    const handleFileUpload = () => {
        fileInputRef.current?.click();
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
        // Reset input so the same file can be re-selected
        e.target.value = "";
    };

    const handleConfirm = async () => {
        if (!capturedFile) return;
        setUploading(true);
        try {
            await onCapture(capturedFile);
            toast({ title: "Document uploaded", description: capturedFile.name });
            setCapturedFile(null);
            setPreview(null);
        } catch (err: any) {
            toast({ title: "Upload failed", description: err.message, variant: "destructive" });
        } finally {
            setUploading(false);
        }
    };

    const handleRetake = () => {
        setCapturedFile(null);
        setPreview(null);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Camera className="h-5 w-5 text-primary" />
                    {label}
                </CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                {/* Hidden inputs */}
                <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleInputChange}
                />
                <input
                    ref={fileInputRef}
                    type="file"
                    accept={acceptTypes}
                    className="hidden"
                    onChange={handleInputChange}
                />

                {capturedFile ? (
                    // Preview State
                    <div className="space-y-4">
                        {preview ? (
                            <div className="relative rounded-lg overflow-hidden border bg-muted">
                                <img
                                    src={preview}
                                    alt="Captured document"
                                    className="w-full max-h-80 object-contain"
                                />
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 p-4 rounded-lg border bg-muted/50">
                                <ImageIcon className="h-8 w-8 text-muted-foreground" />
                                <div>
                                    <p className="font-medium text-sm">{capturedFile.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {(capturedFile.size / 1024).toFixed(0)} KB • {capturedFile.type}
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <Button variant="outline" onClick={handleRetake} disabled={uploading} className="flex-1">
                                <RotateCcw className="h-4 w-4 mr-2" /> Retake
                            </Button>
                            <Button onClick={handleConfirm} disabled={uploading} className="flex-1">
                                {uploading ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <Check className="h-4 w-4 mr-2" />
                                )}
                                Upload
                            </Button>
                        </div>
                    </div>
                ) : (
                    // Capture State
                    <div className="space-y-4">
                        <div
                            className="border-2 border-dashed rounded-xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                            onClick={handleFileUpload}
                            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                            onDrop={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const file = e.dataTransfer.files?.[0];
                                if (file) handleFile(file);
                            }}
                        >
                            <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                            <p className="text-sm font-medium mb-1">Drop a file or click to browse</p>
                            <p className="text-xs text-muted-foreground">
                                Supports images and PDFs up to {maxSizeMb}MB
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <Button variant="outline" onClick={handleCameraCapture} className="flex-1">
                                <Smartphone className="h-4 w-4 mr-2" /> Use Camera
                            </Button>
                            <Button variant="outline" onClick={handleFileUpload} className="flex-1">
                                <Upload className="h-4 w-4 mr-2" /> Choose File
                            </Button>
                        </div>

                        <p className="text-xs text-muted-foreground text-center">
                            Tip: For best results, ensure good lighting and capture the entire document.
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
