import { ReactNode, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useRBAC } from "@/hooks/useRBAC";
import { Loader2 } from "lucide-react";

interface AuthGuardProps {
  children: ReactNode;
  /** If true, requires admin or auditor role */
  requireAdmin?: boolean;
  /** If true, requires only admin role (not auditor) */
  requireAdminOnly?: boolean;
  /** Custom loading component */
  loadingComponent?: ReactNode;
  /** Custom access denied component */
  accessDeniedComponent?: ReactNode;
}

const REDIRECT_KEY = "auth_redirect_path";

/**
 * Saves the current path to sessionStorage for redirect after login
 */
export function saveRedirectPath(path: string) {
  // Don't save auth-related paths
  if (["/signin", "/signup", "/forgot-password", "/reset-password"].includes(path)) {
    return;
  }
  sessionStorage.setItem(REDIRECT_KEY, path);
}

/**
 * Gets and clears the saved redirect path
 */
export function getAndClearRedirectPath(): string | null {
  const path = sessionStorage.getItem(REDIRECT_KEY);
  sessionStorage.removeItem(REDIRECT_KEY);
  return path;
}

/**
 * Default loading spinner component
 */
function DefaultLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

/**
 * Reusable authentication guard component.
 * Handles loading states, redirects unauthenticated users to sign-in,
 * and optionally checks for admin/auditor roles.
 */
export function AuthGuard({
  children,
  requireAdmin = false,
  requireAdminOnly = false,
  loadingComponent,
  accessDeniedComponent,
}: AuthGuardProps) {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isAuditor, loading: rbacLoading } = useRBAC();
  const navigate = useNavigate();
  const location = useLocation();

  const needsRbac = requireAdmin || requireAdminOnly;
  const isLoading = authLoading || (needsRbac && rbacLoading);

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      // Save current path for redirect after login
      saveRedirectPath(location.pathname + location.search);
      navigate("/signin");
      return;
    }

    // Check role requirements
    if (requireAdminOnly && !isAdmin) {
      navigate("/");
      return;
    }

    if (requireAdmin && !isAdmin && !isAuditor) {
      navigate("/");
      return;
    }
  }, [user, isLoading, isAdmin, isAuditor, requireAdmin, requireAdminOnly, navigate, location]);

  // Show loading state
  if (isLoading) {
    return <>{loadingComponent || <DefaultLoader />}</>;
  }

  // Not authenticated
  if (!user) {
    return null;
  }

  // Check admin access
  if (requireAdminOnly && !isAdmin) {
    return (
      accessDeniedComponent || (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <p className="text-muted-foreground">Access denied. Admin privileges required.</p>
        </div>
      )
    );
  }

  if (requireAdmin && !isAdmin && !isAuditor) {
    return (
      accessDeniedComponent || (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <p className="text-muted-foreground">Access denied. Admin or auditor privileges required.</p>
        </div>
      )
    );
  }

  return <>{children}</>;
}
