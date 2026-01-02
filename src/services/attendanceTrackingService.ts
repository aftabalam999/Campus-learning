import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  setDoc, 
  onSnapshot, 
  orderBy,
  limit,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { User, DailyGoal, DailyReflection, Attendance } from '../types';

export interface DailyAttendanceStats {
  date: Date;
  totalActiveStudents: number;
  studentsWithApprovedGoals: number;
  studentsWithSubmittedReflections: number;
  studentsPresent: number; // Students with approved goal (marked as present)
  goalApprovalRate: number; // Percentage of students with approved goals
  reflectionSubmissionRate: number; // Percentage of students with reflections
  attendanceRate: number; // Percentage actually present (same as goalApprovalRate)
  studentsOnLeave: number;
  studentsOnKitchenLeave: number; // Students on kitchen leave
  studentsOnRegularLeave: number; // Students on regular leave
  studentsOnUnapprovedLeave: number; // Students on unapproved leave
}

export interface StudentDailyStatus {
  student: User;
  hasApprovedGoal: boolean;
  hasSubmittedReflection: boolean;
  isPresent: boolean;
  isOnLeave: boolean;
  leaveType?: 'kitchen_leave' | 'on_leave' | 'unapproved_leave'; // Type of leave if on leave
  goalDetails?: DailyGoal;
  reflectionDetails?: DailyReflection;
}

export interface MenteeInfo {
  student: User;
  mentor?: User;
  recentGoals: DailyGoal[];
  recentReflections: DailyReflection[];
  attendanceRate: number;
}

export class AttendanceTrackingService {
  /**
   * Get daily attendance statistics for admin dashboard
   */
  static async getDailyStats(date: Date, campus?: string): Promise<DailyAttendanceStats> {
    try {
      // Get all active students (exclude admins, inactive users)
      const activeStudents = await this.getActiveStudents(campus);
      const totalActiveStudents = activeStudents.length;

      // Get students on approved leave for this date (with leave type)
      const studentsOnLeaveData = await this.getStudentsOnLeaveWithType(activeStudents.map(s => s.id), date);
      
      // Also check for students with status set to kitchen_leave, on_leave, or unapproved_leave
      const studentsWithLeaveStatus = activeStudents.filter(s => 
        s.status === 'kitchen_leave' || s.status === 'on_leave' || s.status === 'unapproved_leave'
      );
      
      // Combine leave requests and status-based leaves
      // Priority: User's current status takes precedence over leave records
      const leaveMap = new Map<string, 'kitchen_leave' | 'on_leave' | 'unapproved_leave'>();
      
      // First, add leave records
      studentsOnLeaveData.forEach(l => leaveMap.set(l.studentId, l.leaveType));
      
      // Then, override with current user status (status is the source of truth)
      studentsWithLeaveStatus.forEach(s => {
        leaveMap.set(s.id, s.status as 'kitchen_leave' | 'on_leave' | 'unapproved_leave');
      });
      
      const studentsOnLeave = leaveMap.size;
      const studentsOnKitchenLeave = Array.from(leaveMap.values()).filter(t => t === 'kitchen_leave').length;
      const studentsOnRegularLeave = Array.from(leaveMap.values()).filter(t => t === 'on_leave').length;
      const studentsOnUnapprovedLeave = Array.from(leaveMap.values()).filter(t => t === 'unapproved_leave').length;

      // Get approved goals for the date
      const approvedGoals = await this.getApprovedGoalsForDate(
        activeStudents.map(s => s.id), 
        date
      );
      const studentsWithApprovedGoals = new Set(approvedGoals.map(g => g.student_id)).size;

      // Get submitted reflections for the date
      const submittedReflections = await this.getSubmittedReflectionsForDate(
        activeStudents.map(s => s.id), 
        date
      );
      const studentsWithSubmittedReflections = new Set(submittedReflections.map(r => r.student_id)).size;

      // Calculate who is actually present (approved goal = present)
      const studentsPresent = studentsWithApprovedGoals;

      // Calculate rates (excluding students on leave from denominators)
      const eligibleStudents = totalActiveStudents - studentsOnLeave;
      
      return {
        date,
        totalActiveStudents,
        studentsWithApprovedGoals,
        studentsWithSubmittedReflections,
        studentsPresent,
        goalApprovalRate: eligibleStudents > 0 ? (studentsWithApprovedGoals / eligibleStudents) * 100 : 0,
        reflectionSubmissionRate: eligibleStudents > 0 ? (studentsWithSubmittedReflections / eligibleStudents) * 100 : 0,
        attendanceRate: eligibleStudents > 0 ? (studentsPresent / eligibleStudents) * 100 : 0,
        studentsOnLeave,
        studentsOnKitchenLeave,
        studentsOnRegularLeave,
        studentsOnUnapprovedLeave
      };
    } catch (error) {
      console.error('Error fetching daily attendance stats:', error);
      return {
        date,
        totalActiveStudents: 0,
        studentsWithApprovedGoals: 0,
        studentsWithSubmittedReflections: 0,
        studentsPresent: 0,
        goalApprovalRate: 0,
        reflectionSubmissionRate: 0,
        attendanceRate: 0,
        studentsOnLeave: 0,
        studentsOnKitchenLeave: 0,
        studentsOnRegularLeave: 0,
        studentsOnUnapprovedLeave: 0
      };
    }
  }

