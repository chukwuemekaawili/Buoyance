import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  FileCheck2,
  FileText,
  LockKeyhole,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { scrollToId } from "@/components/ScrollToHash";
import { usePostHog } from "@posthog/react";

const proofPoints = [
  "Versioned tax rules",
  "Manual filing packs",
  "Audit-ready records",
];

const cockpitRows = [
  { label: "PIT estimate", value: "Ready", tone: "text-secondary" },
  { label: "VAT workpaper", value: "Draft", tone: "text-primary" },
  { label: "TCC evidence", value: "3 gaps", tone: "text-amber-600" },
];

export function Hero() {
  const navigate = useNavigate();
  const posthog = usePostHog();

  const handleStartCalculation = () => {
    posthog.capture("cta_clicked", {
      location: "hero",
      label: "start_free_calculation",
    });
    const calculatorSection = document.getElementById("calculator");
    if (calculatorSection) {
      scrollToId("calculator");
    } else {
      navigate("/#calculator");
    }
  };

  return (
    <section className="relative isolate overflow-hidden bg-gradient-hero pt-24 pb-16 md:pt-32 md:pb-24">
      <div className="absolute inset-0 opacity-[0.14]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.18) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.18) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      </div>
      <div className="absolute left-[-10%] top-24 h-72 w-72 rounded-full bg-accent/15 blur-3xl" />
      <div className="absolute bottom-[-18%] right-[-8%] h-96 w-96 rounded-full bg-white/10 blur-3xl" />

      <div className="container relative z-10">
        <div className="grid items-center gap-12 lg:grid-cols-[1.02fr_0.98fr]">
          <div className="max-w-3xl">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white/85 shadow-lg backdrop-blur-xl">
              <ShieldCheck className="h-4 w-4 text-accent" />
              Built for Nigerian tax teams under NTA 2025
            </div>

            <h1 className="max-w-4xl text-4xl font-bold leading-[0.98] tracking-[-0.055em] text-white sm:text-5xl md:text-6xl xl:text-7xl">
              Tax compliance that feels as calm as closing your books.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-white/74 md:text-xl">
              Buoyance gives Nigerian teams one premium workspace for deterministic
              calculations, filing workpapers, deadline tracking, and explainable audit trails.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button
                variant="hero"
                size="xl"
                className="h-14 rounded-full px-7"
                onClick={handleStartCalculation}
              >
                Start free calculation
                <ArrowRight className="h-5 w-5" />
              </Button>
              <Button
                variant="outline-light"
                size="xl"
                className="h-14 rounded-full px-7"
                asChild
              >
                <Link to="/signup">Create workspace</Link>
              </Button>
            </div>

            <div className="mt-9 grid gap-3 sm:grid-cols-3">
              {proofPoints.map((point) => (
                <div
                  key={point}
                  className="flex items-center gap-2 rounded-2xl border border-white/12 bg-white/[0.07] px-3 py-3 text-sm font-semibold text-white/78 backdrop-blur"
                >
                  <CheckCircle2 className="h-4 w-4 text-accent" />
                  {point}
                </div>
              ))}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
            <div className="absolute -left-8 top-10 hidden h-24 w-24 rounded-full border border-white/15 bg-white/10 backdrop-blur md:block" />
            <div className="premium-card relative overflow-hidden p-4 sm:p-5">
              <div className="rounded-[1.35rem] border border-primary/10 bg-background/95 p-4 shadow-lg">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary/55">
                      Compliance cockpit
                    </p>
                    <h2 className="mt-1 text-2xl font-bold text-foreground">
                      April readiness
                    </h2>
                  </div>
                  <div className="rounded-full bg-secondary/10 px-3 py-1 text-xs font-bold text-secondary">
                    84% clear
                  </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {[
                    { icon: FileText, label: "Workpapers", value: "12" },
                    { icon: CalendarClock, label: "Deadlines", value: "4" },
                    { icon: LockKeyhole, label: "Secured docs", value: "38" },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-2xl border border-border/70 bg-white p-4"
                    >
                      <item.icon className="h-4 w-4 text-primary/70" />
                      <p className="mt-4 font-mono text-2xl font-bold">{item.value}</p>
                      <p className="mt-1 text-xs font-semibold text-muted-foreground">
                        {item.label}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-2xl border border-border/70 bg-white p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="rounded-full bg-primary/10 p-2">
                        <FileCheck2 className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-bold">Filing preparation</p>
                        <p className="text-xs text-muted-foreground">Evidence, portal map, next steps</p>
                      </div>
                    </div>
                    <TrendingUp className="h-5 w-5 text-secondary" />
                  </div>

                  <div className="space-y-3">
                    {cockpitRows.map((row) => (
                      <div key={row.label} className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{row.label}</span>
                        <span className={`text-sm font-bold ${row.tone}`}>{row.value}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full w-[84%] rounded-full bg-gradient-to-r from-secondary to-accent" />
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute -bottom-6 left-6 hidden rounded-2xl border border-white/20 bg-white/90 px-5 py-4 shadow-xl backdrop-blur-xl md:block">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                No black boxes
              </p>
              <p className="mt-1 text-sm font-bold text-foreground">Every result shows its rule path.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
