import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { GenericNotificationService } from '../../services/genericNotificationService';
import { useAuth } from '../../contexts/AuthContext';
import WebhookNotificationPanel from './WebhookNotificationPanel';

const WebhookNotificationBell: React.FC = () => {
  const { userData } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  useEffect(() => {
    loadUnreadCount();
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(loadUnreadCount, 30000);
    
    return () => clearInterval(interval);
  }, [userData]);

  const loadUnreadCount = async () => {
    if (!userData?.id) return;

    try {
      let count = 0;

      // If user is admin or academic associate, get admin notifications
      if (userData.role === 'admin' || userData.role === 'academic_associate') {
        count = await GenericNotificationService.getUnreadCountForAdmin(userData.id);
      } else {
        // Regular users get their personal notifications
        count = await GenericNotificationService.getUnreadCountForUser(userData.id);
      }

      setUnreadCount(count);
    } catch (err) {
      console.error('Error loading unread count:', err);
    }
  };

  const handleBellClick = () => {
    setIsPanelOpen(true);
  };

  const handlePanelClose = () => {
    setIsPanelOpen(false);
    loadUnreadCount(); // Refresh count when panel closes
  };

  return (
    <>
      <button
        onClick={handleBellClick}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        title="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      <WebhookNotificationPanel
        isOpen={isPanelOpen}
        onClose={handlePanelClose}
      />
    </>
  );
};

export default WebhookNotificationBell;
