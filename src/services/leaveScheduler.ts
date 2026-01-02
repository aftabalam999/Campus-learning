import { LeaveManagementService } from './leaveManagementService';

export class LeaveScheduler {
  private static intervalId: NodeJS.Timeout | null = null;

  // Start the scheduler (runs every hour)
  static start() {
    if (this.intervalId) {
      console.log('Leave scheduler is already running');
      return;
    }

    console.log('Starting leave scheduler...');

    // Run immediately on start
    this.checkAndExpireLeaves();

    // Then run every hour
    this.intervalId = setInterval(() => {
      this.checkAndExpireLeaves();
    }, 60 * 60 * 1000); // 1 hour

    // Also schedule a check at midnight
    this.scheduleMidnightCheck();
  }

  // Stop the scheduler
  static stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Leave scheduler stopped');
    }
  }

  // Check and expire leaves
  private static async checkAndExpireLeaves() {
    try {
      console.log('Checking for expired leaves...');
      
      // Activate future leaves that have started
      await LeaveManagementService.activateFutureLeaves();
      
      // Expire kitchen leaves (auto-changes status to active or next active leave)
      await LeaveManagementService.expireKitchenLeaves();
      
      // Check and notify for expired on leaves (doesn't auto-change status)
      await LeaveManagementService.checkExpiredOnLeaves();
      
      console.log('Leave expiration check completed');
    } catch (error) {
      console.error('Error checking expired leaves:', error);
    }
  }

  // Schedule a check to run at midnight
  private static scheduleMidnightCheck() {
    const now = new Date();
    const tonight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1, // Next day
      0, 0, 0 // Midnight
    );
    const msUntilMidnight = tonight.getTime() - now.getTime();

    setTimeout(() => {
      this.checkAndExpireLeaves();
      // Reschedule for next midnight
      this.scheduleMidnightCheck();
    }, msUntilMidnight);

    console.log(`Scheduled midnight check in ${Math.round(msUntilMidnight / 1000 / 60)} minutes`);
  }

  // Manual trigger for testing
  static async manualCheck() {
    console.log('Manual leave expiration check triggered');
    await this.checkAndExpireLeaves();
  }
}
