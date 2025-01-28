import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Tools from './pages/Tools';
import WorkPapers from './pages/WorkPapers';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import UpdateLocation from './pages/UpdateLocation';  
import QASection from './pages/QA';
import Tutorials from './pages/Tutorials';
import CompanyRegulations from './pages/CompanyRegulations';
import AddUser from './pages/AddUser';
import { AuthProvider, useAuth } from './contexts/AuthContext';

const queryClient = new QueryClient();

function PrivateRoute({ children, requiredRoles = ['user', 'qa', 'admin'] }: { 
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
              <Route path="tools/*" element={<Tools />} />
              <Route path="workpapers" element={<WorkPapers />} />
              <Route path="tutorials" element={<Tutorials />} />
              <Route path="companyRegulations" element={<CompanyRegulations />} />
              <Route path="update-location" element={
                <PrivateRoute requiredRoles={['admin', 'qa']}>
                  <UpdateLocation />
                </PrivateRoute>
              } />
              <Route path="qa-section" element={
                <PrivateRoute requiredRoles={['admin', 'qa']}>
                  <QASection />
                </PrivateRoute>
              } />
              <Route path="add-user" element={
                <PrivateRoute requiredRoles={['admin']}>
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