import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

interface CTABandProps {
  title?: string;
  description?: string;
  primaryText?: string;
  primaryLink?: string;
  secondaryText?: string;
  secondaryLink?: string;
}

export function CTABand({
  title = "Need help with your taxes?",
  description = "Get started with Buoyance today and simplify your tax compliance journey.",
  primaryText = "Get Started",
  primaryLink = "/#calculator",
  secondaryText = "Contact Us",
  secondaryLink = "/contact",
}: CTABandProps) {
  return (
    <section className="bg-muted py-16">
      <div className="container">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            {title}
          </h2>
          <p className="text-muted-foreground mb-8">
            {description}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild variant="accent" size="lg">
              <Link to={primaryLink}>
                {primaryText}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to={secondaryLink}>
                {secondaryText}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
