import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useRBAC, AppRole } from "@/hooks/useRBAC";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Search, Users, Shield, ArrowLeft, UserCog, UsersRound } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { fetchAdminUsersList, setUserRole, bulkSetUserRoles, AdminUser } from "@/lib/adminService";
import { Link } from "react-router-dom";

const ALL_ROLES: AppRole[] = [
  "individual",
  "freelancer",
  "sme",
  "corporate",
  "accountant",
  "admin",
  "auditor",
];

function getRoleBadgeColor(role: AppRole | null) {
  switch (role) {
    case "admin":
      return "bg-red-600/10 text-red-600 border-red-600/20";
    case "auditor":
      return "bg-purple-600/10 text-purple-600 border-purple-600/20";
    case "accountant":
      return "bg-blue-600/10 text-blue-600 border-blue-600/20";
    case "corporate":
      return "bg-amber-600/10 text-amber-600 border-amber-600/20";
    case "sme":
      return "bg-emerald-600/10 text-emerald-600 border-emerald-600/20";
    case "freelancer":
      return "bg-cyan-600/10 text-cyan-600 border-cyan-600/20";
    default:
      return "bg-muted text-muted-foreground border-muted";
  }
}

export default function AdminUsers() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isAuditor, loading: rbacLoading } = useRBAC();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  // Selection for bulk actions
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());

  // Role change dialog (single user)
  const [roleChangeTarget, setRoleChangeTarget] = useState<AdminUser | null>(null);
  const [newRoleSelection, setNewRoleSelection] = useState<AppRole>("individual");
  const [isUpdating, setIsUpdating] = useState(false);

  // Bulk role change dialog
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [bulkNewRole, setBulkNewRole] = useState<AppRole>("individual");
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  useEffect(() => {
    if (!authLoading && !rbacLoading) {
      if (!user) {
        navigate("/signin");
      } else if (!isAdmin && !isAuditor) {
        navigate("/");
        toast({
          title: "Access Denied",
          description: "You do not have permission to view this page.",
          variant: "destructive",
        });
      }
    }
  }, [user, authLoading, rbacLoading, isAdmin, isAuditor, navigate, toast]);

  useEffect(() => {
    if (user && (isAdmin || isAuditor)) {
      loadUsers();
    }
  }, [user, isAdmin, isAuditor]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchAdminUsersList();
      setUsers(data);
      setSelectedUserIds(new Set());
    } catch (err: any) {
      setError(err.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Search filter (now includes email)
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        u.display_name?.toLowerCase().includes(searchLower) ||
        u.email?.toLowerCase().includes(searchLower) ||
        u.user_id.toLowerCase().includes(searchLower);

      // Role filter
      const matchesRole =
        roleFilter === "all" || u.assigned_role === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [users, searchQuery, roleFilter]);

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedUserIds.size === filteredUsers.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(filteredUsers.map((u) => u.user_id)));
    }
  };

  const openRoleChangeDialog = (targetUser: AdminUser) => {
    setRoleChangeTarget(targetUser);
    setNewRoleSelection(targetUser.assigned_role || "individual");
  };

  const handleRoleChange = async () => {
    if (!roleChangeTarget) return;

    setIsUpdating(true);
    try {
      const result = await setUserRole(roleChangeTarget.user_id, newRoleSelection);
      
      toast({
        title: "Role Updated",
        description: `Changed role from "${result.previous_role}" to "${result.new_role}"`,
      });

      setRoleChangeTarget(null);
      loadUsers();
    } catch (err: any) {
      toast({
        title: "Failed to update role",
        description: err.message || "An error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleBulkRoleChange = async () => {
    if (selectedUserIds.size === 0) return;

    setIsBulkUpdating(true);
    try {
      const result = await bulkSetUserRoles(Array.from(selectedUserIds), bulkNewRole);
      
      toast({
        title: "Roles Updated",
        description: `Successfully updated ${result.updated_count} user(s) to "${result.new_role}"`,
      });

      setShowBulkDialog(false);
      setSelectedUserIds(new Set());
      loadUsers();
    } catch (err: any) {
      toast({
        title: "Failed to update roles",
        description: err.message || "An error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsBulkUpdating(false);
    }
  };

  if (authLoading || rbacLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-grow pt-20 md:pt-28 pb-16">
        <div className="container mx-auto px-4 md:px-6 max-w-6xl">
          <div className="mb-8">
            <Link
              to="/"
              className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Link>
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold text-foreground">User Management</h1>
                <p className="text-muted-foreground mt-1">
                  {isAdmin ? "Manage user roles and permissions" : "View user roles (read-only)"}
                </p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email or user ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {ALL_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Bulk Actions Bar */}
          {isAdmin && selectedUserIds.size > 0 && (
            <Card className="mb-4 border-primary/50 bg-primary/5">
              <CardContent className="py-3">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <span className="text-sm font-medium">
                    {selectedUserIds.size} user(s) selected
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedUserIds(new Set())}
                    >
                      Clear Selection
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setShowBulkDialog(true)}
                    >
                      <UsersRound className="h-4 w-4 mr-1" />
                      Change Role
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Users Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Users ({filteredUsers.length})
              </CardTitle>
              <CardDescription>
                {isAdmin
                  ? "Select multiple users for bulk actions or click change role for individual changes"
                  : "You have read-only access to this page"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : error ? (
                <div className="text-center py-12">
                  <p className="text-destructive mb-4">{error}</p>
                  <Button onClick={loadUsers}>Try Again</Button>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No users found matching your criteria.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {isAdmin && (
                          <TableHead className="w-12">
                            <Checkbox
                              checked={selectedUserIds.size === filteredUsers.length && filteredUsers.length > 0}
                              onCheckedChange={toggleSelectAll}
                              aria-label="Select all"
                            />
                          </TableHead>
                        )}
                        <TableHead>User</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>User Type</TableHead>
                        <TableHead>Assigned Role</TableHead>
                        <TableHead>Created</TableHead>
                        {isAdmin && <TableHead className="text-right">Action</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((u) => (
                        <TableRow key={u.user_id} className={selectedUserIds.has(u.user_id) ? "bg-muted/50" : ""}>
                          {isAdmin && (
                            <TableCell>
                              <Checkbox
                                checked={selectedUserIds.has(u.user_id)}
                                onCheckedChange={() => toggleUserSelection(u.user_id)}
                                aria-label={`Select ${u.display_name || "user"}`}
                              />
                            </TableCell>
                          )}
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {u.display_name || "Unnamed User"}
                              </p>
                              <p className="text-xs text-muted-foreground font-mono">
                                {u.user_id.slice(0, 8)}...
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {u.email || "—"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {u.user_type || "individual"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`capitalize ${getRoleBadgeColor(u.assigned_role)}`}
                            >
                              {u.assigned_role || "individual"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {format(new Date(u.created_at), "MMM d, yyyy")}
                          </TableCell>
                          {isAdmin && (
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openRoleChangeDialog(u)}
                              >
                                <UserCog className="h-4 w-4 mr-1" />
                                Change Role
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />

      {/* Single User Role Change Dialog */}
      <AlertDialog
        open={!!roleChangeTarget}
        onOpenChange={() => setRoleChangeTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change User Role</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p className="mb-4">
                  Update the role for{" "}
                  <strong>{roleChangeTarget?.display_name || "this user"}</strong>
                  {roleChangeTarget?.email && (
                    <span className="text-muted-foreground"> ({roleChangeTarget.email})</span>
                  )}
                </p>
                <p className="text-sm text-muted-foreground mb-2">
                  Current role:{" "}
                  <Badge
                    variant="outline"
                    className={`capitalize ${getRoleBadgeColor(roleChangeTarget?.assigned_role || null)}`}
                  >
                    {roleChangeTarget?.assigned_role || "individual"}
                  </Badge>
                </p>
                <Select
                  value={newRoleSelection}
                  onValueChange={(val) => setNewRoleSelection(val as AppRole)}
                >
                  <SelectTrigger className="w-full mt-4">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRoleChange}
              disabled={isUpdating || newRoleSelection === roleChangeTarget?.assigned_role}
            >
              {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update Role
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Role Change Dialog */}
      <AlertDialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bulk Role Change</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p className="mb-4">
                  Change the role for <strong>{selectedUserIds.size} selected user(s)</strong>.
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  This action will be logged for each user.
                </p>
                <Select
                  value={bulkNewRole}
                  onValueChange={(val) => setBulkNewRole(val as AppRole)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select new role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkRoleChange}
              disabled={isBulkUpdating}
            >
              {isBulkUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update {selectedUserIds.size} User(s)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
