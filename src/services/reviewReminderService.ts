/**
 * Review Reminder Service
 * 
 * Handles automated review reminders for the Monday deadline system.
 * Supports multiple notification channels: in-app, Discord, and email.
 * 
 * Schedule:
 * - Sunday 8:00 PM: Pre-reminder (reviews due tomorrow)
 * - Monday 9:00 AM: Morning reminder (reviews due today)
 * - Monday 6:00 PM: Evening reminder (3 hours before deadline)
 * - Tuesday+: Overdue escalation reminders
 */

import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  Timestamp,
  limit
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { User } from '../types';
import {
  getCurrentWeekStart,
  getDaysOverdue
} from '../utils/reviewDateUtils';
import { MenteeReviewService, MentorReviewService } from './dataServices';

// ==================== TYPES ====================

export type NotificationChannel = 'in_app' | 'discord' | 'email';
export type ReminderType = 'pre_reminder' | 'morning_reminder' | 'evening_reminder' | 'overdue_escalation';

export interface ReviewReminder {
  id?: string;
  user_id: string;
  user_name: string;
  reminder_type: ReminderType;
  channels: NotificationChannel[];
  pending_reviews: {
    user_id: string;
    user_name: string;
    role: 'mentee' | 'mentor';
  }[];
  status: 'pending' | 'sent' | 'failed';
  sent_at?: Date;
  failed_reason?: string;
  created_at: Date;
}

export interface DiscordWebhookPayload {
  content?: string;
  embeds?: Array<{
    title?: string;
    description?: string;
    color?: number;
    fields?: Array<{
      name: string;
      value: string;
      inline?: boolean;
    }>;
    footer?: {
      text: string;
    };
    timestamp?: string;
  }>;
}

// ==================== CONFIGURATION ====================

const DISCORD_WEBHOOK_URL = process.env.REACT_APP_DISCORD_WEBHOOK_URL;


// Color codes for Discord embeds
const DISCORD_COLORS = {
  pre_reminder: 0x3B82F6,      // Blue
  morning_reminder: 0xF59E0B,   // Orange
  evening_reminder: 0xEF4444,   // Red
  overdue_escalation: 0x991B1B  // Dark Red
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Check if user was already reminded today
 */
async function wasRemindedToday(userId: string, reminderType: ReminderType): Promise<boolean> {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const remindersRef = collection(db, 'review_reminders');
    const q = query(
      remindersRef,
      where('user_id', '==', userId),
      where('reminder_type', '==', reminderType),
      where('created_at', '>=', Timestamp.fromDate(todayStart)),
      limit(1)
    );

    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error('Error checking reminder history:', error);
    return false; // Allow sending if check fails
  }
}

/**
 * Get pending reviews for a user
 */
async function getPendingReviews(user: User): Promise<Array<{ user_id: string; user_name: string; role: 'mentee' | 'mentor' }>> {
  const pending: Array<{ user_id: string; user_name: string; role: 'mentee' | 'mentor' }> = [];
  const currentWeekStart = getCurrentWeekStart();

  try {
    // Check if mentor needs to review mentees
    if (user.isMentor) {
      const menteesRef = collection(db, 'users');
      const menteesQuery = query(menteesRef, where('mentor_id', '==', user.id));
      const menteesSnapshot = await getDocs(menteesQuery);

      for (const menteeDoc of menteesSnapshot.docs) {
        const mentee = { id: menteeDoc.id, ...menteeDoc.data() } as User;

        // Check if review submitted this week
        const hasSubmitted = await MenteeReviewService.hasSubmittedThisWeek(
          mentee.id,
          user.id,
          currentWeekStart
        );

        if (!hasSubmitted) {
          pending.push({
            user_id: mentee.id,
            user_name: mentee.name,
            role: 'mentee'
          });
        }
      }
    }

    // Check if student needs to review mentor
    if (user.mentor_id) {
      const hasSubmitted = await MentorReviewService.hasSubmittedThisWeek(
        user.id,
        user.mentor_id,
        currentWeekStart
      );

      if (!hasSubmitted) {
        // Get mentor name
        const mentorRef = collection(db, 'users');
        const mentorQuery = query(mentorRef, where('__name__', '==', user.mentor_id));
        const mentorSnapshot = await getDocs(mentorQuery);

        if (!mentorSnapshot.empty) {
          const mentor = mentorSnapshot.docs[0].data() as User;
          pending.push({
            user_id: user.mentor_id,
            user_name: mentor.name,
            role: 'mentor'
          });
        }
      }
    }
  } catch (error) {
    console.error('Error getting pending reviews:', error);
  }

  return pending;
}

