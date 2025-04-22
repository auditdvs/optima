import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AddUser from './pages/AddUser';
import CompanyRegulations from './pages/CompanyRegulations';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import QASection from './pages/QA';
import QAManagement from './pages/QAManagement';
import ResetPassword from './pages/ResetPassword';
import RiskDashboard from './pages/RiskDashboard';
import Tools from './pages/Tools';
import Tutorials from './pages/Tutorials';
import UpdateLocation from './pages/UpdateLocation';
import WorkPapers from './pages/WorkPapers';

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
              <Route path="tools/*" element={
                <PrivateRoute requiredRoles={['user', 'qa', 'superadmin','dvs','manager', 'risk']}>
                  <Tools />
                </PrivateRoute>
              } />
              <Route path="workpapers" element={
                <PrivateRoute requiredRoles={['qa', 'superadmin','dvs','manager']}>
                  <WorkPapers />
                </PrivateRoute>
              } />
              <Route path="tutorials" element={
                <PrivateRoute requiredRoles={['user', 'qa', 'superadmin','dvs','manager']}>
                  <Tutorials />
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
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;