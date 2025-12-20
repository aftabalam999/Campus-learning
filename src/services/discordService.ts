/**
 * Discord Service
 * 
 * Handles all Discord webhook integrations for:
 * - Login notifications (individual and daily summaries)
 * - Attendance alerts
 * - Daily activity reports
 */

export interface DiscordUser {
  name: string;
  discord_user_id?: string;
  campus?: string;
  role?: string;
  login_time?: Date;
  house?: string;
  campus_joining_date?: Date;
}

export interface AttendanceSummary {
  date: string;
  total_logins: number;
  users: DiscordUser[];
  by_campus?: Record<string, number>;
  by_role?: Record<string, number>;
}

export class DiscordService {
  // Webhook URL should be configured in .env as VITE_DISCORD_WEBHOOK_URL
  private static WEBHOOK_URL = process.env.REACT_APP_DISCORD_WEBHOOK_URL || '';
  private static RATE_LIMIT_DELAY = 2000; // 2 seconds between requests (safe: 30/min limit)
  private static lastRequestTime = 0;

  /**
   * Rate limiter to prevent hitting Discord's 30 requests/minute limit
   */
  private static async rateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.RATE_LIMIT_DELAY) {
      const waitTime = this.RATE_LIMIT_DELAY - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Send a message to Discord webhook
   */
  private static async sendWebhook(payload: any): Promise<void> {
    if (!this.WEBHOOK_URL) {
      console.warn('Discord webhook URL not configured');
      return;
    }

    try {
      await this.rateLimit();

      const response = await fetch(this.WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Discord API error: ${response.status} ${response.statusText}`);
      }

      console.log('✅ Discord webhook sent successfully');
    } catch (error) {
      console.error('❌ Failed to send Discord webhook:', error);
      throw error;
    }
  }

  /**
   * Send individual login notification
   * Called immediately when a user logs in
   */
  static async sendLoginNotification(user: DiscordUser): Promise<void> {
    const mentionUser = user.discord_user_id 
      ? `<@${user.discord_user_id.replace(/[@#]/g, '')}>` 
      : user.name;

    const time = user.login_time 
      ? user.login_time.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
      : new Date().toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });

    const embed = {
      title: '✅ Login Notification',
      description: `${mentionUser} just logged in!`,
      color: 0x10b981, // Green
      fields: [
        {
          name: '👤 User',
          value: user.name,
          inline: true,
        },
        {
          name: '🏫 Campus',
          value: user.campus || 'N/A',
          inline: true,
        },
        {
          name: '🎭 Role',
          value: user.role || 'Student',
          inline: true,
        },
        {
          name: '⏰ Time',
          value: time,
          inline: true,
        },
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Campus Learning Dashboard',
      },
    };

    await this.sendWebhook({
      embeds: [embed],
    });
  }

  /**
   * Send first-time login notification
   * Called when a user logs in for the very first time
   */
  static async sendFirstTimeLoginNotification(user: DiscordUser): Promise<void> {
    const mentionUser = user.discord_user_id 
      ? `<@${user.discord_user_id.replace(/[@#]/g, '')}>` 
      : user.name;

    const time = user.login_time 
      ? user.login_time.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
      : new Date().toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });

    const joiningDate = user.campus_joining_date
      ? user.campus_joining_date.toLocaleDateString('en-IN', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : 'Not set';

    const fields = [
      {
        name: '👤 User',
        value: user.name,
        inline: true,
      },
      {
        name: '🏫 Campus',
        value: user.campus || 'Not set',
        inline: true,
      },
      {
        name: '🎭 Role',
        value: user.role || 'Student',
        inline: true,
      },
      {
        name: '⏰ Login Time',
        value: time,
        inline: true,
      },
    ];

    // Add house if available
    if (user.house) {
      fields.push({
        name: '🏠 House',
        value: user.house,
        inline: true,
      });
    }

    // Add joining date if available
    if (user.campus_joining_date) {
      fields.push({
        name: '📅 Joining Date',
        value: joiningDate,
        inline: true,
      });
    }

    const embed = {
      title: '🎉 First-Time Login!',
      description: `${mentionUser} has logged in for the **first time**! Welcome aboard! 🚀`,
      color: 0xf59e0b, // Orange/Gold - to stand out
      fields,
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Campus Learning Dashboard - Welcome Team!',
      },
    };

    await this.sendWebhook({
      content: '🎊 **New User Alert!** 🎊',
      embeds: [embed],
    });
  }

  /**
   * Send hourly attendance summary
   * Lists all users who logged in during the past hour
   */
  static async sendHourlySummary(summary: AttendanceSummary): Promise<void> {
    if (summary.total_logins === 0) {
      console.log('No logins in the past hour, skipping summary');
      return;
    }

    const userList = summary.users.slice(0, 25).map((user, index) => {
      const mention = user.discord_user_id 
        ? `<@${user.discord_user_id.replace(/[@#]/g, '')}>` 
        : user.name;
      return `${index + 1}. ${mention} (${user.campus || 'N/A'})`;
    }).join('\n');

    const moreUsers = summary.total_logins > 25 
      ? `\n_...and ${summary.total_logins - 25} more_` 
      : '';

    const campusBreakdown = summary.by_campus 
      ? Object.entries(summary.by_campus)
          .map(([campus, count]) => `${campus}: ${count}`)
          .join(', ')
      : 'N/A';

    const embed = {
      title: '📊 Hourly Attendance Summary',
      description: `**${summary.total_logins}** users logged in during the past hour`,
      color: 0x3b82f6, // Blue
      fields: [
        {
          name: '👥 Active Users',
          value: userList + moreUsers,
          inline: false,
        },
        {
          name: '🏫 By Campus',
          value: campusBreakdown,
          inline: false,
        },
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Campus Learning Dashboard - Hourly Report',
      },
    };

    await this.sendWebhook({
      content: '⏰ **Hourly Attendance Update**',
      embeds: [embed],
    });
  }

  /**
   * Send daily attendance summary
   * Comprehensive report of all logins for the day
   */
  static async sendDailySummary(summary: AttendanceSummary): Promise<void> {
    if (summary.total_logins === 0) {
      await this.sendWebhook({
        content: '📅 **Daily Attendance Report**',
        embeds: [{
          title: '📊 No Logins Today',
          description: 'No users logged in today.',
          color: 0xef4444, // Red
          timestamp: new Date().toISOString(),
          footer: {
            text: 'Campus Learning Dashboard - Daily Report',
          },
        }],
      });
      return;
    }

    const topUsers = summary.users.slice(0, 20).map((user, index) => {
      const mention = user.discord_user_id 
        ? `<@${user.discord_user_id.replace(/[@#]/g, '')}>` 
        : user.name;
      return `${index + 1}. ${mention} - ${user.campus || 'N/A'}`;
    }).join('\n');

    const moreUsers = summary.total_logins > 20 
      ? `\n_...and ${summary.total_logins - 20} more users_` 
      : '';

    const campusBreakdown = summary.by_campus 
      ? Object.entries(summary.by_campus)
          .sort(([, a], [, b]) => (b as number) - (a as number))
          .map(([campus, count]) => `• ${campus}: **${count}** users`)
          .join('\n')
      : 'N/A';

    const roleBreakdown = summary.by_role 
      ? Object.entries(summary.by_role)
          .map(([role, count]) => `• ${role}: **${count}**`)
          .join('\n')
      : 'N/A';

    const embed = {
      title: '📅 Daily Attendance Report',
      description: `**${summary.total_logins}** total logins on ${summary.date}`,
      color: 0x8b5cf6, // Purple
      fields: [
        {
          name: '🏆 Today\'s Active Users',
          value: topUsers + moreUsers,
          inline: false,
        },
        {
          name: '🏫 Campus Breakdown',
          value: campusBreakdown,
          inline: true,
        },
        {
          name: '🎭 Role Breakdown',
          value: roleBreakdown,
          inline: true,
        },
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Campus Learning Dashboard - Daily Report',
      },
    };

    await this.sendWebhook({
      content: '🎉 **Daily Attendance Report is Ready!**',
      embeds: [embed],
    });
  }

  /**
   * Send attendance alert for low turnout
   */
  static async sendLowAttendanceAlert(
    expectedCount: number, 
    actualCount: number,
    date: string
  ): Promise<void> {
    const percentage = ((actualCount / expectedCount) * 100).toFixed(1);

    const embed = {
      title: '⚠️ Low Attendance Alert',
      description: `Attendance is below expected levels for ${date}`,
      color: 0xf59e0b, // Amber
      fields: [
        {
          name: '📊 Statistics',
          value: `Expected: **${expectedCount}** users\nActual: **${actualCount}** users\nAttendance Rate: **${percentage}%**`,
          inline: false,
        },
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Campus Learning Dashboard - Alert System',
      },
    };

    await this.sendWebhook({
      content: '@here 🚨 **Attention Required**',
      embeds: [embed],
    });
  }

  /**
   * Send custom message to Discord
   */
  static async sendCustomMessage(
    title: string,
    description: string,
    color: number = 0x3b82f6
  ): Promise<void> {
    const embed = {
      title,
      description,
      color,
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Campus Learning Dashboard',
      },
    };

    await this.sendWebhook({
      embeds: [embed],
    });
  }

  /**
   * Test Discord webhook connection
   */
  static async testConnection(): Promise<boolean> {
    try {
      await this.sendCustomMessage(
        '🧪 Test Message',
        'Discord webhook is configured correctly! ✅',
        0x10b981
      );
      return true;
    } catch (error) {
      console.error('Discord webhook test failed:', error);
      return false;
    }
  }
}
