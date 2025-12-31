import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import PhaseTimelineAdminPanel from './PhaseTimelineAdminPanel';
// import removed: useNavigate
import { DataSeedingService } from '../../services/dataSeedingService';
import AdminUserManagement from './AdminUserManagement';
import MentorAssignment from './MentorAssignment';
import CurriculumAdminPanel from './CurriculumAdminPanel';
import SuperMentorManagement from './SuperMentorManagement';
// MentorRequestApproval now integrated into MentorAssignment
// Removed unused lucide-react icon imports
import BugReportAdminPanel from './BugReportAdminPanel';
import AdminJourneyTracking from './AdminJourneyTracking';
import AttendanceDashboard from './AttendanceDashboard';
import MenteeReviewCategoriesAdmin from './MenteeReviewCategoriesAdmin';
import CampusScheduleAdmin from './CampusScheduleAdmin';
import HouseStatsAdmin from './HouseStatsAdmin';
import AdminReviewCompliance from './AdminReviewCompliance';
import PhaseApprovalManagement from './PhaseApprovalManagement';
import CampusWebhookManagement from './CampusWebhookManagement';
import WebhookNotificationBell from './WebhookNotificationBell';
import AdminLeaveManagement from '../Leave/AdminLeaveManagement';


const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const [loading] = useState(false); // Fixed: was stuck on true
  const [seeding, setSeeding] = useState(false);

  // Removed loadDataStatus and related useEffect

  // handleSeedData removed

  // Main and sub tab structure - conditionally exclude backend for Academic Associates
  const mainTabs = React.useMemo(() => {
    const baseTabs = [
      { id: 'overview', label: 'Overview' },
      { id: 'user-management', label: 'User Management' },
      { id: 'reports', label: 'Reports' },
    ];

    // Only add backend tab if user is not an Academic Associate
    if (userData?.role !== 'academic_associate') {
      baseTabs.push({ id: 'backend', label: 'Backend Management' });
    }

    return baseTabs;
  }, [userData?.role]);
  const subTabs: { [key: string]: { id: string; label: string }[] } = React.useMemo(() => ({
    overview: [],
    'user-management': [
      { id: 'users', label: 'User Management' },
      { id: 'mentors', label: 'Mentor Management' },
      { id: 'super-mentors', label: 'Super Mentors' },
      { id: 'phase-approvals', label: 'Phase Approvals' },
      { id: 'leave-management', label: 'Leave Management' },
    ],
    reports: [
      { id: 'reports', label: 'Overview' },
      { id: 'review-compliance', label: 'Review Compliance' },
      { id: 'journey-tracking', label: 'Journey Tracking' },
      { id: 'phase-timeline', label: 'Phase Timeline' },
      { id: 'attendance', label: 'Attendance Dashboard' },
      { id: 'campus-schedules', label: 'Campus Schedules' },
      { id: 'house-stats', label: 'House Statistics' },
    ],
    backend: [
      { id: 'curriculum', label: 'Curriculum' },
      { id: 'database', label: 'Database Operations' },
      { id: 'bug-reports', label: 'Bug Reports' },
      { id: 'mentee-reviews', label: 'Mentee Review Categories' },
      { id: 'webhooks', label: 'Campus Webhooks' },
    ],
  }), []);

  // Track main and sub tab with localStorage persistence
  const [mainTab, setMainTab] = useState<string>(() => {
    return localStorage.getItem('admin-main-tab') || 'overview';
  });
  const [subTab, setSubTab] = useState<string>(() => {
    return localStorage.getItem('admin-sub-tab') || 'overview';
  });

  useEffect(() => {
    // When main tab changes, set subTab to first in group or overview
    const newSubTab = subTabs[mainTab]?.[0]?.id || 'overview';
    setSubTab(newSubTab);
    localStorage.setItem('admin-sub-tab', newSubTab);
  }, [mainTab, subTabs]);

  // Redirect Academic Associates away from backend tabs
  useEffect(() => {
    if (userData?.role === 'academic_associate' && mainTab === 'backend') {
      setMainTab('overview');
      localStorage.setItem('admin-main-tab', 'overview');
    }
  }, [userData?.role, mainTab]);

  // Persist tab state to localStorage
  const handleMainTabChange = (tabId: string) => {
    setMainTab(tabId);
    localStorage.setItem('admin-main-tab', tabId);
  };

  const handleSubTabChange = (tabId: string) => {
    setSubTab(tabId);
    localStorage.setItem('admin-sub-tab', tabId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Header with Learners Dashboard Button and Notification Bell */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <div className="flex items-center gap-3">
          {/* Webhook Notification Bell */}
          <WebhookNotificationBell />
          
          <button
            onClick={() => navigate('/student/dashboard')}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
            </svg>
            <span>Learners Dashboard</span>
          </button>
        </div>
      </div>

      {/* Main Tabs */}
      <nav className="flex space-x-4 mb-4">
        {mainTabs.map((tab: { id: string; label: string }) => (
          <button
            key={tab.id}
            onClick={() => handleMainTabChange(tab.id)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${mainTab === tab.id ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-primary-50'}`}
            title={`${tab.label} - ${tab.id === 'user_management' ? 'Manage users, roles, and permissions' : tab.id === 'backend_management' ? 'System configuration and data management' : 'View and analyze system data'}`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Sub Tabs */}
      {subTabs[mainTab].length > 0 && (
        <nav className="flex space-x-2 mb-6">
          {subTabs[mainTab].map((tab: { id: string; label: string }) => (
            <button
              key={tab.id}
              onClick={() => handleSubTabChange(tab.id)}
              className={`px-3 py-1 rounded font-medium text-xs transition-colors ${subTab === tab.id ? 'bg-primary-100 text-primary-700' : 'bg-gray-50 text-gray-600 hover:bg-primary-50'}`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      )}

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow">
        {mainTab === 'overview' && (
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">System Overview</h2>
            {/* ...overview content... */}
          </div>
        )}
        {mainTab === 'user-management' && subTab === 'users' && (
          <div className="p-6">
            <AdminUserManagement />
          </div>
        )}
        {mainTab === 'user-management' && subTab === 'mentors' && (
          <div className="p-6">
            <MentorAssignment />
          </div>
        )}
        {mainTab === 'user-management' && subTab === 'super-mentors' && (
          <div className="p-6">
            <SuperMentorManagement />
          </div>
        )}
        {mainTab === 'user-management' && subTab === 'phase-approvals' && (
          <div className="p-6">
            <PhaseApprovalManagement />
          </div>
        )}
        {mainTab === 'user-management' && subTab === 'leave-management' && (
          <div className="p-6">
            <AdminLeaveManagement 
              adminId={userData?.id || ''} 
              adminName={userData?.name || userData?.display_name || 'Admin'} 
            />
          </div>
        )}
        {mainTab === 'reports' && subTab === 'reports' && (
          <div className="p-6">
            <div className="text-center py-12">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Reports Coming Soon</h3>
              <p className="text-gray-600">
                Detailed analytics and student reports will be available here
              </p>
            </div>
          </div>
        )}
        {mainTab === 'reports' && subTab === 'review-compliance' && (
          <div className="p-6">
            <AdminReviewCompliance />
          </div>
        )}
        {mainTab === 'reports' && subTab === 'journey-tracking' && (
          <div className="p-6">
            <AdminJourneyTracking />
          </div>
        )}
        {mainTab === 'reports' && subTab === 'phase-timeline' && (
          <div className="p-6">
            <PhaseTimelineAdminPanel />
          </div>
        )}
        {mainTab === 'backend' && subTab === 'curriculum' && userData?.role !== 'academic_associate' && (
          <div className="p-6">
            <CurriculumAdminPanel />
          </div>
        )}
        {mainTab === 'backend' && subTab === 'database' && userData?.role !== 'academic_associate' && (
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Database Operations</h2>
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Curriculum Data Management</h3>
              <p className="text-gray-600 mb-4">
                Initialize the unified Induction curriculum with all 25 activities:
              </p>
              <div className="mb-4 p-3 bg-blue-50 rounded-md">
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• <strong>1 Phase:</strong> "Induction: Life Skills & Learning" (30 days)</li>
                  <li>• <strong>18 Life Skills:</strong> LS0-LS8 + 7 English sub-quests + 2 bonus quests</li>
                  <li>• <strong>8 Learning Quests:</strong> LE1-LE8 covering learning methodology to portfolio</li>
                  <li>• <strong>Total:</strong> 25 trackable activities with detailed descriptions</li>
                </ul>
              </div>
              <button
                onClick={async () => {
                  setSeeding(true);
                  try {
                    console.log('🌱 Starting curriculum data seeding...');
                    await DataSeedingService.seedInitialData();
                    console.log('✅ Curriculum data seeded successfully!');
                    alert('✅ Curriculum data has been successfully seeded to Firestore!\n\nAll 25 activities in the unified "Induction: Life Skills & Learning" phase have been created.');
                  } catch (error) {
                    console.error('❌ Error seeding curriculum data:', error);
                    alert('❌ Failed to seed curriculum data. Check console for details.\n\nError: ' + (error as Error).message);
                  } finally {
                    setSeeding(false);
                  }
                }}
                disabled={seeding}
                className={`px-4 py-2 font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  seeding 
                    ? 'bg-gray-400 text-gray-700 cursor-not-allowed' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {seeding ? 'Seeding Data...' : 'Seed Curriculum Data'}
              </button>
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-red-600 mb-2 text-sm">
                  ⚠️ <strong>Clean Up Old Data:</strong> Remove existing curriculum data before seeding new data.
                </p>
                <button
                  onClick={async () => {
                    // eslint-disable-next-line no-restricted-globals
                    if (!confirm('⚠️ This will DELETE ALL existing curriculum data in Firebase!\n\nThis includes all phases and topics. Are you sure you want to continue?')) {
                      return;
                    }
                    
                    setSeeding(true);
                    try {
                      console.log('🧹 Starting curriculum data cleanup...');
                      await DataSeedingService.cleanupCurriculumData();
                      console.log('✅ Curriculum data cleaned up successfully!');
                      alert('✅ All old curriculum data has been removed from Firebase!\n\nYou can now seed the new unified curriculum data.');
                    } catch (error) {
                      console.error('❌ Error cleaning up curriculum data:', error);
                      alert('❌ Failed to clean up curriculum data. Check console for details.\n\nError: ' + (error as Error).message);
                    } finally {
                      setSeeding(false);
                    }
                  }}
                  disabled={seeding}
                  className={`px-4 py-2 font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 ${
                    seeding 
                      ? 'bg-gray-400 text-gray-700 cursor-not-allowed' 
                      : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
                >
                  {seeding ? 'Cleaning Up...' : 'Clean Up Old Data'}
                </button>
                
                <button
                  onClick={async () => {
                    // eslint-disable-next-line no-restricted-globals
                    if (!confirm('🔄 This will CLEAN UP old data and SEED the new unified curriculum!\n\nThis includes:\n1. Delete all existing phases and topics\n2. Create the new unified Induction phase with 25 activities\n\nProceed?')) {
                      return;
                    }
                    
                    setSeeding(true);
                    try {
                      console.log('🔄 Starting clean & seed process...');
                      
                      // Step 1: Clean up
                      console.log('🧹 Step 1: Cleaning up old data...');
                      await DataSeedingService.cleanupCurriculumData();
                      console.log('✅ Old data cleaned up');
                      
                      // Step 2: Seed new data
                      console.log('🌱 Step 2: Seeding new curriculum...');
                      await DataSeedingService.seedInitialData();
                      console.log('✅ New curriculum seeded');
                      
                      alert('🎉 SUCCESS!\n\n✅ Old curriculum data cleaned up\n✅ New unified curriculum with 25 activities created\n\nStudents will now see the updated curriculum!');
                    } catch (error) {
                      console.error('❌ Error during clean & seed process:', error);
                      alert('❌ Failed during clean & seed process. Check console for details.\n\nError: ' + (error as Error).message);
                    } finally {
                      setSeeding(false);
                    }
                  }}
                  disabled={seeding}
                  className={`ml-2 px-4 py-2 font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
                    seeding 
                      ? 'bg-gray-400 text-gray-700 cursor-not-allowed' 
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {seeding ? 'Processing...' : '🔄 Clean & Seed New Data'}
                </button>
              </div>
            </div>
          </div>
        )}
        {mainTab === 'reports' && subTab === 'attendance' && (
          <div className="p-6">
            <AttendanceDashboard />
          </div>
        )}
        {mainTab === 'reports' && subTab === 'campus-schedules' && (
          <div className="p-6">
            <CampusScheduleAdmin />
          </div>
        )}
        {mainTab === 'reports' && subTab === 'house-stats' && (
          <div className="p-6">
            <HouseStatsAdmin />
          </div>
        )}
        {mainTab === 'backend' && subTab === 'bug-reports' && userData?.role !== 'academic_associate' && (
          <div className="p-6">
            <BugReportAdminPanel />
          </div>
        )}
        {mainTab === 'backend' && subTab === 'mentee-reviews' && userData?.role !== 'academic_associate' && (
          <div className="p-6">
            <MenteeReviewCategoriesAdmin />
          </div>
        )}
        {mainTab === 'backend' && subTab === 'webhooks' && userData?.role !== 'academic_associate' && (
          <div className="p-6">
            <CampusWebhookManagement />
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
