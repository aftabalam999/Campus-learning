// Leave interface
export interface Leave {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  leave_type: 'kitchen_leave' | 'on_leave';
  start_date: Date;
  end_date: Date;
  reason?: string; // Mandatory for on_leave, optional for kitchen_leave
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  approved_by?: string; // User ID of admin/academic associate who approved
  approved_by_name?: string;
  approved_at?: Date;
  rejected_by?: string;
  rejected_by_name?: string;
  rejected_at?: Date;
  rejection_reason?: string;
  created_at: Date;
  updated_at: Date;
}

// User interface
export interface User {
  id: string;
  name: string;
  email: string;
  display_name?: string;
  isAdmin?: boolean;    // Only used for admin-specific features
  isMentor?: boolean;   // Whether the user is a mentor
  isSuperMentor?: boolean;  // Can have unlimited mentees (no 2-mentee limit)
  mentor_id?: string;   // ID of assigned mentor if student
  pending_mentor_id?: string;  // Requested mentor awaiting admin approval
  max_mentees?: number;  // Override default limit (default: 2, super mentors: unlimited)
  skills?: string[];
  house?: 'Bageshree' | 'Malhar' | 'Bhairav';  // User's assigned house
  campus?: 'Dantewada' | 'Dharamshala' | 'Eternal' | 'Jashpur' | 'Kishanganj' | 'Pune' | 'Raigarh' | 'Sarjapura' | 'Bageshree' | 'Malhar' | 'Bhairav';  // User's campus or house
  current_phase_id?: string;  // Current phase the user is on
  current_phase_name?: string;  // Denormalized phase name for display
  status?: 'active' | 'inactive' | 'dropout' | 'placed' | 'on_leave' | 'kitchen_leave';  // User's current status
  leave_from?: Date;  // Start date of leave period
  leave_to?: Date;    // End date of leave period
  campus_joining_date?: Date; // Date when student joined the campus
  deleted_at?: Date;  // Soft delete timestamp
  created_at: Date;
  updated_at: Date;
  role?: 'admin' | 'academic_associate' | 'super_mentor' | 'mentor';  // Role of the user
  gemini_api_key?: string; // Optional Gemini API key for AI feedback
  discord_user_id?: string; // Discord user ID for notifications and tagging
  notification_preferences?: {
    in_app?: boolean;
    discord?: boolean;
    email?: boolean;
  };
}

// Phase interface
export interface Phase {
  id: string;
  name: string;
  order: number;
  isSenior?: boolean; // optional flag to mark mentor/senior phases
  active_students_count?: number; // Number of students currently working in this phase
  completed_students_count?: number; // Number of students who have completed this phase
  created_at: Date;
  updated_at: Date;
}

// Topic interface
export interface Topic {
  id: string;
  phase_id: string;
  name: string;
  order: number;
  maxTime?: number;
  keyTags?: string[];
  deliverable?: string;
  icon?: string;
  technologies?: string[];
  description?: string;
  created_at: Date;
  updated_at: Date;
}

// Daily goals interface
export interface DailyGoal {
  id: string;
  student_id: string;
  phase_id: string;
  topic_id: string;
  goal_text: string;
  target_percentage: number;
  status: 'pending' | 'reviewed' | 'approved';
  mentor_comment?: string;
  goal_rating?: number; // AI-generated goal rating (0-100)
  goal_feedback?: string; // AI-generated SMART feedback
  created_at: Date;
  updated_at: Date;
  reviewed_at?: Date;
  reviewed_by?: string;
}

// Daily reflections interface
export interface DailyReflection {
  id: string;
  student_id: string;
  goal_id: string;
  phase_id: string;
  topic_id: string;
  reflection_answers: {
    workedWell: string;      // What worked well for you today? What were you able to achieve?
    howAchieved: string;     // How did you achieve this, and who supported you?
    keyLearning: string;     // What was your special learning from today's task?
    challenges: string;      // What challenges did you face, and what would you need to make it better?
  };
  achieved_percentage: number;
  status: 'pending' | 'reviewed' | 'approved';
  mentor_notes?: string;
  mentor_assessment?: 'needs_improvement' | 'on_track' | 'exceeds_expectations';
  is_read_by_student?: boolean;
  created_at: Date;
  updated_at: Date;
  reviewed_at?: Date;
  reviewed_by?: string;
  feedback_given_at?: Date;
}

