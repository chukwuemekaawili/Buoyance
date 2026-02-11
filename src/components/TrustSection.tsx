import { Shield, Lock, MapPin, FileCheck, Award, Server } from "lucide-react";

const trustBadges = [
  {
    icon: Lock,
    title: "AES-256 Encrypted",
    description: "Bank-grade encryption for all data at rest and in transit",
  },
  {
    icon: MapPin,
    title: "Nigerian Data Residency",
    description: "All data stored within Nigerian jurisdiction",
  },
  {
    icon: FileCheck,
    title: "NRS Compliant",
    description: "Integrated with Nigeria Revenue Service systems",
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
    <section id="compliance" className="py-20 md:py-28 bg-primary">
      <div className="container">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <span className="inline-block text-accent font-semibold text-sm tracking-wide uppercase mb-4">
            Security & Compliance
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
            Built on Trust, Secured by Design
          </h2>
          <p className="text-lg text-primary-foreground/70">
            Enterprise-grade security and regulatory compliance at every layer. 
            Your financial data deserves the highest protection.
          </p>
        </div>

        {/* Trust Badges Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {trustBadges.map((badge, index) => (
            <div
              key={index}
              className="bg-primary-foreground/5 border border-primary-foreground/10 rounded-xl p-6 hover:bg-primary-foreground/10 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center mb-4">
                <badge.icon className="h-6 w-6 text-secondary" />
              </div>
              <h3 className="text-lg font-bold text-primary-foreground mb-2">
                {badge.title}
              </h3>
              <p className="text-primary-foreground/70 text-sm">
                {badge.description}
              </p>
            </div>
          ))}
        </div>

        {/* Certification Logos */}
        <div className="mt-16 pt-12 border-t border-primary-foreground/10">
          <p className="text-center text-primary-foreground/50 text-sm mb-8">
            Regulatory Framework
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-primary-foreground">NTA 2025</div>
              <div className="text-xs text-primary-foreground/50 mt-1">Nigeria Tax Act</div>
            </div>
            <div className="w-px h-12 bg-primary-foreground/20 hidden md:block" />
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-primary-foreground">NTAA 2025</div>
              <div className="text-xs text-primary-foreground/50 mt-1">Tax Administration Act</div>
            </div>
            <div className="w-px h-12 bg-primary-foreground/20 hidden md:block" />
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-secondary">NRS</div>
              <div className="text-xs text-primary-foreground/50 mt-1">Nigeria Revenue Service</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
