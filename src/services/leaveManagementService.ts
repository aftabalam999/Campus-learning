import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp, Timestamp, orderBy, getDoc, deleteField } from 'firebase/firestore';
import { db } from './firebase';
import { Leave, User } from '../types';
import { UserService } from './firestore';

const COLLECTIONS = {
  LEAVES: 'leaves',
  USERS: 'users',
  NOTIFICATIONS: 'notifications'
};

export class LeaveManagementService {
  // Check if there's a conflicting leave on the requested dates
  private static async checkLeaveConflict(userId: string, startDate: Date, endDate: Date): Promise<Leave | null> {
    try {
      const userLeaves = await this.getUserLeaves(userId);
      
      // Normalize dates to compare only date part (ignore time)
      const start = new Date(startDate);
      const end = new Date(endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);

      // Check for overlapping approved or pending leaves
      for (const leave of userLeaves) {
        // Skip rejected and expired leaves
        if (leave.status === 'rejected' || leave.status === 'expired') {
          continue;
        }

        const leaveStart = new Date(leave.start_date);
        const leaveEnd = new Date(leave.end_date);
        leaveStart.setHours(0, 0, 0, 0);
        leaveEnd.setHours(0, 0, 0, 0);

        // Check if dates overlap
        if (start <= leaveEnd && end >= leaveStart) {
          return leave;
        }
      }

      return null;
    } catch (error) {
      console.error('Error checking leave conflict:', error);
      throw error;
    }
  }

  // Create a new leave request
  static async createLeaveRequest(
    userId: string,
    leaveType: 'kitchen_leave' | 'on_leave',
    startDate: Date,
    endDate: Date,
    reason?: string
  ): Promise<Leave> {
    try {
      // Get user details
      const user = await UserService.getUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Validation for kitchen leave (must be single day)
      if (leaveType === 'kitchen_leave') {
        const start = new Date(startDate);
        const end = new Date(endDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);
        
        if (start.getTime() !== end.getTime()) {
          throw new Error('Kitchen leave can only be applied for a single day');
        }
      }

      // Validation for on_leave (must have reason)
      if (leaveType === 'on_leave' && !reason) {
        throw new Error('Reason is mandatory for on leave');
      }

      // Check for conflicting leaves
      const conflictingLeave = await this.checkLeaveConflict(userId, startDate, endDate);
      if (conflictingLeave) {
        const conflictStart = new Date(conflictingLeave.start_date).toLocaleDateString('en-IN');
        const conflictEnd = new Date(conflictingLeave.end_date).toLocaleDateString('en-IN');
        throw new Error(
          `You already have a ${conflictingLeave.leave_type === 'kitchen_leave' ? 'kitchen leave' : 'leave'} request from ${conflictStart} to ${conflictEnd} with status: ${conflictingLeave.status}`
        );
      }

      const leaveData: any = {
        user_id: userId,
        user_name: user.name,
        user_email: user.email,
        leave_type: leaveType,
        start_date: Timestamp.fromDate(startDate),
        end_date: Timestamp.fromDate(endDate),
        status: 'pending',
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      };

      if (reason) {
        leaveData.reason = reason;
      }

      const leaveRef = await addDoc(collection(db, COLLECTIONS.LEAVES), leaveData);

      // Create notification for admins about the new leave request
      await this.createNotification(
        userId,
        'leave_requested',
        'Leave Request Submitted',
        `${user.name} has requested ${leaveType === 'kitchen_leave' ? 'kitchen leave' : 'leave'} from ${startDate.toLocaleDateString('en-IN')} to ${endDate.toLocaleDateString('en-IN')}`,
        leaveRef.id
      );

      const createdLeave = await this.getLeaveById(leaveRef.id);
      return createdLeave!;
    } catch (error) {
      console.error('Error creating leave request:', error);
      throw error;
    }
  }

  // Get leave by ID
  static async getLeaveById(leaveId: string): Promise<Leave | null> {
    try {
      const leaveDoc = await getDoc(doc(db, COLLECTIONS.LEAVES, leaveId));
      if (!leaveDoc.exists()) {
        return null;
      }

      const data = leaveDoc.data();
      return {
        id: leaveDoc.id,
        ...data,
        start_date: data.start_date?.toDate(),
        end_date: data.end_date?.toDate(),
        created_at: data.created_at?.toDate(),
        updated_at: data.updated_at?.toDate(),
        approved_at: data.approved_at?.toDate(),
        rejected_at: data.rejected_at?.toDate()
      } as Leave;
    } catch (error) {
      console.error('Error getting leave by ID:', error);
      throw error;
    }
  }

