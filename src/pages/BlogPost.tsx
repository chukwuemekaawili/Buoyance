import { PageLayout } from "@/components/layout/PageLayout";
import { CTABand } from "@/components/layout/CTABand";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Clock, User, Share2, Bookmark, Shield } from "lucide-react";
import { Link, useParams } from "react-router-dom";

// Mock blog post data - in production this would come from an API/CMS
const blogPostsData: Record<string, {
  title: string;
  excerpt: string;
  category: string;
  author: string;
  authorRole: string;
  date: string;
  readTime: string;
  content: string[];
}> = {
  "nigeria-tax-act-2025-explained": {
    title: "Nigeria Tax Act 2025: What You Need to Know",
    excerpt: "A comprehensive breakdown of the new tax bands, rates, and compliance requirements under the NTA 2025.",
    category: "Tax Updates",
    author: "Folake Adeyemi",
    authorRole: "Head of Tax Intelligence",
    date: "January 5, 2026",
    readTime: "8 min read",
    content: [
      "The Nigeria Tax Act 2025 represents the most significant overhaul of the country's tax system in decades. This comprehensive reform introduces new progressive tax bands, updated compliance requirements, and modernized filing procedures designed to simplify tax obligations for individuals and businesses alike.",
      "## New Progressive Tax Bands",
      "One of the most impactful changes is the restructured progressive tax band system. The new rates are designed to reduce the burden on lower-income earners while ensuring fair contribution from higher earners:",
      "- **0%** on income up to ₦800,000",
      "- **15%** on the next ₦2.2 million",
      "- **18%** on the next ₦9 million",
      "- **21%** on the next ₦13 million",
      "- **23%** on the next ₦25 million",
      "- **25%** on income above ₦50 million",
      "## Compliance Requirements",
      "The NTA 2025 introduces several new compliance requirements that taxpayers should be aware of. Electronic filing is now mandatory for all categories of taxpayers, with quarterly reporting required for self-employed individuals and businesses.",
      "## What This Means for You",
      "Whether you're an individual, freelancer, or business owner, understanding these changes is crucial for maintaining compliance and optimizing your tax position. The new system offers opportunities for legitimate tax planning while ensuring fair contribution to national development.",
      "**Disclaimer:** This article is for informational purposes only and does not constitute legal or tax advice. Consult a qualified tax professional for guidance specific to your situation.",
    ],
  },
  "freelancer-tax-guide-nigeria": {
    title: "Complete Tax Guide for Nigerian Freelancers",
    excerpt: "Everything freelancers need to know about tax obligations, deductions, and quarterly filing requirements.",
    category: "Guides",
    author: "Olumide Bakare",
    authorRole: "Head of Compliance",
    date: "January 3, 2026",
    readTime: "12 min read",
    content: [
      "The freelance economy in Nigeria continues to grow rapidly, with more professionals choosing independent work across technology, creative services, consulting, and other fields. Understanding your tax obligations as a freelancer is essential for staying compliant and maximizing your earnings.",
      "## Are You Required to Pay Taxes?",
      "If your annual income from freelance work exceeds ₦800,000, you are required to register with the relevant tax authority and file tax returns. Even if you earn below this threshold, maintaining proper records is advisable.",
      "## Allowable Deductions",
      "Freelancers can deduct legitimate business expenses from their taxable income, including:",
      "- **Home office expenses** (proportional to workspace area)",
      "- **Equipment and software** used for work",
      "- **Professional development** and training costs",
      "- **Internet and communication** expenses",
      "- **Professional services** (accounting, legal fees)",
      "## Quarterly Filing Requirements",
      "Under the NTA 2025, freelancers with income above ₦5 million annually must file quarterly tax returns. This helps spread your tax burden throughout the year and improves cash flow management.",
      "## Record Keeping Best Practices",
      "Maintain organized records of all income and expenses. Use accounting software or dedicated spreadsheets to track invoices, receipts, and bank statements. These records should be kept for at least six years.",
      "**Disclaimer:** This guide is for informational purposes only. Consult a qualified tax professional for advice specific to your situation.",
    ],
  },
};

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const post = slug ? blogPostsData[slug] : null;

  if (!post) {
    return (
      <PageLayout>
        <div className="container py-32 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Article Not Found</h1>
          <p className="text-muted-foreground mb-8">The article you're looking for doesn't exist.</p>
          <Button asChild variant="accent">
            <Link to="/blog">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Blog
            </Link>
          </Button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      {/* Article Header */}
      <section className="bg-primary py-12 md:py-16">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <Link 
              to="/blog" 
              className="inline-flex items-center text-primary-foreground/70 hover:text-primary-foreground text-sm mb-6 transition-colors"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Blog
            </Link>

            <div className="flex items-center gap-2 mb-4">
              <span className="px-3 py-1 bg-secondary/20 text-secondary text-sm font-medium rounded-full">
                {post.category}
              </span>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
              {post.title}
            </h1>

            <p className="text-lg text-primary-foreground/70 mb-6">
              {post.excerpt}
            </p>

            <div className="flex flex-wrap items-center gap-6 text-sm text-primary-foreground/60">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary-foreground" />
                </div>
                <div>
                  <div className="text-primary-foreground font-medium">{post.author}</div>
                  <div className="text-xs">{post.authorRole}</div>
                </div>
              </div>
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {post.date}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {post.readTime}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Article Content */}
      <section className="py-12 md:py-16">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            {/* Share/Save Actions */}
            <div className="flex items-center gap-3 mb-8 pb-8 border-b border-border">
              <Button variant="outline" size="sm">
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
              <Button variant="outline" size="sm">
                <Bookmark className="mr-2 h-4 w-4" />
                Save
              </Button>
            </div>

            {/* Article Body */}
            <article className="prose prose-lg max-w-none">
              {post.content.map((paragraph, index) => {
                if (paragraph.startsWith("## ")) {
                  return (
                    <h2 key={index} className="text-2xl font-bold text-foreground mt-8 mb-4">
                      {paragraph.replace("## ", "")}
                    </h2>
                  );
                }
                if (paragraph.startsWith("- **")) {
                  const items = paragraph.split("\n").filter(Boolean);
                  return (
                    <ul key={index} className="list-disc list-inside space-y-2 text-muted-foreground">
                      {items.map((item, i) => {
                        const match = item.match(/- \*\*(.+?)\*\*(.+)/);
                        if (match) {
                          return (
                            <li key={i}>
                              <strong className="text-foreground">{match[1]}</strong>
                              {match[2]}
                            </li>
                          );
                        }
                        return <li key={i}>{item.replace("- ", "")}</li>;
                      })}
                    </ul>
                  );
                }
                if (paragraph.startsWith("**Disclaimer")) {
                  return (
                    <div key={index} className="bg-muted/50 rounded-lg p-6 mt-8 border border-border">
                      <div className="flex items-start gap-3">
                        <Shield className="h-5 w-5 text-secondary flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-muted-foreground">
                          {paragraph.replace(/\*\*/g, "")}
                        </p>
                      </div>
                    </div>
                  );
                }
                return (
                  <p key={index} className="text-muted-foreground mb-4 leading-relaxed">
                    {paragraph}
                  </p>
                );
              })}
            </article>

            {/* Author Card */}
            <div className="mt-12 p-6 bg-card rounded-xl border border-border">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <User className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <div className="font-semibold text-card-foreground">{post.author}</div>
                  <div className="text-sm text-muted-foreground mb-2">{post.authorRole}</div>
                  <p className="text-sm text-muted-foreground">
                    Expert in Nigerian tax compliance and regulatory affairs with over 10 years of experience 
                    in financial services and tax advisory.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <CTABand
        title="Calculate your taxes with confidence"
        description="Use our deterministic tax calculator to understand your exact obligations under NTA 2025."
      />
    </PageLayout>
  );
}
