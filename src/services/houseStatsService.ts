import { FirestoreService, COLLECTIONS } from './firestore';
import { TopicService, PhaseTimelineService } from './dataServices';
import { HouseStats, Phase, DailyGoal, DailyReflection } from '../types';

export interface HouseAverageData {
  phaseLabel: string;
  averageDays: number;
}

export class HouseStatsService extends FirestoreService {
  /**
   * Get house averages - uses cached data if available for current week
   * @param house - House name (Bageshree, Malhar, or Bhairav)
   * @returns Array of house average data per phase
   */
  static async getHouseAverages(house: string): Promise<HouseAverageData[]> {
    const currentWeek = this.getCurrentWeek();
    const currentYear = new Date().getFullYear();

    try {
      // Try to get this week's cached data
      const cachedStats = await FirestoreService.getWhere<HouseStats>(
        COLLECTIONS.HOUSE_STATS,
        'house',
        '==',
        house
      );

      const thisWeekStats = cachedStats.filter(
        stat => stat.weekNumber === currentWeek && stat.year === currentYear
      );

      // If we have fresh data for all phases, return it
      if (thisWeekStats.length > 0) {
        console.log(`Using cached house stats for ${house} (Week ${currentWeek})`);
        return thisWeekStats
          .sort((a, b) => {
            // Sort by phase number (extract from "Phase 1", "Phase 2", etc.)
            const aNum = parseInt(a.phaseLabel.replace('Phase ', ''));
            const bNum = parseInt(b.phaseLabel.replace('Phase ', ''));
            return aNum - bNum;
          })
          .map(stat => ({
            phaseLabel: stat.phaseLabel,
            averageDays: stat.averageDays
          }));
      }

      // No cached data for this week - return empty array
      // Admin must trigger recalculation manually
      console.warn(`No cached house stats found for ${house} (Week ${currentWeek}/${currentYear})`);
      return [];
    } catch (error) {
      console.error('Error fetching house averages:', error);
      return [];
    }
  }

