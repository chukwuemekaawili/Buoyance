/**
 * useAppSettings Hook
 * 
 * Fetches and manages global app settings (free mode, feature flags, etc.)
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRBAC } from "@/hooks/useRBAC";
import { writeAuditLog } from "@/lib/auditLog";

export interface GlobalConfig {
  free_mode_enabled: boolean;
}

interface UseAppSettingsResult {
  loading: boolean;
  error: string | null;
  globalConfig: GlobalConfig;
  isFreeModeEnabled: boolean;
  updateFreeModeEnabled: (enabled: boolean) => Promise<boolean>;
  refetch: () => Promise<void>;
}

const DEFAULT_CONFIG: GlobalConfig = {
  free_mode_enabled: true,
};

export function useAppSettings(): UseAppSettingsResult {
  const { user } = useAuth();
  const { isAdmin } = useRBAC();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [globalConfig, setGlobalConfig] = useState<GlobalConfig>(DEFAULT_CONFIG);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "global_config")
        .single();

      if (fetchError) {
        // If not found, use default
        if (fetchError.code === "PGRST116") {
          setGlobalConfig(DEFAULT_CONFIG);
          return;
        }
        throw fetchError;
      }

      if (data?.value && typeof data.value === "object" && !Array.isArray(data.value)) {
        const value = data.value as Record<string, unknown>;
        setGlobalConfig({
          free_mode_enabled: typeof value.free_mode_enabled === "boolean" 
            ? value.free_mode_enabled 
            : DEFAULT_CONFIG.free_mode_enabled,
        });
      }
    } catch (err: any) {
      console.error("Failed to fetch app settings:", err);
      setError(err.message);
      // Fallback to default
      setGlobalConfig(DEFAULT_CONFIG);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateFreeModeEnabled = useCallback(async (enabled: boolean): Promise<boolean> => {
    if (!user || !isAdmin) {
      setError("Admin access required");
      return false;
    }

    try {
      const newConfig = { ...globalConfig, free_mode_enabled: enabled };

      const { error: updateError } = await supabase
        .from("app_settings")
        .update({
          value: newConfig,
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        })
        .eq("key", "global_config");

      if (updateError) throw updateError;

      // Audit log
      await writeAuditLog({
        action: "settings.free_mode_toggled",
        entity_type: "app_settings",
        entity_id: "global_config",
        before_json: { free_mode_enabled: globalConfig.free_mode_enabled },
        after_json: { free_mode_enabled: enabled },
        metadata: { enabled },
      });

      setGlobalConfig(newConfig);
      return true;
    } catch (err: any) {
      console.error("Failed to update free mode:", err);
      setError(err.message);
      return false;
    }
  }, [user, isAdmin, globalConfig]);

  return {
    loading,
    error,
    globalConfig,
    isFreeModeEnabled: globalConfig.free_mode_enabled,
    updateFreeModeEnabled,
    refetch: fetchSettings,
  };
}
