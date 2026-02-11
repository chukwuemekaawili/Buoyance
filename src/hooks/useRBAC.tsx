import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { useAuth } from "./useAuth";
import { supabase } from "@/integrations/supabase/client";

// Define types matching the database enums
export type AppRole = 
  | "individual"
  | "freelancer"
  | "sme"
  | "corporate"
  | "accountant"
  | "admin"
  | "auditor";

export type AppPermission =
  | "calculator.use"
  | "calculation.save"
  | "calculation.view_own"
  | "calculation.view_all"
  | "filing.create"
  | "filing.submit"
  | "filing.view_own"
  | "filing.view_all"
  | "payment.create"
  | "payment.view_own"
  | "payment.view_all"
  | "tax_rules.view"
  | "tax_rules.publish"
  | "audit.view"
  | "audit.export"
  | "user.manage"
  | "role.assign";

interface RBACContextType {
  role: AppRole | null;
  permissions: AppPermission[];
  loading: boolean;
  hasPermission: (permission: AppPermission) => boolean;
  hasRole: (role: AppRole) => boolean;
  isAdmin: boolean;
  isAuditor: boolean;
  refreshRole: () => Promise<void>;
}

const RBACContext = createContext<RBACContextType | undefined>(undefined);

export function RBACProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [permissions, setPermissions] = useState<AppPermission[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUserRole = useCallback(async () => {
    if (!user) {
      setRole(null);
      setPermissions([]);
      setLoading(false);
      return;
    }

    try {
      // Fetch user's role
      const { data: userRoleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (roleError) {
        console.error("Error fetching user role:", roleError);
        setRole("individual"); // Default fallback
      } else if (userRoleData) {
        setRole(userRoleData.role as AppRole);
      } else {
        // No role found, user might need onboarding
        setRole(null);
      }

      // Fetch permissions for the role
      const currentRole = userRoleData?.role || "individual";
      const { data: permissionsData, error: permError } = await supabase
        .from("role_permissions")
        .select("permission_key")
        .eq("role_name", currentRole);

      if (permError) {
        console.error("Error fetching permissions:", permError);
        setPermissions([]);
      } else {
        setPermissions(
          (permissionsData || []).map((p) => p.permission_key as AppPermission)
        );
      }
    } catch (err) {
      console.error("RBAC fetch error:", err);
      setRole("individual");
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      fetchUserRole();
    }
  }, [authLoading, fetchUserRole]);

  const hasPermission = useCallback(
    (permission: AppPermission) => permissions.includes(permission),
    [permissions]
  );

  const hasRole = useCallback(
    (checkRole: AppRole) => role === checkRole,
    [role]
  );

  const isAdmin = role === "admin";
  const isAuditor = role === "auditor";

  return (
    <RBACContext.Provider
      value={{
        role,
        permissions,
        loading,
        hasPermission,
        hasRole,
        isAdmin,
        isAuditor,
        refreshRole: fetchUserRole,
      }}
    >
      {children}
    </RBACContext.Provider>
  );
}

export function useRBAC() {
  const context = useContext(RBACContext);
  if (context === undefined) {
    throw new Error("useRBAC must be used within an RBACProvider");
  }
  return context;
}
