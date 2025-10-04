import React, { useState, useEffect } from 'react';
import { MentorshipService } from '../../services/dataServices';
import { MentorWithCapacity } from '../../types';
import { 
  X, 
  Star, 
  Users, 
  CheckCircle, 
  AlertCircle,
  UserCheck,
  Loader
} from 'lucide-react';

interface MentorBrowserProps {
  currentStudentId: string;
  currentMentorId?: string;
  onClose: () => void;
  onRequestSubmitted: () => void;
}

const MentorBrowser: React.FC<MentorBrowserProps> = ({
  currentStudentId,
  currentMentorId,
  onClose,
  onRequestSubmitted
}) => {
  const [mentors, setMentors] = useState<MentorWithCapacity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMentor, setSelectedMentor] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadMentors();
  }, []);

  const loadMentors = async () => {
    try {
      setLoading(true);
      const allMentors = await MentorshipService.getAllMentorsWithCapacity();
      // Sort by available slots (descending)
      const sorted = allMentors.sort((a, b) => b.available_slots - a.available_slots);
      setMentors(sorted);
    } catch (err) {
      console.error('Error loading mentors:', err);
      setError('Failed to load mentors');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestMentor = async () => {
    if (!selectedMentor) {
      setError('Please select a mentor');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      
      await MentorshipService.requestMentorChange(
        currentStudentId,
        selectedMentor,
        currentMentorId,
        reason || undefined
      );

      setSuccess('Mentor change request submitted successfully! Waiting for admin approval.');
      
      // Wait a bit to show success message, then notify parent
      setTimeout(() => {
        onRequestSubmitted();
      }, 2000);
      
    } catch (err) {
      console.error('Error requesting mentor:', err);
      setError('Failed to submit mentor change request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Browse Mentors</h2>
            <p className="text-gray-600 mt-1">Select a mentor to request assignment</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        {/* Status Messages */}
        {success && (
          <div className="mx-6 mt-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center space-x-2">
            <CheckCircle className="h-5 w-5" />
            <span>{success}</span>
          </div>
        )}

        {error && (
          <div className="mx-6 mt-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg flex items-center space-x-2">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="h-8 w-8 text-primary-600 animate-spin" />
            </div>
          ) : mentors.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No mentors available</p>
            </div>
          ) : (
            <div className="space-y-4">
              {mentors.map((mentorInfo) => {
                const isCurrentMentor = mentorInfo.mentor.id === currentMentorId;
                const hasSlots = mentorInfo.available_slots > 0;
                const isSelected = selectedMentor === mentorInfo.mentor.id;

                return (
                  <div
                    key={mentorInfo.mentor.id}
                    className={`border rounded-lg p-4 transition-all ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50'
                        : isCurrentMentor
                        ? 'border-blue-300 bg-blue-50'
                        : hasSlots
                        ? 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 cursor-pointer'
                        : 'border-gray-200 bg-gray-50 opacity-60'
                    }`}
                    onClick={() => {
                      if (hasSlots && !isCurrentMentor) {
                        setSelectedMentor(mentorInfo.mentor.id);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {mentorInfo.mentor.name}
                          </h3>
                          {mentorInfo.mentor.isSuperMentor && (
                            <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                          )}
                          {isCurrentMentor && (
                            <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                              Current Mentor
                            </span>
                          )}
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-3">{mentorInfo.mentor.email}</p>
                        
                        {/* Capacity Info */}
                        <div className="flex items-center space-x-4 mb-3">
                          <div className="flex items-center space-x-2">
                            <Users className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-700">
                              {mentorInfo.current_mentees} / {
                                mentorInfo.mentor.isSuperMentor 
                                  ? 'Unlimited' 
                                  : mentorInfo.max_mentees
                              } mentees
                            </span>
                          </div>
                          
                          {hasSlots && (
                            <div className="flex items-center space-x-2">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <span className="text-sm text-green-700 font-medium">
                                {mentorInfo.mentor.isSuperMentor 
                                  ? 'Available' 
                                  : `${mentorInfo.available_slots} slot${mentorInfo.available_slots > 1 ? 's' : ''} available`
                                }
                              </span>
                            </div>
                          )}
                          
                          {!hasSlots && !mentorInfo.mentor.isSuperMentor && (
                            <div className="flex items-center space-x-2">
                              <AlertCircle className="h-4 w-4 text-orange-500" />
                              <span className="text-sm text-orange-700 font-medium">
                                No slots available
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Current Mentees */}
                        {mentorInfo.mentee_names.length > 0 && (
                          <div className="bg-white rounded p-3 border border-gray-200">
                            <p className="text-xs font-medium text-gray-600 mb-2">Current Mentees:</p>
                            <div className="flex flex-wrap gap-2">
                              {mentorInfo.mentee_names.map((name, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                                >
                                  {name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Selection Indicator */}
                      {isSelected && (
                        <div className="ml-4">
                          <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
                            <UserCheck className="h-5 w-5 text-white" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer with reason and submit */}
        {!success && (
          <div className="border-t border-gray-200 p-6 bg-gray-50">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for change (optional)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why you want to change your mentor..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              />
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                {selectedMentor 
                  ? 'Your request will be sent to admin for approval'
                  : 'Select a mentor with available slots to continue'}
              </p>
              
              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRequestMentor}
                  disabled={!selectedMentor || submitting}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {submitting ? (
                    <>
                      <Loader className="h-4 w-4 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <UserCheck className="h-4 w-4" />
                      <span>Submit Request</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MentorBrowser;
