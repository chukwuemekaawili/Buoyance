import { useState } from "react";
import { Link } from "react-router-dom";

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
    GraduationCap,
    BookOpen,
    Award,
    Clock,
    Search,
    ChevronRight,
    Library,
    Star,
    CheckCircle2,
    Lock,
} from "lucide-react";

interface Course {
    id: string;
    title: string;
    description: string;
    category: string;
    level: "beginner" | "intermediate" | "advanced";
    lessons: number;
    duration: string;
    progress: number;
    locked: boolean;
    icon: string;
}

const courses: Course[] = [
    {
        id: "nta-basics",
        title: "Nigeria Tax Act 2025 — Essentials",
        description: "Understand the core principles of Nigeria's tax framework, including PIT bands, CIT rates, and taxpayer rights.",
        category: "Fundamentals",
        level: "beginner",
        lessons: 8,
        duration: "45 min",
        progress: 0,
        locked: false,
        icon: "📜",
    },
    {
        id: "vat-mastery",
        title: "VAT Compliance Masterclass",
        description: "Learn VAT registration, filing, input tax credits, and exemptions under the current Nigerian framework.",
        category: "Compliance",
        level: "intermediate",
        lessons: 6,
        duration: "35 min",
        progress: 0,
        locked: false,
        icon: "📊",
    },
    {
        id: "wht-credit",
        title: "WHT Credit Management",
        description: "Master withholding tax credits — from certificate collection to matching and filing for refunds.",
        category: "Credits & Deductions",
        level: "intermediate",
        lessons: 5,
        duration: "25 min",
        progress: 0,
        locked: false,
        icon: "🧾",
    },
    {
        id: "paye-payroll",
        title: "PAYE & Payroll Tax Guide",
        description: "Calculate PAYE correctly, understand relief allowances, pension contributions, and employer obligations.",
        category: "Payroll",
        level: "beginner",
        lessons: 7,
        duration: "40 min",
        progress: 0,
        locked: false,
        icon: "💼",
    },
    {
        id: "cit-planning",
        title: "CIT Planning for SMBs",
        description: "Learn how small and medium businesses can minimize CIT through legitimate deductions and incentives.",
        category: "Planning",
        level: "advanced",
        lessons: 6,
        duration: "30 min",
        progress: 0,
        locked: false,
        icon: "🏢",
    },
    {
        id: "tcc-readiness",
        title: "Tax Clearance Certificate (TCC)",
        description: "Prepare your TCC evidence pack, understand jurisdiction requirements, and avoid common rejection reasons.",
        category: "Compliance",
        level: "beginner",
        lessons: 4,
        duration: "20 min",
        progress: 0,
        locked: false,
        icon: "✅",
    },
    {
        id: "audit-defence",
        title: "Surviving a Tax Audit",
        description: "Know your rights during a FIRS audit, organize documentation, and respond to assessment notices.",
        category: "Advanced",
        level: "advanced",
        lessons: 5,
        duration: "30 min",
        progress: 0,
        locked: false,
        icon: "🛡️",
    },
    {
        id: "crypto-tax",
        title: "Digital Assets & Crypto Taxation",
        description: "Understand how Nigeria taxes cryptocurrency gains, NFT income, and digital asset transfers.",
        category: "Specialized",
        level: "advanced",
        lessons: 4,
        duration: "25 min",
        progress: 0,
        locked: false,
        icon: "₿",
    },
    {
        id: "tax-optimization",
        title: "Tax Optimization Playbook",
        description: "Legal strategies to minimize your tax burden — reliefs, deductions, timing, structuring, and industry-specific tips.",
        category: "Planning",
        level: "intermediate",
        lessons: 6,
        duration: "35 min",
        progress: 0,
        locked: false,
        icon: "💡",
    },
    {
        id: "penalties-enforcement",
        title: "Penalties, Interest & Enforcement",
        description: "Understand every penalty, interest charge, and prosecution risk in Nigerian tax law — and how to avoid them.",
        category: "Compliance",
        level: "beginner",
        lessons: 5,
        duration: "25 min",
        progress: 0,
        locked: false,
        icon: "⚠️",
    },
    {
        id: "freelancer-tax",
        title: "Freelancer & Self-Employed Tax Guide",
        description: "Tax obligations for gig workers, sole proprietors, and independent contractors in Nigeria.",
        category: "Specialized",
        level: "beginner",
        lessons: 5,
        duration: "30 min",
        progress: 0,
        locked: false,
        icon: "💻",
    },
    {
        id: "compliance-calendar",
        title: "Tax Compliance Calendar",
        description: "Month-by-month guide to every Nigerian tax deadline, filing requirement, and compliance milestone.",
        category: "Compliance",
        level: "beginner",
        lessons: 4,
        duration: "20 min",
        progress: 0,
        locked: false,
        icon: "📅",
    },
    {
        id: "transfer-pricing",
        title: "Transfer Pricing Essentials",
        description: "Understand Nigeria's arm's length rules, documentation requirements, and how to manage related-party transactions.",
        category: "Specialized",
        level: "intermediate",
        lessons: 5,
        duration: "30 min",
        progress: 0,
        locked: false,
        icon: "🔗",
    },
    {
        id: "stamp-duty",
        title: "Stamp Duty & Electronic Levies",
        description: "Navigate Nigeria's stamp duty rules, the ₦50 electronic transfer levy, and property duty rates under the NTA 2025.",
        category: "Compliance",
        level: "beginner",
        lessons: 4,
        duration: "20 min",
        progress: 0,
        locked: false,
        icon: "📄",
    },
    {
        id: "development-levy",
        title: "Development Levy & Other Levies",
        description: "Understand the 4% Development Levy, its components (TETFund, NASENI, NITDA), and which companies are exempt.",
        category: "Fundamentals",
        level: "beginner",
        lessons: 4,
        duration: "20 min",
        progress: 0,
        locked: false,
        icon: "🏛️",
    },
    {
        id: "double-taxation",
        title: "Double Taxation Treaties",
        description: "Understand how Nigeria's DTTs prevent being taxed twice, which countries are covered, and how to claim relief.",
        category: "International",
        level: "intermediate",
        lessons: 4,
        duration: "20 min",
        progress: 0,
        locked: false,
        icon: "🌍",
    },
    {
        id: "state-local-taxes",
        title: "State & Local Taxes",
        description: "Navigate state-level taxes — hotel occupancy, land use charge, business premises, and development levies.",
        category: "Compliance",
        level: "beginner",
        lessons: 4,
        duration: "20 min",
        progress: 0,
        locked: false,
        icon: "🏘️",
    },
    {
        id: "employment-benefits-tax",
        title: "Employment Benefits Taxation",
        description: "How employer-provided housing, company cars, meals, and other benefits are taxed under the NTA 2025.",
        category: "Fundamentals",
        level: "intermediate",
        lessons: 4,
        duration: "20 min",
        progress: 0,
        locked: false,
        icon: "🎁",
    },
    {
        id: "taxpro-max-guide",
        title: "TaxPro-Max Portal Guide",
        description: "Step-by-step guide to registering, filing returns, making payments, and managing your tax on TaxPro-Max.",
        category: "Practical",
        level: "beginner",
        lessons: 4,
        duration: "25 min",
        progress: 0,
        locked: false,
        icon: "💻",
    },
];

