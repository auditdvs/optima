import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { Toaster } from 'react-hot-toast';
import { Navigate, Route, BrowserRouter as Router, Routes, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import Layout from './components/layout/Layout';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DashboardCacheProvider } from './contexts/DashboardCacheContext';
import { MapCacheProvider } from './contexts/MapCacheContext';
import { PresenceProvider } from './contexts/PresenceContext';
import AccountSettingsPage from './pages/AccountSettingsPage';
import AddUser from './pages/AddUser';
import AssignmentLetter from './pages/AssignmentLetter';
import AuditeeSurvey from './pages/AuditeeSurvey';
import AuditorWorkpapers from './pages/AuditorWorkpapers';
import BranchDirectory from './pages/BranchDirectory';
import Broadcast from './pages/Broadcast';
import ChatPage from './pages/ChatPage';
import CompanyRegulations from './pages/CompanyRegulations';
import Dashboard from './pages/Dashboard';
import EmailAddress from './pages/EmailAddress';
import FraudStaffPage from './pages/FraudStaffPage';
import Login from './pages/Login';
import ManagerDashboard from './pages/ManagerDashboard';
import NotificationHistory from './pages/NotificationHistory';
import PullRequestPage from './pages/PullRequestPage';
import QASection from './pages/QA';
import QAManagement from './pages/QAManagement';
import ResetPassword from './pages/ResetPassword';
import ShortlinkPage from './pages/ShortlinkPage';
import ShortlinkRedirect from './pages/ShortlinkRedirect';
import SupportTickets from './pages/SupportTickets';
import SurveyTokenManager from './pages/SurveyTokenManager';
import Tools from './pages/Tools';
import Tutorials from './pages/Tutorials';
import UnauthorizedPage from './pages/UnauthorizedPage';
import UpdateLocation from './pages/UpdateLocation';
import VideoCallPage from './pages/VideoCallPage';

const queryClient = new QueryClient();

