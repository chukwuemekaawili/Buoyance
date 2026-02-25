import { useState } from "react";
import { ChevronDown, ChevronUp, Scale } from "lucide-react";

interface NTATransitionGuideProps {
    taxType: "PIT" | "CIT" | "VAT" | "WHT" | "CGT" | "CRYPTO" | "FOREIGN_INCOME";
}

// Static, curated, legally accurate content — NOT AI-generated.
// This prevents any hallucination risk on statutory law.
const TRANSITION_CONTENT: Record<string, { title: string; changes: string[] }> = {
    PIT: {
        title: "Personal Income Tax — What Changed",
        changes: [
            "CRA (Consolidated Relief Allowance) is abolished. It no longer exists under NTA 2025.",
            "New 0% tax band: First ₦800,000 of annual income is completely tax-free.",
            "Tax bands restructured: 15% → 18% → 21% → 23% → 25% (max rate, down from 24%).",
            "Rent Relief replaces CRA: Capped at ₦500,000 or 20% of rent paid, whichever is lower.",
            "Pension (8%) and NHF (2.5%) contributions remain deductible as structured statutory reliefs.",
        ],
    },
    CIT: {
        title: "Company Income Tax — What Changed",
        changes: [
            "Small company threshold raised from ₦25M to ₦100M turnover.",
            "New dual-test: Must have BOTH turnover ≤₦100M AND total assets ≤₦250M for 0% rate.",
            "Professional services companies (legal, accounting, medical) are excluded from the 0% exemption.",
            "Development Levy: 4% added on top of CIT for medium and large companies.",
            "Minimum Effective Tax Rate: 15% for large multinationals (Pillar Two compliance).",
        ],
    },
    VAT: {
        title: "Value Added Tax — What Changed",
        changes: [
            "VAT rate remains at 7.5% — no change from the previous Finance Act.",
            "Registration threshold corrected to ₦25M annual turnover (not ₦100M as previously displayed).",
            "Basic food items, medical supplies, and educational materials remain VAT-exempt.",
            "Reverse charge mechanism applies to foreign digital services consumed in Nigeria.",
        ],
    },
    WHT: {
        title: "Withholding Tax — What Changed",
        changes: [
            "Professional/consultancy fees WHT reduced from 10% to 5% for residents.",
            "General services rate set at 2% (new standardized category).",
            "Small businesses with turnover < ₦25M are exempt from WHT obligation on single transactions ≤ ₦2M.",
            "No-TIN penalty: Double the applicable rate if the recipient has no TIN registration.",
            "WHT certificates must be issued within 30 days of deduction.",
        ],
    },
    CGT: {
        title: "Capital Gains Tax — What Changed",
        changes: [
            "Corporate CGT rate increased from 10% to 30% — a major change.",
            "Individuals: Capital gains are now taxed at progressive PIT rates (0%–25%), not the old flat 10%.",
            "Digital/virtual assets (crypto, NFTs) are now explicitly within CGT scope.",
            "Small company exemption: Companies with turnover ≤₦100M are exempt from CGT.",
            "NSE-listed shares and government securities remain exempt.",
        ],
    },
    CRYPTO: {
        title: "Crypto & Digital Assets — What Changed",
        changes: [
            "Crypto trading, mining, and staking are explicitly taxable under NTA 2025.",
            "For individuals: Gains taxed at progressive PIT rates (up to 25%).",
            "For companies: Gains taxed at 30% CIT rate.",
            "NFT sales and DeFi yield farming are also within scope.",
            "The old position of 'regulatory gray area' is officially over.",
        ],
    },
    FOREIGN_INCOME: {
        title: "Foreign Income — What Changed",
        changes: [
            "Nigerian tax residents are taxed on worldwide income (no change in principle).",
            "Foreign tax credits remain available to prevent double taxation.",
            "Treaty relief applies where Nigeria has active Double Taxation Agreements.",
            "Remittance-based taxation option available for individuals with qualifying foreign employment.",
            "FIRS renamed to Nigeria Revenue Service (NRS) for international compliance purposes.",
        ],
    },
};

export function NTATransitionGuide({ taxType }: NTATransitionGuideProps) {
    const [expanded, setExpanded] = useState(false);
    const content = TRANSITION_CONTENT[taxType];

    if (!content) return null;

    return (
        <div className="border border-border/50 rounded-lg overflow-hidden bg-muted/20">
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/40 transition-colors"
            >
                <div className="flex items-center gap-2 text-sm font-medium">
                    <Scale className="h-4 w-4 text-primary" />
                    <span>{content.title}</span>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-normal">
                        NTA 2025
                    </span>
                </div>
                {expanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
            </button>

            {expanded && (
                <div className="px-4 pb-4 pt-1 space-y-2 border-t border-border/30">
                    {content.changes.map((change, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <span className="text-primary font-bold mt-0.5">•</span>
                            <p className="leading-snug">{change}</p>
                        </div>
                    ))}
                    <p className="text-xs text-muted-foreground/60 mt-3 italic">
                        Source: Nigeria Tax Act 2025 (signed June 26, 2025; effective January 1, 2026)
                    </p>
                </div>
            )}
        </div>
    );
}
