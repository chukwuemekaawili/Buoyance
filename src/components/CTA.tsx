import { Button } from "@/components/ui/button";
import { ArrowRight, Building2, Calculator, ShieldCheck, Users } from "lucide-react";
import { Link } from "react-router-dom";

const userTypes = [
  { icon: Users, label: "Founders" },
  { icon: Building2, label: "SMEs" },
  { icon: Calculator, label: "Accountants" },
  { icon: ShieldCheck, label: "Finance teams" },
];

export function CTA() {
  return (
    <section className="bg-background px-4 py-20 md:py-28">
      <div className="container">
        <div className="ink-surface relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] p-8 text-center text-white shadow-xl md:p-14">
          <div className="absolute left-1/2 top-0 h-32 w-2/3 -translate-x-1/2 rounded-full bg-accent/15 blur-3xl" />

          <div className="relative">
            <div className="mb-8 flex flex-wrap items-center justify-center gap-3">
              {userTypes.map((type) => (
                <div
                  key={type.label}
                  className="flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-4 py-2 text-sm font-semibold text-white/78"
                >
                  <type.icon className="h-4 w-4 text-accent" />
                  {type.label}
                </div>
              ))}
            </div>

            <h2 className="mx-auto max-w-3xl text-3xl font-bold leading-tight md:text-5xl">
              Give your tax workflow the polish your business already deserves.
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-white/72">
              Start with a free calculation. Keep the record, generate workpapers,
              and graduate into a full compliance workspace when the team is ready.
            </p>

            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button variant="hero" size="xl" className="rounded-full px-8" asChild>
                <Link to="/signup">
                  Create free workspace
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button variant="outline-light" size="xl" className="rounded-full px-8" asChild>
                <Link to="/support">Talk to support</Link>
              </Button>
            </div>

            <p className="mt-8 text-xs font-semibold uppercase tracking-[0.22em] text-white/42">
              No credit card required. Conservative claims. Review before filing.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
