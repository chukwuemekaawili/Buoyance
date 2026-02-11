import { PageLayout } from "@/components/layout/PageLayout";
import { CTABand } from "@/components/layout/CTABand";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield } from "lucide-react";
import { Link, useParams } from "react-router-dom";

const guidesData: Record<string, { title: string; category: string; content: string[] }> = {
  "understanding-paye-2026": {
    title: "Understanding PAYE in 2026",
    category: "Individuals",
    content: [
      "Pay-As-You-Earn (PAYE) is the system through which employers deduct income tax from employees' salaries before payment. Under the Nigeria Tax Act 2025, PAYE remains the primary mechanism for collecting personal income tax from employed individuals.",
      "## How PAYE Works",
      "Your employer calculates your tax liability based on the progressive tax bands, deducts it from your gross salary, and remits it to the relevant tax authority on your behalf.",
      "## 2026 Tax Bands Applied to PAYE",
      "- **0%** on income up to ₦800,000 annually",
      "- **15%** on the next ₦2.2 million",
      "- **18%** on the next ₦9 million",
      "- **21%** on the next ₦13 million",
      "- **23%** on the next ₦25 million",
      "- **25%** on income above ₦50 million",
      "## Verifying Your Payslip",
      "Always check that your payslip shows the correct gross salary, tax deductions, and net pay. Use the Buoyance calculator to verify your employer's calculations.",
      "**Disclaimer:** This guide is for informational purposes only and does not constitute tax advice.",
    ],
  },
};

export default function TaxGuide() {
  const { slug } = useParams<{ slug: string }>();
  const guide = slug ? guidesData[slug] : null;

  if (!guide) {
    return (
      <PageLayout>
        <div className="container py-32 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Guide Not Found</h1>
          <Button asChild variant="accent"><Link to="/tax-guides"><ArrowLeft className="mr-2 h-4 w-4" />Back to Guides</Link></Button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <section className="bg-primary py-12 md:py-16">
        <div className="container max-w-3xl">
          <Link to="/tax-guides" className="inline-flex items-center text-primary-foreground/70 hover:text-primary-foreground text-sm mb-6"><ArrowLeft className="mr-2 h-4 w-4" />Back to Guides</Link>
          <span className="inline-block px-3 py-1 bg-secondary/20 text-secondary text-sm font-medium rounded-full mb-4">{guide.category}</span>
          <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground">{guide.title}</h1>
        </div>
      </section>
      <section className="py-12 md:py-16">
        <div className="container max-w-3xl prose prose-lg">
          {guide.content.map((p, i) => {
            if (p.startsWith("## ")) return <h2 key={i} className="text-2xl font-bold text-foreground mt-8 mb-4">{p.replace("## ", "")}</h2>;
            if (p.startsWith("- **")) return <ul key={i} className="list-disc list-inside text-muted-foreground space-y-1">{p.split("\n").filter(Boolean).map((item, j) => <li key={j} dangerouslySetInnerHTML={{ __html: item.replace(/- \*\*(.+?)\*\*/, "<strong>$1</strong>") }} />)}</ul>;
            if (p.startsWith("**Disclaimer")) return <div key={i} className="bg-muted/50 rounded-lg p-6 mt-8 border border-border flex items-start gap-3"><Shield className="h-5 w-5 text-secondary flex-shrink-0 mt-0.5" /><p className="text-sm text-muted-foreground">{p.replace(/\*\*/g, "")}</p></div>;
            return <p key={i} className="text-muted-foreground mb-4">{p}</p>;
          })}
        </div>
      </section>
      <CTABand />
    </PageLayout>
  );
}
