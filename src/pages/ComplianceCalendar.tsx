import { useState, useMemo, useEffect } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, AlertTriangle, CheckCircle, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { generateTasksForYear, getTaskPriorityColor, type ComplianceTask } from "@/lib/complianceCalendarService";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function ComplianceCalendarContent() {
    const { user } = useAuth();
    const [year, setYear] = useState(2026);
    const [month, setMonth] = useState(new Date().getMonth());
    const [userType, setUserType] = useState('individual');

    const tasks = useMemo(() =>
        generateTasksForYear(user?.id || 'demo', year, userType),
        [user, year, userType]
    );

    const monthTasks = useMemo(() =>
        tasks.filter(t => {
            const d = new Date(t.due_date);
            return d.getMonth() === month && d.getFullYear() === year;
        }),
        [tasks, month, year]
    );

    const overdueTasks = tasks.filter(t => t.status === 'overdue');
    const upcomingTasks = tasks.filter(t => {
        const d = new Date(t.due_date);
        const now = new Date();
        const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        return diff >= 0 && diff <= 7;
    });

    const { toast } = useToast();
    const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

    // Load completed tasks from Supabase
    useEffect(() => {
        if (!user) return;
        (async () => {
            try {
                const { data, error } = await supabase
                    .from('compliance_tasks' as any)
                    .select('task_key')
                    .eq('user_id', user.id)
                    .eq('status', 'completed');
                if (error) throw error;
                if (data) setCompletedIds(new Set(data.map((d: any) => d.task_key)));
            } catch {
                // Table may not exist yet
            }
        })();
    }, [user]);

    const toggleComplete = async (task: ComplianceTask) => {
        const key = `${task.tax_type}-${task.due_date}`;
        const wasCompleted = completedIds.has(key);

        // Optimistic update
        setCompletedIds(prev => {
            const next = new Set(prev);
            if (wasCompleted) next.delete(key);
            else next.add(key);
            return next;
        });

        // Persist to Supabase
        if (user) {
            try {
                if (wasCompleted) {
                    await supabase.from('compliance_tasks' as any).delete().eq('user_id', user.id).eq('task_key', key);
                } else {
                    await supabase.from('compliance_tasks' as any).upsert({
                        user_id: user.id,
                        task_key: key,
                        tax_type: task.tax_type,
                        title: task.title,
                        due_date: task.due_date,
                        regulator: task.regulator,
                        status: 'completed',
                        completed_at: new Date().toISOString(),
                    }, { onConflict: 'user_id,task_key' });
                }
            } catch (err: any) {
                // Revert on error
                setCompletedIds(prev => {
                    const next = new Set(prev);
                    if (wasCompleted) next.add(key);
                    else next.delete(key);
                    return next;
                });
                toast({ title: "Failed to save", description: err.message, variant: "destructive" });
            }
        }
    };

    // Calendar grid
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const calendarDays: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) calendarDays.push(null);
    for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);

    const getTasksForDay = (day: number) => {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return monthTasks.filter(t => t.due_date === dateStr);
    };

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Header />
            <main className="flex-grow pt-20 md:pt-28 pb-16">
                <div className="container mx-auto px-4 md:px-6 max-w-6xl">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-foreground">Compliance Calendar</h1>
                            <p className="text-muted-foreground mt-2">Never miss a tax deadline. Auto-generated for all regulators.</p>
                        </div>
                        <Select value={userType} onValueChange={setUserType}>
                            <SelectTrigger className="w-40">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="individual">Individual</SelectItem>
                                <SelectItem value="freelancer">Freelancer</SelectItem>
                                <SelectItem value="business">Business</SelectItem>
                                <SelectItem value="sme">SME</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Alert Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                        <Card className="border-red-500/30">
                            <CardHeader className="pb-2">
                                <CardDescription className="flex items-center gap-2 text-red-500">
                                    <AlertTriangle className="h-4 w-4" /> Overdue
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-bold text-red-500">{overdueTasks.length}</p>
                            </CardContent>
                        </Card>
                        <Card className="border-yellow-500/30">
                            <CardHeader className="pb-2">
                                <CardDescription className="flex items-center gap-2 text-yellow-600">
                                    <Clock className="h-4 w-4" /> Due This Week
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-bold text-yellow-600">{upcomingTasks.length}</p>
                            </CardContent>
                        </Card>
                        <Card className="border-green-500/30">
                            <CardHeader className="pb-2">
                                <CardDescription className="flex items-center gap-2 text-green-600">
                                    <CheckCircle className="h-4 w-4" /> Completed
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-bold text-green-600">{completedIds.size}</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Month Navigation */}
                    <Card className="mb-8">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <Button variant="ghost" size="icon" onClick={() => {
                                    if (month === 0) { setMonth(11); setYear(y => y - 1); }
                                    else setMonth(m => m - 1);
                                }}>
                                    <ChevronLeft className="h-5 w-5" />
                                </Button>
                                <CardTitle className="text-xl">{MONTH_NAMES[month]} {year}</CardTitle>
                                <Button variant="ghost" size="icon" onClick={() => {
                                    if (month === 11) { setMonth(0); setYear(y => y + 1); }
                                    else setMonth(m => m + 1);
                                }}>
                                    <ChevronRight className="h-5 w-5" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {/* Calendar Grid */}
                            <div className="grid grid-cols-7 gap-1 mb-2">
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                    <div key={day} className="text-center text-xs font-medium text-muted-foreground p-2">{day}</div>
                                ))}
                            </div>
                            <div className="grid grid-cols-7 gap-1">
                                {calendarDays.map((day, i) => {
                                    if (day === null) return <div key={`empty-${i}`} className="p-2" />;
                                    const dayTasks = getTasksForDay(day);
                                    const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;
                                    return (
                                        <div
                                            key={day}
                                            className={`p-2 rounded-lg min-h-[70px] border text-sm
                        ${isToday ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-muted/50'}
                        ${dayTasks.length > 0 ? 'bg-muted/30' : ''}`}
                                        >
                                            <span className={`text-xs font-medium ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>{day}</span>
                                            {dayTasks.slice(0, 2).map((t, j) => (
                                                <div key={j} className={`mt-1 text-[10px] px-1 py-0.5 rounded truncate
                          ${getTaskPriorityColor(t) === 'red' ? 'bg-red-500/10 text-red-600' :
                                                        getTaskPriorityColor(t) === 'yellow' ? 'bg-yellow-500/10 text-yellow-600' :
                                                            'bg-blue-500/10 text-blue-600'}`}>
                                                    {t.tax_type}
                                                </div>
                                            ))}
                                            {dayTasks.length > 2 && (
                                                <span className="text-[10px] text-muted-foreground">+{dayTasks.length - 2}</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Task List */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Deadlines — {MONTH_NAMES[month]}</CardTitle>
                            <CardDescription>{monthTasks.length} deadline{monthTasks.length !== 1 ? 's' : ''} this month</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {monthTasks.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                    <p>No deadlines this month</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {monthTasks.map((task, i) => {
                                        const key = `${task.tax_type}-${task.due_date}`;
                                        const done = completedIds.has(key);
                                        return (
                                            <div key={i} className={`flex items-center justify-between p-4 rounded-lg transition-colors
                        ${done ? 'bg-green-500/5 opacity-60' : 'bg-muted/50'}`}>
                                                <div className="flex items-center gap-3">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        onClick={() => toggleComplete(task)}
                                                    >
                                                        {done ? <CheckCircle className="h-5 w-5 text-green-600" /> : <Clock className="h-5 w-5 text-muted-foreground" />}
                                                    </Button>
                                                    <div>
                                                        <p className={`font-medium ${done ? 'line-through' : ''}`}>{task.title}</p>
                                                        <p className="text-sm text-muted-foreground">{task.description}</p>
                                                        {task.penalty_info && (
                                                            <p className="text-xs text-red-500 mt-1">⚠️ {task.penalty_info}</p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-medium">{task.due_date}</p>
                                                    <Badge variant={task.status === 'overdue' ? 'destructive' : 'secondary'}>
                                                        {task.regulator}
                                                    </Badge>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </main>
            <Footer />
        </div>
    );
}

export default function ComplianceCalendar() {
    return (
        <AuthGuard>
            <ComplianceCalendarContent />
        </AuthGuard>
    );
}
