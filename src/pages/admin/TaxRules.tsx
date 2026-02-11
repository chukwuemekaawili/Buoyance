import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Search, Shield, Plus, Edit, Archive, CheckCircle, XCircle, Eye, GitCompare, BookOpen } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { useRBAC } from "@/hooks/useRBAC";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { writeAuditLog, AuditActions } from "@/lib/auditLog";
import { TaxRuleDiffView } from "@/components/admin/TaxRuleDiffView";
const TAX_TYPES = ["PIT", "CIT", "VAT", "WHT", "CGT"] as const;
type TaxType = typeof TAX_TYPES[number];

interface TaxRule {
  id: string;
  tax_type: string;
  version: string;
  effective_date: string;
  law_reference_json: {
    act: string;
    section: string;
    effective: string;
  };
  rules_json: Record<string, unknown>;
  published: boolean;
  archived: boolean;
  created_at: string;
}

interface RuleFormData {
  tax_type: TaxType;
  version: string;
  effective_date: string;
  law_reference_json: string;
  rules_json: string;
}

const defaultFormData: RuleFormData = {
  tax_type: "PIT",
  version: "",
  effective_date: new Date().toISOString().split("T")[0],
  law_reference_json: JSON.stringify({ act: "", section: "", effective: "" }, null, 2),
  rules_json: JSON.stringify({}, null, 2),
};

