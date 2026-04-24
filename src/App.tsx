import { Capacitor } from '@capacitor/core';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { JobTrackerApp } from './JobTrackerApp';
import { ShellHome } from './pages/ShellHome';

export default function App() {
  const native = Capacitor.isNativePlatform();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={native ? <JobTrackerApp /> : <ShellHome />} />
        <Route path="/consaltyapp" element={<JobTrackerApp />} />
        <Route path="/consaltyapp/" element={<JobTrackerApp />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
