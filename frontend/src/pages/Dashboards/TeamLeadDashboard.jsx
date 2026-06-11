import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import apiService from '../../services/api';

/* ─── Shared helpers ────────────────────────────────────────────── */
const statusLabel = s => ({
  IN_PROGRESS: 'In Progress',
  COMPLETE: 'Complete',
  BLOCKED: 'Blocked',
  DELAYED: 'Delayed',
  NOT_STARTED: 'Not Started',
  PENDING: 'Pending'
}[s] || s);
const statusBadgeClass = s => ({
  COMPLETE: 'tc-badge tc-badge-green',
  COMPLETED: 'tc-badge tc-badge-green',
  BLOCKED: 'tc-badge tc-badge-red',
  DELAYED: 'tc-badge tc-badge-red',
  IN_PROGRESS: 'tc-badge tc-badge-blue',
  PENDING: 'tc-badge tc-badge-gray'
}[s] || 'tc-badge tc-badge-gray');
const statusDot = s => ({
  COMPLETE: '#10b981',
  COMPLETED: '#10b981',
  BLOCKED: '#ef4444',
  DELAYED: '#ef4444',
  IN_PROGRESS: '#3b82f6',
  PENDING: '#94a3b8'
}[s] || '#94a3b8');

const EfficiencyRing = ({ value }) => {
  const pct = Math.min(Math.max(Number(value) || 0, 0), 100);
  const r = 26; const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const color = pct >= 80 ? 'var(--color-success)' : pct >= 50 ? 'var(--color-warning)' : 'var(--color-danger)';
  return (
    <div style={{ position: 'relative', width: 64, height: 64, flexShrink: 0 }}>
      <svg width="64" height="64" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="32" cy="32" r={r} fill="none" stroke="#e2e8f0" strokeWidth="5" />
        <circle cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '0.72rem', fontWeight: 800, color }}>{pct}%</span>
      </div>
    </div>
  );
};

