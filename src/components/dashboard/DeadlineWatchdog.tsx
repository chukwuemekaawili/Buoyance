import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Calendar, Clock, Info } from "lucide-react";
import { format, differenceInDays } from "date-fns";

interface Deadline {
  name: string;
  description: string;
  dayOfMonth: number;
  taxType: string;
}

const DEADLINES: Deadline[] = [
  { name: "VAT Filing", description: "Monthly VAT returns", dayOfMonth: 21, taxType: "VAT" },
  { name: "PAYE Remittance", description: "Monthly PAYE to SIRS", dayOfMonth: 10, taxType: "PAYE" },
];

function getNextDeadline(dayOfMonth: number): Date {
  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), dayOfMonth);
  
  if (now <= thisMonth) {
    return thisMonth;
  }
  // Next month
  return new Date(now.getFullYear(), now.getMonth() + 1, dayOfMonth);
}

function getDaysUntil(deadline: Date): number {
  return differenceInDays(deadline, new Date());
}

export function DeadlineWatchdog() {
  const upcomingDeadlines = DEADLINES.map(d => {
    const nextDate = getNextDeadline(d.dayOfMonth);
    const daysUntil = getDaysUntil(nextDate);
    return { ...d, nextDate, daysUntil };
  }).sort((a, b) => a.daysUntil - b.daysUntil);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Deadline Watchdog
        </CardTitle>
        <CardDescription>Upcoming filing and payment deadlines</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {upcomingDeadlines.map(deadline => {
          const isUrgent = deadline.daysUntil <= 7;
          const isWarning = deadline.daysUntil <= 14 && !isUrgent;
          
          return (
            <div 
              key={deadline.name}
              className={`p-3 rounded-lg border flex items-center justify-between ${
                isUrgent 
                  ? 'bg-destructive/10 border-destructive/30' 
                  : isWarning 
                  ? 'bg-amber-500/10 border-amber-500/30'
                  : 'bg-muted/50 border-border'
              }`}
            >
              <div className="flex items-center gap-3">
                {isUrgent ? (
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                ) : (
                  <Calendar className={`h-5 w-5 ${isWarning ? 'text-amber-500' : 'text-muted-foreground'}`} />
                )}
                <div>
                  <p className="font-medium text-sm">{deadline.name}</p>
                  <p className="text-xs text-muted-foreground">{deadline.description}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-mono font-bold ${
                  isUrgent ? 'text-destructive' : isWarning ? 'text-amber-500' : 'text-foreground'
                }`}>
                  {deadline.daysUntil === 0 ? 'Today' : 
                   deadline.daysUntil === 1 ? 'Tomorrow' : 
                   `${deadline.daysUntil} days`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(deadline.nextDate, 'dd/MM/yyyy')}
                </p>
              </div>
            </div>
          );
        })}
        
        <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs">
          <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-muted-foreground">
            Deadlines can vary by jurisdiction. Confirm with your State IRS or FIRS for specific dates.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
