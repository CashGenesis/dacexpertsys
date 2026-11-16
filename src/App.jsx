import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import './index.css';
import { useAuth } from './context/AuthContext';
import { useLenis } from './hooks/useLenis';
import Login from './Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Reports from './pages/Reports.jsx';
import AdminSettings from './pages/AdminSettings.jsx';
import RulesWeights from './pages/admin/RulesWeights.jsx';
import UserManagement from './pages/admin/UserManagement.jsx';
import SystemConfig from './pages/admin/SystemConfig.jsx';
import CaseDetail from './pages/CaseDetail.jsx';
import CaseList from './pages/CaseList.jsx';
import Notifications from './pages/Notifications.jsx';
import Profile from './pages/Profile.jsx';
import RegisterCase from './pages/warden/RegisterCase.jsx';
import StudentDashboard from './pages/student/StudentDashboard.jsx';
import StudentPolicy from './pages/student/StudentPolicy.jsx';
import StudentProfile from './pages/StudentProfile.jsx';
import Settings from './pages/Settings.jsx';
import DacChatbot from './components/DacChatbot.jsx';

function ProtectedRoute({ children, roles }) {
  const { currentUser, loading, isAuthenticated, role } = useAuth();
  if (loading) return null;
  if (!isAuthenticated || !currentUser) {
    return <Navigate to="/" replace />;
  }

  if (roles?.length && !roles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

/** Must be inside <BrowserRouter> to use useLocation */
function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public */}
        <Route path="/" element={<Login />} />

        {/* Role aliases requested for login redirection */}
        <Route path="/student-dashboard" element={<ProtectedRoute roles={['student']}><Navigate to="/student/dashboard" replace /></ProtectedRoute>} />
        <Route path="/warden-dashboard" element={<ProtectedRoute roles={['warden']}><Navigate to="/warden/dashboard" replace /></ProtectedRoute>} />
        <Route path="/chief-dashboard" element={<ProtectedRoute roles={['chief_warden']}><Navigate to="/chief-warden/dashboard" replace /></ProtectedRoute>} />
        <Route path="/admin-dashboard" element={<ProtectedRoute roles={['admin']}><Navigate to="/dashboard" replace /></ProtectedRoute>} />

        {/* Admin & DSW */}
        <Route path="/dashboard" element={<ProtectedRoute roles={['admin', 'dsw']}><Dashboard /></ProtectedRoute>} />
        <Route path="/dsw-dashboard" element={<ProtectedRoute roles={['dsw']}><Dashboard /></ProtectedRoute>} />
        <Route path="/register-case" element={<ProtectedRoute roles={['dsw', 'admin']}><RegisterCase /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute roles={['admin', 'dsw']}><Reports /></ProtectedRoute>} />
        <Route path="/cases/:id" element={<ProtectedRoute roles={['admin', 'dsw']}><CaseDetail /></ProtectedRoute>} />
        <Route path="/view-case/:id" element={<ProtectedRoute roles={['admin', 'dsw']}><CaseDetail /></ProtectedRoute>} />
        <Route path="/students/:enrollmentNo" element={<ProtectedRoute roles={['admin', 'dsw', 'warden', 'chief_warden']}><StudentProfile /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute roles={['student', 'warden', 'chief_warden', 'dsw', 'admin']}><Settings /></ProtectedRoute>} />

        {/* Student */}
        <Route path="/student" element={<ProtectedRoute roles={['student']}><Navigate to="/student/dashboard" replace /></ProtectedRoute>} />
        <Route path="/student/dashboard" element={<ProtectedRoute roles={['student']}><StudentDashboard /></ProtectedRoute>} />
        <Route path="/student/cases" element={<ProtectedRoute roles={['student']}><CaseList /></ProtectedRoute>} />
        <Route path="/student/cases/:id" element={<ProtectedRoute roles={['student']}><CaseDetail /></ProtectedRoute>} />
        <Route path="/student/penalty-points" element={<ProtectedRoute roles={['student']}><Navigate to="/student/dashboard" replace /></ProtectedRoute>} />
        <Route path="/student/profile" element={<ProtectedRoute roles={['student']}><Profile /></ProtectedRoute>} />
        <Route path="/student/disciplinary-policy" element={<ProtectedRoute roles={['student']}><StudentPolicy /></ProtectedRoute>} />

        {/* Warden */}
        <Route path="/warden/dashboard" element={<ProtectedRoute roles={['warden']}><Dashboard /></ProtectedRoute>} />
        <Route path="/warden/register" element={<ProtectedRoute roles={['warden']}><RegisterCase /></ProtectedRoute>} />
        <Route path="/warden/cases" element={<ProtectedRoute roles={['warden']}><CaseList /></ProtectedRoute>} />
        <Route path="/warden/cases/:id" element={<ProtectedRoute roles={['warden']}><CaseDetail /></ProtectedRoute>} />
        <Route path="/warden/view/:id" element={<ProtectedRoute roles={['warden']}><CaseDetail /></ProtectedRoute>} />
        <Route path="/warden/notifications" element={<ProtectedRoute roles={['warden']}><Notifications /></ProtectedRoute>} />
        <Route path="/warden/profile" element={<ProtectedRoute roles={['warden']}><Profile /></ProtectedRoute>} />

        {/* Chief Warden */}
        <Route path="/chief-warden/dashboard" element={<ProtectedRoute roles={['chief_warden']}><Dashboard /></ProtectedRoute>} />
        <Route path="/chief-warden/register" element={<ProtectedRoute roles={['chief_warden']}><RegisterCase /></ProtectedRoute>} />
        <Route path="/chief-warden/cases" element={<ProtectedRoute roles={['chief_warden']}><CaseList /></ProtectedRoute>} />
        <Route path="/chief-warden/cases/:id" element={<ProtectedRoute roles={['chief_warden']}><CaseDetail /></ProtectedRoute>} />
        <Route path="/chief-warden/view/:id" element={<ProtectedRoute roles={['chief_warden']}><CaseDetail /></ProtectedRoute>} />
        <Route path="/chief-warden/notifications" element={<ProtectedRoute roles={['chief_warden']}><Notifications /></ProtectedRoute>} />
        <Route path="/chief-warden/profile" element={<ProtectedRoute roles={['chief_warden']}><Profile /></ProtectedRoute>} />

        {/* Admin settings — nested inside one shell */}
        <Route path="/admin-settings" element={<ProtectedRoute roles={['admin']}><AdminSettings /></ProtectedRoute>}>
          <Route index element={<Navigate to="rules-weights" replace />} />
          <Route path="rules-weights" element={<RulesWeights />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="system" element={<SystemConfig />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  useLenis(); // 🌊 boot global smooth scroll
  return (
    <BrowserRouter>
      <AnimatedRoutes />
      <DacChatbot />
    </BrowserRouter>
  );
}
