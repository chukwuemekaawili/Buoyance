import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useWorkspace, WorkspaceRole } from "@/hooks/useWorkspace";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Building2, ChevronRight, FileSearch, ShieldAlert, ArrowRightCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";

export default function AccountantDashboard() {
    const { user } = useAuth();
    const { workspaces, setActiveWorkspaceId, isLoading } = useWorkspace();
    const navigate = useNavigate();

    // Filter only workspaces where user is an External_Accountant
    const clientWorkspaces = useMemo(() => {
        return workspaces.filter(w => w.role === "External_Accountant");
    }, [workspaces]);

    const handleEnterClient = (id: string) => {
        setActiveWorkspaceId(id);
        navigate("/dashboard");
    };

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Header />
            <main className="flex-grow pt-20 md:pt-28 pb-16">
                <div className="container mx-auto px-4 md:px-6 max-w-5xl">
                    <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Badge variant="secondary" className="px-2 py-1 text-xs font-semibold uppercase tracking-wider">
                                    <Briefcase className="w-3 h-3 mr-1" />
                                    Accountant Portal
                                </Badge>
                            </div>
                            <h1 className="text-3xl font-bold text-foreground">Client Directory</h1>
                            <p className="text-muted-foreground mt-1">
                                Securely manage and audit your associated client workspaces.
                            </p>
                        </div>

                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded-md px-3 py-2 text-sm flex items-center gap-2">
                                        <ShieldAlert className="h-4 w-4" />
                                        Strict Audit Trail Active
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="w-64 text-xs">
                                        As an External Accountant, all your sign-offs, exports, and approvals are immutably logged to the workspace's NDPA compliance trail.
                                    </p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>

                    {isLoading ? (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {[1, 2, 3].map((n) => (
                                <Card key={n} className="animate-pulse shadow-none border-border">
                                    <CardHeader className="h-32 bg-muted/20" />
                                </Card>
                            ))}
                        </div>
                    ) : clientWorkspaces.length === 0 ? (
                        <Card className="text-center py-12 shadow-none border-dashed bg-muted/30">
                            <CardContent>
                                <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                                    <Building2 className="h-8 w-8 text-muted-foreground" />
                                </div>
                                <h3 className="text-lg font-semibold mb-2">No Active Clients</h3>
                                <p className="text-muted-foreground max-w-sm mx-auto mb-6 text-sm">
                                    You haven't been invited to manage any business workspaces yet. Instruct your clients to invite you via their Settings &gt; Team portal.
                                </p>
                                <Button variant="outline" asChild>
                                    <Link to="/dashboard">Return to Personal Dashboard</Link>
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {clientWorkspaces.map((client) => (
                                <Card key={client.id} className="group hover:shadow-md transition-shadow border-primary/10 overflow-hidden relative">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
                                    <CardHeader className="pb-4">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold shadow-sm">
                                                {client.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <Badge variant="outline" className="text-[10px] uppercase">
                                                {client.entity_type.replace('_', ' ')}
                                            </Badge>
                                        </div>
                                        <CardTitle className="text-xl line-clamp-1">{client.name}</CardTitle>
                                        <CardDescription className="flex flex-col gap-1 mt-1">
                                            {client.tin ? (
                                                <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded w-fit">TIN: {client.tin}</span>
                                            ) : (
                                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <ShieldAlert className="h-3 w-3 text-amber-500" /> No TIN configuration
                                                </span>
                                            )}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="bg-muted/30 rounded-lg p-3 text-sm grid grid-cols-2 gap-2 mb-4">
                                            <div className="flex flex-col">
                                                <span className="text-muted-foreground text-xs">Access Level</span>
                                                <span className="font-medium">External Auth</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-muted-foreground text-xs">Ledger Sync</span>
                                                <span className="font-medium text-green-600">Active</span>
                                            </div>
                                        </div>
                                        <Button
                                            className="w-full flex justify-between items-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                                            variant="secondary"
                                            onClick={() => handleEnterClient(client.id)}
                                        >
                                            Audit Workspace
                                            <ArrowRightCircle className="h-4 w-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                                        </Button>
                                    </CardContent>
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
