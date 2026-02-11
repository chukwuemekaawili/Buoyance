import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  ChevronRight, 
  Shield,
  Loader2,
} from "lucide-react";
import { 
  generateComplianceAlerts, 
  type ComplianceAlert, 
  type AlertLevel 
} from "@/lib/complianceMonitor";
import { cn } from "@/lib/utils";

interface ComplianceAlertsProps {
  className?: string;
}

const levelConfig: Record<AlertLevel, { 
  icon: typeof AlertTriangle; 
  color: string; 
  bgColor: string;
  label: string;
}> = {
  critical: { 
    icon: AlertCircle, 
    color: "text-destructive", 
    bgColor: "bg-destructive/10 border-destructive/20",
    label: "Critical"
  },
  warning: { 
    icon: AlertTriangle, 
    color: "text-amber-500", 
    bgColor: "bg-amber-500/10 border-amber-500/20",
    label: "Warning"
  },
  info: { 
    icon: Info, 
    color: "text-blue-500", 
    bgColor: "bg-blue-500/10 border-blue-500/20",
    label: "Info"
  },
};

export function ComplianceAlerts({ className }: ComplianceAlertsProps) {
  const [alerts, setAlerts] = useState<ComplianceAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    setLoading(true);
    const data = await generateComplianceAlerts();
    setAlerts(data);
    setLoading(false);
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Compliance Alerts</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Compliance Alerts</CardTitle>
          </div>
          {alerts.length > 0 && (
            <Badge variant="outline" className={cn(
              alerts.some(a => a.level === "critical") 
                ? "bg-destructive/10 text-destructive border-destructive/20"
                : "bg-amber-500/10 text-amber-600 border-amber-500/20"
            )}>
              {alerts.length} alert{alerts.length > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
        <CardDescription>
          {alerts.length === 0 
            ? "No compliance issues detected"
            : "Items requiring your attention"
          }
        </CardDescription>
      </CardHeader>

      <CardContent>
        {alerts.length === 0 ? (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-success/10 border border-success/20">
            <Shield className="h-5 w-5 text-success" />
            <div>
              <p className="font-medium text-success">All Clear</p>
              <p className="text-sm text-muted-foreground">
                Your tax filings and payments are up to date.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.slice(0, 5).map((alert) => {
              const config = levelConfig[alert.level];
              const Icon = config.icon;

              return (
                <div
                  key={alert.id}
                  className={cn(
                    "p-3 rounded-lg border transition-colors",
                    config.bgColor
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Icon className={cn("h-5 w-5 mt-0.5 flex-shrink-0", config.color)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm">{alert.title}</p>
                        <Badge variant="outline" className={cn("text-xs", config.color)}>
                          {config.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {alert.message}
                      </p>
                    </div>
                    {alert.actionPath && (
                      <Link to={alert.actionPath}>
                        <Button variant="ghost" size="sm" className="flex-shrink-0">
                          {alert.actionLabel || "View"}
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}

            {alerts.length > 5 && (
              <p className="text-sm text-center text-muted-foreground pt-2">
                +{alerts.length - 5} more alert{alerts.length - 5 > 1 ? "s" : ""}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
