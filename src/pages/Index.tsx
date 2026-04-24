import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { TrustSection } from "@/components/TrustSection";
import { CTA } from "@/components/CTA";
import { Footer } from "@/components/Footer";
import { Loader2 } from "lucide-react";
import { lazy, Suspense } from "react";

const CalculatorSection = lazy(() =>
  import("@/components/CalculatorSection").then((module) => ({ default: module.CalculatorSection }))
);
const ContactSection = lazy(() =>
  import("@/components/ContactSection").then((module) => ({ default: module.ContactSection }))
);

function SectionFallback() {
  return (
    <div className="bg-background py-20">
      <div className="container">
        <div className="mx-auto h-32 max-w-5xl animate-pulse rounded-[2rem] bg-muted/70" />
      </div>
    </div>
  );
}

const Index = () => {
  const { loading } = useAuth();

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="min-h-screen">
      <Header />
      <Hero />
      <Features />
      <Suspense fallback={<SectionFallback />}>
        <CalculatorSection />
      </Suspense>
      <TrustSection />
      <Suspense fallback={<SectionFallback />}>
        <ContactSection />
      </Suspense>
      <CTA />
      <Footer />
    </main>
  );
};

export default Index;