// Mentee review interface
export interface MenteeReview {
  id: string;
  student_id: string;
  mentor_id: string;
  morning_exercise: number; // -2 to 2
  communication: number; // -2 to 2
  academic_effort: number; // -2 to 2
  campus_contribution: number; // -2 to 2
  behavioural: number; // -2 to 2
  notes?: string;
  week_start: Date;
  created_at: Date;
  updated_at: Date;
  
  // Enhanced fields for deadline enforcement
  submission_deadline?: Date; // Monday at 23:59:59
  submitted_on_time?: boolean; // Was it submitted by Monday?
  days_overdue?: number; // How many days past deadline
  is_mandatory?: boolean; // Is this review compulsory? (default: true)
  exemption_reason?: string | null; // e.g., "Student on leave"
}

export interface MenteeReviewForm {
  morningExercise: number;
  communication: number;
  academicEffort: number;
  campusContribution: number;
  behavioural: number;
  notes: string;
}

// Mentor Review (Student reviews Mentor)
export interface MentorReview {
  id: string;
  mentor_id: string;
  student_id: string;
  morning_exercise: number; // -2 to 2
  communication: number; // -2 to 2
  academic_effort: number; // -2 to 2
  campus_contribution: number; // -2 to 2
  behavioural: number; // -2 to 2
  mentorship_level: number; // -2 to 2 (Additional scale for mentoring quality)
  notes?: string;
  week_start: Date;
  created_at: Date;
  updated_at: Date;
  
  // Enhanced fields for deadline enforcement
  submission_deadline?: Date; // Monday at 23:59:59
  submitted_on_time?: boolean; // Was it submitted by Monday?
  days_overdue?: number; // How many days past deadline
  is_mandatory?: boolean; // Is this review compulsory? (default: true)
  exemption_reason?: string | null; // e.g., "Student on leave"
}

export interface MentorReviewForm {
  morningExercise: number;
  communication: number;
  academicEffort: number;
  campusContribution: number;
  behavioural: number;
  mentorshipLevel: number; // Additional field for rating mentor's mentorship quality
  notes: string;
}

// Pair programming request interface (DEPRECATED - use PairProgrammingSession instead)
export interface DeprecatedPairProgrammingRequest {
  id: string;
  student_id: string;
  mentor_id?: string;
  topic: string;
  description?: string;
  status: 'pending' | 'assigned' | 'completed' | 'cancelled';
  feedback?: string;
  created_at: Date;
  assigned_at?: Date;
  completed_at?: Date;
}

// Attendance interface
export interface Attendance {
  id: string;
  student_id: string;
  date: Date;
  goal_reviewed: boolean;
  reflection_reviewed: boolean;
  present_status: 'present' | 'absent' | 'on_leave';
  created_at: Date;
  updated_at: Date;
}

// Mentor notes interface
export interface MentorNote {
  id: string;
  mentor_id: string;
  student_id: string;
  skills: string[];
  performance_notes: string;
  rating?: number; // 1-5 scale
  created_at: Date;
  updated_at: Date;
}

// Leave request interface
export interface LeaveRequest {
  id: string;
  user_id: string; // Changed from student_id to user_id for all roles
  start_date: Date;
  end_date: Date;
  reason?: string; // Made optional
  leave_type: 'vacation' | 'sick' | 'personal' | 'emergency' | 'other';
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'; // Expanded status options
  requested_by: string; // User ID who requested
  approved_by?: string; // Admin/Mentor ID who approved
  approved_at?: Date;
  marked_by: 'self' | 'mentor' | 'admin'; // Who marked the leave
  created_at: Date;
  updated_at: Date;
}

