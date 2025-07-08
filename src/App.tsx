import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { Toaster } from 'react-hot-toast';
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import Layout from './components/Layout';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AccountSettingsPage from './pages/AccountSettingsPage';
import AddUser from './pages/AddUser';
import Broadcast from './pages/Broadcast';
import CompanyRegulations from './pages/CompanyRegulations';
import Dashboard from './pages/Dashboard';
import EmailAddress from './pages/EmailAddress';
import GrammarCorrectionPage from './pages/GrammarCorrectionPage';
import Login from './pages/Login';
import ManagerDashboard from './pages/ManagerDashboard';
import NotificationHistory from './pages/NotificationHistory';
import PullRequestPage from './pages/PullRequestPage';
import QASection from './pages/QA';
import QAManagement from './pages/QAManagement';
import ResetPassword from './pages/ResetPassword';
import RiskDashboard from './pages/RiskDashboard';
import Tools from './pages/Tools';
import Tutorials from './pages/Tutorials';
import UpdateLocation from './pages/UpdateLocation';

const queryClient = new QueryClient();

function PrivateRoute({ children, requiredRoles = ['user', 'qa', 'superadmin','dvs','manager', 'risk'] }: { 
  children: React.ReactNode;
  requiredRoles?: string[];
}) {
  const { user, userRole } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" />;
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
              <Route path="/pull-request" element={<PullRequestPage />} />
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
              <Route path="companyRegulations" element={<CompanyRegulations />} />
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
              <Route path="risk-dashboard" element={
                <PrivateRoute requiredRoles={['superadmin','dvs', 'manager', 'risk']}>
                  <RiskDashboard />
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
              <Route path="email-address" element={
                <PrivateRoute requiredRoles={['superadmin', 'manager', 'qa', 'dvs', 'user', 'risk']}>
                  <EmailAddress />
                </PrivateRoute>
              } />
              <Route path="grammar-correction" element={
                <PrivateRoute requiredRoles={['superadmin', 'manager', 'qa', 'dvs', 'user']}>
                  <GrammarCorrectionPage />
                </PrivateRoute>
              } />
              <Route 
                path="account-settings" // Remove the leading slash to match other routes
                element={
                  <PrivateRoute>
                    <AccountSettingsPage />
                  </PrivateRoute>
                } 
              />
            </Route>
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
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;