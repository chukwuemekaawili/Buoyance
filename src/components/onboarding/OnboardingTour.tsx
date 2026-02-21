/**
 * Interactive Onboarding Tour
 * 
 * Guides new users through key features step-by-step using tooltips
 * and highlights on the actual UI elements.
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { X, ChevronRight, ChevronLeft, Sparkles, Calculator, FileText, Shield, BarChart3, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface TourStep {
  id: string;
  title: string;
  description: string;
  targetSelector?: string;
  route?: string;
  icon: React.ElementType;
  position?: "top" | "bottom" | "left" | "right";
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
    description: "This is your command center. View your tax health score, upcoming deadlines, and recent activity at a glance.",
    targetSelector: "[data-tour='dashboard-overview']",
    route: "/dashboard",
    icon: BarChart3,
    position: "bottom",
  },
  {
    id: "calculators",
    title: "Tax Calculators",
    description: "Calculate PIT, CIT, VAT, WHT, CGT and more. All calculations use versioned tax rules with legal basis tracking for full auditability.",
    targetSelector: "[data-tour='calculators']",
    route: "/calculators",
    icon: Calculator,
    position: "bottom",
  },
  {
    id: "income-expenses",
    title: "Income & Expenses",
    description: "Record your income and expenses here. All records are immutable - corrections create new linked records for a complete audit trail.",
    targetSelector: "[data-tour='income-expenses']",
    route: "/incomes",
    icon: FileText,
    position: "bottom",
  },
  {
    id: "filings",
    title: "Filings & Payments",
    description: "Prepare your tax filings and track payments. Each filing captures the exact rule version and effective date used.",
    targetSelector: "[data-tour='filings']",
    route: "/filings",
    icon: Shield,
    position: "bottom",
  },
  {
    id: "complete",
    title: "You're All Set! ✅",
    description: "You're ready to start managing your taxes. Remember: all monetary values are stored in Kobo for precision, and data is retained for 7 years per regulatory requirements.",
    icon: CheckCircle,
  },
];

const TOUR_STORAGE_KEY = "buoyance_tour_completed";
const TOUR_STEP_KEY = "buoyance_tour_step";

interface OnboardingTourProps {
  forceShow?: boolean;
  onComplete?: () => void;
}

export function OnboardingTour({ forceShow = false, onComplete }: OnboardingTourProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightElement, setHighlightElement] = useState<HTMLElement | null>(null);

  // Check if tour should be shown
  useEffect(() => {
    const tourCompleted = localStorage.getItem(TOUR_STORAGE_KEY);
    const savedStep = localStorage.getItem(TOUR_STEP_KEY);

    if (forceShow || (!tourCompleted && savedStep === null)) {
      setIsVisible(true);
      if (savedStep) {
        setCurrentStep(parseInt(savedStep, 10));
      }
    }
  }, [forceShow]);

  // Navigate to step's route if needed, THEN find target element after DOM settles
  useEffect(() => {
    const step = TOUR_STEPS[currentStep];
    if (step.route && location.pathname !== step.route) {
      navigate(step.route);
    }
  }, [currentStep, navigate, location.pathname]);

  // Find and highlight target element (with retry for post-navigation rendering)
  useEffect(() => {
    const step = TOUR_STEPS[currentStep];
    if (!step.targetSelector) {
      setHighlightElement(null);
      return;
    }

    // Try immediately
    const element = document.querySelector(step.targetSelector) as HTMLElement;
    if (element) {
      setHighlightElement(element);
      return;
    }

    // If not found, retry after a short delay (DOM may still be rendering after navigation)
    const timer = setTimeout(() => {
      const retryElement = document.querySelector(step.targetSelector!) as HTMLElement;
      setHighlightElement(retryElement || null); // null = card will center itself
    }, 500);

    return () => clearTimeout(timer);
  }, [currentStep, location.pathname]);

  // Save progress
  useEffect(() => {
    if (isVisible) {
      localStorage.setItem(TOUR_STEP_KEY, currentStep.toString());
    }
  }, [currentStep, isVisible]);

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

  const handleSkip = useCallback(() => {
    handleComplete();
  }, []);

  const handleComplete = useCallback(() => {
    localStorage.setItem(TOUR_STORAGE_KEY, "true");
    localStorage.removeItem(TOUR_STEP_KEY);
    setIsVisible(false);
    onComplete?.();
  }, [onComplete]);

  if (!isVisible) return null;

  const step = TOUR_STEPS[currentStep];
  const progress = ((currentStep + 1) / TOUR_STEPS.length) * 100;
  const Icon = step.icon;

  // Calculate tooltip position based on highlighted element
  const getTooltipPosition = () => {
    if (!highlightElement) {
      return {
        position: "fixed" as const,
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)"
      };
    }

    const rect = highlightElement.getBoundingClientRect();
    const pos = step.position || "bottom";

    switch (pos) {
      case "top":
        return {
          position: "fixed" as const,
          top: `${rect.top - 16}px`,
          left: `${rect.left + rect.width / 2}px`,
          transform: "translate(-50%, -100%)",
        };
      case "bottom":
        return {
          position: "fixed" as const,
          top: `${rect.bottom + 16}px`,
          left: `${rect.left + rect.width / 2}px`,
          transform: "translateX(-50%)",
        };
      case "left":
        return {
          position: "fixed" as const,
          top: `${rect.top + rect.height / 2}px`,
          left: `${rect.left - 16}px`,
          transform: "translate(-100%, -50%)",
        };
      case "right":
        return {
          position: "fixed" as const,
          top: `${rect.top + rect.height / 2}px`,
          left: `${rect.right + 16}px`,
          transform: "translateY(-50%)",
        };
      default:
        return {
          position: "fixed" as const,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        };
    }
  };

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50" />

      {/* Highlight ring around target element */}
      {highlightElement && (
        <div
          className="fixed z-50 ring-4 ring-primary ring-offset-4 ring-offset-background rounded-lg pointer-events-none animate-pulse"
          style={{
            top: highlightElement.getBoundingClientRect().top - 4,
            left: highlightElement.getBoundingClientRect().left - 4,
            width: highlightElement.getBoundingClientRect().width + 8,
            height: highlightElement.getBoundingClientRect().height + 8,
          }}
        />
      )}

      {/* Tour Card */}
      <Card
        className="z-50 w-[400px] max-w-[90vw] shadow-2xl border-2 border-primary/20"
        style={getTooltipPosition()}
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
              onClick={handleSkip}
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
              onClick={handleSkip}
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
    localStorage.removeItem(TOUR_STEP_KEY);
    setShowTour(true);
  };

  const resetTour = () => {
    localStorage.removeItem(TOUR_STORAGE_KEY);
    localStorage.removeItem(TOUR_STEP_KEY);
  };

  const isTourCompleted = () => {
    return localStorage.getItem(TOUR_STORAGE_KEY) === "true";
  };

  return { showTour, setShowTour, startTour, resetTour, isTourCompleted };
}
