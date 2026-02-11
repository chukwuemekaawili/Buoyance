import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Search, Brain, Plus, Edit, Trash2, CheckCircle, XCircle, Sparkles } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { useRBAC } from "@/hooks/useRBAC";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface ClassificationRule {
  id: string;
  rule_type: 'expense' | 'income';
  category_key: string;
  category_label: string;
  default_value: boolean;
  legal_reference: string | null;
  reasoning: string | null;
  examples: string[] | null;
  created_at: string;
  updated_at: string;
}

interface RuleFormData {
  rule_type: 'expense' | 'income';
  category_key: string;
  category_label: string;
  default_value: boolean;
  legal_reference: string;
  reasoning: string;
  examples: string;
}

const defaultFormData: RuleFormData = {
  rule_type: 'expense',
  category_key: '',
  category_label: '',
  default_value: false,
  legal_reference: '',
  reasoning: '',
  examples: '',
};

export default function ClassificationRules() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: rbacLoading } = useRBAC();
  const { toast } = useToast();

  const [rules, setRules] = useState<ClassificationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<ClassificationRule | null>(null);
  const [formData, setFormData] = useState<RuleFormData>(defaultFormData);
  const [isSaving, setIsSaving] = useState(false);

  // Authorization check
  useEffect(() => {
    if (!authLoading && !rbacLoading) {
      if (!user) {
        navigate("/signin");
      } else if (!isAdmin) {
        navigate("/");
      }
    }
  }, [user, authLoading, rbacLoading, isAdmin, navigate]);

  // Fetch rules
  useEffect(() => {
    if (!rbacLoading && isAdmin) {
      fetchRules();
    }
  }, [rbacLoading, isAdmin]);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("classification_rules")
        .select("*")
        .order("rule_type", { ascending: true })
        .order("category_label", { ascending: true });

      if (error) throw error;
      setRules((data || []) as ClassificationRule[]);
    } catch (err) {
      console.error("Error fetching rules:", err);
      toast({
        title: "Error loading rules",
        description: "Failed to load classification rules.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredRules = rules.filter((rule) => {
    if (rule.rule_type !== activeTab) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        rule.category_label.toLowerCase().includes(query) ||
        rule.category_key.toLowerCase().includes(query) ||
        rule.legal_reference?.toLowerCase().includes(query) ||
        rule.reasoning?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const expenseRules = rules.filter(r => r.rule_type === 'expense');
  const incomeRules = rules.filter(r => r.rule_type === 'income');
  const deductibleCount = expenseRules.filter(r => r.default_value).length;
  const taxExemptCount = incomeRules.filter(r => r.default_value).length;

  const handleCreate = async () => {
    if (!formData.category_key || !formData.category_label) {
      toast({
        title: "Validation Error",
        description: "Category key and label are required.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const newRule = {
        rule_type: formData.rule_type,
        category_key: formData.category_key.toLowerCase().replace(/\s+/g, '_'),
        category_label: formData.category_label,
        default_value: formData.default_value,
        legal_reference: formData.legal_reference || null,
        reasoning: formData.reasoning || null,
        examples: formData.examples ? formData.examples.split(',').map(e => e.trim()).filter(Boolean) : null,
      };

      const { error } = await supabase
        .from("classification_rules")
        .insert(newRule);

      if (error) throw error;

      toast({ title: "Rule created", description: "New classification rule created successfully." });
      setIsCreateOpen(false);
      setFormData({ ...defaultFormData, rule_type: activeTab });
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
    if (!selectedRule || !formData.category_label) {
      return;
    }

    setIsSaving(true);
    try {
      const updates = {
        category_label: formData.category_label,
        default_value: formData.default_value,
        legal_reference: formData.legal_reference || null,
        reasoning: formData.reasoning || null,
        examples: formData.examples ? formData.examples.split(',').map(e => e.trim()).filter(Boolean) : null,
      };

      const { error } = await supabase
        .from("classification_rules")
        .update(updates)
        .eq("id", selectedRule.id);

      if (error) throw error;

      toast({ title: "Rule updated", description: "Classification rule updated successfully." });
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

  const handleDelete = async () => {
    if (!selectedRule) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("classification_rules")
        .delete()
        .eq("id", selectedRule.id);

      if (error) throw error;

      toast({ title: "Rule deleted", description: "Classification rule has been deleted." });
      setIsDeleteOpen(false);
      setSelectedRule(null);
      fetchRules();
    } catch (err: any) {
      toast({
        title: "Failed to delete rule",
        description: err.message || "An error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const openEdit = (rule: ClassificationRule) => {
    setSelectedRule(rule);
    setFormData({
      rule_type: rule.rule_type,
      category_key: rule.category_key,
      category_label: rule.category_label,
      default_value: rule.default_value,
      legal_reference: rule.legal_reference || '',
      reasoning: rule.reasoning || '',
      examples: rule.examples?.join(', ') || '',
    });
    setIsEditOpen(true);
  };

  const openDelete = (rule: ClassificationRule) => {
    setSelectedRule(rule);
    setIsDeleteOpen(true);
  };

  const openCreate = () => {
    setFormData({ ...defaultFormData, rule_type: activeTab });
    setIsCreateOpen(true);
  };

  if (authLoading || rbacLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 pt-20 md:pt-28 pb-12">
        <div className="container mx-auto px-4 md:px-6">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Brain className="h-5 w-5 text-primary" />
                </div>
                <h1 className="text-3xl font-bold">AI Classification Rules</h1>
                <Badge variant="secondary" className="gap-1">
                  <Sparkles className="h-3 w-3" />
                  AI Powered
                </Badge>
              </div>
              <p className="text-muted-foreground">
                Manage category-to-tax-status mappings used by the AI classifier for automatic tax determination
              </p>
            </div>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Add Rule
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{rules.length}</div>
                <p className="text-sm text-muted-foreground">Total Rules</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-secondary">{deductibleCount}</div>
                <p className="text-sm text-muted-foreground">Deductible Expense Categories</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-destructive">{expenseRules.length - deductibleCount}</div>
                <p className="text-sm text-muted-foreground">Non-Deductible Expense Categories</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-blue-600">{taxExemptCount}</div>
                <p className="text-sm text-muted-foreground">Tax Exempt Income Categories</p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
                <div>
                  <CardTitle>Classification Rules</CardTitle>
                  <CardDescription>
                    Rules that determine default tax treatment for each category
                  </CardDescription>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search rules..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-[250px]"
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'expense' | 'income')}>
                <TabsList className="mb-4">
                  <TabsTrigger value="expense" className="gap-2">
                    Expense Rules
                    <Badge variant="secondary">{expenseRules.length}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="income" className="gap-2">
                    Income Rules
                    <Badge variant="secondary">{incomeRules.length}</Badge>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="expense">
                  {renderRulesTable(filteredRules, 'expense')}
                </TabsContent>

                <TabsContent value="income">
                  {renderRulesTable(filteredRules, 'income')}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Classification Rule</DialogTitle>
            <DialogDescription>
              Create a new category classification rule for the AI classifier.
            </DialogDescription>
          </DialogHeader>
          {renderForm()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={isSaving || !formData.category_key || !formData.category_label}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Classification Rule</DialogTitle>
            <DialogDescription>
              Update the classification rule for <strong>{selectedRule?.category_label}</strong>.
            </DialogDescription>
          </DialogHeader>
          {renderForm(true)}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Classification Rule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the rule for <strong>{selectedRule?.category_label}</strong>? 
              This will affect AI classification for this category.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isSaving} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete Rule
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  function renderRulesTable(rules: ClassificationRule[], type: 'expense' | 'income') {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    if (rules.length === 0) {
      return (
        <div className="text-center py-12">
          <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-1">No rules found</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery ? "Try adjusting your search" : `Add ${type} classification rules to get started`}
          </p>
          {!searchQuery && (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Rule
            </Button>
          )}
        </div>
      );
    }

    return (
      <ScrollArea className="w-full">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead>Key</TableHead>
              <TableHead>{type === 'expense' ? 'Deductible' : 'Tax Exempt'}</TableHead>
              <TableHead>Legal Reference</TableHead>
              <TableHead>Reasoning</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.map((rule) => (
              <TableRow key={rule.id}>
                <TableCell className="font-medium">{rule.category_label}</TableCell>
                <TableCell>
                  <code className="text-xs bg-muted px-2 py-1 rounded">{rule.category_key}</code>
                </TableCell>
                <TableCell>
                  {rule.default_value ? (
                    <Badge className="bg-secondary/20 text-secondary border-secondary gap-1">
                      <CheckCircle className="h-3 w-3" />
                      {type === 'expense' ? 'Deductible' : 'Exempt'}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1 text-muted-foreground">
                      <XCircle className="h-3 w-3" />
                      {type === 'expense' ? 'Non-Deductible' : 'Taxable'}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">
                  {rule.legal_reference || '-'}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                  {rule.reasoning || '-'}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(rule)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openDelete(rule)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    );
  }

  function renderForm(isEdit = false) {
    return (
      <div className="space-y-4">
        {!isEdit && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select 
                value={formData.rule_type} 
                onValueChange={(v) => setFormData({ ...formData, rule_type: v as 'expense' | 'income' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Category Key</Label>
              <Input
                placeholder="e.g., office_supplies"
                value={formData.category_key}
                onChange={(e) => setFormData({ ...formData, category_key: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Lowercase, underscores for spaces</p>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label>Category Label</Label>
          <Input
            placeholder="e.g., Office Supplies / Stationery"
            value={formData.category_label}
            onChange={(e) => setFormData({ ...formData, category_label: e.target.value })}
          />
        </div>

        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div>
            <Label className="text-base">
              {formData.rule_type === 'expense' ? 'Tax Deductible' : 'Tax Exempt'}
            </Label>
            <p className="text-sm text-muted-foreground">
              {formData.rule_type === 'expense' 
                ? 'Enable if this expense category is typically tax deductible'
                : 'Enable if this income category is typically tax exempt'
              }
            </p>
          </div>
          <Switch
            checked={formData.default_value}
            onCheckedChange={(checked) => setFormData({ ...formData, default_value: checked })}
          />
        </div>

        <div className="space-y-2">
          <Label>Legal Reference</Label>
          <Input
            placeholder="e.g., PITA Section 24"
            value={formData.legal_reference}
            onChange={(e) => setFormData({ ...formData, legal_reference: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label>Reasoning</Label>
          <Textarea
            placeholder="Explain why this category has this tax treatment..."
            value={formData.reasoning}
            onChange={(e) => setFormData({ ...formData, reasoning: e.target.value })}
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label>Examples (comma-separated)</Label>
          <Input
            placeholder="e.g., Office rent, Co-working space, Warehouse"
            value={formData.examples}
            onChange={(e) => setFormData({ ...formData, examples: e.target.value })}
          />
        </div>
      </div>
    );
  }
}
