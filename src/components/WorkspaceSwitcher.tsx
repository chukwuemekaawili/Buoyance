import { ChevronDown, Building2, User, Plus, Check, LayoutDashboard, Settings, LogOut } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export function WorkspaceSwitcher({ className }: { className?: string }) {
    const { workspaces, activeWorkspace, setActiveWorkspaceId, isLoading } = useWorkspace();
    const { signOut } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();

    const handleSignOut = async () => {
        await signOut();
        toast({
            title: "Signed out",
            description: "You have been signed out successfully.",
        });
        navigate("/");
    };

    if (isLoading) {
        return <Skeleton className={cn("h-9 w-[180px] rounded-md", className)} />;
    }

    if (!activeWorkspace || workspaces.length === 0) {
        return null;
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-between", className)}>
                    <span className="flex items-center gap-2 truncate">
                        {activeWorkspace.entity_type === 'Individual' ? (
                            <User className="h-4 w-4 opacity-70 shrink-0" />
                        ) : (
                            <Building2 className="h-4 w-4 opacity-70 shrink-0" />
                        )}
                        <span className="truncate text-inherit">{activeWorkspace.name}</span>
                    </span>
                    <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[220px]" align="end">
                <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider">
                    Accounts
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                    {workspaces.map((ws) => (
                        <DropdownMenuItem
                            key={ws.id}
                            onSelect={() => setActiveWorkspaceId(ws.id)}
                            className="flex items-center justify-between cursor-pointer"
                        >
                            <div className="flex items-center gap-2 truncate">
                                {ws.entity_type === 'Individual' ? (
                                    <User className="h-4 w-4 text-muted-foreground shrink-0" />
                                ) : (
                                    <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                                )}
                                <span className="truncate">{ws.name}</span>
                            </div>
                            {activeWorkspace.id === ws.id && (
                                <Check className="h-4 w-4 shrink-0 px-2" />
                            )}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link to="/dashboard" className="flex items-center gap-2 cursor-pointer">
                        <LayoutDashboard className="h-4 w-4" />
                        Dashboard
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link to="/settings" className="flex items-center gap-2 cursor-pointer">
                        <Settings className="h-4 w-4" />
                        Settings
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    onSelect={handleSignOut}
                    className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
                >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
