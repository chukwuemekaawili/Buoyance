import {
  ArrowRight,
  BadgeCheck,
  Calculator,
  CalendarDays,
  FileArchive,
  FileCheck2,
  GitBranch,
  LockKeyhole,
  Scale,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";

const pillars = [
  {
    icon: Calculator,
    title: "Calculate with versioned rules",
    description:
      "Run PIT, VAT, and CGT estimates with deterministic logic, visible assumptions, and saved calculation history.",
    detail: "Shared tax helpers reduce drift across calculators and filing workpapers.",
  },
  {
    icon: FileCheck2,
    title: "Prepare filing workpapers",
    description:
      "Turn inputs into exportable filing packs, portal field maps, and handoff checklists for manual submission.",
    detail: "Designed for TaxPro Max and state IRS workflows where direct filing is not yet automated.",
  },
  {
    icon: CalendarDays,
    title: "Track compliance posture",
    description:
      "Monitor deadlines, payments, TCC readiness, WHT credits, and evidence gaps from one workspace.",
    detail: "Risk narratives explain what needs attention before the period closes.",
  },
];

const workflow = [
  "Import records",
  "Review assumptions",
  "Generate workpapers",
  "Track deadlines",
];

const proofMetrics = [
  { label: "Rule path", value: "Visible" },
  { label: "Filing mode", value: "Manual-first" },
  { label: "Evidence", value: "Linked" },
];

export function Features() {
  return (
    <section id="features" className="relative overflow-hidden bg-background py-20 md:py-28">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      <div className="container">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <p className="section-eyebrow">Product system</p>
          <h2 className="mt-4 text-3xl font-bold leading-tight text-foreground md:text-5xl">
            Less tax chaos. More operational control.
          </h2>
          <p className="mt-5 text-lg leading-8 text-muted-foreground">
            Buoyance is not just a calculator grid. It is the operating layer between your
            records, the tax rulebook, and the manual filing reality Nigerian teams still face.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {pillars.map((pillar, index) => (
            <article
              key={pillar.title}
              className={`premium-card group p-6 transition duration-300 hover:-translate-y-1 ${
                index === 1 ? "lg:translate-y-8" : ""
              }`}
            >
              <div className="mb-8 flex items-center justify-between">
                <div className="rounded-2xl bg-primary/10 p-3">
                  <pillar.icon className="h-6 w-6 text-primary" />
                </div>
                <span className="font-mono text-xs font-bold text-muted-foreground">
                  0{index + 1}
                </span>
              </div>
              <h3 className="text-2xl font-bold leading-tight">{pillar.title}</h3>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">{pillar.description}</p>
              <div className="mt-6 rounded-2xl border border-border/70 bg-muted/45 p-4">
                <p className="text-sm font-semibold text-foreground">{pillar.detail}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-24 grid gap-8 rounded-[2rem] border border-primary/10 bg-white/70 p-5 shadow-xl backdrop-blur-xl lg:grid-cols-[0.95fr_1.05fr] lg:p-8">
          <div className="ink-surface overflow-hidden rounded-[1.5rem] p-6 text-white">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              <span className="text-sm font-bold uppercase tracking-[0.2em] text-white/65">
                Premium workflow
              </span>
            </div>
            <h3 className="mt-6 text-3xl font-bold leading-tight md:text-4xl">
              One clear path from messy records to filing-ready evidence.
            </h3>
            <div className="mt-8 space-y-3">
              {workflow.map((step, index) => (
                <div
                  key={step}
                  className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/8 p-4"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground">
                    {index + 1}
                  </span>
                  <span className="font-semibold text-white/86">{step}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid content-between gap-6 p-2 lg:p-4">
            <div>
              <p className="section-eyebrow">Why it feels safer</p>
              <h3 className="mt-3 text-3xl font-bold leading-tight">
                Buoyance shows its work before you trust its output.
              </h3>
              <p className="mt-4 leading-8 text-muted-foreground">
                Premium compliance software should not ask users to believe a magic answer.
                It should make the calculation, source assumption, document, and next action easy to inspect.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {proofMetrics.map((metric) => (
                <div key={metric.label} className="rounded-2xl border border-border/70 bg-card p-4">
                  <p className="font-mono text-xl font-bold text-primary">{metric.value}</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    {metric.label}
                  </p>
                </div>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { icon: GitBranch, label: "Versioned rule history" },
                { icon: LockKeyhole, label: "Controlled document access" },
                { icon: FileArchive, label: "Evidence-linked records" },
                { icon: BadgeCheck, label: "Review-state labels" },
                { icon: Scale, label: "Professional handoff notes" },
                { icon: ShieldCheck, label: "Conservative compliance claims" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3 rounded-2xl bg-muted/50 px-4 py-3">
                  <item.icon className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold">{item.label}</span>
                </div>
              ))}
            </div>

            <Link
              to="/calculators"
              className="group inline-flex w-fit items-center gap-2 text-sm font-bold text-primary"
            >
              Explore calculators
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
