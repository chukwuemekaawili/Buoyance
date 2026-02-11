import { PageLayout } from "@/components/layout/PageLayout";
import { SimplePageHero } from "@/components/layout/SimplePageHero";
import { ContentSection } from "@/components/layout/ContentSection";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Search, Calculator, FileText, Shield, CreditCard, User, CheckCircle2, AlertCircle, Clock, BookOpen, ArrowRight, HelpCircle, Activity, BookMarked } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

// Help Center Data
const categories = [
  { icon: Calculator, title: "Tax Calculator", count: 8 },
  { icon: FileText, title: "Filing & Submissions", count: 6 },
  { icon: Shield, title: "Security & Privacy", count: 5 },
  { icon: CreditCard, title: "Billing & Payments", count: 4 },
  { icon: User, title: "Account Management", count: 7 },
];

const faqs = [
  { q: "How accurate are the tax calculations?", a: "Our calculations are deterministic and based exclusively on the Nigeria Tax Act 2025. Every calculation is explainable with no approximations.", category: "Tax Calculator" },
  { q: "What tax bands does Buoyance support?", a: "We support all progressive tax bands under NTA 2025: 0% up to ₦800,000, 15% on next ₦2.2M, 18% on next ₦9M, 21% on next ₦13M, 23% on next ₦25M, and 25% above ₦50M.", category: "Tax Calculator" },
  { q: "Can I file my taxes directly through Buoyance?", a: "Yes, our platform supports automated preparation and submission workflows integrated with the Nigeria Revenue Service (NRS) for eligible taxpayers.", category: "Filing & Submissions" },
  { q: "Is my financial data secure?", a: "Absolutely. We use AES-256 encryption for all data, store information exclusively in Nigerian data centers, and follow strict NRS compliance standards.", category: "Security & Privacy" },
  { q: "How do I cancel my subscription?", a: "You can cancel anytime from your account settings. Your access continues until the end of your billing period.", category: "Billing & Payments" },
  { q: "Can I export my tax reports?", a: "Yes, you can export detailed tax breakdowns in PDF format suitable for record-keeping or sharing with your accountant.", category: "Filing & Submissions" },
];

// System Status Data
const systems = [
  { name: "Tax Calculator Engine", status: "operational" },
  { name: "User Authentication", status: "operational" },
  { name: "API Services", status: "operational" },
  { name: "File Storage", status: "operational" },
  { name: "Payment Processing", status: "operational" },
];

const incidents = [
  { date: "January 5, 2026", title: "Scheduled Maintenance", description: "Completed database optimization. No downtime.", status: "resolved" },
  { date: "December 20, 2025", title: "API Latency", description: "Brief increase in API response times. Resolved within 15 minutes.", status: "resolved" },
];

// Tax Guides Data
const guides = [
  { slug: "understanding-paye-2026", title: "Understanding PAYE in 2026", description: "Complete guide to Pay-As-You-Earn deductions under NTA 2025.", category: "Individuals", readTime: "10 min" },
  { slug: "freelancer-quarterly-filing", title: "Quarterly Filing for Freelancers", description: "Step-by-step guide to quarterly tax returns for self-employed professionals.", category: "Freelancers", readTime: "8 min" },
  { slug: "sme-tax-obligations", title: "SME Tax Obligations Guide", description: "Everything SMEs need to know about CIT, VAT, and WHT in Nigeria.", category: "Businesses", readTime: "15 min" },
  { slug: "tax-deductions-allowances", title: "Allowable Tax Deductions", description: "Maximize legitimate deductions to optimize your tax position.", category: "All", readTime: "12 min" },
];

