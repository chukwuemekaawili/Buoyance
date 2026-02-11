/**
 * OfflineBanner Component
 * 
 * Displays a warning when user is offline and blocks risky actions.
 */

import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export function OfflineBanner() {
  const { isOnline } = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-destructive text-destructive-foreground py-2 px-4">
      <div className="container mx-auto flex items-center justify-center gap-2 text-sm font-medium">
        <WifiOff className="h-4 w-4" />
        <span>No internet connection. Please reconnect to continue.</span>
      </div>
    </div>
  );
}
