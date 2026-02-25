import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Link } from "react-router-dom";

interface Props {
    children: ReactNode;
    /** Optional fallback UI to show instead of the default */
    fallback?: ReactNode;
    /** Optional label for identifying which boundary caught the error */
    label?: string;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * ErrorBoundary catches any React render error in its children tree
 * and shows a user-friendly fallback instead of a white screen.
 */
export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error(`[ErrorBoundary${this.props.label ? `: ${this.props.label}` : ""}]`, error, errorInfo);
    }

    private handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-[60vh] flex items-center justify-center p-6">
                    <div className="max-w-md w-full text-center space-y-6">
                        <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                            <AlertTriangle className="h-8 w-8 text-destructive" />
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-xl font-bold text-foreground">Something went wrong</h2>
                            <p className="text-sm text-muted-foreground">
                                This page encountered an unexpected error. This is usually temporary — try refreshing.
                            </p>
                        </div>

                        {this.state.error && (
                            <div className="bg-muted/50 border rounded-lg p-3 text-left">
                                <p className="text-xs font-mono text-muted-foreground break-all">
                                    {this.state.error.message}
                                </p>
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                            <Button onClick={this.handleRetry} className="gap-2">
                                <RefreshCw className="h-4 w-4" />
                                Try Again
                            </Button>
                            <Button variant="outline" asChild className="gap-2">
                                <Link to="/dashboard">
                                    <Home className="h-4 w-4" />
                                    Go to Dashboard
                                </Link>
                            </Button>
                        </div>

                        <p className="text-xs text-muted-foreground">
                            If this keeps happening, try pressing <kbd className="px-1.5 py-0.5 rounded bg-muted border text-xs">Ctrl+Shift+R</kbd> to hard-refresh, or clear your browser cache.
                        </p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
