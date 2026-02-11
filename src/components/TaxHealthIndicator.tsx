import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Lightbulb,
  Info,
} from "lucide-react";
import {
  calculateTaxHealth,
  getStatusConfig,
  type TaxHealthInput,
  type TaxHealthResult,
  type TaxHealthFactor,
  type ProfileData,
  type FilingData,
  type PaymentData,
  type ActivityData,
} from "@/lib/taxHealthCalculator";
import { cn } from "@/lib/utils";

interface TaxHealthIndicatorProps {
  profile: ProfileData | null;
  filings: FilingData[];
  payments: PaymentData[];
  activity: ActivityData;
  className?: string;
}

function getScoreGradient(score: number): string {
  if (score >= 75) return "from-success to-success/80";
  if (score >= 50) return "from-amber-500 to-amber-400";
  if (score >= 25) return "from-amber-600 to-amber-500";
  return "from-destructive to-destructive/80";
}

function getFactorIcon(impact: TaxHealthFactor["impact"]) {
  switch (impact) {
    case "positive":
      return <TrendingUp className="h-3.5 w-3.5 text-success" />;
    case "negative":
      return <TrendingDown className="h-3.5 w-3.5 text-destructive" />;
    default:
      return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
  }
}

function getStatusIcon(status: TaxHealthResult["status"]) {
  switch (status) {
    case "excellent":
    case "good":
      return <CheckCircle2 className="h-5 w-5 text-success" />;
    case "fair":
      return <AlertTriangle className="h-5 w-5 text-amber-500" />;
    case "needs_attention":
      return <AlertTriangle className="h-5 w-5 text-amber-600" />;
    case "critical":
      return <XCircle className="h-5 w-5 text-destructive" />;
  }
}

export function TaxHealthIndicator({ profile, filings, payments, activity, className }: TaxHealthIndicatorProps) {
  const healthResult = useMemo(() => {
    return calculateTaxHealth({ profile, filings, payments, activity });
  }, [profile, filings, payments, activity]);

  const statusConfig = getStatusConfig(healthResult.status);

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Tax Health Score</CardTitle>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Your Tax Health Score reflects your profile completeness, recent activity, and filing compliance.</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon(healthResult.status)}
            <Badge variant="outline" className={cn(statusConfig.bgColor, statusConfig.color, "border-0")}>
              {healthResult.statusLabel}
            </Badge>
          </div>
        </div>
        <CardDescription>
          Based on your profile, activity, and compliance status
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Score Display */}
        <div className="flex items-center gap-4">
          <div className={cn(
            "relative w-20 h-20 rounded-full flex items-center justify-center",
            "bg-gradient-to-br",
            getScoreGradient(healthResult.score)
          )}>
            <div className="absolute inset-1 rounded-full bg-card flex items-center justify-center">
              <span className="text-2xl font-bold font-mono">{healthResult.score}</span>
            </div>
          </div>
          <div className="flex-1">
            <Progress 
              value={healthResult.score} 
              className="h-3"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Score out of 100
            </p>
          </div>
        </div>

        {/* Factors */}
        {healthResult.factors.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Score Breakdown
            </p>
            <div className="space-y-1.5">
              {healthResult.factors.map((factor) => (
                <div
                  key={factor.name}
                  className="flex items-center justify-between text-sm p-2 rounded-md bg-muted/30"
                >
                  <div className="flex items-center gap-2">
                    {getFactorIcon(factor.impact)}
                    <span className="font-medium">{factor.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{factor.description}</span>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-xs px-1.5 py-0",
                        factor.impact === "positive" ? "text-success border-success/30" :
                        factor.impact === "negative" ? "text-destructive border-destructive/30" :
                        "text-muted-foreground"
                      )}
                    >
                      {factor.score}/{factor.maxScore}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {healthResult.recommendations.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Lightbulb className="h-3 w-3" />
              Recommendations
            </p>
            <ul className="space-y-1">
              {healthResult.recommendations.map((rec, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
