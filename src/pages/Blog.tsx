import { PageLayout } from "@/components/layout/PageLayout";
import { PageHero } from "@/components/layout/PageHero";
import { ContentSection } from "@/components/layout/ContentSection";
import { CTABand } from "@/components/layout/CTABand";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Calendar, Clock, ArrowRight, User } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";

const categories = ["All", "Tax Updates", "Guides", "Product News", "Industry Insights"];

const blogPosts = [
  {
    slug: "nigeria-tax-act-2025-explained",
    title: "Nigeria Tax Act 2025: What You Need to Know",
    excerpt: "A comprehensive breakdown of the new tax bands, rates, and compliance requirements under the NTA 2025.",
    category: "Tax Updates",
    author: "Folake Adeyemi",
    date: "January 5, 2026",
    readTime: "8 min read",
    featured: true,
  },
  {
    slug: "freelancer-tax-guide-nigeria",
    title: "Complete Tax Guide for Nigerian Freelancers",
    excerpt: "Everything freelancers need to know about tax obligations, deductions, and quarterly filing requirements.",
    category: "Guides",
    author: "Olumide Bakare",
    date: "January 3, 2026",
    readTime: "12 min read",
    featured: true,
  },
  {
    slug: "sme-tax-optimization-strategies",
    title: "5 Legal Tax Optimization Strategies for SMEs",
    excerpt: "Maximize your business efficiency while staying fully compliant with Nigerian tax regulations.",
    category: "Industry Insights",
    author: "Chukwuemeka Nwosu",
    date: "December 28, 2025",
    readTime: "6 min read",
    featured: false,
  },
  {
    slug: "buoyance-api-launch",
    title: "Introducing the Buoyance Tax API",
    excerpt: "Integrate deterministic tax calculations directly into your business applications.",
    category: "Product News",
    author: "Adaeze Okonkwo",
    date: "December 20, 2025",
    readTime: "4 min read",
    featured: false,
  },
  {
    slug: "understanding-paye-deductions",
    title: "Understanding PAYE Deductions in 2026",
    excerpt: "How the Pay-As-You-Earn system works and what employees should verify on their payslips.",
    category: "Tax Updates",
    author: "Folake Adeyemi",
    date: "December 15, 2025",
    readTime: "7 min read",
    featured: false,
  },
  {
    slug: "vat-registration-threshold",
    title: "VAT Registration: When and How to Register",
    excerpt: "A step-by-step guide to VAT registration for Nigerian businesses reaching the threshold.",
    category: "Guides",
    author: "Olumide Bakare",
    date: "December 10, 2025",
    readTime: "9 min read",
    featured: false,
  },
];

export default function Blog() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const filteredPosts = blogPosts.filter((post) => {
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === "All" || post.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const featuredPosts = filteredPosts.filter((post) => post.featured);
  const regularPosts = filteredPosts.filter((post) => !post.featured);

  return (
    <PageLayout>
      <PageHero
        title="Buoyance Blog"
        description="Expert insights on Nigerian tax compliance, regulatory updates, and financial intelligence for individuals and businesses."
        badge="Insights & Updates"
      />

      <ContentSection>
        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Button
                key={category}
                variant={activeCategory === category ? "accent" : "outline"}
                size="sm"
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        {/* Featured Posts */}
        {featuredPosts.length > 0 && (
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {featuredPosts.map((post) => (
              <Link
                key={post.slug}
                to={`/blog/${post.slug}`}
                className="group bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="aspect-video bg-muted flex items-center justify-center">
                  <span className="text-muted-foreground text-sm">Featured Image</span>
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2 py-1 bg-secondary/10 text-secondary text-xs font-medium rounded">
                      {post.category}
                    </span>
                    <span className="text-xs text-muted-foreground">Featured</span>
                  </div>
                  <h2 className="text-xl font-semibold text-card-foreground mb-2 group-hover:text-accent transition-colors">
                    {post.title}
                  </h2>
                  <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5" />
                        {post.author}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {post.date}
                      </span>
                    </div>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {post.readTime}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Regular Posts */}
        <div className="space-y-6">
          {regularPosts.map((post) => (
            <Link
              key={post.slug}
              to={`/blog/${post.slug}`}
              className="group flex flex-col md:flex-row gap-6 bg-card rounded-xl border border-border p-6 hover:shadow-md transition-shadow"
            >
              <div className="w-full md:w-48 h-32 bg-muted rounded-lg flex-shrink-0 flex items-center justify-center">
                <span className="text-muted-foreground text-sm">Thumbnail</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-1 bg-secondary/10 text-secondary text-xs font-medium rounded">
                    {post.category}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-card-foreground mb-2 group-hover:text-accent transition-colors">
                  {post.title}
                </h3>
                <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                  {post.excerpt}
                </p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <User className="h-3.5 w-3.5" />
                    {post.author}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {post.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {post.readTime}
                  </span>
                </div>
              </div>
              <div className="flex items-center">
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-accent transition-colors" />
              </div>
            </Link>
          ))}
        </div>

        {filteredPosts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No articles found matching your search.</p>
          </div>
        )}
      </ContentSection>

      <CTABand
        title="Stay informed on tax updates"
        description="Subscribe to our newsletter for the latest insights on Nigerian tax compliance."
        primaryText="Try Tax Calculator"
        secondaryText="Subscribe"
      />
    </PageLayout>
  );
}
