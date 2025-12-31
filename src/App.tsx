import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { DataCacheProvider } from './contexts/DataCacheContext';
import { ClientReminderScheduler } from './services/clientReminderScheduler';
import { AttendanceScheduler } from './services/attendanceScheduler';
import { LeaveScheduler } from './services/leaveScheduler';

// Common Components
import ProtectedRoute from './components/Common/ProtectedRoute';
import Layout from './components/Common/Layout';
import Login from './components/Common/Login';
import Dashboard from './components/Common/Dashboard';

// Student Components
import StudentDashboard from './components/Student/StudentDashboard';
import GoalSetting from './components/Student/GoalSetting';
import ReflectionSubmission from './components/Student/ReflectionSubmission';
import StudentJourney from './components/Student/StudentJourney';
import CalendarAuth from './components/Student/CalendarAuth';
import MenteeSlotBooking from './components/Student/MenteeSlotBooking';

// Mentor Components
import MentorDashboard from './components/Mentor/MentorDashboard';
import MentorMenteeReview from './components/Mentor/MentorMenteeReview';
import PairProgrammingManagement from './components/Mentor/PairProgrammingManagement';

// Review Page
import ReviewsPage from './pages/ReviewsPage';

// Pair Programming Components
import PairProgrammingDashboard from './components/PairProgramming/PairProgrammingDashboard';
import CalendarView from './components/PairProgramming/CalendarView';
import Leaderboard from './components/PairProgramming/Leaderboard';

// Admin Components
import AdminDashboard from './components/Admin/AdminDashboard';

// Leave Management Components
import UserLeaveWrapper from './components/Leave/UserLeaveWrapper';
import AdminLeaveWrapper from './components/Leave/AdminLeaveWrapper';

// Error Components
const Unauthorized = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">401</h1>
      <p className="text-xl text-gray-600 mb-4">Unauthorized Access</p>
      <p className="text-gray-500">You don't have permission to access this page.</p>
    </div>
  </div>
);

const NotFound = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
      <p className="text-xl text-gray-600 mb-4">Page Not Found</p>
      <p className="text-gray-500">The page you're looking for doesn't exist.</p>
    </div>
  </div>
);

function App() {
  // Initialize the client-side reminder scheduler, attendance scheduler, and leave scheduler
  useEffect(() => {
    console.log('[App] Initializing review reminder scheduler...');
    const scheduler = ClientReminderScheduler.getInstance();
    scheduler.start();
    
    console.log('[App] Initializing attendance scheduler...');
    AttendanceScheduler.startScheduler();
    
    console.log('[App] Initializing leave scheduler...');
    LeaveScheduler.start();
    
    return () => {
      // Cleanup schedulers
      console.log('[App] App unmounting, stopping schedulers...');
      AttendanceScheduler.stopScheduler();
      LeaveScheduler.stop();
    };
  }, []);

  return (
    <Router>
      <AuthProvider>
        <DataCacheProvider>
          <div className="App">
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/unauthorized" element={<Unauthorized />} />
            
            {/* Protected Routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <Layout>
                  <Navigate to="/dashboard" replace />
                </Layout>
              </ProtectedRoute>
            } />
            
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />

            {/* Student Routes */}
            <Route path="/student/dashboard" element={
              <ProtectedRoute>
                <Layout>
                  <StudentDashboard />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/calendar-auth" element={
              <ProtectedRoute>
                <CalendarAuth />
              </ProtectedRoute>
            } />

            <Route path="/goals" element={
              <ProtectedRoute>
                <Layout>
                  <GoalSetting />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/goal-setting" element={
              <ProtectedRoute>
                <Layout>
                  <GoalSetting />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/reflection" element={
              <ProtectedRoute>
                <Layout>
                  <ReflectionSubmission />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/student/book-session" element={
              <ProtectedRoute>
                <Layout>
                  <MenteeSlotBooking />
                </Layout>
              </ProtectedRoute>
            } />

            {/* Reviews Route - Dedicated page for all review functionality */}
            <Route path="/reviews" element={
              <ProtectedRoute>
                <Layout>
                  <ReviewsPage />
                </Layout>
              </ProtectedRoute>
            } />

            {/* Mentor Routes */}
            <Route path="/mentor/dashboard" element={
              <ProtectedRoute>
                <Layout>
                  <MentorDashboard />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/mentor/mentee/:studentId" element={
              <ProtectedRoute>
                <Layout>
                  <MentorMenteeReview />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/mentor/review/:studentId" element={
              <ProtectedRoute>
                <Layout>
                  <MentorMenteeReview />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/mentor/pair-programming" element={
              <ProtectedRoute>
                <Layout>
                  <PairProgrammingManagement />
                </Layout>
              </ProtectedRoute>
            } />

            {/* Pair Programming Routes */}
            <Route path="/pair-programming/dashboard" element={
              <ProtectedRoute>
                <Layout>
                  <PairProgrammingDashboard />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/pair-programming/calendar" element={
              <ProtectedRoute>
                <Layout>
                  <CalendarView />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/pair-programming/leaderboard" element={
              <ProtectedRoute>
                <Layout>
                  <Leaderboard />
                </Layout>
              </ProtectedRoute>
            } />

            {/* Admin Routes */}
            <Route path="/admin/dashboard" element={
              <ProtectedRoute requireAdmin={true}>
                <AdminDashboard />
              </ProtectedRoute>
            } />

            {/* Leave Management Routes */}
            <Route path="/leave" element={
              <ProtectedRoute>
                <Layout>
                  <UserLeaveWrapper />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/admin/leave-management" element={
              <ProtectedRoute requireAdmin={true}>
                <Layout>
                  <AdminLeaveWrapper />
                </Layout>
              </ProtectedRoute>
            } />

            {/* Legacy Routes Redirects */}
            <Route path="/mentees" element={
              <ProtectedRoute>
                <Layout>
                  <div className="text-center py-12">
                    <h2 className="text-2xl font-bold text-gray-900">Redirecting...</h2>
                    <p className="text-gray-600 mt-2">Please use /mentor/dashboard</p>
                  </div>
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/pair-programming" element={
              <ProtectedRoute>
                <Layout>
                  <div className="text-center py-12">
                    <h2 className="text-2xl font-bold text-gray-900">Pair Programming</h2>
                    <p className="text-gray-600 mt-2">Please use /mentor/pair-programming</p>
                  </div>
                </Layout>
              </ProtectedRoute>
            } />

            {/* Learning Journey */}
            <Route path="/journey" element={
              <ProtectedRoute>
                <Layout>
                  <StudentJourney />
                </Layout>
              </ProtectedRoute>
            } />

            {/* 404 Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </div>
        </DataCacheProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
