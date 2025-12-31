import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import AdminLeaveManagement from './AdminLeaveManagement';

const AdminLeaveWrapper: React.FC = () => {
  const { userData } = useAuth();

  if (!userData) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-600">Loading user data...</div>
      </div>
    );
  }

  // Check if user has admin or academic associate role
  if (userData.role !== 'admin' && userData.role !== 'academic_associate') {
    return <Navigate to="/unauthorized" replace />;
  }

  return (
    <AdminLeaveManagement 
      adminId={userData.id} 
      adminName={userData.name || userData.display_name || 'Admin'} 
    />
  );
};

export default AdminLeaveWrapper;
