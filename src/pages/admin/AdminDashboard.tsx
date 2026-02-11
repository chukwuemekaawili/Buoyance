import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AuthGuard } from "@/components/AuthGuard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { 
  Users, 
  FileText, 
  CreditCard, 
  TrendingUp, 
  Shield, 
  Activity,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  BarChart3,
  Settings,
  Eye,
  Sparkles,
  Loader2
} from "lucide-react";
import { format, subDays } from "date-fns";

interface DashboardStats {
  totalUsers: number;
  totalFilings: number;
  totalPayments: number;
  pendingPayments: number;
  draftFilings: number;
  submittedFilings: number;
  recentAuditLogs: number;
}

interface RecentActivity {
  id: string;
  action: string;
  entity_type: string;
  created_at: string;
  actor_user_id: string | null;
}

function AdminDashboardContent() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        // Fetch user count via RPC (includes users without profiles)
        const usersCountResult = await supabase.rpc("get_admin_users_list");
        const usersCount = usersCountResult.data?.length || 0;
        
        // Fetch other stats in parallel
        const [
          filingsResult,
          paymentsResult,
          pendingPaymentsResult,
          draftFilingsResult,
          submittedFilingsResult,
          auditLogsResult,
          recentActivityResult
        ] = await Promise.all([
          supabase.from("filings").select("id", { count: "exact", head: true }),
          supabase.from("payments").select("id", { count: "exact", head: true }),
          supabase.from("payments").select("id", { count: "exact", head: true }).eq("verification_status", "pending"),
          supabase.from("filings").select("id", { count: "exact", head: true }).eq("status", "draft"),
          supabase.from("filings").select("id", { count: "exact", head: true }).eq("status", "submitted"),
          supabase.from("audit_logs").select("id", { count: "exact", head: true }).gte("created_at", subDays(new Date(), 7).toISOString()),
          supabase.from("audit_logs").select("id, action, entity_type, created_at, actor_user_id").order("created_at", { ascending: false }).limit(10)
        ]);

        setStats({
          totalUsers: usersCount,
          totalFilings: filingsResult.count || 0,
          totalPayments: paymentsResult.count || 0,
          pendingPayments: pendingPaymentsResult.count || 0,
          draftFilings: draftFilingsResult.count || 0,
          submittedFilings: submittedFilingsResult.count || 0,
          recentAuditLogs: auditLogsResult.count || 0,
        });

        setRecentActivity(recentActivityResult.data || []);
      } catch (error) {
        console.error("Failed to fetch admin stats:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  const formatAction = (action: string) => {
    return action.replace(/[._]/g, " ").replace(/\b\w/g, l => l.toUpperCase());
  };

  const getActionBadgeVariant = (action: string): "default" | "secondary" | "destructive" | "outline" => {
    if (action.includes("delete") || action.includes("rejected")) return "destructive";
    if (action.includes("create") || action.includes("submit")) return "default";
    if (action.includes("update") || action.includes("verified")) return "secondary";
    return "outline";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-grow pt-20 md:pt-28 pb-16 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-grow pt-20 md:pt-28 pb-16">
        <div className="container mx-auto px-4 md:px-6">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            </div>
            <p className="text-muted-foreground">System overview and key metrics at a glance.</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
                <p className="text-xs text-muted-foreground">Registered accounts</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Filings</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalFilings || 0}</div>
                <div className="flex gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {stats?.draftFilings || 0} Draft
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {stats?.submittedFilings || 0} Submitted
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Payments</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalPayments || 0}</div>
                <div className="flex items-center gap-1 mt-1">
                  {(stats?.pendingPayments || 0) > 0 ? (
                    <Badge variant="destructive" className="text-xs">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {stats?.pendingPayments} Pending
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      All verified
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Audit Activity</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.recentAuditLogs || 0}</div>
                <p className="text-xs text-muted-foreground">Events in last 7 days</p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Activity */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Recent Activity
                    </CardTitle>
                    <CardDescription>Latest system events and changes</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/admin/audit-logs">
                      View All
                      <ArrowUpRight className="h-4 w-4 ml-1" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {recentActivity.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No recent activity</p>
                ) : (
                  <div className="space-y-3">
                    {recentActivity.map((activity) => (
                      <div 
                        key={activity.id} 
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Badge variant={getActionBadgeVariant(activity.action)}>
                            {formatAction(activity.action)}
                          </Badge>
                          <span className="text-sm text-muted-foreground capitalize">
                            {activity.entity_type.replace(/_/g, " ")}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(activity.created_at), "MMM d, h:mm a")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
                <CardDescription>Admin tools and shortcuts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link to="/admin/users">
                    <Users className="h-4 w-4 mr-2" />
                    Manage Users
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link to="/admin/payment-verification">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Verify Payments
                    {(stats?.pendingPayments || 0) > 0 && (
                      <Badge variant="destructive" className="ml-auto">
                        {stats?.pendingPayments}
                      </Badge>
                    )}
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link to="/admin/tax-rules">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Tax Rules
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link to="/admin/classification-rules">
                    <Sparkles className="h-4 w-4 mr-2" />
                    AI Classification
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link to="/admin/audit-logs">
                    <Eye className="h-4 w-4 mr-2" />
                    Audit Logs
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link to="/admin/api-settings">
                    <Settings className="h-4 w-4 mr-2" />
                    API Settings
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link to="/admin/system-settings">
                    <Shield className="h-4 w-4 mr-2" />
                    System Settings
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <AuthGuard requireAdmin>
      <AdminDashboardContent />
    </AuthGuard>
  );
}
