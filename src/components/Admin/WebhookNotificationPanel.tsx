import React, { useState, useEffect } from 'react';
import { Bell, X, Check, Loader, Webhook, AlertCircle, FileText, UserCheck, UserX, Clock } from 'lucide-react';
import { GenericNotificationService, GenericNotification } from '../../services/genericNotificationService';
import { useAuth } from '../../contexts/AuthContext';

interface WebhookNotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const WebhookNotificationPanel: React.FC<WebhookNotificationPanelProps> = ({ isOpen, onClose }) => {
  const { userData } = useAuth();
  const [notifications, setNotifications] = useState<GenericNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  const loadNotifications = async () => {
    if (!userData?.id) return;
    
    try {
      setLoading(true);
      
      let allNotifications: GenericNotification[];
      
      // Load admin or user notifications based on role
      if (userData.role === 'admin' || userData.role === 'academic_associate') {
        allNotifications = await GenericNotificationService.getAllAdminNotifications(50);
      } else {
        allNotifications = await GenericNotificationService.getUserNotifications(userData.id, 50);
      }
      
      setNotifications(allNotifications);
    } catch (err) {
      console.error('Error loading notifications:', err);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string, notificationType: GenericNotification['type']) => {
    if (!userData?.id) return;

    try {
      await GenericNotificationService.markAsRead(notificationId, userData.id, notificationType);
      await loadNotifications();
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!userData?.id) return;

    try {
      // Mark all notifications as read
      for (const notification of notifications) {
        if (!isNotificationRead(notification)) {
          await GenericNotificationService.markAsRead(notification.id, userData.id, notification.type);
        }
      }
      await loadNotifications();
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  const getUnreadCount = () => {
    if (!userData?.id) return 0;
    return notifications.filter(
      notif => !notif.read_by || !notif.read_by.includes(userData.id)
    ).length;
  };

  const isNotificationRead = (notification: GenericNotification) => {
    if (!userData?.id) return false;
    return notification.read_by && notification.read_by.includes(userData.id);
  };

  const getNotificationIcon = (type: GenericNotification['type']) => {
    switch (type) {
      case 'webhook_change':
        return <Webhook className="h-5 w-5" />;
      case 'leave_requested':
        return <Bell className="h-5 w-5" />;
      case 'leave_approved':
        return <UserCheck className="h-5 w-5" />;
      case 'leave_rejected':
        return <UserX className="h-5 w-5" />;
      case 'leave_expired':
      case 'leave_expired_admin':
        return <Clock className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const getNotificationColor = (type: GenericNotification['type'], isRead: boolean) => {
    if (isRead) return 'text-gray-400';
    
    switch (type) {
      case 'webhook_change':
        return 'text-purple-600';
      case 'leave_requested':
        return 'text-blue-600';
      case 'leave_approved':
        return 'text-green-600';
      case 'leave_rejected':
        return 'text-red-600';
      case 'leave_expired':
      case 'leave_expired_admin':
        return 'text-orange-600';
      default:
        return 'text-primary-600';
    }
  };

  const getNotificationBadgeColor = (type: GenericNotification['type']) => {
    switch (type) {
      case 'webhook_change':
        return 'bg-purple-100 text-purple-800';
      case 'leave_requested':
        return 'bg-blue-100 text-blue-800';
      case 'leave_approved':
        return 'bg-green-100 text-green-800';
      case 'leave_rejected':
        return 'bg-red-100 text-red-800';
      case 'leave_expired':
      case 'leave_expired_admin':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getNotificationTypeLabel = (type: GenericNotification['type']) => {
    switch (type) {
      case 'webhook_change':
        return 'Webhook';
      case 'leave_requested':
        return 'Leave Request';
      case 'leave_approved':
        return 'Leave Approved';
      case 'leave_rejected':
        return 'Leave Rejected';
      case 'leave_expired':
        return 'Leave Expired';
      case 'leave_expired_admin':
        return 'Leave Expired';
      default:
        return 'Notification';
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-30 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full sm:w-96 bg-white shadow-2xl z-50 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-primary-600 text-white p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Notifications</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-primary-700 rounded transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          {getUnreadCount() > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-primary-100">
                {getUnreadCount()} unread notification{getUnreadCount() !== 1 ? 's' : ''}
              </p>
              <button
                onClick={handleMarkAllAsRead}
                className="text-sm text-primary-100 hover:text-white underline"
              >
                Mark all as read
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="h-8 w-8 animate-spin text-primary-600" />
            </div>
          ) : error ? (
            <div className="p-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <Bell className="h-12 w-12 text-gray-300 mb-3" />
              <p className="text-gray-500 text-center">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {notifications.map(notification => {
                const isRead = isNotificationRead(notification);
                
                return (
                  <div
                    key={notification.id}
                    className={`p-4 transition-colors ${
                      isRead ? 'bg-white' : 'bg-blue-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`flex-shrink-0 mt-0.5 ${getNotificationColor(notification.type, isRead)}`}>
                        {getNotificationIcon(notification.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1">
                            <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${
                              getNotificationBadgeColor(notification.type)
                            }`}>
                              {getNotificationTypeLabel(notification.type)}
                            </span>
                          </div>
                          {!isRead && (
                            <button
                              onClick={() => handleMarkAsRead(notification.id, notification.type)}
                              className="p-1 hover:bg-gray-200 rounded transition-colors"
                              title="Mark as read"
                            >
                              <Check className="h-4 w-4 text-gray-600" />
                            </button>
                          )}
                        </div>

                        <p className={`text-sm mb-2 ${
                          isRead ? 'text-gray-600' : 'text-gray-900 font-medium'
                        }`}>
                          {notification.title}
                        </p>

                        <p className={`text-sm mb-2 ${
                          isRead ? 'text-gray-500' : 'text-gray-700'
                        }`}>
                          {notification.message}
                        </p>

                        {/* Show webhook-specific details */}
                        {notification.type === 'webhook_change' && notification.related_data && (
                          <>
                            {notification.related_data.old_webhook_url && (
                              <div className="mb-2">
                                <p className="text-xs text-gray-500 mb-1">Previous URL:</p>
                                <p className="text-xs text-gray-600 bg-gray-100 rounded p-2 break-all">
                                  {notification.related_data.old_webhook_url}
                                </p>
                              </div>
                            )}
                          </>
                        )}

                        <p className="text-xs text-gray-400">
                          {new Date(notification.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default WebhookNotificationPanel;
