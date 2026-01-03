/**
 * Attendance Scheduler Service
 * 
 * Handles automatic scheduling of attendance reports to Discord
 * - Sends daily attendance reports at 10:00 AM
 * - Supports campus-wise reporting
 */

import { AttendanceTrackingService, DailyAttendanceStats, StudentDailyStatus } from './attendanceTrackingService';
import { DiscordService } from './discordService';

export class AttendanceScheduler {
  private static schedulerInterval: NodeJS.Timeout | null = null;
  private static isRunning = false;
  private static lastReportDate: string | null = null; // Track last sent report date
  private static isSendingReport = false; // Prevent concurrent sending

  /**
   * Start the attendance scheduler
   * Checks every minute and sends report at 10:00 AM
   */
  static startScheduler(): void {
    if (this.isRunning) {
      console.log('⚠️ Attendance scheduler is already running - skipping duplicate start');
      return;
    }

    // Double-check if there's an existing interval
    if (this.schedulerInterval) {
      console.log('⚠️ Clearing existing scheduler interval');
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
    }

    console.log('🚀 Starting attendance scheduler...');
    this.isRunning = true;

    // Check immediately on start
    this.checkAndSendReport();

    // Then check every minute
    this.schedulerInterval = setInterval(() => {
      this.checkAndSendReport();
    }, 60000); // Check every 1 minute

    console.log('✅ Attendance scheduler started successfully - reports will be sent at 10:00 AM daily');
  }