function HelpCenterTab() {
  const [search, setSearch] = useState("");
  const filtered = faqs.filter(f => f.q.toLowerCase().includes(search.toLowerCase()) || f.a.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="relative mb-8">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search help articles..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>
      <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-4 mb-12">
        {categories.map((cat) => (
          <div key={cat.title} className="bg-card rounded-xl p-4 border border-border text-center hover:shadow-md transition-shadow cursor-pointer">
            <cat.icon className="h-6 w-6 text-secondary mx-auto mb-2" />
            <h3 className="font-medium text-card-foreground text-sm">{cat.title}</h3>
            <p className="text-xs text-muted-foreground">{cat.count} articles</p>
          </div>
        ))}
      </div>
      <h2 className="text-xl font-bold text-foreground mb-4">Frequently Asked Questions</h2>
      <Accordion type="single" collapsible className="space-y-2">
        {filtered.map((faq, i) => (
          <AccordionItem key={i} value={`faq-${i}`} className="bg-card border border-border rounded-lg px-4">
            <AccordionTrigger className="text-left font-medium">{faq.q}</AccordionTrigger>
            <AccordionContent className="text-muted-foreground">{faq.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">No results found.</p>}
    </div>
  );
}

function SystemStatusTab() {
  const allOperational = systems.every(s => s.status === "operational");

  return (
    <div>
      <div className={`rounded-xl p-6 mb-8 ${allOperational ? "bg-secondary/10 border border-secondary/20" : "bg-accent/10 border border-accent/20"}`}>
        <div className="flex items-center gap-3">
          {allOperational ? <CheckCircle2 className="h-6 w-6 text-secondary" /> : <AlertCircle className="h-6 w-6 text-accent" />}
          <span className="text-lg font-semibold text-foreground">{allOperational ? "All Systems Operational" : "Some Systems Affected"}</span>
        </div>
      </div>

      <h2 className="text-xl font-bold text-foreground mb-4">Services</h2>
      <div className="space-y-3 mb-12">
        {systems.map((sys) => (
          <div key={sys.name} className="flex items-center justify-between p-4 bg-card rounded-lg border border-border">
            <span className="font-medium text-card-foreground">{sys.name}</span>
            <span className="flex items-center gap-2 text-sm text-secondary">
              <span className="w-2 h-2 bg-secondary rounded-full"></span>
              Operational
            </span>
          </div>
        ))}
      </div>

      <h2 className="text-xl font-bold text-foreground mb-4">Recent Incidents</h2>
      <div className="space-y-4">
        {incidents.map((inc, i) => (
          <div key={i} className="p-4 bg-card rounded-lg border border-border">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-card-foreground">{inc.title}</h3>
              <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" />{inc.date}</span>
            </div>
            <p className="text-sm text-muted-foreground">{inc.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TaxGuidesTab() {
  return (
    <div className="space-y-4">
      {guides.map((guide) => (
        <Link key={guide.slug} to={`/tax-guides/${guide.slug}`} className="group flex items-center gap-6 p-6 bg-card rounded-xl border border-border hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
            <BookOpen className="h-6 w-6 text-accent" />
          </div>
          <div className="flex-1">
            <span className="text-xs text-secondary font-medium">{guide.category} • {guide.readTime}</span>
            <h3 className="text-lg font-semibold text-card-foreground group-hover:text-accent transition-colors">{guide.title}</h3>
            <p className="text-sm text-muted-foreground">{guide.description}</p>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-accent transition-colors" />
        </Link>
      ))}
    </div>
  );
}

export default function Support() {
  return (
    <PageLayout>
      <SimplePageHero 
        title="Support Hub" 
        description="Find help, check system status, and explore tax guides." 
      />
      <ContentSection>
        <Tabs defaultValue="help" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="help" className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Help Center</span>
              <span className="sm:hidden">Help</span>
            </TabsTrigger>
            <TabsTrigger value="status" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">System Status</span>
              <span className="sm:hidden">Status</span>
            </TabsTrigger>
            <TabsTrigger value="guides" className="flex items-center gap-2">
              <BookMarked className="h-4 w-4" />
              <span className="hidden sm:inline">Tax Guides</span>
              <span className="sm:hidden">Guides</span>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="help">
            <HelpCenterTab />
          </TabsContent>
          <TabsContent value="status">
            <SystemStatusTab />
          </TabsContent>
          <TabsContent value="guides">
            <TaxGuidesTab />
          </TabsContent>
        </Tabs>
      </ContentSection>
    </PageLayout>
  );
}
