import { PageLayout } from "@/components/layout/PageLayout";
import { SimplePageHero } from "@/components/layout/SimplePageHero";
import { ContentSection } from "@/components/layout/ContentSection";
import { Button } from "@/components/ui/button";
import { Cookie, Settings, BarChart3, Shield } from "lucide-react";

const cookieTypes = [
  {
    icon: Shield,
    title: "Essential Cookies",
    required: true,
    description: "These cookies are necessary for the Platform to function properly. They enable core functionality such as security, authentication, and accessibility. You cannot opt out of essential cookies.",
    examples: ["Session management", "Security tokens", "Load balancing"],
  },
  {
    icon: BarChart3,
    title: "Analytics Cookies",
    required: false,
    description: "These cookies help us understand how visitors interact with our Platform by collecting and reporting information anonymously. This helps us improve our services.",
    examples: ["Page views and navigation paths", "Feature usage patterns", "Error tracking"],
  },
  {
    icon: Settings,
    title: "Functional Cookies",
    required: false,
    description: "These cookies enable enhanced functionality and personalization, such as remembering your preferences and settings.",
    examples: ["Language preferences", "Theme settings", "Calculator defaults"],
  },
];

export default function Cookies() {
  return (
    <PageLayout>
      <SimplePageHero
        title="Cookie Policy"
        description="How we use cookies and similar technologies on the Buoyance platform."
      />

      <ContentSection>
        <div className="prose prose-lg max-w-none">
          <p className="text-sm text-muted-foreground mb-8">Last updated: January 1, 2026</p>

          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">What Are Cookies?</h2>
          <p className="text-muted-foreground mb-6">
            Cookies are small text files placed on your device when you visit a website. They help the 
            website remember information about your visit, making your next visit easier and the site 
            more useful to you. We use cookies and similar technologies to provide, protect, and improve 
            the Buoyance platform.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">Types of Cookies We Use</h2>
        </div>

        <div className="space-y-6 my-8">
          {cookieTypes.map((type) => (
            <div
              key={type.title}
              className="bg-card rounded-xl p-6 border border-border"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <type.icon className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-card-foreground">{type.title}</h3>
                    {type.required && (
                      <span className="px-2 py-0.5 bg-secondary/10 text-secondary text-xs font-medium rounded">
                        Required
                      </span>
                    )}
                  </div>
                  <p className="text-muted-foreground mb-3">{type.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {type.examples.map((example) => (
                      <span key={example} className="px-3 py-1 bg-muted rounded-full text-xs text-muted-foreground">
                        {example}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="prose prose-lg max-w-none">
          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">Third-Party Cookies</h2>
          <p className="text-muted-foreground mb-6">
            Some cookies may be placed by third-party services that appear on our pages. We do not control 
            the use of these cookies and you should check the relevant third party's website for more 
            information. Third parties we work with include:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-6">
            <li><strong>Analytics providers:</strong> To understand platform usage</li>
            <li><strong>Payment processors:</strong> To securely handle transactions</li>
            <li><strong>Customer support tools:</strong> To provide assistance</li>
          </ul>

          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">Managing Your Cookie Preferences</h2>
          <p className="text-muted-foreground mb-6">
            You can control and manage cookies in various ways. Please note that removing or blocking 
            cookies may impact your experience and some functionality may become limited.
          </p>
        </div>

        <div className="bg-muted/50 rounded-xl p-6 md:p-8 border border-border my-8">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <Cookie className="h-8 w-8 text-accent flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-1">Cookie Preferences</h3>
              <p className="text-sm text-muted-foreground">
                Manage which optional cookies you allow on the Buoyance platform.
              </p>
            </div>
            <Button variant="accent">
              Manage Preferences
            </Button>
          </div>
        </div>

        <div className="prose prose-lg max-w-none">
          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">Browser Settings</h2>
          <p className="text-muted-foreground mb-6">
            Most web browsers allow you to control cookies through their settings. You can usually find 
            these settings in the "Options" or "Preferences" menu of your browser. You can also use your 
            browser settings to delete cookies that have already been set.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">Changes to This Policy</h2>
          <p className="text-muted-foreground mb-6">
            We may update this Cookie Policy from time to time to reflect changes in our practices or for 
            other operational, legal, or regulatory reasons. Please revisit this page regularly to stay 
            informed about our use of cookies.
          </p>

          <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">Contact Us</h2>
          <p className="text-muted-foreground mb-6">
            If you have questions about our use of cookies, please contact us at{" "}
            <a href="mailto:privacy@buoyance.ng" className="text-accent hover:underline">privacy@buoyance.ng</a>.
          </p>
        </div>
      </ContentSection>
    </PageLayout>
  );
}
