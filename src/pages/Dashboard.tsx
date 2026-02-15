import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AuthGuard } from "@/components/AuthGuard";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TaxHealthIndicator } from "@/components/TaxHealthIndicator";
import { ComplianceAlerts } from "@/components/ComplianceAlerts";
import { MonthlyPerformanceChart } from "@/components/dashboard/MonthlyPerformanceChart";
import { DeadlineWatchdog } from "@/components/dashboard/DeadlineWatchdog";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import {
  Loader2,
  Calculator,
  FileText,
  CreditCard,
  Plus,
  ArrowRight,
  Calendar,
  TrendingUp,
  Building2,
  Receipt,
  Banknote,
  Landmark,
  DollarSign,
  Wallet,
  Archive,
  Settings,
  Upload,
  Shield,
  BookOpen,
  FileSpreadsheet,
  Scale,
  Users,
} from "lucide-react";
import { format } from "date-fns";
import { formatKoboToNgn, stringToKobo, addKobo } from "@/lib/money";
import type { ProfileData, FilingData, PaymentData, ActivityData } from "@/lib/taxHealthCalculator";

interface DashboardStats {
  calculationsCount: number;
  filingsTotal: number;
  filingsSubmitted: number;
  totalPaidKobo: bigint;
}

interface RecentActivity {
  id: string;
  type: "calculation" | "filing" | "payment";
  description: string;
  date: string;
  status?: string;
  taxType?: string;
}

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-blue-600/10 text-blue-600 border-blue-600/20",
  accepted: "bg-green-600/10 text-green-600 border-green-600/20",
  rejected: "bg-red-600/10 text-red-600 border-red-600/20",
  cancelled: "bg-muted text-muted-foreground",
  pending: "bg-amber-600/10 text-amber-600 border-amber-600/20",
  paid: "bg-green-600/10 text-green-600 border-green-600/20",
  failed: "bg-red-600/10 text-red-600 border-red-600/20",
};

function getTaxTypeIcon(taxType: string) {
  switch (taxType) {
    case "CIT": return Building2;
    case "VAT": return Receipt;
    case "WHT": return Banknote;
    case "CGT": return Landmark;
    default: return Calculator;
  }
}

/**
 * Get start of current month in Africa/Lagos timezone
 */
