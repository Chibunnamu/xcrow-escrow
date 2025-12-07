import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Bell, Check, CheckCheck, User, CreditCard, Package, AlertTriangle, DollarSign, Shield } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { firestoreTimestampToDate } from "../utils/firestoreTimestampToDate";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  isRead: number;
  createdAt: string;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'user_registered':
    case 'user_login':
      return User;
    case 'payment_successful':
    case 'payment_failed':
      return CreditCard;
    case 'transaction_created':
    case 'transaction_accepted':
    case 'transaction_asset_transferred':
    case 'transaction_completed':
    case 'transaction_cancelled':
      return Package;
    case 'payout_successful':
    case 'payout_failed':
      return DollarSign;
    case 'dispute_created':
    case 'dispute_resolved':
      return AlertTriangle;
    case 'system_maintenance':
    case 'security_alert':
      return Shield;
    default:
      return Bell;
  }
};

const getNotificationColor = (type: string) => {
  switch (type) {
    case 'user_registered':
    case 'user_login':
    case 'transaction_completed':
    case 'payment_successful':
    case 'payout_successful':
      return 'text-green-600 bg-green-50 border-green-200';
    case 'payment_failed':
    case 'payout_failed':
    case 'transaction_cancelled':
      return 'text-red-600 bg-red-50 border-red-200';
    case 'dispute_created':
    case 'security_alert':
      return 'text-orange-600 bg-orange-50 border-orange-200';
    case 'system_maintenance':
      return 'text-blue-600 bg-blue-50 border-blue-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
};

export const Notifications = (): JSX.Element => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: notificationsData, isLoading } = useQuery<{ notifications: Notification[] }>({
    queryKey: ["/api/notifications"],
  });

  const { data: unreadCountData } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const res = await apiRequest("PATCH", `/api/notifications/${notificationId}/read`, {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to mark notification as read",
        variant: "destructive",
      });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", "/api/notifications/mark-all-read", {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
      toast({
        title: "Success",
        description: "All notifications marked as read",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to mark all notifications as read",
        variant: "destructive",
      });
    },
  });

  const handleMarkAsRead = (notificationId: string) => {
    markAsReadMutation.mutate(notificationId);
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[#493d9e]" />
      </div>
    );
  }

  const notifications = notificationsData?.notifications || [];
  const unreadCount = unreadCountData?.count || 0;

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Notifications</h1>
              <p className="text-gray-600">
                Stay updated with your account activity and transaction status
              </p>
            </div>
            {unreadCount > 0 && (
              <Button
                onClick={handleMarkAllAsRead}
                disabled={markAllAsReadMutation.isPending}
                variant="outline"
                className="flex items-center gap-2"
              >
                {markAllAsReadMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCheck className="w-4 h-4" />
                )}
                Mark All as Read
              </Button>
            )}
          </div>
        </header>

        {notifications.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Bell className="w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications yet</h3>
              <p className="text-gray-500 text-center">
                When you have new activity, notifications will appear here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => {
              const Icon = getNotificationIcon(notification.type);
              const colorClass = getNotificationColor(notification.type);
              const isUnread = notification.isRead === 0;

              return (
                <Card
                  key={notification.id}
                  className={`transition-all duration-200 ${
                    isUnread
                      ? 'border-l-4 border-l-[#493d9e] bg-[#493d9e]/5'
                      : 'opacity-75'
                  }`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-full ${colorClass}`}>
                        <Icon className="w-5 h-5" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-gray-900">
                                {notification.title}
                              </h3>
                              {isUnread && (
                                <Badge variant="destructive" className="text-xs px-2 py-0.5">
                                  New
                                </Badge>
                              )}
                            </div>
                            <p className="text-gray-700 mb-2">
                              {notification.message}
                            </p>
                            <p className="text-sm text-gray-500">
                              {(() => {
                                const date = firestoreTimestampToDate(notification.createdAt);
                                if (!date) return "Invalid date";
                                return formatDistanceToNow(date, { addSuffix: true });
                              })()}
                            </p>
                          </div>

                          {isUnread && (
                            <Button
                              onClick={() => handleMarkAsRead(notification.id)}
                              disabled={markAsReadMutation.isPending}
                              variant="ghost"
                              size="sm"
                              className="flex items-center gap-1 text-[#493d9e] hover:text-[#493d9e]/80"
                            >
                              {markAsReadMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Check className="w-4 h-4" />
                              )}
                              Mark as Read
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {notifications.length > 0 && (
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              Showing {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
              {unreadCount > 0 && ` • ${unreadCount} unread`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
