import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  MessageSquare, 
  X, 
  Send, 
  Loader2, 
  Bot, 
  User,
  Minimize2,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const QUICK_QUESTIONS = [
  "What is Consolidated Relief Allowance?",
  "How is CIT calculated for small companies?",
  "What are the VAT-exempt items?",
  "Explain withholding tax rates",
];

export function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, isMinimized]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    setError(null);
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(session?.access_token && {
              Authorization: `Bearer ${session.access_token}`,
            }),
          },
          body: JSON.stringify({
            messages: [...messages, userMessage].map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to get response");
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.content,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error("Chat error:", err);
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleQuickQuestion = (question: string) => {
    sendMessage(question);
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 bg-primary hover:bg-primary/90"
        size="icon"
      >
        <MessageSquare className="h-6 w-6" />
        <span className="sr-only">Open AI Tax Assistant</span>
      </Button>
    );
  }

  return (
    <Card
      className={cn(
        "fixed shadow-2xl transition-all duration-300",
        // Position: ensure clickable on mobile by adding safe offset from header
        "bottom-4 right-4 sm:bottom-6 sm:right-6",
        // z-index above header (z-50), ensure close button clickable
        "z-[60]",
        isMinimized
          ? "w-64 sm:w-72 h-14"
          : "w-[calc(100vw-2rem)] sm:w-[380px] h-[calc(100dvh-5rem)] sm:h-[520px] max-h-[520px] flex flex-col"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-primary text-primary-foreground rounded-t-lg">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-primary-foreground/20 rounded-lg">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">AI Tax Assistant</h3>
            {!isMinimized && (
              <p className="text-xs text-primary-foreground/70">
                Ask about Nigerian tax laws
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <ScrollArea className="flex-1 p-3" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="space-y-4">
                <div className="text-center py-6">
                  <Bot className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <h4 className="font-medium mb-1">Welcome!</h4>
                  <p className="text-sm text-muted-foreground">
                    I can help explain Nigerian tax laws and calculations.
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">
                    Quick Questions:
                  </p>
                  {QUICK_QUESTIONS.map((q) => (
                    <Button
                      key={q}
                      variant="outline"
                      size="sm"
                      className="w-full justify-start text-left h-auto py-2 px-3 text-xs"
                      onClick={() => handleQuickQuestion(q)}
                    >
                      {q}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex gap-2",
                      message.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    {message.role === "assistant" && (
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    )}
                                    <div
                                      className={cn(
                                        "rounded-lg px-3 py-2 max-w-[85%] text-sm",
                                        message.role === "user"
                                          ? "bg-primary text-primary-foreground"
                                          : "bg-muted"
                                      )}
                                    >
                                      {message.role === "assistant" ? (
                                        <ReactMarkdown
                                          className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-2 [&>p:last-child]:mb-0 [&>ul]:my-2 [&>ol]:my-2"
                                          components={{
                                            a: ({ href, children }) => (
                                              <a
                                                href={href}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-primary underline hover:no-underline"
                                              >
                                                {children}
                                              </a>
                                            ),
                                          }}
                                        >
                                          {message.content}
                                        </ReactMarkdown>
                                      ) : (
                                        <p className="whitespace-pre-wrap">{message.content}</p>
                                      )}
                                    </div>
                    {message.role === "user" && (
                      <div className="h-7 w-7 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
                        <User className="h-4 w-4 text-secondary" />
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-2">
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                    <div className="bg-muted rounded-lg px-3 py-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Error */}
          {error && (
            <div className="px-3 pb-2">
              <div className="flex items-center gap-2 text-destructive text-xs bg-destructive/10 rounded-lg px-3 py-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-3 border-t">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about taxes..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || isLoading}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 text-center">
              AI responses are informational only. Consult a tax professional for advice.
            </p>
          </form>
        </>
      )}
    </Card>
  );
}
