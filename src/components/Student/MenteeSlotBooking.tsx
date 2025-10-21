import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { UserService } from '../../services/firestore';
import { EnhancedPairProgrammingService, AdminService } from '../../services/dataServices';
import { User } from '../../types';
import { PairProgrammingRequest, SessionType, PriorityLevel } from '../../types';
import {
  Check,
  AlertCircle,
  Loader,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from 'lucide-react';
import { CalendarConnection } from './CalendarConnection';

interface FormData {
  topic: string;
  description: string;
  session_type: SessionType | null;
  priority: PriorityLevel;
  preferred_date: string;
  preferred_time: string;
  duration_minutes: number;
  tags: string[];
  is_recurring: boolean;
}

interface FormErrors {
  topic?: string;
  description?: string;
  session_type?: string;
  duration_minutes?: string;
  submit?: string;
  [key: string]: string | undefined;
}

interface BookingStep {
  current: 'form' | 'review' | 'success';
  assignedMentor: User | null;
}

const MenteeSlotBooking: React.FC = () => {
  const { userData } = useAuth();
  const [bookingStep, setBookingStep] = useState<BookingStep>({
    current: 'form',
    assignedMentor: null,
  });

  const [formData, setFormData] = useState<FormData>({
    topic: '',
    description: '',
    session_type: null,
    priority: 'medium',
    preferred_date: '',
    preferred_time: '',
    duration_minutes: 60,
    tags: [],
    is_recurring: false,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showOptionalPreferences, setShowOptionalPreferences] = useState(false);
  const [studentTopicInfo, setStudentTopicInfo] = useState<{ topic: string; phase: string } | null>(null);

  // Load assigned mentor and student topic info
  useEffect(() => {
    const initializeForm = async () => {
      try {
        setLoading(true);

        // Load assigned mentor
        if (userData?.mentor_id) {
          const mentor = await UserService.getUserById(userData.mentor_id);
          if (mentor) {
            setBookingStep((prev) => ({
              ...prev,
              assignedMentor: mentor,
            }));
          } else {
            setErrors({
              submit: 'Could not load your assigned mentor. Please try again.',
            });
          }
        } else {
          setErrors({
            submit:
              'You do not have an assigned mentor. Please request a mentor first.',
          });
        }

        // Load student topic info (auto-populate topic field)
        if (userData?.id) {
          const topicInfo =
            await AdminService.getStudentCurrentTopicAndPhase(userData.id);
          if (topicInfo) {
            setStudentTopicInfo(topicInfo);
            setFormData((prev) => ({
              ...prev,
              topic: topicInfo.topic,
            }));
          }
        }
      } catch (err) {
        console.error('Error initializing form:', err);
        setErrors({
          submit: 'Failed to load form data. Please try again.',
        });
      } finally {
        setLoading(false);
      }
    };

    if (userData?.id) {
      initializeForm();
    }
  }, [userData?.id, userData?.mentor_id]);

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const sessionTypes: { value: SessionType; label: string; description: string }[] = [
    {
      value: 'one_on_one',
      label: 'One-on-One / Personal Mentoring',
      description: 'Personal mentoring session with your assigned mentor',
    },
    {
      value: 'code_review',
      label: 'Code/Debug Review',
      description: 'Review and improve existing code',
    },
    {
      value: 'project_planning',
      label: 'Project Planning',
      description: 'Plan and architect new projects',
    },
  ];

  const priorities: { value: PriorityLevel; label: string; color: string }[] = [
    { value: 'low', label: 'Low', color: 'text-green-600' },
    { value: 'medium', label: 'Medium', color: 'text-yellow-600' },
    { value: 'high', label: 'High', color: 'text-orange-600' },
    { value: 'urgent', label: 'Urgent', color: 'text-red-600' },
  ];

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.topic || formData.topic.trim() === '') {
      newErrors.topic = 'Please describe what you want to work on';
    }

    if (!formData.description || formData.description.trim() === '') {
      newErrors.description = 'Please provide a description';
    }

    if (!formData.session_type) {
      newErrors.session_type = 'Please select a session type';
    }

    if (formData.duration_minutes < 30 || formData.duration_minutes > 180) {
      newErrors.duration_minutes = 'Duration must be between 30 and 180 minutes';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (!bookingStep.assignedMentor || !userData?.id) {
      setErrors({
        submit: 'Mentor information is missing. Please refresh and try again.',
      });
      return;
    }

    try {
      setSubmitting(true);
      setErrors({});

      const requestData: Omit<
        PairProgrammingRequest,
        'id' | 'created_at' | 'updated_at'
      > = {
        student_id: userData.id,
        topic: formData.topic,
        description: formData.description,
        session_type: formData.session_type!,
        priority: formData.priority,
        preferred_date: formData.preferred_date,
        preferred_time: formData.preferred_time,
        duration_minutes: formData.duration_minutes,
        max_participants: 1,
        tags: formData.tags || [],
        specific_mentor_id: bookingStep.assignedMentor.id,
        is_recurring: formData.is_recurring || false,
        recurring_pattern: null,
        status: 'pending',
        mentor_id: bookingStep.assignedMentor.id,
        scheduled_date: formData.preferred_date
          ? new Date(formData.preferred_date)
          : undefined,
        scheduled_time: formData.preferred_time || undefined,
        completed_at: undefined,
        feedback_submitted: false,
        notes: undefined,
      };

      await EnhancedPairProgrammingService.createSessionRequest(requestData);

      // Move to review step
      setBookingStep((prev) => ({
        ...prev,
        current: 'review',
      }));
    } catch (error) {
      console.error('Error creating session request:', error);
      setErrors({
        submit: 'Failed to create session request. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmReview = async () => {
    // Session is already created in the form submission
    // Just move to success state
    setBookingStep((prev) => ({
      ...prev,
      current: 'success',
    }));

    // Reset after 3 seconds
    setTimeout(() => {
      setFormData({
        topic: '',
        description: '',
        session_type: null,
        priority: 'medium',
        preferred_date: '',
        preferred_time: '',
        duration_minutes: 60,
        tags: [],
        is_recurring: false,
      });
      setBookingStep((prev) => ({
        ...prev,
        current: 'form',
      }));
    }, 3000);
  };

  const handleBackStep = () => {
    if (bookingStep.current === 'review') {
      setBookingStep((prev) => ({
        ...prev,
        current: 'form',
      }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Request Pair Programming Session
          </h1>
          <p className="text-gray-600">
            Book a session with your assigned mentor
          </p>
        </div>

        {/* Error Alert */}
        {errors.submit && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-900">Error</p>
              <p className="text-red-700 text-sm">{errors.submit}</p>
            </div>
          </div>
        )}

        {/* Success Message */}
        {bookingStep.current === 'success' && (
          <div className="mb-6 p-6 bg-green-50 border border-green-200 rounded-lg flex items-start gap-4">
            <Check className="w-6 h-6 text-green-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-green-900 text-lg">
                Session Created Successfully!
              </p>
              <p className="text-green-700 mt-1">
                Your session request has been created and your mentor will be
                notified.
              </p>
              <p className="text-green-600 text-sm mt-2">
                Redirecting to your sessions...
              </p>
            </div>
          </div>
        )}

        {/* Form Step */}
        {bookingStep.current === 'form' && bookingStep.assignedMentor && (
          <div className="bg-white rounded-xl shadow-lg p-8 space-y-6">
            {/* Mentor Info */}
            <div className="bg-blue-50 rounded-lg border-l-4 border-blue-500 p-4 mb-6">
              <p className="text-sm text-gray-600 mb-1">Assigned Mentor:</p>
              <p className="text-lg font-bold text-gray-900">
                {bookingStep.assignedMentor.display_name ||
                  bookingStep.assignedMentor.name}
              </p>
              <p className="text-sm text-gray-600">
                {bookingStep.assignedMentor.email}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Calendar Connection */}
              <CalendarConnection />

              {/* Required Fields */}
              <div className="space-y-6">
                {/* What do you want to work on? */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    What do you want to work on? *
                  </label>
                  <input
                    type="text"
                    value={formData.topic}
                    onChange={(e) =>
                      handleInputChange('topic', e.target.value)
                    }
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.topic
                        ? 'border-red-300'
                        : 'border-gray-300'
                    }`}
                    placeholder="Describe what you want to work on"
                  />
                  {studentTopicInfo && (
                    <p className="mt-1 text-sm text-gray-500">
                      Current: {studentTopicInfo.topic} (Phase:{' '}
                      {studentTopicInfo.phase})
                    </p>
                  )}
                  {errors.topic && (
                    <p className="mt-1 text-sm text-red-600">{errors.topic}</p>
                  )}
                </div>

                {/* Session Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Session Type *
                  </label>
                  <div className="grid grid-cols-1 gap-3">
                    {sessionTypes.map((type) => (
                      <label key={type.value} className="flex items-start">
                        <input
                          type="radio"
                          name="session_type"
                          value={type.value}
                          checked={formData.session_type === type.value}
                          onChange={(e) =>
                            handleInputChange(
                              'session_type',
                              e.target.value as SessionType
                            )
                          }
                          className="text-blue-600 focus:ring-blue-500 mt-1"
                        />
                        <div className="ml-3">
                          <span className="text-sm font-medium text-gray-900">
                            {type.label}
                          </span>
                          <p className="text-sm text-gray-500">
                            {type.description}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                  {errors.session_type && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.session_type}
                    </p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      handleInputChange('description', e.target.value)
                    }
                    rows={4}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.description
                        ? 'border-red-300'
                        : 'border-gray-300'
                    }`}
                    placeholder="Describe what you want to work on, what you're struggling with, or what you want to learn..."
                  />
                  {errors.description && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Optional Preferences Section */}
              <div className="border-t border-gray-200 pt-6">
                <button
                  type="button"
                  onClick={() =>
                    setShowOptionalPreferences(!showOptionalPreferences)
                  }
                  className="flex items-center justify-between w-full text-left"
                >
                  <h3 className="text-lg font-medium text-gray-900">
                    Optional Preferences
                  </h3>
                  {showOptionalPreferences ? (
                    <ChevronUp className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  )}
                </button>

                {showOptionalPreferences && (
                  <div className="mt-6 space-y-6">
                    {/* Priority Level */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Priority Level
                      </label>
                      <div className="flex space-x-4">
                        {priorities.map((priority) => (
                          <label
                            key={priority.value}
                            className="flex items-center"
                          >
                            <input
                              type="radio"
                              name="priority"
                              value={priority.value}
                              checked={
                                formData.priority === priority.value
                              }
                              onChange={(e) =>
                                handleInputChange(
                                  'priority',
                                  e.target.value as PriorityLevel
                                )
                              }
                              className="text-blue-600 focus:ring-blue-500"
                            />
                            <span
                              className={`ml-2 text-sm font-medium ${priority.color}`}
                            >
                              {priority.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Preferred Date & Time */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Preferred Date & Time
                      </label>
                      <p className="text-sm text-gray-500 mb-3">
                        We'll check your mentor's availability and suggest the
                        best times
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <input
                            type="date"
                            value={formData.preferred_date}
                            onChange={(e) =>
                              handleInputChange(
                                'preferred_date',
                                e.target.value
                              )
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <input
                            type="time"
                            value={formData.preferred_time}
                            onChange={(e) =>
                              handleInputChange(
                                'preferred_time',
                                e.target.value
                              )
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Duration */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Duration (minutes)
                      </label>
                      <input
                        type="number"
                        min="30"
                        max="180"
                        step="15"
                        value={formData.duration_minutes}
                        onChange={(e) =>
                          handleInputChange(
                            'duration_minutes',
                            parseInt(e.target.value)
                          )
                        }
                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.duration_minutes
                            ? 'border-red-300'
                            : 'border-gray-300'
                        }`}
                      />
                      {errors.duration_minutes && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.duration_minutes}
                        </p>
                      )}
                    </div>

                    {/* Tags */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tags
                      </label>
                      <input
                        type="text"
                        value={formData.tags?.join(', ')}
                        onChange={(e) =>
                          handleInputChange(
                            'tags',
                            e.target.value
                              .split(',')
                              .map((tag) => tag.trim())
                              .filter((tag) => tag)
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., React, JavaScript, Algorithms (comma-separated)"
                      />
                    </div>

                    {/* Recurring Session */}
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="is_recurring"
                        checked={formData.is_recurring}
                        onChange={(e) =>
                          handleInputChange(
                            'is_recurring',
                            e.target.checked
                          )
                        }
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <label
                        htmlFor="is_recurring"
                        className="ml-2 text-sm text-gray-700"
                      >
                        Make this a recurring session
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Error */}
              {errors.submit && (
                <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-md">
                  <AlertTriangle className="h-5 w-5 text-red-400 mr-3" />
                  <p className="text-sm text-red-700">{errors.submit}</p>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Create Session Request
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Review Step */}
        {bookingStep.current === 'review' && bookingStep.assignedMentor && (
          <div className="space-y-6">
            {/* Back Button */}
            <button
              onClick={handleBackStep}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
            >
              ← Back to Edit
            </button>

            {/* Review Summary */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-8">
                Review Your Request
              </h2>

              <div className="space-y-6">
                {/* Mentor Info */}
                <div className="pb-6 border-b border-gray-200">
                  <p className="text-sm font-semibold text-gray-600 uppercase mb-3">
                    Mentor
                  </p>
                  <h3 className="text-xl font-bold text-gray-900">
                    {bookingStep.assignedMentor.display_name ||
                      bookingStep.assignedMentor.name}
                  </h3>
                  <p className="text-gray-600 text-sm mt-1">
                    {bookingStep.assignedMentor.email}
                  </p>
                </div>

                {/* Topic & Session Type */}
                <div className="pb-6 border-b border-gray-200">
                  <p className="text-sm font-semibold text-gray-600 uppercase mb-3">
                    Session Details
                  </p>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Topic</p>
                      <p className="font-bold text-gray-900">
                        {formData.topic}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Session Type</p>
                      <p className="font-bold text-gray-900">
                        {sessionTypes.find((t) => t.value === formData.session_type)
                          ?.label || 'Not specified'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Description</p>
                      <p className="text-gray-700">{formData.description}</p>
                    </div>
                  </div>
                </div>

                {/* Preferences */}
                <div>
                  <p className="text-sm font-semibold text-gray-600 uppercase mb-3">
                    Preferences
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Priority</p>
                      <p className="font-bold text-gray-900">
                        {priorities.find((p) => p.value === formData.priority)
                          ?.label}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Duration</p>
                      <p className="font-bold text-gray-900">
                        {formData.duration_minutes} minutes
                      </p>
                    </div>
                    {formData.preferred_date && (
                      <div>
                        <p className="text-sm text-gray-600">Preferred Date</p>
                        <p className="font-bold text-gray-900">
                          {new Date(
                            formData.preferred_date
                          ).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    {formData.preferred_time && (
                      <div>
                        <p className="text-sm text-gray-600">Preferred Time</p>
                        <p className="font-bold text-gray-900">
                          {formData.preferred_time}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 flex gap-4">
                <button
                  onClick={handleBackStep}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Back to Edit
                </button>
                <button
                  onClick={handleConfirmReview}
                  className="flex-1 px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Confirm & Submit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MenteeSlotBooking;
