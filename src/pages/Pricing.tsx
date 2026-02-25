import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
    Check,
    X,
    Zap,
    Shield,
    ArrowRight,
    Calculator,
    FileText,
    Brain,
    Upload,
    Users,
    Landmark,
    CreditCard,
    HelpCircle,
    Star,
    Building2,
    Sparkles,
} from "lucide-react";

// Feature row type
interface FeatureRow {
    label: string;
    free: string | boolean;
    pro: string | boolean;
    tooltip?: string;
}

const FEATURES: { category: string; icon: React.ElementType; rows: FeatureRow[] }[] = [
    {
        category: "Tax Calculators",
        icon: Calculator,
        rows: [
            { label: "PIT (Personal Income Tax)", free: true, pro: true },
            { label: "CIT (Company Income Tax)", free: true, pro: true },
            { label: "VAT Calculator", free: true, pro: true },
            { label: "WHT (Withholding Tax)", free: true, pro: true },
            { label: "CGT (Capital Gains Tax)", free: true, pro: true },
            { label: "Crypto Tax Calculator", free: false, pro: true },
            { label: "Foreign Income Calculator", free: false, pro: true },
            { label: "Payroll Calculator (Multi-Employee)", free: false, pro: true },
        ],
    },
    {
        category: "Filing & Compliance",
        icon: FileText,
        rows: [
            { label: "Tax Filing Preparation", free: true, pro: true },
            { label: "Filing PDF Export", free: true, pro: true },
            { label: "Compliance Calendar", free: true, pro: true },
            { label: "TCC Readiness Tracker", free: false, pro: true },
            { label: "Audit Workspace", free: false, pro: true },
            { label: "WHT Credit Recovery", free: false, pro: true },
            { label: "AI Pre-Submit Check", free: false, pro: true },
            { label: "DigiTax MBS Sync", free: false, pro: true },
        ],
    },
    {
        category: "AI Intelligence",
        icon: Brain,
        rows: [
            { label: "AI Tax Explanations", free: "3/month", pro: "100/month" },
            { label: "Smart Expense Categorization", free: true, pro: true },
            { label: "AI Dashboard Insights", free: false, pro: true },
            { label: "Compliance Risk Narrative", free: false, pro: true },
            { label: "NTA 2025 Transition Guide", free: false, pro: true },
        ],
    },
    {
        category: "Data & Records",
        icon: Upload,
        rows: [
            { label: "Income & Expense Tracking", free: true, pro: true },
            { label: "Receipt OCR Scanning", free: "5/month", pro: "500/month" },
            { label: "CSV Bank Import", free: true, pro: true },
            { label: "Bank Feed Connections", free: false, pro: "10 syncs/month" },
            { label: "Invoice Generator", free: false, pro: true },
            { label: "API Interactions", free: "100/month", pro: "5,000/month" },
        ],
    },
    {
        category: "Team & Workspace",
        icon: Users,
        rows: [
            { label: "Personal Workspace", free: true, pro: true },
            { label: "Team Member Invitations", free: false, pro: true },
            { label: "External Accountant Access", free: false, pro: true },
            { label: "Multi-Workspace Support", free: false, pro: true },
            { label: "Role-Based Access Control", free: false, pro: true },
        ],
    },
    {
        category: "Support & Learning",
        icon: HelpCircle,
        rows: [
            { label: "Tax Academy Access", free: true, pro: true },
            { label: "Tax Guide Documentation", free: true, pro: true },
            { label: "Community Support", free: true, pro: true },
            { label: "Priority Support", free: false, pro: true },
            { label: "Accountant Onboarding", free: false, pro: true },
        ],
    },
];

function FeatureValue({ value }: { value: string | boolean }) {
    if (value === true) {
        return <Check className="h-5 w-5 text-green-500" />;
    }
    if (value === false) {
        return <X className="h-4 w-4 text-muted-foreground/40" />;
    }
    return <span className="text-sm font-medium text-foreground">{value}</span>;
}