const levelColors: Record<string, string> = {
    beginner: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    intermediate: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    advanced: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

function AcademyContent() {
    const [search, setSearch] = useState("");
    const [activeTab, setActiveTab] = useState("all");

    const categories = ["all", ...Array.from(new Set(courses.map((c) => c.category)))];

    const filtered = courses.filter((c) => {
        const matchesSearch =
            c.title.toLowerCase().includes(search.toLowerCase()) ||
            c.description.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = activeTab === "all" || c.category === activeTab;
        return matchesSearch && matchesCategory;
    });

    const totalLessons = courses.reduce((sum, c) => sum + c.lessons, 0);
    const completedCourses = courses.filter((c) => c.progress === 100).length;

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Header />
            <main className="flex-1 pt-20 md:pt-28 pb-16">
                <div className="container mx-auto px-4 md:px-6 max-w-6xl">
                    {/* Hero */}
                    <div className="mb-8">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-primary/10 rounded-xl">
                                <GraduationCap className="h-8 w-8 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-2xl md:text-3xl font-bold">Tax Academy</h1>
                                <p className="text-muted-foreground">Master Nigerian tax compliance with interactive courses</p>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                            <Card className="p-4">
                                <div className="flex items-center gap-3">
                                    <BookOpen className="h-5 w-5 text-primary" />
                                    <div>
                                        <p className="text-2xl font-bold">{courses.length}</p>
                                        <p className="text-xs text-muted-foreground">Courses</p>
                                    </div>
                                </div>
                            </Card>
                            <Card className="p-4">
                                <div className="flex items-center gap-3">
                                    <Clock className="h-5 w-5 text-blue-500" />
                                    <div>
                                        <p className="text-2xl font-bold">{totalLessons}</p>
                                        <p className="text-xs text-muted-foreground">Lessons</p>
                                    </div>
                                </div>
                            </Card>
                            <Card className="p-4">
                                <div className="flex items-center gap-3">
                                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                                    <div>
                                        <p className="text-2xl font-bold">{completedCourses}</p>
                                        <p className="text-xs text-muted-foreground">Completed</p>
                                    </div>
                                </div>
                            </Card>
                            <Card className="p-4">
                                <div className="flex items-center gap-3">
                                    <Award className="h-5 w-5 text-amber-500" />
                                    <div>
                                        <p className="text-2xl font-bold">0</p>
                                        <p className="text-xs text-muted-foreground">Certificates</p>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </div>

                    {/* Search & Filters */}
                    <div className="flex flex-col md:flex-row gap-4 mb-6">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search courses..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Button asChild variant="outline">
                            <Link to="/academy/library">
                                <Library className="h-4 w-4 mr-2" />
                                Tax Library
                            </Link>
                        </Button>
                    </div>

                    {/* Category Tabs */}
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
                        <TabsList className="flex-wrap h-auto gap-1">
                            {categories.map((cat) => (
                                <TabsTrigger key={cat} value={cat} className="capitalize">
                                    {cat}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>

                    {/* Course Grid */}
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filtered.map((course) => (
                            <Card
                                key={course.id}
                                className={`hover:shadow-lg transition-all duration-200 ${course.locked ? "opacity-60" : ""}`}
                            >
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between">
                                        <span className="text-3xl">{course.icon}</span>
                                        <div className="flex items-center gap-2">
                                            <Badge className={levelColors[course.level]}>{course.level}</Badge>
                                            {course.locked && <Lock className="h-4 w-4 text-muted-foreground" />}
                                        </div>
                                    </div>
                                    <CardTitle className="text-lg mt-2">{course.title}</CardTitle>
                                    <CardDescription className="line-clamp-2">{course.description}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                                        <span className="flex items-center gap-1">
                                            <BookOpen className="h-3.5 w-3.5" /> {course.lessons} lessons
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock className="h-3.5 w-3.5" /> {course.duration}
                                        </span>
                                    </div>

                                    {course.progress > 0 && (
                                        <div className="mb-3">
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="text-muted-foreground">Progress</span>
                                                <span className="font-medium">{course.progress}%</span>
                                            </div>
                                            <Progress value={course.progress} className="h-2" />
                                        </div>
                                    )}

                                    <Button
                                        asChild={!course.locked}
                                        variant={course.progress > 0 ? "default" : "outline"}
                                        className="w-full"
                                        disabled={course.locked}
                                    >
                                        {course.locked ? (
                                            <span>
                                                <Lock className="h-4 w-4 mr-2" /> Coming Soon
                                            </span>
                                        ) : (
                                            <Link to={`/academy/course/${course.id}`}>
                                                {course.progress > 0 ? "Continue Learning" : "Start Course"}
                                                <ChevronRight className="h-4 w-4 ml-2" />
                                            </Link>
                                        )}
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {filtered.length === 0 && (
                        <Card className="p-12 text-center">
                            <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-30" />
                            <h3 className="text-lg font-semibold">No courses found</h3>
                            <p className="text-muted-foreground">Try adjusting your search or filter.</p>
                        </Card>
                    )}
                </div>
            </main>
            <Footer />
        </div>
    );
}

export default function Academy() {
    return (
        <AcademyContent />
    );
}
