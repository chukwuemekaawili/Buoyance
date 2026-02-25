import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { CalculatorSection } from "@/components/CalculatorSection";
import { TrustSection } from "@/components/TrustSection";
import { ContactSection } from "@/components/ContactSection";
import { CTA } from "@/components/CTA";
import { Footer } from "@/components/Footer";
import { Loader2 } from "lucide-react";

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
      <CalculatorSection />
      <TrustSection />
      <ContactSection />
      <CTA />
      <Footer />
    </main>
  );
};

export default Index;