/**
 * Generate reminder message based on type and pending reviews
 */
function generateReminderMessage(
  userName: string,
  reminderType: ReminderType,
  pendingReviews: Array<{ user_id: string; user_name: string; role: 'mentee' | 'mentor' }>,
  daysOverdue?: number
): string {
  const count = pendingReviews.length;
  const names = pendingReviews.slice(0, 3).map(r => r.user_name).join(', ');
  const moreCount = count > 3 ? ` +${count - 3} more` : '';

  switch (reminderType) {
    case 'pre_reminder':
      return `🔔 **Review Reminder**\n\nHi ${userName}! Your weekly reviews are **due tomorrow (Monday) by 11:59 PM**.\n\n**Pending reviews (${count}):** ${names}${moreCount}\n\nPlease complete them before the deadline!`;

    case 'morning_reminder':
      return `☀️ **Morning Reminder**\n\nGood morning ${userName}! Your reviews are **DUE TODAY by 11:59 PM**.\n\n**Pending reviews (${count}):** ${names}${moreCount}\n\nDon't forget to submit them before the deadline!`;

    case 'evening_reminder':
      return `⚠️ **Final Reminder**\n\nHi ${userName}, you have **3 hours left** to submit your reviews (deadline: 11:59 PM tonight).\n\n**Still pending (${count}):** ${names}${moreCount}\n\nPlease complete them now to avoid being overdue!`;

    case 'overdue_escalation':
      return `🚨 **OVERDUE ALERT**\n\n${userName}, your reviews are now **${daysOverdue} day${daysOverdue! > 1 ? 's' : ''} overdue**!\n\n**Overdue reviews (${count}):** ${names}${moreCount}\n\nPlease submit them immediately. Contact your mentor/admin if you need help.`;

    default:
      return `You have ${count} pending review${count > 1 ? 's' : ''}.`;
  }
}

/**
 * Build Discord embed for reminder
 */
function buildDiscordEmbed(
  user: User,
  reminderType: ReminderType,
  pendingReviews: Array<{ user_id: string; user_name: string; role: 'mentee' | 'mentor' }>,
  daysOverdue?: number
): DiscordWebhookPayload {
  const count = pendingReviews.length;

  // Determine title and description
  let title = '';
  let description = '';

  switch (reminderType) {
    case 'pre_reminder':
      title = '🔔 Review Reminder - Due Tomorrow';
      description = `Reviews are due **tomorrow (Monday) by 11:59 PM**`;
      break;
    case 'morning_reminder':
      title = '☀️ Review Reminder - Due Today';
      description = `Reviews are **DUE TODAY by 11:59 PM**`;
      break;
    case 'evening_reminder':
      title = '⚠️ Final Reminder - 3 Hours Left';
      description = `Only **3 hours remaining** until the deadline (11:59 PM tonight)`;
      break;
    case 'overdue_escalation':
      title = `🚨 OVERDUE ALERT - ${daysOverdue} Day${daysOverdue! > 1 ? 's' : ''} Late`;
      description = `Reviews are **${daysOverdue} day${daysOverdue! > 1 ? 's' : ''} overdue**. Please submit immediately!`;
      break;
  }

  // Build fields for each pending review
  const fields = pendingReviews.slice(0, 5).map((review, index) => ({
    name: `${index + 1}. ${review.role === 'mentee' ? '👤 Mentee' : '👨‍🏫 Mentor'}`,
    value: review.user_name,
    inline: true
  }));

  if (count > 5) {
    fields.push({
      name: 'Additional',
      value: `+${count - 5} more pending`,
      inline: true
    });
  }

  // Tag user if Discord ID available
  const content = user.discord_user_id
    ? `<@${user.discord_user_id}>`
    : `**${user.name}**`;

  return {
    content,
    embeds: [{
      title,
      description,
      color: DISCORD_COLORS[reminderType],
      fields,
      footer: {
        text: 'Campus Learning Dashboard - Review System'
      },
      timestamp: new Date().toISOString()
    }]
  };
}

// ==================== CORE SERVICE ====================

