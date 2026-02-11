/**
 * Tax Rule Diff View Component
 * 
 * Displays a side-by-side comparison of two tax rule versions,
 * highlighting changes in rules_json and law_reference_json.
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GitCompare, Scale, FileText, ArrowRight } from "lucide-react";
import { format } from "date-fns";

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

interface TaxRuleDiffViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rules: TaxRule[];
  initialRule?: TaxRule;
}

function JsonDiff({ 
  label, 
  left, 
  right 
}: { 
  label: string; 
  left: unknown; 
  right: unknown;
}) {
  const leftStr = JSON.stringify(left, null, 2);
  const rightStr = JSON.stringify(right, null, 2);
  const isDifferent = leftStr !== rightStr;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        {isDifferent && (
          <Badge variant="outline" className="text-amber-600 border-amber-600/30">
            Changed
          </Badge>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-muted/50 rounded-lg p-3 overflow-auto">
          <pre className="text-xs font-mono whitespace-pre-wrap break-all">
            {leftStr}
          </pre>
        </div>
        <div className={`rounded-lg p-3 overflow-auto ${isDifferent ? 'bg-green-500/10 border border-green-500/20' : 'bg-muted/50'}`}>
          <pre className="text-xs font-mono whitespace-pre-wrap break-all">
            {rightStr}
          </pre>
        </div>
      </div>
    </div>
  );
}

export function TaxRuleDiffView({
  open,
  onOpenChange,
  rules,
  initialRule,
}: TaxRuleDiffViewProps) {
  const [leftRuleId, setLeftRuleId] = useState<string>(
    initialRule?.id || rules[1]?.id || ""
  );
  const [rightRuleId, setRightRuleId] = useState<string>(
    rules[0]?.id || ""
  );

  const leftRule = rules.find((r) => r.id === leftRuleId);
  const rightRule = rules.find((r) => r.id === rightRuleId);

  const getRuleLabel = (rule: TaxRule) => 
    `${rule.version} (${format(new Date(rule.effective_date), "MMM d, yyyy")})`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitCompare className="h-5 w-5 text-primary" />
            Compare Tax Rule Versions
          </DialogTitle>
          <DialogDescription>
            Select two versions to compare changes in rules and legal references.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Previous Version</label>
            <Select value={leftRuleId} onValueChange={setLeftRuleId}>
              <SelectTrigger>
                <SelectValue placeholder="Select version" />
              </SelectTrigger>
              <SelectContent>
                {rules.map((rule) => (
                  <SelectItem key={rule.id} value={rule.id} disabled={rule.id === rightRuleId}>
                    <div className="flex items-center gap-2">
                      <span>{getRuleLabel(rule)}</span>
                      {rule.published && (
                        <Badge variant="secondary" className="text-xs">Active</Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Current Version</label>
            <Select value={rightRuleId} onValueChange={setRightRuleId}>
              <SelectTrigger>
                <SelectValue placeholder="Select version" />
              </SelectTrigger>
              <SelectContent>
                {rules.map((rule) => (
                  <SelectItem key={rule.id} value={rule.id} disabled={rule.id === leftRuleId}>
                    <div className="flex items-center gap-2">
                      <span>{getRuleLabel(rule)}</span>
                      {rule.published && (
                        <Badge variant="secondary" className="text-xs">Active</Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {leftRule && rightRule ? (
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6">
              {/* Header comparison */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Version</p>
                  <p className="font-mono font-medium">{leftRule.version}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Effective: {format(new Date(leftRule.effective_date), "MMMM d, yyyy")}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Version</p>
                  <p className="font-mono font-medium">{rightRule.version}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Effective: {format(new Date(rightRule.effective_date), "MMMM d, yyyy")}
                  </p>
                </div>
              </div>

              {/* Legal Reference Comparison */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Scale className="h-4 w-4 text-primary" />
                  <span className="font-medium">Legal Reference</span>
                </div>
                <JsonDiff
                  label=""
                  left={leftRule.law_reference_json}
                  right={rightRule.law_reference_json}
                />
              </div>

              {/* Rules Comparison */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="font-medium">Tax Rules (Bands/Rates)</span>
                </div>
                <JsonDiff
                  label=""
                  left={leftRule.rules_json}
                  right={rightRule.rules_json}
                />
              </div>

              {/* Status Comparison */}
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-sm font-medium mb-2">Status Changes</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    {leftRule.published ? (
                      <Badge className="bg-secondary">Published</Badge>
                    ) : leftRule.archived ? (
                      <Badge variant="secondary">Archived</Badge>
                    ) : (
                      <Badge variant="outline">Draft</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    {rightRule.published ? (
                      <Badge className="bg-secondary">Published</Badge>
                    ) : rightRule.archived ? (
                      <Badge variant="secondary">Archived</Badge>
                    ) : (
                      <Badge variant="outline">Draft</Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Select two versions to compare
          </div>
        )}

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Legal Basis Display Component
 * Shows the legal basis for a tax rule in a formatted way.
 */
export function LegalBasisDisplay({ 
  lawReference 
}: { 
  lawReference: { act: string; section: string; effective: string } | null 
}) {
  if (!lawReference) {
    return <span className="text-muted-foreground text-sm">No legal reference</span>;
  }

  return (
    <div className="space-y-1">
      <p className="text-sm font-medium">{lawReference.act}</p>
      <p className="text-xs text-muted-foreground">Section: {lawReference.section}</p>
      {lawReference.effective && (
        <p className="text-xs text-muted-foreground">Effective: {lawReference.effective}</p>
      )}
    </div>
  );
}
