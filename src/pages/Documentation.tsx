/**
 * How Buoyance Works - User Guide
 * 
 * User-friendly documentation explaining how to use the Buoyance platform.
 */

import { PageLayout } from "@/components/layout/PageLayout";
import { SimplePageHero } from "@/components/layout/SimplePageHero";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, 
  Calculator, 
  FileText, 
  Edit3, 
  Save, 
  Lock, 
  AlertTriangle,
  CheckCircle,
  ArrowRight
} from "lucide-react";

const sections = [
  { id: "what-buoyance-does", title: "What Buoyance Does", icon: BookOpen },
  { id: "how-it-works", title: "How It Works", icon: ArrowRight },
  { id: "corrections", title: "Corrections", icon: Edit3 },
  { id: "saved-calculations", title: "Saved Calculations", icon: Save },
  { id: "disclaimer", title: "Important Disclaimer", icon: AlertTriangle },
];

interface StepCardProps {
  step: number;
  title: string;
  description: string;
}

const StepCard = ({ step, title, description }: StepCardProps) => (
  <Card className="relative overflow-hidden">
    <div className="absolute top-0 left-0 w-12 h-12 bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
      {step}
    </div>
    <CardHeader className="pt-14 pb-2">
      <CardTitle className="text-lg">{title}</CardTitle>
    </CardHeader>
    <CardContent className="text-muted-foreground">
      {description}
    </CardContent>
  </Card>
);

