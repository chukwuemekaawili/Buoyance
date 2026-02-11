import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Calculator, Building2, Receipt, Banknote, Landmark, ArrowRight, Bitcoin, Globe } from "lucide-react";

const calculators = [
  {
    id: "pit",
    title: "Personal Income Tax (PIT)",
    description: "Calculate your personal income tax using progressive tax bands",
    icon: Calculator,
    href: "/calculators/pit",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    id: "cit",
    title: "Companies Income Tax (CIT)",
    description: "Calculate corporate income tax for your business",
    icon: Building2,
    href: "/calculators/cit",
    color: "text-blue-600",
    bgColor: "bg-blue-600/10",
  },
  {
    id: "vat",
    title: "Value Added Tax (VAT)",
    description: "Calculate VAT on taxable goods and services",
    icon: Receipt,
    href: "/calculators/vat",
    color: "text-emerald-600",
    bgColor: "bg-emerald-600/10",
  },
  {
    id: "wht",
    title: "Withholding Tax (WHT)",
    description: "Calculate withholding tax on payments by category",
    icon: Banknote,
    href: "/calculators/wht",
    color: "text-amber-600",
    bgColor: "bg-amber-600/10",
  },
  {
    id: "cgt",
    title: "Capital Gains Tax (CGT)",
    description: "Calculate tax on capital gains from asset disposal",
    icon: Landmark,
    href: "/calculators/cgt",
    color: "text-purple-600",
    bgColor: "bg-purple-600/10",
  },
  {
    id: "crypto",
    title: "Crypto Tax Calculator",
    description: "Calculate CGT and income tax on cryptocurrency transactions",
    icon: Bitcoin,
    href: "/calculators/crypto",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
  {
    id: "foreign-income",
    title: "Foreign Income Tax",
    description: "Calculate tax on foreign income with double taxation relief",
    icon: Globe,
    href: "/calculators/foreign-income",
    color: "text-cyan-600",
    bgColor: "bg-cyan-600/10",
  },
];

export default function Calculators() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-grow pt-20 md:pt-28 pb-16">
        <div className="container mx-auto px-4 md:px-6 max-w-5xl" data-tour="calculators">
          <div className="mb-10 text-center">
            <h1 className="text-4xl font-bold text-foreground mb-4">Tax Calculators</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Choose from our suite of tax calculators powered by Nigerian tax rules and regulations.
              All calculations use official rates and are updated regularly.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {calculators.map((calc) => (
              <Card key={calc.id} className="group hover:shadow-lg transition-shadow border-2 hover:border-primary/20">
                <CardHeader>
                  <div className={`w-12 h-12 rounded-xl ${calc.bgColor} flex items-center justify-center mb-4`}>
                    <calc.icon className={`h-6 w-6 ${calc.color}`} />
                  </div>
                  <CardTitle className="text-xl">{calc.title}</CardTitle>
                  <CardDescription>{calc.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full group-hover:bg-primary group-hover:text-primary-foreground" variant="outline">
                    <Link to={calc.href}>
                      Open Calculator
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-12 p-6 bg-muted/50 rounded-xl text-center">
            <h2 className="text-xl font-semibold mb-2">Need Help?</h2>
            <p className="text-muted-foreground mb-4">
              Our calculators provide estimates based on current tax legislation. 
              For professional tax advice, please consult a qualified tax advisor.
            </p>
            <Button asChild variant="outline">
              <Link to="/support">Contact Support</Link>
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