function getStartOfMonthLagos(): string {
  const now = new Date();
  const lagosOffset = 1 * 60; // UTC+1
  const utcOffset = now.getTimezoneOffset();
  const lagosTime = new Date(now.getTime() + (lagosOffset + utcOffset) * 60 * 1000);

  const year = lagosTime.getFullYear();
  const month = String(lagosTime.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
}

function DashboardContent() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    calculationsCount: 0,
    filingsTotal: 0,
    filingsSubmitted: 0,
    totalPaidKobo: 0n,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);

  // Tax Health data
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [filingsForHealth, setFilingsForHealth] = useState<FilingData[]>([]);
  const [paymentsForHealth, setPaymentsForHealth] = useState<PaymentData[]>([]);
  const [activityData, setActivityData] = useState<ActivityData>({ hasRecentIncome: false, hasRecentExpense: false });

  const [incomes, setIncomes] = useState<{ date: string; amount_kobo: string }[]>([]);
  const [expenses, setExpenses] = useState<{ date: string; amount_kobo: string }[]>([]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const startOfMonth = getStartOfMonthLagos();

      // Fetch profile for health indicator
      const { data: profileRow } = await supabase
        .from("profiles")
        .select("user_type, display_name")
        .eq("id", user!.id)
        .single();

      // Get TIN from settings if stored there (or profile if we add it)
      // For now, we'll simulate - in production this would be from profile.tin
      setProfileData({
        tax_identity: profileRow?.user_type || null,
        tin: null, // Would come from profile.tin when available
      });

      // Fetch calculations count
      const { data: calcs, error: calcsError } = await supabase
        .from("tax_calculations")
        .select("id, created_at, tax_type", { count: "exact" })
        .eq("archived", false);

      if (calcsError) throw calcsError;

      // Fetch filings with output for health indicator
      const { data: filings, error: filingsError } = await supabase
        .from("filings")
        .select("id, created_at, tax_type, status, period_end, submitted_at, output_json");

      if (filingsError) throw filingsError;

      // Fetch payments with filing_id for health indicator
      const { data: payments, error: paymentsError } = await supabase
        .from("payments")
        .select("id, created_at, amount_kobo, status, filing_id, verification_status");

      if (paymentsError) throw paymentsError;

      // Fetch incomes for chart and activity check
      const { data: incomesData, error: incomesError } = await supabase
        .from("incomes")
        .select("date, amount_kobo")
        .eq("archived", false);

      if (incomesError) throw incomesError;

      // Fetch expenses for chart and activity check
      const { data: expensesData, error: expensesError } = await supabase
        .from("expenses")
        .select("date, amount_kobo")
        .eq("archived", false);

      if (expensesError) throw expensesError;

      setIncomes(incomesData || []);
      setExpenses(expensesData || []);

      // Check for recent activity (current month)
      const hasRecentIncome = (incomesData || []).some(i => i.date >= startOfMonth);
      const hasRecentExpense = (expensesData || []).some(e => e.date >= startOfMonth);
      setActivityData({ hasRecentIncome, hasRecentExpense });

      // Store filings for health indicator with total_tax_kobo
      setFilingsForHealth(
        (filings || []).map((f) => {
          const output = f.output_json as Record<string, unknown>;
          const totalTaxKobo = output?.taxPayableKobo || output?.vatPayableKobo ||
            output?.whtPayableKobo || output?.cgtPayableKobo ||
            output?.totalTaxKobo || "0";
          return {
            id: f.id,
            status: f.status,
            period_end: f.period_end,
            submitted_at: f.submitted_at,
            created_at: f.created_at,
            tax_type: f.tax_type,
            total_tax_kobo: typeof totalTaxKobo === "string" ? totalTaxKobo : "0",
          };
        })
      );

      // Store payments for health indicator
      setPaymentsForHealth(
        (payments || []).map((p) => ({
          id: p.id,
          filing_id: p.filing_id,
          amount_kobo: p.amount_kobo,
          status: p.status,
        }))
      );

      // Calculate stats
      const calculationsCount = calcs?.length || 0;
      const filingsTotal = filings?.length || 0;
      const filingsSubmitted = filings?.filter((f) => f.status === "submitted").length || 0;

      let totalPaidKobo = 0n;
      for (const payment of payments || []) {
        if (payment.status === "paid") {
          totalPaidKobo = addKobo(totalPaidKobo, stringToKobo(payment.amount_kobo));
        }
      }

      setStats({
        calculationsCount,
        filingsTotal,
        filingsSubmitted,
        totalPaidKobo,
      });

      // Build recent activity (last 5 items)
      const activities: RecentActivity[] = [];

      for (const calc of calcs?.slice(0, 5) || []) {
        activities.push({
          id: calc.id,
          type: "calculation",
          description: `${calc.tax_type} calculation saved`,
          date: calc.created_at,
          taxType: calc.tax_type,
        });
      }

      for (const filing of filings?.slice(0, 5) || []) {
        activities.push({
          id: filing.id,
          type: "filing",
          description: `${filing.tax_type} filing`,
          date: filing.created_at,
          status: filing.status,
          taxType: filing.tax_type,
        });
      }

      for (const payment of payments?.slice(0, 5) || []) {
        activities.push({
          id: payment.id,
          type: "payment",
          description: `Payment of ${formatKoboToNgn(stringToKobo(payment.amount_kobo))}`,
          date: payment.created_at,
          status: payment.status,
        });
      }

      // Sort by date and take first 5
      activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setRecentActivity(activities.slice(0, 5));
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-grow pt-20 md:pt-28 pb-16">
        <div className="container mx-auto px-4 md:px-6 max-w-6xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Welcome back! Here's an overview of your tax activities.
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Tax Health Indicator - Full width at top */}
              <div className="mb-8">
                <TaxHealthIndicator
                  profile={profileData}
                  filings={filingsForHealth}
                  payments={paymentsForHealth}
                  activity={activityData}
                />
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8" data-tour="dashboard-overview">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-2">
                      <Calculator className="h-4 w-4" />
                      Calculations
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{stats.calculationsCount}</p>
                    <p className="text-xs text-muted-foreground mt-1">Saved calculations</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Filings
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{stats.filingsTotal}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stats.filingsSubmitted} submitted
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Payments
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">
                      {formatKoboToNgn(stats.totalPaidKobo)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Total paid</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Activity
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{recentActivity.length}</p>
                    <p className="text-xs text-muted-foreground mt-1">Recent items</p>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Actions */}
              <div className="mb-8">
                <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
                <div className="flex flex-wrap gap-3">
                  <Button asChild>
                    <Link to="/filings/new">
                      <Plus className="h-4 w-4 mr-2" />
                      New Filing
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to="/calculators">
                      <Calculator className="h-4 w-4 mr-2" />
                      Open Calculators
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to="/incomes">
                      <DollarSign className="h-4 w-4 mr-2" />
                      Add Income
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to="/expenses">
                      <Wallet className="h-4 w-4 mr-2" />
                      Add Expense
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to="/bank-import">
                      <Upload className="h-4 w-4 mr-2" />
                      Import Bank Statement
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to="/invoicing">
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Create Invoice
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Compliance Alerts */}
              <div className="mb-8">
                <ComplianceAlerts />
              </div>

              {/* Performance Chart & Deadline Watchdog */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <MonthlyPerformanceChart incomes={incomes} expenses={expenses} />
                <DeadlineWatchdog />
              </div>

              {/* Recent Activity & Quick Links */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Activity */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Recent Activity</CardTitle>
                    <CardDescription>Your latest tax activities</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {recentActivity.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No recent activity</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {recentActivity.map((activity) => {
                          const Icon = activity.taxType
                            ? getTaxTypeIcon(activity.taxType)
                            : activity.type === "payment"
                              ? CreditCard
                              : FileText;

                          return (
                            <div
                              key={`${activity.type}-${activity.id}`}
                              className="flex items-center justify-between gap-4 p-3 rounded-lg bg-muted/50"
                            >
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-full bg-background">
                                  <Icon className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium">{activity.description}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {format(new Date(activity.date), "dd/MM/yyyy")}
                                  </p>
                                </div>
                              </div>
                              {activity.status && (
                                <Badge
                                  variant="outline"
                                  className={statusColors[activity.status] || ""}
                                >
                                  {activity.status}
                                </Badge>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Quick Links */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Manage</CardTitle>
                    <CardDescription>Access your tax data</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Link
                      to="/filings"
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium">Tax Filings</p>
                          <p className="text-sm text-muted-foreground">
                            View and manage your filings
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </Link>

                    <Link
                      to="/payments"
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <CreditCard className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium">Payments</p>
                          <p className="text-sm text-muted-foreground">
                            Track your tax payments
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </Link>

                    <Link
                      to="/my-calculations"
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <Calculator className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium">Saved Calculations</p>
                          <p className="text-sm text-muted-foreground">
                            Review past calculations
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </Link>

                    <Link
                      to="/incomes"
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <DollarSign className="h-5 w-5 text-secondary" />
                        <div>
                          <p className="font-medium">Income Records</p>
                          <p className="text-sm text-muted-foreground">
                            Track income sources
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </Link>

                    <Link
                      to="/expenses"
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <Wallet className="h-5 w-5 text-destructive" />
                        <div>
                          <p className="font-medium">Expense Records</p>
                          <p className="text-sm text-muted-foreground">
                            Track deductible expenses
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </Link>

                    <Link
                      to="/archived"
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <Archive className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Archived Items</p>
                          <p className="text-sm text-muted-foreground">
                            View and restore archived data
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </Link>

                    <Link
                      to="/wht-credits"
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <Banknote className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium">WHT Credits</p>
                          <p className="text-sm text-muted-foreground">
                            Upload certificates & track credits
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </Link>

                    <Link
                      to="/compliance-calendar"
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium">Compliance Calendar</p>
                          <p className="text-sm text-muted-foreground">
                            Tax deadlines & reminders
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </Link>

                    <Link
                      to="/invoicing"
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <FileSpreadsheet className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium">Invoicing</p>
                          <p className="text-sm text-muted-foreground">
                            Create invoices with VAT/WHT
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </Link>

                    <Link
                      to="/payroll"
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <Users className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium">Payroll</p>
                          <p className="text-sm text-muted-foreground">
                            Calculate PAYE & payslips
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </Link>

                    <Link
                      to="/tcc"
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <Shield className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium">TCC Readiness</p>
                          <p className="text-sm text-muted-foreground">
                            Tax clearance checklist
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </Link>

                    <Link
                      to="/knowledge"
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <BookOpen className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium">Knowledge Base</p>
                          <p className="text-sm text-muted-foreground">
                            Tax laws, guides & resources
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </Link>

                    <Link
                      to="/audit-workspace"
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <Scale className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium">Audit Workspace</p>
                          <p className="text-sm text-muted-foreground">
                            Disputes & defense management
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </Link>

                    <Link
                      to="/settings"
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <Settings className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Settings</p>
                          <p className="text-sm text-muted-foreground">
                            Manage your account
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </Link>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function Dashboard() {
  return (
    <AuthGuard>
      <DashboardContent />
      <OnboardingTour />
    </AuthGuard>
  );
}
