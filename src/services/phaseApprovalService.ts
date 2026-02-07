import { FirestoreService, COLLECTIONS, UserService } from './firestore';
import { PhaseApproval, User, Phase } from '../types';
import { PhaseService } from './dataServices';

export class PhaseApprovalService {
  /**
   * Request approval to move to the next phase
   */
  static async requestPhaseApproval(
    studentId: string,
    currentPhaseId: string,
    nextPhaseId: string
  ): Promise<string> {
    // Check if there's already a pending request for this transition
    const existingRequests = await FirestoreService.getWhereCompound<PhaseApproval>(
      COLLECTIONS.PHASE_APPROVALS,
      [
        { field: 'student_id', operator: '==', value: studentId },
        { field: 'next_phase_id', operator: '==', value: nextPhaseId },
        { field: 'status', operator: '==', value: 'pending' }
      ]
    );

    if (existingRequests.length > 0) {
      return existingRequests[0].id;
    }

    // Fetch student and phase names for denormalization
    const [student, currentPhase, nextPhase] = await Promise.all([
      UserService.getById(COLLECTIONS.USERS, studentId) as Promise<User | null>,
      PhaseService.getPhaseById(currentPhaseId),
      PhaseService.getPhaseById(nextPhaseId)
    ]);

    // Create new approval request
    const approvalData: Omit<PhaseApproval, 'id' | 'created_at' | 'updated_at'> = {
      student_id: studentId,
      student_name: student?.name || 'Unknown Student',
      current_phase_id: currentPhaseId,
      current_phase_name: currentPhase?.name || 'Unknown Phase',
      next_phase_id: nextPhaseId,
      next_phase_name: nextPhase?.name || 'Unknown Phase',
      requested_at: new Date(),
      status: 'pending'
    };

    return await FirestoreService.create<PhaseApproval>(
      COLLECTIONS.PHASE_APPROVALS,
      approvalData
    );
  }

  /**
   * Get pending approval requests for a student
   */
  static async getPendingApprovals(studentId: string): Promise<PhaseApproval[]> {
    return await FirestoreService.getWhereCompound<PhaseApproval>(
      COLLECTIONS.PHASE_APPROVALS,
      [
        { field: 'student_id', operator: '==', value: studentId },
        { field: 'status', operator: '==', value: 'pending' }
      ],
      'requested_at',
      'desc'
    );
  }

  /**
   * Get all pending approval requests (for admin/academic associate)
   */
  static async getAllPendingApprovals(): Promise<PhaseApproval[]> {
    return await FirestoreService.getWhere<PhaseApproval>(
      COLLECTIONS.PHASE_APPROVALS,
      'status',
      '==',
      'pending'
    );
  }

  /**
   * Approve a phase transition
   */
  static async approvePhaseTransition(
    approvalId: string,
    approverId: string
  ): Promise<void> {
    // Fetch the approval request to get phase information
    const approval = await FirestoreService.getById<PhaseApproval>(
      COLLECTIONS.PHASE_APPROVALS,
      approvalId
    );

    if (!approval) {
      throw new Error('Approval request not found');
    }

    // Fetch approver name for denormalization
    const approver = await UserService.getById(COLLECTIONS.USERS, approverId) as User | null;

    // Update the approval status
    await FirestoreService.update<PhaseApproval>(
      COLLECTIONS.PHASE_APPROVALS,
      approvalId,
      {
        status: 'approved',
        approved_by: approverId,
        approved_by_name: approver?.name || 'Unknown Admin',
        approved_at: new Date()
      }
    );

    // Update phase counts: decrease active and increase completed in all skipped phases
    try {
      // Get all phases to determine which phases were skipped
      const allPhases = await PhaseService.getAllPhases();
      const currentPhase = allPhases.find((p: Phase) => p.id === approval.current_phase_id);
      const nextPhase = allPhases.find((p: Phase) => p.id === approval.next_phase_id);

      if (!currentPhase || !nextPhase) {
        throw new Error('Phase not found');
      }

      // Find all phases that should be marked as completed
      // (current phase and any phases between current and next)
      const phasesToComplete = allPhases.filter((phase: Phase) => {
        // Only consider ordered phases (not special phases with order >= 9)
        if (phase.order >= 9) return false;
      });

      // Update all skipped/completed phases
      const updatePromises = phasesToComplete.map(async (phase: Phase) => {
        const activeCount = phase.active_students_count || 0;
        const completedCount = phase.completed_students_count || 0;

        await FirestoreService.update<Phase>(
          COLLECTIONS.PHASES,
          phase.id,
          {
            active_students_count: Math.max(0, activeCount - 1),
            completed_students_count: completedCount + 1
          }
        );
      });

      await Promise.all(updatePromises);

      // Increment active count in the next phase
      if (nextPhase) {
        const nextActiveCount = nextPhase.active_students_count || 0;

        await FirestoreService.update<Phase>(
          COLLECTIONS.PHASES,
          approval.next_phase_id,
          {
            active_students_count: nextActiveCount + 1
          }
        );
      }
    } catch (error) {
      console.error('Error updating phase student counts:', error);
      // Don't throw error to prevent blocking the approval
    }
  }

  /**
   * Reject a phase transition
   */
  static async rejectPhaseTransition(
    approvalId: string,
    approverId: string,
    reason: string
  ): Promise<void> {
    // Fetch approver name for denormalization
    const approver = await UserService.getById(COLLECTIONS.USERS, approverId) as User | null;

    await FirestoreService.update<PhaseApproval>(
      COLLECTIONS.PHASE_APPROVALS,
      approvalId,
      {
        status: 'rejected',
        approved_by: approverId,
        approved_by_name: approver?.name || 'Unknown Admin',
        approved_at: new Date(),
        rejection_reason: reason
      }
    );
  }

