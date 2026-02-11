import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/hooks/useRBAC";

export interface AdminUser {
  user_id: string;
  display_name: string | null;
  user_type: AppRole | null;
  created_at: string;
  assigned_role: AppRole | null;
  email: string | null;
}

export interface SetUserRoleResult {
  success: boolean;
  previous_role: string;
  new_role: string;
  target_user_id: string;
}

/**
 * Fetches the list of users for admin management.
 * Only accessible by admins and auditors via the RPC function.
 */
export async function fetchAdminUsersList(): Promise<AdminUser[]> {
  const { data, error } = await supabase.rpc("get_admin_users_list");

  if (error) {
    console.error("Failed to fetch users list:", error);
    throw new Error(error.message || "Failed to fetch users");
  }

  return (data || []) as AdminUser[];
}

/**
 * Sets a user's role via secure RPC function.
 * Only accessible by admins. Automatically logs the action.
 */
export async function setUserRole(
  targetUserId: string,
  newRole: AppRole
): Promise<SetUserRoleResult> {
  const { data, error } = await supabase.rpc("admin_set_user_role", {
    target_user_id: targetUserId,
    new_role: newRole,
  });

  if (error) {
    console.error("Failed to set user role:", error);
    throw new Error(error.message || "Failed to update role");
  }

  return data as unknown as SetUserRoleResult;
}

export interface BulkSetUserRolesResult {
  success: boolean;
  updated_count: number;
  new_role: string;
}

/**
 * Sets multiple users' roles via secure RPC function.
 * Only accessible by admins. Automatically logs each action.
 */
export async function bulkSetUserRoles(
  targetUserIds: string[],
  newRole: AppRole
): Promise<BulkSetUserRolesResult> {
  const { data, error } = await supabase.rpc("admin_bulk_set_user_roles", {
    target_user_ids: targetUserIds,
    new_role: newRole,
  });

  if (error) {
    console.error("Failed to bulk set user roles:", error);
    throw new Error(error.message || "Failed to update roles");
  }

  return data as unknown as BulkSetUserRolesResult;
}
