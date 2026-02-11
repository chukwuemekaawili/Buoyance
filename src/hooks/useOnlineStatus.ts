/**
 * useOnlineStatus Hook
 * 
 * Tracks network connectivity status for offline safety.
 */

import { useState, useEffect, useCallback } from "react";

interface UseOnlineStatusResult {
  isOnline: boolean;
  wasOffline: boolean;
}

export function useOnlineStatus(): UseOnlineStatusResult {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [wasOffline, setWasOffline] = useState(false);

  const handleOnline = useCallback(() => {
    setIsOnline(true);
  }, []);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
    setWasOffline(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial check
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [handleOnline, handleOffline]);

  return {
    isOnline,
    wasOffline,
  };
}
