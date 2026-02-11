import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { formatKoboToNgn, stringToKobo, formatKoboToNgnPlain } from "@/lib/money";
import { TrendingUp } from "lucide-react";

interface Income {
  date: string;
  amount_kobo: string;
}

interface Expense {
  date: string;
  amount_kobo: string;
}

interface MonthlyPerformanceChartProps {
  incomes: Income[];
  expenses: Expense[];
}

export function MonthlyPerformanceChart({ incomes, expenses }: MonthlyPerformanceChartProps) {
  const chartData = useMemo(() => {
    // Get last 6 months
    const months: { [key: string]: { income: bigint; expense: bigint } } = {};
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months[key] = { income: 0n, expense: 0n };
    }

    // Aggregate incomes
    incomes.forEach(inc => {
      const date = new Date(inc.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (months[key]) {
        months[key].income += stringToKobo(inc.amount_kobo);
      }
    });

    // Aggregate expenses
    expenses.forEach(exp => {
      const date = new Date(exp.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (months[key]) {
        months[key].expense += stringToKobo(exp.amount_kobo);
      }
    });

    return Object.entries(months).map(([key, data]) => {
      const [year, month] = key.split('-');
      const monthName = new Date(parseInt(year), parseInt(month) - 1, 1)
        .toLocaleDateString('en-GB', { month: 'short' });
      return {
        month: monthName,
        income: Number(data.income) / 100,
        expense: Number(data.expense) / 100,
        net: Number(data.income - data.expense) / 100,
      };
    });
  }, [incomes, expenses]);

  const totalIncome = useMemo(() => 
    incomes.reduce((sum, inc) => sum + stringToKobo(inc.amount_kobo), 0n),
    [incomes]
  );

  const totalExpenses = useMemo(() => 
    expenses.reduce((sum, exp) => sum + stringToKobo(exp.amount_kobo), 0n),
    [expenses]
  );

  const netProfit = totalIncome - totalExpenses;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Monthly Performance
        </CardTitle>
        <CardDescription>Income vs Expenses (Last 6 months)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis 
                tick={{ fontSize: 10 }}
                tickFormatter={(value) => `₦${(value / 1000).toFixed(0)}k`}
                className="text-muted-foreground"
              />
              <Tooltip 
                formatter={(value: number) => [`₦${value.toLocaleString('en-NG')}`, '']}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Bar 
                dataKey="income" 
                name="Income" 
                fill="hsl(var(--secondary))" 
                radius={[4, 4, 0, 0]} 
              />
              <Bar 
                dataKey="expense" 
                name="Expenses" 
                fill="hsl(var(--destructive))" 
                radius={[4, 4, 0, 0]} 
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 p-3 rounded-lg bg-muted/50 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Net Profit/Loss:</span>
          <span className={`text-lg font-mono font-bold ${netProfit >= 0n ? 'text-secondary' : 'text-destructive'}`}>
            {formatKoboToNgn(netProfit)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