/* ─── Component ─────────────────────────────────────────────────── */
const TeamLeadDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector(state => state.auth);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [contributors, setContributors] = useState([]);

  // Modal states
  const [phaseOpen, setPhaseOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);

  // Forms
  const [phaseForm, setPhaseForm] = useState({ project: '', name: '', description: '', targetEndDate: '' });
  const [taskForm, setTaskForm] = useState({ title: '', description: '', priority: 'MEDIUM', targetStartDate: '', targetEndDate: '', phase: '', project: '', acceptanceCriteria: '', assignedContributors: [] });
  const [activePhases, setActivePhases] = useState([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await apiService('/dashboard/lead');
      setData(res);
      const depts = await apiService('/departments?status=ACTIVE');
      setDepartments(depts);
      const users = await apiService('/users?status=APPROVED');
      setContributors(users);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const handleTaskProjectChange = async (projectId) => {
    setTaskForm(p => ({ ...p, project: projectId, phase: '' }));
    if (!projectId) { setActivePhases([]); return; }
    try { setActivePhases(await apiService(`/phases/project/${projectId}`)); }
    catch { }
  };



  const handlePhaseSubmit = async (e) => {
    e.preventDefault();
    try { await apiService('/phases', { method: 'POST', body: JSON.stringify(phaseForm) }); setPhaseOpen(false); setPhaseForm({ project: '', name: '', description: '', targetEndDate: '', weightage: 20 }); loadData(); }
    catch (err) { alert(err.message || 'Failed'); }
  };

  const handleTaskSubmit = async (e) => {
    e.preventDefault();
    try {
      const taskRes = await apiService('/tasks', { method: 'POST', body: JSON.stringify(taskForm) });
      if (taskForm.assignedContributors.length > 0) {
        await apiService(`/tasks/${taskRes.task._id}/assign`, { method: 'POST', body: JSON.stringify({ contributorIds: taskForm.assignedContributors }) });
      }
      setTaskOpen(false);
      setTaskForm({ title: '', description: '', priority: 'MEDIUM', targetStartDate: '', targetEndDate: '', phase: '', project: '', acceptanceCriteria: '', assignedContributors: [] });
      loadData();
    }
    catch (err) { alert(err.message || 'Failed'); }
  };

  if (loading) return <div className="tc-loading-page"><div className="tc-spinner" /></div>;

  const projects = data?.projects || [];
  const upcomingTasks = data?.upcomingTasks || [];

  const filteredUsers = contributors.filter(u => {
    if (u.role !== 'CONTRIBUTOR' && u.role !== 'TEAM_LEAD') return false;
    if (user?.role === 'TEAM_LEAD') {
      const leadDeptId = user.department?._id || user.department;
      const userDeptId = u.department?._id || u.department;
      if (!leadDeptId || leadDeptId !== userDeptId) return false;
    }
    return true;
  });

  return (
    <div className="tc-fade-in">
      {/* Header */}
      <div className="tc-page-header">
        <div>
          <h1 className="tc-heading-xl">Lead Workspace</h1>
          <p className="tc-body" style={{ marginTop: 4 }}>Manage projects, create phases, assign tasks, and monitor team performance.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="tc-btn tc-btn-secondary tc-btn-sm" onClick={loadData}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6M1 20v-6h6" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards - 6 cards in 2 rows */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
        <div className="tc-stat-card blue">
          <div className="tc-stat-card-label">Managed Projects</div>
          <div className="tc-stat-card-value">{String(data?.projectCount || 0).padStart(2, '0')}</div>
          <div className="tc-stat-card-desc">Created by you</div>
        </div>
        <div className="tc-stat-card green">
          <div className="tc-stat-card-label">Team Size</div>
          <div className="tc-stat-card-value">{String(data?.teamCount || 0).padStart(2, '0')}</div>
          <div className="tc-stat-card-desc">Active contributors</div>
        </div>
        <div className="tc-stat-card amber" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="tc-stat-card-label">Team Efficiency</div>
            <div className="tc-stat-card-value" style={{ color: 'var(--color-warning)' }}>{data?.teamEfficiency || 0}%</div>
            <div className="tc-stat-card-desc">Team average</div>
          </div>
          <EfficiencyRing value={data?.teamEfficiency || 0} />
        </div>
        <div className="tc-stat-card green">
          <div className="tc-stat-card-label">Completed Tasks</div>
          <div className="tc-stat-card-value" style={{ color: 'var(--color-success)' }}>{String(data?.completedCount || 0).padStart(2, '0')}</div>
          <div className="tc-stat-card-desc">Across all projects</div>
        </div>
        <div className="tc-stat-card blue">
          <div className="tc-stat-card-label">Total Tasks</div>
          <div className="tc-stat-card-value">{String(data?.totalTaskCount || 0).padStart(2, '0')}</div>
          <div className="tc-stat-card-desc">All project tasks</div>
        </div>
        <div className="tc-stat-card red">
          <div className="tc-stat-card-label">Blocked Tasks</div>
          <div className="tc-stat-card-value" style={{ color: (data?.blockedCount || 0) > 0 ? 'var(--color-danger)' : undefined }}>
            {String(data?.blockedCount || 0).padStart(2, '0')}
          </div>
          <div className="tc-stat-card-desc">
            {(data?.blockedCount || 0) > 0
              ? <span className="tc-badge tc-badge-red">CRITICAL</span>
              : <span style={{ color: 'var(--color-success)', fontSize: '0.75rem' }}>All clear ✓</span>
            }
          </div>
        </div>
      </div>

      {/* Projects & Deadlines */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start', marginBottom: 24 }}>
        {/* Projects Table */}
        <div className="tc-card">
          <div className="tc-card-header">
            <div>
              <h2 className="tc-heading-md">My Managed Projects</h2>
              <p className="tc-caption" style={{ marginTop: 2 }}>Click to open project detail view</p>
            </div>
            <button className="tc-btn tc-btn-secondary tc-btn-xs" onClick={() => navigate('/projects')}>
              View All
            </button>
          </div>
          <div style={{ padding: '0 0 4px' }}>
            <div className="tc-table-wrap" style={{ border: 'none', borderRadius: 0 }}>
              <table className="tc-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Project Name</th>
                    <th>Status</th>
                    <th>Start</th>
                    <th>Target</th>
                    <th className="right">Efficiency %</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-secondary)' }}>No projects yet.</td></tr>
                  ) : (
                    projects.map(proj => (
                      <tr key={proj._id} onClick={() => navigate(`/projects/${proj._id}`)}>
                        <td className="link-blue bold">{proj.projectCode}</td>
                        <td style={{ fontWeight: 500 }}>{proj.name}</td>
                        <td>
                          <span className={statusBadgeClass(proj.status)}>
                            <span className="tc-badge-dot" style={{ background: statusDot(proj.status) }} />
                            {statusLabel(proj.status)}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.78rem' }}>{proj.startDate ? new Date(proj.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td>
                        <td style={{ fontSize: '0.78rem' }}>{proj.targetEndDate ? new Date(proj.targetEndDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td>
                        <td className="right">
                          <span style={{
                            fontWeight: 700,
                            color: (proj.efficiency || 0) >= 80 ? 'var(--color-success)' : (proj.efficiency || 0) >= 50 ? 'var(--color-warning)' : 'var(--color-danger)'
                          }}>
                            {proj.efficiency ?? 0}%
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Upcoming Deadlines */}
          <div className="tc-card">
            <div className="tc-card-header" style={{ paddingBottom: 12 }}>
              <h2 className="tc-heading-sm">Deadlines in Next 7 Days</h2>
            </div>
            <div className="tc-card-body" style={{ padding: '0 20px 16px' }}>
              {upcomingTasks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
                  No upcoming deadlines.
                </div>
              ) : (
                upcomingTasks.slice(0, 5).map(task => (
                  <div
                    key={task._id}
                    onClick={() => navigate(`/tasks/${task._id}`)}
                    className="tc-activity-item"
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="tc-activity-dot" style={{ background: 'var(--color-danger)', marginTop: 5 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {task.taskId}: {task.title}
                      </div>
                      <div className="tc-caption" style={{ color: 'var(--color-danger)', fontWeight: 600, marginTop: 2 }}>
                        {new Date(task.targetEndDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Contributor Efficiency Table */}
      {(data?.contributorEfficiencyTable?.length > 0) && (
        <div className="tc-card" style={{ marginBottom: 24 }}>
          <div className="tc-card-header">
            <div>
              <h2 className="tc-heading-md">Contributors Efficiency</h2>
              <p className="tc-caption" style={{ marginTop: 2 }}>Performance of contributors assigned to your projects</p>
            </div>
            <button className="tc-btn tc-btn-secondary tc-btn-xs" onClick={() => navigate('/employees')}>
              View All
            </button>
          </div>
          <div style={{ padding: '0 0 4px' }}>
            <div className="tc-table-wrap" style={{ border: 'none', borderRadius: 0 }}>
              <table className="tc-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Designation</th>
                    <th>Department</th>
                    <th>Assigned Tasks</th>
                    <th>Completed Tasks</th>
                    <th className="right">Efficiency %</th>
                  </tr>
                </thead>
                <tbody>
                  {data.contributorEfficiencyTable.map(c => (
                    <tr key={c.id} onClick={() => navigate(`/users/${c.id}`)} style={{ cursor: 'pointer' }}>
                      <td style={{ fontWeight: 600 }}>{c.name}</td>
                      <td className="tc-caption">{c.designation || '—'}</td>
                      <td className="tc-caption">{c.department}</td>
                      <td>{c.assignedTasks}</td>
                      <td style={{ color: 'var(--color-success)', fontWeight: 600 }}>{c.completedTasks}</td>
                      <td className="right">
                        <span style={{
                          fontWeight: 700,
                          color: c.efficiency >= 80 ? 'var(--color-success)' : c.efficiency >= 50 ? 'var(--color-warning)' : 'var(--color-danger)'
                        }}>
                          {c.efficiency}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── DIALOGS ──────────────────────── */}

      {phaseOpen && (
        <div className="tc-modal-overlay">
          <div className="tc-modal" style={{ maxWidth: 500 }}>
            <div className="tc-modal-header">
              <h2 className="tc-heading-lg">Create SDLC Phase</h2>
            </div>
            <form onSubmit={handlePhaseSubmit}>
              <div className="tc-form-group" style={{ marginBottom: 16 }}>
                <label className="tc-form-label">Select Project</label>
                <select className="tc-form-select" value={phaseForm.project} onChange={e => setPhaseForm({ ...phaseForm, project: e.target.value })} required autoFocus>
                  <option value="" disabled>Select Project</option>
                  {(data?.projects || []).map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                </select>
              </div>
              <div className="tc-form-group" style={{ marginBottom: 16 }}>
                <label className="tc-form-label">Phase Name (e.g. Design, Development)</label>
                <input type="text" className="tc-form-input" value={phaseForm.name} onChange={e => setPhaseForm({ ...phaseForm, name: e.target.value })} required />
              </div>
              <div className="tc-form-group" style={{ marginBottom: 16 }}>
                <label className="tc-form-label">Description</label>
                <input type="text" className="tc-form-input" value={phaseForm.description} onChange={e => setPhaseForm({ ...phaseForm, description: e.target.value })} />
              </div>
              <div className="tc-form-group" style={{ marginBottom: 16 }}>
                <label className="tc-form-label">Target Date</label>
                <input type="date" className="tc-form-input" value={phaseForm.targetEndDate} onChange={e => setPhaseForm({ ...phaseForm, targetEndDate: e.target.value })} required />
              </div>
              <div className="tc-modal-footer">
                <button type="button" className="tc-btn tc-btn-secondary" onClick={() => setPhaseOpen(false)}>Cancel</button>
                <button type="submit" className="tc-btn tc-btn-primary">Create Phase</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {taskOpen && (
        <div className="tc-modal-overlay">
          <div className="tc-modal" style={{ maxWidth: 600 }}>
            <div className="tc-modal-header">
              <h2 className="tc-heading-lg">Create Project Task</h2>
            </div>
            <form onSubmit={handleTaskSubmit}>
              <div className="tc-form-group" style={{ marginBottom: 16 }}>
                <label className="tc-form-label">Select Project</label>
                <select className="tc-form-select" value={taskForm.project} onChange={e => handleTaskProjectChange(e.target.value)} required autoFocus>
                  <option value="" disabled>Select Project</option>
                  {(data?.projects || []).map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                </select>
              </div>
              <div className="tc-form-group" style={{ marginBottom: 16 }}>
                <label className="tc-form-label">Select SDLC Phase</label>
                <select className="tc-form-select" value={taskForm.phase} onChange={e => setTaskForm({ ...taskForm, phase: e.target.value })} disabled={!taskForm.project} required>
                  <option value="" disabled>Select Phase</option>
                  {activePhases.map(ph => <option key={ph._id} value={ph._id}>{ph.name}</option>)}
                </select>
              </div>
              <div className="tc-form-group" style={{ marginBottom: 16 }}>
                <label className="tc-form-label">Task Title</label>
                <input type="text" className="tc-form-input" value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} required />
              </div>
              <div className="tc-form-group" style={{ marginBottom: 16 }}>
                <label className="tc-form-label">Description</label>
                <textarea className="tc-form-textarea" rows="2" value={taskForm.description} onChange={e => setTaskForm({ ...taskForm, description: e.target.value })}></textarea>
              </div>
              <div className="tc-form-group" style={{ marginBottom: 16 }}>
                <label className="tc-form-label">Acceptance Criteria</label>
                <textarea className="tc-form-textarea" rows="2" value={taskForm.acceptanceCriteria} onChange={e => setTaskForm({ ...taskForm, acceptanceCriteria: e.target.value })}></textarea>
              </div>
              <div className="tc-form-group" style={{ marginBottom: 16 }}>
                <label className="tc-form-label">Assign Contributors</label>
                <select className="tc-form-select" multiple value={taskForm.assignedContributors} onChange={e => {
                  const options = [...e.target.options];
                  const values = options.filter(option => option.selected).map(option => option.value);
                  setTaskForm({ ...taskForm, assignedContributors: values });
                }} style={{ height: 100 }}>
                  {filteredUsers.map(u => <option key={u._id} value={u._id}>{u.name} ({u.designation})</option>)}
                </select>
                <div className="tc-caption" style={{ marginTop: 4 }}>Hold Ctrl/Cmd to select multiple members</div>
              </div>
              <div className="tc-form-group" style={{ marginBottom: 16 }}>
                <label className="tc-form-label">Priority</label>
                <select className="tc-form-select" value={taskForm.priority} onChange={e => setTaskForm({ ...taskForm, priority: e.target.value })}>
                  <option value="LOW">Low</option><option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option><option value="CRITICAL">Critical</option>
                </select>
              </div>
              <div className="tc-grid-2" style={{ marginBottom: 16 }}>
                <div className="tc-form-group">
                  <label className="tc-form-label">Start Date</label>
                  <input type="date" className="tc-form-input" value={taskForm.targetStartDate} onChange={e => setTaskForm({ ...taskForm, targetStartDate: e.target.value })} required />
                </div>
                <div className="tc-form-group">
                  <label className="tc-form-label">Target End</label>
                  <input type="date" className="tc-form-input" value={taskForm.targetEndDate} onChange={e => setTaskForm({ ...taskForm, targetEndDate: e.target.value })} required />
                </div>
              </div>
              <div className="tc-modal-footer">
                <button type="button" className="tc-btn tc-btn-secondary" onClick={() => setTaskOpen(false)}>Cancel</button>
                <button type="submit" className="tc-btn tc-btn-primary">Create Task</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamLeadDashboard;
