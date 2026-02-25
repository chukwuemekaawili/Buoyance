import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, UserPlus, Mail, ShieldAlert, XCircle, Users } from "lucide-react";

interface WorkspaceUser {
    user_id: string;
    role: string;
    email?: string;
    joined_at: string;
}

interface PendingInvite {
    id: string;
    email: string;
    role: string;
    created_at: string;
    expires_at: string;
}

export function TeamSettingsCard() {
    const { user } = useAuth();
    const { activeWorkspace } = useWorkspace();
    const { toast } = useToast();

    const [members, setMembers] = useState<WorkspaceUser[]>([]);
    const [invites, setInvites] = useState<PendingInvite[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Invite Form State
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState("External_Accountant");
    const [isInviting, setIsInviting] = useState(false);

    // Check Permissions
    const isAdmin = activeWorkspace?.role === "Owner" || activeWorkspace?.role === "Admin";

    const fetchTeamData = async () => {
        if (!activeWorkspace) return;
        setIsLoading(true);

        try {
            // 1. Fetch active members
            const { data: membersData, error: membersErr } = await supabase
                .from("workspace_users")
                .select(`
          user_id,
          role,
          accepted_at,
          profiles:user_id ( id )
        `)
                .eq("workspace_id", activeWorkspace.id);

            if (membersErr) throw membersErr;

            // In a real app we'd join auth.users via an edge function to get emails. 
            // For now we map what we have or just show user_id if we can't expose emails via client constraints.
            const mappedMembers = (membersData || []).map(m => ({
                user_id: m.user_id,
                role: m.role,
                email: m.user_id === user?.id ? user?.email : "User (Hidden)", // RLS hides auth emails for other users
                joined_at: m.accepted_at || new Date().toISOString()
            }));

            setMembers(mappedMembers);

            // 2. Fetch pending invites
            const { data: invitesData, error: invitesErr } = await supabase
                .from("workspace_invitations")
                .select("*")
                .eq("workspace_id", activeWorkspace.id)
                .eq("status", "pending");

            if (invitesErr && invitesErr.code !== '42P01') {
                throw invitesErr;
            }

            setInvites(invitesData || []);
        } catch (err: any) {
            console.error("Failed to load team:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTeamData();
    }, [activeWorkspace]);

    const handleInvite = async () => {
        if (!activeWorkspace || !inviteEmail.trim()) return;

        setIsInviting(true);
        try {
            const { error } = await supabase
                .from('workspace_invitations')
                .insert({
                    workspace_id: activeWorkspace.id,
                    email: inviteEmail.trim().toLowerCase(),
                    role: inviteRole,
                    invoker_id: user?.id
                });

            if (error) {
                if (error.code === '23505') {
                    throw new Error("A pending invitation already exists for this email.");
                }
                throw error;
            }

            toast({
                title: "Invitation Sent",
                description: `Successfully invited ${inviteEmail} as an ${inviteRole.replace('_', ' ')}. They will receive a join link.`,
            });

            setInviteEmail("");
            setIsInviteOpen(false);
            fetchTeamData();
        } catch (err: any) {
            toast({
                title: "Invitation Failed",
                description: err.message,
                variant: "destructive"
            });
        } finally {
            setIsInviting(false);
        }
    };

    const handleRevoke = async (inviteId: string) => {
        if (!activeWorkspace) return;

        try {
            const { error } = await supabase
                .from('workspace_invitations')
                .update({ status: 'revoked' })
                .eq('id', inviteId)
                .eq('workspace_id', activeWorkspace.id);

            if (error) throw error;

            toast({ title: "Invitation Revoked" });
            fetchTeamData();
        } catch (err: any) {
            toast({ title: "Failed to revoke", description: err.message, variant: "destructive" });
        }
    };

    return (
        <Card className="shadow-none border-border">
            <CardHeader className="flex flex-row items-start justify-between">
                <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" />
                        Workspace Team
                    </CardTitle>
                    <CardDescription>
                        Manage who has access to {activeWorkspace?.name || 'this workspace'}.
                        External Accountants have read-only or filing preparation access.
                    </CardDescription>
                </div>
                {isAdmin && (
                    <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <UserPlus className="h-4 w-4 mr-2" />
                                Invite Member
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Invite to Workspace</DialogTitle>
                                <DialogDescription>
                                    Send an email invitation allowing a user to access the {activeWorkspace?.name} tax records.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Email Address</Label>
                                    <Input
                                        type="email"
                                        placeholder="accountant@example.com"
                                        value={inviteEmail}
                                        onChange={(e) => setInviteEmail(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Role</Label>
                                    <Select value={inviteRole} onValueChange={setInviteRole}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Admin">Admin (Full Control)</SelectItem>
                                            <SelectItem value="Member">Member (Edit Access)</SelectItem>
                                            <SelectItem value="External_Accountant">External Accountant (Audit/File Only)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {inviteRole === "External_Accountant" && (
                                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                            <ShieldAlert className="h-3 w-3" />
                                            Accountants cannot delete the workspace or alter billing settings.
                                        </p>
                                    )}
                                </div>
                            </div>

                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsInviteOpen(false)}>Cancel</Button>
                                <Button onClick={handleInvite} disabled={isInviting || !inviteEmail}>
                                    {isInviting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
                                    Send Invitation
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )}
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="py-8 flex justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Active Members Table */}
                        <div>
                            <h3 className="text-sm font-medium mb-3">Active Members</h3>
                            <div className="border rounded-md overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-muted/50">
                                        <TableRow>
                                            <TableHead>User / Email</TableHead>
                                            <TableHead>Role</TableHead>
                                            <TableHead>Joined</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {members.map((m) => (
                                            <TableRow key={m.user_id}>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-8 w-8 rounded-full bg-secondary/20 flex items-center justify-center text-xs font-bold text-secondary">
                                                            {(m.email || "?")[0].toUpperCase()}
                                                        </div>
                                                        <span className={m.email?.includes("Hidden") ? 'text-muted-foreground italic text-sm' : 'font-medium'}>
                                                            {m.email} {m.user_id === user?.id && "(You)"}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={m.role === 'Owner' ? 'default' : m.role === 'External_Accountant' ? 'secondary' : 'outline'}>
                                                        {m.role.replace('_', ' ')}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {new Date(m.joined_at).toLocaleDateString()}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>

                        {/* Pending Invites Table */}
                        {invites.length > 0 && (
                            <div>
                                <h3 className="text-sm font-medium mb-3 flex items-center gap-2 text-amber-700 dark:text-amber-500">
                                    Pending Invitations
                                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">{invites.length}</Badge>
                                </h3>
                                <div className="border border-amber-500/20 rounded-md overflow-hidden">
                                    <Table>
                                        <TableHeader className="bg-amber-500/5">
                                            <TableRow>
                                                <TableHead>Invited Email</TableHead>
                                                <TableHead>Role</TableHead>
                                                <TableHead>Sent On</TableHead>
                                                <TableHead className="text-right">Action</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {invites.map((inv) => (
                                                <TableRow key={inv.id}>
                                                    <TableCell className="font-medium">{inv.email}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className="text-xs">
                                                            {inv.role.replace('_', ' ')}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-sm text-muted-foreground">
                                                        {new Date(inv.created_at).toLocaleDateString()}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {isAdmin && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-destructive hover:bg-destructive/10 hover:text-destructive h-8 px-2"
                                                                onClick={() => handleRevoke(inv.id)}
                                                            >
                                                                <XCircle className="h-4 w-4 mr-1" />
                                                                Revoke
                                                            </Button>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
