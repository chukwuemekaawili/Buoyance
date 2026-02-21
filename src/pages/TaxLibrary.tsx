import { useState } from "react";
import { Link } from "react-router-dom";

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import {
    ArrowLeft,
    Search,
    Library,
    Scale,
    BookOpen,
    ExternalLink,
} from "lucide-react";

interface TaxLawEntry {
    id: string;
    title: string;
    act: string;
    section: string;
    summary: string;
    details: string;
    tags: string[];
    lastAmended?: string;
}

const taxLawLibrary: TaxLawEntry[] = [
    {
        id: "pit-rates",
        title: "Personal Income Tax — Rate Table",
        act: "Nigeria Tax Act 2025",
        section: "Section 33",
        summary: "Progressive PIT rates from 7% to 24% on annual taxable income.",
        details:
            "The graduated tax table applies to individuals:\n\n• First ₦300,000 — 7%\n• Next ₦300,000 — 11%\n• Next ₦500,000 — 15%\n• Next ₦500,000 — 19%\n• Next ₦1,600,000 — 21%\n• Above ₦3,200,000 — 24%\n\nA minimum tax of 1% of gross income applies where computed tax is lower than this amount.",
        tags: ["PIT", "rates", "individuals"],
    },
    {
        id: "cra",
        title: "Consolidated Relief Allowance (CRA)",
        act: "Nigeria Tax Act 2025",
        section: "Section 34",
        summary: "Relief allowance that reduces taxable income for PIT payers.",
        details:
            "The CRA is the higher of:\n• ₦200,000, or\n• 1% of gross income\n\nPlus 20% of gross income.\n\nThis is automatically deducted from gross income before applying the PIT rate table. Additional reliefs include pension contributions (8%), NHF (2.5%), and NHIS (if applicable).",
        tags: ["PIT", "relief", "CRA", "deductions"],
    },
    {
        id: "vat-general",
        title: "Value Added Tax — General Provisions",
        act: "Nigeria Tax Act 2025",
        section: "Part VIII",
        summary: "VAT is charged at 7.5% on the supply of taxable goods and services.",
        details:
            "Key provisions:\n• Standard rate: 7.5%\n• Registration threshold: ₦25 million annual turnover\n• Monthly filing deadline: 21st of the following month\n• Input VAT can be offset against output VAT\n• Non-resident suppliers to Nigerian customers must register\n\nExempt supplies include basic food items, medical services, educational services, and exports (zero-rated).",
        tags: ["VAT", "rates", "registration", "filing"],
    },
    {
        id: "cit-rates",
        title: "Company Income Tax — Rate Structure",
        act: "Nigeria Tax Act 2025",
        section: "Part IV",
        summary: "CIT rates tiered by company size: 0%, 20%, and 30%.",
        details:
            "CIT rates by turnover:\n• Small companies (< ₦25 million): 0% — full exemption\n• Medium companies (₦25M–₦100M): 20%\n• Large companies (> ₦100M): 30%\n\nTertiary education tax of 2.5% of assessable profit and 1% NASENI levy (for companies with turnover > ₦100M) also apply as additional levies.\n\nFiling deadline: 6 months after financial year-end.",
        tags: ["CIT", "rates", "companies", "SMB"],
    },
    {
        id: "wht-rates",
        title: "Withholding Tax — Rates & Application",
        act: "Nigeria Tax Act 2025",
        section: "Part VII",
        summary: "Advance tax deducted at source from specified payments.",
        details:
            "WHT rates for companies/individuals:\n• Dividends: 10%\n• Interest: 10%\n• Rent: 10%\n• Royalties: 10%\n• Commission: 10%\n• Contracts/agency: 5% (companies), 5% (individuals)\n• Professional/consultancy: 10% (companies), 5% (individuals)\n• Technical services: 10%\n• Management fees: 10%\n\nWHT credit notes should be collected from the payer and used to offset final tax liability.",
        tags: ["WHT", "rates", "credits", "deductions"],
    },
    {
        id: "cgt",
        title: "Capital Gains Tax — Disposal of Assets",
        act: "Capital Gains Tax Act",
        section: "Section 2",
        summary: "10% flat rate on gains from disposal of chargeable assets.",
        details:
            "Chargeable assets include land, buildings, shares, and other capital assets.\n\nKey exemptions:\n• Personal-use motor vehicles\n• Decorations for valor\n• Life assurance policies\n• Government securities\n• First ₦1 million of gains for individuals (annual exemption)\n\nGains are computed as: Disposal proceeds – Cost of acquisition – Incidental costs of disposal.",
        tags: ["CGT", "capital gains", "assets", "disposal"],
    },
    {
        id: "tin",
        title: "Tax Identification Number (TIN) Requirements",
        act: "Nigeria Tax Act 2025",
        section: "Section 8",
        summary: "Every taxable person must register and obtain a TIN.",
        details:
            "TIN is required for:\n• Opening or operating bank accounts\n• Importing or exporting goods\n• Applying for government contracts\n• Registering a business\n• Obtaining business permits\n\nRegistration is free via the FIRS TaxPro Max portal or at any FIRS office. The JTB maintains a unified database across federal and state levels.",
        tags: ["TIN", "registration", "compliance"],
    },
    {
        id: "tcc",
        title: "Tax Clearance Certificate (TCC)",
        act: "Nigeria Tax Act 2025",
        section: "Section 101",
        summary: "Certificate confirming 3 years of tax compliance — required for many transactions.",
        details:
            "Activities requiring TCC:\n• Application for government contracts\n• Obtaining import/export licenses\n• Approval of building plans\n• Forex allocations from the CBN\n• Change of business ownership\n• Registration of motor vehicles\n\nTCC covers the 3 preceding years. Requirements vary by jurisdiction (Federal/FIRS, Lagos/LIRS, etc.).",
        tags: ["TCC", "clearance", "compliance", "requirements"],
    },
    {
        id: "paye",
        title: "Pay-As-You-Earn (PAYE) — Employer Obligations",
        act: "Nigeria Tax Act 2025",
        section: "Section 81",
        summary: "Employers must deduct and remit PAYE tax monthly from employee salaries.",
        details:
            "Employer obligations:\n• Register with the relevant State IRS\n• Deduct PIT (PAYE) from employee salaries monthly\n• Remit deductions within 10 days of the following month\n• File annual returns (Form H1) by January 31st\n• Issue tax deduction cards to employees\n\nPenalty for late remittance: 10% of the unremitted amount + interest at CBN lending rate.",
        tags: ["PAYE", "payroll", "employer", "remittance"],
    },
    {
        id: "penalties",
        title: "Tax Penalties & Interest",
        act: "Nigeria Tax Act 2025",
        section: "Part X",
        summary: "Penalties for late filing, late payment, false returns, and tax evasion.",
        details:
            "Key penalties:\n• Late filing of returns: ₦50,000 (first month) + ₦25,000 per subsequent month\n• Late payment: 10% of the outstanding amount\n• Failure to deduct WHT: 200% of the tax not deducted\n• Tax evasion: ₦5 million fine and/or 3 years imprisonment\n• False/misleading statements: ₦200,000 per offense\n\nInterest on unpaid tax accrues at the CBN minimum rediscount rate.",
        tags: ["penalties", "interest", "compliance", "evasion"],
    },
];

