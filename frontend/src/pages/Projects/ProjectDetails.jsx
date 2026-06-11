import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import apiService from '../../services/api';

const getPriorityColor = (p) => {
  switch (p) {
    case 'CRITICAL': return 'tc-badge-red';
    case 'HIGH': return 'tc-badge-amber';
    case 'MEDIUM': return 'tc-badge-blue';
    case 'LOW': return 'tc-badge-gray';
    default: return 'tc-badge-gray';
  }
};

const getStatusColor = (s) => {
  switch (s) {
    case 'COMPLETE':
    case 'COMPLETED':
      return 'tc-badge-green';
    case 'IN_PROGRESS':
    case 'ACTIVE':
      return 'tc-badge-blue';
    case 'BLOCKED':
    case 'DELAYED':
      return 'tc-badge-red';
    default:
      return 'tc-badge-gray';
  }
};

const CircularEfficiencyWidget = ({ efficiency, title, size = 70, stroke = 5 }) => {
  const value = typeof efficiency === 'number' ? efficiency : parseFloat(efficiency) || 0;
  const color = value >= 80 ? 'var(--color-success)' : value >= 50 ? 'var(--color-warning)' : 'var(--color-danger)';
  const circ = 2 * Math.PI * (size / 2 - stroke / 2);
  const offset = circ - (value / 100) * circ;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
      <div>
        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: '2rem', fontWeight: 800 }}>{value}%</div>
      </div>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={size / 2 - stroke / 2} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
          <circle cx={size / 2} cy={size / 2} r={size / 2 - stroke / 2} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800, color: 'var(--color-text-secondary)' }}>
          Eff.
        </div>
      </div>
    </div>
  );
};

const ProjectDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const [project, setProject] = useState(null);
  const [phases, setPhases] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit Project State
  const [editProjOpen, setEditProjOpen] = useState(false);
  const [projForm, setProjForm] = useState({ name: '', description: '', priority: '', status: '', startDate: '', targetEndDate: '', actualCompletionDate: '', documentationUrls: [] });

  // Add/Edit Phase State
  const [addPhaseOpen, setAddPhaseOpen] = useState(false);
  const [editingPhase, setEditingPhase] = useState(null);
  const [phaseForm, setPhaseForm] = useState({ name: '', description: '', targetEndDate: '', actualEndDate: '' });

  // Add Task State
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', phase: '', priority: 'MEDIUM', targetStartDate: '', targetEndDate: '', acceptanceCriteria: '', assignedContributors: [] });
  const [availableUsers, setAvailableUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const projData = await apiService(`/projects/${id}`);
      setProject(projData);
      setProjForm({
        name: projData.name, description: projData.description || '', priority: projData.priority,
        status: projData.status, startDate: projData.startDate?.split('T')[0], targetEndDate: projData.targetEndDate?.split('T')[0],
        actualCompletionDate: projData.actualCompletionDate?.split('T')[0] || '',
        documentationUrls: projData.documentationUrls || []
      });

      const phaseData = await apiService(`/phases/project/${id}`);
      setPhases(phaseData);

      const taskData = await apiService(`/tasks?project=${id}`);
      setTasks(taskData);

      if (user?.role === 'SUPER_ADMIN' || user?.role === 'TEAM_LEAD') {
        const usersData = await apiService('/users?status=APPROVED');
        setAvailableUsers(usersData);
        const deptsData = await apiService('/departments');
        setDepartments(deptsData);
      }
    } catch (err) { console.error('Error fetching project details:', err); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [id]);

  const handleProjChange = (e) => setProjForm({ ...projForm, [e.target.name]: e.target.value });
  const handlePhaseChange = (e) => setPhaseForm({ ...phaseForm, [e.target.name]: e.target.value });

  const handleProjSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiService(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(projForm) });
      setEditProjOpen(false); loadData();
    } catch (err) { alert(err.message || 'Failed to update project'); }
  };

  const handleOpenCreatePhase = () => {
    setEditingPhase(null); setPhaseForm({ name: '', description: '', targetEndDate: '', actualEndDate: '' }); setAddPhaseOpen(true);
  };

  const handleEditPhaseClick = (ph) => {
    setEditingPhase(ph);
    setPhaseForm({ name: ph.name, description: ph.description || '', targetEndDate: ph.targetEndDate?.split('T')[0] || '', actualEndDate: ph.actualEndDate?.split('T')[0] || '' });
    setAddPhaseOpen(true);
  };

  const handleDeletePhaseClick = async (phaseId) => {
    if (!window.confirm('Are you sure you want to delete this phase and all its tasks? This action cannot be undone.')) return;
    try {
      await apiService(`/phases/${phaseId}`, { method: 'DELETE' }); loadData();
    } catch (err) { alert(err.message || 'Failed to delete phase'); }
  };

  const handleDeleteProject = async () => {
    if (!window.confirm('Are you sure you want to delete this project, along with all of its phases and tasks? This action cannot be undone.')) return;
    try {
      await apiService(`/projects/${id}`, { method: 'DELETE' }); navigate('/projects');
    } catch (err) { alert(err.message || 'Failed to delete project'); }
  };

  const handlePhaseSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingPhase) {
        await apiService(`/phases/${editingPhase._id}`, { method: 'PUT', body: JSON.stringify(phaseForm) });
      } else {
        await apiService('/phases', { method: 'POST', body: JSON.stringify({ ...phaseForm, project: id }) });
      }
      setAddPhaseOpen(false); setEditingPhase(null); loadData();
    } catch (err) { alert(err.message || 'Failed to save phase'); }
  };

  const handleOpenCreateTask = () => {
    setTaskForm({
      title: '',
      description: '',
      phase: phases[0]?._id || '',
      priority: 'MEDIUM',
      targetStartDate: '',
      targetEndDate: '',
      acceptanceCriteria: '',
      assignedContributors: []
    });
    setAddTaskOpen(true);
  };

  const handleTaskSubmit = async (e) => {
    e.preventDefault();
    if (!taskForm.phase || !taskForm.title || !taskForm.targetStartDate || !taskForm.targetEndDate) {
      alert('Please fill in all required fields.');
      return;
    }
    try {
      await apiService('/tasks', {
        method: 'POST',
        body: JSON.stringify({
          ...taskForm,
          project: id
        })
      });

      setAddTaskOpen(false);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to create task');
    }
  };

  const filteredUsers = availableUsers.filter(u => u.role === 'CONTRIBUTOR' || u.role === 'TEAM_LEAD');

  if (loading) return <div className="tc-loading-page"><div className="tc-spinner" /></div>;
  if (!project) return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <div style={{ color: 'var(--color-danger)', marginBottom: 16 }}>Project not found.</div>
      <button className="tc-btn tc-btn-secondary" onClick={() => navigate('/projects')}>Back to Projects</button>
    </div>
  );

  return (
    <div className="tc-fade-in">
      {/* Header */}
      <div className="tc-page-header" style={{ alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button className="tc-btn tc-btn-secondary" onClick={() => navigate('/projects')}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
            Projects
          </button>
          <div>
            <h1 className="tc-heading-xl">{project.name}</h1>
            <p className="tc-body">Code: {project.projectCode} | Team Lead: {project.createdBy?.name || 'N/A'} | Department: {project.department?.name || 'N/A'}</p>
          </div>
        </div>
        {(user?.role === 'TEAM_LEAD' || user?.role === 'SUPER_ADMIN') && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="tc-btn tc-btn-outline" onClick={() => setEditProjOpen(true)}>Edit Project</button>
            <button className="tc-btn tc-btn-danger" onClick={handleDeleteProject}>Delete Project</button>
          </div>
        )}
      </div>

      {/* Details Cards */}
      <div className="tc-grid-cols-70-30" style={{ marginBottom: 24, alignItems: 'stretch' }}>
        <div className="tc-card">
          <div className="tc-card-body">
            <h2 className="tc-heading-md" style={{ marginBottom: 8 }}>Project Description</h2>
            <p className="tc-body" style={{ marginBottom: 16 }}>{project.description || 'No description provided.'}</p>

            {project.documentationUrls && project.documentationUrls.length > 0 && (
              <div style={{ marginBottom: 16, padding: 12, background: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                <div className="tc-caption" style={{ fontWeight: 600, marginBottom: 6 }}>Documentation URLs</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {project.documentationUrls.map((url, index) => (
                    <a
                      key={index}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: 'var(--color-brand-primary)',
                        fontWeight: 500,
                        fontSize: '0.8rem',
                        background: 'var(--color-info-bg)',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        maxWidth: '300px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {url}
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="tc-grid-4">
              <div>
                <div className="tc-caption">Status</div>
                <div style={{ marginTop: 4 }}><span className={`tc-badge ${getStatusColor(project.status)}`}>{project.status}</span></div>
              </div>
              <div>
                <div className="tc-caption">Priority</div>
                <div style={{ marginTop: 4 }}><span className={`tc-badge ${getPriorityColor(project.priority)}`}>{project.priority}</span></div>
              </div>
              <div>
                <div className="tc-caption">Start Date</div>
                <div style={{ fontWeight: 600 }}>{new Date(project.startDate).toLocaleDateString()}</div>
              </div>
              <div>
                <div className="tc-caption">Target Date</div>
                <div style={{ fontWeight: 600 }}>{new Date(project.targetEndDate).toLocaleDateString()}</div>
              </div>
              {project.actualCompletionDate && (
                <div>
                  <div className="tc-caption">Actual Completion</div>
                  <div style={{ fontWeight: 600, color: 'var(--color-success)' }}>{new Date(project.actualCompletionDate).toLocaleDateString()}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="tc-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="tc-card-body" style={{ width: '100%' }}>
            <CircularEfficiencyWidget efficiency={project.efficiency || 0} title="Project Efficiency Score" />
          </div>
        </div>
      </div>

      {/* Phases */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 className="tc-heading-lg">Phases & Milestones</h2>
          {user?.role === 'TEAM_LEAD' && (
            <button className="tc-btn tc-btn-primary tc-btn-sm" onClick={handleOpenCreatePhase}>+ Add Phase</button>
          )}
        </div>
        <div className="tc-card">
          <div className="tc-table-wrap" style={{ border: 'none', borderRadius: 0 }}>
            <table className="tc-table">
              <thead>
                <tr>
                  <th>Phase Name</th>
                  <th>Efficiency %</th>
                  <th>Target Date</th>
                  <th>Actual End Date</th>
                  {user?.role === 'TEAM_LEAD' && <th className="right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {phases.map(ph => (
                  <tr key={ph._id}>
                    <td className="bold">{ph.name}</td>
                    <td style={{ fontWeight: 700, color: ph.efficiency === 100 ? 'var(--color-success)' : 'var(--color-text-secondary)' }}>{ph.efficiency}%</td>
                    <td>{new Date(ph.targetEndDate).toLocaleDateString()}</td>
                    <td>{ph.actualEndDate ? new Date(ph.actualEndDate).toLocaleDateString() : '—'}</td>
                    {user?.role === 'TEAM_LEAD' && (
                      <td className="right">
                        <button className="tc-icon-btn" onClick={() => handleEditPhaseClick(ph)} style={{ display: 'inline-flex', width: 32, height: 32 }}>
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--color-brand-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                        </button>
                        <button className="tc-icon-btn" onClick={() => handleDeletePhaseClick(ph._id)} style={{ display: 'inline-flex', width: 32, height: 32, marginLeft: 4 }}>
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--color-danger)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {phases.length === 0 && (
                  <tr><td colSpan={user?.role === 'TEAM_LEAD' ? 5 : 4} style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-secondary)' }}>No SDLC phases defined. Add phases to calculate efficiency.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Tasks */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 className="tc-heading-lg">Tasks List ({tasks.length})</h2>
          {(user?.role === 'TEAM_LEAD' || user?.role === 'SUPER_ADMIN') && (
            <button className="tc-btn tc-btn-primary tc-btn-sm" onClick={handleOpenCreateTask}>+ Add Task</button>
          )}
        </div>
        <div className="tc-card">
          <div className="tc-table-wrap" style={{ border: 'none', borderRadius: 0 }}>
            <table className="tc-table">
              <thead>
                <tr>
                  <th>Task ID</th>
                  <th>Title</th>
                  <th>Phase</th>
                  <th>Priority</th>
                  <th>Status</th>
                  {user?.role !== 'CONTRIBUTOR' && <th>Completion %</th>}
                  <th>Start Date</th>
                  <th>Target Date</th>
                  <th className="right">Actual Date</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map(task => {
                  let statusColor = 'tc-badge-gray';
                  if (task.status === 'COMPLETE' || task.status === 'COMPLETED') statusColor = 'tc-badge-green';
                  else if (task.status === 'IN_PROGRESS') statusColor = 'tc-badge-blue';
                  else if (task.status === 'BLOCKED' || task.status === 'DELAYED') statusColor = 'tc-badge-red';

                  return (
                    <tr key={task._id} onClick={() => navigate(`/tasks/${task._id}`)}>
                      <td className="bold">{task.taskId}</td>
                      <td>{task.title}</td>
                      <td>{task.phase?.name}</td>
                      <td><span className={`tc-badge ${getPriorityColor(task.priority)}`}>{task.priority}</span></td>
                      <td><span className={`tc-badge ${statusColor}`}>{task.status}</span></td>
                      {user?.role !== 'CONTRIBUTOR' && <td>{task.completionPercentage}%</td>}
                      <td>{task.targetStartDate ? new Date(task.targetStartDate).toLocaleDateString() : '—'}</td>
                      <td>{task.targetEndDate ? new Date(task.targetEndDate).toLocaleDateString() : '—'}</td>
                      <td className="right">{task.actualCompletionDate ? new Date(task.actualCompletionDate).toLocaleDateString() : '—'}</td>
                    </tr>
                  );
                })}
                {tasks.length === 0 && (
                  <tr><td colSpan={user?.role === 'CONTRIBUTOR' ? 8 : 9} style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-secondary)' }}>No tasks created under this project.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit Project Dialog */}
      {editProjOpen && (
        <div className="tc-modal-overlay">
          <div className="tc-modal" style={{ maxWidth: 600 }}>
            <div className="tc-modal-header">
              <h2 className="tc-heading-lg">Edit Project Details</h2>
            </div>
            <form onSubmit={handleProjSubmit}>
              <div className="tc-form-group" style={{ marginBottom: 16 }}>
                <label className="tc-form-label">Project Name</label>
                <input type="text" className="tc-form-input" name="name" value={projForm.name} onChange={handleProjChange} required autoFocus />
              </div>
              <div className="tc-form-group" style={{ marginBottom: 16 }}>
                <label className="tc-form-label">Description</label>
                <textarea className="tc-form-textarea" name="description" value={projForm.description} onChange={handleProjChange}></textarea>
              </div>
              <div className="tc-form-group" style={{ marginBottom: 16 }}>
                <label className="tc-form-label">Documentation URLs</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {projForm.documentationUrls.map((url, index) => (
                    <div key={index} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="url"
                        className="tc-form-input"
                        value={url}
                        onChange={(e) => {
                          const updated = [...projForm.documentationUrls];
                          updated[index] = e.target.value;
                          setProjForm({ ...projForm, documentationUrls: updated });
                        }}
                      />
                      <button
                        type="button"
                        className="tc-btn tc-btn-secondary tc-btn-xs"
                        onClick={() => {
                          const updated = projForm.documentationUrls.filter((_, i) => i !== index);
                          setProjForm({ ...projForm, documentationUrls: updated });
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="tc-btn tc-btn-primary tc-btn-xs"
                    onClick={() => {
                      setProjForm({ ...projForm, documentationUrls: [...projForm.documentationUrls, ''] });
                    }}
                  >
                    + Add URL
                  </button>
                </div>
              </div>
              <div className="tc-grid-2" style={{ marginBottom: 16 }}>
                <div className="tc-form-group">
                  <label className="tc-form-label">Priority</label>
                  <select className="tc-form-select" name="priority" value={projForm.priority} onChange={handleProjChange}>
                    <option value="LOW">Low</option><option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option><option value="CRITICAL">Critical</option>
                  </select>
                </div>
                <div className="tc-form-group">
                  <label className="tc-form-label">Status</label>
                  <select className="tc-form-select" name="status" value={projForm.status} onChange={handleProjChange}>
                    <option value="NOT_STARTED">Not Started</option><option value="IN_PROGRESS">In Progress</option>
                    <option value="BLOCKED">Blocked</option><option value="COMPLETED">Completed</option><option value="CLOSED">Closed</option>
                  </select>
                </div>
                <div className="tc-form-group">
                  <label className="tc-form-label">Start Date</label>
                  <input type="date" className="tc-form-input" name="startDate" value={projForm.startDate} onChange={handleProjChange} required />
                </div>
                <div className="tc-form-group">
                  <label className="tc-form-label">Target End Date</label>
                  <input type="date" className="tc-form-input" name="targetEndDate" value={projForm.targetEndDate} onChange={handleProjChange} required />
                </div>
                <div className="tc-form-group">
                  <label className="tc-form-label">Actual Completion Date</label>
                  <input type="date" className="tc-form-input" name="actualCompletionDate" value={projForm.actualCompletionDate} onChange={handleProjChange} />
                </div>
              </div>
              <div className="tc-modal-footer">
                <button type="button" className="tc-btn tc-btn-secondary" onClick={() => setEditProjOpen(false)}>Cancel</button>
                <button type="submit" className="tc-btn tc-btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Phase Dialog */}
      {addPhaseOpen && (
        <div className="tc-modal-overlay">
          <div className="tc-modal" style={{ maxWidth: 450 }}>
            <div className="tc-modal-header">
              <h2 className="tc-heading-lg">{editingPhase ? 'Edit SDLC Phase' : 'Add SDLC Phase'}</h2>
            </div>
            <form onSubmit={handlePhaseSubmit}>
              <div className="tc-form-group" style={{ marginBottom: 16 }}>
                <label className="tc-form-label">Phase Name (e.g. Design, Development)</label>
                <input type="text" className="tc-form-input" name="name" value={phaseForm.name} onChange={handlePhaseChange} required autoFocus />
              </div>
              <div className="tc-form-group" style={{ marginBottom: 16 }}>
                <label className="tc-form-label">Description</label>
                <input type="text" className="tc-form-input" name="description" value={phaseForm.description} onChange={handlePhaseChange} />
              </div>
              <div className="tc-form-group" style={{ marginBottom: 16 }}>
                <label className="tc-form-label">Target Date</label>
                <input type="date" className="tc-form-input" name="targetEndDate" value={phaseForm.targetEndDate} onChange={handlePhaseChange} required />
              </div>
              {(user?.role === 'TEAM_LEAD' || user?.role === 'SUPER_ADMIN') && (
                <div className="tc-form-group" style={{ marginBottom: 16 }}>
                  <label className="tc-form-label">Actual End Date</label>
                  <input type="date" className="tc-form-input" name="actualEndDate" value={phaseForm.actualEndDate} onChange={handlePhaseChange} />
                </div>
              )}
              <div className="tc-modal-footer">
                <button type="button" className="tc-btn tc-btn-secondary" onClick={() => setAddPhaseOpen(false)}>Cancel</button>
                <button type="submit" className="tc-btn tc-btn-primary">{editingPhase ? 'Save Changes' : 'Add Phase'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Task Dialog */}
      {addTaskOpen && (
        <div className="tc-modal-overlay">
          <div className="tc-modal" style={{ maxWidth: 600 }}>
            <div className="tc-modal-header">
              <h2 className="tc-heading-lg">Create New Task</h2>
            </div>
            <form onSubmit={handleTaskSubmit}>
              <div className="tc-form-group" style={{ marginBottom: 16 }}>
                <label className="tc-form-label">Task Title *</label>
                <input
                  type="text"
                  className="tc-form-input"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  required
                  autoFocus
                />
              </div>
              <div className="tc-form-group" style={{ marginBottom: 16 }}>
                <label className="tc-form-label">Description</label>
                <textarea
                  className="tc-form-textarea"
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="tc-form-group" style={{ marginBottom: 16 }}>
                <label className="tc-form-label">Acceptance Criteria</label>
                <textarea
                  className="tc-form-textarea"
                  value={taskForm.acceptanceCriteria}
                  onChange={(e) => setTaskForm({ ...taskForm, acceptanceCriteria: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="tc-grid-2" style={{ marginBottom: 16 }}>
                <div className="tc-form-group">
                  <label className="tc-form-label">SDLC Phase *</label>
                  <select
                    className="tc-form-select"
                    value={taskForm.phase}
                    onChange={(e) => setTaskForm({ ...taskForm, phase: e.target.value })}
                    required
                  >
                    <option value="">-- Choose Phase --</option>
                    {phases.map(ph => <option key={ph._id} value={ph._id}>{ph.name}</option>)}
                  </select>
                </div>
                <div className="tc-form-group">
                  <label className="tc-form-label">Priority</label>
                  <select
                    className="tc-form-select"
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>



              <div className="tc-grid-2" style={{ marginBottom: 16 }}>
                <div className="tc-form-group">
                  <label className="tc-form-label">Start Date *</label>
                  <input
                    type="date"
                    className="tc-form-input"
                    value={taskForm.targetStartDate}
                    onChange={(e) => setTaskForm({ ...taskForm, targetStartDate: e.target.value })}
                    required
                  />
                </div>
                <div className="tc-form-group">
                  <label className="tc-form-label">Target End Date *</label>
                  <input
                    type="date"
                    className="tc-form-input"
                    value={taskForm.targetEndDate}
                    onChange={(e) => setTaskForm({ ...taskForm, targetEndDate: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="tc-modal-footer">
                <button type="button" className="tc-btn tc-btn-secondary" onClick={() => setAddTaskOpen(false)}>Cancel</button>
                <button type="submit" className="tc-btn tc-btn-primary">Create Task</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contributor Picker Modal */}
      {pickerOpen && (
        <div className="tc-modal-overlay" style={{ zIndex: 400 }}>
          <div className="tc-modal" style={{ maxWidth: 480 }}>
            <div className="tc-modal-header">
              <h2 className="tc-heading-md">Select Contributor</h2>
              <button type="button" className="tc-btn tc-btn-secondary tc-btn-xs" onClick={() => setPickerOpen(false)}>X</button>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              <input
                type="text"
                className="tc-form-input"
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <select
                className="tc-form-select"
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
              >
                <option value="">All Departments</option>
                {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
              </select>
            </div>

            {/* List */}
            <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {availableUsers
                .filter(u => u.role === 'CONTRIBUTOR' || u.role === 'TEAM_LEAD')
                .filter(u => !searchQuery || u.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .filter(u => !selectedDept || (u.department?._id || u.department) === selectedDept)
                .map(u => {
                  const isSelected = taskForm.assignedContributors.includes(u._id);
                  return (
                    <div
                      key={u._id}
                      onClick={() => {
                        const updated = isSelected
                          ? taskForm.assignedContributors.filter(id => id !== u._id)
                          : [...taskForm.assignedContributors, u._id];
                        setTaskForm({ ...taskForm, assignedContributors: updated });
                        setPickerOpen(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: 8,
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        background: isSelected ? 'var(--color-info-bg)' : 'var(--color-bg-paper)'
                      }}
                    >
                      <div className="tc-avatar-sm" style={{ background: 'var(--color-brand-primary)', color: 'white' }}>
                        {u.name[0].toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{u.name} {isSelected && '✓'}</div>
                        <div className="tc-caption">{u.designation} | {u.department?.name || 'No Dept'}</div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetails;
