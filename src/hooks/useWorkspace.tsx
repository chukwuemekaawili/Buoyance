import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";

export type WorkspaceRole = "Owner" | "Admin" | "Member" | "External_Accountant";

export interface Workspace {
    id: string;
    name: string;
    entity_type: string;
    tin: string | null;
    rc_number: string | null;
    role: WorkspaceRole;
}

interface WorkspaceContextType {
    workspaces: Workspace[];
    activeWorkspace: Workspace | null;
    setActiveWorkspaceId: (id: string) => void;
    isLoading: boolean;
    refreshWorkspaces: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const { toast } = useToast();

    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchWorkspaces = async () => {
        if (!user) {
            setWorkspaces([]);
            setActiveWorkspace(null);
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);

            // 1. Fetch user's workspaces via the junction table
            const { data: userWorkspaces, error } = await supabase
                .from('workspace_users')
                .select(`
          role,
          organizations (
            id,
            name,
            entity_type,
            tin,
            rc_number
          )
        `)
                .eq('user_id', user.id);

            if (error) throw error;

            const formattedWorkspaces: Workspace[] = (userWorkspaces || [])
                .map(uw => {
                    const org = uw.organizations as any; // Type assertion needed due to join
                    if (!org) return null;
                    return {
                        id: org.id,
                        name: org.name,
                        entity_type: org.entity_type,
                        tin: org.tin,
                        rc_number: org.rc_number,
                        role: uw.role as WorkspaceRole,
                    };
                })
                .filter((w): w is Workspace => w !== null);

            setWorkspaces(formattedWorkspaces);

            // 2. Fetch or determine the active workspace
            // Try to get their default from profile
            const { data: profile } = await supabase
                .from('profiles')
                .select('default_workspace_id')
                .eq('id', user.id)
                .maybeSingle();

            const defaultId = profile?.default_workspace_id;

            if (formattedWorkspaces.length > 0) {
                // Find default or fallback to first
                const active = formattedWorkspaces.find(w => w.id === defaultId) || formattedWorkspaces[0];
                // Only set if different to avoid unnecessary re-renders
                setActiveWorkspace(current => current?.id === active.id ? current : active);
            } else {
                setActiveWorkspace(null);
            }

        } catch (error: any) {
            console.error("Error fetching workspaces:", error);
            toast({
                title: "Workspace Error",
                description: "Failed to load your workspaces. Please reload the page.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchWorkspaces();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    const setActiveWorkspaceId = async (id: string) => {
        const target = workspaces.find(w => w.id === id);
        if (!target) return;

        setActiveWorkspace(target);

        // Attempt to persist this choice as their new default
        if (user) {
            await supabase
                .from('profiles')
                .update({ default_workspace_id: id })
                .eq('id', user.id);
        }
    };

    return (
        <WorkspaceContext.Provider value={{
            workspaces,
            activeWorkspace,
            setActiveWorkspaceId,
            isLoading,
            refreshWorkspaces: fetchWorkspaces
        }}>
            {children}
        </WorkspaceContext.Provider>
    );
}

export function useWorkspace() {
    const context = useContext(WorkspaceContext);
    if (context === undefined) {
        throw new Error("useWorkspace must be used within a WorkspaceProvider");
    }
    return context;
}