export default function Documentation() {
  return (
    <PageLayout>
      <SimplePageHero
        title="How Buoyance Works"
        description="A simple guide to tracking your finances and preparing your tax filings"
      />
      <section className="py-12 md:py-16">
        <div className="container">
          <div className="grid lg:grid-cols-4 gap-8">
            {/* Sidebar Navigation */}
            <aside className="lg:col-span-1">
              <nav className="sticky top-24 space-y-1">
                {sections.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors w-full text-left text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <s.icon className="h-4 w-4" />
                    {s.title}
                  </a>
                ))}
              </nav>
            </aside>

            {/* Main Content */}
            <div className="lg:col-span-3 space-y-16">
              
              {/* What Buoyance Does */}
              <section id="what-buoyance-does" className="scroll-mt-24">
                <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                  <BookOpen className="h-6 w-6 text-primary" />
                  What Buoyance Does
                </h2>
                <p className="text-muted-foreground mb-6 text-lg">
                  Buoyance helps you stay on top of your Nigerian tax obligations by making it easy to:
                </p>
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <span><strong>Track your incomes and expenses</strong> – Keep a clear record of money coming in and going out.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <span><strong>Run tax calculations</strong> – See how much tax you may owe based on current tax rules.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <span><strong>Prepare filings</strong> – Organize your records and calculations into filing-ready summaries.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <span><strong>Keep a clear history</strong> – Every record is preserved so you always have a complete trail.</span>
                  </li>
                </ul>

                <div className="mt-8">
                  <h3 className="text-lg font-semibold text-foreground mb-3">Supported Tax Types</h3>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">PIT (Personal Income Tax)</Badge>
                    <Badge variant="secondary">CIT (Corporate Income Tax)</Badge>
                    <Badge variant="secondary">VAT (Value Added Tax)</Badge>
                    <Badge variant="secondary">WHT (Withholding Tax)</Badge>
                    <Badge variant="secondary">CGT (Capital Gains Tax)</Badge>
                    <Badge variant="secondary">Crypto Assets</Badge>
                    <Badge variant="secondary">Foreign Income</Badge>
                  </div>
                </div>
              </section>

              {/* How It Works */}
              <section id="how-it-works" className="scroll-mt-24">
                <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
                  <ArrowRight className="h-6 w-6 text-primary" />
                  How It Works
                </h2>
                <p className="text-muted-foreground mb-8">
                  Using Buoyance is straightforward. Just follow these three steps:
                </p>
                <div className="grid md:grid-cols-3 gap-6">
                  <StepCard
                    step={1}
                    title="Add Your Income & Expenses"
                    description="Record each income source and expense. Include details like amounts, dates, and categories. The more complete your records, the more accurate your calculations."
                  />
                  <StepCard
                    step={2}
                    title="Run a Calculator"
                    description="Choose the tax calculator you need (PIT, CIT, VAT, etc.) and enter or import your figures. The calculator will show you a breakdown of your potential tax liability."
                  />
                  <StepCard
                    step={3}
                    title="Create a Filing"
                    description="When you're ready, create a filing from your records and calculations. This organizes everything into a summary you can use for your tax submission."
                  />
                </div>
              </section>

              {/* Corrections */}
              <section id="corrections" className="scroll-mt-24">
                <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                  <Edit3 className="h-6 w-6 text-primary" />
                  Fixing Mistakes (Corrections)
                </h2>
                <p className="text-muted-foreground mb-6">
                  Made an error in an income or expense entry? No problem – but there's one important thing to know:
                </p>
                
                <Card className="border-primary/20 bg-primary/5 mb-6">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Lock className="h-4 w-4 text-primary" />
                      Records Cannot Be Deleted
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    To maintain a complete audit trail, Buoyance doesn't allow record deletion. Instead, you can <strong>correct</strong> a record.
                  </CardContent>
                </Card>

                <h3 className="text-lg font-semibold text-foreground mb-3">How Corrections Work</h3>
                <ol className="list-decimal pl-6 space-y-3 text-muted-foreground">
                  <li>Click the <strong>Correct</strong> button (pencil icon) on any income or expense record.</li>
                  <li>Make your changes in the dialog that appears.</li>
                  <li>Save the correction – this creates a <strong>new, updated record</strong>.</li>
                  <li>The original record is marked as <strong>"Superseded"</strong> and kept for historical reference.</li>
                </ol>

                <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">Viewing History</h3>
                <p className="text-muted-foreground">
                  By default, your income and expense lists show only <strong>active records</strong>. 
                  Use the <strong>"Show history"</strong> toggle to reveal superseded records and see the full correction chain.
                </p>
              </section>

              {/* Saved Calculations */}
              <section id="saved-calculations" className="scroll-mt-24">
                <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                  <Save className="h-6 w-6 text-primary" />
                  Saved Calculations & Finalization
                </h2>
                
                <h3 className="text-lg font-semibold text-foreground mb-3">My Calculations</h3>
                <p className="text-muted-foreground mb-6">
                  After running a tax calculator, you can save the result. All your saved calculations appear in 
                  <strong> My Calculations</strong>, where you can review them later or use them for filings.
                </p>

                <h3 className="text-lg font-semibold text-foreground mb-3">Finalizing a Calculation</h3>
                <p className="text-muted-foreground mb-4">
                  When you're confident a calculation is correct and complete, you can <strong>Finalize</strong> it:
                </p>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-start gap-3">
                    <Lock className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                    <span>Finalized calculations are <strong>locked permanently</strong> and cannot be edited or corrected.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <span>This creates an official record for compliance and audit purposes.</span>
                  </li>
                </ul>

                <Card className="border-amber-500/20 bg-amber-500/5 mt-6">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      Before You Finalize
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Double-check all figures before finalizing. Once locked, you cannot undo or change a finalized calculation.
                  </CardContent>
                </Card>
              </section>

              {/* Disclaimer */}
              <section id="disclaimer" className="scroll-mt-24">
                <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-6 w-6 text-amber-500" />
                  Important Disclaimer
                </h2>
                
                <Card className="border-amber-500/30 bg-amber-500/10">
                  <CardContent className="pt-6 space-y-4 text-muted-foreground">
                    <p>
                      <strong>Buoyance is an information and calculation tool.</strong> It is not a substitute for 
                      professional tax advice. Always consult a qualified tax professional for guidance specific to your situation.
                    </p>
                    <p>
                      <strong>Filing is "Prepare & Record":</strong> Buoyance helps you prepare your tax filings and 
                      keeps a record of them. Actual submission to the Nigerian Revenue Service (NRS) must be done 
                      separately through official channels unless direct submission is explicitly enabled.
                    </p>
                    <p>
                      <strong>Data Retention:</strong> Your records are retained for 7 years in accordance with 
                      regulatory requirements.
                    </p>
                  </CardContent>
                </Card>
              </section>

            </div>
          </div>
        </div>
      </section>
    </PageLayout>
  );
}
