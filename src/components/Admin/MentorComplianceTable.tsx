import React, { useState, useEffect } from 'react';
import {
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Send,
  User
} from 'lucide-react';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { getCurrentWeekStart, getReviewDeadline, getDaysOverdue } from '../../utils/reviewDateUtils';

interface MentorData {
  id: string;
  name: string;
  email: string;
  campus: string;
  house: string;
  mentees: string[];
  reviewedCount: number;
  pendingCount: number;
  overdueCount: number;
  daysOverdue: number;
  status: 'completed' | 'pending' | 'overdue';
  menteeDetails?: MenteeDetail[];
}

interface MenteeDetail {
  id: string;
  name: string;
  reviewed: boolean;
  daysOverdue?: number;
}

interface Props {
  filters?: {
    campus: string;
    house: string;
    dateRange: string;
  };
  onSelectionChange?: (selectedIds: string[]) => void;
}

const MentorComplianceTable: React.FC<Props> = ({ filters, onSelectionChange }) => {
  const [mentors, setMentors] = useState<MentorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'name' | 'overdue' | 'completion'>('overdue');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');


  const loadMentorData = async () => {
    setLoading(true);
    try {
      // Get current week info
      const weekStart = getCurrentWeekStart();
      const deadline = getReviewDeadline(weekStart);
      const currentDaysOverdue = getDaysOverdue(deadline);

      // Fetch all mentors
      const usersRef = collection(db, 'users');
      let mentorsQuery = query(usersRef, where('role', '==', 'mentor'));

      if (filters?.campus && filters.campus !== 'all') {
        mentorsQuery = query(mentorsQuery, where('campus', '==', filters.campus));
      }

      const mentorsSnapshot = await getDocs(mentorsQuery);
      const mentorDataList: MentorData[] = [];

      for (const mentorDoc of mentorsSnapshot.docs) {
        const mentor = mentorDoc.data();
        const menteeIds = mentor.mentees || [];

        // Fetch mentee names
        const menteeDetails: MenteeDetail[] = [];
        let reviewedCount = 0;

        for (const menteeId of menteeIds) {
          // Get mentee info
          const menteeDoc = await getDocs(query(
            collection(db, 'users'),
            where('__name__', '==', menteeId)
          ));

          const menteeName = menteeDoc.docs[0]?.data()?.name || 'Unknown';

          // Check if mentor reviewed this mentee this week
          const reviewsRef = collection(db, 'mentee_reviews');
          const reviewQuery = query(
            reviewsRef,
            where('reviewer_id', '==', mentorDoc.id),
            where('reviewee_id', '==', menteeId),
            where('week_start', '==', weekStart)
          );
          const reviewSnapshot = await getDocs(reviewQuery);
          const reviewed = reviewSnapshot.size > 0;

          if (reviewed) {
            reviewedCount++;
          }

          menteeDetails.push({
            id: menteeId,
            name: menteeName,
            reviewed,
            daysOverdue: reviewed ? undefined : currentDaysOverdue
          });
        }

        const totalMentees = menteeIds.length;
        const pendingCount = totalMentees - reviewedCount;
        const overdueCount = currentDaysOverdue > 0 ? pendingCount : 0;

        let status: 'completed' | 'pending' | 'overdue' = 'completed';
        if (overdueCount > 0) {
          status = 'overdue';
        } else if (pendingCount > 0) {
          status = 'pending';
        }

        mentorDataList.push({
          id: mentorDoc.id,
          name: mentor.name || 'Unknown',
          email: mentor.email || '',
          campus: mentor.campus || 'Unknown',
          house: mentor.house || 'Unknown',
          mentees: menteeIds,
          reviewedCount,
          pendingCount,
          overdueCount,
          daysOverdue: currentDaysOverdue,
          status,
          menteeDetails
        });
      }

      // Sort mentors
      const sorted = sortMentors(mentorDataList, sortBy, sortOrder);
      setMentors(sorted);

    } catch (error) {
      console.error('Error loading mentor data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMentorData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const sortMentors = (
    data: MentorData[],
    by: 'name' | 'overdue' | 'completion',
    order: 'asc' | 'desc'
  ): MentorData[] => {
    const sorted = [...data].sort((a, b) => {
      let comparison = 0;

      switch (by) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'overdue':
          comparison = a.overdueCount - b.overdueCount;
          break;
        case 'completion':
          const aRate = a.mentees.length > 0 ? a.reviewedCount / a.mentees.length : 0;
          const bRate = b.mentees.length > 0 ? b.reviewedCount / b.mentees.length : 0;
          comparison = aRate - bRate;
          break;
      }

      return order === 'asc' ? comparison : -comparison;
    });

    return sorted;
  };

  const handleSort = (by: 'name' | 'overdue' | 'completion') => {
    if (sortBy === by) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(by);
      setSortOrder('desc');
    }
  };

  const toggleRowExpansion = (mentorId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(mentorId)) {
      newExpanded.delete(mentorId);
    } else {
      newExpanded.add(mentorId);
    }
    setExpandedRows(newExpanded);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 flex items-center">
            <CheckCircle className="h-3 w-3 mr-1" />
            Complete
          </span>
        );
      case 'pending':
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 flex items-center">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </span>
        );
      case 'overdue':
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 flex items-center">
            <AlertCircle className="h-3 w-3 mr-1" />
            Overdue
          </span>
        );
      default:
        return null;
    }
  };

  const getRowColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50';
      case 'pending':
        return 'bg-yellow-50';
      case 'overdue':
        return 'bg-red-50';
      default:
        return 'bg-white';
    }
  };

  const handleSendReminder = (mentorId: string) => {
    // TODO: Integrate with ReviewReminderService
    alert(`Reminder will be sent to mentor ${mentorId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Mentor Compliance</h3>
        <p className="text-sm text-gray-600 mt-1">
          {mentors.length} mentor{mentors.length !== 1 ? 's' : ''} found
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                {/* Expand icon column */}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center">
                  Mentor Name
                  {sortBy === 'name' && (
                    sortOrder === 'asc' ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />
                  )}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Campus
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                # Mentees
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('completion')}
              >
                <div className="flex items-center">
                  Reviewed
                  {sortBy === 'completion' && (
                    sortOrder === 'asc' ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />
                  )}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Pending
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('overdue')}
              >
                <div className="flex items-center">
                  Overdue
                  {sortBy === 'overdue' && (
                    sortOrder === 'asc' ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />
                  )}
                </div>
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {mentors.map((mentor) => (
              <React.Fragment key={mentor.id}>
                {/* Main Row */}
                <tr className={`${getRowColor(mentor.status)} hover:bg-opacity-75 transition-colors`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {mentor.mentees.length > 0 && (
                      <button
                        onClick={() => toggleRowExpansion(mentor.id)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        {expandedRows.has(mentor.id) ? (
                          <ChevronUp className="h-5 w-5" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(mentor.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{mentor.name}</div>
                    <div className="text-sm text-gray-500">{mentor.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {mentor.campus}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {mentor.mentees.length}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-semibold text-green-600">
                      {mentor.reviewedCount}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-semibold text-yellow-600">
                      {mentor.pendingCount}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <span className="text-sm font-semibold text-red-600">
                        {mentor.overdueCount}
                      </span>
                      {mentor.overdueCount > 0 && (
                        <span className="text-xs text-red-500 ml-1">
                          ({mentor.daysOverdue}d)
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {mentor.status !== 'completed' && (
                      <button
                        onClick={() => handleSendReminder(mentor.id)}
                        className="text-purple-600 hover:text-purple-900 flex items-center ml-auto"
                      >
                        <Send className="h-4 w-4 mr-1" />
                        Remind
                      </button>
                    )}
                  </td>
                </tr>

                {/* Expanded Row - Mentee Details */}
                {expandedRows.has(mentor.id) && mentor.menteeDetails && (
                  <tr>
                    <td colSpan={9} className="px-6 py-4 bg-gray-50">
                      <div className="ml-8">
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">
                          Mentee Details
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {mentor.menteeDetails.map((mentee) => (
                            <div
                              key={mentee.id}
                              className={`p-3 rounded-lg border ${mentee.reviewed
                                  ? 'bg-green-50 border-green-200'
                                  : 'bg-red-50 border-red-200'
                                }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <User className="h-4 w-4 mr-2 text-gray-600" />
                                  <span className="text-sm font-medium text-gray-900">
                                    {mentee.name}
                                  </span>
                                </div>
                                {mentee.reviewed ? (
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                ) : (
                                  <div className="flex items-center">
                                    <AlertCircle className="h-4 w-4 text-red-600" />
                                    {mentee.daysOverdue && mentee.daysOverdue > 0 && (
                                      <span className="text-xs text-red-600 ml-1">
                                        {mentee.daysOverdue}d
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {mentors.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No mentors found matching the current filters.</p>
        </div>
      )}
    </div>
  );
};

export default MentorComplianceTable;
