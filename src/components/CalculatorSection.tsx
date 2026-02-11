import { TaxCalculator } from "./TaxCalculator";
import { CheckCircle } from "lucide-react";
import { RequireConsent } from "./RequireConsent";

const highlights = [
  "Progressive tax bands per NTA 2025",
  "Instant, deterministic calculations",
  "Rule-by-rule breakdown",
  "Effective tax rate display",
];

export function CalculatorSection() {
  return (
    <section
      id="calculator"
      className="py-20 md:py-28 bg-gradient-surface relative overflow-hidden"
    >
      {/* Background Decoration */}
      <div className="absolute top-0 right-0 w-1/3 h-full bg-secondary/5 -skew-x-12 transform translate-x-1/4" />

      <div className="container relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div>
            <span className="inline-block text-accent font-semibold text-sm tracking-wide uppercase mb-4">
              Interactive Tool
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              2026 Personal Income Tax Estimator
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Calculate your tax liability under the new Nigeria Tax Act 2025. 
              Our engine uses deterministic logic—no approximations, no AI guesses, 
              just legally accurate calculations.
            </p>

            {/* Highlights */}
            <div className="space-y-3">
              {highlights.map((item, index) => (
                <div key={index} className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-secondary flex-shrink-0" />
                  <span className="text-foreground font-medium">{item}</span>
                </div>
              ))}
            </div>

            {/* Tax Bands Reference */}
            <div className="mt-8 p-4 bg-card rounded-xl border border-border">
              <h4 className="font-semibold text-foreground text-sm mb-3">
                2026 Tax Bands (NTA 2025)
              </h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">First ₦800K</span>
                  <span className="font-mono font-semibold text-secondary">0%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Next ₦2.2M</span>
                  <span className="font-mono font-semibold">15%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Next ₦9M</span>
                  <span className="font-mono font-semibold">18%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Next ₦13M</span>
                  <span className="font-mono font-semibold">21%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Next ₦25M</span>
                  <span className="font-mono font-semibold">23%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Above ₦50M</span>
                  <span className="font-mono font-semibold">25%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Calculator - Requires consent to use */}
          <div>
            <RequireConsent
              fallback={
                <div className="p-8 bg-card rounded-xl border border-border text-center">
                  <p className="text-muted-foreground">
                    Please accept our terms to use the calculator.
                  </p>
                </div>
              }
            >
              <TaxCalculator />
            </RequireConsent>
          </div>
        </div>
      </div>
    </section>
  );
}
