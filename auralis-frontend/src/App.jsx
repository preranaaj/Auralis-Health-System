import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import PatientDetail from './pages/PatientDetail';
import Schedule from './pages/Schedule';
import Settings from './pages/Settings';
import Doctors from './pages/Doctors';
import DoctorDetail from './pages/DoctorDetail';
import PatientPortal from './pages/PatientPortal';
import AdminCommand from './pages/AdminCommand';
import Appointments from './pages/Appointments';
import AuditLogs from './pages/AuditLogs';
import PatientTimeline from './pages/PatientTimeline';
import PatientCDSSDashboard from './pages/PatientCDSSDashboard';

// Full-screen layout — no sidebar, no header
const FullScreenLayout = () => (
  <div className="h-screen w-full bg-slate-950 overflow-hidden">
    <Outlet />
  </div>
);

// Protected Route Wrapper
const ProtectedRoute = () => {
  const { user, loading } = useAuth();
  if (loading) return <div className="h-screen w-full flex items-center justify-center bg-slate-950"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500" /></div>;
  return user ? <Outlet /> : <Navigate to="/login" />;
};

function App() {
  return (
    <ThemeProvider>
      <Router>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* All protected routes */}
          <Route element={<ProtectedRoute />}>
            {/* Full-screen CDSS routes (no sidebar/header) */}
            <Route element={<FullScreenLayout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/patients/:id/cdss" element={<PatientCDSSDashboard />} />
            </Route>

            {/* Standard sidebar routes */}
            <Route element={<Layout />}>
              <Route path="/portal" element={<PatientPortal />} />
              <Route path="/admin" element={<AdminCommand />} />
              <Route path="/audit-logs" element={<AuditLogs />} />
              <Route path="/patients" element={<Patients />} />
              <Route path="/patients/:id" element={<PatientDetail />} />
              <Route path="/patients/:id/timeline" element={<PatientTimeline />} />
              <Route path="/schedule" element={<Schedule />} />
              <Route path="/appointments" element={<Appointments />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/doctors" element={<Doctors />} />
              <Route path="/doctors/:id" element={<DoctorDetail />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
