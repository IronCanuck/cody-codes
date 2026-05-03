import { Capacitor } from '@capacitor/core';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';
import {
  JobTrackerApp,
  JobTrackerDashboardPage,
  JobTrackerEarningsPage,
  JobTrackerHistoryPage,
  JobTrackerLogPage,
  JobTrackerReportsPage,
  JobTrackerSettingsPage,
} from './JobTrackerApp';
import { ChoriosApp } from './ChoriosApp';
import { BudgetPalApp } from './BudgetPalApp';
import { FurriesApp } from './FurriesApp';
import { PlantBasedMenuApp } from './PlantBasedMenuApp';
import { StickyApp } from './Sticky';
import { FireWatchApp } from './FireWatch';
import { InventoryDatabaseApp } from './InventoryDatabase';
import { TaskMasterApp } from './TaskMaster';
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

function TaskMasterRoute() {
  return (
    <ProtectedRoute>
      <TaskMasterApp />
    </ProtectedRoute>
  );
}

function ChoriosRoute() {
  return (
    <ProtectedRoute>
      <ChoriosApp />
    </ProtectedRoute>
  );
}

function FurriesRoute() {
  return (
    <ProtectedRoute>
      <FurriesApp />
    </ProtectedRoute>
  );
}

function BudgetPalRoute() {
  return (
    <ProtectedRoute>
      <BudgetPalApp />
    </ProtectedRoute>
  );
}

function PlantBasedMenuRoute() {
  return (
    <ProtectedRoute>
      <PlantBasedMenuApp />
    </ProtectedRoute>
  );
}

function StickyRoute() {
  return (
    <ProtectedRoute>
      <StickyApp />
    </ProtectedRoute>
  );
}

function FireWatchRoute() {
  return (
    <ProtectedRoute>
      <FireWatchApp />
    </ProtectedRoute>
  );
}

function InventoryDatabaseRoute() {
  return (
    <ProtectedRoute>
      <InventoryDatabaseApp />
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
          <Route path="/taskmaster/*" element={<TaskMasterRoute />} />
          <Route path="/chorios/*" element={<ChoriosRoute />} />
          <Route path="/furries" element={<FurriesRoute />} />
          <Route path="/budget-pal/*" element={<BudgetPalRoute />} />
          <Route path="/plant-based-menu" element={<PlantBasedMenuRoute />} />
          <Route path="/sticky/*" element={<StickyRoute />} />
          <Route path="/fire-watch/*" element={<FireWatchRoute />} />
          <Route path="/inventory/*" element={<InventoryDatabaseRoute />} />
          <Route path="/consaltyapp" element={<ConsaltyRoute />}>
            <Route index element={<JobTrackerDashboardPage />} />
            <Route path="log" element={<JobTrackerLogPage />} />
            <Route path="history" element={<JobTrackerHistoryPage />} />
            <Route path="earnings" element={<JobTrackerEarningsPage />} />
            <Route path="reports" element={<JobTrackerReportsPage />} />
            <Route path="settings" element={<JobTrackerSettingsPage />} />
            <Route path="*" element={<Navigate to="/consaltyapp" replace />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