  /**
   * Get detailed status for each student on a specific date
   */
  static async getStudentDailyStatusList(date: Date, campus?: string): Promise<StudentDailyStatus[]> {
    const activeStudents = await this.getActiveStudents(campus);
    const studentsOnLeaveData = await this.getStudentsOnLeaveWithType(activeStudents.map(s => s.id), date);
    const leaveMap = new Map(studentsOnLeaveData.map(l => [l.studentId, l.leaveType]));

    const approvedGoals = await this.getApprovedGoalsForDate(
      activeStudents.map(s => s.id), 
      date
    );
    const submittedReflections = await this.getSubmittedReflectionsForDate(
      activeStudents.map(s => s.id), 
      date
    );

    // Create lookup maps
    const goalMap = new Map(approvedGoals.map(g => [g.student_id, g]));
    const reflectionMap = new Map(submittedReflections.map(r => [r.student_id, r]));

    return activeStudents.map(student => {
      const hasApprovedGoal = goalMap.has(student.id);
      const hasSubmittedReflection = reflectionMap.has(student.id);
      
      // Priority: User's current status is the source of truth
      let leaveType: 'kitchen_leave' | 'on_leave' | 'unapproved_leave' | undefined;
      let isOnLeave = false;
      
      // Check user status first
      if (student.status === 'kitchen_leave' || student.status === 'on_leave' || student.status === 'unapproved_leave') {
        isOnLeave = true;
        leaveType = student.status as 'kitchen_leave' | 'on_leave' | 'unapproved_leave';
      } else if (leaveMap.has(student.id)) {
        // Fall back to leave request if status doesn't indicate leave
        isOnLeave = true;
        leaveType = leaveMap.get(student.id);
      }
      
      const isPresent = hasApprovedGoal && !isOnLeave; // Present if goal approved

      return {
        student,
        hasApprovedGoal,
        hasSubmittedReflection,
        isPresent,
        isOnLeave,
        leaveType,
        goalDetails: goalMap.get(student.id),
        reflectionDetails: reflectionMap.get(student.id)
      };
    });
  }

