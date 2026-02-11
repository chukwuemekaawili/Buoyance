import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Landmark, Plus, Trash2, RefreshCw, Loader2, AlertCircle, CheckCircle2, ArrowLeft, Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useIntegrationStatus } from "@/hooks/useIntegrationStatus";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BankProvider, connectBank, disconnectBank, syncBankTransactions, getSupportedProviders } from "@/lib/bankingService";

interface BankConnection {
  id: string;
  provider: string;
  account_id: string;
  account_name: string | null;
  connected_at: string | null;
  last_sync: string | null;
  status: string | null;
}

export default function BankConnections() {
  const [connections, setConnections] = useState<BankConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<BankProvider>("mono");
  const [accountName, setAccountName] = useState("");
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { banking, loading: statusLoading, error: statusError } = useIntegrationStatus();

  const supportedBanks = getSupportedProviders();
  const bankingConfigured = banking?.configured ?? false;

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/signin");
      return;
    }
    fetchConnections();
  }, [user, authLoading, navigate]);

  const fetchConnections = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("bank_connections")
        .select("*")
        .eq("user_id", user.id)
        .order("connected_at", { ascending: false });

      if (error) throw error;
      setConnections(data || []);
    } catch (err: any) {
      toast({
        title: "Failed to load connections",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!user || !accountName.trim()) return;

    setIsConnecting(true);
    try {
      const result = await connectBank(selectedProvider);
      
      if (!result.success) {
        throw new Error(result.error);
      }

      // Save connection to database (demo mode generates a random account_id)
      const { error } = await supabase.from("bank_connections").insert({
        user_id: user.id,
        provider: selectedProvider,
        account_id: result.connectionId || crypto.randomUUID(),
        account_name: accountName.trim(),
        connected_at: new Date().toISOString(),
        status: "active",
      });

      if (error) throw error;

      toast({
        title: "Bank connected!",
        description: result.isStubbed 
          ? "Connected in demo mode (no API keys configured)" 
          : "Your bank account has been connected successfully.",
      });

      setShowConnectDialog(false);
      setAccountName("");
      fetchConnections();
    } catch (err: any) {
      toast({
        title: "Failed to connect bank",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    if (!user) return;

    try {
      const success = await disconnectBank(connectionId);
      
      if (!success) {
        throw new Error("Failed to disconnect bank account");
      }

      toast({
        title: "Bank disconnected",
        description: "Your bank account has been removed.",
      });

      fetchConnections();
    } catch (err: any) {
      toast({
        title: "Failed to disconnect",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleSync = async (connectionId: string) => {
    if (!user) return;

    const connection = connections.find(c => c.id === connectionId);
    if (!connection) return;

    setSyncingId(connectionId);
    try {
      const result = await syncBankTransactions(connectionId);

      if (!result.success) {
        throw new Error(result.error);
      }

      // Update last_sync timestamp
      await supabase
        .from("bank_connections")
        .update({ last_sync: new Date().toISOString() })
        .eq("id", connectionId);

      const txCount = result.transactions?.length || 0;
      toast({
        title: "Sync complete",
        description: result.isStubbed
          ? `Demo: ${txCount} sample transactions available`
          : `Synced ${txCount} transactions`,
      });

      fetchConnections();
    } catch (err: any) {
      toast({
        title: "Sync failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSyncingId(null);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-grow pt-20 md:pt-28 pb-16 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-grow pt-20 md:pt-28 pb-16">
        <div className="container mx-auto px-4 md:px-6 max-w-3xl">
          <Link to="/dashboard" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>

          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">Bank Connections</h1>
              <p className="text-muted-foreground">Connect your bank accounts to import transactions</p>
            </div>
            <Dialog open={showConnectDialog} onOpenChange={setShowConnectDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Connect Bank
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Connect Bank Account</DialogTitle>
                  <DialogDescription>
                    Choose your bank provider and enter a name for this account.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Provider</Label>
                    <Select value={selectedProvider} onValueChange={(v) => setSelectedProvider(v as BankProvider)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {supportedBanks.map(bank => (
                          <SelectItem key={bank.id} value={bank.id}>
                            {bank.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Account Name</Label>
                    <Input
                      placeholder="e.g., GTBank Savings"
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                    />
                  </div>
                  <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground">
                    <AlertCircle className="h-4 w-4 inline mr-2" />
                    Note: This feature is currently in demo mode. No actual bank connection will be made.
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowConnectDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleConnect} disabled={isConnecting || !accountName.trim()}>
                    {isConnecting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      "Connect"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {statusLoading || isLoading ? (
            <Card className="p-12 flex flex-col items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Loading...</p>
            </Card>
          ) : !bankingConfigured ? (
            <div className="space-y-6">
              {/* Coming Soon Panel */}
              <Card className="p-8 text-center border-dashed">
                <Landmark className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <Badge variant="outline" className="mb-4">
                  <Clock className="h-3 w-3 mr-1" />
                  Coming Soon
                </Badge>
                <h3 className="text-lg font-semibold mb-2">Bank Import (Coming Soon)</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Auto-import transactions will be available once banking integration is enabled.
                </p>
              </Card>

              {/* Manual Mode Panel */}
              <Card className="p-6 border-primary/20 bg-primary/5">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <CheckCircle2 className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-1">Use Manual Mode Now (Available)</h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      You can still calculate taxes and generate filings by adding records manually.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <Button asChild variant="default" size="sm">
                        <Link to="/incomes">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Income
                        </Link>
                      </Button>
                      <Button asChild variant="outline" size="sm">
                        <Link to="/expenses">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Expense
                        </Link>
                      </Button>
                      <Button asChild variant="outline" size="sm">
                        <Link to="/calculators">
                          Go to Calculators
                        </Link>
                      </Button>
                      <Button asChild variant="outline" size="sm">
                        <Link to="/filings/new">
                          Create Filing
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          ) : connections.length === 0 ? (
            <Card className="p-12 text-center">
              <Landmark className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <h3 className="text-lg font-semibold mb-2">No bank accounts connected</h3>
              <p className="text-muted-foreground mb-4">
                Connect your bank to automatically import transactions for tax calculations.
              </p>
              <Button onClick={() => setShowConnectDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Connect Your First Bank
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {connections.map(conn => (
                <Card key={conn.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <Landmark className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{conn.account_name || "Bank Account"}</h3>
                        <p className="text-sm text-muted-foreground capitalize">{conn.provider}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            {conn.status === "active" ? (
                              <CheckCircle2 className="h-3 w-3 text-secondary" />
                            ) : (
                              <AlertCircle className="h-3 w-3 text-destructive" />
                            )}
                            {conn.status || "unknown"}
                          </span>
                          <span>Connected: {formatDate(conn.connected_at)}</span>
                          <span>Last sync: {formatDate(conn.last_sync)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSync(conn.id)}
                        disabled={syncingId === conn.id}
                      >
                        {syncingId === conn.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDisconnect(conn.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          <Card className="mt-6 p-4 bg-muted/50">
            <h4 className="font-semibold mb-2">About Bank Integration</h4>
            <p className="text-sm text-muted-foreground">
              Buoyance supports integration with Nigerian banks through Mono, Okra, and other providers.
              Once connected, your transactions will be automatically categorized and available for 
              income/expense tracking and tax calculations.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              <strong>Demo Mode:</strong> This feature is currently operating in demo mode. 
              Contact support to enable live bank connections for your account.
            </p>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
