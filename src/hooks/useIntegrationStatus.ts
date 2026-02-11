import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface IntegrationStatus {
  configured: boolean;
  provider?: string | null;
}

interface IntegrationHealth {
  payment: IntegrationStatus;
  email: IntegrationStatus;
  banking: IntegrationStatus;
  autofile?: IntegrationStatus;
}

// Cache for user integration status
let userCache: IntegrationHealth | null = null;
let userCacheTime: number = 0;

// Cache for admin integration status
let adminCache: IntegrationHealth | null = null;
let adminCacheTime: number = 0;

const CACHE_DURATION = 60000; // 1 minute

const SUPABASE_URL = "https://bajwsjrqrsglsndgtfpp.supabase.co";

/**
 * Hook for normal users - returns configured status without provider names
 */
export function useIntegrationStatus() {
  const [status, setStatus] = useState<IntegrationHealth>({
    payment: { configured: false },
    email: { configured: false },
    banking: { configured: false },
    autofile: { configured: false },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    // Return cached data if still valid
    if (userCache && Date.now() - userCacheTime < CACHE_DURATION) {
      setStatus(userCache);
      setLoading(false);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/integration-health`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch integration status');
      }

      const data = await response.json();
      userCache = data;
      userCacheTime = Date.now();
      setStatus(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching integration status:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      // Don't crash UI - return false for all
      setStatus({
        payment: { configured: false },
        email: { configured: false },
        banking: { configured: false },
        autofile: { configured: false },
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Computed convenience property for autofile
  const autofileConfigured = status.autofile?.configured || false;

  return { ...status, loading, error, refetch: fetchStatus, autofileConfigured };
}

/**
 * Hook for admin users - returns configured status WITH provider names
 */
export function useAdminIntegrationStatus() {
  const [status, setStatus] = useState<IntegrationHealth>({
    payment: { configured: false, provider: null },
    email: { configured: false, provider: null },
    banking: { configured: false, provider: null },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    // Return cached data if still valid
    if (adminCache && Date.now() - adminCacheTime < CACHE_DURATION) {
      setStatus(adminCache);
      setLoading(false);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/integration-health-admin`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.status === 403) {
        setError('Admin access required');
        setLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch admin integration status');
      }

      const data = await response.json();
      adminCache = data;
      adminCacheTime = Date.now();
      setStatus(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching admin integration status:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return { ...status, loading, error, refetch: fetchStatus };
}

/**
 * Invalidate both caches - call after admin updates secrets
 */
export function invalidateIntegrationCache() {
  userCache = null;
  userCacheTime = 0;
  adminCache = null;
  adminCacheTime = 0;
}