// Progress tracking interface
export interface StudentProgress {
  student_id: string;
  phase_id: string;
  topic_id: string;
  start_date: Date;
  end_date?: Date;
  expected_end_date: Date;
  completion_percentage: number;
  is_on_track: boolean;
}

// House statistics cache interface
export interface HouseStats {
  id: string;
  house: 'Bageshree' | 'Malhar' | 'Bhairav';
  phaseId: string;
  phaseLabel: string;
  averageDays: number;
  studentCount: number;
  calculatedAt: Date;
  weekNumber: number;
  year: number;
  created_at: Date;
  updated_at: Date;
}

// Dashboard stats interfaces
export interface StudentStats {
  total_goals: number;
  goals_achieved: number;
  average_achievement_percentage: number;
  attendance_percentage: number;
  leaves_taken: number;
  leaves_remaining: number;
  pair_programming_sessions: number;
}

export interface MentorStats {
  total_mentees: number;
  pending_reviews: number;
  pair_programming_requests: number;
  average_mentee_performance: number;
}

export interface AdminStats {
  total_students: number;
  total_mentors: number;
  campus_attendance_rate: number;
  average_goal_achievement: number;
  total_pair_programming_sessions: number;
  students_on_track: number;
  students_behind: number;
}

// Form interfaces
export interface GoalFormData {
  phase_id: string;
  topic_id: string;
  goal_text: string;
  target_percentage: number;
  goal_date?: Date;
}

export interface PairProgrammingFormData {
  topic: string;
  description?: string;
}

// API Response interfaces
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Navigation and routing
export interface NavItem {
  label: string;
  path: string;
  icon?: string;
  adminOnly?: boolean;
}

// Admin reporting interfaces
export interface PhaseProgress {
  phase_id: string;
  phase_name: string;
  goals_count: number;
  reflections_count: number;
  average_achievement: number;
  duration_days: number;
  topics_covered: number;
  total_topics: number;
  status: 'completed' | 'in_progress' | 'not_started';
  start_date: Date;
  end_date?: Date;
}

export interface StudentReport {
  student_id: string;
  student_name: string;
  student_email: string;
  mentor_id?: string;
  mentor_name?: string;
  current_phase_id?: string;
  current_phase_name?: string;
  
  // Aggregated stats
  total_goals: number;
  total_reflections: number;
  reflection_submission_rate: number; // percentage
  average_achievement: number;
  mentor_feedback_rate: number;
  
  // Phase-wise breakdown
  phase_progress: PhaseProgress[];
  
  // Recent activity
  recent_goals: DailyGoal[];
  recent_reflections: DailyReflection[];
  
  // Insights
  strengths: string[];
  improvement_areas: string[];
  recurring_challenges: string[];
  
  // Additional metrics
  attendance_rate: number;
  pair_programming_sessions: number;
  leaves_taken: number;
  
  generated_at: Date;
}

// Mentor dashboard interfaces
export interface MenteeOverview {
  student: User;
  pending_goals: number;
  pending_reflections: number;
  latest_goal?: DailyGoal;
  latest_reflection?: DailyReflection;
  average_achievement: number;
  current_phase?: string;
  current_topic?: string;
  weekly_review_status: 'completed' | 'pending' | 'overdue';
  latest_review?: MenteeReview | null;
}

// Mentor change request interface
export interface MentorChangeRequest {
  id: string;
  student_id: string;
  student_name?: string; // Denormalized for easy display
  student_email?: string;
  requested_mentor_id: string;
  requested_mentor_name?: string; // Denormalized for easy display
  current_mentor_id?: string; // Can be null if no current mentor
  current_mentor_name?: string; // Denormalized for easy display
  status: 'pending' | 'approved' | 'rejected';
  reason?: string; // Optional reason from student
  admin_notes?: string; // Optional notes from admin
  created_at: Date;
  reviewed_at?: Date;
  reviewed_by?: string; // Admin user ID who reviewed
}

