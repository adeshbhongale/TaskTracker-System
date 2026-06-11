import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { markNotificationRead, setNotifications } from '../../redux/slices/authSlice';
import apiService from '../../services/api';

const typeIcon = (type) => {
  if (type === 'TASK_ASSIGNED') return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/>
      <polyline points="17 11 19 13 23 9"/>
    </svg>
  );
  if (type === 'TASK_BLOCKED') return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>
    </svg>
  );
  if (type === 'TASK_COMPLETED') return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  );
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  );
};

const typeColor = (type) => {
  if (type === 'TASK_BLOCKED') return 'var(--color-danger)';
  if (type === 'TASK_COMPLETED') return 'var(--color-success)';
  if (type === 'TASK_ASSIGNED') return 'var(--color-brand-primary)';
  return 'var(--color-warning)';
};

const typeBg = (type) => {
  if (type === 'TASK_BLOCKED') return 'rgba(239,68,68,0.1)';
  if (type === 'TASK_COMPLETED') return 'rgba(16,185,129,0.1)';
  if (type === 'TASK_ASSIGNED') return 'rgba(99,102,241,0.1)';
  return 'rgba(245,158,11,0.1)';
};

const NotificationsPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { notifications } = useSelector((state) => state.auth);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(false);

  const refreshNotifications = async () => {
    setLoading(true);
    try {
      const data = await apiService('/notifications');
      dispatch(setNotifications(data));
    } catch (err) { console.warn('Could not fetch notifications:', err); }
    finally { setLoading(false); }
  };

  useEffect(() => { refreshNotifications(); }, []);

  const handleClick = async (notif) => {
    try {
      await apiService(`/notifications/${notif._id}/read`, { method: 'PATCH' });
      dispatch(markNotificationRead(notif._id));
    } catch {}
    if (notif.link) navigate(notif.link);
  };

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.isRead);
    for (const n of unread) {
      try {
        await apiService(`/notifications/${n._id}/read`, { method: 'PATCH' });
        dispatch(markNotificationRead(n._id));
      } catch {}
    }
  };

  const filtered = filter === 'ALL' ? notifications : filter === 'UNREAD' ? notifications.filter(n => !n.isRead) : notifications.filter(n => n.type === filter);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="tc-fade-in">
      {/* Page Header */}
      <div className="tc-page-header">
        <div>
          <h1 className="tc-heading-xl">Notifications</h1>
          <p className="tc-body" style={{ marginTop: 4 }}>
            Stay updated on task assignments, status changes, and blockers.
            {unreadCount > 0 && <span className="tc-badge tc-badge-blue" style={{ marginLeft: 10 }}>{unreadCount} unread</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="tc-btn tc-btn-secondary" onClick={refreshNotifications}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            Refresh
          </button>
          {unreadCount > 0 && (
            <button className="tc-btn tc-btn-primary" onClick={markAllRead}>
              Mark All as Read
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="tc-card" style={{ marginBottom: 24 }}>
        <div className="tc-card-body">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['ALL', 'UNREAD', 'TASK_ASSIGNED', 'TASK_BLOCKED', 'TASK_COMPLETED', 'TASK_STATUS_UPDATE'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  borderColor: filter === f ? 'var(--color-brand-primary)' : 'var(--color-border)',
                  background: filter === f ? 'var(--color-brand-primary)' : 'transparent',
                  color: filter === f ? '#fff' : 'var(--color-text-secondary)',
                }}
              >
                {f === 'ALL' ? 'All' : f === 'UNREAD' ? 'Unread' : f.replace(/_/g, ' ').replace('TASK ', '')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="tc-loading-page" style={{ minHeight: '40vh' }}><div className="tc-spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="tc-card">
          <div className="tc-card-body" style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>🔔</div>
            <div className="tc-heading-md" style={{ marginBottom: 8 }}>All caught up!</div>
            <div className="tc-body">No notifications for the selected filter.</div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(notif => (
            <div
              key={notif._id}
              onClick={() => handleClick(notif)}
              className="tc-card"
              style={{
                cursor: notif.link ? 'pointer' : 'default',
                background: notif.isRead ? 'var(--color-bg-paper)' : 'rgba(99,102,241,0.04)',
                borderLeft: notif.isRead ? '3px solid transparent' : '3px solid var(--color-brand-primary)',
                transition: 'all 0.15s',
              }}
            >
              <div className="tc-card-body" style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  {/* Icon */}
                  <div style={{
                    width: 38, height: 38, borderRadius: '50%',
                    background: typeBg(notif.type),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, color: typeColor(notif.type)
                  }}>
                    {typeIcon(notif.type)}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontWeight: notif.isRead ? 500 : 700,
                      fontSize: '0.875rem',
                      color: 'var(--color-text-primary)',
                      marginBottom: 4,
                      lineHeight: 1.5
                    }}>
                      {notif.message}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase',
                        color: typeColor(notif.type),
                        padding: '2px 8px', borderRadius: 'var(--radius-full)',
                        background: typeBg(notif.type)
                      }}>
                        {(notif.type || 'SYSTEM').replace(/_/g, ' ')}
                      </span>
                      <span className="tc-caption">{new Date(notif.createdAt || Date.now()).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>

                  {/* Read indicator */}
                  {!notif.isRead && (
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-brand-primary)', flexShrink: 0, marginTop: 4 }} />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
