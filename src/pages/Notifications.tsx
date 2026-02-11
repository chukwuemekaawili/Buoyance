import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Bell, CheckCheck, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { AuthGuard } from "@/components/AuthGuard";
import {
  fetchNotifications,
  markAsRead,
  markAllAsRead,
  type Notification,
} from "@/lib/notificationService";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const typeConfig: Record<string, { label: string; icon: string; color: string }> = {
  filing_draft_created: { label: "Draft", icon: "📝", color: "bg-muted text-muted-foreground" },
  filing_submitted: { label: "Filing", icon: "📄", color: "bg-blue-500/10 text-blue-600" },
  payment_verified: { label: "Payment", icon: "✅", color: "bg-success/10 text-success" },
  payment_rejected: { label: "Payment", icon: "❌", color: "bg-destructive/10 text-destructive" },
  tax_rule_updated: { label: "Rules", icon: "📋", color: "bg-primary/10 text-primary" },
  filing_overdue: { label: "Overdue", icon: "⏰", color: "bg-amber-500/10 text-amber-600" },
  payment_due: { label: "Due", icon: "💳", color: "bg-amber-500/10 text-amber-600" },
};

function NotificationsContent() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user]);

  const loadNotifications = async () => {
    setLoading(true);
    const data = await fetchNotifications(100);
    setNotifications(data);
    setLoading(false);
  };

  const handleMarkAsRead = async (id: string) => {
    await markAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-grow pt-20 md:pt-28 pb-16">
        <div className="container mx-auto px-4 md:px-6 max-w-3xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <Bell className="h-8 w-8" />
                Notifications
              </h1>
              <p className="text-muted-foreground mt-2">
                {unreadCount > 0 
                  ? `You have ${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
                  : "All caught up!"}
              </p>
            </div>
            {unreadCount > 0 && (
              <Button variant="outline" onClick={handleMarkAllAsRead}>
                <CheckCheck className="h-4 w-4 mr-2" />
                Mark all read
              </Button>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : notifications.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">No notifications</h3>
                <p className="text-muted-foreground">
                  You'll see notifications here when there's activity on your account.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => {
                const config = typeConfig[notification.type] || {
                  label: "Update",
                  icon: "📢",
                  color: "bg-muted text-muted-foreground",
                };

                return (
                  <Card
                    key={notification.id}
                    className={cn(
                      "transition-colors",
                      !notification.read && "border-accent/50 bg-accent/5"
                    )}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <span className="text-2xl">{config.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className={cn(
                              "font-medium",
                              !notification.read && "text-foreground"
                            )}>
                              {notification.title}
                            </h4>
                            <Badge variant="outline" className={config.color}>
                              {config.label}
                            </Badge>
                            {!notification.read && (
                              <div className="h-2 w-2 rounded-full bg-accent" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {format(new Date(notification.created_at), "MMMM d, yyyy 'at' h:mm a")}
                          </p>
                        </div>
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMarkAsRead(notification.id)}
                          >
                            <CheckCheck className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function Notifications() {
  return (
    <AuthGuard>
      <NotificationsContent />
    </AuthGuard>
  );
}