function TaxLibraryContent() {
    const [search, setSearch] = useState("");
    const [selectedTag, setSelectedTag] = useState<string | null>(null);

    const allTags = Array.from(new Set(taxLawLibrary.flatMap((e) => e.tags)));

    const filtered = taxLawLibrary.filter((entry) => {
        const matchesSearch =
            search === "" ||
            entry.title.toLowerCase().includes(search.toLowerCase()) ||
            entry.summary.toLowerCase().includes(search.toLowerCase()) ||
            entry.details.toLowerCase().includes(search.toLowerCase()) ||
            entry.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
        const matchesTag = !selectedTag || entry.tags.includes(selectedTag);
        return matchesSearch && matchesTag;
    });

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Header />
            <main className="flex-1 pt-20 md:pt-28 pb-16">
                <div className="container mx-auto px-4 md:px-6 max-w-4xl">
                    {/* Back link */}
                    <Link
                        to="/academy"
                        className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Academy
                    </Link>

                    {/* Header */}
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-primary/10 rounded-xl">
                            <Library className="h-8 w-8 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold">Tax Library</h1>
                            <p className="text-muted-foreground">
                                Searchable reference of Nigerian tax laws and provisions
                            </p>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search tax laws, rates, provisions..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10"
                        />
                    </div>

                    {/* Tag Filters */}
                    <div className="flex flex-wrap gap-2 mb-6">
                        <Button
                            size="sm"
                            variant={selectedTag === null ? "default" : "outline"}
                            onClick={() => setSelectedTag(null)}
                        >
                            All
                        </Button>
                        {allTags.map((tag) => (
                            <Button
                                key={tag}
                                size="sm"
                                variant={selectedTag === tag ? "default" : "outline"}
                                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                            >
                                {tag}
                            </Button>
                        ))}
                    </div>

                    {/* Results */}
                    <div className="space-y-2">
                        {filtered.length === 0 ? (
                            <Card className="p-12 text-center">
                                <Scale className="h-12 w-12 mx-auto mb-4 opacity-30" />
                                <h3 className="text-lg font-semibold">No results found</h3>
                                <p className="text-muted-foreground">
                                    Try different search terms or clear your filters.
                                </p>
                            </Card>
                        ) : (
                            <Accordion type="single" collapsible className="space-y-2">
                                {filtered.map((entry) => (
                                    <AccordionItem key={entry.id} value={entry.id} className="border rounded-lg px-4">
                                        <AccordionTrigger className="hover:no-underline py-4">
                                            <div className="flex-1 text-left">
                                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                                    <Scale className="h-4 w-4 text-primary flex-shrink-0" />
                                                    <span className="font-semibold">{entry.title}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <span>{entry.act}</span>
                                                    <span>•</span>
                                                    <span>{entry.section}</span>
                                                </div>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="pb-4">
                                            <p className="text-sm text-muted-foreground mb-3 italic">{entry.summary}</p>
                                            <div className="bg-muted/50 rounded-lg p-4 mb-3">
                                                <p className="text-sm whitespace-pre-line leading-relaxed">{entry.details}</p>
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                                {entry.tags.map((tag) => (
                                                    <Badge key={tag} variant="outline" className="text-xs">
                                                        {tag}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        )}
                    </div>

                    <Card className="mt-6 p-4 bg-muted/50">
                        <div className="flex items-start gap-3">
                            <BookOpen className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="text-sm font-medium">Disclaimer</p>
                                <p className="text-xs text-muted-foreground">
                                    This library is for educational purposes. Always consult the official gazette or a
                                    tax professional for definitive legal interpretations. Laws are current as of the
                                    Nigeria Tax Act 2025.
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>
            </main>
            <Footer />
        </div>
    );
}

export default function TaxLibrary() {
    return (
        <TaxLibraryContent />
    );
}
