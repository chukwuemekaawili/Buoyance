import { useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, BookOpen, FileText, GraduationCap, Newspaper } from "lucide-react";
import { BUILT_IN_ARTICLES, getCategoryLabel, getCategoryIcon, type ArticleCategory } from "@/lib/knowledgeService";

function KnowledgeContent() {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedArticleIndex, setSelectedArticleIndex] = useState<number | null>(null);

    const filteredArticles = BUILT_IN_ARTICLES.filter(a => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return a.title.toLowerCase().includes(q) || a.summary.toLowerCase().includes(q) ||
            a.tags.some(t => t.toLowerCase().includes(q)) || a.content.toLowerCase().includes(q);
    });

    const categories: ArticleCategory[] = ['tax_law', 'guide', 'circular', 'faq', 'course', 'update'];
    const getByCategory = (cat: ArticleCategory) => filteredArticles.filter(a => a.category === cat);

    const selectedArticle = selectedArticleIndex !== null ? BUILT_IN_ARTICLES[selectedArticleIndex] : null;

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Header />
            <main className="flex-grow pt-20 md:pt-28 pb-16">
                <div className="container mx-auto px-4 md:px-6 max-w-6xl">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-foreground">Knowledge Base</h1>
                        <p className="text-muted-foreground mt-2">
                            Tax laws, filing guides, FIRS circulars, and compliance resources.
                        </p>
                    </div>

                    {/* Search */}
                    <div className="relative mb-8">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            className="pl-10"
                            placeholder="Search articles, tax types, guides..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {selectedArticle ? (
                        // Article Detail View
                        <div>
                            <button
                                onClick={() => setSelectedArticleIndex(null)}
                                className="text-sm text-primary hover:underline mb-4 inline-block"
                            >
                                ← Back to articles
                            </button>
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Badge variant="outline">{getCategoryIcon(selectedArticle.category)} {getCategoryLabel(selectedArticle.category)}</Badge>
                                        {selectedArticle.tax_types.map(t => (
                                            <Badge key={t} variant="secondary">{t}</Badge>
                                        ))}
                                    </div>
                                    <CardTitle className="text-2xl">{selectedArticle.title}</CardTitle>
                                    <CardDescription>{selectedArticle.summary}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="prose prose-sm dark:prose-invert max-w-none">
                                        {selectedArticle.content.split('\n').map((line, i) => {
                                            if (line.startsWith('# ')) return <h1 key={i} className="text-2xl font-bold mt-6 mb-3">{line.slice(2)}</h1>;
                                            if (line.startsWith('## ')) return <h2 key={i} className="text-xl font-semibold mt-5 mb-2">{line.slice(3)}</h2>;
                                            if (line.startsWith('### ')) return <h3 key={i} className="text-lg font-medium mt-4 mb-2">{line.slice(4)}</h3>;
                                            if (line.startsWith('- ')) return <li key={i} className="ml-4 text-sm">{line.slice(2)}</li>;
                                            if (line.startsWith('|')) return <p key={i} className="text-sm font-mono bg-muted/50 px-2 py-1">{line}</p>;
                                            if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="font-semibold text-sm mt-2">{line.slice(2, -2)}</p>;
                                            if (line.trim() === '') return <br key={i} />;
                                            return <p key={i} className="text-sm text-muted-foreground leading-relaxed">{line}</p>;
                                        })}
                                    </div>
                                    {selectedArticle.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t">
                                            {selectedArticle.tags.map(tag => (
                                                <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    ) : (
                        // Category Tabs
                        <Tabs defaultValue="all" className="space-y-6">
                            <TabsList className="flex-wrap h-auto gap-1">
                                <TabsTrigger value="all">All ({filteredArticles.length})</TabsTrigger>
                                {categories.map(cat => {
                                    const count = getByCategory(cat).length;
                                    if (count === 0) return null;
                                    return (
                                        <TabsTrigger key={cat} value={cat}>
                                            {getCategoryIcon(cat)} {getCategoryLabel(cat)} ({count})
                                        </TabsTrigger>
                                    );
                                })}
                            </TabsList>

                            <TabsContent value="all">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {filteredArticles.map((article, i) => (
                                        <Card
                                            key={i}
                                            className="cursor-pointer hover:shadow-md transition-shadow"
                                            onClick={() => setSelectedArticleIndex(BUILT_IN_ARTICLES.indexOf(article))}
                                        >
                                            <CardHeader className="pb-2">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Badge variant="outline" className="text-xs">
                                                        {getCategoryIcon(article.category)} {getCategoryLabel(article.category)}
                                                    </Badge>
                                                </div>
                                                <CardTitle className="text-base">{article.title}</CardTitle>
                                                <CardDescription className="text-xs">{article.summary}</CardDescription>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="flex flex-wrap gap-1">
                                                    {article.tax_types.map(t => (
                                                        <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                                                    ))}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </TabsContent>

                            {categories.map(cat => (
                                <TabsContent key={cat} value={cat}>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {getByCategory(cat).map((article, i) => (
                                            <Card
                                                key={i}
                                                className="cursor-pointer hover:shadow-md transition-shadow"
                                                onClick={() => setSelectedArticleIndex(BUILT_IN_ARTICLES.indexOf(article))}
                                            >
                                                <CardHeader className="pb-2">
                                                    <CardTitle className="text-base">{article.title}</CardTitle>
                                                    <CardDescription className="text-xs">{article.summary}</CardDescription>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="flex flex-wrap gap-1">
                                                        {article.tax_types.map(t => (
                                                            <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                                                        ))}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </TabsContent>
                            ))}
                        </Tabs>
                    )}
                </div>
            </main>
            <Footer />
        </div>
    );
}

export default function KnowledgeBase() {
    return (
        <AuthGuard>
            <KnowledgeContent />
        </AuthGuard>
    );
}