export default function Pricing() {
    const { user } = useAuth();

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Header />

            {/* Hero Section */}
            <section className="relative bg-gradient-hero pt-24 md:pt-32 pb-20 md:pb-28 overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-5">
                    <div
                        className="absolute inset-0"
                        style={{
                            backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--primary-foreground)) 1px, transparent 0)`,
                            backgroundSize: "40px 40px",
                        }}
                    />
                </div>

                {/* Glow Effects */}
                <div className="absolute top-1/3 left-1/4 w-80 h-80 bg-secondary/20 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/3 w-64 h-64 bg-accent/15 rounded-full blur-3xl" />

                <div className="container relative z-10 max-w-5xl mx-auto px-4 md:px-6 text-center">
                    <Badge className="mb-6 bg-primary-foreground/10 backdrop-blur-sm border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10">
                        <Sparkles className="h-3.5 w-3.5 mr-1.5 text-accent" />
                        Simple, Transparent Pricing
                    </Badge>

                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-primary-foreground leading-tight mb-4">
                        One Plan.{" "}
                        <span className="text-accent">Unlimited Power.</span>
                    </h1>
                    <p className="text-lg md:text-xl text-primary-foreground/80 max-w-2xl mx-auto">
                        Start free with essential tax tools. Upgrade to Pro when you need the full arsenal of
                        Nigerian tax compliance intelligence.
                    </p>
                </div>
            </section>

            {/* Pricing Cards */}
            <section className="relative -mt-12 md:-mt-16 pb-16">
                <div className="container max-w-5xl mx-auto px-4 md:px-6">
                    <div className="grid md:grid-cols-2 gap-6 lg:gap-8">

                        {/* FREE Plan */}
                        <Card className="relative border-2 border-border bg-card shadow-lg">
                            <CardHeader className="pb-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2.5 rounded-xl bg-muted">
                                        <Shield className="h-6 w-6 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-2xl">Free</CardTitle>
                                        <CardDescription>For individuals getting started</CardDescription>
                                    </div>
                                </div>
                                <div className="flex items-baseline gap-1 mt-4">
                                    <span className="text-4xl font-bold text-foreground">₦0</span>
                                    <span className="text-muted-foreground text-sm">/month</span>
                                </div>
                                <p className="text-sm text-muted-foreground mt-2">
                                    Free forever. No credit card required.
                                </p>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Button
                                    variant="outline"
                                    size="lg"
                                    className="w-full"
                                    asChild
                                >
                                    <Link to={user ? "/dashboard" : "/signup"}>
                                        {user ? "Go to Dashboard" : "Get Started Free"}
                                        <ArrowRight className="h-4 w-4 ml-2" />
                                    </Link>
                                </Button>

                                <Separator />

                                <ul className="space-y-3">
                                    {[
                                        "5 Core Tax Calculators (PIT, CIT, VAT, WHT, CGT)",
                                        "Tax Filing Preparation & PDF Export",
                                        "Income & Expense Tracking",
                                        "Compliance Calendar",
                                        "3 AI Explanations/month",
                                        "5 Receipt OCR Scans/month",
                                        "Tax Academy Access",
                                        "CSV Bank Import",
                                    ].map((feature) => (
                                        <li key={feature} className="flex items-start gap-3 text-sm">
                                            <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                            <span className="text-muted-foreground">{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>

                        {/* PRO Plan */}
                        <Card className="relative border-2 border-primary bg-card shadow-xl ring-1 ring-primary/20">
                            {/* Popular badge */}
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                <Badge className="bg-primary text-primary-foreground px-4 py-1 text-xs font-semibold shadow-lg">
                                    <Star className="h-3 w-3 mr-1" />
                                    MOST POPULAR
                                </Badge>
                            </div>

                            <CardHeader className="pb-4 pt-8">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2.5 rounded-xl bg-primary/10">
                                        <Zap className="h-6 w-6 text-primary" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-2xl">Pro</CardTitle>
                                        <CardDescription>For professionals & businesses</CardDescription>
                                    </div>
                                </div>
                                <div className="flex items-baseline gap-1 mt-4">
                                    <span className="text-4xl font-bold text-foreground">₦4,999</span>
                                    <span className="text-muted-foreground text-sm">/month</span>
                                </div>
                                <p className="text-sm text-muted-foreground mt-2">
                                    Or ₦49,999/year — save 17%
                                </p>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Button
                                    size="lg"
                                    className="w-full bg-primary hover:bg-primary/90 shadow-md"
                                    asChild
                                >
                                    <Link to={user ? "/settings?tab=billing" : "/signup"}>
                                        {user ? "Upgrade to Pro" : "Start Free Trial"}
                                        <ArrowRight className="h-4 w-4 ml-2" />
                                    </Link>
                                </Button>

                                <Separator />

                                <p className="text-xs font-semibold text-primary uppercase tracking-wider">
                                    Everything in Free, plus:
                                </p>

                                <ul className="space-y-3">
                                    {[
                                        "Crypto & Foreign Income Calculators",
                                        "Multi-Employee Payroll with Payslip PDFs",
                                        "TCC Readiness Tracker",
                                        "Audit Workspace & WHT Credit Recovery",
                                        "AI Pre-Submit Filing Check",
                                        "DigiTax MBS Sync",
                                        "100 AI Explanations/month",
                                        "500 Receipt OCR Scans/month",
                                        "Bank Feed Connections (10 syncs/month)",
                                        "Invoice Generator",
                                        "Team & Accountant Collaboration",
                                        "Multi-Workspace Support",
                                        "Priority Support",
                                    ].map((feature) => (
                                        <li key={feature} className="flex items-start gap-3 text-sm">
                                            <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                                            <span className="text-foreground">{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </section>

            {/* Feature Comparison Table */}
            <section className="py-16 bg-muted/30">
                <div className="container max-w-5xl mx-auto px-4 md:px-6">
                    <div className="text-center mb-12">
                        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                            Full Feature Comparison
                        </h2>
                        <p className="text-muted-foreground max-w-xl mx-auto">
                            See exactly what you get with each plan. Every feature, every limit — no surprises.
                        </p>
                    </div>

                    <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                        {/* Table Header */}
                        <div className="grid grid-cols-[1fr_100px_100px] sm:grid-cols-[1fr_120px_120px] items-center px-4 sm:px-6 py-4 bg-muted/50 border-b font-medium text-sm">
                            <div className="text-muted-foreground">Feature</div>
                            <div className="text-center text-muted-foreground">Free</div>
                            <div className="text-center">
                                <span className="inline-flex items-center gap-1 text-primary font-semibold">
                                    <Zap className="h-3.5 w-3.5" />
                                    Pro
                                </span>
                            </div>
                        </div>

                        {/* Feature Categories */}
                        {FEATURES.map((category, catIdx) => (
                            <div key={category.category}>
                                {/* Category Header */}
                                <div className="grid grid-cols-[1fr_100px_100px] sm:grid-cols-[1fr_120px_120px] items-center px-4 sm:px-6 py-3 bg-muted/30 border-t">
                                    <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
                                        <category.icon className="h-4 w-4 text-primary" />
                                        {category.category}
                                    </div>
                                    <div />
                                    <div />
                                </div>

                                {/* Feature Rows */}
                                {category.rows.map((row, rowIdx) => (
                                    <div
                                        key={row.label}
                                        className={`grid grid-cols-[1fr_100px_100px] sm:grid-cols-[1fr_120px_120px] items-center px-4 sm:px-6 py-3 text-sm ${rowIdx < category.rows.length - 1 ? "border-b border-border/50" : ""
                                            } ${catIdx === FEATURES.length - 1 && rowIdx === category.rows.length - 1 ? "" : ""}`}
                                    >
                                        <div className="text-muted-foreground pr-4">{row.label}</div>
                                        <div className="flex justify-center">
                                            <FeatureValue value={row.free} />
                                        </div>
                                        <div className="flex justify-center">
                                            <FeatureValue value={row.pro} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Enterprise CTA */}
            <section className="py-16">
                <div className="container max-w-3xl mx-auto px-4 md:px-6">
                    <Card className="border-2 border-dashed border-primary/30 bg-primary/5">
                        <CardContent className="flex flex-col md:flex-row items-center gap-6 p-8">
                            <div className="p-4 rounded-2xl bg-primary/10">
                                <Building2 className="h-10 w-10 text-primary" />
                            </div>
                            <div className="flex-1 text-center md:text-left">
                                <h3 className="text-xl font-bold text-foreground mb-1">Need Enterprise?</h3>
                                <p className="text-muted-foreground text-sm">
                                    For accounting firms, large businesses, and organizations with custom compliance
                                    needs. Unlimited everything, dedicated support, and custom integrations.
                                </p>
                            </div>
                            <Button variant="outline" className="shrink-0" asChild>
                                <Link to="/support">
                                    <CreditCard className="h-4 w-4 mr-2" />
                                    Contact Sales
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </section>

            {/* FAQ */}
            <section className="py-16 bg-muted/30">
                <div className="container max-w-3xl mx-auto px-4 md:px-6">
                    <h2 className="text-2xl font-bold text-foreground text-center mb-10">
                        Frequently Asked Questions
                    </h2>
                    <div className="space-y-6">
                        {[
                            {
                                q: "Can I start using Buoyance for free?",
                                a: "Absolutely. The Free plan gives you access to all 5 core Nigerian tax calculators (PIT, CIT, VAT, WHT, CGT), tax filing preparation, income & expense tracking, and the compliance calendar — no credit card required, ever.",
                            },
                            {
                                q: "What happens when I hit a free limit?",
                                a: "You'll see a friendly upgrade prompt. Your data is never lost or deleted. You can upgrade anytime to Pro to unlock higher limits, or wait until the next billing month for your limits to reset.",
                            },
                            {
                                q: "Is there a free trial for Pro?",
                                a: "Yes! New users get a 14-day free trial of Pro features. You can also use the promo code available during our early-access period to unlock Pro instantly.",
                            },
                            {
                                q: "How does billing work?",
                                a: "Pro is billed monthly at ₦4,999 or annually at ₦49,999 (saving you 17%). Payments are processed securely via Paystack. You can cancel or downgrade anytime from your Settings page.",
                            },
                            {
                                q: "Is my financial data secure?",
                                a: "Your data is protected with AES-256 encryption, stored in compliance with the Nigeria Data Protection Act (NDPA) 2023, and processed entirely within Nigerian regulatory standards. We never share your data with third parties.",
                            },
                            {
                                q: "Can my accountant access my workspace?",
                                a: "With Pro, you can invite external accountants with read-only or filing-preparation access. They get their own dashboard to view your records without being able to modify billing or delete your workspace.",
                            },
                        ].map((faq) => (
                            <div key={faq.q} className="bg-card rounded-lg border p-5">
                                <h3 className="font-semibold text-foreground mb-2">{faq.q}</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="py-16">
                <div className="container max-w-2xl mx-auto px-4 md:px-6 text-center">
                    <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                        Ready to take control of your taxes?
                    </h2>
                    <p className="text-muted-foreground mb-8">
                        Join thousands of Nigerians using Buoyance to stay compliant, save money, and grow with confidence.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Button size="lg" asChild>
                            <Link to={user ? "/settings?tab=billing" : "/signup"}>
                                {user ? "Upgrade to Pro" : "Get Started Free"}
                                <ArrowRight className="h-4 w-4 ml-2" />
                            </Link>
                        </Button>
                        <Button variant="outline" size="lg" asChild>
                            <Link to="/support">Talk to Us</Link>
                        </Button>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
}