  /**
   * Check if student can access a specific phase
   */
  static async canAccessPhase(
    studentId: string,
    phaseId: string,
    currentPhaseOrder: number,
    targetPhaseOrder: number
  ): Promise<boolean> {
    // If target phase is before or equal to current phase, allow access
    if (targetPhaseOrder <= currentPhaseOrder) {
      return true;
    }

    // Check if there's an approved request for this phase or any phase before it
    const approvedRequests = await FirestoreService.getWhereCompound<PhaseApproval>(
      COLLECTIONS.PHASE_APPROVALS,
      [
        { field: 'student_id', operator: '==', value: studentId },
        { field: 'status', operator: '==', value: 'approved' }
      ]
    );

    // Get all approved phase IDs
    const approvedPhaseIds = approvedRequests.map(req => req.next_phase_id);

    // Allow access if this phase is approved
    return approvedPhaseIds.includes(phaseId);
  }

  /**
   * Get approval history for a student
   */
  static async getApprovalHistory(studentId: string): Promise<PhaseApproval[]> {
    return await FirestoreService.getWhere<PhaseApproval>(
      COLLECTIONS.PHASE_APPROVALS,
      'student_id',
      '==',
      studentId
    );
  }

  /**
   * Get the highest approved phase for a student
   */
  static async getHighestApprovedPhase(studentId: string): Promise<string | null> {
    const approvals = await FirestoreService.getWhereCompound<PhaseApproval>(
      COLLECTIONS.PHASE_APPROVALS,
      [
        { field: 'student_id', operator: '==', value: studentId },
        { field: 'status', operator: '==', value: 'approved' }
      ],
      'approved_at',
      'desc'
    );

    return approvals.length > 0 ? approvals[0].next_phase_id : null;
  }

  /**
   * Recalculate phase student counts based on current data
   * This can be used to initialize or fix counts
   */
  static async recalculatePhaseCounts(): Promise<void> {
    try {
      const [phases, approvals, goals] = await Promise.all([
        PhaseService.getAllPhases(),
        FirestoreService.getAll<PhaseApproval>(COLLECTIONS.PHASE_APPROVALS),
        FirestoreService.getAll(COLLECTIONS.DAILY_GOALS)
      ]);

      // Track active students per phase (students currently working in each phase)
      const activeStudentsPerPhase = new Map<string, Set<string>>();

      // Track completed students per phase (students who have moved to next phase)
      const completedStudentsPerPhase = new Map<string, Set<string>>();

      // Initialize maps for all phases
      phases.forEach((phase: Phase) => {
        activeStudentsPerPhase.set(phase.id, new Set());
        completedStudentsPerPhase.set(phase.id, new Set());
      });

      // Get unique students per phase based on their goals
      goals.forEach((goal: any) => {
        if (goal.phase_id && goal.student_id) {
          if (!activeStudentsPerPhase.has(goal.phase_id)) {
            activeStudentsPerPhase.set(goal.phase_id, new Set());
          }
          activeStudentsPerPhase.get(goal.phase_id)!.add(goal.student_id);
        }
      });

      // Process approved phase transitions
      const approvedTransitions = approvals.filter((a: PhaseApproval) => a.status === 'approved');

      // Create a phase map for quick lookup
      const phaseMap = new Map(phases.map((p: Phase) => [p.id, p]));

      approvedTransitions.forEach((approval: PhaseApproval) => {
        const currentPhase = phaseMap.get(approval.current_phase_id);
        const nextPhase = phaseMap.get(approval.next_phase_id);

        if (!currentPhase || !nextPhase) return;

        // Find all phases between current and next (including current, excluding next)
        const phasesToComplete = phases.filter((phase: Phase) => {
          // Only consider ordered phases (not special phases with order >= 9)
          if (phase.order >= 9) return false;

          // Include phases from current up to (but not including) next phase
          return phase.order >= currentPhase.order && phase.order < nextPhase.order;
        });

        // Mark student as completed in all skipped phases
        phasesToComplete.forEach((phase: Phase) => {
          // Remove student from active count
          if (activeStudentsPerPhase.has(phase.id)) {
            activeStudentsPerPhase.get(phase.id)!.delete(approval.student_id);
          }

          // Add student to completed count
          if (!completedStudentsPerPhase.has(phase.id)) {
            completedStudentsPerPhase.set(phase.id, new Set());
          }
          completedStudentsPerPhase.get(phase.id)!.add(approval.student_id);
        });

        // Add student to active count in the destination phase (where they jumped to)
        if (activeStudentsPerPhase.has(approval.next_phase_id)) {
          activeStudentsPerPhase.get(approval.next_phase_id)!.add(approval.student_id);
        }
      });

      // Update all phases with calculated counts
      const updatePromises = phases.map((phase: Phase) => {
        const activeCount = activeStudentsPerPhase.get(phase.id)?.size || 0;
        const completedCount = completedStudentsPerPhase.get(phase.id)?.size || 0;

        return FirestoreService.update<Phase>(
          COLLECTIONS.PHASES,
          phase.id,
          {
            active_students_count: activeCount,
            completed_students_count: completedCount
          }
        );
      });

      await Promise.all(updatePromises);
      console.log('Phase counts recalculated successfully');
    } catch (error) {
      console.error('Error recalculating phase counts:', error);
      throw error;
    }
  }
}