// Helper type for mentor capacity display
export interface MentorWithCapacity {
  mentor: User;
  current_mentees: number;
  max_mentees: number;
  available_slots: number;
  mentee_names: string[];
}

// ===== CAMPUS SCHEDULE & AVAILABILITY TYPES =====

// Campus Schedule Configuration
export interface CampusSchedule {
  id: string;
  campus: string; // Campus name
  timezone: string; // Timezone (e.g., 'Asia/Kolkata')
  working_days: ('monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday')[];
  start_time: string; // HH:MM format (e.g., '09:00')
  end_time: string; // HH:MM format (e.g., '18:00')
  break_start?: string; // Optional break time start
  break_end?: string; // Optional break time end
  max_sessions_per_day: number; // Maximum sessions per day
  created_at: Date;
  updated_at: Date;
}

// Mentor Availability Slots
export interface MentorAvailability {
  id: string;
  mentor_id: string;
  campus: string;
  day_of_week: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  start_time: string; // HH:MM format
  end_time: string; // HH:MM format
  is_available: boolean;
  max_sessions_per_slot: number; // How many sessions can be scheduled in this time slot
  created_at: Date;
  updated_at: Date;
}

// Available Time Slot
export interface AvailableTimeSlot {
  date: string; // YYYY-MM-DD format
  start_time: string; // HH:MM format
  end_time: string; // HH:MM format
  mentor_id: string;
  mentor_name: string;
  campus: string;
  session_count: number; // Current sessions in this slot
  max_sessions: number; // Max sessions allowed in this slot
  is_available: boolean;
}

// ===== PAIR PROGRAMMING SYSTEM TYPES =====

// Pair Programming Session Types
export interface PairProgrammingSession {
  id: string;
  student_id: string;
  mentor_id?: string; // null for open requests
  topic: string;
  description?: string;
  status: 'pending' | 'assigned' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  session_type: 'open_request' | 'scheduled' | 'emergency';
  priority: 'low' | 'medium' | 'high' | 'urgent'; // Based on days since last session
  scheduled_date?: Date;
  scheduled_time?: string; // HH:MM format
  duration_minutes: number; // Default 60 minutes
  meeting_link?: string;
  created_at: Date;
  assigned_at?: Date;
  started_at?: Date;
  completed_at?: Date;
  cancelled_at?: Date;
  cancel_reason?: string;
  notes?: string; // Mentor feedback/notes
  updated_at: Date; // Added for tracking updates
}