export default function TaxRules() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isAuditor, loading: rbacLoading } = useRBAC();
  const { toast } = useToast();

  const [rules, setRules] = useState<TaxRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [taxTypeFilter, setTaxTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDiffOpen, setIsDiffOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: "publish" | "unpublish" | "archive"; rule: TaxRule } | null>(null);
  const [selectedRule, setSelectedRule] = useState<TaxRule | null>(null);
  const [compareRule, setCompareRule] = useState<TaxRule | null>(null);
  const [formData, setFormData] = useState<RuleFormData>(defaultFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Authorization check
  useEffect(() => {
    if (!authLoading && !rbacLoading) {
      if (!user) {
        navigate("/signin");
      } else if (!isAdmin && !isAuditor) {
        navigate("/");
      }
    }
  }, [user, authLoading, rbacLoading, isAdmin, isAuditor, navigate]);

  // Fetch rules
  useEffect(() => {
    if (!rbacLoading && (isAdmin || isAuditor)) {
      fetchRules();
    }
  }, [rbacLoading, isAdmin, isAuditor]);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("tax_rules")
        .select("*")
        .order("tax_type", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRules((data || []) as unknown as TaxRule[]);
    } catch (err) {
      console.error("Error fetching rules:", err);
      toast({
        title: "Error loading rules",
        description: "Failed to load tax rules.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredRules = rules.filter((rule) => {
    if (taxTypeFilter !== "all" && rule.tax_type !== taxTypeFilter) return false;
    if (statusFilter === "published" && !rule.published) return false;
    if (statusFilter === "unpublished" && (rule.published || rule.archived)) return false;
    if (statusFilter === "archived" && !rule.archived) return false;
    if (searchQuery && !rule.version.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const validateJson = (jsonStr: string): boolean => {
    try {
      JSON.parse(jsonStr);
      setJsonError(null);
      return true;
    } catch {
      setJsonError("Invalid JSON format");
      return false;
    }
  };

  const handlePrettyPrint = (field: "law_reference_json" | "rules_json") => {
    try {
      const parsed = JSON.parse(formData[field]);
      setFormData({ ...formData, [field]: JSON.stringify(parsed, null, 2) });
      setJsonError(null);
    } catch {
      setJsonError(`Invalid JSON in ${field}`);
    }
  };

  const handleCreate = async () => {
    if (!validateJson(formData.law_reference_json) || !validateJson(formData.rules_json)) {
      return;
    }

    setIsSaving(true);
    try {
      const newRule = {
        tax_type: formData.tax_type,
        version: formData.version,
        effective_date: formData.effective_date,
        law_reference_json: JSON.parse(formData.law_reference_json),
        rules_json: JSON.parse(formData.rules_json),
        published: false,
        archived: false,
      };

      const { data, error } = await supabase
        .from("tax_rules")
        .insert(newRule)
        .select()
        .single();

      if (error) throw error;

      await writeAuditLog({
        action: AuditActions.TAX_RULE_CREATED,
        entity_type: "tax_rule",
        entity_id: data.id,
        after_json: newRule,
      });

      toast({ title: "Rule created", description: "New tax rule draft created successfully." });
      setIsCreateOpen(false);
      setFormData(defaultFormData);
      fetchRules();
    } catch (err: any) {
      toast({
        title: "Failed to create rule",
        description: err.message || "An error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedRule || !validateJson(formData.law_reference_json) || !validateJson(formData.rules_json)) {
      return;
    }

    setIsSaving(true);
    try {
      const beforeState = {
        version: selectedRule.version,
        effective_date: selectedRule.effective_date,
      };

      const updates = {
        version: formData.version,
        effective_date: formData.effective_date,
        law_reference_json: JSON.parse(formData.law_reference_json),
        rules_json: JSON.parse(formData.rules_json),
      };

      const { error } = await supabase
        .from("tax_rules")
        .update(updates)
        .eq("id", selectedRule.id);

      if (error) throw error;

      await writeAuditLog({
        action: AuditActions.TAX_RULE_UPDATED,
        entity_type: "tax_rule",
        entity_id: selectedRule.id,
        before_json: beforeState,
        after_json: updates,
      });

      toast({ title: "Rule updated", description: "Tax rule updated successfully." });
      setIsEditOpen(false);
      setSelectedRule(null);
      fetchRules();
    } catch (err: any) {
      toast({
        title: "Failed to update rule",
        description: err.message || "An error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;

    const { type, rule } = confirmAction;
    setIsSaving(true);

    try {
      if (type === "publish") {
        // Unpublish any other published rules of same tax_type first
        await supabase
          .from("tax_rules")
          .update({ published: false })
          .eq("tax_type", rule.tax_type)
          .neq("id", rule.id);

        const { error } = await supabase
          .from("tax_rules")
          .update({ published: true })
          .eq("id", rule.id);

        if (error) throw error;

        await writeAuditLog({
          action: AuditActions.TAX_RULE_PUBLISHED,
          entity_type: "tax_rule",
          entity_id: rule.id,
          before_json: { published: false },
          after_json: { published: true },
          metadata: { version: rule.version, tax_type: rule.tax_type },
        });

        toast({ title: "Rule published", description: `${rule.version} is now the active rule for ${rule.tax_type}.` });
      } else if (type === "unpublish") {
        const { error } = await supabase
          .from("tax_rules")
          .update({ published: false })
          .eq("id", rule.id);

        if (error) throw error;

        await writeAuditLog({
          action: AuditActions.TAX_RULE_UNPUBLISHED,
          entity_type: "tax_rule",
          entity_id: rule.id,
          before_json: { published: true },
          after_json: { published: false },
        });

        toast({ title: "Rule unpublished", description: `${rule.version} is no longer active.` });
      } else if (type === "archive") {
        const { error } = await supabase
          .from("tax_rules")
          .update({ archived: true, published: false })
          .eq("id", rule.id);

        if (error) throw error;

        await writeAuditLog({
          action: AuditActions.TAX_RULE_ARCHIVED,
          entity_type: "tax_rule",
          entity_id: rule.id,
          before_json: { archived: false },
          after_json: { archived: true },
        });

        toast({ title: "Rule archived", description: `${rule.version} has been archived.` });
      }

      setIsConfirmOpen(false);
      setConfirmAction(null);
      fetchRules();
    } catch (err: any) {
      toast({
        title: "Action failed",
        description: err.message || "An error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const openEdit = (rule: TaxRule) => {
    setSelectedRule(rule);
    setFormData({
      tax_type: rule.tax_type as TaxType,
      version: rule.version,
      effective_date: rule.effective_date,
      law_reference_json: JSON.stringify(rule.law_reference_json, null, 2),
      rules_json: JSON.stringify(rule.rules_json, null, 2),
    });
    setIsEditOpen(true);
  };

  const openView = (rule: TaxRule) => {
    setSelectedRule(rule);
    setIsViewOpen(true);
  };

  const openConfirm = (type: "publish" | "unpublish" | "archive", rule: TaxRule) => {
    setConfirmAction({ type, rule });
    setIsConfirmOpen(true);
  };

  const openDiff = (rule: TaxRule) => {
    setSelectedRule(rule);
    // Find another rule of the same type to compare
    const otherRules = rules.filter(r => r.tax_type === rule.tax_type && r.id !== rule.id);
    setCompareRule(otherRules[0] || null);
    setIsDiffOpen(true);
  };

  if (authLoading || rbacLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin && !isAuditor) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 pt-20 md:pt-28 pb-12">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <h1 className="text-3xl font-bold">Tax Rules Management</h1>
              </div>
              <p className="text-muted-foreground">
                Create, edit, publish, and archive versioned tax rules
              </p>
            </div>
            {isAdmin && (
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create New Rule
              </Button>
            )}
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
                <div>
                  <CardTitle>All Tax Rules</CardTitle>
                  <CardDescription>{filteredRules.length} rules</CardDescription>
                </div>

                <div className="flex flex-wrap gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search version..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 w-[180px]"
                    />
                  </div>

                  <Select value={taxTypeFilter} onValueChange={setTaxTypeFilter}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Tax Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {TAX_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="unpublished">Unpublished</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
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
              ) : filteredRules.length === 0 ? (
                <div className="text-center py-12">
                  <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-1">No rules found</h3>
                  <p className="text-muted-foreground">
                    {searchQuery || taxTypeFilter !== "all" || statusFilter !== "all"
                      ? "Try adjusting your filters"
                      : "Create your first tax rule to get started"}
                  </p>
                </div>
              ) : (
                <ScrollArea className="w-full">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tax Type</TableHead>
                        <TableHead>Version</TableHead>
                        <TableHead>Effective Date</TableHead>
                        <TableHead>Law Reference</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRules.map((rule) => (
                        <TableRow key={rule.id} className={rule.archived ? "opacity-60" : ""}>
                          <TableCell>
                            <Badge variant="outline">{rule.tax_type}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{rule.version}</TableCell>
                          <TableCell>{format(new Date(rule.effective_date), "MMM d, yyyy")}</TableCell>
                          <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                            {rule.law_reference_json?.act} - {rule.law_reference_json?.section}
                          </TableCell>
                          <TableCell>
                            {rule.archived ? (
                              <Badge variant="secondary">Archived</Badge>
                            ) : rule.published ? (
                              <Badge className="bg-secondary text-secondary-foreground">Published</Badge>
                            ) : (
                              <Badge variant="outline">Draft</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(rule.created_at), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => openView(rule)} title="View Details">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => openDiff(rule)} title="Compare Versions">
                                <GitCompare className="h-4 w-4" />
                              </Button>
                              {isAdmin && !rule.archived && (
                                <>
                                  <Button variant="ghost" size="icon" onClick={() => openEdit(rule)} title="Edit">
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  {rule.published ? (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => openConfirm("unpublish", rule)}
                                      title="Unpublish"
                                    >
                                      <XCircle className="h-4 w-4 text-destructive" />
                                    </Button>
                                  ) : (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => openConfirm("publish", rule)}
                                      title="Publish"
                                    >
                                      <CheckCircle className="h-4 w-4 text-secondary" />
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => openConfirm("archive", rule)}
                                    title="Archive"
                                  >
                                    <Archive className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Tax Rule</DialogTitle>
            <DialogDescription>Create a new draft tax rule. It will need to be published to become active.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tax Type</Label>
                <Select value={formData.tax_type} onValueChange={(v) => setFormData({ ...formData, tax_type: v as TaxType })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TAX_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Version</Label>
                <Input
                  placeholder="e.g., PIT_2026_v1"
                  value={formData.version}
                  onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Effective Date</Label>
              <Input
                type="date"
                value={formData.effective_date}
                onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Law Reference (JSON)</Label>
                <Button type="button" variant="ghost" size="sm" onClick={() => handlePrettyPrint("law_reference_json")}>
                  Pretty Print
                </Button>
              </div>
              <Textarea
                rows={4}
                className="font-mono text-sm"
                value={formData.law_reference_json}
                onChange={(e) => setFormData({ ...formData, law_reference_json: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Rules (JSON)</Label>
                <Button type="button" variant="ghost" size="sm" onClick={() => handlePrettyPrint("rules_json")}>
                  Pretty Print
                </Button>
              </div>
              <Textarea
                rows={10}
                className="font-mono text-sm"
                value={formData.rules_json}
                onChange={(e) => setFormData({ ...formData, rules_json: e.target.value })}
              />
            </div>
            {jsonError && <p className="text-sm text-destructive">{jsonError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={isSaving || !formData.version}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Tax Rule</DialogTitle>
            <DialogDescription>Update the rule details. Changes will be logged.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tax Type</Label>
                <Input value={formData.tax_type} disabled />
              </div>
              <div className="space-y-2">
                <Label>Version</Label>
                <Input
                  value={formData.version}
                  onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Effective Date</Label>
              <Input
                type="date"
                value={formData.effective_date}
                onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Law Reference (JSON)</Label>
                <Button type="button" variant="ghost" size="sm" onClick={() => handlePrettyPrint("law_reference_json")}>
                  Pretty Print
                </Button>
              </div>
              <Textarea
                rows={4}
                className="font-mono text-sm"
                value={formData.law_reference_json}
                onChange={(e) => setFormData({ ...formData, law_reference_json: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Rules (JSON)</Label>
                <Button type="button" variant="ghost" size="sm" onClick={() => handlePrettyPrint("rules_json")}>
                  Pretty Print
                </Button>
              </div>
              <Textarea
                rows={10}
                className="font-mono text-sm"
                value={formData.rules_json}
                onChange={(e) => setFormData({ ...formData, rules_json: e.target.value })}
              />
            </div>
            {jsonError && <p className="text-sm text-destructive">{jsonError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>View Tax Rule</DialogTitle>
            <DialogDescription>{selectedRule?.version}</DialogDescription>
          </DialogHeader>
          {selectedRule && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Tax Type</Label>
                  <p className="font-medium">{selectedRule.tax_type}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Effective Date</Label>
                  <p className="font-medium">{format(new Date(selectedRule.effective_date), "MMMM d, yyyy")}</p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Status</Label>
                <div className="mt-1">
                  {selectedRule.archived ? (
                    <Badge variant="secondary">Archived</Badge>
                  ) : selectedRule.published ? (
                    <Badge className="bg-secondary text-secondary-foreground">Published</Badge>
                  ) : (
                    <Badge variant="outline">Draft</Badge>
                  )}
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Law Reference</Label>
                <pre className="mt-1 p-3 bg-muted rounded-lg text-sm font-mono overflow-auto">
                  {JSON.stringify(selectedRule.law_reference_json, null, 2)}
                </pre>
              </div>
              <div>
                <Label className="text-muted-foreground">Rules</Label>
                <pre className="mt-1 p-3 bg-muted rounded-lg text-sm font-mono overflow-auto max-h-[300px]">
                  {JSON.stringify(selectedRule.rules_json, null, 2)}
                </pre>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Action Dialog */}
      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === "publish" && "Publish Rule"}
              {confirmAction?.type === "unpublish" && "Unpublish Rule"}
              {confirmAction?.type === "archive" && "Archive Rule"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === "publish" && (
                <>
                  Publishing <strong>{confirmAction.rule.version}</strong> will make it the active rule for {confirmAction.rule.tax_type}. 
                  Any other published {confirmAction.rule.tax_type} rule will be unpublished.
                </>
              )}
              {confirmAction?.type === "unpublish" && (
                <>
                  Unpublishing <strong>{confirmAction?.rule.version}</strong> will make it inactive. 
                  Users will not be able to use this rule for calculations.
                </>
              )}
              {confirmAction?.type === "archive" && (
                <>
                  Archiving <strong>{confirmAction?.rule.version}</strong> will remove it from active use. 
                  This action cannot be undone easily.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAction} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diff View Dialog */}
      <TaxRuleDiffView
        open={isDiffOpen}
        onOpenChange={setIsDiffOpen}
        rules={rules.filter(r => selectedRule ? r.tax_type === selectedRule.tax_type : true)}
        initialRule={selectedRule || undefined}
      />
    </div>
  );
}
