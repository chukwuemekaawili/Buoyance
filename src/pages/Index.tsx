import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, loading, navigate]);

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Only show landing page if not authenticated
  if (user) {
    return null; // Will redirect via useEffect
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
