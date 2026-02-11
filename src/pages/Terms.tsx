import { PageLayout } from "@/components/layout/PageLayout";
import { SimplePageHero } from "@/components/layout/SimplePageHero";
import { ContentSection } from "@/components/layout/ContentSection";

export default function Terms() {
  return (
    <PageLayout>
      <SimplePageHero
        title="Terms of Service"
        description="Please read these terms carefully before using the Buoyance platform."
      />

      <ContentSection>
        <div className="prose prose-lg max-w-none">
          <p className="text-sm text-muted-foreground mb-8">Last updated: January 1, 2026</p>

          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">1. Agreement to Terms</h2>
          <p className="text-muted-foreground mb-6">
            By accessing or using Buoyance ("the Platform"), you agree to be bound by these Terms of Service 
            ("Terms"). If you disagree with any part of these terms, you may not access the Platform.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">2. Description of Service</h2>
          <p className="text-muted-foreground mb-6">
            Buoyance provides tax calculation, compliance tools, and financial intelligence services 
            designed for individuals, freelancers, and small-to-medium enterprises operating in Nigeria. 
            Our calculations are based on the Nigeria Tax Act 2025 and related regulations.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">3. User Accounts</h2>
          <p className="text-muted-foreground mb-4">When you create an account with us, you must:</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-6">
            <li>Provide accurate, complete, and current information</li>
            <li>Maintain the security of your password and account</li>
            <li>Accept responsibility for all activities under your account</li>
            <li>Notify us immediately of any unauthorized access</li>
          </ul>

          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">4. Acceptable Use</h2>
          <p className="text-muted-foreground mb-4">You agree not to:</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-6">
            <li>Use the Platform for any unlawful purpose or tax evasion</li>
            <li>Attempt to gain unauthorized access to any part of the Platform</li>
            <li>Interfere with or disrupt the Platform's infrastructure</li>
            <li>Upload malicious code or engage in data mining without authorization</li>
            <li>Impersonate any person or entity</li>
          </ul>

          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">5. Intellectual Property</h2>
          <p className="text-muted-foreground mb-6">
            The Platform and its original content, features, and functionality are owned by Buoyance 
            and are protected by international copyright, trademark, patent, trade secret, and other 
            intellectual property laws.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">6. Tax Calculation Disclaimer</h2>
          <div className="bg-muted/50 rounded-xl p-6 border border-border my-6">
            <p className="text-muted-foreground">
              <strong className="text-foreground">Important:</strong> All tax calculations, estimates, and 
              recommendations provided by Buoyance are for informational purposes only and do not constitute 
              legal, tax, or financial advice. While we strive for accuracy based on the Nigeria Tax Act 2025, 
              we recommend consulting with a qualified tax professional for advice specific to your situation. 
              Buoyance is not a licensed tax advisor or legal firm.
            </p>
          </div>

          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">7. Limitation of Liability</h2>
          <p className="text-muted-foreground mb-6">
            In no event shall Buoyance, its directors, employees, partners, or affiliates be liable for 
            any indirect, incidental, special, consequential, or punitive damages, including loss of profits, 
            data, or other intangible losses, resulting from your use of the Platform or reliance on tax 
            calculations provided.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">8. Data Protection</h2>
          <p className="text-muted-foreground mb-6">
            Your use of the Platform is also governed by our Privacy Policy. By using Buoyance, you consent 
            to the collection and use of your information as described therein. All data is stored within 
            Nigeria in compliance with Nigerian data residency requirements.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">9. Modifications to Service</h2>
          <p className="text-muted-foreground mb-6">
            We reserve the right to modify or discontinue, temporarily or permanently, the Platform or any 
            features thereof without prior notice. We shall not be liable to you or any third party for 
            any modification, suspension, or discontinuance of the Platform.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">10. Governing Law</h2>
          <p className="text-muted-foreground mb-6">
            These Terms shall be governed by and construed in accordance with the laws of the Federal 
            Republic of Nigeria, without regard to its conflict of law provisions. Any disputes arising 
            from these Terms shall be resolved in the courts of Lagos State, Nigeria.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">11. Contact Us</h2>
          <p className="text-muted-foreground mb-6">
            If you have any questions about these Terms, please contact us at{" "}
            <a href="mailto:legal@buoyance.ng" className="text-accent hover:underline">legal@buoyance.ng</a>.
          </p>
        </div>
      </ContentSection>
    </PageLayout>
  );
}
