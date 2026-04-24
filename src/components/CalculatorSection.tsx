import { TaxCalculator } from "./TaxCalculator";
import { BadgeCheck, CheckCircle2, ShieldCheck } from "lucide-react";

const highlights = [
  "Progressive PIT bands under NTA 2025",
  "Deterministic calculation path",
  "Effective tax rate and monthly view",
  "Saveable records for signed-in users",
];

const bands = [
  ["First ₦800K", "0%"],
  ["Next ₦2.2M", "15%"],
  ["Next ₦9M", "18%"],
  ["Next ₦13M", "21%"],
  ["Next ₦25M", "23%"],
  ["Above ₦50M", "25%"],
];

export function CalculatorSection() {
  return (
    <section id="calculator" className="relative overflow-hidden bg-gradient-surface py-20 md:py-28">
      <div className="absolute left-0 top-0 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
      <div className="container relative z-10">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="section-eyebrow">Interactive proof</p>
            <h2 className="mt-4 max-w-xl text-3xl font-bold leading-tight text-foreground md:text-5xl">
              Let users feel the product before they sign up.
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-8 text-muted-foreground">
              The estimator is the fastest conversion moment on the site. It proves
              Buoyance can calculate clearly, show assumptions, and keep the experience calm.
            </p>

            <div className="mt-8 space-y-3">
              {highlights.map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-secondary" />
                  <span className="font-semibold text-foreground">{item}</span>
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-[1.5rem] border border-primary/10 bg-white/75 p-5 shadow-lg backdrop-blur">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-2xl bg-primary/10 p-2">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold">2026 tax bands reference</h3>
                  <p className="text-sm text-muted-foreground">Shown before the calculation, not hidden after it.</p>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {bands.map(([label, rate]) => (
                  <div key={label} className="flex justify-between rounded-xl bg-muted/55 px-3 py-2 text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-mono font-bold text-primary">{rate}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-start gap-2 rounded-xl bg-secondary/10 p-3 text-sm text-secondary">
                <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="font-semibold">Keep the public calculator fast, focused, and confidence-building.</span>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -right-4 -top-4 h-28 w-28 rounded-full bg-accent/30 blur-2xl" />
            <TaxCalculator />
          </div>
        </div>
      </div>
    </section>
  );
}