  /**
   * Stop the attendance scheduler
   */
  static stopScheduler(): void {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
      this.isRunning = false;
      console.log('🛑 Attendance scheduler stopped');
    }
  }

  /**
   * Check if it's time to send the report (10:00 AM)
   */
  private static async checkAndSendReport(): Promise<void> {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    const todayDate = now.toISOString().split('T')[0];

    // Log current time for debugging (only at the start of each minute)
    if (seconds === 0) {
      console.log(`⏰ Scheduler check: ${hours}:${minutes.toString().padStart(2, '0')}`);
    }

    // Send report at 10:00 AM (hours === 10 and minutes === 0)
    // Only send once per day by checking lastReportDate
    // Also check if not already sending to prevent duplicates
    if (hours === 10 && minutes === 0 && this.lastReportDate !== todayDate && !this.isSendingReport) {
      console.log('⏰ It\'s 10:00 AM - Sending morning attendance reports...');
      this.isSendingReport = true; // Lock to prevent concurrent sends
      this.lastReportDate = todayDate; // Mark as sent for today
      
      try {
        await this.sendAllCampusReports();
        console.log('✅ Morning attendance reports sent successfully');
      } catch (error) {
        console.error('❌ Error sending morning reports:', error);
      } finally {
        this.isSendingReport = false; // Unlock after sending
      }
    }
  }

  /**
   * Send attendance reports for all campuses
   */
  private static async sendAllCampusReports(): Promise<void> {
    const today = new Date();
    const campuses = ['Dharamshala', 'Dantewada', 'Jashpur', 'Raigarh', 'Pune', 'Sarjapur', 'Kishanganj', 'Eternal'];

    try {
      // Send report for each campus
      for (const campus of campuses) {
        try {
          await this.sendCampusReport(today, campus);
          console.log(`✅ Sent attendance report for ${campus}`);
          
          // Add a small delay between reports to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          console.error(`❌ Failed to send report for ${campus}:`, error);
        }
      }

      // Also send an overall report (all campuses combined)
      try {
        await this.sendCampusReport(today);
        console.log('✅ Sent overall attendance report');
      } catch (error) {
        console.error('❌ Failed to send overall report:', error);
      }
    } catch (error) {
      console.error('❌ Error sending attendance reports:', error);
    }
  }

  /**
   * Send attendance report for a specific campus (or all if campus not specified)
   */
  static async sendCampusReport(date: Date, campus?: string): Promise<void> {
    try {
      // Get attendance statistics
      const stats: DailyAttendanceStats = await AttendanceTrackingService.getDailyStats(date, campus);
      
      // Get student status list to find absent students and categorize by leave type
      const studentStatusList: StudentDailyStatus[] = await AttendanceTrackingService.getStudentDailyStatusList(date, campus);
      
      // Filter absent students (not present and not on leave)
      const absentStudents = studentStatusList
        .filter(status => !status.isPresent && !status.isOnLeave)
        .map(status => status.student.name || status.student.email || 'Unknown');

      // Get students on kitchen leave
      const kitchenLeaveStudents = studentStatusList
        .filter(status => status.isOnLeave && status.leaveType === 'kitchen_leave')
        .map(status => status.student.name || status.student.email || 'Unknown');

      // Get students on regular leave
      const regularLeaveStudents = studentStatusList
        .filter(status => status.isOnLeave && status.leaveType === 'on_leave')
        .map(status => status.student.name || status.student.email || 'Unknown');

      // Get students on unapproved leave
      const unapprovedLeaveStudents = studentStatusList
        .filter(status => status.isOnLeave && status.leaveType === 'unapproved_leave')
        .map(status => status.student.name || status.student.email || 'Unknown');

      // Get unapproved leave details with start dates
      const unapprovedLeaveDetails = studentStatusList
        .filter(status => status.isOnLeave && status.leaveType === 'unapproved_leave')
        .map(status => {
          let startDate = 'Unknown';
          if (status.student.unapproved_leave_start) {
            try {
              // Handle both Date objects and Firestore Timestamps
              const dateObj = status.student.unapproved_leave_start instanceof Date 
                ? status.student.unapproved_leave_start
                : (status.student.unapproved_leave_start as any).toDate 
                  ? (status.student.unapproved_leave_start as any).toDate()
                  : new Date(status.student.unapproved_leave_start);
              
              startDate = dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
            } catch (error) {
              console.error('Error parsing unapproved_leave_start date:', error);
              startDate = 'Unknown';
            }
          }
          return {
            name: status.student.name || status.student.email || 'Unknown',
            startDate
          };
        });

      const totalStudents = stats.totalActiveStudents;
      const presentStudents = stats.studentsPresent;
      const absentCount = totalStudents - presentStudents - stats.studentsOnLeave;

      // Send to Discord
      if (campus) {
        await DiscordService.sendCampusAttendanceReport(
          campus,
          date,
          totalStudents,
          presentStudents,
          absentCount,
          stats.attendanceRate,
          stats.studentsOnKitchenLeave,
          stats.studentsOnRegularLeave,
          stats.studentsOnUnapprovedLeave,
          absentStudents,
          kitchenLeaveStudents,
          regularLeaveStudents,
          unapprovedLeaveStudents,
          unapprovedLeaveDetails
        );
      } else {
        await DiscordService.sendAttendanceReport(
          date,
          totalStudents,
          presentStudents,
          absentCount,
          stats.attendanceRate,
          stats.studentsOnKitchenLeave,
          stats.studentsOnRegularLeave,
          stats.studentsOnUnapprovedLeave,
          absentStudents,
          kitchenLeaveStudents,
          regularLeaveStudents,
          unapprovedLeaveStudents,
          unapprovedLeaveDetails
        );
      }

      console.log(`📊 Attendance report sent for ${campus || 'All Campuses'} - ${stats.attendanceRate.toFixed(1)}% present`);
    } catch (error) {
      console.error(`Error sending attendance report for ${campus || 'All'}:`, error);
      throw error;
    }
  }

  /**
   * Manually trigger attendance report for a specific campus
   * This can be called from the admin dashboard
   */
  static async triggerManualReport(campus?: string): Promise<void> {
    const today = new Date();
    console.log(`📤 Manually sending attendance report for ${campus || 'All Campuses'}...`);
    await this.sendCampusReport(today, campus);
  }

  /**
   * Check if scheduler is running
   */
  static isSchedulerRunning(): boolean {
    return this.isRunning;
  }
}
