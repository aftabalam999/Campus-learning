import { collection, query, where, getDocs, updateDoc, doc, orderBy, limit, arrayUnion } from 'firebase/firestore';
import { db } from './firebase';
import { COLLECTIONS } from './firestore';
import { WebhookChangeNotification } from '../types';

export interface GenericNotification {
  id: string;
  type: 'webhook_change' | 'leave_requested' | 'leave_approved' | 'leave_rejected' | 'leave_expired' | 'leave_expired_admin' | 'other';
  title: string;
  message: string;
  timestamp: Date;
  read_by: string[];
  related_data?: any;
  created_by?: string;
  user_id?: string;
}

export class GenericNotificationService {
  /**
   * Get all notifications for admin (webhook changes + leave notifications)
   */
  static async getAllAdminNotifications(limitCount: number = 50): Promise<GenericNotification[]> {
    try {
      const notifications: GenericNotification[] = [];

      // Get webhook change notifications
      const webhookQuery = query(
        collection(db, COLLECTIONS.WEBHOOK_CHANGE_NOTIFICATIONS),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );
      
      const webhookSnapshot = await getDocs(webhookQuery);
      const webhookNotifications = webhookSnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          type: 'webhook_change' as const,
          title: `Webhook ${data.change_type}`,
          message: `${data.campus} webhook URL ${data.change_type} by ${data.changed_by_name}`,
          timestamp: data.timestamp?.toDate() || new Date(),
          read_by: data.read_by || [],
          related_data: {
            campus: data.campus,
            change_type: data.change_type,
            changed_by_name: data.changed_by_name,
          },
          created_by: data.changed_by,
        };
      });
      notifications.push(...webhookNotifications);

      // Get leave notifications (for admin only - not student notifications)
      // Include admin-relevant notifications like leave requests and leave expiry alerts
      const leaveQuery = query(
        collection(db, COLLECTIONS.NOTIFICATIONS),
        where('type', 'in', ['leave_requested', 'leave_expired_admin']),
        orderBy('created_at', 'desc'),
        limit(limitCount)
      );
      
      const leaveSnapshot = await getDocs(leaveQuery);
      const leaveNotifications = leaveSnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          type: data.type as GenericNotification['type'],
          title: data.title || 'Leave Notification',
          message: data.message || '',
          timestamp: data.created_at?.toDate() || new Date(),
          read_by: data.read_by || [],
          related_data: {
            related_leave_id: data.related_leave_id,
            user_id: data.user_id,
          },
          user_id: data.user_id,
        };
      });
      notifications.push(...leaveNotifications);

      // Sort all notifications by timestamp
      notifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      // Return limited number
      return notifications.slice(0, limitCount);
    } catch (error) {
      console.error('Error fetching all admin notifications:', error);
      throw error;
    }
  }

  /**
   * Get notifications for a specific user
   */
  static async getUserNotifications(userId: string, limitCount: number = 50): Promise<GenericNotification[]> {
    try {
      const notifications: GenericNotification[] = [];

      // Get user's leave notifications
      const leaveQuery = query(
        collection(db, COLLECTIONS.NOTIFICATIONS),
        where('user_id', '==', userId),
        orderBy('created_at', 'desc'),
        limit(limitCount)
      );
      
      const leaveSnapshot = await getDocs(leaveQuery);
      const leaveNotifications = leaveSnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          type: data.type as GenericNotification['type'],
          title: data.title || 'Notification',
          message: data.message || '',
          timestamp: data.created_at?.toDate() || new Date(),
          read_by: data.read_by || [],
          related_data: {
            related_leave_id: data.related_leave_id,
            user_id: data.user_id,
          },
          user_id: data.user_id,
        };
      });
      notifications.push(...leaveNotifications);

      // Sort by timestamp
      notifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      return notifications.slice(0, limitCount);
    } catch (error) {
      console.error('Error fetching user notifications:', error);
      throw error;
    }
  }

  /**
   * Mark a notification as read
   */
  static async markAsRead(notificationId: string, userId: string, notificationType: GenericNotification['type']): Promise<void> {
    try {
      let collectionName: string;
      
      if (notificationType === 'webhook_change') {
        collectionName = COLLECTIONS.WEBHOOK_CHANGE_NOTIFICATIONS;
      } else {
        collectionName = COLLECTIONS.NOTIFICATIONS;
      }

      const notificationRef = doc(db, collectionName, notificationId);
      await updateDoc(notificationRef, {
        read_by: arrayUnion(userId),
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Get count of unread notifications for admin
   */
  static async getUnreadCountForAdmin(userId: string): Promise<number> {
    try {
      let unreadCount = 0;

      // Count unread webhook notifications
      const webhookQuery = query(
        collection(db, COLLECTIONS.WEBHOOK_CHANGE_NOTIFICATIONS),
        orderBy('timestamp', 'desc'),
        limit(100)
      );
      
      const webhookSnapshot = await getDocs(webhookQuery);
      webhookSnapshot.docs.forEach(docSnap => {
        const readBy = docSnap.data().read_by || [];
        if (!readBy.includes(userId)) {
          unreadCount++;
        }
      });

      // Count unread leave notifications (admin-relevant ones)
      const leaveQuery = query(
        collection(db, COLLECTIONS.NOTIFICATIONS),
        where('type', 'in', ['leave_requested', 'leave_expired_admin']),
        orderBy('created_at', 'desc'),
        limit(100)
      );
      
      const leaveSnapshot = await getDocs(leaveQuery);
      leaveSnapshot.docs.forEach(docSnap => {
        const readBy = docSnap.data().read_by || [];
        if (!readBy.includes(userId)) {
          unreadCount++;
        }
      });

      return unreadCount;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  /**
   * Get count of unread notifications for a user
   */
  static async getUnreadCountForUser(userId: string): Promise<number> {
    try {
      const q = query(
        collection(db, COLLECTIONS.NOTIFICATIONS),
        where('user_id', '==', userId),
        orderBy('created_at', 'desc'),
        limit(100)
      );
      
      const snapshot = await getDocs(q);
      let unreadCount = 0;
      
      snapshot.docs.forEach(docSnap => {
        const readBy = docSnap.data().read_by || [];
        if (!readBy.includes(userId)) {
          unreadCount++;
        }
      });

      return unreadCount;
    } catch (error) {
      console.error('Error getting unread count for user:', error);
      return 0;
    }
  }
}
