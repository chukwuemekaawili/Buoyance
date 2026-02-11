import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Lightbulb, 
  TrendingUp, 
  Scale, 
  CheckCircle2, 
  Info,
  Bookmark,
  Percent,
} from "lucide-react";
import { 
  getOptimizationSuggestions, 
  type TaxType, 
  type OptimizationSuggestion 
} from "@/lib/taxOptimizer";
import { cn } from "@/lib/utils";

interface OptimizationOpportunitiesProps {
  taxType: TaxType;
  className?: string;
}

const priorityConfig = {
  high: { label: "High Impact", color: "bg-success/10 text-success border-success/20" },
  medium: { label: "Medium Impact", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  low: { label: "Consider", color: "bg-muted text-muted-foreground" },
};

const categoryIcons: Record<string, typeof Lightbulb> = {
  relief: TrendingUp,
  deduction: Percent,
  exemption: Scale,
  incentive: Lightbulb,
  strategy: Bookmark,
};

export function OptimizationOpportunities({ taxType, className }: OptimizationOpportunitiesProps) {
  const suggestions = useMemo(() => {
    return getOptimizationSuggestions(taxType);
  }, [taxType]);

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <Card className={cn("border-accent/30", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-accent/10">
            <Lightbulb className="h-5 w-5 text-accent" />
          </div>
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              Optimization Opportunities
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>These are suggestions only. They do not change your calculated tax amount. Consult a tax professional before implementation.</p>
                </TooltipContent>
              </Tooltip>
            </CardTitle>
            <CardDescription>
              Ways to potentially reduce your tax liability
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-4">
          <p className="text-sm text-amber-700 dark:text-amber-400">
            <strong>Disclaimer:</strong> These suggestions are for informational purposes only. 
            Actual tax savings depend on your specific circumstances. Consult a qualified tax advisor.
          </p>
        </div>

        <Accordion type="single" collapsible className="space-y-2">
          {suggestions.map((suggestion, index) => {
            const config = priorityConfig[suggestion.priority];
            const CategoryIcon = categoryIcons[suggestion.category] || Lightbulb;

            return (
              <AccordionItem
                key={suggestion.id}
                value={suggestion.id}
                className="border rounded-lg px-4"
              >
                <AccordionTrigger className="hover:no-underline py-3">
                  <div className="flex items-center gap-3 text-left">
                    <CategoryIcon className="h-4 w-4 text-accent flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{suggestion.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className={cn("text-xs", config.color)}>
                          {config.label}
                        </Badge>
                        {suggestion.potentialSavingsPercent && (
                          <span className="text-xs text-muted-foreground">
                            Up to {suggestion.potentialSavingsPercent}% savings
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-4">
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {suggestion.description}
                    </p>

                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        Legal Basis
                      </p>
                      <p className="text-sm">{suggestion.legalBasis}</p>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        Action Steps
                      </p>
                      <ul className="space-y-1.5">
                        {suggestion.actionSteps.map((step, stepIndex) => (
                          <li key={stepIndex} className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                            <span>{step}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
}
