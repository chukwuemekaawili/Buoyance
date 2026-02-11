import { Button } from "@/components/ui/button";
import { ArrowRight, Users, Building, Briefcase, User } from "lucide-react";

const userTypes = [
  { icon: User, label: "Individuals" },
  { icon: Briefcase, label: "Freelancers" },
  { icon: Building, label: "SMEs" },
  { icon: Users, label: "Corporations" },
];

export function CTA() {
  return (
    <section className="py-20 md:py-28 bg-background">
      <div className="container">
        <div className="relative max-w-4xl mx-auto">
          {/* Background Card */}
          <div className="absolute inset-0 bg-gradient-to-br from-secondary/10 via-accent/5 to-secondary/10 rounded-3xl" />

          {/* Content */}
          <div className="relative bg-card border-2 border-border rounded-3xl p-8 md:p-12 text-center shadow-xl">
            {/* User Type Pills */}
            <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
              {userTypes.map((type, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 bg-muted px-4 py-2 rounded-full"
                >
                  <type.icon className="h-4 w-4 text-secondary" />
                  <span className="text-sm font-medium text-foreground">
                    {type.label}
                  </span>
                </div>
              ))}
            </div>

            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Ready to Simplify Your Tax Compliance?
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
              Join thousands of Nigerians who trust Buoyance for accurate, 
              compliant, and stress-free tax management.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button variant="accent" size="xl">
                Get Started Free
                <ArrowRight className="h-5 w-5" />
              </Button>
              <Button variant="outline" size="lg">
                Contact Sales
              </Button>
            </div>

            {/* Trust Note */}
            <p className="mt-8 text-xs text-muted-foreground">
              No credit card required • Free tax estimations • Cancel anytime
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
