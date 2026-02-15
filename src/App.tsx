import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { RBACProvider } from "@/hooks/useRBAC";
import { ConsentProvider } from "@/hooks/useConsent";
import ScrollToTop from "./components/ScrollToTop";
import ScrollToHash from "./components/ScrollToHash";
import { AIChatWidget } from "./components/AIChatWidget";
import { OfflineBanner } from "./components/OfflineBanner";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import About from "./pages/About";
import Careers from "./pages/Careers";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Cookies from "./pages/Cookies";
import Compliance from "./pages/Compliance";
import Support from "./pages/Support";
import Documentation from "./pages/Documentation";
import TaxGuide from "./pages/TaxGuide";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import MyCalculations from "./pages/MyCalculations";
import Onboarding from "./pages/Onboarding";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AuditLogs from "./pages/admin/AuditLogs";
import TaxRules from "./pages/admin/TaxRules";
import ClassificationRules from "./pages/admin/ClassificationRules";
import ClassificationTest from "./pages/admin/ClassificationTest";
import AdminUsers from "./pages/admin/Users";
import SystemSettings from "./pages/admin/SystemSettings";

import Calculators from "./pages/Calculators";
import CITCalculator from "./pages/calculators/CIT";
import VATCalculator from "./pages/calculators/VAT";
import WHTCalculator from "./pages/calculators/WHT";
import CGTCalculator from "./pages/calculators/CGT";
import PITCalculator from "./pages/calculators/PIT";
import CryptoCalculator from "./pages/calculators/Crypto";
import ForeignIncomeCalculator from "./pages/calculators/ForeignIncome";
import Dashboard from "./pages/Dashboard";
import Filings from "./pages/Filings";
import NewFiling from "./pages/filings/NewFiling";
import FilingDetail from "./pages/filings/FilingDetail";
import Payments from "./pages/Payments";
import ArchivedItems from "./pages/ArchivedItems";
import PaymentVerification from "./pages/admin/PaymentVerification";
import APISettings from "./pages/admin/APISettings";
import Notifications from "./pages/Notifications";
import Incomes from "./pages/Incomes";
import Expenses from "./pages/Expenses";
import BankConnections from "./pages/BankConnections";
import Settings from "./pages/Settings";
import WHTCredits from "./pages/WHTCredits";
import ComplianceCalendar from "./pages/ComplianceCalendar";
import Invoicing from "./pages/Invoicing";
import Payroll from "./pages/Payroll";
import KnowledgeBase from "./pages/KnowledgeBase";
import TCCReadiness from "./pages/TCCReadiness";
import AuditWorkspace from "./pages/AuditWorkspace";
import BankImport from "./pages/BankImport";
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <RBACProvider>
            <ConsentProvider>
              <ScrollToTop />
              <ScrollToHash />
              <OfflineBanner />
              <AIChatWidget />
              <Routes>
                <Route path="/" element={<Index />} />

                {/* Auth */}
                <Route path="/signin" element={<SignIn />} />
                <Route path="/signup" element={<SignUp />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/my-calculations" element={<MyCalculations />} />

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
                <Route path="/wht-credits" element={<WHTCredits />} />
                <Route path="/compliance-calendar" element={<ComplianceCalendar />} />
                <Route path="/invoicing" element={<Invoicing />} />
                <Route path="/payroll" element={<Payroll />} />
                <Route path="/knowledge" element={<KnowledgeBase />} />
                <Route path="/tcc" element={<TCCReadiness />} />
                <Route path="/audit-workspace" element={<AuditWorkspace />} />
                <Route path="/bank-import" element={<BankImport />} />

                {/* Archived Items */}
                <Route path="/archived" element={<ArchivedItems />} />

                {/* Settings */}
                <Route path="/settings" element={<Settings />} />

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
                <Route path="/tax-guides/:slug" element={<TaxGuide />} />

                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </ConsentProvider>
          </RBACProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
