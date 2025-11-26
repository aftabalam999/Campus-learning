import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import CampusJoiningDateModal from './CampusJoiningDateModal';
import { AlertCircle, LogOut } from 'lucide-react';


interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  redirectTo?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAdmin = false,
  redirectTo = '/login'
}) => {
  const { currentUser, userData, loading, loadingError, setUserData, signOut } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Show error message if loading failed and offer re-login
  if (loadingError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
          <div className="flex items-center space-x-3 mb-4">
            <AlertCircle className="h-8 w-8 text-red-600" />
            <h2 className="text-lg font-semibold text-gray-900">Authentication Error</h2>
          </div>
          <p className="text-gray-600 mb-6">{loadingError}</p>
          <button
            onClick={async () => {
              try {
                await signOut();
              } catch (error) {
                console.error('Error signing out:', error);
              }
            }}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 font-medium"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign In Again</span>
          </button>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!currentUser || !userData) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Check admin access if required
  if (requireAdmin && !userData.isAdmin && userData.role !== 'academic_associate') {
    return <Navigate to="/unauthorized" replace />;
  }

    // If user hasn't set campus joining date and is not admin, force them to fill it before entering
    if (!userData.campus_joining_date && !userData.isAdmin) {
      return (
        <>
          <CampusJoiningDateModal
            isOpen={true}
            user={userData}
            // Do not allow skipping when required by ProtectedRoute
            requireFill={true}
            onClose={() => {
              // no-op when required
            }}
            onDateUpdated={(updatedUser) => {
              // Update auth context with the filled date so ProtectedRoute will render children afterwards
              setUserData(updatedUser);
            }}
          />
        </>
      );
    }

  return <>{children}</>;
};

export default ProtectedRoute;