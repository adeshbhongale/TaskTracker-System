import { useSelector } from 'react-redux';
import { Navigate, Outlet } from 'react-router-dom';

const AuthLayout = () => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  // If already logged in, redirect based on role
  if (isAuthenticated && user) {
    if (user.approvalStatus === 'PENDING') {
      return <Navigate to="/pending-approval" replace />;
    }
    const defaultPaths = {
      SUPER_ADMIN: '/admin/dashboard',
      MANAGEMENT: '/management/dashboard',
      TEAM_LEAD: '/lead/dashboard',
      CONTRIBUTOR: '/contributor/dashboard',
      NORMAL_USER: '/pending-approval'
    };
    return <Navigate to={defaultPaths[user.role] || '/login'} replace />;
  }

  return (
    <div
      className="flex flex-col justify-center items-center min-h-screen bg-[#f8fafc] py-8"
      style={{
        background: 'radial-gradient(circle at 10% 20%, rgba(37, 99, 235, 0.08) 0%, rgba(0, 0, 0, 0) 45%), radial-gradient(circle at 90% 80%, rgba(14, 165, 233, 0.08) 0%, rgba(0, 0, 0, 0) 45%)',
        backgroundColor: '#f8fafc'
      }}
    >
      <Outlet />
    </div>
  );
};

export default AuthLayout;
