import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useRBAC } from "@/hooks/useRBAC";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, FlaskConical, Loader2, CheckCircle2, XCircle, AlertCircle, Sparkles, Scale, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { classifyTaxItem, getConfidenceColor, getConfidenceBgColor, type ClassificationResult } from "@/lib/taxClassificationService";

const EXPENSE_CATEGORIES = [
  { value: "rent", label: "Rent" },
  { value: "salaries", label: "Salaries & Wages" },
  { value: "utilities", label: "Utilities" },
  { value: "power", label: "Power/Generator" },
  { value: "marketing", label: "Marketing & Advertising" },
  { value: "transport", label: "Transport & Logistics" },
  { value: "cogs", label: "Cost of Goods Sold" },
  { value: "professional", label: "Professional Fees" },
  { value: "office", label: "Office Supplies" },
  { value: "equipment", label: "Equipment" },
  { value: "insurance", label: "Insurance" },
  { value: "maintenance", label: "Repairs & Maintenance" },
  { value: "software", label: "Software & Subscriptions" },
  { value: "training", label: "Training & Development" },
  { value: "entertainment", label: "Entertainment" },
  { value: "personal", label: "Personal Expenses" },
  { value: "other", label: "Other" },
];

const INCOME_CATEGORIES = [
  { value: "salary", label: "Salary" },
  { value: "business", label: "Business Revenue" },
  { value: "freelance", label: "Freelance Income" },
  { value: "rental", label: "Rental Income" },
  { value: "investment", label: "Investment Returns" },
  { value: "dividend", label: "Dividends" },
  { value: "interest", label: "Interest Income" },
  { value: "gift", label: "Gifts" },
  { value: "grant", label: "Grants" },
  { value: "loan", label: "Loans Received" },
  { value: "refund", label: "Refunds" },
  { value: "other", label: "Other" },
];

export default function ClassificationTest() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: rbacLoading } = useRBAC();

  const [type, setType] = useState<"expense" | "income">("expense");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [isClassifying, setIsClassifying] = useState(false);
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const [testHistory, setTestHistory] = useState<Array<{
    type: "expense" | "income";
    category: string;
    description: string;
    result: ClassificationResult;
    timestamp: Date;
  }>>([]);

  if (authLoading || rbacLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    navigate("/");
    return null;
  }

  const handleClassify = async () => {
    if (!category || !description.trim()) {
      toast.error("Please fill in both category and description");
      return;
    }

    setIsClassifying(true);
    setResult(null);

    try {
      const classificationResult = await classifyTaxItem({
        type,
        category,
        description: description.trim(),
        amount_kobo: amount ? (parseFloat(amount) * 100).toString() : undefined,
      });

      setResult(classificationResult);
      setTestHistory(prev => [{
        type,
        category,
        description: description.trim(),
        result: classificationResult,
        timestamp: new Date(),
      }, ...prev].slice(0, 10)); // Keep last 10 tests

      toast.success("Classification complete");
    } catch (error) {
      console.error("Classification error:", error);
      toast.error("Failed to classify item");
    } finally {
      setIsClassifying(false);
    }
  };

  const clearForm = () => {
    setCategory("");
    setDescription("");
    setAmount("");
    setResult(null);
  };

  const categories = type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <FlaskConical className="h-8 w-8 text-primary" />
              AI Classification Tester
            </h1>
            <p className="text-muted-foreground mt-1">
              Test how the AI classifies expenses and incomes for tax purposes
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Input Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Test Classification
              </CardTitle>
              <CardDescription>
                Enter sample data to see how the AI would classify it
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Type Selection */}
              <div className="space-y-2">
                <Label>Transaction Type</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={type === "expense" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => {
                      setType("expense");
                      setCategory("");
                      setResult(null);
                    }}
                  >
                    Expense
                  </Button>
                  <Button
                    type="button"
                    variant={type === "income" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => {
                      setType("income");
                      setCategory("");
                      setResult(null);
                    }}
                  >
                    Income
                  </Button>
                </div>
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder={
                    type === "expense"
                      ? "e.g., Monthly office rent payment for Victoria Island office"
                      : "e.g., Monthly salary from XYZ Company"
                  }
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Amount (Optional) */}
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (₦) - Optional</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="e.g., 500000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  onClick={handleClassify}
                  disabled={isClassifying || !category || !description.trim()}
                  className="flex-1"
                >
                  {isClassifying ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Classifying...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Classify
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={clearForm}>
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Result Display */}
          <div className="space-y-6">
            {/* Current Result */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scale className="h-5 w-5 text-primary" />
                  Classification Result
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!result && !isClassifying && (
                  <div className="text-center py-8 text-muted-foreground">
                    <FlaskConical className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Enter details and click "Classify" to test</p>
                  </div>
                )}

                {isClassifying && (
                  <div className="text-center py-8">
                    <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
                    <p className="text-muted-foreground">Analyzing with AI...</p>
                  </div>
                )}

                {result && !isClassifying && (
                  <div className="space-y-6">
                    {/* Main Result */}
                    <div className={`p-4 rounded-lg border ${getConfidenceBgColor(result.confidence)}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {type === "expense" ? (
                            result.deductible ? (
                              <CheckCircle2 className="h-6 w-6 text-green-500" />
                            ) : (
                              <XCircle className="h-6 w-6 text-red-500" />
                            )
                          ) : result.tax_exempt ? (
                            <CheckCircle2 className="h-6 w-6 text-green-500" />
                          ) : (
                            <AlertCircle className="h-6 w-6 text-amber-500" />
                          )}
                          <span className="text-lg font-semibold">
                            {type === "expense"
                              ? result.deductible
                                ? "Tax Deductible"
                                : "Not Deductible"
                              : result.tax_exempt
                                ? "Tax Exempt"
                                : "Taxable Income"}
                          </span>
                        </div>
                        <Badge
                          variant="outline"
                          className={getConfidenceColor(result.confidence)}
                        >
                          {result.confidence.toUpperCase()} Confidence
                        </Badge>
                      </div>
                    </div>

                    {/* Reasoning */}
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        Reasoning
                      </h4>
                      <p className="text-muted-foreground bg-muted/50 p-3 rounded-lg">
                        {result.reasoning}
                      </p>
                    </div>

                    {/* Legal Reference */}
                    {result.legal_reference && (
                      <div>
                        <h4 className="font-medium mb-2">Legal Reference</h4>
                        <Badge variant="secondary" className="font-mono">
                          {result.legal_reference}
                        </Badge>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Test History */}
            {testHistory.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Tests</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {testHistory.map((test, index) => (
                      <div
                        key={index}
                        className="p-3 bg-muted/50 rounded-lg text-sm"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {test.type}
                            </Badge>
                            <span className="font-medium">{test.category}</span>
                          </div>
                          <Badge
                            variant="outline"
                            className={`text-xs ${getConfidenceColor(test.result.confidence)}`}
                          >
                            {test.result.confidence}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground truncate">
                          {test.description}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {test.type === "expense" ? (
                            test.result.deductible ? (
                              <span className="text-green-600 dark:text-green-400 text-xs flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" /> Deductible
                              </span>
                            ) : (
                              <span className="text-red-600 dark:text-red-400 text-xs flex items-center gap-1">
                                <XCircle className="h-3 w-3" /> Not Deductible
                              </span>
                            )
                          ) : test.result.tax_exempt ? (
                            <span className="text-green-600 dark:text-green-400 text-xs flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Tax Exempt
                            </span>
                          ) : (
                            <span className="text-amber-600 dark:text-amber-400 text-xs flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" /> Taxable
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
