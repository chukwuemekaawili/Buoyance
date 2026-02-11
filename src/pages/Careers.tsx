import { PageLayout } from "@/components/layout/PageLayout";
import { PageHero } from "@/components/layout/PageHero";
import { ContentSection } from "@/components/layout/ContentSection";
import { CTABand } from "@/components/layout/CTABand";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Briefcase, ArrowRight, Heart, TrendingUp, Users, Zap } from "lucide-react";

const benefits = [
  { icon: Heart, title: "Health & Wellness", description: "Comprehensive health insurance for you and your family" },
  { icon: TrendingUp, title: "Growth Budget", description: "Annual learning and development allowance" },
  { icon: Users, title: "Remote-First", description: "Work from anywhere in Nigeria with flexible hours" },
  { icon: Zap, title: "Competitive Pay", description: "Market-rate salaries with equity options" },
];

const openings = [
  {
    title: "Senior Backend Engineer",
    department: "Engineering",
    location: "Lagos / Remote",
    type: "Full-time",
    description: "Build scalable tax calculation engines and integrate with NRS APIs.",
  },
  {
    title: "Product Designer",
    department: "Design",
    location: "Lagos / Remote",
    type: "Full-time",
    description: "Shape the future of fintech UX for Nigerian taxpayers.",
  },
  {
    title: "Tax Compliance Specialist",
    department: "Operations",
    location: "Lagos",
    type: "Full-time",
    description: "Ensure our platform stays aligned with evolving Nigerian tax regulations.",
  },
  {
    title: "Customer Success Manager",
    department: "Customer Success",
    location: "Lagos / Remote",
    type: "Full-time",
    description: "Help our SME customers achieve stress-free tax compliance.",
  },
];

export default function Careers() {
  return (
    <PageLayout>
      <PageHero
        title="Build the Future of Tax Compliance"
        description="Join a team of passionate engineers, designers, and tax professionals working to simplify financial compliance for millions of Nigerians."
        badge="We're Hiring"
      />

      <ContentSection>
        <div className="prose prose-lg max-w-none mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-6">Why Buoyance?</h2>
          <p className="text-muted-foreground">
            We're building Nigeria's most trusted tax platform—a place where accuracy meets 
            simplicity. Our team combines deep regulatory expertise with cutting-edge technology 
            to solve real problems for real people.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {benefits.map((benefit) => (
            <div
              key={benefit.title}
              className="bg-card rounded-xl p-6 border border-border"
            >
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                <benefit.icon className="h-5 w-5 text-accent" />
              </div>
              <h3 className="font-semibold text-card-foreground mb-1">{benefit.title}</h3>
              <p className="text-sm text-muted-foreground">{benefit.description}</p>
            </div>
          ))}
        </div>

        <div className="prose prose-lg max-w-none mb-8">
          <h2 className="text-2xl font-bold text-foreground">Open Positions</h2>
        </div>

        <div className="space-y-4">
          {openings.map((job) => (
            <div
              key={job.title}
              className="bg-card rounded-xl p-6 border border-border hover:shadow-md transition-shadow group"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Briefcase className="h-4 w-4" />
                    <span>{job.department}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-card-foreground mb-1">{job.title}</h3>
                  <p className="text-muted-foreground text-sm mb-3">{job.description}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {job.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {job.type}
                    </span>
                  </div>
                </div>
                <Button variant="outline" className="group-hover:bg-accent group-hover:text-accent-foreground group-hover:border-accent transition-colors">
                  Apply Now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 bg-muted/50 rounded-xl p-8 text-center border border-border">
          <h3 className="text-xl font-semibold text-foreground mb-2">Don't see the right role?</h3>
          <p className="text-muted-foreground mb-4">
            We're always looking for talented people. Send us your CV and we'll be in touch.
          </p>
          <Button variant="outline">
            Send Open Application
          </Button>
        </div>
      </ContentSection>

      <CTABand
        title="Ready to make an impact?"
        description="Join our team and help build the future of tax compliance in Nigeria."
        primaryText="View All Openings"
        primaryLink="/careers"
      />
    </PageLayout>
  );
}