// Pair Programming Request (for creating new requests)
export interface PairProgrammingRequest {
  id: string;
  student_id: string;
  topic: string;
  description: string;
  session_type: 'one_on_one' | 'group' | 'code_review' | 'debugging' | 'project_planning';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  preferred_date: string;
  preferred_time: string;
  duration_minutes: number;
  max_participants: number;
  tags: string[];
  specific_mentor_id?: string;
  is_recurring: boolean;
  recurring_pattern?: any;
  status: 'pending' | 'assigned' | 'completed' | 'cancelled';
  mentor_id?: string;
  assigned_at?: Date;
  scheduled_date?: Date;
  scheduled_time?: string;
  completed_at?: Date;
  feedback?: string;
  feedback_submitted: boolean;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

// Session types and priorities
export type SessionType = 'one_on_one' | 'group' | 'code_review' | 'debugging' | 'project_planning';
export type PriorityLevel = 'low' | 'medium' | 'high' | 'urgent';

// Pair Programming Goals and Limits
export interface PairProgrammingGoal {
  id: string;
  user_id: string;
  user_role: 'mentee' | 'mentor' | 'academic_associate';
  weekly_target: number; // Sessions per week for mentees, daily limit for mentors
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

// Feedback System Types
export interface MentorFeedback {
  id: string;
  session_id: string;
  mentor_id: string;
  engagement_rating: number; // 1-5 scale
  creativity_rating: number; // 1-5 scale
  problem_solving_rating: number; // 1-5 scale
  overall_rating: number; // 1-5 scale
  strengths: string[];
  improvement_areas: string[];
  comments: string;
  submitted_at: Date;
}

export interface MenteeFeedback {
  id: string;
  session_id: string;
  student_id: string;
  what_learned: string;
  challenges_faced: string;
  self_rating: number; // 1-5 scale
  additional_comments: string;
  submitted_at: Date;
}

// Session Completion Tracking
export interface SessionCompletion {
  id: string;
  session_id: string;
  mentor_feedback_id?: string;
  mentee_feedback_id?: string;
  is_completed: boolean; // True when both feedbacks are submitted
  completed_at?: Date;
}

// ===== LEAVE MANAGEMENT SYSTEM TYPES =====

// Leave Impact on Sessions
export interface LeaveImpact {
  leave_id: string;
  affected_sessions: string[]; // Session IDs that need reassignment
  reassignment_status: 'pending' | 'completed' | 'cancelled';
  reassigned_to?: string[]; // New mentor IDs
  created_at: Date;
}

// ===== DASHBOARD AND ANALYTICS TYPES =====

// Pair Programming Dashboard Stats
export interface PairProgrammingStats {
  total_sessions_all_time: number;
  sessions_last_7_days: number;
  sessions_this_week: number;
  expected_sessions_this_week: number;
  pending_sessions: number;
  overdue_sessions: number; // Sessions past due date
  mentees_with_overdue_sessions: number;
  average_sessions_per_mentee: number;
  average_sessions_per_mentor: number;
}

// Leaderboard Types
export interface MentorLeaderboardEntry {
  mentor_id: string;
  mentor_name: string;
  total_sessions: number;
  sessions_this_week: number;
  average_rating: number;
  mentees_helped: number;
  rank: number;
}

export interface MenteeLeaderboardEntry {
  mentee_id: string;
  mentee_name: string;
  total_sessions: number;
  sessions_this_week: number;
  average_self_rating: number;
  goals_achieved: number;
  rank: number;
}

// Calendar Event Types
export interface CalendarEvent {
  id: string;
  type: 'pair_session' | 'leave' | 'goal_deadline' | 'reflection_deadline';
  title: string;
  description?: string;
  start_date: Date;
  end_date?: Date;
  user_id: string;
  session_id?: string;
  leave_id?: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'overdue';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

// ===== NOTIFICATION SYSTEM TYPES =====

// Notification Types
export interface Notification {
  id: string;
  user_id: string;
  type: 'session_reminder' | 'session_assigned' | 'session_cancelled' | 'feedback_due' | 'leave_requested' | 'leave_approved' | 'leave_rejected' | 'leave_expired' | 'leave_expired_admin' | 'welcome_back' | 'session_reassigned';
  title: string;
  message: string;
  is_read: boolean;
  related_session_id?: string;
  related_leave_id?: string;
  scheduled_for?: Date; // For scheduled notifications
  created_at: Date;
  read_at?: Date;
}

// Auto-reminder Settings
export interface ReminderSettings {
  user_id: string;
  session_reminders_enabled: boolean;
  reminder_hours_before: number[]; // e.g., [24, 2, 0.5] for 24h, 2h, 30min before
  feedback_reminders_enabled: boolean;
  feedback_reminder_days_after: number; // Days after session to remind for feedback
  created_at: Date;
  updated_at: Date;
}

// ===== FORM TYPES =====

// Pair Programming Request Form
export interface PairProgrammingRequestForm {
  topic: string;
  description?: string;
  preferred_date?: Date;
  preferred_time?: string;
  urgency: 'low' | 'medium' | 'high' | 'urgent';
  session_type: 'open_request' | 'scheduled';
}

// Leave Request Form
export interface LeaveRequestForm {
  start_date: Date;
  end_date: Date;
  reason?: string;
  leave_type: 'vacation' | 'sick' | 'personal' | 'emergency' | 'other';
  handle_sessions: 'postpone' | 'reassign' | 'cancel'; // How to handle overlapping sessions
}

// Feedback Forms
export interface MentorFeedbackForm {
  engagement_rating: number;
  creativity_rating: number;
  problem_solving_rating: number;
  strengths: string[];
  improvement_areas: string[];
  comments: string;
}

export interface MenteeFeedbackForm {
  what_learned: string;
  challenges_faced: string;
  self_rating: number;
  additional_comments: string;
}

// ===== API RESPONSE TYPES =====

// Pair Programming API Responses
export interface SessionListResponse extends PaginatedResponse<PairProgrammingSession> {
  stats: PairProgrammingStats;
  overdue_sessions: PairProgrammingSession[];
}

export interface DashboardData {
  user_stats: PairProgrammingStats;
  todays_sessions: PairProgrammingSession[];
  upcoming_sessions: PairProgrammingSession[];
  pending_requests: PairProgrammingSession[];
  recent_completed: PairProgrammingSession[];
  leaderboard: {
    mentors: MentorLeaderboardEntry[];
    mentees: MenteeLeaderboardEntry[];
  };
  calendar_events: CalendarEvent[];
  leaves_today: {
    mentors_on_leave: number;
    mentees_on_leave: number;
    leave_details: LeaveRequest[];
  };
}

// Role-based Access Types
export type UserRole = 'admin' | 'academic_associate' | 'super_mentor' | 'mentor' | 'mentee';

export interface RolePermissions {
  can_view_all_sessions: boolean;
  can_manage_leaves: boolean;
  can_reassign_sessions: boolean;
  can_view_analytics: boolean;
  can_manage_goals: boolean;
  viewable_users: 'all' | 'mentees_only' | 'self_only';
}

// ===== CAMPUS SCHEDULE TYPES =====
export interface TimeBlock {
  id: string;
  name: string; // e.g., "Morning Session", "Lunch Break", "Recreation", "English Session", "Mini Break"
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  type: 'work' | 'break' | 'lunch' | 'recreation' | 'english' | 'mini_break';
  order: number;
}

// Slot availability response
export interface AvailableSlot {
  startTime: Date;
  endTime: Date;
  duration: number; // in minutes
}

// ===== ACADEMIC ASSOCIATE TYPES =====

// Academic Associate Assignment (admin assigns students to an AA)
export interface AcademicAssociateAssignment {
  id: string;
  academic_associate_id: string;
  student_ids: string[];
  campus: string;
  house?: string;
  phase?: string;
  created_at: Date;
  updated_at: Date;
  created_by: string;
  notes?: string;
}

// Student to AA Mapping (denormalized for quick lookup)
export interface StudentAAMapping {
  student_id: string;
  academic_associate_id: string;
  campus: string;
  house?: string;
  phase?: string;
  assigned_at: Date;
  assigned_by: string;
}

// Phase Approval interface - for locking phase progression
export interface PhaseApproval {
  id: string;
  student_id: string;
  student_name?: string; // Denormalized for easy identification
  current_phase_id: string;
  current_phase_name?: string; // Denormalized for display
  next_phase_id: string;
  next_phase_name?: string; // Denormalized for display
  requested_at: Date;
  status: 'pending' | 'approved' | 'rejected';
  approved_by?: string; // admin or academic associate user ID
  approved_by_name?: string; // Denormalized for display
  approved_at?: Date;
  rejection_reason?: string;
  created_at: Date;
  updated_at: Date;
}

// Campus Webhook interface - for storing webhook URLs per campus
export interface CampusWebhook {
  id: string;
  campus: string;
  webhook_url: string;
  created_by: string;
  created_by_name?: string;
  updated_by?: string;
  updated_by_name?: string;
  created_at: Date;
  updated_at: Date;
}

// Webhook Change Notification interface
export interface WebhookChangeNotification {
  id: string;
  campus: string;
  changed_by: string;
  changed_by_name?: string;
  old_webhook_url?: string;
  new_webhook_url: string;
  change_type: 'created' | 'updated' | 'deleted';
  timestamp: Date;
  is_read: boolean;
  read_by?: string[];
  created_at: Date;
}