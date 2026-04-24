import { Capacitor } from '@capacitor/core';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';
import { JobTrackerApp } from './JobTrackerApp';
import { Login } from './pages/Login';
import { MemberDashboard } from './pages/MemberDashboard';
import { ShellHome } from './pages/ShellHome';

function ConsaltyRoute() {
  return (
    <ProtectedRoute>
      <JobTrackerApp />
    </ProtectedRoute>
  );
}

function DashboardRoute() {
  return (
    <ProtectedRoute>
      <MemberDashboard />
    </ProtectedRoute>
  );
}

export default function App() {
  const native = Capacitor.isNativePlatform();

  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={native ? <DashboardRoute /> : <ShellHome />}
          />
          <Route path="/dashboard" element={<DashboardRoute />} />
          <Route path="/consaltyapp" element={<ConsaltyRoute />} />
          <Route path="/consaltyapp/" element={<ConsaltyRoute />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
