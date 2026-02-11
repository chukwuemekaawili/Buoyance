import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Search, Shield, ChevronLeft, ChevronRight, FileText } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { useRBAC } from "@/hooks/useRBAC";
import { AuthGuard } from "@/components/AuthGuard";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface AuditLog {
  id: string;
  actor_user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  before_json: unknown;
  after_json: unknown;
  metadata: unknown;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

const PAGE_SIZE = 20;

function AuditLogsContent() {
  const { user } = useAuth();
  const { isAdmin, isAuditor } = useRBAC();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const [uniqueActions, setUniqueActions] = useState<string[]>([]);
  const [uniqueEntities, setUniqueEntities] = useState<string[]>([]);

  // Fetch audit logs
  useEffect(() => {
    async function fetchLogs() {
      if (!user || (!isAdmin && !isAuditor)) return;

      setLoading(true);
      try {
        let query = supabase
          .from("audit_logs")
          .select("*", { count: "exact" })
          .order("created_at", { ascending: false })
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

        if (actionFilter !== "all") {
          query = query.eq("action", actionFilter);
        }

        if (entityFilter !== "all") {
          query = query.eq("entity_type", entityFilter);
        }

        if (searchQuery) {
          query = query.or(`action.ilike.%${searchQuery}%,entity_type.ilike.%${searchQuery}%,entity_id.ilike.%${searchQuery}%`);
        }

        const { data, error, count } = await query;

        if (error) throw error;

        setLogs(data || []);
        setTotalCount(count || 0);

        // Fetch unique values for filters (only on first load)
        if (uniqueActions.length === 0) {
          const { data: actionsData } = await supabase
            .from("audit_logs")
            .select("action")
            .order("action");
          
          if (actionsData) {
            const actions = [...new Set(actionsData.map((a) => a.action))];
            setUniqueActions(actions);
          }
        }

        if (uniqueEntities.length === 0) {
          const { data: entitiesData } = await supabase
            .from("audit_logs")
            .select("entity_type")
            .order("entity_type");
          
          if (entitiesData) {
            const entities = [...new Set(entitiesData.map((e) => e.entity_type))];
            setUniqueEntities(entities);
          }
        }
      } catch (err) {
        console.error("Error fetching audit logs:", err);
      } finally {
        setLoading(false);
      }
    }

    if (isAdmin || isAuditor) {
      fetchLogs();
    }
  }, [user, isAdmin, isAuditor, page, actionFilter, entityFilter, searchQuery]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 pt-20 md:pt-28 pb-12">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <h1 className="text-3xl font-bold">Audit Logs</h1>
            </div>
            <p className="text-muted-foreground">
              View all privileged actions and system events
            </p>
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
                <div>
                  <CardTitle>Activity Log</CardTitle>
                  <CardDescription>
                    {totalCount} total entries
                  </CardDescription>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setPage(0);
                      }}
                      className="pl-9 w-[200px]"
                    />
                  </div>

                  <Select
                    value={actionFilter}
                    onValueChange={(value) => {
                      setActionFilter(value);
                      setPage(0);
                    }}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Actions</SelectItem>
                      {uniqueActions.map((action) => (
                        <SelectItem key={action} value={action}>
                          {action}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={entityFilter}
                    onValueChange={(value) => {
                      setEntityFilter(value);
                      setPage(0);
                    }}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by entity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Entities</SelectItem>
                      {uniqueEntities.map((entity) => (
                        <SelectItem key={entity} value={entity}>
                          {entity}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : logs.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-1">No audit logs found</h3>
                  <p className="text-muted-foreground">
                    {searchQuery || actionFilter !== "all" || entityFilter !== "all"
                      ? "Try adjusting your filters"
                      : "Audit logs will appear here as actions are performed"}
                  </p>
                </div>
              ) : (
                <>
                  <ScrollArea className="w-full">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Timestamp</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead>Entity</TableHead>
                          <TableHead>Entity ID</TableHead>
                          <TableHead>Actor</TableHead>
                          <TableHead>Details</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {logs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="whitespace-nowrap">
                              <span className="text-sm font-mono">
                                {format(new Date(log.created_at), "yyyy-MM-dd HH:mm:ss")}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{log.action}</Badge>
                            </TableCell>
                            <TableCell>
                              <span className="font-medium">{log.entity_type}</span>
                            </TableCell>
                            <TableCell>
                              <code className="text-xs bg-muted px-2 py-1 rounded">
                                {log.entity_id || "—"}
                              </code>
                            </TableCell>
                            <TableCell>
                              <code className="text-xs bg-muted px-2 py-1 rounded">
                                {log.actor_user_id?.slice(0, 8) || "system"}...
                              </code>
                            </TableCell>
                            <TableCell>
                              {(log.before_json || log.after_json) && (
                                <details className="cursor-pointer">
                                  <summary className="text-xs text-primary">View changes</summary>
                                  <div className="mt-2 text-xs font-mono bg-muted p-2 rounded max-w-xs overflow-auto">
                                    {log.before_json && (
                                      <div className="mb-2">
                                        <span className="text-destructive">Before:</span>
                                        <pre>{JSON.stringify(log.before_json, null, 2)}</pre>
                                      </div>
                                    )}
                                    {log.after_json && (
                                      <div>
                                        <span className="text-secondary">After:</span>
                                        <pre>{JSON.stringify(log.after_json, null, 2)}</pre>
                                      </div>
                                    )}
                                  </div>
                                </details>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>

                  {/* Pagination */}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Showing {page * PAGE_SIZE + 1} - {Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                        disabled={page === 0}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => p + 1)}
                        disabled={page >= totalPages - 1}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function AuditLogs() {
  return (
    <AuthGuard requireAdmin>
      <AuditLogsContent />
    </AuthGuard>
  );
}
