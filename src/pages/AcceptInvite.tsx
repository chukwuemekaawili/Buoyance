import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, XCircle, Building2 } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export default function AcceptInvite() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");

    const { user, loading: authLoading } = useAuth();
    const { refreshWorkspaces } = useWorkspace();
    const { toast } = useToast();
    const navigate = useNavigate();

    const [status, setStatus] = useState<"loading" | "verifying" | "success" | "error">("loading");
    const [errorMessage, setErrorMessage] = useState("");
    const [workspaceName, setWorkspaceName] = useState<string | null>(null);

    useEffect(() => {
        if (authLoading) return;

        if (!user) {
            // Must be logged in to accept an invite. Store the redirect URL and bounce.
            const returnUrl = `/accept-invite?token=${token}`;
            navigate(`/signin?return_to=${encodeURIComponent(returnUrl)}`);
            return;
        }

        if (!token) {
            setStatus("error");
            setErrorMessage("No invitation token provided in the URL.");
            return;
        }

        verifyAndAcceptToken();
    }, [user, authLoading, token, navigate]);

    const verifyAndAcceptToken = async () => {
        setStatus("verifying");

        try {
            // Look up workspace name for UI first (RPC returns success boolean, not details)
            const { data: invite, error: pickErr } = await supabase
                .from('workspace_invitations')
                .select('organizations ( name )')
                .eq('token', token)
                .eq('status', 'pending')
                .single();

            if (!pickErr && invite?.organizations) {
                setWorkspaceName((invite.organizations as any).name);
            }

            // Call the secure RPC to accept the invite
            const { error } = await supabase.rpc('accept_workspace_invitation', { invite_token: token });

            if (error) {
                throw error;
            }

            // It succeeded! Refresh global workspace context
            await refreshWorkspaces();
            setStatus("success");

        } catch (err: any) {
            setStatus("error");
            // Clean up Supabase Postgres errors for UI readability
            if (err.message.includes('different email address')) {
                setErrorMessage("You are logged in with a different email than the one invited.");
            } else if (err.message.includes('Invalid or expired')) {
                setErrorMessage("This invitation has expired or was already accepted.");
            } else {
                setErrorMessage(err.message || "An unknown error occurred resolving the invitation.");
            }
        }
    };

    const currentStepLoading = status === "loading" || status === "verifying";

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Header />
            <main className="flex-grow flex items-center justify-center p-4">
                <Card className="max-w-md w-full shadow-lg border-primary/10">
                    <CardHeader className="text-center">
                        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                            <Building2 className="h-6 w-6 text-primary" />
                        </div>
                        <CardTitle className="text-2xl">Workspace Invitation</CardTitle>
                        <CardDescription>
                            {status === "success"
                                ? "You have successfully joined the team."
                                : "Resolving your access cryptographic token..."}
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="text-center py-6">
                        {currentStepLoading && (
                            <div className="flex flex-col items-center gap-4 text-muted-foreground">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                <p>Verifying invitation and matching credentials...</p>
                            </div>
                        )}

                        {status === "success" && (
                            <div className="flex flex-col items-center gap-4 text-green-600 dark:text-green-500">
                                <CheckCircle2 className="h-12 w-12" />
                                <p className="font-medium text-foreground">
                                    Welcome aboard! You now have access to {workspaceName ? `"${workspaceName}"` : "the workspace"}.
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    You can switch between your workspaces at any time using the dropdown menu in the top right corner.
                                </p>
                            </div>
                        )}

                        {status === "error" && (
                            <div className="flex flex-col items-center gap-4 text-destructive">
                                <XCircle className="h-12 w-12" />
                                <p className="font-medium text-foreground">Invitation Failed</p>
                                <p className="text-sm text-balance">
                                    {errorMessage}
                                </p>
                            </div>
                        )}
                    </CardContent>

                    <CardFooter className="flex justify-center border-t bg-muted/50 p-4 rounded-b-lg">
                        {status === "success" ? (
                            <Button onClick={() => navigate('/dashboard')} className="w-full">
                                Continue to Dashboard
                            </Button>
                        ) : status === "error" ? (
                            <Button onClick={() => navigate('/dashboard')} variant="outline" className="w-full">
                                Go to Default Dashboard
                            </Button>
                        ) : null}
                    </CardFooter>
                </Card>
            </main>
            <Footer />
        </div>
    );
}