export class ReviewReminderService {
  /**
   * Send reminder to a single user
   */
  static async sendReminder(
    user: User,
    reminderType: ReminderType,
    pendingReviews: Array<{ user_id: string; user_name: string; role: 'mentee' | 'mentor' }>,
    daysOverdue?: number
  ): Promise<boolean> {
    try {
      // Check if already reminded today
      const alreadyReminded = await wasRemindedToday(user.id, reminderType);
      if (alreadyReminded) {
        console.log(`⏭️ User ${user.name} already reminded today, skipping...`);
        return false;
      }

      // Determine channels to use
      const channels: NotificationChannel[] = [];
      const prefs = user.notification_preferences || {};

      if (prefs.in_app !== false) channels.push('in_app');
      if (prefs.discord !== false && user.discord_user_id && DISCORD_WEBHOOK_URL) channels.push('discord');
      if (prefs.email !== false && user.email) channels.push('email');

      if (channels.length === 0) {
        console.log(`No notification channels enabled for ${user.name}`);
        return false;
      }

      // Create reminder record
      const reminder: ReviewReminder = {
        user_id: user.id,
        user_name: user.name,
        reminder_type: reminderType,
        channels,
        pending_reviews: pendingReviews,
        status: 'pending',
        created_at: new Date()
      };

      // Send to each channel
      const results = await Promise.allSettled([
        channels.includes('in_app') ? this.sendInAppNotification(user, reminderType, pendingReviews, daysOverdue) : Promise.resolve(true),
        channels.includes('discord') ? this.sendDiscordNotification(user, reminderType, pendingReviews, daysOverdue) : Promise.resolve(true),
        channels.includes('email') ? this.sendEmailNotification(user, reminderType, pendingReviews, daysOverdue) : Promise.resolve(true)
      ]);

      // Check if at least one succeeded
      const hasSuccess = results.some(r => r.status === 'fulfilled' && r.value === true);

      if (hasSuccess) {
        reminder.status = 'sent';
        reminder.sent_at = new Date();
      } else {
        reminder.status = 'failed';
        reminder.failed_reason = 'All channels failed';
      }

      // Save reminder record
      await addDoc(collection(db, 'review_reminders'), {
        ...reminder,
        created_at: Timestamp.fromDate(reminder.created_at),
        sent_at: reminder.sent_at ? Timestamp.fromDate(reminder.sent_at) : null
      });

      console.log(`✅ Reminder sent to ${user.name} via ${channels.join(', ')}`);
      return true;

    } catch (error) {
      console.error(`Error sending reminder to ${user.name}:`, error);
      return false;
    }
  }

  /**
   * Send in-app notification
   */
  private static async sendInAppNotification(
    user: User,
    reminderType: ReminderType,
    pendingReviews: Array<{ user_id: string; user_name: string; role: 'mentee' | 'mentor' }>,
    daysOverdue?: number
  ): Promise<boolean> {
    try {
      const message = generateReminderMessage(user.name, reminderType, pendingReviews, daysOverdue);

      await addDoc(collection(db, 'notifications'), {
        user_id: user.id,
        title: 'Review Reminder',
        message,
        type: 'review_reminder',
        priority: reminderType === 'overdue_escalation' ? 'high' : 'normal',
        is_read: false,
        created_at: Timestamp.now()
      });

      return true;
    } catch (error) {
      console.error('Error sending in-app notification:', error);
      return false;
    }
  }

