import React, { useState, useEffect, useCallback } from 'react';
import { Clock, Users, Target, BookOpen, X, RefreshCw } from 'lucide-react';
import { GoalService } from '../../services/dataServices';
import { PhaseService } from '../../services/dataServices';
import { TopicService } from '../../services/dataServices';
import { UserService, COLLECTIONS } from '../../services/firestore';
import { PhaseApprovalService } from '../../services/phaseApprovalService';

interface StudentStats {
  studentId: string;
  studentName: string;
  phaseId: string;
  topicId: string;
  daysSpent: number;
  earliestGoalDate: Date;
}

interface PhaseData {
  phaseId: string;
  phaseName: string;
  totalStudents: number;
  averageDaysSpent: number;
  topics: TopicData[];
  order: number;
  activeStudentsCount?: number;
  completedStudentsCount?: number;
}

interface TopicData {
  topicId: string;
  topicName: string;
  studentCount: number;
  averageDaysSpent: number;
}

const AdminJourneyTracking: React.FC = () => {
  const [phaseData, setPhaseData] = useState<PhaseData[]>([]);
  const [standalonePhases, setStandalonePhases] = useState<PhaseData[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [studentStats, setStudentStats] = useState<StudentStats[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<{
    topicId: string;
    topicName: string;
    students: Array<{ studentName: string; totalDays: number; goalCount: number; latestActivity: Date; startDate: Date }>;
  } | null>(null);

  const [selectedStudentGoals, setSelectedStudentGoals] = useState<{
    studentName: string;
    goals: Array<{ id: string; goal_text: string; created_at: Date; status: string }>;
  } | null>(null);

  const [selectedStudentPhases, setSelectedStudentPhases] = useState<{
    studentId: string;
    studentName: string;
    phases: Array<{ phaseId: string; phaseName: string; daysSpent: number; topicCount: number; order: number }>;
  } | null>(null);

  const handleRecalculateCounts = useCallback(async () => {
    try {
      setRecalculating(true);
      await PhaseApprovalService.recalculatePhaseCounts();
      // Reload data after recalculation
      window.location.reload();
    } catch (error) {
      console.error('Error recalculating counts:', error);
      alert('Failed to recalculate counts. Check console for details.');
    } finally {
      setRecalculating(false);
    }
  }, []);

  const calculateStudentStats = useCallback(async (): Promise<StudentStats[]> => {
    try {
      // Get all students and goals to show ACTIVE engagement (not just completion)
      const [goals, users] = await Promise.all([
        GoalService.getAllGoals(),
        UserService.getAll(COLLECTIONS.USERS)
      ]);

      // Filter to get only students (non-admin users)
      const students = users.filter((user: any) => !user.isAdmin);
      const studentIds = new Set(students.map((user: any) => user.id));
      const userMap = new Map(students.map((user: any) => [user.id, user.name || 'Unknown Student']));

      // Filter goals to only include goals from students
      const studentGoals = goals.filter((goal: any) => studentIds.has(goal.student_id));

      // Group goals by student and phase to find the earliest start date per phase
      const studentPhaseMap = new Map<string, Map<string, Date>>();
      
      studentGoals.forEach((goal: any) => {
        const student = students.find((s: any) => s.id === goal.student_id);
        const goalCreatedAt = goal.created_at ? new Date(goal.created_at) : null;
        const fallbackStart = student && (student as any).campus_joining_date
          ? new Date((student as any).campus_joining_date)
          : new Date();
        const goalDate = goalCreatedAt || fallbackStart;

        // Track earliest date per student per phase
        if (!studentPhaseMap.has(goal.student_id)) {
          studentPhaseMap.set(goal.student_id, new Map());
        }
        const phaseMap = studentPhaseMap.get(goal.student_id)!;
        
        if (!phaseMap.has(goal.phase_id)) {
          phaseMap.set(goal.phase_id, goalDate);
        } else {
          const existingDate = phaseMap.get(goal.phase_id)!;
          if (goalDate < existingDate) {
            phaseMap.set(goal.phase_id, goalDate);
          }
        }
      });

      const stats: StudentStats[] = [];
      studentGoals.forEach((goal: any) => {
        const student = students.find((s: any) => s.id === goal.student_id);
        const goalCreatedAt = goal.created_at ? new Date(goal.created_at) : null;
        const fallbackStart = student && (student as any).campus_joining_date
          ? new Date((student as any).campus_joining_date)
          : new Date();
        const goalDate = goalCreatedAt || fallbackStart;

        // Use the earliest date for this student's phase
        const phaseStartDate = studentPhaseMap.get(goal.student_id)?.get(goal.phase_id) || goalDate;

        const now = new Date();
        
        // Calculate calendar days: normalize both dates to midnight and count days
        const startOfDay = new Date(phaseStartDate);
        startOfDay.setHours(0, 0, 0, 0);
        
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);
        
        const daysDifference = Math.floor((today.getTime() - startOfDay.getTime()) / (1000 * 60 * 60 * 24));
        const daysSpent = Math.max(1, daysDifference); // Minimum 1 day on start date, increments at midnight

        // Debug logging for the specific user
        if (userMap.get(goal.student_id)?.includes('experimental')) {
          console.log('Debug - experimental user goal:', {
            studentName: userMap.get(goal.student_id),
            goalId: goal.id,
            goalCreatedAt: goalCreatedAt ? goalCreatedAt.toISOString() : 'null',
            phaseStartDate: phaseStartDate.toISOString(),
            now: now.toISOString(),
            daysSpent,
            phaseId: goal.phase_id,
            topicId: goal.topic_id
          });
        }

        stats.push({
          studentId: goal.student_id,
          studentName: userMap.get(goal.student_id) || 'Unknown Student',
          phaseId: goal.phase_id,
          topicId: goal.topic_id,
          daysSpent,
          earliestGoalDate: phaseStartDate
        });
      });

      return stats;
    } catch (error) {
      console.error('Error calculating student stats:', error);
      return [];
    }
  }, []);

  const loadTrackingData = useCallback(async () => {
    try {
      setLoading(true);
      const [stats, phases, topics] = await Promise.all([
        calculateStudentStats(),
        PhaseService.getAllPhases(),
        TopicService.getAll(COLLECTIONS.TOPICS)
      ]);

      // Get unique student IDs who have goals (active students)
      const activeStudentIds = new Set(stats.map(stat => stat.studentId));
      setTotalStudents(activeStudentIds.size);

      // Group stats by phase
      const phaseStats = new Map<string, StudentStats[]>();
      stats.forEach(stat => {
        if (!phaseStats.has(stat.phaseId)) {
          phaseStats.set(stat.phaseId, []);
        }
        phaseStats.get(stat.phaseId)!.push(stat);
      });

      // Group topics by phase
      const topicsByPhase = new Map<string, any[]>();
      topics.forEach((topic: any) => {
        if (!topicsByPhase.has(topic.phase_id)) {
          topicsByPhase.set(topic.phase_id, []);
        }
        topicsByPhase.get(topic.phase_id)!.push(topic);
      });

      // Sort phases by order to handle parallel phases correctly
      const sortedPhases = phases.sort((a: any, b: any) => a.order - b.order);

      // Separate standalone phases (order >= 9) from ordered phases
      const orderedPhases = sortedPhases.filter((phase: any) => phase.order < 9);
      const standalonePhases = sortedPhases.filter((phase: any) => phase.order >= 9);

      // Calculate phase data for ordered phases
      const orderedPhaseDataArray: PhaseData[] = [];
      orderedPhases.forEach((phase: any) => {
        const phaseStudentStats = phaseStats.get(phase.id) || [];
        const phaseTopics = topicsByPhase.get(phase.id) || [];

        // Calculate unique students in this phase
        const uniquePhaseStudents = new Set(phaseStudentStats.map(stat => stat.studentId));

        // Calculate average days spent for phase
        const totalDays = phaseStudentStats.reduce((sum, stat) => sum + stat.daysSpent, 0);
        const averageDaysSpent = phaseStudentStats.length > 0 ? Math.round(totalDays / phaseStudentStats.length) : 0;

        // Calculate topic data
        const topicData: TopicData[] = [];
        phaseTopics.forEach(topic => {
          const topicStats = phaseStudentStats.filter(stat => stat.topicId === topic.id);
          const uniqueStudents = new Set(topicStats.map(stat => stat.studentId));
          const topicTotalDays = topicStats.reduce((sum, stat) => sum + stat.daysSpent, 0);
          const topicAverageDays = topicStats.length > 0 ? Math.round(topicTotalDays / topicStats.length) : 0;

          topicData.push({
            topicId: topic.id,
            topicName: topic.name,
            studentCount: uniqueStudents.size, // Count unique students, not total goals
            averageDaysSpent: topicAverageDays
          });
        });

        orderedPhaseDataArray.push({
          phaseId: phase.id,
          phaseName: phase.name,
          totalStudents: uniquePhaseStudents.size, // Count unique students, not total goals
          averageDaysSpent,
          topics: topicData,
          order: phase.order,
          activeStudentsCount: phase.active_students_count || 0,
          completedStudentsCount: phase.completed_students_count || 0
        });
      });

      // Calculate phase data for standalone phases
      const standalonePhaseDataArray: PhaseData[] = [];
      standalonePhases.forEach((phase: any) => {
        const phaseStudentStats = phaseStats.get(phase.id) || [];
        const phaseTopics = topicsByPhase.get(phase.id) || [];

        // Calculate unique students in this phase
        const uniquePhaseStudents = new Set(phaseStudentStats.map(stat => stat.studentId));

        // Calculate average days spent for phase
        const totalDays = phaseStudentStats.reduce((sum, stat) => sum + stat.daysSpent, 0);
        const averageDaysSpent = phaseStudentStats.length > 0 ? Math.round(totalDays / phaseStudentStats.length) : 0;

        // Calculate topic data
        const topicData: TopicData[] = [];
        phaseTopics.forEach(topic => {
          const topicStats = phaseStudentStats.filter(stat => stat.topicId === topic.id);
          const uniqueStudents = new Set(topicStats.map(stat => stat.studentId));
          const topicTotalDays = topicStats.reduce((sum, stat) => sum + stat.daysSpent, 0);
          const topicAverageDays = topicStats.length > 0 ? Math.round(topicTotalDays / topicStats.length) : 0;

          topicData.push({
            topicId: topic.id,
            topicName: topic.name,
            studentCount: uniqueStudents.size, // Count unique students, not total goals
            averageDaysSpent: topicAverageDays
          });
        });

        standalonePhaseDataArray.push({
          phaseId: phase.id,
          phaseName: phase.name,
          totalStudents: uniquePhaseStudents.size, // Count unique students, not total goals
          averageDaysSpent,
          topics: topicData,
          order: phase.order,
          activeStudentsCount: phase.active_students_count || 0,
          completedStudentsCount: phase.completed_students_count || 0
        });
      });

      setPhaseData(orderedPhaseDataArray);
      setStandalonePhases(standalonePhaseDataArray);
      setStudentStats(stats);
    } catch (error) {
      console.error('Error loading tracking data:', error);
    } finally {
      setLoading(false);
    }
  }, [calculateStudentStats]);

  const handleTopicClick = useCallback(async (topicId: string, topicName: string, phaseId: string) => {
    // Find all students who have goals for this topic
    const topicStudents = studentStats.filter((stat: StudentStats) => stat.topicId === topicId);

    // Get student data for joining dates
    const users = await UserService.getAll(COLLECTIONS.USERS);
    const students = users.filter((user: any) => !user.isAdmin);
    const studentMapDb = new Map(students.map((user: any) => [user.id, user]));

    // Deduplicate students and aggregate their data
    const studentMap = new Map<string, { studentName: string; totalDays: number; goalCount: number; latestActivity: Date; startDate: Date }>();

    topicStudents.forEach((stat: StudentStats) => {
      const existing = studentMap.get(stat.studentId);
      const studentData = studentMapDb.get(stat.studentId);
      const startDate = stat.earliestGoalDate
        ? new Date(stat.earliestGoalDate)
        : studentData?.campus_joining_date
          ? new Date(studentData.campus_joining_date)
          : new Date();

      if (existing) {
        // Update existing student data
        existing.totalDays = Math.max(existing.totalDays, stat.daysSpent); // Use the maximum days spent
        existing.goalCount += 1;
        if (stat.earliestGoalDate > existing.latestActivity) {
          existing.latestActivity = stat.earliestGoalDate;
        }
        if (startDate < existing.startDate) {
          existing.startDate = startDate;
        }
      } else {
        // Add new student
        studentMap.set(stat.studentId, {
          studentName: stat.studentName,
          totalDays: stat.daysSpent,
          goalCount: 1,
          latestActivity: stat.earliestGoalDate,
          startDate: startDate
        });
      }
    });

    // Convert map to array and sort by days spent descending
    const studentDetails = Array.from(studentMap.values())
      .sort((a, b) => b.totalDays - a.totalDays);

    setSelectedTopic({
      topicId,
      topicName,
      students: studentDetails
    });
  setSelectedTopic({
      topicId,
      topicName,
      students: studentDetails
    });
  }, [studentStats]);

  const handleGoalClick = useCallback(async (studentId: string, studentName: string, topicId: string) => {
    try {
      // Fetch goals for this student and topic
      const goals = await GoalService.getGoalsByTopicAndStudent(topicId, studentId);

      const goalDetails = goals.map(goal => ({
        id: goal.id,
        goal_text: goal.goal_text || 'No goal text',
        created_at: goal.created_at,
        status: goal.status || 'pending'
      }));

      setSelectedStudentGoals({
        studentName,
        goals: goalDetails
      });
    } catch (error) {
      console.error('Error fetching student goals:', error);
    }
  }, []);

  const handleStudentClick = useCallback(async (studentId: string, studentName: string) => {
    try {
      // Get all phases
      const phases = await PhaseService.getAllPhases();
      const phaseMap = new Map(phases.map((p: any) => [p.id, { name: p.name, order: p.order }]));

      // Filter stats for this student
      const studentPhaseStats = studentStats.filter(stat => stat.studentId === studentId);

      // Group by phase and calculate days spent
      const phaseDataMap = new Map<string, { daysSpent: number; topicCount: number; order: number }>();

      studentPhaseStats.forEach(stat => {
        const phaseInfo = phaseMap.get(stat.phaseId);
        if (!phaseInfo) return;

        if (!phaseDataMap.has(stat.phaseId)) {
          phaseDataMap.set(stat.phaseId, {
            daysSpent: stat.daysSpent,
            topicCount: 1,
            order: phaseInfo.order
          });
        } else {
          const existing = phaseDataMap.get(stat.phaseId)!;
          // Use the maximum days spent for the phase
          existing.daysSpent = Math.max(existing.daysSpent, stat.daysSpent);
          existing.topicCount += 1;
        }
      });

      // Convert to array and sort by phase order
      const phaseDetails = Array.from(phaseDataMap.entries())
        .map(([phaseId, data]) => ({
          phaseId,
          phaseName: phaseMap.get(phaseId)?.name || 'Unknown Phase',
          daysSpent: data.daysSpent,
          topicCount: data.topicCount,
          order: data.order
        }))
        .sort((a, b) => {
          // Sort standalone phases (order >= 9) to the end
          if (a.order >= 9 && b.order < 9) return 1;
          if (b.order >= 9 && a.order < 9) return -1;
          return a.order - b.order;
        });

      setSelectedStudentPhases({
        studentId,
        studentName,
        phases: phaseDetails
      });
    } catch (error) {
      console.error('Error fetching student phase data:', error);
    }
  }, [studentStats]);

  useEffect(() => {
    loadTrackingData();
  }, [loadTrackingData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading journey tracking data...</div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Student Journey Tracking</h2>
          <p className="text-muted-foreground">
            Track student progress across curriculum phases and topics
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handleRecalculateCounts}
            disabled={recalculating}
            className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${recalculating ? 'animate-spin' : ''}`} />
            {recalculating ? 'Recalculating...' : 'Recalculate Counts'}
          </button>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
            <Users className="h-4 w-4 mr-2" />
            {totalStudents} Active Students
          </span>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {phaseData.map((phase) => {
          const progressPercentage = totalStudents > 0 ? Math.round((phase.totalStudents / totalStudents) * 100) : 0;

          return (
            <div key={phase.phaseId} className="bg-white rounded-lg shadow-md border border-gray-200 flex flex-col">
              <div className="p-6 pb-3">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">{phase.phaseName}</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Active students in phase</span>
                    <span className="font-medium text-gray-900">{progressPercentage}% of active students</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progressPercentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="flex-1 p-6 pt-0 space-y-4">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="text-xs text-green-600 font-medium mb-1">Active</div>
                    <div className="text-2xl font-bold text-green-700">{phase.activeStudentsCount || 0}</div>
                    <div className="text-xs text-green-600">Currently working</div>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="text-xs text-blue-600 font-medium mb-1">Completed</div>
                    <div className="text-2xl font-bold text-blue-700">{phase.completedStudentsCount || 0}</div>
                    <div className="text-xs text-blue-600">Moved to next phase</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">Average days spent:</span>
                  <span className="font-medium text-gray-900">{phase.averageDaysSpent} days</span>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-medium flex items-center gap-2 text-gray-900">
                    <BookOpen className="h-4 w-4" />
                    Topics
                  </h4>
                  <div className="grid gap-2">
                    {phase.topics.map((topic) => (
                      <div
                        key={topic.topicId}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-md text-sm border border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleTopicClick(topic.topicId, topic.topicName, phase.phaseId)}
                      >
                        <span className="text-gray-900 font-medium break-words pr-2">{topic.topicName}</span>
                        <div className="flex items-center gap-2 text-xs text-gray-500 flex-shrink-0">
                          <span>{topic.studentCount} students</span>
                          <span>•</span>
                          <span>{topic.averageDaysSpent}d avg</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Self Learning Space Section */}
      {standalonePhases.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-px bg-gray-300 flex-1"></div>
            <h3 className="text-lg font-semibold text-gray-900 bg-white px-4">Self Learning Space</h3>
            <div className="h-px bg-gray-300 flex-1"></div>
          </div>
          <p className="text-muted-foreground text-center">
            Standalone learning areas for personal development and career preparation
          </p>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {standalonePhases.map((phase) => {
              const progressPercentage = totalStudents > 0 ? Math.round((phase.totalStudents / totalStudents) * 100) : 0;

              return (
                <div key={phase.phaseId} className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg shadow-md border border-purple-200 flex flex-col">
                  <div className="p-6 pb-3">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="h-5 w-5 rounded-full bg-purple-600 flex items-center justify-center">
                        <span className="text-white text-xs font-bold">S</span>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">{phase.phaseName}</h3>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Students engaged</span>
                        <span className="font-medium text-gray-900">{progressPercentage}% of active students</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progressPercentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 p-6 pt-0 space-y-4">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="text-xs text-green-600 font-medium mb-1">Active</div>
                        <div className="text-2xl font-bold text-green-700">{phase.activeStudentsCount || 0}</div>
                        <div className="text-xs text-green-600">Currently working</div>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="text-xs text-blue-600 font-medium mb-1">Completed</div>
                        <div className="text-2xl font-bold text-blue-700">{phase.completedStudentsCount || 0}</div>
                        <div className="text-xs text-blue-600">Moved to next phase</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600">Average days spent:</span>
                      <span className="font-medium text-gray-900">{phase.averageDaysSpent} days</span>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-sm font-medium flex items-center gap-2 text-gray-900">
                        <BookOpen className="h-4 w-4" />
                        Learning Areas
                      </h4>
                      <div className="grid gap-2">
                        {phase.topics.map((topic) => (
                          <div
                            key={topic.topicId}
                            className="flex items-center justify-between p-3 bg-white rounded-md text-sm border border-gray-100 cursor-pointer hover:bg-purple-50 transition-colors"
                            onClick={() => handleTopicClick(topic.topicId, topic.topicName, phase.phaseId)}
                          >
                            <span className="text-gray-900 font-medium break-words pr-2">{topic.topicName}</span>
                            <div className="flex items-center gap-2 text-xs text-gray-500 flex-shrink-0">
                              <span>{topic.studentCount} students</span>
                              <span>•</span>
                              <span>{topic.averageDaysSpent}d avg</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {phaseData.length === 0 && (
        <div className="text-center py-12">
          <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No journey data available</h3>
          <p className="text-muted-foreground">
            Student goals and progress will appear here once they start their learning journey.
          </p>
        </div>
      )}
    </div>

    {/* Topic Details Modal */}
    {selectedTopic && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center space-x-3">
              <BookOpen className="h-6 w-6 text-blue-600" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{selectedTopic.topicName}</h2>
                <p className="text-sm text-gray-600">Student Progress Details</p>
              </div>
            </div>
            <button
              onClick={() => setSelectedTopic(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto max-h-[60vh]">
            <div className="mb-4">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Total Students: {selectedTopic.students.length}</span>
                <span>Average Days: {selectedTopic.students.length > 0 ? Math.round(selectedTopic.students.reduce((sum, s) => sum + s.totalDays, 0) / selectedTopic.students.length) : 0} days</span>
              </div>
            </div>

            <div className="space-y-2">
              {selectedTopic.students
                .sort((a, b) => b.totalDays - a.totalDays) // Sort by days spent descending
                .map((student) => (
                <div
                  key={student.studentName}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-md border border-gray-100"
                >
                  <div className="flex items-center gap-3">
                    <span 
                      className="text-gray-900 font-medium cursor-pointer hover:text-blue-600 hover:underline transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        const studentStat = studentStats.find(s => s.studentName === student.studentName);
                        if (studentStat) {
                          handleStudentClick(studentStat.studentId, student.studentName);
                        }
                      }}
                      title="Click to see phase breakdown"
                    >
                      {student.studentName}
                    </span>
                    <span 
                      className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded cursor-pointer hover:bg-gray-300 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Find the student ID from the studentStats
                        const studentStat = studentStats.find(s => s.studentName === student.studentName && s.topicId === selectedTopic.topicId);
                        if (studentStat) {
                          handleGoalClick(studentStat.studentId, student.studentName, selectedTopic.topicId);
                        }
                      }}
                    >
                      {student.goalCount} goal{student.goalCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-xs text-gray-500">
                      <div>Started: {student.startDate.toLocaleDateString()}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600">{student.totalDays} days</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {selectedTopic.students.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No students have started this topic yet.
              </div>
            )}
          </div>

          <div className="flex justify-end p-6 border-t bg-gray-50">
            <button
              onClick={() => setSelectedTopic(null)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Student Phase Breakdown Modal */}
    {selectedStudentPhases && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center space-x-3">
              <Target className="h-6 w-6 text-blue-600" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{selectedStudentPhases.studentName}</h2>
                <p className="text-sm text-gray-600">Days Spent in Each Phase</p>
              </div>
            </div>
            <button
              onClick={() => setSelectedStudentPhases(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto max-h-[60vh]">
            <div className="mb-4">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Total Phases: {selectedStudentPhases.phases.length}</span>
                <span>Total Days: {selectedStudentPhases.phases.reduce((sum, p) => sum + p.daysSpent, 0)} days</span>
              </div>
            </div>

            <div className="space-y-3">
              {selectedStudentPhases.phases.map((phase) => (
                <div
                  key={phase.phaseId}
                  className={`p-4 rounded-lg border ${
                    phase.order >= 9 
                      ? 'bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      {phase.order >= 9 ? (
                        <div className="h-8 w-8 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-sm font-bold">S</span>
                        </div>
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-sm font-bold">{phase.order + 1}</span>
                        </div>
                      )}
                      <div>
                        <h3 className="text-base font-semibold text-gray-900">{phase.phaseName}</h3>
                        <p className="text-xs text-gray-500">
                          {phase.topicCount} topic{phase.topicCount !== 1 ? 's' : ''}
                          {phase.order >= 9 && ' • Self Learning'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-gray-200">
                      <Clock className="h-5 w-5 text-blue-600" />
                      <span className="text-lg font-bold text-gray-900">{phase.daysSpent}</span>
                      <span className="text-sm text-gray-600">days</span>
                    </div>
                  </div>
                  <div className="mt-3 bg-white rounded-md p-2">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          phase.order >= 9 ? 'bg-purple-600' : 'bg-blue-600'
                        }`}
                        style={{ 
                          width: `${Math.min(100, (phase.daysSpent / Math.max(...selectedStudentPhases.phases.map(p => p.daysSpent))) * 100)}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {selectedStudentPhases.phases.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No phase data available for this student.
              </div>
            )}
          </div>

          <div className="flex justify-end p-6 border-t bg-gray-50">
            <button
              onClick={() => setSelectedStudentPhases(null)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Goal Details Modal */}
    {selectedStudentGoals && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-900">
              Goals for {selectedStudentGoals.studentName}
            </h2>
            <button
              onClick={() => setSelectedStudentGoals(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto max-h-[60vh]">
            <div className="space-y-4">
              {selectedStudentGoals.goals.map((goal) => (
                <div
                  key={goal.id}
                  className="p-4 bg-gray-50 rounded-md border border-gray-100"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="text-gray-900 font-medium mb-1">{goal.goal_text}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>Created: {goal.created_at.toLocaleDateString()}</span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          goal.status === 'approved' ? 'bg-green-100 text-green-800' :
                          goal.status === 'reviewed' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {goal.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {selectedStudentGoals.goals.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No goals found for this student.
              </div>
            )}
          </div>

          <div className="flex justify-end p-6 border-t bg-gray-50">
            <button
              onClick={() => setSelectedStudentGoals(null)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default AdminJourneyTracking;