  /**
   * Calculate and cache house averages - EXPENSIVE OPERATION
   * Should only be called by admin/academic associate via manual trigger
   * @param house - House name
   * @param allPhases - All phases in the system
   * @returns Calculated house average data
   */
  static async calculateAndCacheHouseAverages(
    house: string,
    allPhases: Phase[]
  ): Promise<HouseAverageData[]> {
    try {
      console.log(`Starting calculation for ${house} house averages...`);
      const { UserService } = await import('./firestore');

      // Get all students in the house
      const houseStudents = await UserService.getUsersByHouse(house);
      console.log(`Found ${houseStudents.length} students in ${house}`);

      // Get phase timeline data for expected days
      const phaseTimelines = await PhaseTimelineService.getAllPhaseTimelines();
      const timelineMap = new Map(phaseTimelines.map(t => [t.phaseId, t]));

      // Filter out "Self Learning Space" and sort by phase order
      const filteredPhases = allPhases
        .filter(phase => phase.name !== 'Self Learning Space')
        .sort((a, b) => a.order - b.order);

      const averages: HouseAverageData[] = [];
      const currentWeek = this.getCurrentWeek();
      const currentYear = new Date().getFullYear();

      // Delete old stats for this house
      const oldStats = await FirestoreService.getWhere<HouseStats>(
        COLLECTIONS.HOUSE_STATS,
        'house',
        '==',
        house
      );
      
      for (const oldStat of oldStats) {
        await FirestoreService.delete(COLLECTIONS.HOUSE_STATS, oldStat.id);
      }
      console.log(`Deleted ${oldStats.length} old stats for ${house}`);

      for (let i = 0; i < filteredPhases.length; i++) {
        const phase = filteredPhases[i];
        const phaseDurations: number[] = [];
        const expectedDays = timelineMap.get(phase.id)?.expectedDays;

        console.log(`Processing Phase ${i + 1}: ${phase.name}...`);

        for (const student of houseStudents) {
          if (!student.campus_joining_date) continue;

          // Get student's goals for this phase
          const studentGoals = await FirestoreService.getWhere<DailyGoal>(
            COLLECTIONS.DAILY_GOALS,
            'student_id',
            '==',
            student.id
          );
          const phaseGoalsByPhaseId = studentGoals.filter(
            (goal: DailyGoal) => goal.phase_id === phase.id
          );

          // If student has no goals in this phase, check if they skipped it
          if (phaseGoalsByPhaseId.length === 0) {
            // Check if student has goals in any subsequent phases
            const hasLaterPhases = filteredPhases.slice(i + 1).some(laterPhase => {
              const laterGoals = studentGoals.filter(
                (goal: DailyGoal) => goal.phase_id === laterPhase.id
              );
              return laterGoals.length > 0;
            });

            // If student has goals in later phases but not this one, they skipped this phase
            if (hasLaterPhases && expectedDays) {
              phaseDurations.push(expectedDays);
            }
            continue;
          }

          // Find the earliest goal creation date for this phase
          let phaseGoalsForDate = studentGoals.filter(
            (goal: DailyGoal) => goal.phase_id === phase.id
          );
          let earliestGoalDate: Date;

          if (phaseGoalsForDate.length > 0) {
            // Use phase_id matching
            earliestGoalDate = new Date(
              Math.min(...phaseGoalsForDate.map(g => new Date(g.created_at).getTime()))
            );
          } else {
            // Fallback to topic-based matching
            const phaseTopics = await TopicService.getTopicsByPhase(phase.id);
            const phaseTopicIds = phaseTopics.map(t => t.id);
            const reliablePhaseGoals = studentGoals.filter(goal =>
              phaseTopicIds.includes(goal.topic_id)
            );
            earliestGoalDate =
              reliablePhaseGoals.length > 0
                ? new Date(
                    Math.min(...reliablePhaseGoals.map(g => new Date(g.created_at).getTime()))
                  )
                : new Date(
                    Math.min(...phaseGoalsForDate.map(g => new Date(g.created_at).getTime()))
                  );
          }

          // Calculate start date - use earliest goal date for this phase
          let startDate: Date = earliestGoalDate;

          // Calculate end date (last completion in this phase or current date)
          let endDate: Date = new Date();
          let hasCompletedTopics = false;

          for (const goal of phaseGoalsByPhaseId) {
            try {
              const reflections = await FirestoreService.getWhere<DailyReflection>(
                COLLECTIONS.DAILY_REFLECTIONS,
                'goal_id',
                '==',
                goal.id
              );
              const reflection = reflections[0];
              if (reflection && reflection.achieved_percentage === 100) {
                const completionDate = new Date(reflection.created_at);
                if (completionDate > endDate || !hasCompletedTopics) {
                  endDate = completionDate;
                  hasCompletedTopics = true;
                }
              }
            } catch (error) {
              // Continue checking other goals
            }
          }

          if (hasCompletedTopics) {
            const daysSpent = Math.max(
              0,
              Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
            );
            phaseDurations.push(daysSpent);
          } else if (expectedDays) {
            // If student started the phase but hasn't completed it, use expected days
            phaseDurations.push(expectedDays);
          }
        }

        // Calculate average for this phase
        const averageDays =
          phaseDurations.length > 0
            ? Math.round(phaseDurations.reduce((sum, days) => sum + days, 0) / phaseDurations.length)
            : 0;

        const phaseLabel = `Phase ${i + 1}`;
        averages.push({
          phaseLabel,
          averageDays
        });

        // Save to Firestore cache
        const houseStatData: Omit<HouseStats, 'id'> = {
          house: house as 'Bageshree' | 'Malhar' | 'Bhairav',
          phaseId: phase.id,
          phaseLabel,
          averageDays,
          studentCount: phaseDurations.length,
          calculatedAt: new Date(),
          weekNumber: currentWeek,
          year: currentYear,
          created_at: new Date(),
          updated_at: new Date()
        };

        await FirestoreService.create(COLLECTIONS.HOUSE_STATS, houseStatData);
        console.log(`Saved stats for ${phaseLabel}: ${averageDays} days (${phaseDurations.length} students)`);
      }

      console.log(`Completed calculation for ${house}. Saved ${averages.length} phase stats.`);
      return averages;
    } catch (error) {
      console.error('Error calculating and caching house averages:', error);
      throw error;
    }
  }

  /**
   * Calculate all house stats - convenience method for admin
   * @param allPhases - All phases in the system
   * @returns Object with stats for all houses
   */
  static async calculateAllHouseStats(allPhases: Phase[]): Promise<{
    Bageshree: HouseAverageData[];
    Malhar: HouseAverageData[];
    Bhairav: HouseAverageData[];
  }> {
    const houses = ['Bageshree', 'Malhar', 'Bhairav'] as const;
    const results: any = {};

    for (const house of houses) {
      try {
        results[house] = await this.calculateAndCacheHouseAverages(house, allPhases);
      } catch (error) {
        console.error(`Failed to calculate stats for ${house}:`, error);
        results[house] = [];
      }
    }

    return results;
  }

  /**
   * Get current ISO week number
   */
  static getCurrentWeek(): number {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const diff = now.getTime() - start.getTime();
    const oneWeek = 1000 * 60 * 60 * 24 * 7;
    return Math.ceil(diff / oneWeek);
  }

  /**
   * Check if house stats are fresh (this week)
   * @param house - House name
   * @returns True if fresh stats exist
   */
  static async hasCurrentWeekStats(house: string): Promise<boolean> {
    const currentWeek = this.getCurrentWeek();
    const currentYear = new Date().getFullYear();

    try {
      const stats = await FirestoreService.getWhere<HouseStats>(
        COLLECTIONS.HOUSE_STATS,
        'house',
        '==',
        house
      );

      return stats.some(
        stat => stat.weekNumber === currentWeek && stat.year === currentYear
      );
    } catch (error) {
      return false;
    }
  }
}
