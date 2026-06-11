import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { CircularProgress, Box } from '@mui/material';

const ProtectedRoute = ({ allowedRoles = [] }) => {
  const { user, isAuthenticated, loading } = useSelector((state) => state.auth);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user && user.approvalStatus === 'PENDING') {
    return <Navigate to="/pending-approval" replace />;
  }

  if (allowedRoles.length > 0 && user && !allowedRoles.includes(user.role)) {
    // Redirect unauthorized users to their default dashboard
    const defaultPaths = {
      SUPER_ADMIN: '/admin/dashboard',
      MANAGEMENT: '/management/dashboard',
      TEAM_LEAD: '/lead/dashboard',
      CONTRIBUTOR: '/contributor/dashboard',
      NORMAL_USER: '/pending-approval'
    };
    return <Navigate to={defaultPaths[user.role] || '/login'} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
