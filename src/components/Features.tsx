import {
  Scale,
  Brain,
  FileCheck,
  Building2,
  ShieldCheck,
  Clock,
  Upload,
  FileSpreadsheet,
  Calculator,
  Calendar,
  Shield,
  BookOpen,
} from "lucide-react";
import { Card } from "@/components/ui/card";

const features = [
  {
    icon: Scale,
    title: "Legally Grounded Engine",
    description:
      "All tax logic derived exclusively from the Nigeria Tax Act 2025 and NTAA 2025. Every calculation mapped to specific legal sections.",
    highlight: "NTA 2025",
  },
  {
    icon: Brain,
    title: "Explainable Intelligence",
    description:
      "Clear reasoning behind every tax result. Understand exactly how your tax is calculated with detailed rule-by-rule breakdowns.",
    highlight: "Deterministic",
  },
  {
    icon: FileCheck,
    title: "Automated Filing",
    description:
      "Seamless preparation and submission workflows integrated with the Nigeria Revenue Service (NRS) e-Filing systems.",
    highlight: "NRS Integrated",
  },
  {
    icon: Building2,
    title: "Multi-Entity Support",
    description:
      "From individual PAYE to complex corporate structures. Handle PIT, CIT, VAT, WHT, and CGT across all business types.",
    highlight: "All Tax Types",
  },
  {
    icon: ShieldCheck,
    title: "Audit-Ready Records",
    description:
      "Immutable calculation logs, versioned tax rules, and complete audit trails. Every decision is logged and reproducible.",
    highlight: "Full Traceability",
  },
  {
    icon: Clock,
    title: "Real-Time Updates",
    description:
      "Stay compliant with automatic updates when tax laws change. Historical calculations preserved with versioned rule sets.",
    highlight: "Always Current",
  },
];

const tools = [
  {
    icon: Upload,
    title: "Bank Statement Import",
    description:
      "Drag & drop bank statements from GTBank, Access, UBA, and more. Auto-detect bank format, parse transactions, and categorize expenses.",
    highlight: "Auto-Categorize",
  },
  {
    icon: FileSpreadsheet,
    title: "Smart Invoicing",
    description:
      "Create professional invoices with auto-calculated VAT and WHT. Track payment status and generate PDF receipts.",
    highlight: "VAT/WHT Built-in",
  },
  {
    icon: Calculator,
    title: "Payroll Calculator",
    description:
      "NTA 2025 compliant PAYE calculations with pension, NHF, NHIA deductions. Generate payslips and remittance schedules instantly.",
    highlight: "NTA 2025 PAYE",
  },
  {
    icon: Calendar,
    title: "Compliance Calendar",
    description:
      "Never miss a deadline. Auto-generated tax calendar for FIRS, LIRS, and state agencies with penalty warnings and reminders.",
    highlight: "All Regulators",
  },
  {
    icon: Shield,
    title: "WHT Credit Tracker",
    description:
      "Upload WHT certificates with OCR scanning. Track credit balances, expiry dates, and apply credits to filings automatically.",
    highlight: "OCR Scanning",
  },
  {
    icon: BookOpen,
    title: "Tax Knowledge Base",
    description:
      "Searchable library of Nigerian tax laws, FIRS circulars, and practical guides. Stay informed with plain-language explanations.",
    highlight: "Always Learning",
  },
];

export function Features() {
  return (
    <section id="features" className="py-20 md:py-28 bg-background">
      <div className="container">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <span className="inline-block text-secondary font-semibold text-sm tracking-wide uppercase mb-4">
            Platform Capabilities
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Built for Nigerian Tax Compliance
          </h2>
          <p className="text-lg text-muted-foreground">
            A comprehensive platform designed to make tax calculation accurate,
            transparent, and stress-free for every Nigerian taxpayer.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="group p-6 md:p-8 border-2 border-border/50 hover:border-secondary/50 transition-all duration-300 hover:shadow-lg"
            >
              {/* Icon */}
              <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center mb-5 group-hover:bg-secondary/20 transition-colors">
                <feature.icon className="h-6 w-6 text-secondary" />
              </div>

              {/* Highlight Badge */}
              <span className="inline-block text-xs font-mono font-semibold text-accent bg-accent/10 px-2 py-1 rounded mb-3">
                {feature.highlight}
              </span>

              {/* Title */}
              <h3 className="text-lg font-bold text-foreground mb-2">
                {feature.title}
              </h3>

              {/* Description */}
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </Card>
          ))}
        </div>

        {/* Tools Section */}
        <div className="max-w-3xl mx-auto text-center mt-24 mb-16">
          <span className="inline-block text-primary font-semibold text-sm tracking-wide uppercase mb-4">
            Productivity Tools
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Everything You Need in One Place
          </h2>
          <p className="text-lg text-muted-foreground">
            From bank imports to invoicing, payroll to compliance tracking —
            all the tools you need to run a tax-compliant business.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {tools.map((tool, index) => (
            <Card
              key={index}
              className="group p-6 md:p-8 border-2 border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg"
            >
              {/* Icon */}
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors">
                <tool.icon className="h-6 w-6 text-primary" />
              </div>

              {/* Highlight Badge */}
              <span className="inline-block text-xs font-mono font-semibold text-secondary bg-secondary/10 px-2 py-1 rounded mb-3">
                {tool.highlight}
              </span>

              {/* Title */}
              <h3 className="text-lg font-bold text-foreground mb-2">
                {tool.title}
              </h3>

              {/* Description */}
              <p className="text-muted-foreground text-sm leading-relaxed">
                {tool.description}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
