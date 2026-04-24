import {
  Archive,
  BadgeCheck,
  FileLock2,
  Fingerprint,
  Landmark,
  Scale,
  ShieldCheck,
  Workflow,
} from "lucide-react";

const trustLayers = [
  {
    icon: Fingerprint,
    title: "Explainable by default",
    description:
      "Calculations expose the rule version, inputs, taxable base, rates, and resulting breakdown instead of hiding behind generic AI language.",
  },
  {
    icon: FileLock2,
    title: "Document access controls",
    description:
      "Evidence workflows are designed around encrypted storage, signed-access patterns, and explicit workspace permissions.",
  },
  {
    icon: Archive,
    title: "Audit-ready history",
    description:
      "Saved calculations, filing activity, and review states create a defensible trail for accountants and business owners.",
  },
  {
    icon: Workflow,
    title: "Manual filing clarity",
    description:
      "Buoyance prepares the pack and handoff steps clearly where authority portals still require human submission.",
  },
];

export function TrustSection() {
  return (
    <section id="compliance" className="relative overflow-hidden bg-gradient-surface py-20 md:py-28">
      <div className="absolute right-0 top-0 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
      <div className="container relative">
        <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
          <div>
            <p className="section-eyebrow">Trust architecture</p>
            <h2 className="mt-4 text-3xl font-bold leading-tight md:text-5xl">
              Proof beats badge theatre.
            </h2>
            <p className="mt-5 text-lg leading-8 text-muted-foreground">
              For tax, premium is not flashy. Premium is knowing what was calculated,
              why it was calculated, what evidence supports it, and what still needs a human review.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "Framework", value: "NTA 2025" },
              { label: "Service posture", value: "Manual-first" },
              { label: "Output style", value: "Explainable" },
            ].map((item) => (
              <div key={item.label} className="premium-card p-5">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  {item.label}
                </p>
                <p className="mt-3 font-mono text-2xl font-bold text-primary">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {trustLayers.map((layer) => (
            <article key={layer.title} className="premium-card p-6">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-primary/10 p-3">
                  <layer.icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">{layer.title}</h3>
                  <p className="mt-3 leading-7 text-muted-foreground">{layer.description}</p>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-10 rounded-[2rem] border border-primary/10 bg-white p-6 shadow-xl md:p-8">
          <div className="grid gap-6 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-center">
            <div className="flex items-center gap-4">
              <ShieldCheck className="h-8 w-8 text-primary" />
              <div>
                <h3 className="font-bold">Tax rules</h3>
                <p className="text-sm text-muted-foreground">Published, versioned, review-aware</p>
              </div>
            </div>
            <div className="hidden h-12 w-px bg-border md:block" />
            <div className="flex items-center gap-4">
              <Landmark className="h-8 w-8 text-primary" />
              <div>
                <h3 className="font-bold">Authority workflows</h3>
                <p className="text-sm text-muted-foreground">FIRS and state IRS handoffs</p>
              </div>
            </div>
            <div className="hidden h-12 w-px bg-border md:block" />
            <div className="flex items-center gap-4">
              <Scale className="h-8 w-8 text-primary" />
              <div>
                <h3 className="font-bold">Professional review</h3>
                <p className="text-sm text-muted-foreground">Clear boundaries before filing</p>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl bg-muted/60 p-4">
            <div className="flex items-start gap-3">
              <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-secondary" />
              <p className="text-sm leading-7 text-muted-foreground">
                Buoyance is strongest when it is honest: live tools are labeled as live,
                review-state surfaces are labeled as review-state, and filing outputs are positioned
                as preparation support until direct authority submission is fully verified.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
