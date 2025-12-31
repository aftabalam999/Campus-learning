import { GoalService, ReflectionService } from './dataServices';
import { LeaveManagementService } from './leaveManagementService';

export const NotificationService = {
  getPendingMentorActions: async (studentIds: string[]) => {
    try {
      let pendingGoals = 0;
      let pendingReflections = 0;

      // Get all goals for these students
      await Promise.all(studentIds.map(async (studentId) => {
        const goals = await GoalService.getGoalsByStudent(studentId);
        pendingGoals += goals.filter(goal => goal.status === 'pending').length;
      }));

      // Get all reflections pending review
      await Promise.all(studentIds.map(async (studentId) => {
        const reflections = await ReflectionService.getReflectionsByStudent(studentId);
        pendingReflections += reflections.filter(reflection => !reflection.reviewed_at).length;
      }));

      // Return total count of pending items
      return pendingGoals + pendingReflections;
    } catch (error) {
      console.error('Error fetching pending actions:', error);
      return 0;
    }
  },

  getPendingAdminActions: async () => {
    try {
      // Get pending leave requests count
      const pendingLeaves = await LeaveManagementService.getPendingLeaveCount();
      
      return pendingLeaves;
    } catch (error) {
      console.error('Error fetching pending admin actions:', error);
      return 0;
    }
  }
};