  /**
   * Get mentees for admin mentor override functionality
   */
  static async getMenteesList(adminCampus?: string, searchTerm?: string): Promise<MenteeInfo[]> {
    try {
      const activeStudents = await this.getActiveStudents(adminCampus);
      
      // Filter by search term if provided
      const filteredStudents = searchTerm 
        ? activeStudents.filter(student => 
            student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.email?.toLowerCase().includes(searchTerm.toLowerCase())
          )
        : activeStudents;

      const menteeInfoPromises = filteredStudents.map(async (student) => {
        // Get mentor info
        let mentor: User | undefined;
        if (student.mentor_id) {
          try {
            const mentorQuery = query(
              collection(db, 'users'),
              where('__name__', '==', student.mentor_id)
            );
            const mentorSnapshot = await getDocs(mentorQuery);
            if (!mentorSnapshot.empty) {
              mentor = mentorSnapshot.docs[0].data() as User;
            }
          } catch (error) {
            console.error('Error fetching mentor:', error);
          }
        }

        // Get recent goals (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const recentGoalsQuery = query(
          collection(db, 'daily_goals'),
          where('student_id', '==', student.id),
          where('created_at', '>=', Timestamp.fromDate(sevenDaysAgo)),
          orderBy('created_at', 'desc'),
          limit(10)
        );
        const goalsSnapshot = await getDocs(recentGoalsQuery);
        const recentGoals = goalsSnapshot.docs.map(doc => doc.data() as DailyGoal);

        // Get recent reflections (last 7 days)
        const recentReflectionsQuery = query(
          collection(db, 'daily_reflections'),
          where('student_id', '==', student.id),
          where('created_at', '>=', Timestamp.fromDate(sevenDaysAgo)),
          orderBy('created_at', 'desc'),
          limit(10)
        );
        const reflectionsSnapshot = await getDocs(recentReflectionsQuery);
        const recentReflections = reflectionsSnapshot.docs.map(doc => doc.data() as DailyReflection);

        // Calculate attendance rate (last 7 days)
        const attendanceQuery = query(
          collection(db, 'attendance'),
          where('student_id', '==', student.id),
          where('date', '>=', Timestamp.fromDate(sevenDaysAgo)),
          orderBy('date', 'desc')
        );
        const attendanceSnapshot = await getDocs(attendanceQuery);
        const attendanceRecords = attendanceSnapshot.docs.map(doc => doc.data() as Attendance);
        
        const presentDays = attendanceRecords.filter(r => r.present_status === 'present').length;
        const totalEligibleDays = attendanceRecords.filter(r => r.present_status !== 'on_leave').length;
        const attendanceRate = totalEligibleDays > 0 ? (presentDays / totalEligibleDays) * 100 : 0;

        return {
          student,
          mentor,
          recentGoals,
          recentReflections,
          attendanceRate
        };
      });

      return await Promise.all(menteeInfoPromises);
    } catch (error) {
      console.error('Error fetching mentees list:', error);
      return [];
    }
  }

  /**
   * Update attendance records for all students for a specific date
   */
  static async updateDailyAttendance(date: Date, campus?: string): Promise<void> {
    try {
      const studentStatusList = await this.getStudentDailyStatusList(date, campus);
      
      const attendanceUpdates = studentStatusList.map(async (status) => {
        const attendanceRecord: Attendance = {
          id: `${status.student.id}_${date.toISOString().split('T')[0]}`,
          student_id: status.student.id,
          date,
          goal_reviewed: status.hasApprovedGoal,
          reflection_reviewed: status.hasSubmittedReflection,
          present_status: status.isOnLeave ? 'on_leave' : (status.isPresent ? 'present' : 'absent'),
          created_at: new Date(),
          updated_at: new Date()
        };

        const attendanceRef = doc(db, 'attendance', attendanceRecord.id);
        return setDoc(attendanceRef, attendanceRecord, { merge: true });
      });

      await Promise.all(attendanceUpdates);
      console.log(`Updated attendance for ${studentStatusList.length} students on ${date.toLocaleDateString()}`);
    } catch (error) {
      console.error('Error updating daily attendance:', error);
    }
  }

  /**
   * Set up real-time attendance tracking
   */
  static setupRealtimeAttendanceTracking(date: Date, campus?: string, callback?: (stats: DailyAttendanceStats) => void) {
    const today = new Date(date);
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    // Listen to goals changes
    const goalsQuery = query(
      collection(db, 'daily_goals'),
      where('created_at', '>=', Timestamp.fromDate(startOfDay)),
      where('created_at', '<=', Timestamp.fromDate(endOfDay))
    );

    const goalsUnsubscribe = onSnapshot(goalsQuery, () => {
      this.updateDailyAttendance(date, campus).then(() => {
        if (callback) {
          this.getDailyStats(date, campus).then(callback);
        }
      });
    });

    // Listen to reflections changes
    const reflectionsQuery = query(
      collection(db, 'daily_reflections'),
      where('created_at', '>=', Timestamp.fromDate(startOfDay)),
      where('created_at', '<=', Timestamp.fromDate(endOfDay))
    );

    const reflectionsUnsubscribe = onSnapshot(reflectionsQuery, () => {
      this.updateDailyAttendance(date, campus).then(() => {
        if (callback) {
          this.getDailyStats(date, campus).then(callback);
        }
      });
    });

    // Return cleanup function
    return () => {
      goalsUnsubscribe();
      reflectionsUnsubscribe();
    };
  }

  // Helper methods
  private static async getActiveStudents(campus?: string): Promise<User[]> {
    try {
      let studentsQuery = query(
        collection(db, 'users'),
        where('isAdmin', '!=', true) // Exclude admins
      );

      const snapshot = await getDocs(studentsQuery);
      let students = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));

      // Filter by status, campus, and role (exclude admin and academic_associate)
      // Include active, kitchen_leave, on_leave, and unapproved_leave students (exclude inactive, dropout, placed)
      students = students.filter(student => {
        const isActiveOrOnLeave = !student.status || 
          student.status === 'active' || 
          student.status === 'kitchen_leave' || 
          student.status === 'on_leave' ||
          student.status === 'unapproved_leave';
        const matchesCampus = !campus || student.campus === campus;
        const isNotAdminRole = student.role !== 'admin' && student.role !== 'academic_associate';
        return isActiveOrOnLeave && matchesCampus && isNotAdminRole;
      });

      return students;
    } catch (error) {
      console.error('Error fetching active students:', error);
      return [];
    }
  }

  private static async getStudentsOnLeave(studentIds: string[], date: Date): Promise<string[]> {
    if (studentIds.length === 0) return [];

    try {
      // Batch studentIds into groups of 10 (Firestore 'in' query limit)
      const batches = [];
      for (let i = 0; i < studentIds.length; i += 10) {
        batches.push(studentIds.slice(i, i + 10));
      }

      const leavePromises = batches.map(async (batch) => {
        const leaveQuery = query(
          collection(db, 'leave_requests'),
          where('student_id', 'in', batch),
          where('status', '==', 'approved'),
          where('start_date', '<=', Timestamp.fromDate(date)),
          where('end_date', '>=', Timestamp.fromDate(date))
        );

        const snapshot = await getDocs(leaveQuery);
        return snapshot.docs.map(doc => doc.data().student_id);
      });

      const results = await Promise.all(leavePromises);
      return results.flat();
    } catch (error) {
      console.error('Error fetching students on leave:', error);
      return [];
    }
  }

  private static async getStudentsOnLeaveWithType(studentIds: string[], date: Date): Promise<Array<{studentId: string, leaveType: 'kitchen_leave' | 'on_leave'}>> {
    if (studentIds.length === 0) return [];

    try {
      // Batch studentIds into groups of 10 (Firestore 'in' query limit)
      const batches = [];
      for (let i = 0; i < studentIds.length; i += 10) {
        batches.push(studentIds.slice(i, i + 10));
      }

      const leavePromises = batches.map(async (batch) => {
        const leaveQuery = query(
          collection(db, 'leave_requests'),
          where('student_id', 'in', batch),
          where('status', '==', 'approved'),
          where('start_date', '<=', Timestamp.fromDate(date)),
          where('end_date', '>=', Timestamp.fromDate(date))
        );

        const snapshot = await getDocs(leaveQuery);
        return snapshot.docs.map(doc => ({
          studentId: doc.data().student_id,
          leaveType: doc.data().leave_type as 'kitchen_leave' | 'on_leave'
        }));
      });

      const results = await Promise.all(leavePromises);
      return results.flat();
    } catch (error) {
      console.error('Error fetching students on leave with type:', error);
      return [];
    }
  }

  private static async getApprovedGoalsForDate(studentIds: string[], date: Date): Promise<DailyGoal[]> {
    if (studentIds.length === 0) return [];

    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // Batch studentIds into groups of 10
      const batches = [];
      for (let i = 0; i < studentIds.length; i += 10) {
        batches.push(studentIds.slice(i, i + 10));
      }

      const goalPromises = batches.map(async (batch) => {
        const goalsQuery = query(
          collection(db, 'daily_goals'),
          where('student_id', 'in', batch),
          where('status', '==', 'approved'),
          where('created_at', '>=', Timestamp.fromDate(startOfDay)),
          where('created_at', '<=', Timestamp.fromDate(endOfDay))
        );

        const snapshot = await getDocs(goalsQuery);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DailyGoal));
      });

      const results = await Promise.all(goalPromises);
      return results.flat();
    } catch (error) {
      console.error('Error fetching approved goals:', error);
      return [];
    }
  }

  private static async getSubmittedReflectionsForDate(studentIds: string[], date: Date): Promise<DailyReflection[]> {
    if (studentIds.length === 0) return [];

    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // Batch studentIds into groups of 10
      const batches = [];
      for (let i = 0; i < studentIds.length; i += 10) {
        batches.push(studentIds.slice(i, i + 10));
      }

      const reflectionPromises = batches.map(async (batch) => {
        const reflectionsQuery = query(
          collection(db, 'daily_reflections'),
          where('student_id', 'in', batch),
          where('created_at', '>=', Timestamp.fromDate(startOfDay)),
          where('created_at', '<=', Timestamp.fromDate(endOfDay))
        );

        const snapshot = await getDocs(reflectionsQuery);
        return snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as DailyReflection))
          .filter(reflection => 
            reflection.reflection_answers && 
            (reflection.reflection_answers.workedWell?.trim().length > 0 || 
             reflection.reflection_answers.howAchieved?.trim().length > 0 ||
             reflection.reflection_answers.keyLearning?.trim().length > 0 ||
             reflection.reflection_answers.challenges?.trim().length > 0)
          ); // Any submitted reflection with content counts
      });

      const results = await Promise.all(reflectionPromises);
      return results.flat();
    } catch (error) {
      console.error('Error fetching submitted reflections:', error);
      return [];
    }
  }
}