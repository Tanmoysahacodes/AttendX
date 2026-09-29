import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppLayout from './layouts/AppLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Attendance from './pages/Attendance';
import AttendanceSessions from './pages/AttendanceSessions';
import SessionDetails from './pages/SessionDetails';
import MyAttendance from './pages/MyAttendance';
import Players from './pages/Players';
import Schedule from './pages/Schedule';
import Announcements from './pages/Announcements';
import Analytics from './pages/Analytics';
import Reports from './pages/Reports';
import Staff from './pages/Staff';
import AuditLogs from './pages/AuditLogs';
import About from './pages/About';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false },
  },
});

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-surface-base flex items-center justify-center font-black tracking-tight text-3xl animate-pulse">
        <span className="text-zinc-50">Attend</span>
        <span className="text-brand-500">X</span>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="attendance" element={<ProtectedRoute allowedRoles={['CAPTAIN', 'COACH', 'ADMIN']}><Attendance /></ProtectedRoute>} />
              <Route path="sessions" element={<ProtectedRoute allowedRoles={['CAPTAIN', 'COACH', 'ADMIN']}><AttendanceSessions /></ProtectedRoute>} />
              <Route path="sessions/:id" element={<ProtectedRoute allowedRoles={['CAPTAIN', 'COACH', 'ADMIN']}><SessionDetails /></ProtectedRoute>} />
              <Route path="my-attendance" element={<ProtectedRoute allowedRoles={['PLAYER']}><MyAttendance /></ProtectedRoute>} />
              <Route path="players" element={<ProtectedRoute allowedRoles={['CAPTAIN', 'COACH', 'ADMIN']}><Players /></ProtectedRoute>} />
              <Route path="schedule" element={<Schedule />} />
              <Route path="announcements" element={<Announcements />} />
              <Route path="analytics" element={<ProtectedRoute allowedRoles={['CAPTAIN', 'COACH', 'ADMIN']}><Analytics /></ProtectedRoute>} />
              <Route path="reports" element={<ProtectedRoute allowedRoles={['COACH', 'ADMIN']}><Reports /></ProtectedRoute>} />
              <Route path="staff" element={<ProtectedRoute allowedRoles={['ADMIN']}><Staff /></ProtectedRoute>} />
              <Route path="audit" element={<ProtectedRoute allowedRoles={['ADMIN']}><AuditLogs /></ProtectedRoute>} />
              <Route path="about" element={<About />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
