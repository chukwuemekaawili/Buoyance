import { Button } from "@/components/ui/button";
import { Menu, LogOut, Calculator, Shield, ChevronDown, LayoutDashboard, FileText, CreditCard, Wallet, DollarSign, Landmark, Settings, PiggyBank, BookOpen, HelpCircle, Plus, User, Check, Circle, Brain, BarChart3, Banknote, Upload, FileSpreadsheet, Scale, Users, Calendar } from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useRBAC } from "@/hooks/useRBAC";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import { NotificationBell } from "@/components/NotificationBell";
import { Separator } from "@/components/ui/separator";
import logoDark from "@/assets/buoyance_logo_dark.png";
import { cn } from "@/lib/utils";

// Helper to check if a path is active
function isPathActive(currentPath: string, targetPath: string): boolean {
  if (targetPath === "/dashboard") {
    return currentPath === "/dashboard";
  }
  if (targetPath === "/") {
    return currentPath === "/";
  }
  return currentPath.startsWith(targetPath);
}

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [taxIdentity, setTaxIdentity] = useState<string | null>(null);
  const [tin, setTin] = useState<string | null>(null);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean>(false);
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const isHomePage = currentPath === "/";
  const { user, signOut, loading } = useAuth();
  const { isAdmin, isAuditor } = useRBAC();
  const { toast } = useToast();

  // Fetch user's profile data
  useEffect(() => {
    if (user) {
      supabase
        .from("profiles")
        .select("display_name, tax_identity, tin, onboarding_completed")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          setDisplayName(data?.display_name || null);
          setTaxIdentity(data?.tax_identity || null);
          setTin(data?.tin || null);
          setOnboardingCompleted(data?.onboarding_completed || false);
        });
    } else {
      setDisplayName(null);
      setTaxIdentity(null);
      setTin(null);
      setOnboardingCompleted(false);
    }
  }, [user]);

  // Profile completion checklist
  const profileChecklist = [
    { label: "Display name", completed: !!displayName },
    { label: "Tax identity", completed: !!taxIdentity },
    { label: "TIN number", completed: !!tin },
  ];

  const completedCount = profileChecklist.filter(item => item.completed).length;
  const totalCount = profileChecklist.length;
  const completionPercent = Math.round((completedCount / totalCount) * 100);
  const isProfileComplete = completedCount === totalCount;

  // Get display label for tax identity
  const getTaxIdentityLabel = () => {
    switch (taxIdentity) {
      case "freelancer":
        return "Freelancer";
      case "sme":
        return "Business";
      case "employee":
        return "Employee";
      case "crypto":
        return "Crypto";
      default:
        return null;
    }
  };

  // Get initials for avatar
  const getInitials = () => {
    if (displayName) {
      return displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  const getNavHref = (anchor: string) => {
    return isHomePage ? anchor : `/${anchor}`;
  };

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsMenuOpen(false);
    window.location.href = "/";
  };

  const handleSignOut = async () => {
    await signOut();
    setIsMenuOpen(false);
    toast({
      title: "Signed out",
      description: "You have been signed out successfully.",
    });
    navigate("/");
  };

  const handleNavClick = () => {
    setIsMenuOpen(false);
  };

  // Active link styles
  const activeLinkClass = "text-primary-foreground bg-primary-foreground/15";
  const inactiveLinkClass = "text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10";

  // Marketing links for unauthenticated users
  const marketingLinks = [
    { href: getNavHref("#features"), label: "Features", type: "anchor" },
    { href: getNavHref("#calculator"), label: "Tax Estimator", type: "anchor" },
    { href: "/academy", label: "Academy", type: "link" },
    { href: "/support", label: "Support", type: "link" },
    { href: getNavHref("#contact"), label: "Contact", type: "anchor" },
  ];

  // Check if any calculator path is active
  const isCalculatorsActive = currentPath.startsWith("/calculators") || currentPath === "/my-calculations";

  // Check if any academy path is active
  const isAcademyActive = currentPath.startsWith("/academy");

  // Check if any records path is active
  const isRecordsActive = ["/filings", "/payments", "/incomes", "/expenses", "/bank-connections"].some(p => currentPath.startsWith(p));

  // Check if any admin path is active
  const isAdminActive = currentPath.startsWith("/admin");

  // Check if any compliance path is active
  const isComplianceActive = ["/compliance-calendar", "/tcc", "/audit-workspace", "/wht-credits"].some(p => currentPath.startsWith(p));

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-primary/95 backdrop-blur-md border-b border-primary-foreground/10 transition-colors duration-300 overflow-hidden">
        <div className="container mx-auto px-4 md:px-6 overflow-hidden">
          <div className="flex items-center h-14 md:h-16 overflow-hidden">
            {/* Logo - fixed width, never shrinks */}
            <Link
              to="/"
              onClick={handleLogoClick}
              className="flex-shrink-0"
            >
              <img
                src={logoDark}
                alt="BUOYANCE"
                className="h-7 md:h-9 w-auto object-contain"
              />
            </Link>

            {/* Laptop Navigation - Show on lg to 2xl (1024px - 1535px) for authenticated users */}
            {user && (
              <nav className="hidden lg:flex 2xl:hidden items-center gap-1 ml-8 flex-shrink-0">
                <Link
                  to="/dashboard"
                  className={cn(
                    "transition-colors text-sm font-medium px-3 py-2 rounded-md flex items-center gap-1.5",
                    isPathActive(currentPath, "/dashboard") ? activeLinkClass : inactiveLinkClass
                  )}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Link>
                <Link
                  to="/filings"
                  className={cn(
                    "transition-colors text-sm font-medium px-3 py-2 rounded-md flex items-center gap-1.5",
                    currentPath.startsWith("/filings") ? activeLinkClass : inactiveLinkClass
                  )}
                >
                  <FileText className="h-4 w-4" />
                  Filings
                </Link>
                <Link
                  to="/incomes?action=add"
                  className={cn(
                    "transition-colors text-sm font-medium px-3 py-2 rounded-md flex items-center gap-1.5",
                    inactiveLinkClass
                  )}
                >
                  <Plus className="h-4 w-4" />
                  Add Income
                </Link>
                <Link
                  to="/expenses?action=add"
                  className={cn(
                    "transition-colors text-sm font-medium px-3 py-2 rounded-md flex items-center gap-1.5",
                    inactiveLinkClass
                  )}
                >
                  <Plus className="h-4 w-4" />
                  Add Expense
                </Link>
                <Link
                  to="/calculators"
                  className={cn(
                    "transition-colors text-sm font-medium px-3 py-2 rounded-md flex items-center gap-1.5",
                    isCalculatorsActive ? activeLinkClass : inactiveLinkClass
                  )}
                >
                  <Calculator className="h-4 w-4" />
                  Calculators
                </Link>
                <Link
                  to="/academy"
                  className={cn(
                    "transition-colors text-sm font-medium px-3 py-2 rounded-md flex items-center gap-1.5",
                    isAcademyActive ? activeLinkClass : inactiveLinkClass
                  )}
                >
                  <Brain className="h-4 w-4" />
                  Academy
                </Link>
              </nav>
            )}

            {/* Spacer */}
            <div className="flex-1 min-w-0" />

            {/* Desktop Navigation - Only show on 2xl and above (1536px+) */}
            <nav className="hidden 2xl:flex items-center gap-1 flex-shrink-0">
              {user ? (
                // Authenticated: App navigation
                <>
                  <Link
                    to="/dashboard"
                    className={cn(
                      "transition-colors text-sm font-medium px-3 py-2 rounded-md flex items-center gap-1.5",
                      isPathActive(currentPath, "/dashboard") ? activeLinkClass : inactiveLinkClass
                    )}
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </Link>

                  {/* Records Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      className={cn(
                        "transition-colors text-sm font-medium px-3 py-2 rounded-md flex items-center gap-1 outline-none",
                        isRecordsActive ? activeLinkClass : inactiveLinkClass
                      )}
                    >
                      <FileText className="h-4 w-4" />
                      Records
                      <ChevronDown className="h-3 w-3 ml-0.5" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="bg-popover">
                      <DropdownMenuItem asChild>
                        <Link to="/filings" className={cn("flex items-center gap-2", currentPath.startsWith("/filings") && "bg-accent")}>
                          <FileText className="h-4 w-4" />
                          Tax Filings
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/payments" className={cn("flex items-center gap-2", currentPath.startsWith("/payments") && "bg-accent")}>
                          <CreditCard className="h-4 w-4" />
                          Payments
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to="/incomes" className={cn("flex items-center gap-2", currentPath.startsWith("/incomes") && "bg-accent")}>
                          <DollarSign className="h-4 w-4" />
                          Income
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/expenses" className={cn("flex items-center gap-2", currentPath.startsWith("/expenses") && "bg-accent")}>
                          <Wallet className="h-4 w-4" />
                          Expenses
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to="/bank-connections" className={cn("flex items-center gap-2", currentPath.startsWith("/bank-connections") && "bg-accent")}>
                          <Landmark className="h-4 w-4" />
                          Bank Connections
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to="/bank-import" className={cn("flex items-center gap-2", currentPath === "/bank-import" && "bg-accent")}>
                          <Upload className="h-4 w-4" />
                          Bank Import
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/invoicing" className={cn("flex items-center gap-2", currentPath === "/invoicing" && "bg-accent")}>
                          <FileSpreadsheet className="h-4 w-4" />
                          Invoices
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Compliance Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      className={cn(
                        "transition-colors text-sm font-medium px-3 py-2 rounded-md flex items-center gap-1 outline-none",
                        isComplianceActive ? activeLinkClass : inactiveLinkClass
                      )}
                    >
                      <Shield className="h-4 w-4" />
                      Compliance
                      <ChevronDown className="h-3 w-3 ml-0.5" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="bg-popover">
                      <DropdownMenuItem asChild>
                        <Link to="/compliance-calendar" className={cn("flex items-center gap-2", currentPath === "/compliance-calendar" && "bg-accent")}>
                          <Calendar className="h-4 w-4 text-primary" />
                          Compliance Calendar
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/tcc" className={cn("flex items-center gap-2", currentPath === "/tcc" && "bg-accent")}>
                          <Shield className="h-4 w-4 text-primary" />
                          TCC Readiness
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/audit-workspace" className={cn("flex items-center gap-2", currentPath === "/audit-workspace" && "bg-accent")}>
                          <Scale className="h-4 w-4 text-primary" />
                          Audit Workspace
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/wht-credits" className={cn("flex items-center gap-2", currentPath === "/wht-credits" && "bg-accent")}>
                          <Banknote className="h-4 w-4 text-primary" />
                          WHT Credits
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Calculators Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      className={cn(
                        "transition-colors text-sm font-medium px-3 py-2 rounded-md flex items-center gap-1 outline-none",
                        isCalculatorsActive ? activeLinkClass : inactiveLinkClass
                      )}
                    >
                      <Calculator className="h-4 w-4" />
                      Calculators
                      <ChevronDown className="h-3 w-3 ml-0.5" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="bg-popover">
                      <DropdownMenuItem asChild>
                        <Link to="/calculators/pit" className={cn(currentPath === "/calculators/pit" && "bg-accent")}>PIT Calculator</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/calculators/cit" className={cn(currentPath === "/calculators/cit" && "bg-accent")}>CIT Calculator</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/calculators/vat" className={cn(currentPath === "/calculators/vat" && "bg-accent")}>VAT Calculator</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/calculators/wht" className={cn(currentPath === "/calculators/wht" && "bg-accent")}>WHT Calculator</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/calculators/cgt" className={cn(currentPath === "/calculators/cgt" && "bg-accent")}>CGT Calculator</Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to="/payroll" className={cn("flex items-center gap-2", currentPath === "/payroll" && "bg-accent")}>
                          <Users className="h-4 w-4" />
                          Payroll Calculator
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to="/my-calculations" className={cn("flex items-center gap-2", currentPath === "/my-calculations" && "bg-accent")}>
                          <PiggyBank className="h-4 w-4" />
                          My Calculations
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Academy Link */}
                  <Link
                    to="/academy"
                    className={cn(
                      "transition-colors text-sm font-medium px-3 py-2 rounded-md flex items-center gap-1.5",
                      isAcademyActive ? activeLinkClass : inactiveLinkClass
                    )}
                  >
                    <Brain className="h-4 w-4" />
                    Academy
                  </Link>

                  {/* Admin Dropdown */}
                  {(isAdmin || isAuditor) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className={cn(
                          "transition-colors text-sm font-medium px-3 py-2 rounded-md flex items-center gap-1 outline-none",
                          isAdminActive ? activeLinkClass : inactiveLinkClass
                        )}
                      >
                        <Shield className="h-4 w-4" />
                        Admin
                        <ChevronDown className="h-3 w-3 ml-0.5" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="bg-popover">
                        <DropdownMenuItem asChild>
                          <Link to="/admin/dashboard" className={cn(currentPath === "/admin/dashboard" || currentPath === "/admin" && "bg-accent")}>Admin Dashboard</Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link to="/admin/tax-rules" className={cn(currentPath === "/admin/tax-rules" && "bg-accent")}>Tax Rules</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/admin/classification-rules" className={cn(currentPath === "/admin/classification-rules" && "bg-accent")}>AI Classification Rules</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/admin/classification-test" className={cn(currentPath === "/admin/classification-test" && "bg-accent")}>AI Classification Tester</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/admin/audit-logs" className={cn((currentPath === "/admin/audit-logs" || currentPath === "/admin/audit") && "bg-accent")}>Audit Logs</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/admin/payment-verification" className={cn(currentPath === "/admin/payment-verification" && "bg-accent")}>Payment Verification</Link>
                        </DropdownMenuItem>
                        {isAdmin && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                              <Link to="/admin/users" className={cn(currentPath === "/admin/users" && "bg-accent")}>User Management</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link to="/admin/api-settings" className={cn(currentPath === "/admin/api-settings" && "bg-accent")}>API Settings</Link>
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}

                  {/* Direct links to fill header space */}
                  <Link
                    to="/documentation"
                    className={cn(
                      "transition-colors text-sm font-medium px-3 py-2 rounded-md flex items-center gap-1.5",
                      isPathActive(currentPath, "/documentation") || isPathActive(currentPath, "/docs") ? activeLinkClass : inactiveLinkClass
                    )}
                  >
                    <BookOpen className="h-4 w-4" />
                    Tax Guide
                  </Link>
                  <Link
                    to="/support"
                    className={cn(
                      "transition-colors text-sm font-medium px-3 py-2 rounded-md flex items-center gap-1.5",
                      isPathActive(currentPath, "/support") ? activeLinkClass : inactiveLinkClass
                    )}
                  >
                    <HelpCircle className="h-4 w-4" />
                    Support
                  </Link>
                </>
              ) : (
                // Unauthenticated: Marketing links
                <>
                  {marketingLinks.map((link) =>
                    link.type === "link" ? (
                      <Link
                        key={link.href}
                        to={link.href}
                        className={cn(
                          "transition-colors text-sm font-medium px-3 py-2 rounded-md",
                          isPathActive(currentPath, link.href) ? activeLinkClass : inactiveLinkClass
                        )}
                      >
                        {link.label}
                      </Link>
                    ) : (
                      <a
                        key={link.href}
                        href={link.href}
                        className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 transition-colors text-sm font-medium px-3 py-2 rounded-md"
                      >
                        {link.label}
                      </a>
                    )
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 transition-colors text-sm font-medium px-3 py-2 rounded-md flex items-center gap-1 outline-none">
                      Calculators
                      <ChevronDown className="h-3 w-3 ml-0.5" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-popover">
                      <DropdownMenuItem asChild>
                        <a href={getNavHref("#calculator")}>PIT Calculator</a>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/calculators/cit">CIT Calculator</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/calculators/vat">VAT Calculator</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/calculators/wht">WHT Calculator</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/calculators/cgt">CGT Calculator</Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </nav>

            {/* Desktop Right Actions - Only show on 2xl and above */}
            <div className="hidden 2xl:flex items-center gap-2 ml-4 flex-shrink-0">
              {user && (
                <>
                  <Button variant="accent" size="sm" asChild>
                    <Link to="/filings/new">
                      <Plus className="h-4 w-4 mr-1.5" />
                      New Filing
                    </Link>
                  </Button>
                  <NotificationBell />

                  {/* User Dropdown Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-primary-foreground/10 transition-colors outline-none">
                      <Avatar className="h-7 w-7 bg-primary-foreground/20 text-primary-foreground text-xs">
                        <AvatarFallback className="bg-primary-foreground/20 text-primary-foreground text-xs font-medium">
                          {getInitials()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col items-start">
                        <span className="text-sm font-medium text-primary-foreground max-w-[100px] truncate">
                          {displayName || user.email?.split("@")[0] || "Account"}
                        </span>
                        {getTaxIdentityLabel() && (
                          <span className="text-[10px] text-primary-foreground/60 leading-tight">
                            {getTaxIdentityLabel()}
                          </span>
                        )}
                      </div>
                      <ChevronDown className="h-3 w-3 text-primary-foreground/60" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 bg-popover z-50">
                      {/* Profile Info */}
                      <div className="px-3 py-2 border-b">
                        <p className="text-sm font-medium">{displayName || "User"}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        {getTaxIdentityLabel() ? (
                          <span className="inline-flex mt-1.5 px-2 py-0.5 text-xs font-medium rounded-full bg-accent text-accent-foreground">
                            {getTaxIdentityLabel()}
                          </span>
                        ) : (
                          <Link
                            to="/settings"
                            className="inline-flex items-center gap-1 mt-1.5 px-2 py-1 text-xs font-medium rounded-md bg-amber-100 text-amber-800 hover:bg-amber-200 transition-colors"
                          >
                            <User className="h-3 w-3" />
                            Complete your profile
                          </Link>
                        )}
                      </div>

                      {/* Profile Completion Checklist - show if incomplete */}
                      {!isProfileComplete && (
                        <>
                          <div className="px-3 py-2 border-b bg-muted/30">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-medium text-muted-foreground">Profile completion</span>
                              <span className="text-xs font-semibold text-foreground">{completionPercent}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mb-2">
                              <div
                                className="h-full bg-primary transition-all duration-300"
                                style={{ width: `${completionPercent}%` }}
                              />
                            </div>
                            <ul className="space-y-1">
                              {profileChecklist.map((item) => (
                                <li key={item.label} className="flex items-center gap-2 text-xs">
                                  {item.completed ? (
                                    <Check className="h-3 w-3 text-green-600" />
                                  ) : (
                                    <Circle className="h-3 w-3 text-muted-foreground" />
                                  )}
                                  <span className={item.completed ? "text-muted-foreground line-through" : "text-foreground"}>
                                    {item.label}
                                  </span>
                                </li>
                              ))}
                            </ul>
                            <Link
                              to="/settings"
                              className="inline-flex w-full justify-center items-center gap-1 mt-2 px-2 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                            >
                              Complete Setup
                            </Link>
                          </div>
                        </>
                      )}

                      <DropdownMenuItem asChild>
                        <Link to="/dashboard" className="flex items-center gap-2 cursor-pointer">
                          <LayoutDashboard className="h-4 w-4" />
                          Dashboard
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/settings" className="flex items-center gap-2 cursor-pointer">
                          <Settings className="h-4 w-4" />
                          Settings
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={handleSignOut}
                        className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
              {!user && (
                <>
                  <Button variant="outline-light" size="sm" asChild>
                    <Link to="/signin">Sign In</Link>
                  </Button>
                  <Button variant="accent" size="sm" asChild>
                    <Link to="/signup">Get Started</Link>
                  </Button>
                </>
              )}
            </div>

            {/* Mobile/Tablet Menu Button - visible below 2xl (1536px) */}
            <div className="2xl:hidden flex items-center gap-2 flex-shrink-0">
              {user && (
                <>
                  <Button variant="accent" size="sm" asChild className="hidden sm:flex">
                    <Link to="/filings/new">
                      <Plus className="h-4 w-4 mr-1" />
                      New Filing
                    </Link>
                  </Button>
                  <NotificationBell />
                </>
              )}
              <button
                className="flex items-center justify-center w-10 h-10 text-primary-foreground"
                onClick={() => setIsMenuOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile/Tablet Menu Sheet */}
      <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md bg-primary text-primary-foreground border-l-0 p-0 overflow-y-auto">
          <SheetHeader className="px-6 pt-6 pb-4">
            <SheetTitle className="text-primary-foreground text-left">
              <img
                src={logoDark}
                alt="BUOYANCE"
                className="h-7 w-auto object-contain"
              />
            </SheetTitle>
          </SheetHeader>

          <nav className="flex flex-col px-6">
            {user ? (
              // Authenticated mobile menu
              <>
                {/* User Profile Card */}
                <div className="flex items-center gap-3 p-4 rounded-lg bg-primary-foreground/10 mb-4">
                  <Avatar className="h-12 w-12 bg-primary-foreground/20 text-primary-foreground">
                    <AvatarFallback className="bg-primary-foreground/20 text-primary-foreground text-lg font-medium">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-primary-foreground truncate">
                      {displayName || user.email?.split("@")[0] || "User"}
                    </p>
                    <p className="text-xs text-primary-foreground/60 truncate">{user.email}</p>
                    {getTaxIdentityLabel() ? (
                      <span className="inline-flex mt-1 px-2 py-0.5 text-xs font-medium rounded-full bg-primary-foreground/20 text-primary-foreground">
                        {getTaxIdentityLabel()}
                      </span>
                    ) : (
                      <SheetClose asChild>
                        <Link
                          to="/settings"
                          className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 text-xs font-medium rounded-md bg-amber-400/90 text-amber-900 hover:bg-amber-300 transition-colors"
                          onClick={handleNavClick}
                        >
                          <User className="h-3 w-3" />
                          Complete profile
                        </Link>
                      </SheetClose>
                    )}
                  </div>
                </div>

                {/* Profile Completion Checklist - show if incomplete */}
                {!isProfileComplete && (
                  <div className="p-4 rounded-lg bg-primary-foreground/5 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-primary-foreground/70">Profile completion</span>
                      <span className="text-xs font-semibold text-primary-foreground">{completionPercent}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-primary-foreground/20 rounded-full overflow-hidden mb-3">
                      <div
                        className="h-full bg-amber-400 transition-all duration-300"
                        style={{ width: `${completionPercent}%` }}
                      />
                    </div>
                    <ul className="space-y-1.5 mb-3">
                      {profileChecklist.map((item) => (
                        <li key={item.label} className="flex items-center gap-2 text-xs">
                          {item.completed ? (
                            <Check className="h-3.5 w-3.5 text-green-400" />
                          ) : (
                            <Circle className="h-3.5 w-3.5 text-primary-foreground/40" />
                          )}
                          <span className={item.completed ? "text-primary-foreground/50 line-through" : "text-primary-foreground/90"}>
                            {item.label}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <SheetClose asChild>
                      <Link
                        to="/settings"
                        className="inline-flex w-full justify-center items-center gap-1 px-3 py-2 text-sm font-medium rounded-md bg-amber-400 text-amber-900 hover:bg-amber-300 transition-colors"
                        onClick={handleNavClick}
                      >
                        Complete Setup
                      </Link>
                    </SheetClose>
                  </div>
                )}

                {/* Quick Actions Section */}
                <div className="flex items-center gap-2 mb-3">
                  <Plus className="h-4 w-4 text-primary-foreground/50" />
                  <p className="text-xs uppercase text-primary-foreground/50 tracking-wider">Quick Actions</p>
                </div>
                <div className="flex gap-2 mb-6">
                  <SheetClose asChild>
                    <Link
                      to="/incomes?action=add"
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors border border-green-500/30"
                      onClick={handleNavClick}
                    >
                      <DollarSign className="h-4 w-4" />
                      Add Income
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link
                      to="/expenses?action=add"
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors border border-red-500/30"
                      onClick={handleNavClick}
                    >
                      <Wallet className="h-4 w-4" />
                      Add Expense
                    </Link>
                  </SheetClose>
                </div>

                <Separator className="my-4 bg-primary-foreground/10" />

                {/* Main Menu Section */}
                <div className="flex items-center gap-2 mb-3">
                  <LayoutDashboard className="h-4 w-4 text-primary-foreground/50" />
                  <p className="text-xs uppercase text-primary-foreground/50 tracking-wider">Main Menu</p>
                </div>
                <SheetClose asChild>
                  <Link
                    to="/dashboard"
                    className={cn(
                      "transition-colors font-medium text-lg py-3 border-b border-primary-foreground/10 flex items-center gap-3",
                      isPathActive(currentPath, "/dashboard")
                        ? "text-primary-foreground bg-primary-foreground/10 -mx-2 px-2 rounded-md"
                        : "text-primary-foreground/90 hover:text-primary-foreground"
                    )}
                    onClick={handleNavClick}
                  >
                    <LayoutDashboard className="h-5 w-5" />
                    Dashboard
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link
                    to="/filings"
                    className={cn(
                      "transition-colors font-medium text-lg py-3 border-b border-primary-foreground/10 flex items-center gap-3",
                      currentPath.startsWith("/filings")
                        ? "text-primary-foreground bg-primary-foreground/10 -mx-2 px-2 rounded-md"
                        : "text-primary-foreground/90 hover:text-primary-foreground"
                    )}
                    onClick={handleNavClick}
                  >
                    <FileText className="h-5 w-5" />
                    Tax Filings
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link
                    to="/payments"
                    className={cn(
                      "transition-colors font-medium text-lg py-3 border-b border-primary-foreground/10 flex items-center gap-3",
                      currentPath.startsWith("/payments")
                        ? "text-primary-foreground bg-primary-foreground/10 -mx-2 px-2 rounded-md"
                        : "text-primary-foreground/90 hover:text-primary-foreground"
                    )}
                    onClick={handleNavClick}
                  >
                    <CreditCard className="h-5 w-5" />
                    Payments
                  </Link>
                </SheetClose>

                <Separator className="my-4 bg-primary-foreground/10" />

                {/* Records Section */}
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-4 w-4 text-primary-foreground/50" />
                  <p className="text-xs uppercase text-primary-foreground/50 tracking-wider">Records</p>
                </div>
                <SheetClose asChild>
                  <Link
                    to="/incomes"
                    className={cn(
                      "transition-colors font-medium text-lg py-3 border-b border-primary-foreground/10 flex items-center gap-3",
                      currentPath.startsWith("/incomes")
                        ? "text-primary-foreground bg-primary-foreground/10 -mx-2 px-2 rounded-md"
                        : "text-primary-foreground/90 hover:text-primary-foreground"
                    )}
                    onClick={handleNavClick}
                  >
                    <DollarSign className="h-5 w-5" />
                    Income
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link
                    to="/expenses"
                    className={cn(
                      "transition-colors font-medium text-lg py-3 border-b border-primary-foreground/10 flex items-center gap-3",
                      currentPath.startsWith("/expenses")
                        ? "text-primary-foreground bg-primary-foreground/10 -mx-2 px-2 rounded-md"
                        : "text-primary-foreground/90 hover:text-primary-foreground"
                    )}
                    onClick={handleNavClick}
                  >
                    <Wallet className="h-5 w-5" />
                    Expenses
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link
                    to="/bank-connections"
                    className={cn(
                      "transition-colors font-medium text-lg py-3 border-b border-primary-foreground/10 flex items-center gap-3",
                      currentPath.startsWith("/bank-connections")
                        ? "text-primary-foreground bg-primary-foreground/10 -mx-2 px-2 rounded-md"
                        : "text-primary-foreground/90 hover:text-primary-foreground"
                    )}
                    onClick={handleNavClick}
                  >
                    <Landmark className="h-5 w-5" />
                    Bank Connections
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link
                    to="/bank-import"
                    className={cn(
                      "transition-colors font-medium text-lg py-3 border-b border-primary-foreground/10 flex items-center gap-3",
                      currentPath === "/bank-import"
                        ? "text-primary-foreground bg-primary-foreground/10 -mx-2 px-2 rounded-md"
                        : "text-primary-foreground/90 hover:text-primary-foreground"
                    )}
                    onClick={handleNavClick}
                  >
                    <Upload className="h-5 w-5" />
                    Bank Import
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link
                    to="/invoicing"
                    className={cn(
                      "transition-colors font-medium text-lg py-3 border-b border-primary-foreground/10 flex items-center gap-3",
                      currentPath === "/invoicing"
                        ? "text-primary-foreground bg-primary-foreground/10 -mx-2 px-2 rounded-md"
                        : "text-primary-foreground/90 hover:text-primary-foreground"
                    )}
                    onClick={handleNavClick}
                  >
                    <FileSpreadsheet className="h-5 w-5" />
                    Invoices
                  </Link>
                </SheetClose>

                <Separator className="my-4 bg-primary-foreground/10" />

                {/* Compliance Section */}
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="h-4 w-4 text-primary-foreground/50" />
                  <p className="text-xs uppercase text-primary-foreground/50 tracking-wider">Compliance</p>
                </div>
                <SheetClose asChild>
                  <Link
                    to="/compliance-calendar"
                    className={cn(
                      "transition-colors font-medium text-lg py-3 border-b border-primary-foreground/10 flex items-center gap-3",
                      currentPath === "/compliance-calendar"
                        ? "text-primary-foreground bg-primary-foreground/10 -mx-2 px-2 rounded-md"
                        : "text-primary-foreground/90 hover:text-primary-foreground"
                    )}
                    onClick={handleNavClick}
                  >
                    <Calendar className="h-5 w-5" />
                    Compliance Calendar
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link
                    to="/tcc"
                    className={cn(
                      "transition-colors font-medium text-lg py-3 border-b border-primary-foreground/10 flex items-center gap-3",
                      currentPath === "/tcc"
                        ? "text-primary-foreground bg-primary-foreground/10 -mx-2 px-2 rounded-md"
                        : "text-primary-foreground/90 hover:text-primary-foreground"
                    )}
                    onClick={handleNavClick}
                  >
                    <Shield className="h-5 w-5" />
                    TCC Readiness
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link
                    to="/audit-workspace"
                    className={cn(
                      "transition-colors font-medium text-lg py-3 border-b border-primary-foreground/10 flex items-center gap-3",
                      currentPath === "/audit-workspace"
                        ? "text-primary-foreground bg-primary-foreground/10 -mx-2 px-2 rounded-md"
                        : "text-primary-foreground/90 hover:text-primary-foreground"
                    )}
                    onClick={handleNavClick}
                  >
                    <Scale className="h-5 w-5" />
                    Audit Workspace
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link
                    to="/wht-credits"
                    className={cn(
                      "transition-colors font-medium text-lg py-3 border-b border-primary-foreground/10 flex items-center gap-3",
                      currentPath === "/wht-credits"
                        ? "text-primary-foreground bg-primary-foreground/10 -mx-2 px-2 rounded-md"
                        : "text-primary-foreground/90 hover:text-primary-foreground"
                    )}
                    onClick={handleNavClick}
                  >
                    <Banknote className="h-5 w-5" />
                    WHT Credits
                  </Link>
                </SheetClose>

                <Separator className="my-4 bg-primary-foreground/10" />

                {/* Calculators Section */}
                <div className="flex items-center gap-2 mb-3">
                  <Calculator className="h-4 w-4 text-primary-foreground/50" />
                  <p className="text-xs uppercase text-primary-foreground/50 tracking-wider">Calculators</p>
                </div>
                <SheetClose asChild>
                  <Link
                    to="/calculators"
                    className={cn(
                      "transition-colors font-medium text-lg py-3 border-b border-primary-foreground/10 flex items-center gap-3",
                      currentPath === "/calculators"
                        ? "text-primary-foreground bg-primary-foreground/10 -mx-2 px-2 rounded-md"
                        : "text-primary-foreground/90 hover:text-primary-foreground"
                    )}
                    onClick={handleNavClick}
                  >
                    <Calculator className="h-5 w-5" />
                    All Calculators
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link
                    to="/my-calculations"
                    className={cn(
                      "transition-colors font-medium text-lg py-3 border-b border-primary-foreground/10 flex items-center gap-3",
                      currentPath === "/my-calculations"
                        ? "text-primary-foreground bg-primary-foreground/10 -mx-2 px-2 rounded-md"
                        : "text-primary-foreground/90 hover:text-primary-foreground"
                    )}
                    onClick={handleNavClick}
                  >
                    <PiggyBank className="h-5 w-5" />
                    My Calculations
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link
                    to="/payroll"
                    className={cn(
                      "transition-colors font-medium text-lg py-3 border-b border-primary-foreground/10 flex items-center gap-3",
                      currentPath === "/payroll"
                        ? "text-primary-foreground bg-primary-foreground/10 -mx-2 px-2 rounded-md"
                        : "text-primary-foreground/90 hover:text-primary-foreground"
                    )}
                    onClick={handleNavClick}
                  >
                    <Users className="h-5 w-5" />
                    Payroll Calculator
                  </Link>
                </SheetClose>

                {/* Help Section */}
                <Separator className="my-4 bg-primary-foreground/10" />
                <div className="flex items-center gap-2 mb-3">
                  <HelpCircle className="h-4 w-4 text-primary-foreground/50" />
                  <p className="text-xs uppercase text-primary-foreground/50 tracking-wider">Resources</p>
                </div>
                <SheetClose asChild>
                  <Link
                    to="/documentation"
                    className={cn(
                      "transition-colors font-medium text-lg py-3 border-b border-primary-foreground/10 flex items-center gap-3",
                      isPathActive(currentPath, "/documentation") || isPathActive(currentPath, "/docs")
                        ? "text-primary-foreground bg-primary-foreground/10 -mx-2 px-2 rounded-md"
                        : "text-primary-foreground/90 hover:text-primary-foreground"
                    )}
                    onClick={handleNavClick}
                  >
                    <BookOpen className="h-5 w-5" />
                    Tax Guide
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link
                    to="/academy"
                    className={cn(
                      "transition-colors font-medium text-lg py-3 border-b border-primary-foreground/10 flex items-center gap-3",
                      currentPath.startsWith("/academy")
                        ? "text-primary-foreground bg-primary-foreground/10 -mx-2 px-2 rounded-md"
                        : "text-primary-foreground/90 hover:text-primary-foreground"
                    )}
                    onClick={handleNavClick}
                  >
                    <Brain className="h-5 w-5" />
                    Academy
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link
                    to="/support"
                    className={cn(
                      "transition-colors font-medium text-lg py-3 border-b border-primary-foreground/10 flex items-center gap-3",
                      currentPath === "/support"
                        ? "text-primary-foreground bg-primary-foreground/10 -mx-2 px-2 rounded-md"
                        : "text-primary-foreground/90 hover:text-primary-foreground"
                    )}
                    onClick={handleNavClick}
                  >
                    <HelpCircle className="h-5 w-5" />
                    Support
                  </Link>
                </SheetClose>

                {/* Admin Section */}
                {(isAdmin || isAuditor) && (
                  <>
                    <Separator className="my-4 bg-primary-foreground/10" />
                    <p className="text-xs uppercase text-primary-foreground/50 tracking-wider mb-2">Admin</p>
                    <SheetClose asChild>
                      <Link
                        to="/admin/dashboard"
                        className={cn(
                          "transition-colors font-medium text-lg py-3 border-b border-primary-foreground/10 flex items-center gap-3",
                          currentPath === "/admin/dashboard" || currentPath === "/admin"
                            ? "text-primary-foreground bg-primary-foreground/10 -mx-2 px-2 rounded-md"
                            : "text-primary-foreground/90 hover:text-primary-foreground"
                        )}
                        onClick={handleNavClick}
                      >
                        <Shield className="h-5 w-5" />
                        Admin Dashboard
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link
                        to="/admin/tax-rules"
                        className={cn(
                          "transition-colors font-medium text-lg py-3 border-b border-primary-foreground/10 flex items-center gap-3",
                          currentPath === "/admin/tax-rules"
                            ? "text-primary-foreground bg-primary-foreground/10 -mx-2 px-2 rounded-md"
                            : "text-primary-foreground/90 hover:text-primary-foreground"
                        )}
                        onClick={handleNavClick}
                      >
                        <BarChart3 className="h-5 w-5" />
                        Tax Rules
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link
                        to="/admin/classification-rules"
                        className={cn(
                          "transition-colors font-medium text-lg py-3 border-b border-primary-foreground/10 flex items-center gap-3",
                          currentPath === "/admin/classification-rules"
                            ? "text-primary-foreground bg-primary-foreground/10 -mx-2 px-2 rounded-md"
                            : "text-primary-foreground/90 hover:text-primary-foreground"
                        )}
                        onClick={handleNavClick}
                      >
                        <Brain className="h-5 w-5" />
                        AI Classification Rules
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link
                        to="/admin/classification-test"
                        className={cn(
                          "transition-colors font-medium text-lg py-3 border-b border-primary-foreground/10 flex items-center gap-3",
                          currentPath === "/admin/classification-test"
                            ? "text-primary-foreground bg-primary-foreground/10 -mx-2 px-2 rounded-md"
                            : "text-primary-foreground/90 hover:text-primary-foreground"
                        )}
                        onClick={handleNavClick}
                      >
                        <Brain className="h-5 w-5" />
                        AI Classification Tester
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link
                        to="/admin/audit"
                        className={cn(
                          "transition-colors font-medium text-lg py-3 border-b border-primary-foreground/10 flex items-center gap-3",
                          currentPath === "/admin/audit"
                            ? "text-primary-foreground bg-primary-foreground/10 -mx-2 px-2 rounded-md"
                            : "text-primary-foreground/90 hover:text-primary-foreground"
                        )}
                        onClick={handleNavClick}
                      >
                        <FileText className="h-5 w-5" />
                        Audit Logs
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link
                        to="/admin/payment-verification"
                        className={cn(
                          "transition-colors font-medium text-lg py-3 border-b border-primary-foreground/10 flex items-center gap-3",
                          currentPath === "/admin/payment-verification"
                            ? "text-primary-foreground bg-primary-foreground/10 -mx-2 px-2 rounded-md"
                            : "text-primary-foreground/90 hover:text-primary-foreground"
                        )}
                        onClick={handleNavClick}
                      >
                        <CreditCard className="h-5 w-5" />
                        Payment Verification
                      </Link>
                    </SheetClose>
                    {isAdmin && (
                      <>
                        <SheetClose asChild>
                          <Link
                            to="/admin/users"
                            className={cn(
                              "transition-colors font-medium text-lg py-3 border-b border-primary-foreground/10 flex items-center gap-3",
                              currentPath === "/admin/users"
                                ? "text-primary-foreground bg-primary-foreground/10 -mx-2 px-2 rounded-md"
                                : "text-primary-foreground/90 hover:text-primary-foreground"
                            )}
                            onClick={handleNavClick}
                          >
                            User Management
                          </Link>
                        </SheetClose>
                        <SheetClose asChild>
                          <Link
                            to="/admin/api-settings"
                            className={cn(
                              "transition-colors font-medium text-lg py-3 border-b border-primary-foreground/10 flex items-center gap-3",
                              currentPath === "/admin/api-settings"
                                ? "text-primary-foreground bg-primary-foreground/10 -mx-2 px-2 rounded-md"
                                : "text-primary-foreground/90 hover:text-primary-foreground"
                            )}
                            onClick={handleNavClick}
                          >
                            API Settings
                          </Link>
                        </SheetClose>
                      </>
                    )}
                  </>
                )}

                <Separator className="my-4 bg-primary-foreground/10" />
                <p className="text-xs uppercase text-primary-foreground/50 tracking-wider mb-2">Account</p>
                <SheetClose asChild>
                  <Link
                    to="/settings"
                    className={cn(
                      "transition-colors font-medium text-lg py-3 border-b border-primary-foreground/10 flex items-center gap-3",
                      currentPath === "/settings"
                        ? "text-primary-foreground bg-primary-foreground/10 -mx-2 px-2 rounded-md"
                        : "text-primary-foreground/90 hover:text-primary-foreground"
                    )}
                    onClick={handleNavClick}
                  >
                    <Settings className="h-5 w-5" />
                    Settings
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link
                    to="/notifications"
                    className={cn(
                      "transition-colors font-medium text-lg py-3 border-b border-primary-foreground/10 flex items-center gap-3",
                      currentPath === "/notifications"
                        ? "text-primary-foreground bg-primary-foreground/10 -mx-2 px-2 rounded-md"
                        : "text-primary-foreground/90 hover:text-primary-foreground"
                    )}
                    onClick={handleNavClick}
                  >
                    Notifications
                  </Link>
                </SheetClose>
                <button
                  onClick={handleSignOut}
                  className="text-primary-foreground/90 hover:text-primary-foreground transition-colors font-medium text-lg py-3 border-b border-primary-foreground/10 flex items-center gap-3 w-full text-left"
                >
                  <LogOut className="h-5 w-5" />
                  Sign Out
                </button>
              </>
            ) : (
              // Unauthenticated mobile menu
              <>
                <p className="text-xs uppercase text-primary-foreground/50 tracking-wider mb-2">Menu</p>
                {marketingLinks.map((link) =>
                  link.type === "link" ? (
                    <SheetClose asChild key={link.href}>
                      <Link
                        to={link.href}
                        className="text-primary-foreground/90 hover:text-primary-foreground transition-colors font-medium text-lg py-3 border-b border-primary-foreground/10"
                        onClick={handleNavClick}
                      >
                        {link.label}
                      </Link>
                    </SheetClose>
                  ) : (
                    <SheetClose asChild key={link.href}>
                      <a
                        href={link.href}
                        className="text-primary-foreground/90 hover:text-primary-foreground transition-colors font-medium text-lg py-3 border-b border-primary-foreground/10"
                        onClick={handleNavClick}
                      >
                        {link.label}
                      </a>
                    </SheetClose>
                  )
                )}

                <Separator className="my-4 bg-primary-foreground/10" />
                <p className="text-xs uppercase text-primary-foreground/50 tracking-wider mb-2">Calculators</p>
                <SheetClose asChild>
                  <a
                    href={getNavHref("#calculator")}
                    className="text-primary-foreground/90 hover:text-primary-foreground transition-colors font-medium text-lg py-3 border-b border-primary-foreground/10"
                    onClick={handleNavClick}
                  >
                    PIT Calculator
                  </a>
                </SheetClose>
                <SheetClose asChild>
                  <Link
                    to="/calculators/cit"
                    className="text-primary-foreground/90 hover:text-primary-foreground transition-colors font-medium text-lg py-3 border-b border-primary-foreground/10"
                    onClick={handleNavClick}
                  >
                    CIT Calculator
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link
                    to="/calculators/vat"
                    className="text-primary-foreground/90 hover:text-primary-foreground transition-colors font-medium text-lg py-3 border-b border-primary-foreground/10"
                    onClick={handleNavClick}
                  >
                    VAT Calculator
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link
                    to="/calculators/wht"
                    className="text-primary-foreground/90 hover:text-primary-foreground transition-colors font-medium text-lg py-3 border-b border-primary-foreground/10"
                    onClick={handleNavClick}
                  >
                    WHT Calculator
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link
                    to="/calculators/cgt"
                    className="text-primary-foreground/90 hover:text-primary-foreground transition-colors font-medium text-lg py-3 border-b border-primary-foreground/10"
                    onClick={handleNavClick}
                  >
                    CGT Calculator
                  </Link>
                </SheetClose>

                <Separator className="my-4 bg-primary-foreground/10" />
                <div className="flex flex-col gap-3 pt-2 pb-6">
                  <SheetClose asChild>
                    <Button variant="outline-light" asChild className="w-full justify-center">
                      <Link to="/signin" onClick={handleNavClick}>Sign In</Link>
                    </Button>
                  </SheetClose>
                  <SheetClose asChild>
                    <Button variant="accent" asChild className="w-full justify-center">
                      <Link to="/signup" onClick={handleNavClick}>Get Started</Link>
                    </Button>
                  </SheetClose>
                </div>
              </>
            )}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
