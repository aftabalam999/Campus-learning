import React, { useState } from 'react';
import { X, Calendar, AlertCircle } from 'lucide-react';
import { LeaveManagementService } from '../../services/leaveManagementService';

interface LeaveRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onSuccess: () => void;
}

const LeaveRequestModal: React.FC<LeaveRequestModalProps> = ({
  isOpen,
  onClose,
  userId,
  onSuccess
}) => {
  const [leaveType, setLeaveType] = useState<'kitchen_leave' | 'on_leave'>('kitchen_leave');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleLeaveTypeChange = (type: 'kitchen_leave' | 'on_leave') => {
    setLeaveType(type);
    setReason('');
    setError('');
    
    // Reset dates when switching types
    if (type === 'kitchen_leave') {
      setEndDate(startDate);
    }
  };

  const handleStartDateChange = (date: string) => {
    setStartDate(date);
    if (leaveType === 'kitchen_leave') {
      setEndDate(date); // Automatically set end date same as start for kitchen leave
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!startDate) {
      setError('Please select start date');
      return;
    }

    if (leaveType === 'on_leave' && !endDate) {
      setError('Please select end date');
      return;
    }

    if (leaveType === 'on_leave' && !reason.trim()) {
      setError('Reason is mandatory for on leave');
      return;
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate || startDate);
    
    if (end < start) {
      setError('End date cannot be before start date');
      return;
    }

    // Show confirmation dialog
    setShowConfirmation(true);
  };

  const handleConfirm = async () => {
    setLoading(true);
    setError('');

    try {
      const start = new Date(startDate);
      const end = new Date(endDate || startDate);
      
      await LeaveManagementService.createLeaveRequest(
        userId,
        leaveType,
        start,
        end,
        reason || undefined
      );

      // Success
      setShowConfirmation(false);
      onSuccess();
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit leave request');
      setShowConfirmation(false);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setLeaveType('kitchen_leave');
    setStartDate('');
    setEndDate('');
    setReason('');
    setError('');
    setShowConfirmation(false);
    onClose();
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Request Leave
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Confirmation Dialog */}
        {showConfirmation && (
          <div className="absolute inset-0 bg-white bg-opacity-95 flex items-center justify-center p-6 rounded-lg">
            <div className="bg-white border-2 border-blue-500 rounded-lg p-6 max-w-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Confirm Leave Request
              </h3>
              <div className="space-y-2 mb-6 text-sm text-gray-700">
                <p><strong>Leave Type:</strong> {leaveType === 'kitchen_leave' ? 'Kitchen Leave' : 'On Leave'}</p>
                <p><strong>Start Date:</strong> {formatDate(startDate)}</p>
                <p><strong>End Date:</strong> {formatDate(endDate || startDate)}</p>
                {reason && <p><strong>Reason:</strong> {reason}</p>}
                <p className="text-blue-600 mt-4">
                  <AlertCircle size={16} className="inline mr-1" />
                  Your request requires approval from admin or academic associate
                </p>
                {leaveType === 'kitchen_leave' && (
                  <p className="text-amber-600 mt-2">
                    <AlertCircle size={16} className="inline mr-1" />
                    Once approved, your status will automatically change to active at 11:59 PM
                  </p>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmation(false)}
                  disabled={loading}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Submitting...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2">
              <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Leave Type Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Leave Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleLeaveTypeChange('kitchen_leave')}
                className={`p-4 border-2 rounded-lg transition-all ${
                  leaveType === 'kitchen_leave'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="font-semibold">Kitchen Leave</div>
                <div className="text-xs mt-1 opacity-75">Single day, needs approval</div>
              </button>
              <button
                type="button"
                onClick={() => handleLeaveTypeChange('on_leave')}
                className={`p-4 border-2 rounded-lg transition-all ${
                  leaveType === 'on_leave'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="font-semibold">On Leave</div>
                <div className="text-xs mt-1 opacity-75">Range, needs approval</div>
              </button>
            </div>
          </div>

          {/* Start Date */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {leaveType === 'kitchen_leave' ? 'Date' : 'Start Date'}
            </label>
            <div className="relative">
              <input
                type="date"
                value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
            </div>
          </div>

          {/* End Date (only for on_leave) */}
          {leaveType === 'on_leave' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                End Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate || new Date().toISOString().split('T')[0]}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
              </div>
            </div>
          )}

          {/* Reason (mandatory for on_leave) */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Reason {leaveType === 'on_leave' && <span className="text-red-500">*</span>}
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required={leaveType === 'on_leave'}
              placeholder={leaveType === 'on_leave' ? 'Please provide a reason for your leave...' : 'Optional'}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Info Box */}
          <div className={`p-4 rounded-lg ${
            leaveType === 'kitchen_leave' ? 'bg-amber-50 border border-amber-200' : 'bg-blue-50 border border-blue-200'
          }`}>
            <h4 className="font-semibold text-sm mb-2">
              {leaveType === 'kitchen_leave' ? 'Kitchen Leave Info' : 'On Leave Info'}
            </h4>
            <ul className="text-xs space-y-1 text-gray-700">
              {leaveType === 'kitchen_leave' ? (
                <>
                  <li>• Can only be selected for one day</li>
                  <li>• Requires approval from admin or academic associate</li>
                  <li>• Once approved, automatically ends at 11:59 PM</li>
                  <li>• Apply again for next day if needed</li>
                </>
              ) : (
                <>
                  <li>• Can select a date range</li>
                  <li>• Requires approval from admin or academic associate</li>
                  <li>• Reason is mandatory</li>
                  <li>• You'll be notified when leave expires</li>
                </>
              )}
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              Submit Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LeaveRequestModal;
