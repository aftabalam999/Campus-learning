import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import UserLeaveDashboard from './UserLeaveDashboard';

const UserLeaveWrapper: React.FC = () => {
  const { userData } = useAuth();

  if (!userData) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-600">Loading user data...</div>
      </div>
    );
  }

  return <UserLeaveDashboard userId={userData.id} />;
};

export default UserLeaveWrapper;
