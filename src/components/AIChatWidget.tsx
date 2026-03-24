import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  X,
  Send,
  Loader2,
  Bot,
  User,
  Minimize2,
  Sparkles,
  AlertCircle,
  Copy,
  Flag,
  RefreshCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const QUICK_QUESTIONS = [
  "How do I file my first tax return?",
  "What expenses can I deduct from my business income?",
  "How do I calculate VAT on my invoice?",
  "I have WHT deducted — what do I do with it?",
  "How does payroll tax work for my employees?",
  "What records should I keep for tax purposes?",
];

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-0.5">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce"
          style={{ animationDelay: `${delay}ms`, animationDuration: "900ms" }}
        />
      ))}
    </div>
  );
}

export function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);
  const [activeAssistantId, setActiveAssistantId] = useState<string | null>(null);
  const [isSlow, setIsSlow] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportComment, setReportComment] = useState("");
  const [reportingMessageId, setReportingMessageId] = useState<string | null>(null);
  const [isReporting, setIsReporting] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const scrollViewportRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, isMinimized]);

  useEffect(() => {
    if (!scrollAreaRef.current) return;
    scrollViewportRef.current = scrollAreaRef.current.querySelector(
      "[data-radix-scroll-area-viewport]"
    ) as HTMLDivElement | null;
  }, [isOpen, isMinimized]);

  useEffect(() => {
    const viewport = scrollViewportRef.current;
    if (!viewport) return;
    viewport.scrollTop = viewport.scrollHeight;
  }, [messages]);

  const sendMessage = async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || isLoading) return;

    setError(null);
    setLastFailedMessage(null);
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      timestamp: new Date(),
    };

    const assistantMessageId = crypto.randomUUID();
    const assistantPlaceholder: Message = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage, assistantPlaceholder]);
    setInput("");
    setIsLoading(true);
    setActiveAssistantId(assistantMessageId);
    setIsSlow(false);

    const controller = new AbortController();
    const hardTimeoutId = window.setTimeout(() => controller.abort(), 30_000);
    const slowTimerId = window.setTimeout(() => setIsSlow(true), 8_000);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const payloadMessages = [...messages, userMessage]
        .filter((m) => m.content.trim().length > 0)
        .slice(-12)
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream, application/json",
            ...(session?.access_token && {
              Authorization: `Bearer ${session.access_token}`,
            }),
          },
          signal: controller.signal,
          body: JSON.stringify({
            messages: payloadMessages,
            stream: true,
            userContext: {
              isAuthenticated: !!user,
              currentPage: window.location.pathname,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to get response");
      }

      const contentType = response.headers.get("content-type") || "";

      if (contentType.includes("text/event-stream") && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let assistantText = "";
        let gotFirstToken = false;

        const isTextDeltaEvent = (
          evt: unknown
        ): evt is {
          type: "content_block_delta";
          delta: { type: "text_delta"; text: string };
        } => {
          if (!evt || typeof evt !== "object") return false;
          const e = evt as Record<string, unknown>;
          if (e.type !== "content_block_delta") return false;
          const delta = e.delta;
          if (!delta || typeof delta !== "object") return false;
          const d = delta as Record<string, unknown>;
          return d.type === "text_delta" && typeof d.text === "string";
        };

        const commit = () => {
          if (!gotFirstToken && assistantText.trim().length > 0) {
            gotFirstToken = true;
            window.clearTimeout(slowTimerId);
            setIsSlow(false);
          }
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessageId ? { ...m, content: assistantText } : m
            )
          );
        };

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          while (true) {
            const lfBoundary = buffer.indexOf("\n\n");
            const crlfBoundary = buffer.indexOf("\r\n\r\n");
            const eventEnd =
              lfBoundary === -1
                ? crlfBoundary
                : crlfBoundary === -1
                  ? lfBoundary
                  : Math.min(lfBoundary, crlfBoundary);

            if (eventEnd === -1) break;

            const boundaryLen = eventEnd === crlfBoundary ? 4 : 2;

            const rawEvent = buffer.slice(0, eventEnd);
            buffer = buffer.slice(eventEnd + boundaryLen);

            const dataLines = rawEvent
              .split(/\r?\n/)
              .filter((line) => line.startsWith("data:"))
              .map((line) => line.replace(/^data:\s?/, ""));

            if (dataLines.length === 0) continue;

            const dataStr = dataLines.join("\n").trim();
            if (!dataStr || dataStr === "[DONE]") continue;

            try {
              const evt = JSON.parse(dataStr) as unknown;
              if (isTextDeltaEvent(evt)) {
                assistantText += evt.delta.text;
                commit();
              }
            } catch {
              // Ignore malformed SSE payloads
            }
          }
        }

        if (!assistantText.trim()) {
          assistantText = "I apologize, but I could not generate a response.";
          commit();
        }
      } else {
        const data = await response.json();
        const content =
          typeof data?.content === "string" && data.content.trim()
            ? data.content
            : "I apologize, but I could not generate a response.";

        window.clearTimeout(slowTimerId);
        setIsSlow(false);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId ? { ...m, content } : m
          )
        );
      }
    } catch (err) {
      console.error("Chat error:", err);
      const msg =
        err instanceof DOMException && err.name === "AbortError"
          ? "This is taking longer than usual. Please try again."
          : err instanceof Error
            ? err.message
            : "Failed to send message";
      setError(msg);
      setLastFailedMessage(trimmed);
      setMessages((prev) => prev.filter((m) => m.id !== assistantMessageId));
    } finally {
      window.clearTimeout(hardTimeoutId);
      window.clearTimeout(slowTimerId);
      setIsLoading(false);
      setActiveAssistantId(null);
      setIsSlow(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleQuickQuestion = (question: string) => {
    sendMessage(question);
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied to clipboard" });
    } catch (err) {
      console.error("Copy failed:", err);
      toast({
        title: "Copy failed",
        description: "Your browser blocked clipboard access.",
        variant: "destructive",
      });
    }
  };

  const openReport = (assistantMessageId: string) => {
    setReportingMessageId(assistantMessageId);
    setReportComment("");
    setReportOpen(true);
  };

  const submitReport = async () => {
    if (!reportingMessageId) return;

    const assistantIndex = messages.findIndex((m) => m.id === reportingMessageId);
    const assistantMessage = assistantIndex >= 0 ? messages[assistantIndex] : null;
    const promptMessage =
      assistantIndex > 0
        ? [...messages.slice(0, assistantIndex)]
            .reverse()
            .find((m) => m.role === "user" && m.content.trim().length > 0) || null
        : null;

    if (!assistantMessage) return;

    setIsReporting(true);
    try {
      const email = user?.email || "unknown@buoyance.app";
      const name = user?.email ? user.email : "Buoyance User";

      const body = [
        "AI Chat Feedback",
        "",
        `User: ${user?.id || "anonymous"}`,
        `Location: ${window.location.href}`,
        "",
        promptMessage ? `User prompt:\n${promptMessage.content}` : "User prompt: (not found)",
        "",
        `AI response:\n${assistantMessage.content}`,
        "",
        reportComment.trim().length > 0 ? `User comment:\n${reportComment.trim()}` : "User comment: (none)",
      ].join("\n");

      const { error: insertError } = await supabase.from("contact_submissions").insert({
        name,
        email,
        subject: "AI Chat Feedback",
        message: body,
      });

      if (insertError) throw insertError;

      toast({
        title: "Report sent",
        description: "Thanks - we'll review this response.",
      });
      setReportOpen(false);
      setReportingMessageId(null);
      setReportComment("");
    } catch (err: unknown) {
      console.error("Failed to submit report:", err);
      toast({
        title: "Could not send report",
        description: err instanceof Error ? err.message : "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsReporting(false);
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 h-12 pl-4 pr-5 rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold text-sm gap-2 shadow-accent"
      >
        <Sparkles className="h-4 w-4" />
        Ask AI
      </Button>
    );
  }

  return (
    <Card
      className={cn(
        "fixed shadow-2xl transition-all duration-300",
        "z-[60]",
        isMinimized
          ? "bottom-4 right-4 sm:bottom-6 sm:right-6 w-64 sm:w-72 h-14"
          : "top-[4.5rem] bottom-4 left-2 right-2 sm:top-auto sm:bottom-6 sm:left-auto sm:right-6 sm:w-[420px] sm:h-[min(600px,calc(100dvh-8rem))] max-h-[min(600px,calc(100dvh-8rem))] flex flex-col"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b text-primary-foreground rounded-t-lg bg-gradient-to-r from-primary to-primary/80 shadow-[0_1px_8px_hsl(var(--primary)/0.35)] shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-primary-foreground/20 rounded-lg">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">AI Tax Assistant</h3>
            {!isMinimized && (
              <p className="text-xs text-primary-foreground/70">
                Tax · Accounting · App guide · NTA 2025
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
          <ScrollArea className="flex-1 p-3 [&>[data-radix-scroll-area-scrollbar]]:hidden" ref={scrollAreaRef}>
            {messages.length === 0 ? (
              <div className="space-y-4">
                <div className="text-center py-6">
                  <div className="h-14 w-14 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="h-7 w-7 text-primary" />
                  </div>
                  <h4 className="font-semibold mb-1 text-base">Your Nigerian tax guide</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Ask me anything — tax, accounting, filing, or how to use Buoyance. I've got you.
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">
                    Try asking:
                  </p>
                  {QUICK_QUESTIONS.map((q) => (
                    <Button
                      key={q}
                      variant="outline"
                      size="sm"
                      className="w-full justify-start text-left h-auto py-2 px-3 text-xs whitespace-normal leading-snug"
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
                                        "rounded-lg px-3 py-2 max-w-[85%] text-sm group",
                                        message.role === "user"
                                          ? "bg-primary text-primary-foreground"
                                          : "bg-muted"
                                      )}
                                    >
                                      {message.role === "assistant" ? (
                                        <>
                                          {!message.content.trim() && message.id === activeAssistantId && isLoading ? (
                                            <div className="flex flex-col gap-1.5">
                                              <TypingDots />
                                              <span className="text-xs text-muted-foreground">
                                                {isSlow ? "Almost there..." : "On it..."}
                                              </span>
                                            </div>
                                          ) : (
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
                                          )}

                                          {message.content.trim().length > 0 && (
                                            <div className="mt-2 flex items-center justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                              <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7"
                                                onClick={() => handleCopy(message.content)}
                                                aria-label="Copy response"
                                              >
                                                <Copy className="h-3.5 w-3.5" />
                                              </Button>
                                              <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7"
                                                onClick={() => openReport(message.id)}
                                                aria-label="Report response"
                                              >
                                                <Flag className="h-3.5 w-3.5" />
                                              </Button>
                                            </div>
                                          )}
                                        </>
                                      ) : (
                                        <p className="whitespace-pre-wrap">{message.content}</p>
                                      )}
                                    </div>
                    {message.role === "user" && (
                      <div className="h-7 w-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Error */}
          {error && (
            <div className="px-3 pb-2">
              <div className="flex items-center justify-between gap-2 text-destructive text-xs bg-destructive/10 rounded-lg px-3 py-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span className="flex-1">{error}</span>
                {lastFailedMessage && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => sendMessage(lastFailedMessage)}
                  >
                    <RefreshCcw className="h-3.5 w-3.5 mr-1" />
                    Retry
                  </Button>
                )}
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
                placeholder="What's your tax question?"
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

          <Dialog
            open={reportOpen}
            onOpenChange={(open) => {
              setReportOpen(open);
              if (!open) {
                setReportingMessageId(null);
                setReportComment("");
              }
            }}
          >
            <DialogContent className="sm:max-w-[520px]">
              <DialogHeader>
                <DialogTitle>Report This Response</DialogTitle>
              </DialogHeader>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Tell us what's wrong (optional). This sends a message to support so we can improve the assistant.
                </p>
                <Textarea
                  value={reportComment}
                  onChange={(e) => setReportComment(e.target.value)}
                  placeholder="E.g. incorrect law reference, missing exemption, wrong rate..."
                  rows={4}
                  disabled={isReporting}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setReportOpen(false)}
                  disabled={isReporting}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={submitReport}
                  disabled={isReporting}
                >
                  {isReporting ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending...
                    </span>
                  ) : (
                    "Send report"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </Card>
  );
}
