import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import AuthLayout from '../layouts/AuthLayout';
import DashboardLayout from '../layouts/DashboardLayout';

// Guard
import ProtectedRoute from './ProtectedRoute';

// Pages
import Login from '../pages/Auth/Login';
import Register from '../pages/Auth/Register';
import PendingApproval from '../pages/Auth/PendingApproval';

// Dashboards
import SuperAdminDashboard from '../pages/Dashboards/SuperAdminDashboard';
import ManagementDashboard from '../pages/Dashboards/ManagementDashboard';
import TeamLeadDashboard from '../pages/Dashboards/TeamLeadDashboard';
import ContributorDashboard from '../pages/Dashboards/ContributorDashboard';

// Admin Pages
import UsersList from '../pages/Admin/UsersList';
import ContributorDetails from '../pages/Admin/ContributorDetails';
import DepartmentsList from '../pages/Admin/DepartmentsList';

// Core Pages
import ProjectsList from '../pages/Projects/ProjectsList';
import ProjectDetails from '../pages/Projects/ProjectDetails';
import TasksList from '../pages/Tasks/TasksList';
import TaskDetails from '../pages/Tasks/TaskDetails';

// Reports
import ReportsPage from '../pages/Reports/ReportsPage';

// Notifications
import NotificationsPage from '../pages/Notifications/NotificationsPage';

const AppRoutes = () => {
  return (
    <Routes>
      {/* 1. Public Auth routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      {/* 2. Pending Approval route */}
      <Route path="/pending-approval" element={<PendingApproval />} />

      {/* 3. Protected Dashboard routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          
          {/* Default Route redirector */}
          <Route path="/" element={<NavigateToDashboard />} />

          {/* Super Admin only */}
          <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']} />}>
            <Route path="/admin/dashboard" element={<SuperAdminDashboard />} />
            <Route path="/admin/departments" element={<DepartmentsList />} />
          </Route>

          {/* Management only */}
          <Route element={<ProtectedRoute allowedRoles={['MANAGEMENT']} />}>
            <Route path="/management/dashboard" element={<ManagementDashboard />} />
          </Route>

          {/* Team Lead only */}
          <Route element={<ProtectedRoute allowedRoles={['TEAM_LEAD']} />}>
            <Route path="/lead/dashboard" element={<TeamLeadDashboard />} />
          </Route>

          {/* Contributor only */}
          <Route element={<ProtectedRoute allowedRoles={['CONTRIBUTOR']} />}>
            <Route path="/contributor/dashboard" element={<ContributorDashboard />} />
          </Route>

          {/* Shared approved routes */}
          <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'MANAGEMENT', 'TEAM_LEAD', 'CONTRIBUTOR']} />}>
            <Route path="/projects" element={<ProjectsList />} />
            <Route path="/projects/:id" element={<ProjectDetails />} />
            <Route path="/tasks" element={<TasksList />} />
            <Route path="/tasks/:id" element={<TaskDetails />} />
            <Route path="/users/:userId" element={<ContributorDetails />} />
            <Route path="/notifications" element={<NotificationsPage />} />
          </Route>

          {/* Shared Employee Directory route */}
          <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'MANAGEMENT', 'TEAM_LEAD']} />}>
            <Route path="/users" element={<UsersList />} />
          </Route>

          {/* Reports */}
          <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'MANAGEMENT']} />}>
            <Route path="/reports" element={<ReportsPage />} />
          </Route>

        </Route>
      </Route>

      {/* 4. Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

// Component to dynamically route approved user to their default dashboard
import { useSelector } from 'react-redux';
const NavigateToDashboard = () => {
  const { user } = useSelector((state) => state.auth);
  
  if (!user) return <Navigate to="/login" replace />;

  const paths = {
    SUPER_ADMIN: '/admin/dashboard',
    MANAGEMENT: '/management/dashboard',
    TEAM_LEAD: '/lead/dashboard',
    CONTRIBUTOR: '/contributor/dashboard',
    NORMAL_USER: '/pending-approval'
  };

  return <Navigate to={paths[user.role] || '/login'} replace />;
};

export default AppRoutes;
