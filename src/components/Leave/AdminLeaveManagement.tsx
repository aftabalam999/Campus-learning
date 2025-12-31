import React, { useState, useEffect } from 'react';
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle, User, Filter } from 'lucide-react';
import { LeaveManagementService } from '../../services/leaveManagementService';
import { Leave } from '../../types';

interface AdminLeaveManagementProps {
  adminId: string;
  adminName: string;
}

const AdminLeaveManagement: React.FC<AdminLeaveManagementProps> = ({ adminId, adminName }) => {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'expired'>('pending');
  const [selectedLeave, setSelectedLeave] = useState<Leave | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadLeaves();
  }, []);

  const loadLeaves = async () => {
    setLoading(true);
    try {
      const allLeaves = await LeaveManagementService.getAllLeaves();
      setLeaves(allLeaves);
    } catch (error) {
      console.error('Error loading leaves:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (leave: Leave) => {
    if (!window.confirm(`Approve leave request for ${leave.user_name}?`)) {
      return;
    }

    setActionLoading(true);
    try {
      await LeaveManagementService.approveLeave(leave.id, adminId, adminName);
      await loadLeaves();
      alert('Leave request approved successfully!');
    } catch (error: any) {
      console.error('Error approving leave:', error);
      alert('Failed to approve leave: ' + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectClick = (leave: Leave) => {
    setSelectedLeave(leave);
    setShowRejectModal(true);
  };

  const handleRejectConfirm = async () => {
    if (!selectedLeave) return;

    setActionLoading(true);
    try {
      await LeaveManagementService.rejectLeave(
        selectedLeave.id,
        adminId,
        adminName,
        rejectionReason || 'No reason provided'
      );
      await loadLeaves();
      setShowRejectModal(false);
      setSelectedLeave(null);
      setRejectionReason('');
      alert('Leave request rejected successfully!');
    } catch (error: any) {
      console.error('Error rejecting leave:', error);
      alert('Failed to reject leave: ' + error.message);
    } finally {
      setActionLoading(false);
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

  const getLeaveTypeBadge = (type: string) => {
    const isKitchen = type === 'kitchen_leave';
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
        isKitchen ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
      }`}>
        {getLeaveTypeLabel(type)}
      </span>
    );
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

  const filteredLeaves = leaves.filter(leave => {
    if (filter === 'all') return true;
    return leave.status === filter;
  });

  const pendingCount = leaves.filter(l => l.status === 'pending').length;

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
          <p className="text-sm text-gray-600 mt-1">Manage all leave requests from users</p>
        </div>
        {pendingCount > 0 && (
          <div className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-lg font-medium">
            {pendingCount} Pending {pendingCount === 1 ? 'Request' : 'Requests'}
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-lg border border-gray-200 p-2">
        <div className="flex items-center gap-2">
          <Filter size={20} className="text-gray-400 ml-2" />
          {(['all', 'pending', 'approved', 'rejected', 'expired'] as const).map((tab) => {
            const count = tab === 'all' ? leaves.length : leaves.filter(l => l.status === tab).length;
            return (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === tab
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                <span className={`ml-2 ${filter === tab ? 'text-blue-200' : 'text-gray-400'}`}>
                  ({count})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Leave Requests List */}
      <div className="bg-white rounded-lg border border-gray-200">
        {filteredLeaves.length === 0 ? (
          <div className="p-8 text-center">
            <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">No {filter !== 'all' && filter} leave requests found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredLeaves.map((leave) => (
              <div key={leave.id} className="p-6 hover:bg-gray-50 transition-colors">
                {/* Header Row */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <User size={24} className="text-blue-600" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{leave.user_name}</div>
                      <div className="text-sm text-gray-600">{leave.user_email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getLeaveTypeBadge(leave.leave_type)}
                    {getStatusBadge(leave.status)}
                  </div>
                </div>

                {/* Leave Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="flex items-start gap-3">
                    <Calendar className="text-gray-400 mt-1" size={20} />
                    <div>
                      <div className="text-xs text-gray-600 mb-1">Duration</div>
                      <div className="font-medium text-gray-900">{formatDateRange(leave.start_date, leave.end_date)}</div>
                      <div className="text-xs text-gray-500 mt-1">{getDuration(leave.start_date, leave.end_date)}</div>
                    </div>
                  </div>

                  {leave.reason && (
                    <div className="flex items-start gap-3">
                      <AlertCircle className="text-gray-400 mt-1" size={20} />
                      <div>
                        <div className="text-xs text-gray-600 mb-1">Reason</div>
                        <div className="text-sm text-gray-900">{leave.reason}</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Status Information */}
                {leave.status === 'approved' && leave.approved_by_name && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
                    <CheckCircle size={16} className="inline mr-1" />
                    Approved by {leave.approved_by_name} on {formatDate(leave.approved_at!)}
                  </div>
                )}

                {leave.status === 'rejected' && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="text-sm text-red-800 mb-2">
                      <XCircle size={16} className="inline mr-1" />
                      Rejected by {leave.rejected_by_name} on {formatDate(leave.rejected_at!)}
                    </div>
                    {leave.rejection_reason && (
                      <div className="text-xs text-red-700 ml-5">
                        Reason: {leave.rejection_reason}
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                {leave.status === 'pending' && (
                  <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => handleApprove(leave)}
                      disabled={actionLoading}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      <CheckCircle size={18} />
                      Approve
                    </button>
                    <button
                      onClick={() => handleRejectClick(leave)}
                      disabled={actionLoading}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      <XCircle size={18} />
                      Reject
                    </button>
                  </div>
                )}

                {/* Metadata */}
                <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                  <span>Requested on {formatDate(leave.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && selectedLeave && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">Reject Leave Request</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">User: <strong>{selectedLeave.user_name}</strong></p>
                <p className="text-sm text-gray-600">Duration: <strong>{formatDateRange(selectedLeave.start_date, selectedLeave.end_date)}</strong></p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rejection Reason (Optional)
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Provide a reason for rejection..."
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedLeave(null);
                  setRejectionReason('');
                }}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectConfirm}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLeaveManagement;
