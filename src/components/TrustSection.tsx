import { Shield, Lock, MapPin, FileCheck, Award, Server } from "lucide-react";

const trustBadges = [
  {
    icon: Lock,
    title: "AES-256 Encrypted",
    description: "Standard encryption for all data at rest and in transit",
  },
  {
    icon: MapPin,
    title: "Nigerian Data Residency",
    description: "All data stored within Nigerian jurisdiction",
  },
  {
    icon: FileCheck,
    title: "NRS Formatted",
    description: "Outputs structured for manual Nigeria Revenue Service submission",
  },
  {
    icon: Shield,
    title: "Audit-Ready",
    description: "Complete, immutable audit trails for all calculations",
  },
  {
    icon: Server,
    title: "99.9% Uptime",
    description: "Enterprise-grade reliability and availability",
  },
  {
    icon: Award,
    title: "Legal Validation",
    description: "Tax logic verified against current legislation",
  },
];

export function TrustSection() {
  return (
    <section id="compliance" className="py-20 md:py-28 bg-neutral-50">
      <div className="container">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <span className="inline-block text-primary font-semibold text-sm tracking-wide uppercase mb-4">
            Security & Compliance
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Built on Trust, Secured by Design
          </h2>
          <p className="text-lg text-muted-foreground">
            Enterprise-grade security and regulatory compliance at every layer.
            Your financial data deserves the highest protection.
          </p>
        </div>

        {/* Trust Badges Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {trustBadges.map((badge, index) => (
            <div
              key={index}
              className="bg-white border border-border rounded-xl p-6 hover:shadow-md hover:-translate-y-1 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <badge.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">
                {badge.title}
              </h3>
              <p className="text-muted-foreground text-sm">
                {badge.description}
              </p>
            </div>
          ))}
        </div>

        {/* Certification Logos */}
        <div className="mt-16 pt-12 border-t border-border">
          <p className="text-center text-muted-foreground text-sm mb-8">
            Regulatory Framework
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold font-mono text-foreground">NTA 2025</div>
              <div className="text-xs text-muted-foreground mt-1">Nigeria Tax Act</div>
            </div>
            <div className="w-px h-12 bg-border hidden md:block" />
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-foreground">NTAA 2025</div>
              <div className="text-xs text-muted-foreground mt-1">Tax Administration Act</div>
            </div>
            <div className="w-px h-12 bg-border hidden md:block" />
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold font-mono text-primary">NRS</div>
              <div className="text-xs text-muted-foreground mt-1">Nigeria Revenue Service</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
