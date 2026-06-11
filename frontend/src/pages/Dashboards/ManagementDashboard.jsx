import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, Tooltip as RechartsTooltip, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import apiService from '../../services/api';

const CHART_PALETTE = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#64748b'];

const CircularMetricWidget = ({ value, size = 42, stroke = 4 }) => {
  const percentage = Math.min(Math.max(value, 0), 100);
  const color = percentage >= 80 ? 'var(--color-success)' : percentage >= 50 ? 'var(--color-warning)' : 'var(--color-danger)';
  const circ = 2 * Math.PI * (size / 2 - stroke / 2);
  const offset = circ - (percentage / 100) * circ;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={size / 2 - stroke / 2} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={size / 2 - stroke / 2} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '0.65rem', fontWeight: 800 }}>{percentage}%</span>
      </div>
    </div>
  );
};

const ManagementDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [blockerTasks, setBlockerTasks] = useState([]);
  const [delayedTasks, setDelayedTasks] = useState([]);
  const [contributors, setContributors] = useState([]);
  const [teamLeads, setTeamLeads] = useState([]);
  const [allTasks, setAllTasks] = useState([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [met, depts, blockers, delays, contribs, leads, tasks] = await Promise.all([
        apiService('/dashboard/overview'), apiService('/departments'),
        apiService('/reports/blockers'), apiService('/reports/delays'), apiService('/reports/contributors'),
        apiService('/reports/team-leads'), apiService('/tasks')
      ]);
      setMetrics(met); setDepartments(depts); setBlockerTasks(blockers);
      setDelayedTasks(delays); setContributors(contribs); setTeamLeads(leads); setAllTasks(tasks);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  if (loading) return <div className="tc-loading-page"><div className="tc-spinner" /></div>;

  const taskStatusData = [
    { name: 'Completed', value: metrics?.completedTasksCount || 0 },
    { name: 'In Progress', value: metrics?.inProgressTasksCount || 0 },
    { name: 'Blocked', value: metrics?.blockedTasksCount || 0 },
    { name: 'Not Started', value: metrics?.notStartedTasksCount || 0 },
    { name: 'Delayed', value: metrics?.delayedTasksCount || 0 }
  ].filter(s => s.value > 0);

  const deptEffMap = {};
  contributors.forEach(c => {
    const dName = c.department || 'N/A';
    if (!deptEffMap[dName]) deptEffMap[dName] = { total: 0, count: 0 };
    deptEffMap[dName].total += c.efficiency; deptEffMap[dName].count += 1;
  });
  const departmentEfficiencyData = Object.keys(deptEffMap).map(name => ({ name, efficiency: Math.round(deptEffMap[name].total / deptEffMap[name].count) }));

  const today = new Date();
  const sevenDaysLater = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcomingDeadlines = allTasks
    .filter(t => t.status !== 'COMPLETE' && t.status !== 'COMPLETED' && t.status !== 'CLOSED' && t.targetEndDate)
    .filter(t => { const dueDate = new Date(t.targetEndDate); return dueDate >= today && dueDate <= sevenDaysLater; })
    .sort((a, b) => new Date(a.targetEndDate) - new Date(b.targetEndDate)).slice(0, 5);

  return (
    <div className="tc-fade-in">
      <div className="tc-page-header">
        <div>
          <h1 className="tc-heading-xl">Management Overview</h1>
          <p className="tc-body" style={{ marginTop: 4 }}>Executive performance analytics, SDLC status, and operations.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="tc-btn tc-btn-secondary tc-btn-sm" onClick={loadData}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6M1 20v-6h6" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
            Refresh
          </button>
        </div>
      </div>

      {/* KPIs Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="tc-stat-card blue" onClick={() => navigate('/users')}>
          <div className="tc-stat-card-label">Total Employees</div>
          <div className="tc-stat-card-value">{metrics?.employeeCount || 0}</div>
          <div className="tc-stat-card-desc">Active in departments</div>
        </div>
        <div className="tc-stat-card green" onClick={() => navigate('/projects')}>
          <div className="tc-stat-card-label">Active Projects</div>
          <div className="tc-stat-card-value">{metrics?.projectsCount || 0}</div>
          <div className="tc-stat-card-desc">Dynamic SDLC monitoring</div>
        </div>
        <div className="tc-stat-card blue" onClick={() => navigate('/tasks')}>
          <div className="tc-stat-card-label">Tasks Total</div>
          <div className="tc-stat-card-value">{metrics?.tasksCount || 0}</div>
          <div className="tc-stat-card-desc">All projects combined</div>
        </div>
        <div className={`tc-stat-card ${metrics?.blockedTasksCount > 0 ? 'red' : 'gray'}`} onClick={() => navigate('/tasks?status=BLOCKED')}>
          <div className="tc-stat-card-label">Blocked Tasks</div>
          <div className="tc-stat-card-value" style={{ color: metrics?.blockedTasksCount > 0 ? 'var(--color-danger)' : undefined }}>{metrics?.blockedTasksCount || 0}</div>
          <div className="tc-stat-card-desc">Awaiting escalation</div>
        </div>
        <div className="tc-stat-card amber" onClick={() => navigate('/reports')} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div className="tc-stat-card-label">Org Efficiency</div>
            <div className="tc-stat-card-value">{metrics?.overallEfficiency || 0}%</div>
            <div className="tc-stat-card-desc">SLA metrics</div>
          </div>
          <CircularMetricWidget value={metrics?.overallEfficiency || 0} />
        </div>
      </div>

      {/* Row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '40% 30% 30%', gap: 16, marginBottom: 24 }}>
        <div className="tc-card">
          <div className="tc-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="tc-heading-sm">Task Status Distribution</h2>
            <button className="tc-btn tc-btn-secondary tc-btn-xs" onClick={() => navigate('/tasks')}>View All</button>
          </div>
          <div className="tc-card-body" style={{ height: 280, padding: '20px' }}>
            {taskStatusData.length === 0 ? <div style={{ textAlign: 'center', paddingTop: 60, color: 'var(--color-text-secondary)' }}>No task metrics available</div> :
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={taskStatusData} cx="50%" cy="50%" innerRadius={65} outerRadius={95} paddingAngle={4} dataKey="value">
                    {taskStatusData.map((e, i) => <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />)}
                  </Pie>
                  <RechartsTooltip />
                  <Legend verticalAlign="bottom" height={36} iconSize={10} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            }
          </div>
        </div>
        <div className="tc-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="tc-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="tc-heading-sm">Departments Snapshot</h2>
            <button className="tc-btn tc-btn-secondary tc-btn-xs" onClick={() => navigate('/projects')}>View All</button>
          </div>
          <div className="tc-card-body" style={{ padding: '0 24px', flex: 1 }}>
            <table className="tc-table" style={{ width: '100%', marginBottom: 16 }}>
              <tbody>
                {departments.slice(0, 4).map(d => (
                  <tr key={d._id}>
                    <td className="bold" style={{ padding: '10px 0' }}>{d.name}</td>
                    <td className="right" style={{ padding: '10px 0' }}><span className={d.status === 'ACTIVE' ? 'tc-badge tc-badge-green' : 'tc-badge tc-badge-gray'}>{d.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="tc-card">
          <div className="tc-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="tc-heading-sm">Upcoming Deadlines</h2>
            <button className="tc-btn tc-btn-secondary tc-btn-xs" onClick={() => navigate('/tasks')}>View All</button>
          </div>
          <div className="tc-card-body" style={{ padding: '0 24px 20px' }}>
            {upcomingDeadlines.length === 0 ? <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-secondary)' }}>No upcoming deadlines</div> :
              <table className="tc-table" style={{ width: '100%' }}>
                <tbody>
                  {upcomingDeadlines.map(t => (
                    <tr key={t._id} onClick={() => navigate(`/tasks/${t._id}`)}>
                      <td style={{ padding: '10px 0', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</td>
                      <td className="right" style={{ padding: '10px 0', color: 'var(--color-danger)', fontWeight: 600 }}>
                        {new Date(t.targetEndDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            }
          </div>
        </div>
      </div>

      {/* Row 3 - Performance Analytics */}
      <div className="tc-grid-3" style={{ marginBottom: 24 }}>
        <div className="tc-card">
          <div className="tc-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="tc-heading-sm">Contributor Efficiency</h2>
            <button className="tc-btn tc-btn-secondary tc-btn-xs" onClick={() => navigate('/users')}>View All</button>
          </div>
          <div className="tc-card-body" style={{ padding: '0 24px 24px' }}>
            <table className="tc-table">
              <thead><tr><th>Name</th><th>Dept</th><th className="right">Score</th></tr></thead>
              <tbody>
                {contributors.sort((a, b) => b.efficiency - a.efficiency).slice(0, 4).map(c => (
                  <tr key={c.employeeId}>
                    <td className="bold">{c.name}</td>
                    <td className="muted">{c.department || 'N/A'}</td>
                    <td className="right" style={{ fontWeight: 700, color: c.efficiency >= 80 ? 'var(--color-success)' : c.efficiency >= 50 ? 'var(--color-warning)' : 'var(--color-danger)' }}>{c.efficiency}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="tc-card">
          <div className="tc-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="tc-heading-sm">Team Lead Efficiency</h2>
            <button className="tc-btn tc-btn-secondary tc-btn-xs" onClick={() => navigate('/users')}>View All</button>
          </div>
          <div className="tc-card-body" style={{ padding: '0 24px 24px' }}>
            <table className="tc-table">
              <thead><tr><th>Name</th><th>Dept</th><th className="right">Score</th></tr></thead>
              <tbody>
                {teamLeads.sort((a, b) => b.efficiency - a.efficiency).slice(0, 4).map(l => (
                  <tr key={l.employeeId}>
                    <td className="bold">{l.name}</td>
                    <td className="muted">{l.department || 'N/A'}</td>
                    <td className="right" style={{ fontWeight: 700, color: l.efficiency >= 80 ? 'var(--color-success)' : l.efficiency >= 50 ? 'var(--color-warning)' : 'var(--color-danger)' }}>{l.efficiency}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="tc-card">
          <div className="tc-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="tc-heading-sm">Department Comparison</h2>
            <button className="tc-btn tc-btn-secondary tc-btn-xs" onClick={() => navigate('/reports')}>View All</button>
          </div>
          <div className="tc-card-body" style={{ height: 200, padding: '0 24px' }}>
            {departmentEfficiencyData.length === 0 ? <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>No data</div> :
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={departmentEfficiencyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" />
                  <XAxis dataKey="name" stroke="#94a3b8" style={{ fontSize: '0.75rem' }} />
                  <YAxis stroke="#94a3b8" unit="%" style={{ fontSize: '0.75rem' }} domain={[0, 100]} />
                  <RechartsTooltip />
                  <Bar dataKey="efficiency" fill="var(--color-brand-primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            }
          </div>
        </div>
      </div>

      {/* Row 4 - Pending Actions */}
      <div className={blockerTasks.length > 0 ? "tc-grid-2" : "tc-grid-1"} style={{ marginBottom: 24 }}>
        {blockerTasks.length > 0 && (
          <div className="tc-card">
            <div className="tc-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="tc-heading-sm">Critical Blockers ({blockerTasks.length})</h2>
              <button className="tc-btn tc-btn-secondary tc-btn-xs" onClick={() => navigate('/tasks')}>View All</button>
            </div>
            <div className="tc-card-body" style={{ padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {blockerTasks.slice(0, 3).map(t => (
                <div key={t.taskId} onClick={() => navigate('/tasks')} style={{ padding: 12, background: 'var(--color-danger-bg)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><div className="tc-heading-sm" style={{ color: '#dc2626' }}>{t.title}</div><span className="tc-badge tc-badge-red">BLOCKED</span></div>
                  <div className="tc-caption">Reason: {t.blockerReason}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="tc-card">
          <div className="tc-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="tc-heading-sm">Delayed Tasks ({delayedTasks.length})</h2>
            <button className="tc-btn tc-btn-secondary tc-btn-xs" onClick={() => navigate('/tasks')}>View All</button>
          </div>
          <div className="tc-card-body" style={{ padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {delayedTasks.length === 0 ? <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--color-text-secondary)' }}>No tasks delayed</div> :
              delayedTasks.slice(0, 3).map(t => (
                <div key={t.taskId} onClick={() => navigate('/tasks')} style={{ padding: 12, background: 'var(--color-warning-bg)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><div className="tc-heading-sm" style={{ color: '#b45309' }}>{t.title}</div><span className="tc-badge tc-badge-orange">{t.daysOverdue}d Late</span></div>
                  <div className="tc-caption">Target: {new Date(t.targetEndDate).toLocaleDateString()}</div>
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagementDashboard;