  // Get all leaves for a user
  static async getUserLeaves(userId: string): Promise<Leave[]> {
    try {
      const leavesRef = collection(db, COLLECTIONS.LEAVES);
      const q = query(
        leavesRef,
        where('user_id', '==', userId),
        orderBy('created_at', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          start_date: data.start_date?.toDate(),
          end_date: data.end_date?.toDate(),
          created_at: data.created_at?.toDate(),
          updated_at: data.updated_at?.toDate(),
          approved_at: data.approved_at?.toDate(),
          rejected_at: data.rejected_at?.toDate()
        } as Leave;
      });
    } catch (error) {
      console.error('Error getting user leaves:', error);
      throw error;
    }
  }

  // Get all pending leave requests (for admin/academic associate)
  static async getPendingLeaves(): Promise<Leave[]> {
    try {
      const leavesRef = collection(db, COLLECTIONS.LEAVES);
      const q = query(
        leavesRef,
        where('status', '==', 'pending'),
        orderBy('created_at', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          start_date: data.start_date?.toDate(),
          end_date: data.end_date?.toDate(),
          created_at: data.created_at?.toDate(),
          updated_at: data.updated_at?.toDate(),
          approved_at: data.approved_at?.toDate(),
          rejected_at: data.rejected_at?.toDate()
        } as Leave;
      });
    } catch (error: any) {
      // If index is still building, return empty array silently
      if (error?.message?.includes('index is currently building')) {
        console.log('[getPendingLeaves] Index is building, returning empty array temporarily');
        return [];
      }
      console.error('Error getting pending leaves:', error);
      throw error;
    }
  }

  // Get all leaves (for admin/academic associate)
  static async getAllLeaves(): Promise<Leave[]> {
    try {
      const leavesRef = collection(db, COLLECTIONS.LEAVES);
      const q = query(leavesRef, orderBy('created_at', 'desc'));

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          start_date: data.start_date?.toDate(),
          end_date: data.end_date?.toDate(),
          created_at: data.created_at?.toDate(),
          updated_at: data.updated_at?.toDate(),
          approved_at: data.approved_at?.toDate(),
          rejected_at: data.rejected_at?.toDate()
        } as Leave;
      });
    } catch (error) {
      console.error('Error getting all leaves:', error);
      throw error;
    }
  }

  // Approve leave request
  static async approveLeave(leaveId: string, approvedBy: string, approvedByName: string): Promise<void> {
    try {
      const leave = await this.getLeaveById(leaveId);
      if (!leave) {
        throw new Error('Leave request not found');
      }

      if (leave.status !== 'pending') {
        throw new Error('Leave request is not pending');
      }

      // Check for conflicting approved leaves (excluding the current leave request and rejected/expired ones)
      const userLeaves = await this.getUserLeaves(leave.user_id);
      
      const start = new Date(leave.start_date);
      const end = new Date(leave.end_date);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);

      for (const existingLeave of userLeaves) {
        // Skip the current leave being approved, rejected, and expired leaves
        if (existingLeave.id === leaveId || existingLeave.status === 'rejected' || existingLeave.status === 'expired') {
          continue;
        }

        // Only check against approved leaves
        if (existingLeave.status === 'approved') {
          const existingStart = new Date(existingLeave.start_date);
          const existingEnd = new Date(existingLeave.end_date);
          existingStart.setHours(0, 0, 0, 0);
          existingEnd.setHours(0, 0, 0, 0);

          // Check if dates overlap with approved leave
          if (start <= existingEnd && end >= existingStart) {
            throw new Error(
              `Cannot approve this leave as there is already an approved ${existingLeave.leave_type === 'kitchen_leave' ? 'kitchen leave' : 'leave'} from ${existingStart.toLocaleDateString('en-IN')} to ${existingEnd.toLocaleDateString('en-IN')}`
            );
          }
        }
      }

      // Update leave status
      const leaveRef = doc(db, COLLECTIONS.LEAVES, leaveId);
      await updateDoc(leaveRef, {
        status: 'approved',
        approved_by: approvedBy,
        approved_by_name: approvedByName,
        approved_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });

      // Update user status based on leave type
      const userStatus = leave.leave_type === 'kitchen_leave' ? 'kitchen_leave' : 'on_leave';
      
      console.log(`[ApproveLeave] Updating user ${leave.user_id} status to: ${userStatus}`);
      console.log(`[ApproveLeave] Leave type: ${leave.leave_type}`);
      
      // First update using UserService to invalidate cache
      await UserService.updateUser(leave.user_id, {
        status: userStatus,
        leave_from: leave.start_date,
        leave_to: leave.end_date,
        updated_at: new Date()
      });

      // Double-check with direct Firestore update to ensure it persists
      const userRef = doc(db, COLLECTIONS.USERS, leave.user_id);
      await updateDoc(userRef, {
        status: userStatus,
        leave_from: Timestamp.fromDate(leave.start_date),
        leave_to: Timestamp.fromDate(leave.end_date),
        updated_at: serverTimestamp()
      });

      console.log(`[ApproveLeave] User status updated successfully`);

      // Verify the update by fetching the user again
      const updatedUser = await UserService.getUserById(leave.user_id);
      console.log(`[ApproveLeave] Verified user status after update:`, updatedUser?.status);

      // Force cache invalidation for user data to ensure UI updates
      const { queryCache } = await import('../utils/cache');
      queryCache.invalidatePattern('users');
      queryCache.invalidate(`users:id:${leave.user_id}`);
      console.log(`[ApproveLeave] Cache invalidated for user ${leave.user_id}`);

      // Create notification for user
      await this.createNotification(
        leave.user_id,
        'leave_approved',
        'Leave Approved',
        `Your leave request from ${leave.start_date.toLocaleDateString()} to ${leave.end_date.toLocaleDateString()} has been approved.`,
        leaveId
      );
    } catch (error) {
      console.error('Error approving leave:', error);
      throw error;
    }
  }

  // Reject leave request
  static async rejectLeave(leaveId: string, rejectedBy: string, rejectedByName: string, rejectionReason?: string): Promise<void> {
    try {
      const leave = await this.getLeaveById(leaveId);
      if (!leave) {
        throw new Error('Leave request not found');
      }

      if (leave.status !== 'pending') {
        throw new Error('Leave request is not pending');
      }

      // Update leave status
      const leaveRef = doc(db, COLLECTIONS.LEAVES, leaveId);
      await updateDoc(leaveRef, {
        status: 'rejected',
        rejected_by: rejectedBy,
        rejected_by_name: rejectedByName,
        rejection_reason: rejectionReason || 'No reason provided',
        rejected_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });

      // Create notification for user
      await this.createNotification(
        leave.user_id,
        'leave_rejected',
        'Leave Rejected',
        `Your leave request from ${leave.start_date.toLocaleDateString()} to ${leave.end_date.toLocaleDateString()} has been rejected. Reason: ${rejectionReason || 'No reason provided'}`,
        leaveId
      );
    } catch (error) {
      console.error('Error rejecting leave:', error);
      throw error;
    }
  }

  // Check and expire kitchen leaves (should be run daily at midnight)
  static async expireKitchenLeaves(): Promise<void> {
    try {
      const now = new Date();

      const leavesRef = collection(db, COLLECTIONS.LEAVES);
      const q = query(
        leavesRef,
        where('leave_type', '==', 'kitchen_leave'),
        where('status', '==', 'approved')
      );

      const snapshot = await getDocs(q);
      const expiredLeaves: Leave[] = [];

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const leave: Leave = {
          id: doc.id,
          ...data,
          start_date: data.start_date?.toDate(),
          end_date: data.end_date?.toDate(),
          created_at: data.created_at?.toDate(),
          updated_at: data.updated_at?.toDate()
        } as Leave;

        // Check if current time is past 11:59:59 PM of the leave's end date
        const leaveEndDateTime = new Date(leave.end_date);
        leaveEndDateTime.setHours(23, 59, 59, 999);

        if (now > leaveEndDateTime) {
          expiredLeaves.push(leave);
        }
      });

      // Expire leaves and update user status
      for (const leave of expiredLeaves) {
        const leaveRef = doc(db, COLLECTIONS.LEAVES, leave.id);
        await updateDoc(leaveRef, {
          status: 'expired',
          updated_at: serverTimestamp()
        });

        // Update user status back to active
        await UserService.updateUser(leave.user_id, {
          status: 'active',
          leave_from: deleteField() as any,
          leave_to: deleteField() as any,
          updated_at: new Date()
        });
      }

      console.log(`Expired ${expiredLeaves.length} kitchen leaves`);
    } catch (error) {
      console.error('Error expiring kitchen leaves:', error);
      throw error;
    }
  }

  // Check and notify for expired on leaves
  static async checkExpiredOnLeaves(): Promise<void> {
    try {
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      const leavesRef = collection(db, COLLECTIONS.LEAVES);
      const q = query(
        leavesRef,
        where('leave_type', '==', 'on_leave'),
        where('status', '==', 'approved')
      );

      const snapshot = await getDocs(q);
      const expiredLeaves: Leave[] = [];

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const leave: Leave = {
          id: doc.id,
          ...data,
          start_date: data.start_date?.toDate(),
          end_date: data.end_date?.toDate(),
          created_at: data.created_at?.toDate(),
          updated_at: data.updated_at?.toDate()
        } as Leave;

        if (leave.end_date < now) {
          expiredLeaves.push(leave);
        }
      });

      // Notify users and admins about expired leaves
      for (const leave of expiredLeaves) {
        // Mark leave as expired
        const leaveRef = doc(db, COLLECTIONS.LEAVES, leave.id);
        await updateDoc(leaveRef, {
          status: 'expired',
          updated_at: serverTimestamp()
        });

        // Notify user
        await this.createNotification(
          leave.user_id,
          'leave_expired',
          'Leave Expired',
          `Your leave period has ended. Please reapply if you need more time or contact admin/academic associate to change your status.`,
          leave.id
        );

        // Notify admins and academic associates
        await this.notifyAdminsAboutExpiredLeave(leave);
      }

      console.log(`Notified about ${expiredLeaves.length} expired on leaves`);
    } catch (error) {
      console.error('Error checking expired on leaves:', error);
      throw error;
    }
  }

  // Notify admins and academic associates about expired leave
  private static async notifyAdminsAboutExpiredLeave(leave: Leave): Promise<void> {
    try {
      // Get all admins and academic associates
      const usersRef = collection(db, COLLECTIONS.USERS);
      const q = query(usersRef, where('role', 'in', ['admin', 'academic_associate']));
      const snapshot = await getDocs(q);

      const notifications = snapshot.docs.map(doc => 
        this.createNotification(
          doc.id,
          'leave_expired_admin',
          'User Leave Expired',
          `${leave.user_name}'s leave period has ended. Their status needs to be changed manually.`,
          leave.id
        )
      );

      await Promise.all(notifications);
    } catch (error) {
      console.error('Error notifying admins about expired leave:', error);
      throw error;
    }
  }

  // Get pending leave count (for notification badge)
  static async getPendingLeaveCount(): Promise<number> {
    try {
      const pendingLeaves = await this.getPendingLeaves();
      return pendingLeaves.length;
    } catch (error: any) {
      // If index is still building, return 0 silently
      if (error?.message?.includes('index is currently building')) {
        console.log('[getPendingLeaveCount] Index is building, returning 0 temporarily');
        return 0;
      }
      console.error('Error getting pending leave count:', error);
      return 0;
    }
  }

  // Create notification
  private static async createNotification(
    userId: string,
    type: string,
    title: string,
    message: string,
    relatedLeaveId?: string
  ): Promise<void> {
    try {
      const notificationData: any = {
        user_id: userId,
        type,
        title,
        message,
        read_by: [],
        created_at: serverTimestamp()
      };

      if (relatedLeaveId) {
        notificationData.related_leave_id = relatedLeaveId;
      }

      await addDoc(collection(db, COLLECTIONS.NOTIFICATIONS), notificationData);
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Get user's active leave
  static async getUserActiveLeave(userId: string): Promise<Leave | null> {
    try {
      const leavesRef = collection(db, COLLECTIONS.LEAVES);
      const q = query(
        leavesRef,
        where('user_id', '==', userId),
        where('status', 'in', ['approved', 'pending']),
        orderBy('created_at', 'desc')
      );

      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        start_date: data.start_date?.toDate(),
        end_date: data.end_date?.toDate(),
        created_at: data.created_at?.toDate(),
        updated_at: data.updated_at?.toDate(),
        approved_at: data.approved_at?.toDate(),
        rejected_at: data.rejected_at?.toDate()
      } as Leave;
    } catch (error) {
      console.error('Error getting user active leave:', error);
      throw error;
    }
  }
}
