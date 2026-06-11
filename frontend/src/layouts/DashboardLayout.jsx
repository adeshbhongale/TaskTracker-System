import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { logoutSuccess, setNotifications } from '../redux/slices/authSlice';
import apiService from '../services/api';

// SVG Icons
const Icons = {
  Dashboard: () => (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 28, height: 28 }}>
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
    </svg>
  ),
  Users: () => (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 28, height: 28 }}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Building: () => (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 28, height: 28 }}>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  Projects: () => (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 28, height: 28 }}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  Task: () => (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 28, height: 28 }}>
      <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  ),
  Report: () => (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 28, height: 28 }}>
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  Bell: () => (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 28, height: 28 }}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
  Logout: () => (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
};

const DashboardLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { user, notifications } = useSelector((state) => state.auth);

  const [logoutConfirm, setLogoutConfirm] = useState(false);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const data = await apiService('/notifications');
        dispatch(setNotifications(data));
      } catch (err) { console.warn('Could not fetch notifications:', err); }
    };
    if (user) fetchNotifications();
  }, [user, dispatch]);

  const handleLogout = async () => {
    setLogoutConfirm(false);
    try {
      const token = localStorage.getItem('refreshToken');
      if (token) await apiService('/logout', { method: 'POST', body: JSON.stringify({ token }) });
    } catch { }
    localStorage.clear();
    dispatch(logoutSuccess());
    navigate('/login');
  };

  const dbPaths = {
    SUPER_ADMIN: '/admin/dashboard',
    MANAGEMENT: '/management/dashboard',
    TEAM_LEAD: '/lead/dashboard',
    CONTRIBUTOR: '/contributor/dashboard'
  };

  const menuItems = [
    { text: 'Dashboard', icon: <Icons.Dashboard />, path: dbPaths[user?.role] || '/' },
    ...(user?.role !== 'CONTRIBUTOR' ? [{ text: 'Employees', icon: <Icons.Users />, path: '/users' }] : []),
    ...(user?.role === 'SUPER_ADMIN' ? [{ text: 'Departments', icon: <Icons.Building />, path: '/admin/departments' }] : []),
    { text: 'Projects', icon: <Icons.Projects />, path: '/projects' },
    { text: 'Tasks', icon: <Icons.Task />, path: '/tasks' },
    { text: 'Notifications', icon: <Icons.Bell />, path: '/notifications', badge: notifications.filter(n => !n.isRead).length },
    ...((user?.role === 'SUPER_ADMIN' || user?.role === 'MANAGEMENT') ? [{ text: 'Reports', icon: <Icons.Report />, path: '/reports' }] : [])
  ];

  const isActive = (path) =>
    location.pathname === path || (path !== '/' && location.pathname.startsWith(path));

  const roleLabel = {
    SUPER_ADMIN: 'Super Admin',
    MANAGEMENT: 'Management',
    TEAM_LEAD: 'Team Lead',
    CONTRIBUTOR: 'Contributor'
  }[user?.role] || user?.role;

  const roleColor = {
    SUPER_ADMIN: '#f97316',
    MANAGEMENT: '#8b5cf6',
    TEAM_LEAD: '#3b82f6',
    CONTRIBUTOR: '#10b981'
  }[user?.role] || 'var(--color-brand-primary)';

  return (
    <div className="tc-app-shell">
      {/* ── SIDEBAR ───────────────────────────────── */}
      <aside
        className="tc-sidebar"
        style={{
          padding: '16px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          width: '250px'
        }}
      >
        {/* Logo Section */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
          paddingBottom: 20,
          borderBottom: '1px solid var(--color-border)'
        }}>
          <img src="/Logo.jpeg" alt="TaskTracker System" style={{ height: 80, width: 'auto', objectFit: 'contain' }} />
          <h2 style={{
            fontSize: '1rem',
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            margin: 0,
            textAlign: 'center'
          }}>
            TaskTracker System
          </h2>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {menuItems.map((item) => (
            <button
              key={item.text}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                borderRadius: 'var(--radius-lg)',
                border: 'none',
                background: isActive(item.path) ? 'var(--color-brand-primary)' : 'transparent',
                color: isActive(item.path) ? '#fff' : 'var(--color-text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontSize: '1rem',
                fontWeight: 600,
                width: '100%',
                textAlign: 'left'
              }}
              onClick={() => navigate(item.path)}
              onMouseEnter={(e) => {
                if (!isActive(item.path)) {
                  e.currentTarget.style.background = 'var(--color-bg-subtle)';
                  e.currentTarget.style.color = 'var(--color-text-primary)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive(item.path)) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--color-text-secondary)';
                }
              }}
            >
              {item.icon}
              <span style={{ flex: 1 }}>{item.text}</span>
              {item.badge > 0 && (
                <span style={{
                  background: 'var(--color-danger)',
                  color: '#fff',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  padding: '4px 10px',
                  minWidth: 24,
                  textAlign: 'center'
                }}>
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* User Info */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px',
            borderRadius: '12px',
            background: 'var(--color-bg-subtle)',
          }}
        >
          {/* Profile Circle */}
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: `${roleColor}22`,
              border: `2px solid ${roleColor}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem',
              fontWeight: 700,
              color: roleColor,
              flexShrink: 0,
            }}
          >
            {user?.name?.charAt(0).toUpperCase()}
          </div>

          {/* User Details */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <span
              style={{
                fontWeight: 600,
                fontSize: '0.9rem',
                color: 'var(--color-text-primary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {user?.name}
            </span>

            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 500,
                color: roleColor,
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
              }}
            >
              {roleLabel}
            </span>
          </div>
        </div>

        {/* Sign Out Button */}
        <button
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            padding: '14px 16px',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-danger)',
            background: 'transparent',
            color: 'var(--color-danger)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            fontSize: '1rem',
            fontWeight: 600,
            width: '100%'
          }}
          onClick={() => setLogoutConfirm(true)}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--color-danger)';
            e.currentTarget.style.color = '#fff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--color-danger)';
          }}
        >
          <Icons.Logout />
          <span>Sign Out</span>
        </button>
      </aside>

      {/* ── MAIN AREA ─────────────────────────────── */}
      <div className="tc-main-area">
        {/* Page Content */}
        <main className="tc-page-content tc-fade-in" style={{ paddingTop: 24 }}>
          <Outlet />
        </main>
      </div>

      {/* ── LOGOUT CONFIRMATION MODAL ─────────────── */}
      {logoutConfirm && (
        <div className="tc-modal-overlay" style={{ zIndex: 9999 }}>
          <div className="tc-modal" style={{ maxWidth: 380, textAlign: 'center' }}>
            <div style={{ marginBottom: 20 }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'rgba(239,68,68,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px'
              }}>
                <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="var(--color-danger)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </div>
              <h2 className="tc-heading-lg" style={{ marginBottom: 8 }}>Sign Out?</h2>
              <p className="tc-body" style={{ color: 'var(--color-text-secondary)' }}>
                You will be signed out of your session as <strong>{user?.name}</strong>. Any unsaved changes may be lost.
              </p>
            </div>
            <div className="tc-modal-footer" style={{ justifyContent: 'center', gap: 12 }}>
              <button className="tc-btn tc-btn-secondary" onClick={() => setLogoutConfirm(false)}>
                Cancel
              </button>
              <button className="tc-btn tc-btn-danger" onClick={handleLogout}>
                Yes, Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardLayout;
