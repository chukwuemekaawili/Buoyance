/**
 * Interactive Onboarding Tour
 * 
 * Simple centered modal that guides new users through key features.
 * No page navigation or element highlighting — just clean, reliable steps.
 */

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { X, ChevronRight, ChevronLeft, Sparkles, Calculator, FileText, Shield, BarChart3, CheckCircle } from "lucide-react";

interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to Buoyance! 🎉",
    description: "Let's take a quick tour of your tax compliance dashboard. We'll show you the key features that help you stay compliant with the Nigeria Tax Act 2025.",
    icon: Sparkles,
  },
  {
    id: "dashboard",
    title: "Your Dashboard",
    description: "This is your command center. View your tax health score, upcoming deadlines, and recent activity at a glance. Navigate here anytime from the top menu.",
    icon: BarChart3,
  },
  {
    id: "calculators",
    title: "Tax Calculators",
    description: "Calculate PIT, CIT, VAT, WHT, CGT and more. All calculations use versioned tax rules with legal basis tracking for full auditability. Find them under 'Calculators' in the menu.",
    icon: Calculator,
  },
  {
    id: "income-expenses",
    title: "Income & Expenses",
    description: "Record your income and expenses for accurate tax calculations. All records are immutable — corrections create new linked records for a complete audit trail.",
    icon: FileText,
  },
  {
    id: "filings",
    title: "Filings & Payments",
    description: "Prepare your tax filings and track payments. Each filing captures the exact rule version and effective date used. Access them from the 'Filings' menu.",
    icon: Shield,
  },
  {
    id: "complete",
    title: "You're All Set! ✅",
    description: "You're ready to start managing your taxes with confidence. Explore the dashboard, run a tax calculation, or check out the Academy to learn about NTA 2025.",
    icon: CheckCircle,
  },
];

const TOUR_STORAGE_KEY = "buoyance_tour_completed";

interface OnboardingTourProps {
  forceShow?: boolean;
  onComplete?: () => void;
}

export function OnboardingTour({ forceShow = false, onComplete }: OnboardingTourProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // Check if tour should be shown
  useEffect(() => {
    const tourCompleted = localStorage.getItem(TOUR_STORAGE_KEY);
    if (forceShow || !tourCompleted) {
      setIsVisible(true);
    }
  }, [forceShow]);

  const handleNext = useCallback(() => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleComplete();
    }
  }, [currentStep]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const handleComplete = useCallback(() => {
    localStorage.setItem(TOUR_STORAGE_KEY, "true");
    setIsVisible(false);
    onComplete?.();
  }, [onComplete]);

  if (!isVisible) return null;

  const step = TOUR_STEPS[currentStep];
  const progress = ((currentStep + 1) / TOUR_STEPS.length) * 100;
  const Icon = step.icon;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
        onClick={handleComplete}
      />

      {/* Tour Card — always centered */}
      <Card
        className="fixed z-50 w-[420px] max-w-[90vw] shadow-2xl border-2 border-primary/20"
        style={{
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">{step.title}</CardTitle>
                <CardDescription className="text-xs">
                  Step {currentStep + 1} of {TOUR_STEPS.length}
                </CardDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleComplete}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Progress value={progress} className="h-1 mt-3" />
        </CardHeader>
        <CardContent className="pb-4">
          <p className="text-sm text-muted-foreground mb-6">
            {step.description}
          </p>
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleComplete}
              className="text-muted-foreground"
            >
              Skip tour
            </Button>
            <div className="flex gap-2">
              {currentStep > 0 && (
                <Button variant="outline" size="sm" onClick={handlePrevious}>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
              )}
              <Button size="sm" onClick={handleNext}>
                {currentStep === TOUR_STEPS.length - 1 ? (
                  "Finish"
                ) : (
                  <>
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

/**
 * Hook to control the onboarding tour
 */
export function useOnboardingTour() {
  const [showTour, setShowTour] = useState(false);

  const startTour = () => {
    localStorage.removeItem(TOUR_STORAGE_KEY);
    setShowTour(true);
  };

  const resetTour = () => {
    localStorage.removeItem(TOUR_STORAGE_KEY);
  };

  const isTourCompleted = () => {
    return localStorage.getItem(TOUR_STORAGE_KEY) === "true";
  };

  return { showTour, setShowTour, startTour, resetTour, isTourCompleted };
}
