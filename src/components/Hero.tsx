import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, CheckCircle, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { scrollToId } from "@/components/ScrollToHash";

export function Hero() {
  const navigate = useNavigate();

  const handleStartCalculation = () => {
    const calculatorSection = document.getElementById("calculator");
    if (calculatorSection) {
      scrollToId("calculator");
    } else {
      navigate("/#calculator");
    }
  };

  const handleLearnMore = () => {
    const featuresSection = document.getElementById("features");
    if (featuresSection) {
      scrollToId("features");
    } else {
      navigate("/#features");
    }
  };

  return (
    <section className="relative bg-gradient-hero min-h-screen flex items-center pt-20 md:pt-24 overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--primary-foreground)) 1px, transparent 0)`,
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      {/* Glow Effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/15 rounded-full blur-3xl" />

      <div className="container relative z-10 py-12 md:py-20">
        <div className="max-w-4xl mx-auto text-center">
          {/* Trust Badge */}
          <div className="inline-flex items-center gap-2 bg-primary-foreground/10 backdrop-blur-sm border border-primary-foreground/20 rounded-full px-4 py-2 mb-8 animate-fade-in">
            <Shield className="h-4 w-4 text-secondary" />
            <span className="text-primary-foreground/90 text-sm font-medium">
              NRS Compliant • AES-256 Encrypted
            </span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground leading-tight mb-6 animate-slide-up">
            Nigeria's Most Trusted Platform for{" "}
            <span className="text-accent">Tax Compliance</span> and{" "}
            <span className="text-secondary">Financial Intelligence</span>
          </h1>

          {/* Sub-headline */}
          <p
            className="text-lg md:text-xl text-primary-foreground/80 max-w-2xl mx-auto mb-8 animate-slide-up"
            style={{ animationDelay: "0.1s" }}
          >
            Deterministic tax calculations and intelligent optimization for individuals, 
            freelancers, and SMEs under the{" "}
            <span className="text-primary-foreground font-semibold">Nigeria Tax Act 2025</span>
          </p>

          {/* CTA Buttons */}
          <div
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12 animate-slide-up"
            style={{ animationDelay: "0.2s" }}
          >
            <Button 
              variant="hero" 
              size="xl" 
              className="w-full sm:w-auto"
              onClick={handleStartCalculation}
            >
              Start Free Calculation
              <ArrowRight className="h-5 w-5" />
            </Button>
            <Button 
              variant="outline-light" 
              size="lg" 
              className="w-full sm:w-auto"
              onClick={handleLearnMore}
            >
              Learn More
            </Button>
          </div>

          {/* Feature Pills */}
          <div
            className="flex flex-wrap items-center justify-center gap-4 md:gap-6 animate-fade-in"
            style={{ animationDelay: "0.3s" }}
          >
            <div className="flex items-center gap-2 text-primary-foreground/80">
              <CheckCircle className="h-5 w-5 text-secondary" />
              <span className="text-sm font-medium">Legally Grounded</span>
            </div>
            <div className="flex items-center gap-2 text-primary-foreground/80">
              <CheckCircle className="h-5 w-5 text-secondary" />
              <span className="text-sm font-medium">Explainable Results</span>
            </div>
            <div className="flex items-center gap-2 text-primary-foreground/80">
              <Zap className="h-5 w-5 text-accent" />
              <span className="text-sm font-medium">Instant Calculations</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg
          viewBox="0 0 1440 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-auto"
          preserveAspectRatio="none"
        >
          <path
            d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
            fill="hsl(var(--background))"
          />
        </svg>
      </div>
    </section>
  );
}