  /**
   * Send Discord webhook notification
   */
  private static async sendDiscordNotification(
    user: User,
    reminderType: ReminderType,
    pendingReviews: Array<{ user_id: string; user_name: string; role: 'mentee' | 'mentor' }>,
    daysOverdue?: number
  ): Promise<boolean> {
    if (!DISCORD_WEBHOOK_URL) {
      console.warn('Discord webhook URL not configured');
      return false;
    }

    try {
      const payload = buildDiscordEmbed(user, reminderType, pendingReviews, daysOverdue);

      const response = await fetch(DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Discord API error: ${response.status}`);
      }

      return true;
    } catch (error) {
      console.error('Error sending Discord notification:', error);
      return false;
    }
  }

  /**
   * Send email notification (placeholder)
   */
  private static async sendEmailNotification(
    user: User,
    reminderType: ReminderType,
    pendingReviews: Array<{ user_id: string; user_name: string; role: 'mentee' | 'mentor' }>,
    daysOverdue?: number
  ): Promise<boolean> {
    // TODO: Implement email service integration
    console.log(`📧 Email notification for ${user.name} (not implemented yet)`);
    return false;
  }

  // ==================== SCHEDULED REMINDERS ====================

  /**
   * Sunday 8:00 PM - Pre-reminder (reviews due tomorrow)
   */
  static async sendSundayReminder(): Promise<{ sent: number; failed: number }> {
    console.log('📅 Running Sunday pre-reminder job...');

    try {
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);

      let sent = 0;
      let failed = 0;

      for (const userDoc of usersSnapshot.docs) {
        const user = { id: userDoc.id, ...userDoc.data() } as User;

        // Skip inactive users
        if (user.status !== 'active') continue;

        // Get pending reviews
        const pendingReviews = await getPendingReviews(user);

        if (pendingReviews.length > 0) {
          const success = await this.sendReminder(user, 'pre_reminder', pendingReviews);
          if (success) sent++;
          else failed++;
        }
      }

      console.log(`✅ Sunday reminder complete: ${sent} sent, ${failed} failed`);
      return { sent, failed };

    } catch (error) {
      console.error('Error in Sunday reminder job:', error);
      return { sent: 0, failed: 0 };
    }
  }

  /**
   * Monday 9:00 AM - Morning reminder (reviews due today)
   */
  static async sendMondayMorningReminder(): Promise<{ sent: number; failed: number }> {
    console.log('☀️ Running Monday morning reminder job...');

    try {
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);

      let sent = 0;
      let failed = 0;

      for (const userDoc of usersSnapshot.docs) {
        const user = { id: userDoc.id, ...userDoc.data() } as User;

        if (user.status !== 'active') continue;

        const pendingReviews = await getPendingReviews(user);

        if (pendingReviews.length > 0) {
          const success = await this.sendReminder(user, 'morning_reminder', pendingReviews);
          if (success) sent++;
          else failed++;
        }
      }

      console.log(`✅ Monday morning reminder complete: ${sent} sent, ${failed} failed`);
      return { sent, failed };

    } catch (error) {
      console.error('Error in Monday morning reminder job:', error);
      return { sent: 0, failed: 0 };
    }
  }

  /**
   * Monday 6:00 PM - Evening reminder (3 hours before deadline)
   */
  static async sendMondayEveningReminder(): Promise<{ sent: number; failed: number }> {
    console.log('🌆 Running Monday evening reminder job...');

    try {
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);

      let sent = 0;
      let failed = 0;

      for (const userDoc of usersSnapshot.docs) {
        const user = { id: userDoc.id, ...userDoc.data() } as User;

        if (user.status !== 'active') continue;

        const pendingReviews = await getPendingReviews(user);

        if (pendingReviews.length > 0) {
          const success = await this.sendReminder(user, 'evening_reminder', pendingReviews);
          if (success) sent++;
          else failed++;
        }
      }

      console.log(`✅ Monday evening reminder complete: ${sent} sent, ${failed} failed`);
      return { sent, failed };

    } catch (error) {
      console.error('Error in Monday evening reminder job:', error);
      return { sent: 0, failed: 0 };
    }
  }

  /**
   * Tuesday+ - Overdue escalation reminders
   */
  static async sendOverdueReminder(): Promise<{ sent: number; failed: number }> {
    console.log('🚨 Running overdue escalation reminder job...');

    try {
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);

      const currentWeekStart = getCurrentWeekStart();
      const daysOverdue = getDaysOverdue(currentWeekStart);

      let sent = 0;
      let failed = 0;

      for (const userDoc of usersSnapshot.docs) {
        const user = { id: userDoc.id, ...userDoc.data() } as User;

        if (user.status !== 'active') continue;

        const pendingReviews = await getPendingReviews(user);

        if (pendingReviews.length > 0 && daysOverdue > 0) {
          const success = await this.sendReminder(user, 'overdue_escalation', pendingReviews, daysOverdue);
          if (success) sent++;
          else failed++;
        }
      }

      console.log(`✅ Overdue reminder complete: ${sent} sent, ${failed} failed`);
      return { sent, failed };

    } catch (error) {
      console.error('Error in overdue reminder job:', error);
      return { sent: 0, failed: 0 };
    }
  }
}

export default ReviewReminderService;
