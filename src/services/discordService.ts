/**
 * Discord Service
 * 
 * Handles all Discord webhook integrations for:
 * - Login notifications (individual and daily summaries)
 * - Attendance alerts
 * - Daily activity reports
 */

import { WebhookService } from './webhookService';

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
  // Fallback webhook URLs from environment (used if database webhooks are not configured)
  private static WEBHOOK_URL = process.env.REACT_APP_DISCORD_WEBHOOK_URL || '';
  private static WEBHOOK_DHARAMSHALA = process.env.REACT_APP_DISCORD_WEBHOOK_DHARAMSHALA || '';
  private static WEBHOOK_DANTEWADA = process.env.REACT_APP_DISCORD_WEBHOOK_DANTEWADA || '';
  private static WEBHOOK_JASHPUR = process.env.REACT_APP_DISCORD_WEBHOOK_JASHPUR || '';
  private static WEBHOOK_RAIGARH = process.env.REACT_APP_DISCORD_WEBHOOK_RAIGARH || '';
  private static WEBHOOK_PUNE = process.env.REACT_APP_DISCORD_WEBHOOK_PUNE || '';
  private static WEBHOOK_SARJAPUR = process.env.REACT_APP_DISCORD_WEBHOOK_SARJAPUR || '';
  private static WEBHOOK_KISHANGANJ = process.env.REACT_APP_DISCORD_WEBHOOK_KISHANGANJ || '';
  private static WEBHOOK_ETERNAL = process.env.REACT_APP_DISCORD_WEBHOOK_ETERNAL || '';
  
  private static RATE_LIMIT_DELAY = 2000; // 2 seconds between requests (safe: 30/min limit)
  private static lastRequestTime = 0;
  
  // Cache for webhook URLs from database
  private static webhookCache: Map<string, { url: string; timestamp: number }> = new Map();
  private static CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

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
   * Validate if a webhook URL is properly configured
   */
  private static isValidWebhookUrl(url: string): boolean {
    if (!url) return false;
    if (url.includes('YOUR_') || url.includes('WEBHOOK_URL')) return false;
    return url.startsWith('https://discord.com/api/webhooks/');
  }

  /**
   * Send a message to Discord webhook
   */
  private static async sendWebhook(payload: any, webhookUrl?: string): Promise<void> {
    const url = webhookUrl || this.WEBHOOK_URL;
    
    if (!url) {
      console.warn('⚠️ Discord webhook URL not configured');
      throw new Error('Discord webhook URL not configured. Please set up webhook URLs in .env file.');
    }

    if (!this.isValidWebhookUrl(url)) {
      console.error('⚠️ Invalid Discord webhook URL:', url);
      throw new Error('Invalid Discord webhook URL. Please replace placeholder URLs in .env with actual Discord webhook URLs. See README for instructions.');
    }

    try {
      await this.rateLimit();

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Discord API error: ${response.status} ${response.statusText} - ${errorText}`);
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

  /**
   * Get webhook URL for a specific campus from database or fallback to environment
   */
  private static async getCampusWebhook(campus: string): Promise<string> {
    try {
      // Check cache first
      const cached = this.webhookCache.get(campus);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.url;
      }

      // Fetch from database
      const webhookData = await WebhookService.getWebhookByCampus(campus);
      
      if (webhookData && webhookData.webhook_url) {
        // Cache the URL
        this.webhookCache.set(campus, {
          url: webhookData.webhook_url,
          timestamp: Date.now()
        });
        return webhookData.webhook_url;
      }

      // Fallback to environment variables if not found in database
      const campusLower = campus.toLowerCase();
      let fallbackUrl = this.WEBHOOK_URL;

      switch (campusLower) {
        case 'dharamshala':
          fallbackUrl = this.WEBHOOK_DHARAMSHALA || this.WEBHOOK_URL;
          break;
        case 'dantewada':
          fallbackUrl = this.WEBHOOK_DANTEWADA || this.WEBHOOK_URL;
          break;
        case 'jashpur':
          fallbackUrl = this.WEBHOOK_JASHPUR || this.WEBHOOK_URL;
          break;
        case 'raigarh':
          fallbackUrl = this.WEBHOOK_RAIGARH || this.WEBHOOK_URL;
          break;
        case 'pune':
          fallbackUrl = this.WEBHOOK_PUNE || this.WEBHOOK_URL;
          break;
        case 'sarjapur':
        case 'sarjapura':
          fallbackUrl = this.WEBHOOK_SARJAPUR || this.WEBHOOK_URL;
          break;
        case 'kishanganj':
          fallbackUrl = this.WEBHOOK_KISHANGANJ || this.WEBHOOK_URL;
          break;
        case 'eternal':
          fallbackUrl = this.WEBHOOK_ETERNAL || this.WEBHOOK_URL;
          break;
      }

      return fallbackUrl;
    } catch (error) {
      console.error('Error fetching webhook from database, using fallback:', error);
      
      // Fallback to environment variables on error
      const campusLower = campus.toLowerCase();
      switch (campusLower) {
        case 'dharamshala':
          return this.WEBHOOK_DHARAMSHALA || this.WEBHOOK_URL;
        case 'dantewada':
          return this.WEBHOOK_DANTEWADA || this.WEBHOOK_URL;
        case 'jashpur':
          return this.WEBHOOK_JASHPUR || this.WEBHOOK_URL;
        case 'raigarh':
          return this.WEBHOOK_RAIGARH || this.WEBHOOK_URL;
        case 'pune':
          return this.WEBHOOK_PUNE || this.WEBHOOK_URL;
        case 'sarjapur':
        case 'sarjapura':
          return this.WEBHOOK_SARJAPUR || this.WEBHOOK_URL;
        case 'kishanganj':
          return this.WEBHOOK_KISHANGANJ || this.WEBHOOK_URL;
        case 'eternal':
          return this.WEBHOOK_ETERNAL || this.WEBHOOK_URL;
        default:
          return this.WEBHOOK_URL;
      }
    }
  }

  /**
   * Clear webhook cache (useful after updating webhooks in admin panel)
   */
  static clearWebhookCache(campus?: string): void {
    if (campus) {
      this.webhookCache.delete(campus);
    } else {
      this.webhookCache.clear();
    }
  }

  /**
   * Send morning attendance report
   * Called at 10:00 AM daily or triggered manually
   */
  static async sendAttendanceReport(
    date: Date,
    totalStudents: number,
    presentStudents: number,
    absentStudents: number,
    attendanceRate: number,
    studentsOnKitchenLeave: number,
    studentsOnRegularLeave: number,
    studentsOnUnapprovedLeave: number,
    absentStudentsList: string[],
    kitchenLeaveStudentsList: string[],
    regularLeaveStudentsList: string[],
    unapprovedLeaveStudentsList: string[],
    unapprovedLeaveDetails: { name: string; startDate: string }[],
    campus?: string
  ): Promise<void> {
    const webhookUrl = campus ? await this.getCampusWebhook(campus) : this.WEBHOOK_URL;
    
    const dateStr = date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });

    const absentList = absentStudentsList.length > 0 
      ? absentStudentsList.slice(0, 50).join(', ') 
      : 'None';
    
    const moreAbsent = absentStudentsList.length > 50 
      ? `\n_...and ${absentStudentsList.length - 50} more_` 
      : '';

    const kitchenLeaveList = kitchenLeaveStudentsList.length > 0
      ? kitchenLeaveStudentsList.slice(0, 30).join(', ')
      : 'None';
    
    const moreKitchenLeave = kitchenLeaveStudentsList.length > 30
      ? `\n_...and ${kitchenLeaveStudentsList.length - 30} more_`
      : '';

    const regularLeaveList = regularLeaveStudentsList.length > 0
      ? regularLeaveStudentsList.slice(0, 30).join(', ')
      : 'None';
    
    const moreRegularLeave = regularLeaveStudentsList.length > 30
      ? `\n_...and ${regularLeaveStudentsList.length - 30} more_`
      : '';

    const unapprovedLeaveList = unapprovedLeaveDetails.length > 0
      ? unapprovedLeaveDetails.slice(0, 20).map(u => `${u.name} (since ${u.startDate})`).join(', ')
      : 'None';
    
    const moreUnapprovedLeave = unapprovedLeaveDetails.length > 20
      ? `\n_...and ${unapprovedLeaveDetails.length - 20} more_`
      : '';

    // Choose color based on attendance rate
    let color: number;
    if (attendanceRate >= 80) {
      color = 0x10b981; // Green - Good
    } else if (attendanceRate >= 60) {
      color = 0xf59e0b; // Amber - Warning
    } else {
      color = 0xef4444; // Red - Critical
    }

    const campusText = campus ? ` - ${campus}` : '';

    const embed = {
      title: `🌅 Morning Attendance${campusText}`,
      description: `Attendance report for ${dateStr}`,
      color,
      fields: [
        {
          name: '✅ Present',
          value: `${presentStudents} students`,
          inline: false,
        },
        {
          name: '❌ Absent',
          value: `${absentStudents} students`,
          inline: false,
        },
        {
          name: '🍳 Kitchen Leave',
          value: `${studentsOnKitchenLeave} students`,
          inline: false,
        },
        {
          name: '🏖️ On Leave',
          value: `${studentsOnRegularLeave} students`,
          inline: false,
        },
        {
          name: '� Unapproved Leave',
          value: `${studentsOnUnapprovedLeave} students`,
          inline: false,
        },
        {
          name: '�📈 Attendance Rate',
          value: `${attendanceRate.toFixed(1)}%`,
          inline: false,
        },
        {
          name: '👥 Absent Students',
          value: absentList + moreAbsent,
          inline: false,
        },
        {
          name: '🍳 Kitchen Leave Students',
          value: kitchenLeaveList + moreKitchenLeave,
          inline: false,
        },
        {
          name: '🏖️ On Leave Students',
          value: regularLeaveList + moreRegularLeave,
          inline: false,
        },
        {
          name: '🚨 Unapproved Leave Students',
          value: unapprovedLeaveList + moreUnapprovedLeave,
          inline: false,
        },
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Campus Learning Dashboard - Daily Report',
      },
    };

    await this.sendWebhook({
      embeds: [embed],
    }, webhookUrl);
  }

  /**
   * Send attendance report for a specific campus
   */
  static async sendCampusAttendanceReport(
    campus: string,
    date: Date,
    totalStudents: number,
    presentStudents: number,
    absentStudents: number,
    attendanceRate: number,
    studentsOnKitchenLeave: number,
    studentsOnRegularLeave: number,
    studentsOnUnapprovedLeave: number,
    absentStudentsList: string[],
    kitchenLeaveStudentsList: string[],
    regularLeaveStudentsList: string[],
    unapprovedLeaveStudentsList: string[],
    unapprovedLeaveDetails: { name: string; startDate: string }[]
  ): Promise<void> {
    await this.sendAttendanceReport(
      date,
      totalStudents,
      presentStudents,
      absentStudents,
      attendanceRate,
      studentsOnKitchenLeave,
      studentsOnRegularLeave,
      studentsOnUnapprovedLeave,
      absentStudentsList,
      kitchenLeaveStudentsList,
      regularLeaveStudentsList,
      unapprovedLeaveStudentsList,
      unapprovedLeaveDetails,
      campus
    );
  }
}
