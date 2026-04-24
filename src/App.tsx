import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { RBACProvider } from "@/hooks/useRBAC";
import { ConsentProvider } from "@/hooks/useConsent";
import { WorkspaceProvider } from "@/hooks/useWorkspace";
import { FeatureGateProvider } from "@/hooks/useFeatureGate";
import ScrollToTop from "./components/ScrollToTop";
import ScrollToHash from "./components/ScrollToHash";
import { OfflineBanner } from "./components/OfflineBanner";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { lazy, Suspense, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

const AIChatWidget = lazy(() =>
  import("./components/AIChatWidget").then((module) => ({ default: module.AIChatWidget }))
);

const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const About = lazy(() => import("./pages/About"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Careers = lazy(() => import("./pages/Careers"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Cookies = lazy(() => import("./pages/Cookies"));
const Compliance = lazy(() => import("./pages/Compliance"));
const Support = lazy(() => import("./pages/Support"));
const Documentation = lazy(() => import("./pages/Documentation"));
const Health = lazy(() => import("./pages/Health"));
const TaxGuide = lazy(() => import("./pages/TaxGuide"));
const SignIn = lazy(() => import("./pages/SignIn"));
const SignUp = lazy(() => import("./pages/SignUp"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const MyCalculations = lazy(() => import("./pages/MyCalculations"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AuditLogs = lazy(() => import("./pages/admin/AuditLogs"));
const TaxRules = lazy(() => import("./pages/admin/TaxRules"));
const ClassificationRules = lazy(() => import("./pages/admin/ClassificationRules"));
const ClassificationTest = lazy(() => import("./pages/admin/ClassificationTest"));
const AdminUsers = lazy(() => import("./pages/admin/Users"));
const SystemSettings = lazy(() => import("./pages/admin/SystemSettings"));
const Calculators = lazy(() => import("./pages/Calculators"));
const CITCalculator = lazy(() => import("./pages/calculators/CIT"));
const VATCalculator = lazy(() => import("./pages/calculators/VAT"));
const WHTCalculator = lazy(() => import("./pages/calculators/WHT"));
const CGTCalculator = lazy(() => import("./pages/calculators/CGT"));
const PITCalculator = lazy(() => import("./pages/calculators/PIT"));
const CryptoCalculator = lazy(() => import("./pages/calculators/Crypto"));
const ForeignIncomeCalculator = lazy(() => import("./pages/calculators/ForeignIncome"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Filings = lazy(() => import("./pages/Filings"));
const NewFiling = lazy(() => import("./pages/filings/NewFiling"));
const FilingDetail = lazy(() => import("./pages/filings/FilingDetail"));
const Payments = lazy(() => import("./pages/Payments"));
const ArchivedItems = lazy(() => import("./pages/ArchivedItems"));
const PaymentVerification = lazy(() => import("./pages/admin/PaymentVerification"));
const APISettings = lazy(() => import("./pages/admin/APISettings"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Incomes = lazy(() => import("./pages/Incomes"));
const Expenses = lazy(() => import("./pages/Expenses"));
const BankConnections = lazy(() => import("./pages/BankConnections"));
const Settings = lazy(() => import("./pages/Settings"));
const WHTCredits = lazy(() => import("./pages/WHTCredits"));
const ComplianceCalendar = lazy(() => import("./pages/ComplianceCalendar"));
const Invoicing = lazy(() => import("./pages/Invoicing"));
const Payroll = lazy(() => import("./pages/Payroll"));
const KnowledgeBase = lazy(() => import("./pages/KnowledgeBase"));
const AuditWorkspace = lazy(() => import("./pages/AuditWorkspace"));
const BankImport = lazy(() => import("./pages/BankImport"));
const Academy = lazy(() => import("./pages/Academy"));
const CourseViewer = lazy(() => import("./pages/CourseViewer"));
const TaxLibrary = lazy(() => import("./pages/TaxLibrary"));
const AcceptInvite = lazy(() => import("./pages/AcceptInvite"));
const AccountantDashboard = lazy(() => import("./pages/AccountantDashboard"));
const TaxClearance = lazy(() => import("./pages/TaxClearance"));
const DigiTax = lazy(() => import("./pages/DigiTax"));

// SPA redirect handler: works with public/404.html to handle
// DigitalOcean static site routing. When a 404 occurs on a client
// route like /dashboard, 404.html stores the path and redirects to /.
// This component picks up that stored path and navigates to it.
function SpaRedirectHandler() {
  const navigate = useNavigate();
  useEffect(() => {
    const redirectPath = sessionStorage.getItem('spa_redirect');
    if (redirectPath) {
      sessionStorage.removeItem('spa_redirect');
      navigate(redirectPath, { replace: true });
    }
  }, [navigate]);
  return null;
}

const queryClient = new QueryClient();

function PageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <ErrorBoundary label="App">
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AuthProvider>
            <WorkspaceProvider>
              <FeatureGateProvider>
                <RBACProvider>
                  <ConsentProvider>
                    <ScrollToTop />
                    <ScrollToHash />
                    <SpaRedirectHandler />
                    <OfflineBanner />
                    <Suspense fallback={null}>
                      <AIChatWidget />
                    </Suspense>
                    <Suspense fallback={<PageFallback />}>
                      <Routes>
                        <Route path="/" element={<Index />} />

                      {/* Auth */}
                      <Route path="/signin" element={<SignIn />} />
                      <Route path="/signup" element={<SignUp />} />
                      <Route path="/forgot-password" element={<ForgotPassword />} />
                      <Route path="/reset-password" element={<ResetPassword />} />
                      <Route path="/onboarding" element={<Onboarding />} />
                      <Route path="/my-calculations" element={<MyCalculations />} />
                      <Route path="/accept-invite" element={<AcceptInvite />} />
                      <Route path="/accountant/dashboard" element={<AccountantDashboard />} />

                      {/* Dashboard */}
                      <Route path="/dashboard" element={<Dashboard />} />

                      {/* Filings */}
                      <Route path="/filings" element={<Filings />} />
                      <Route path="/filings/new" element={<NewFiling />} />
                      <Route path="/filings/:id" element={<FilingDetail />} />

                      {/* Payments */}
                      <Route path="/payments" element={<Payments />} />

                      {/* Calculators */}
                      <Route path="/calculators" element={<Calculators />} />
                      <Route path="/calculators/pit" element={<PITCalculator />} />
                      <Route path="/calculators/cit" element={<CITCalculator />} />
                      <Route path="/calculators/vat" element={<VATCalculator />} />
                      <Route path="/calculators/wht" element={<WHTCalculator />} />
                      <Route path="/calculators/cgt" element={<CGTCalculator />} />
                      <Route path="/calculators/crypto" element={<CryptoCalculator />} />
                      <Route path="/calculators/foreign-income" element={<ForeignIncomeCalculator />} />

                      {/* Income & Expenses */}
                      <Route path="/incomes" element={<Incomes />} />
                      <Route path="/expenses" element={<Expenses />} />
                      <Route path="/bank-connections" element={<BankConnections />} />

                      {/* Core Feature Pages */}
                      <Route path="/audit-workspace" element={<AuditWorkspace />} />
                      <Route path="/wht-credits" element={<WHTCredits />} />
                      <Route path="/compliance-calendar" element={<ComplianceCalendar />} />
                      <Route path="/invoicing" element={<Invoicing />} />
                      <Route path="/payroll" element={<Payroll />} />
                      <Route path="/knowledge" element={<KnowledgeBase />} />
                      <Route path="/tcc" element={<TaxClearance />} />
                      <Route path="/digitax" element={<DigiTax />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/bank-import" element={<BankImport />} />

                      {/* Academy */}
                      <Route path="/academy" element={<Academy />} />
                      <Route path="/academy/course/:courseId" element={<CourseViewer />} />
                      <Route path="/academy/library" element={<TaxLibrary />} />

                      {/* Archived Items */}
                      <Route path="/archived" element={<ArchivedItems />} />

                      {/* Notifications */}
                      <Route path="/notifications" element={<Notifications />} />
                      {/* Admin */}
                      <Route path="/admin" element={<AdminDashboard />} />
                      <Route path="/admin/dashboard" element={<AdminDashboard />} />
                      <Route path="/admin/audit" element={<AuditLogs />} />
                      <Route path="/admin/audit-logs" element={<AuditLogs />} />
                      <Route path="/admin/tax-rules" element={<TaxRules />} />
                      <Route path="/admin/classification-rules" element={<ClassificationRules />} />
                      <Route path="/admin/classification-test" element={<ClassificationTest />} />
                      <Route path="/admin/users" element={<AdminUsers />} />
                      <Route path="/admin/payment-verification" element={<PaymentVerification />} />
                      <Route path="/admin/api-settings" element={<APISettings />} />
                      <Route path="/admin/system-settings" element={<SystemSettings />} />


                      {/* Company */}
                      <Route path="/about" element={<About />} />
                      <Route path="/pricing" element={<Pricing />} />
                      <Route path="/careers" element={<Careers />} />
                      <Route path="/blog" element={<Blog />} />
                      <Route path="/blog/:slug" element={<BlogPost />} />

                      {/* Legal */}
                      <Route path="/terms" element={<Terms />} />
                      <Route path="/privacy" element={<Privacy />} />
                      <Route path="/cookies" element={<Cookies />} />
                      <Route path="/compliance" element={<Compliance />} />

                      {/* Support */}
                      <Route path="/support" element={<Support />} />
                      <Route path="/documentation" element={<Documentation />} />
                      <Route path="/docs" element={<Documentation />} />
                      <Route path="/health" element={<Health />} />
                      <Route path="/tax-guides/:slug" element={<TaxGuide />} />

                      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </Suspense>
                  </ConsentProvider>
                </RBACProvider>
              </FeatureGateProvider>
            </WorkspaceProvider>
          </AuthProvider>
        </TooltipProvider>
      </ErrorBoundary>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;

