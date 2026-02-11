import { PageLayout } from "@/components/layout/PageLayout";
import { SimplePageHero } from "@/components/layout/SimplePageHero";
import { ContentSection } from "@/components/layout/ContentSection";
import { Shield, Lock, MapPin, FileCheck, AlertTriangle, CheckCircle2 } from "lucide-react";

const complianceAreas = [
  {
    icon: FileCheck,
    title: "Nigeria Tax Act 2025 Aligned",
    description: "All tax calculations are based exclusively on the provisions of the Nigeria Tax Act 2025 and NTAA 2025, ensuring legal accuracy and compliance.",
  },
  {
    icon: Shield,
    title: "NRS Integration Ready",
    description: "Our platform is designed to integrate with Nigeria Revenue Service systems for seamless tax filing and compliance verification.",
  },
  {
    icon: Lock,
    title: "AES-256 Encryption",
    description: "All sensitive data is encrypted at rest and in transit using AES-256 encryption, the gold standard for financial data protection.",
  },
  {
    icon: MapPin,
    title: "Nigerian Data Residency",
    description: "All personal and financial data is stored exclusively within certified data centers in Nigeria, ensuring compliance with data localization requirements.",
  },
];

const securityMeasures = [
  "End-to-end encryption for all data transmissions",
  "Multi-factor authentication for account access",
  "Regular third-party security audits and penetration testing",
  "Secure API endpoints with rate limiting and monitoring",
  "Role-based access controls for internal teams",
  "Automated threat detection and response systems",
  "Disaster recovery with geo-redundant backups",
  "Continuous compliance monitoring and reporting",
];

export default function Compliance() {
  return (
    <PageLayout>
      <SimplePageHero
        title="Compliance & Security"
        description="Built with regulatory compliance and data security at its core. Your trust is our foundation."
      />

      <ContentSection>
        <div className="prose prose-lg max-w-none mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-4">Our Commitment to Compliance</h2>
          <p className="text-muted-foreground">
            Buoyance is designed from the ground up to meet the highest standards of regulatory compliance 
            and data security. We understand that tax and financial data is highly sensitive, and we take 
            our responsibility to protect it seriously.
          </p>
        </div>

        {/* Compliance Areas Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-16">
          {complianceAreas.map((area) => (
            <div
              key={area.title}
              className="bg-card rounded-xl p-6 border border-border"
            >
              <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center mb-4">
                <area.icon className="h-6 w-6 text-secondary" />
              </div>
              <h3 className="text-lg font-semibold text-card-foreground mb-2">{area.title}</h3>
              <p className="text-muted-foreground">{area.description}</p>
            </div>
          ))}
        </div>

        {/* Disclaimer Box */}
        <div className="bg-accent/10 border border-accent/20 rounded-xl p-6 md:p-8 mb-16">
          <div className="flex items-start gap-4">
            <AlertTriangle className="h-6 w-6 text-accent flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-foreground mb-2">Important Notice</h3>
              <p className="text-muted-foreground">
                Buoyance is a tax calculation and compliance tool, not a licensed tax advisory firm. 
                While our platform is aligned with Nigerian tax regulations, we do not claim official 
                government certification or endorsement. All calculations and recommendations should 
                be verified by a qualified tax professional for your specific circumstances.
              </p>
            </div>
          </div>
        </div>

        {/* Security Section */}
        <div className="prose prose-lg max-w-none mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-4">Security Measures</h2>
          <p className="text-muted-foreground">
            We employ industry-leading security measures to protect your data at every level:
          </p>
        </div>

        <div className="bg-card rounded-xl p-6 md:p-8 border border-border mb-16">
          <div className="grid md:grid-cols-2 gap-4">
            {securityMeasures.map((measure) => (
              <div key={measure} className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-secondary flex-shrink-0 mt-0.5" />
                <span className="text-card-foreground">{measure}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Regulatory Framework */}
        <div className="prose prose-lg max-w-none mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-4">Regulatory Framework</h2>
          <p className="text-muted-foreground mb-6">
            Our platform operates within the following regulatory frameworks:
          </p>
        </div>

        <div className="space-y-4 mb-12">
          <div className="bg-muted/50 rounded-lg p-4 border border-border">
            <h4 className="font-semibold text-foreground mb-1">Nigeria Tax Act 2025 (NTA 2025)</h4>
            <p className="text-sm text-muted-foreground">
              Primary legislation governing income tax rates, bands, and filing requirements.
            </p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 border border-border">
            <h4 className="font-semibold text-foreground mb-1">Nigeria Tax Administration Act 2025 (NTAA 2025)</h4>
            <p className="text-sm text-muted-foreground">
              Governs tax administration, compliance procedures, and enforcement mechanisms.
            </p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 border border-border">
            <h4 className="font-semibold text-foreground mb-1">Nigeria Data Protection Regulation (NDPR)</h4>
            <p className="text-sm text-muted-foreground">
              Framework for personal data protection, privacy rights, and data residency requirements.
            </p>
          </div>
        </div>

        {/* Report Concerns */}
        <div className="bg-primary text-primary-foreground rounded-xl p-6 md:p-8">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-2">Report a Security Concern</h3>
              <p className="text-primary-foreground/70">
                If you discover a security vulnerability or have concerns about our compliance practices, 
                please contact our security team immediately.
              </p>
            </div>
            <a
              href="mailto:security@buoyance.ng"
              className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-accent-foreground rounded-lg font-medium hover:bg-accent/90 transition-colors"
            >
              security@buoyance.ng
            </a>
          </div>
        </div>
      </ContentSection>
    </PageLayout>
  );
}
