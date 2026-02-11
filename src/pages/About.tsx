import { PageLayout } from "@/components/layout/PageLayout";
import { SimplePageHero } from "@/components/layout/SimplePageHero";
import { ContentSection } from "@/components/layout/ContentSection";
import { Users, Target, Shield, Award, Building2, Heart } from "lucide-react";

const values = [
  {
    icon: Shield,
    title: "Trust & Transparency",
    description: "Every calculation is explainable. No black boxes, no guesswork—just clear, auditable tax logic.",
  },
  {
    icon: Target,
    title: "Accuracy First",
    description: "Deterministic calculations grounded in the Nigeria Tax Act 2025. Zero approximations.",
  },
  {
    icon: Heart,
    title: "Customer Obsessed",
    description: "We build for Nigerian individuals, freelancers, and SMEs who deserve stress-free tax compliance.",
  },
  {
    icon: Award,
    title: "Regulatory Excellence",
    description: "Aligned with NRS requirements and Nigerian data residency standards at every level.",
  },
];

const team = [
  { name: "Adaeze Okonkwo", role: "Chief Executive Officer", image: "" },
  { name: "Chukwuemeka Nwosu", role: "Chief Technology Officer", image: "" },
  { name: "Folake Adeyemi", role: "Head of Tax Intelligence", image: "" },
  { name: "Olumide Bakare", role: "Head of Compliance", image: "" },
];

export default function About() {
  return (
    <PageLayout>
      <SimplePageHero
        title="Building Nigeria's Most Trusted Tax Platform"
        description="We're on a mission to make tax compliance simple, accurate, and accessible for every Nigerian—from individuals to growing businesses."
      />

      <ContentSection>
        <div className="prose prose-lg max-w-none">
          <h2 className="text-2xl font-bold text-foreground mb-6">Our Mission</h2>
          <p className="text-muted-foreground mb-8">
            Buoyance was founded with a simple belief: tax compliance shouldn't be complicated. 
            In a landscape where regulatory requirements evolve rapidly, we built a platform that 
            combines deterministic tax calculations with intelligent automation—all grounded in the 
            Nigeria Tax Act 2025 and aligned with the Nigeria Revenue Service.
          </p>

          <div className="bg-muted/50 rounded-xl p-6 md:p-8 my-8 border border-border">
            <div className="flex items-start gap-4">
              <Building2 className="h-8 w-8 text-secondary flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Lagos, Nigeria</h3>
                <p className="text-muted-foreground">
                  Headquartered in Lagos, we're deeply connected to the Nigerian financial ecosystem 
                  and committed to Nigerian data residency standards.
                </p>
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-foreground mb-6 mt-12">Our Values</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6 my-8">
          {values.map((value) => (
            <div
              key={value.title}
              className="bg-card rounded-xl p-6 border border-border hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center mb-4">
                <value.icon className="h-6 w-6 text-secondary" />
              </div>
              <h3 className="text-lg font-semibold text-card-foreground mb-2">{value.title}</h3>
              <p className="text-muted-foreground">{value.description}</p>
            </div>
          ))}
        </div>

        <div className="prose prose-lg max-w-none mt-12">
          <h2 className="text-2xl font-bold text-foreground mb-6">Leadership Team</h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 my-8">
          {team.map((member) => (
            <div
              key={member.name}
              className="bg-card rounded-xl p-6 border border-border text-center"
            >
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-card-foreground">{member.name}</h3>
              <p className="text-sm text-muted-foreground">{member.role}</p>
            </div>
          ))}
        </div>
      </ContentSection>
    </PageLayout>
  );
}
