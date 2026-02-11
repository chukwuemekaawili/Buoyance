import { PageLayout } from "@/components/layout/PageLayout";
import { SimplePageHero } from "@/components/layout/SimplePageHero";
import { ContentSection } from "@/components/layout/ContentSection";
import { Shield, Lock, MapPin } from "lucide-react";

export default function Privacy() {
  return (
    <PageLayout>
      <SimplePageHero
        title="Privacy Policy"
        description="How we collect, use, and protect your personal information."
      />

      <ContentSection>
        <div className="prose prose-lg max-w-none">
          <p className="text-sm text-muted-foreground mb-8">Last updated: January 1, 2026</p>

          {/* Trust Badges */}
          <div className="flex flex-wrap gap-4 mb-8">
            <div className="flex items-center gap-2 px-4 py-2 bg-secondary/10 rounded-lg">
              <Lock className="h-4 w-4 text-secondary" />
              <span className="text-sm font-medium text-secondary">AES-256 Encrypted</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-secondary/10 rounded-lg">
              <MapPin className="h-4 w-4 text-secondary" />
              <span className="text-sm font-medium text-secondary">Nigerian Data Residency</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-secondary/10 rounded-lg">
              <Shield className="h-4 w-4 text-secondary" />
              <span className="text-sm font-medium text-secondary">NRS Compliant</span>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">1. Introduction</h2>
          <p className="text-muted-foreground mb-6">
            Buoyance ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy 
            explains how we collect, use, disclose, and safeguard your information when you use our 
            tax compliance and financial intelligence platform.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">2. Information We Collect</h2>
          <h3 className="text-xl font-semibold text-foreground mt-6 mb-3">Personal Information</h3>
          <p className="text-muted-foreground mb-4">We may collect the following personal information:</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-6">
            <li>Name, email address, and phone number</li>
            <li>Tax Identification Number (TIN)</li>
            <li>Income and financial data provided for tax calculations</li>
            <li>Employment information</li>
            <li>Bank account details (for payment processing)</li>
          </ul>

          <h3 className="text-xl font-semibold text-foreground mt-6 mb-3">Automatically Collected Information</h3>
          <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-6">
            <li>Device information and browser type</li>
            <li>IP address and location data</li>
            <li>Usage patterns and interaction data</li>
            <li>Cookies and similar tracking technologies</li>
          </ul>

          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">3. How We Use Your Information</h2>
          <p className="text-muted-foreground mb-4">We use collected information to:</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-6">
            <li>Provide accurate tax calculations and compliance services</li>
            <li>Process and submit tax filings on your behalf</li>
            <li>Communicate with you about your account and services</li>
            <li>Improve our platform and develop new features</li>
            <li>Comply with legal obligations and regulatory requirements</li>
            <li>Prevent fraud and enhance security</li>
          </ul>

          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">4. Data Storage & Security</h2>
          <div className="bg-muted/50 rounded-xl p-6 border border-border my-6">
            <div className="flex items-start gap-4">
              <Shield className="h-6 w-6 text-secondary flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-semibold text-foreground mb-2">Nigerian Data Residency</h4>
                <p className="text-muted-foreground">
                  All personal and financial data is stored exclusively within data centers located in Nigeria, 
                  in compliance with Nigerian data protection regulations. We use AES-256 encryption for data 
                  at rest and TLS 1.3 for data in transit.
                </p>
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">5. Data Sharing</h2>
          <p className="text-muted-foreground mb-4">We may share your information with:</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-6">
            <li><strong>Nigeria Revenue Service (NRS):</strong> For tax filing submissions as authorized by you</li>
            <li><strong>Payment Processors:</strong> To process subscription payments securely</li>
            <li><strong>Legal Authorities:</strong> When required by law or legal process</li>
            <li><strong>Service Providers:</strong> Third parties who assist in operating our platform (under strict confidentiality agreements)</li>
          </ul>
          <p className="text-muted-foreground mb-6">
            We do not sell, trade, or rent your personal information to third parties for marketing purposes.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">6. Your Rights</h2>
          <p className="text-muted-foreground mb-4">Under Nigerian data protection law, you have the right to:</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-6">
            <li>Access the personal data we hold about you</li>
            <li>Request correction of inaccurate data</li>
            <li>Request deletion of your data (subject to legal retention requirements)</li>
            <li>Object to processing of your data</li>
            <li>Data portability</li>
            <li>Withdraw consent at any time</li>
          </ul>

          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">7. Data Retention</h2>
          <p className="text-muted-foreground mb-6">
            We retain personal data for as long as necessary to provide our services and comply with legal 
            obligations. Tax-related records are retained for a minimum of six (6) years as required by 
            Nigerian tax law. Upon account deletion, non-essential data is purged within 30 days, while 
            legally required records are anonymized where possible.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">8. Children's Privacy</h2>
          <p className="text-muted-foreground mb-6">
            Our Platform is not intended for individuals under 18 years of age. We do not knowingly collect 
            personal information from children. If you believe we have collected information from a child, 
            please contact us immediately.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">9. Changes to This Policy</h2>
          <p className="text-muted-foreground mb-6">
            We may update this Privacy Policy periodically. We will notify you of any changes by posting 
            the new policy on this page and updating the "Last updated" date. Significant changes will be 
            communicated via email.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">10. Contact Us</h2>
          <p className="text-muted-foreground mb-6">
            For privacy-related inquiries or to exercise your rights, contact our Data Protection Officer at{" "}
            <a href="mailto:privacy@buoyance.ng" className="text-accent hover:underline">privacy@buoyance.ng</a>.
          </p>
        </div>
      </ContentSection>
    </PageLayout>
  );
}
