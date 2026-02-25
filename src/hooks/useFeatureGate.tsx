import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "./useWorkspace";

// Definitions of what is allowed on the Free vs Pro plans
export type BillingPlan = "free" | "pro" | "enterprise";
export type MetricName = 'ai_explanations' | 'ocr_receipts' | 'api_requests' | 'bank_syncs';

export const PLAN_LIMITS: Record<BillingPlan, Record<MetricName, number>> = {
    free: {
        ai_explanations: 3,
        ocr_receipts: 5,
        api_requests: 100,
        bank_syncs: 0 // Locked entirely on free
    },
    pro: {
        ai_explanations: 100,
        ocr_receipts: 500,
        api_requests: 5000,
        bank_syncs: 10
    },
    enterprise: {
        ai_explanations: 999999,
        ocr_receipts: 999999,
        api_requests: 999999,
        bank_syncs: 999999
    }
};

interface FeatureGateContextType {
    plan: BillingPlan;
    isPro: boolean;
    isLoading: boolean;
    checkQuota: (metric: MetricName) => Promise<{ allowed: boolean; remaining: number; limit: number }>;
    recordUsage: (metric: MetricName) => Promise<boolean>;
}

const FeatureGateContext = createContext<FeatureGateContextType | undefined>(undefined);

export function FeatureGateProvider({ children }: { children: ReactNode }) {
    const { activeWorkspace } = useWorkspace();
    const [plan, setPlan] = useState<BillingPlan>("free");
    const [isLoading, setIsLoading] = useState(true);

    // Sync the current billing plan from the active workspace
    useEffect(() => {
        async function fetchPlan() {
            if (!activeWorkspace) {
                setPlan("free");
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            try {
                const { data, error } = await supabase
                    .from("organizations")
                    .select("billing_plan, subscription_status")
                    .eq("id", activeWorkspace.id)
                    .maybeSingle();

                if (error && error.code !== 'PGRST116') throw error;

                // If subscription is canceled/past_due, fallback to free limits regardless of what the string says
                if (data && data.billing_plan && data.subscription_status === 'active') {
                    setPlan(data.billing_plan as BillingPlan);
                } else {
                    setPlan("free");
                }
            } catch (err) {
                console.error("Failed to load workspace billing plan", err);
                setPlan("free");
            } finally {
                setIsLoading(false);
            }
        }

        fetchPlan();
    }, [activeWorkspace]);

    // Check if a workspace has enough quota remaining for a specific action this month
    const checkQuota = async (metric: MetricName) => {
        if (!activeWorkspace) return { allowed: false, remaining: 0, limit: 0 };

        const limit = PLAN_LIMITS[plan][metric];
        if (limit === 0) return { allowed: false, remaining: 0, limit: 0 };

        try {
            // Find current usage for this month
            const startOfMonth = new Date();
            startOfMonth.setUTCDate(1);
            startOfMonth.setUTCHours(0, 0, 0, 0);

            const { data, error } = await supabase
                .from("usage_metrics")
                .select("current_usage")
                .eq("workspace_id", activeWorkspace.id)
                .eq("metric_name", metric)
                .gte("billing_period_start", startOfMonth.toISOString())
                .maybeSingle();

            if (error && error.code !== 'PGRST116') throw error; // Ignore Row not found

            const currentUsage = data?.current_usage || 0;
            const remaining = Math.max(0, limit - currentUsage);

            return {
                allowed: remaining > 0,
                remaining,
                limit
            };
        } catch (err) {
            console.error(`Failed to check quota for ${metric}`, err);
            return { allowed: false, remaining: 0, limit }; // Fail closed
        }
    };

    // Securely increments usage via the database RPC we created
    const recordUsage = async (metric: MetricName): Promise<boolean> => {
        if (!activeWorkspace) return false;

        try {
            const { error } = await supabase.rpc('increment_usage', {
                p_workspace_id: activeWorkspace.id,
                p_metric_name: metric,
                p_amount: 1
            });

            if (error) throw error;
            return true;
        } catch (err) {
            console.error(`Failed to record usage for ${metric}`, err);
            return false;
        }
    };

    return (
        <FeatureGateContext.Provider value={{
            plan,
            isPro: plan === 'pro' || plan === 'enterprise',
            isLoading,
            checkQuota,
            recordUsage
        }}>
            {children}
        </FeatureGateContext.Provider>
    );
}

export function useFeatureGate() {
    const context = useContext(FeatureGateContext);
    if (context === undefined) {
        throw new Error("useFeatureGate must be used within a FeatureGateProvider");
    }
    return context;
}
