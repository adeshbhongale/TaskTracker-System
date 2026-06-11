import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import apiService from '../../services/api';

const EfficiencyRing = ({ value, size = 64 }) => {
  const pct = Math.min(Math.max(Number(value) || 0, 0), 100);
  const r = (size * 0.4);
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const color = pct >= 80 ? '#10b981' : pct >= 50 ? '#f97316' : '#ef4444';
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth="5" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth="5"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: size === 64 ? '0.875rem' : '0.75rem', fontWeight: 800, color, lineHeight: 1 }}>{pct}%</span>
      </div>
    </div>
  );
};

const ContributorDashboard = () => {
  const navigate = useNavigate();
  const { user } = useSelector(s => s.auth);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await apiService('/dashboard/contributor');
      setData(res);
    } catch (err) {
      console.error('Error loading contributor dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  if (loading) {
    return (
      <div className="tc-loading-page">
        <div className="tc-spinner" />
      </div>
    );
  }

  const {
    myTasks = [],
    personalEfficiency = 0,
    completedCount = 0,
    inProgressCount = 0,
    notStartedCount = 0,
    blockedCount = 0,
    delayedCount = 0,
    totalCount = 0,
    projectWiseEfficiency = []
  } = data || {};

  return (
    <div className="tc-fade-in">
      {/* Page Header */}
      <div className="tc-page-header">
        <div>
          <h1 className="tc-heading-xl">My Workspace</h1>
          <p className="tc-body" style={{ marginTop: 4 }}>
            Track your assigned tasks and monitor your performance.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="tc-btn tc-btn-secondary tc-btn-sm" onClick={loadData}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="tc-grid-6" style={{ marginBottom: 24 }}>
        {/* Personal Efficiency */}
        <div className="tc-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '4px' }}>Personal Efficiency</div>
            <div style={{ color: '#fff', fontSize: '2rem', fontWeight: 800 }}>{personalEfficiency}%</div>
          </div>
          <EfficiencyRing value={personalEfficiency} />
        </div>

        {/* Total Tasks */}
        <div className="tc-card" style={{ padding: '20px', cursor: 'pointer' }} onClick={() => navigate('/tasks')}>
          <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '4px' }}>Total Assigned</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-brand-primary)' }}>{String(totalCount).padStart(2, '0')}</div>
        </div>

        {/* Completed */}
        <div className="tc-card" style={{ padding: '20px' }}>
          <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '4px' }}>Completed</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-success)' }}>{String(completedCount).padStart(2, '0')}</div>
        </div>

        {/* In Progress */}
        <div className="tc-card" style={{ padding: '20px' }}>
          <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '4px' }}>In Progress</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-info)' }}>{String(inProgressCount).padStart(2, '0')}</div>
        </div>

        {/* Not Started */}
        <div className="tc-card" style={{ padding: '20px' }}>
          <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '4px' }}>Not Started</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-text-secondary)' }}>{String(notStartedCount).padStart(2, '0')}</div>
        </div>

        {/* Delayed */}
        <div className="tc-card" style={{ padding: '20px' }}>
          <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '4px' }}>Delayed</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-danger)' }}>{String(delayedCount).padStart(2, '0')}</div>
        </div>
      </div>

      {/* Project-wise Efficiency */}
      <div className="tc-card" style={{ marginBottom: 24 }}>
        <div className="tc-card-header">
          <h2 className="tc-heading-md">Project-wise Efficiency</h2>
        </div>
        <div className="tc-card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {projectWiseEfficiency.length === 0 ? (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '32px', color: 'var(--color-text-secondary)' }}>
                No projects assigned yet.
              </div>
            ) : (
              projectWiseEfficiency.map(proj => (
                <div key={proj.id} className="tc-card" style={{ margin: 0, padding: '16px', border: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ fontWeight: 700, color: 'var(--color-text-primary)', fontSize: '1rem' }}>
                      {proj.name}
                    </div>
                    <EfficiencyRing value={proj.efficiency} size={48} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '2px' }}>Total</div>
                      <div style={{ fontWeight: 700, fontSize: '1.125rem' }}>{proj.totalTasks}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '2px' }}>Done</div>
                      <div style={{ fontWeight: 700, fontSize: '1.125rem', color: 'var(--color-success)' }}>{proj.completedTasks}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '2px' }}>Pending</div>
                      <div style={{ fontWeight: 700, fontSize: '1.125rem' }}>{proj.totalTasks - proj.completedTasks}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Blocked Tasks Warning */}
      {blockedCount > 0 && (
        <div className="tc-card" style={{ marginBottom: 24, padding: '16px', background: '#fef2f2', border: '1px solid #fecaca' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#dc2626" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div>
              <div style={{ fontWeight: 700, color: '#dc2626', fontSize: '1rem' }}>You have {blockedCount} blocked task{blockedCount > 1 ? 's' : ''}</div>
              <div style={{ color: '#7f1d1d', fontSize: '0.875rem' }}>Please resolve them as soon as possible.</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContributorDashboard;