function PrivateRoute({ children, requiredRoles = ['user', 'qa', 'superadmin','dvs','manager', 'risk'] }: { 
  children: React.ReactNode;
  requiredRoles?: string[];
}) {
  const { user, userRole, isLoading } = useAuth();
  const location = useLocation();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }



  if (!user) {
    // If accessing root, redirect to login cleanly
    if (location.pathname === '/') {
       return <Navigate to="/login" replace />;
    }
    // For protected sub-routes, show restricted access page
    return <UnauthorizedPage />;
  }
  
  if (!requiredRoles.includes(userRole)) {
    return <Navigate to="/dashboard" />;
  }
  
  return <>{children}</>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PresenceProvider>
        <MapCacheProvider>
          <DashboardCacheProvider>
            <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/" element={
                <PrivateRoute>
                  <Layout />
                </PrivateRoute>
              }>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="/pull-request" element={
                <PrivateRoute requiredRoles={['superadmin', 'manager', 'qa', 'dvs', 'user', 'risk']}>
                  <PullRequestPage />
                </PrivateRoute>
              } />
              <Route path="tools/*" element={
                <PrivateRoute requiredRoles={['user', 'qa', 'superadmin','dvs','manager', 'risk']}>
                  <Tools />
                </PrivateRoute>
              } />
              <Route path="manager-dashboard" element={
                <PrivateRoute requiredRoles={['superadmin', 'manager']}>
                  <ManagerDashboard />
                </PrivateRoute>
              } />
              <Route path="tutorials" element={
                <PrivateRoute requiredRoles={['user', 'qa', 'superadmin','dvs','manager']}>
                  <Tutorials />
                </PrivateRoute>
              } />
              <Route path="broadcast" element={
                <PrivateRoute requiredRoles={['superadmin', 'manager', 'qa', 'dvs']}>
                  <Broadcast />
                </PrivateRoute>
              } />
              <Route path="companyRegulations" element={
                <PrivateRoute requiredRoles={['superadmin', 'manager', 'qa', 'dvs', 'user', 'risk']}>
                  <CompanyRegulations />
                </PrivateRoute>
              } />
              <Route path="update-location" element={
                <PrivateRoute requiredRoles={['user', 'qa', 'superadmin','dvs','manager', 'risk']}>
                  <UpdateLocation />
                </PrivateRoute>
              } />
              <Route path="qa-section" element={
                <PrivateRoute requiredRoles={['qa', 'superadmin','dvs','manager']}>
                  <QASection />
                </PrivateRoute>
              } />
              <Route path="qa-management" element={
                <PrivateRoute requiredRoles={['superadmin', 'qa', 'manager']}>
                  <QAManagement />
                </PrivateRoute>
              } />
              <Route path="auditor-workpapers" element={
                <PrivateRoute requiredRoles={['superadmin', 'qa', 'manager', 'dvs', 'user', 'risk']}>
                  <AuditorWorkpapers />
                </PrivateRoute>
              } />
              <Route path="add-user" element={
                <PrivateRoute requiredRoles={['superadmin']}>
                  <AddUser />
                </PrivateRoute>
              } />
              <Route path="notification-history" element={
                <PrivateRoute requiredRoles={['superadmin', 'manager', 'qa', 'dvs', 'user']}>
                  <NotificationHistory />
                </PrivateRoute>
              } />
              <Route path="chat" element={
                <PrivateRoute requiredRoles={['superadmin', 'manager', 'qa', 'dvs', 'user', 'risk']}>
                  <ChatPage />
                </PrivateRoute>
              } />
              <Route path="email-address" element={
                <PrivateRoute requiredRoles={['superadmin', 'manager', 'qa', 'dvs', 'user', 'risk']}>
                  <EmailAddress />
                </PrivateRoute>
              } />
              <Route 
                path="account-settings" 
                element={
                  <PrivateRoute>
                    <AccountSettingsPage />
                  </PrivateRoute>
                } />
                <Route path="assignment-letter" element={
                <PrivateRoute requiredRoles={['user', 'dvs', 'qa', 'manager', 'superadmin']}>
                  <AssignmentLetter />
                </PrivateRoute>
                } />
                <Route path="branch-directory" element={
                <PrivateRoute requiredRoles={['superadmin', 'manager', 'qa', 'dvs', 'user', 'risk']}>
                  <BranchDirectory />
                </PrivateRoute>
                } />
                <Route path="support-tickets" element={
                <PrivateRoute requiredRoles={['superadmin', 'manager', 'qa', 'dvs', 'user', 'risk']}>
                  <SupportTickets />
                </PrivateRoute>
                } />
                <Route path="survey-manager" element={
                <PrivateRoute requiredRoles={['superadmin', 'manager', 'qa', 'dvs', 'user']}>
                  <SurveyTokenManager />
                </PrivateRoute>
                } />
                <Route path="shortlink" element={
                <PrivateRoute requiredRoles={['superadmin', 'manager', 'qa', 'dvs', 'user', 'risk']}>
                  <ShortlinkPage />
                </PrivateRoute>
                } />
            </Route>
            {/* Public Shortlink Redirect — tanpa auth */}
            <Route path="/s/:slug" element={<ShortlinkRedirect />} />
            {/* Fullscreen Video Call Route */}
            <Route path="/video-call" element={
              <PrivateRoute>
                 <VideoCallPage />
              </PrivateRoute>
            } />
            {/* Hidden: Fraud Staff Info — opens in new browser tab */}
            <Route path="/fraud-staff" element={
              <PrivateRoute>
                <FraudStaffPage />
              </PrivateRoute>
            } />
            {/* Public routes for auditee survey - no auth required */}
            <Route path="/survey" element={<AuditeeSurvey />} />
            <Route path="/survey/:token" element={<AuditeeSurvey />} />
          </Routes>
          <ToastContainer position="top-right" autoClose={5000} />
          <Toaster 
            position="top-right"
            toastOptions={{
              style: {
                direction: 'ltr',
                textAlign: 'left',
              },
            }}
          />
        </Router>
      </DashboardCacheProvider>
    </MapCacheProvider>
    </PresenceProvider>
    </AuthProvider>
  </QueryClientProvider>
  );
}

export default App;