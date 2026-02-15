import { useState, useMemo } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Upload, Download, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { getJurisdictionLabel, getReadinessColor, DEFAULT_REQUIREMENTS } from "@/lib/tccService";

// Use default requirements directly since we're not hitting DB
const getRequirements = (jurisdiction: string) =>
    DEFAULT_REQUIREMENTS.filter(r => r.jurisdiction === jurisdiction).map((r, i) => ({ ...r, id: `req-${i}` }));

function TCCReadinessContent() {
    const [jurisdiction, setJurisdiction] = useState("federal");
    const requirements = useMemo(() => getRequirements(jurisdiction), [jurisdiction]);
    const [completed, setCompleted] = useState<Set<string>>(new Set());

    const toggleItem = (id: string) => {
        setCompleted(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const mandatoryReqs = requirements.filter(r => r.is_mandatory);
    const mandatoryCompleted = mandatoryReqs.filter(r => completed.has(r.id)).length;
    const score = mandatoryReqs.length > 0 ? Math.round((mandatoryCompleted / mandatoryReqs.length) * 100) : 0;
    const color = getReadinessColor(score);

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Header />
            <main className="flex-grow pt-20 md:pt-28 pb-16">
                <div className="container mx-auto px-4 md:px-6 max-w-6xl">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-foreground">TCC Readiness</h1>
                            <p className="text-muted-foreground mt-2">Track requirements for your Tax Clearance Certificate.</p>
                        </div>
                        <Select value={jurisdiction} onValueChange={(v) => { setJurisdiction(v); setCompleted(new Set()); }}>
                            <SelectTrigger className="w-48">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="federal">Federal (FIRS)</SelectItem>
                                <SelectItem value="lagos">Lagos (LIRS)</SelectItem>
                                <SelectItem value="fct">FCT (FIRS)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Score Card */}
                    <Card className="mb-8">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-6">
                                <div className={`w-24 h-24 rounded-full flex items-center justify-center text-2xl font-bold
                  ${color === 'green' ? 'bg-green-500/10 text-green-600 border-2 border-green-500' :
                                        color === 'yellow' ? 'bg-yellow-500/10 text-yellow-600 border-2 border-yellow-500' :
                                            'bg-red-500/10 text-red-600 border-2 border-red-500'}`}>
                                    {score}%
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-lg font-semibold">
                                        {score >= 80 ? '✅ Almost Ready!' : score >= 50 ? '⚡ Making Progress' : '⚠️ Missing Documents'}
                                    </h2>
                                    <p className="text-sm text-muted-foreground mb-2">
                                        {mandatoryCompleted} of {mandatoryReqs.length} mandatory requirements complete — {getJurisdictionLabel(jurisdiction)}
                                    </p>
                                    <Progress value={score} className="h-2" />
                                </div>
                                <Button variant="outline" disabled={score < 50}>
                                    <Download className="h-4 w-4 mr-2" /> Export Evidence Pack
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Requirements */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Requirements Checklist</CardTitle>
                            <CardDescription>Upload or mark each document as ready</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {requirements.map(req => {
                                    const isDone = completed.has(req.id);
                                    return (
                                        <div
                                            key={req.id}
                                            className={`flex items-center justify-between p-4 rounded-lg cursor-pointer transition-colors
                        ${isDone ? 'bg-green-500/5 border border-green-500/20' : 'bg-muted/50 hover:bg-muted'}`}
                                            onClick={() => toggleItem(req.id)}
                                        >
                                            <div className="flex items-center gap-3">
                                                {isDone ? (
                                                    <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                                                ) : (
                                                    <XCircle className="h-5 w-5 text-muted-foreground shrink-0" />
                                                )}
                                                <div>
                                                    <p className={`font-medium text-sm ${isDone ? 'line-through text-muted-foreground' : ''}`}>
                                                        {req.description}
                                                    </p>
                                                    <div className="flex gap-2 mt-1">
                                                        {req.is_mandatory ? (
                                                            <Badge variant="destructive" className="text-xs">Required</Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="text-xs">Optional</Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); }}>
                                                <Upload className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>
            <Footer />
        </div>
    );
}

export default function TCCReadiness() {
    return (
        <AuthGuard>
            <TCCReadinessContent />
        </AuthGuard>
    );
}
