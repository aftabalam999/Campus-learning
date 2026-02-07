import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { signInWithGoogle, currentUser, userData, impersonateUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  // Simple redirect when user is logged in
  useEffect(() => {
    if (currentUser && userData) {
      console.log('✅ User logged in, redirecting to:', from);
      navigate(from, { replace: true });
    }
  }, [currentUser, userData, navigate, from]);

  const handleGoogleSignIn = async () => {
    try {
      setError('');
      setLoading(true);

      await signInWithGoogle();
      // AuthContext will handle loading user data and the useEffect above will redirect
    } catch (error: any) {
      console.error('Sign in error:', error);
      setLoading(false);

      // Handle specific error cases
      if (error.message?.includes('Access denied')) {
        setError(error.message);
      } else if (error.code === 'auth/popup-closed-by-user') {
        setError('Sign-in cancelled. Please try again.');
      } else if (error.code === 'auth/network-request-failed') {
        setError('Network error. Please check your connection.');
      } else if (error.message === 'Redirect initiated') {
        setError('Redirecting to Google...');
      } else {
        setError('Failed to sign in. Please try again.');
      }
    }
  };

  // Show loading state while signing in or waiting for user data
  if (loading || (currentUser && !userData)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            {currentUser ? 'Loading your profile...' : 'Signing in...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-24 w-24 flex items-center justify-center">
            <img
              src="/logo.png"
              alt="Campus Learning"
              className="h-24 w-24 object-contain"
            />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Campus Learning Dashboard
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to access your learning journey
          </p>
        </div>

        {/* Domain Restriction Notice */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Navgurukul Access Only
              </h3>
              <div className="mt-1 text-sm text-blue-700">
                <p>Only users with <strong>@navgurukul.org</strong> email addresses can access this platform.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8">
          {error && (
            <div className="rounded-md bg-red-50 p-4 mb-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="group relative w-full flex justify-center items-center py-3 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors"
          >
            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {loading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600 mr-2"></div>
                Signing in...
              </div>
            ) : (
              'Continue with Google'
            )}
          </button>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              By signing in, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>

        {/* Demo Accounts - Only visible in development */}
        {(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && (
          <div className="hidden lg:block ml-8 w-80 bg-white p-6 rounded-lg shadow-lg border border-gray-200 overflow-y-auto max-h-[80vh]">
            <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Demo Accounts</h3>
            <p className="text-xs text-gray-500 mb-4">Click any account to quick login (Dev only)</p>

            <div className="space-y-6">
              {/* Admin */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wider">Admin</h4>
                <button
                  onClick={() => impersonateUser?.('admin@navgurukul.org')}
                  className="w-full text-left bg-purple-50 hover:bg-purple-100 p-3 rounded-md transition-colors border border-purple-100 group"
                >
                  <div className="font-medium text-purple-900">System Admin</div>
                  <div className="text-xs text-purple-600">admin@navgurukul.org</div>
                </button>
              </div>

              {/* Mentors */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wider">Mentors</h4>
                <div className="space-y-2">
                  <button
                    onClick={() => impersonateUser?.('rahul.mentor@navgurukul.org')}
                    className="w-full text-left bg-blue-50 hover:bg-blue-100 p-3 rounded-md transition-colors border border-blue-100"
                  >
                    <div className="font-medium text-blue-900">Rahul Mentor</div>
                    <div className="text-xs text-blue-600">rahul.mentor@navgurukul.org</div>
                  </button>
                  <button
                    onClick={() => impersonateUser?.('priya.mentor@navgurukul.org')}
                    className="w-full text-left bg-blue-50 hover:bg-blue-100 p-3 rounded-md transition-colors border border-blue-100"
                  >
                    <div className="font-medium text-blue-900">Priya Mentor</div>
                    <div className="text-xs text-blue-600">priya.mentor@navgurukul.org</div>
                  </button>
                </div>
              </div>

              {/* Students */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wider">Students</h4>
                <div className="space-y-2">
                  {[
                    { name: 'Amit Student', email: 'amit.student@navgurukul.org' },
                    { name: 'Neha Student', email: 'neha.student@navgurukul.org' },
                    { name: 'Rohan Student', email: 'rohan.student@navgurukul.org' },
                    { name: 'Sneha Student', email: 'sneha.student@navgurukul.org' },
                    { name: 'Vikram Student', email: 'vikram.student@navgurukul.org' }
                  ].map((student) => (
                    <button
                      key={student.email}
                      onClick={() => impersonateUser?.(student.email)}
                      className="w-full text-left bg-green-50 hover:bg-green-100 p-3 rounded-md transition-colors border border-green-100"
                    >
                      <div className="font-medium text-green-900">{student.name}</div>
                      <div className="text-xs text-green-600">{student.email}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400 text-center">
                These accounts are generated by the user seeding service.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;