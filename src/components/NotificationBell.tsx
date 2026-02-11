import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchNotifications,
  fetchUnreadCount,
  markAsRead,
  markAllAsRead,
  type Notification,
} from "@/lib/notificationService";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const typeIcons: Record<string, string> = {
  filing_submitted: "📄",
  payment_verified: "✅",
  payment_rejected: "❌",
  tax_rule_updated: "📋",
  filing_overdue: "⏰",
  payment_due: "💳",
};

export function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (user) {
      loadNotifications();
      loadUnreadCount();
    }
  }, [user]);

  const loadNotifications = async () => {
    const data = await fetchNotifications(10);
    setNotifications(data);
  };

  const loadUnreadCount = async () => {
    const count = await fetchUnreadCount();
    setUnreadCount(count);
  };

  const handleMarkAsRead = async (id: string) => {
    await markAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  if (!user) return null;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-accent text-accent-foreground"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h4 className="font-semibold">Notifications</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={handleMarkAllAsRead}
            >
              Mark all read
            </Button>
          )}
        </div>

        <ScrollArea className="h-80">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "p-3 hover:bg-muted/50 cursor-pointer transition-colors",
                    !notification.read && "bg-primary/5"
                  )}
                  onClick={() => !notification.read && handleMarkAsRead(notification.id)}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg">
                      {typeIcons[notification.type] || "📢"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm",
                        !notification.read && "font-medium"
                      )}>
                        {notification.title}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(notification.created_at), "MMM d, h:mm a")}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="h-2 w-2 rounded-full bg-accent flex-shrink-0 mt-1.5" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="border-t p-2">
          <Link to="/notifications" onClick={() => setIsOpen(false)}>
            <Button variant="ghost" size="sm" className="w-full">
              View all notifications
            </Button>
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
