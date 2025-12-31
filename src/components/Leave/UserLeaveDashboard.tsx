import React, { useState, useEffect } from 'react';
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle, Plus } from 'lucide-react';
import { LeaveManagementService } from '../../services/leaveManagementService';
import { Leave } from '../../types';
import LeaveRequestModal from './LeaveRequestModal';

interface UserLeaveDashboardProps {
  userId: string;
}

const UserLeaveDashboard: React.FC<UserLeaveDashboardProps> = ({ userId }) => {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [activeLeave, setActiveLeave] = useState<Leave | null>(null);
  const [pendingLeaves, setPendingLeaves] = useState<Leave[]>([]);
  const [upcomingLeaves, setUpcomingLeaves] = useState<Leave[]>([]);

  useEffect(() => {
    loadLeaves();
  }, [userId]);

  const loadLeaves = async () => {
    setLoading(true);
    try {
      const userLeaves = await LeaveManagementService.getUserLeaves(userId);
      setLeaves(userLeaves);

      // Find active leave (where today is between start and end date)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const active = userLeaves.find(leave => {
        if (leave.status !== 'approved') return false;
        
        const startDate = new Date(leave.start_date);
        const endDate = new Date(leave.end_date);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        
        return today >= startDate && today <= endDate;
      });
      setActiveLeave(active || null);

      // Find pending leaves
      const pending = userLeaves.filter(leave => leave.status === 'pending');
      setPendingLeaves(pending);

      // Find upcoming leaves (approved but not started yet)
      const upcoming = userLeaves.filter(leave => {
        if (leave.status !== 'approved') return false;
        
        const startDate = new Date(leave.start_date);
        startDate.setHours(0, 0, 0, 0);
        
        return startDate > today;
      });
      setUpcomingLeaves(upcoming);
    } catch (error) {
      console.error('Error loading leaves:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      approved: 'bg-green-100 text-green-800 border-green-200',
      rejected: 'bg-red-100 text-red-800 border-red-200',
      expired: 'bg-gray-100 text-gray-800 border-gray-200'
    };

    const icons = {
      pending: <Clock size={16} />,
      approved: <CheckCircle size={16} />,
      rejected: <XCircle size={16} />,
      expired: <AlertCircle size={16} />
    };

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${styles[status as keyof typeof styles]}`}>
        {icons[status as keyof typeof icons]}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getLeaveTypeLabel = (type: string) => {
    return type === 'kitchen_leave' ? 'Kitchen Leave' : 'On Leave';
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateRange = (start: Date, end: Date) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    if (startDate.toDateString() === endDate.toDateString()) {
      return formatDate(startDate);
    }
    
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  };

  const getDuration = (start: Date, end: Date) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return days === 1 ? '1 day' : `${days} days`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Leave Management</h2>
          <p className="text-sm text-gray-600 mt-1">Manage your kitchen leave and on leave requests</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          Request Leave
        </button>
      </div>

      {/* Active Leave Card */}
      {activeLeave && (
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-300 rounded-lg p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Active Leave</h3>
              <p className="text-sm text-gray-600 mt-1">{getLeaveTypeLabel(activeLeave.leave_type)}</p>
            </div>
            {getStatusBadge(activeLeave.status)}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <Calendar className="text-blue-600 mt-1" size={20} />
              <div>
                <div className="text-xs text-gray-600 mb-1">Duration</div>
                <div className="font-medium text-gray-900">{formatDateRange(activeLeave.start_date, activeLeave.end_date)}</div>
                <div className="text-xs text-gray-500 mt-1">{getDuration(activeLeave.start_date, activeLeave.end_date)}</div>
              </div>
            </div>
            
            {activeLeave.reason && (
              <div className="flex items-start gap-3">
                <AlertCircle className="text-blue-600 mt-1" size={20} />
                <div>
                  <div className="text-xs text-gray-600 mb-1">Reason</div>
                  <div className="text-sm text-gray-900">{activeLeave.reason}</div>
                </div>
              </div>
            )}
          </div>

          {activeLeave.status === 'pending' && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <Clock size={16} className="inline mr-1" />
                Your leave request is pending approval from admin or academic associate.
              </p>
            </div>
          )}

          {activeLeave.status === 'approved' && activeLeave.leave_type === 'kitchen_leave' && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <AlertCircle size={16} className="inline mr-1" />
                Your status will automatically change to active at 11:59 PM today.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Pending Leaves Section */}
      {pendingLeaves.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Clock className="text-yellow-600" size={20} />
              <h3 className="text-lg font-semibold text-gray-900">Pending Approval</h3>
              <span className="ml-auto bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                {pendingLeaves.length} {pendingLeaves.length === 1 ? 'request' : 'requests'}
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-1">Leave requests awaiting approval</p>
          </div>

          <div className="divide-y divide-gray-200">
            {pendingLeaves.map((leave) => (
              <div key={leave.id} className="p-6 bg-yellow-50/50">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-medium text-gray-900">{getLeaveTypeLabel(leave.leave_type)}</div>
                    <div className="text-sm text-gray-600 mt-1">{formatDateRange(leave.start_date, leave.end_date)}</div>
                  </div>
                  {getStatusBadge(leave.status)}
                </div>

                {leave.reason && (
                  <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
                    <div className="text-xs text-gray-600 mb-1">Reason</div>
                    <div className="text-sm text-gray-900">{leave.reason}</div>
                  </div>
                )}

                <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                  <span>Duration: {getDuration(leave.start_date, leave.end_date)}</span>
                  <span>•</span>
                  <span>Requested on {formatDate(leave.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Leaves Section */}
      {upcomingLeaves.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Calendar className="text-blue-600" size={20} />
              <h3 className="text-lg font-semibold text-gray-900">Upcoming Leaves</h3>
              <span className="ml-auto bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                {upcomingLeaves.length} {upcomingLeaves.length === 1 ? 'leave' : 'leaves'}
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-1">Approved leaves starting in the future</p>
          </div>

          <div className="divide-y divide-gray-200">
            {upcomingLeaves.map((leave) => (
              <div key={leave.id} className="p-6 bg-blue-50/30">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-medium text-gray-900">{getLeaveTypeLabel(leave.leave_type)}</div>
                    <div className="text-sm text-gray-600 mt-1">{formatDateRange(leave.start_date, leave.end_date)}</div>
                  </div>
                  {getStatusBadge(leave.status)}
                </div>

                {leave.reason && (
                  <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
                    <div className="text-xs text-gray-600 mb-1">Reason</div>
                    <div className="text-sm text-gray-900">{leave.reason}</div>
                  </div>
                )}

                {leave.approved_by_name && (
                  <div className="mt-3 text-sm text-gray-600">
                    <CheckCircle size={14} className="inline mr-1 text-green-600" />
                    Approved by {leave.approved_by_name} on {formatDate(leave.approved_at!)}
                  </div>
                )}

                <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                  <span>Duration: {getDuration(leave.start_date, leave.end_date)}</span>
                  <span>•</span>
                  <span>Starts {formatDate(leave.start_date)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Leave History */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Leave History</h3>
          <p className="text-sm text-gray-600 mt-1">View all your past leave requests</p>
        </div>

        {leaves.length === 0 ? (
          <div className="p-8 text-center">
            <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">No leave requests yet</p>
            <p className="text-sm text-gray-500 mt-2">Click "Request Leave" to apply for your first leave</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {leaves.map((leave) => (
              <div key={leave.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-medium text-gray-900">{getLeaveTypeLabel(leave.leave_type)}</div>
                    <div className="text-sm text-gray-600 mt-1">{formatDateRange(leave.start_date, leave.end_date)}</div>
                  </div>
                  {getStatusBadge(leave.status)}
                </div>

                {leave.reason && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <div className="text-xs text-gray-600 mb-1">Reason</div>
                    <div className="text-sm text-gray-900">{leave.reason}</div>
                  </div>
                )}

                {leave.status === 'approved' && leave.approved_by_name && (
                  <div className="mt-3 text-sm text-gray-600">
                    <CheckCircle size={14} className="inline mr-1 text-green-600" />
                    Approved by {leave.approved_by_name} on {formatDate(leave.approved_at!)}
                  </div>
                )}

                {leave.status === 'rejected' && (
                  <div className="mt-3">
                    <div className="text-sm text-gray-600 mb-2">
                      <XCircle size={14} className="inline mr-1 text-red-600" />
                      Rejected by {leave.rejected_by_name} on {formatDate(leave.rejected_at!)}
                    </div>
                    {leave.rejection_reason && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="text-xs text-red-600 mb-1">Rejection Reason</div>
                        <div className="text-sm text-red-900">{leave.rejection_reason}</div>
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                  <span>Duration: {getDuration(leave.start_date, leave.end_date)}</span>
                  <span>•</span>
                  <span>Requested on {formatDate(leave.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Leave Request Modal */}
      <LeaveRequestModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        userId={userId}
        onSuccess={() => {
          loadLeaves();
        }}
      />
    </div>
  );
};

export default UserLeaveDashboard;
