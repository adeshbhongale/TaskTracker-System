import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import apiService from '../../services/api';

const TaskDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [blockerOpen, setBlockerOpen] = useState(false);
  const [editTaskOpen, setEditTaskOpen] = useState(false);

  // Day status states
  const [newDayStatus, setNewDayStatus] = useState('');
  const [newDayStatusDate, setNewDayStatusDate] = useState(new Date().toISOString().split('T')[0]);

  // Form states
  const [status, setStatus] = useState('');
  const [actualDate, setActualDate] = useState('');
  const [newBlockerReason, setNewBlockerReason] = useState('');
  const [mentionedUsers, setMentionedUsers] = useState([]); // user IDs mentioned via @
  const [mentionQuery, setMentionQuery] = useState(''); // the text after @
  const [mentionPickerOpen, setMentionPickerOpen] = useState(false);
  const [mentionDeptFilter, setMentionDeptFilter] = useState('');
  const [allMentionableUsers, setAllMentionableUsers] = useState([]);
  const [blockerForm, setBlockerForm] = useState({ reason: '', dependencyType: 'Technical', expectedResolutionDate: '' });
  const [editForm, setEditForm] = useState({ title: '', description: '', priority: 'MEDIUM', targetStartDate: '', targetEndDate: '', phase: '', acceptanceCriteria: '', assignedContributors: [] });
  const [projectPhases, setProjectPhases] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [pickerMode, setPickerMode] = useState(''); // 'create', 'edit', 'direct'

  // Create Mode states
  const [projects, setProjects] = useState([]);
  const [phases, setPhases] = useState([]);
  const [createForm, setCreateForm] = useState({
    project: '',
    phase: '',
    title: '',
    description: '',
    priority: 'MEDIUM',
    targetStartDate: '',
    targetEndDate: '',
    acceptanceCriteria: '',
    assignedContributors: []
  });

  const loadData = async () => {
    setLoading(true);
    try {
      if (id === 'new') {
        const projs = await apiService('/projects');
        setProjects(projs);
        if (user?.role === 'SUPER_ADMIN' || user?.role === 'TEAM_LEAD') {
          const usersData = await apiService('/users?status=APPROVED');
          setAvailableUsers(usersData);
          const depts = await apiService('/departments');
          setDepartments(depts);
        }
        setLoading(false);
        return;
      }

      const taskData = await apiService(`/tasks/${id}`);
      setTask(taskData);
      setStatus(taskData.status);
      setActualDate(taskData.actualCompletionDate ? taskData.actualCompletionDate.split('T')[0] : '');

      // Load users for mention feature and assignment
      try {
        const allUsers = await apiService('/users?status=APPROVED');
        const depts = await apiService('/departments');
        setAllMentionableUsers(allUsers.filter(u => u.role === 'CONTRIBUTOR' || u.role === 'TEAM_LEAD'));
        setDepartments(depts);
        if (user?.role === 'TEAM_LEAD' || user?.role === 'SUPER_ADMIN') {
          setAvailableUsers(allUsers);
        }
      } catch (e) { console.error('Error loading users:', e); }
    } catch (err) {
      console.error('Error fetching task details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [id, user]);

  const handleStatusChange = async (newStatus) => {
    if (newStatus === 'BLOCKED') {
      if (user?.role === 'CONTRIBUTOR') {
        alert('Contributors are not allowed to block tasks');
        return;
      }
      setBlockerOpen(true);
      return;
    }
    try {
      await apiService(`/tasks/${id}/status`, { method: 'PUT', body: JSON.stringify({ status: newStatus }) });
      setStatus(newStatus);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to update task status');
    }
  };

  const handleBlockerSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiService(`/tasks/${id}/status`, { method: 'PUT', body: JSON.stringify({ status: 'BLOCKED', blockerDetails: blockerForm }) });
      setStatus('BLOCKED');
      setBlockerOpen(false);
      setBlockerForm({ reason: '', dependencyType: 'Technical', expectedResolutionDate: '' });
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to set task as blocked');
    }
  };

  const handleActualDateChange = async (e) => {
    const val = e.target.value;
    setActualDate(val);
    try {
      await apiService(`/tasks/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ actualCompletionDate: val ? new Date(val) : null })
      });
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to update actual completion date');
    }
  };

  const handleAddBlockerSubmit = async (e) => {
    e.preventDefault();
    if (!newBlockerReason.trim()) return;
    try {
      await apiService(`/tasks/${id}/blockers`, {
        method: 'POST',
        body: JSON.stringify({ reason: newBlockerReason.trim(), mentionedUsers })
      });
      setNewBlockerReason('');
      setMentionedUsers([]);
      setMentionPickerOpen(false);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to add blocker');
    }
  };

  const handleAddDayStatusSubmit = async (e) => {
    e.preventDefault();
    if (!newDayStatus.trim()) return;
    try {
      await apiService(`/tasks/${id}/day-statuses`, {
        method: 'POST',
        body: JSON.stringify({ date: newDayStatusDate, status: newDayStatus.trim() })
      });
      setNewDayStatus('');
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to add day status');
    }
  };

  const handleDeleteDayStatus = async (statusId) => {
    if (!window.confirm('Are you sure you want to delete this day status?')) return;
    try {
      await apiService(`/tasks/${id}/day-statuses/${statusId}`, {
        method: 'DELETE'
      });
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to delete day status');
    }
  };

  // Handle @mention typing in blocker textarea
  const handleBlockerInputChange = (e) => {
    const val = e.target.value;
    setNewBlockerReason(val);
    // Detect if the last typed character was '@'
    const lastAt = val.lastIndexOf('@');
    if (lastAt !== -1) {
      // Check if there's a space between the '@' and the end (meaning user finished a mention)
      const afterAt = val.slice(lastAt + 1);
      if (!afterAt.includes(' ') && !afterAt.includes('\n')) {
        // User is typing after @: open picker and let picker's own search handle filtering
        setMentionPickerOpen(true);
        // Pre-fill search query with what's typed after @
        setMentionQuery(afterAt);
        return;
      }
    }
    setMentionPickerOpen(false);
    setMentionQuery('');
  };

  const handleSelectMention = (mentionUser) => {
    // Replace the text after the last '@' up to current position with '@name '
    const lastAt = newBlockerReason.lastIndexOf('@');
    const before = newBlockerReason.slice(0, lastAt);
    setNewBlockerReason(`${before}@${mentionUser.name} `);
    if (!mentionedUsers.includes(mentionUser._id)) {
      setMentionedUsers(prev => [...prev, mentionUser._id]);
    }
    setMentionPickerOpen(false);
    setMentionQuery('');
  };

  const closeMentionPicker = () => {
    setMentionPickerOpen(false);
    setMentionQuery('');
  };

  const handleEditClick = async () => {
    if (!task) return;
    try {
      const phasesData = await apiService(`/phases/project/${task.project._id}`);
      setProjectPhases(phasesData);
      setEditForm({
        title: task.title,
        description: task.description || '',
        priority: task.priority,
        targetStartDate: task.targetStartDate?.split('T')[0] || '',
        targetEndDate: task.targetEndDate?.split('T')[0] || '',
        phase: task.phase?._id || '',
        acceptanceCriteria: task.acceptanceCriteria || '',
        assignedContributors: task.assignedContributors.map(c => c._id)
      });
      setEditTaskOpen(true);
    } catch (err) {
      alert('Failed to load project phases for editing');
    }
  };

  const handleEditTaskSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiService(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(editForm) });
      if (user?.role === 'SUPER_ADMIN' || user?.role === 'TEAM_LEAD') {
        await apiService(`/tasks/${id}/assign`, { method: 'POST', body: JSON.stringify({ contributorIds: editForm.assignedContributors }) });
      }
      setEditTaskOpen(false);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to update task');
    }
  };

  const handleDeleteTask = async () => {
    if (!window.confirm('Are you sure you want to delete this task? This action cannot be undone.')) return;
    try {
      await apiService(`/tasks/${id}`, { method: 'DELETE' });
      navigate(`/projects/${task.project?._id || ''}`);
    } catch (err) {
      alert(err.message || 'Failed to delete task');
    }
  };

  // Create Mode handlers
  const handleProjectSelect = async (projectId) => {
    setCreateForm(prev => ({ ...prev, project: projectId, phase: '' }));
    if (!projectId) {
      setPhases([]);
      return;
    }
    try {
      const phasesData = await apiService(`/phases/project/${projectId}`);
      setPhases(phasesData);
    } catch (err) {
      console.error('Error loading project phases:', err);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.project || !createForm.phase || !createForm.title || !createForm.targetStartDate || !createForm.targetEndDate) {
      alert('Please fill in all required fields.');
      return;
    }
    try {
      setLoading(true);
      const response = await apiService('/tasks', {
        method: 'POST',
        body: JSON.stringify(createForm)
      });

      // Assign contributors if SUPER_ADMIN or TEAM_LEAD
      if ((user?.role === 'SUPER_ADMIN' || user?.role === 'TEAM_LEAD') && createForm.assignedContributors.length > 0) {
        await apiService(`/tasks/${response.task._id}/assign`, {
          method: 'POST',
          body: JSON.stringify({ contributorIds: createForm.assignedContributors })
        });
      }

      navigate(`/tasks/${response.task._id}`);
    } catch (err) {
      alert(err.message || 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColorClass = (stat) => {
    switch (stat) {
      case 'PENDING': return 'tc-badge-gray';
      case 'IN_PROGRESS': return 'tc-badge-blue';
      case 'COMPLETE':
      case 'COMPLETED': return 'tc-badge-green';
      case 'BLOCKED': return 'tc-badge-red';
      case 'DELAYED': return 'tc-badge-red';
      default: return 'tc-badge-gray';
    }
  };

  const getPriorityColorClass = (priority) => {
    switch (priority) {
      case 'CRITICAL': return 'tc-badge-red';
      case 'HIGH': return 'tc-badge-amber';
      case 'MEDIUM': return 'tc-badge-blue';
      case 'LOW': return 'tc-badge-gray';
      default: return 'tc-badge-gray';
    }
  };

  if (loading) return <div className="tc-loading-page"><div className="tc-spinner" /></div>;

  // Filter available users for assignment
  const filteredUsers = availableUsers.filter(u => {
    if (u.role !== 'CONTRIBUTOR' && u.role !== 'TEAM_LEAD') return false;
    if (user?.role === 'TEAM_LEAD') {
      const leadDeptId = user.department?._id || user.department;
      const userDeptId = u.department?._id || u.department;
      if (!leadDeptId || leadDeptId !== userDeptId) return false;
    }
    return true;
  });

  // ──── CREATE TASK VIEW ────
  if (id === 'new') {
    return (
      <div className="tc-fade-in" style={{ padding: '24px' }}>
        <style>{`
          .tc-create-task-container {
            max-width: 800px;
            margin: 0 auto;
            background: var(--color-bg-paper);
            border: 1px solid var(--color-border);
            border-radius: var(--radius-xl);
            box-shadow: var(--shadow-card-hover);
            padding: 32px;
          }
          .tc-create-header {
            margin-bottom: 24px;
            border-bottom: 1px solid var(--color-border);
            padding-bottom: 16px;
            display: flex;
            align-items: center;
            gap: 16px;
          }
        `}</style>

        <div className="tc-create-task-container">
          <div className="tc-create-header">
            <button
              className="tc-btn tc-btn-secondary tc-btn-sm"
              onClick={() => navigate('/tasks')}
              style={{ display: 'inline-flex', alignItems: 'center' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <h1 className="tc-heading-xl">Create Project Task</h1>
          </div>

          <form onSubmit={handleCreateSubmit}>
            <div className="tc-grid-2" style={{ marginBottom: '16px' }}>
              <div className="tc-form-group">
                <label className="tc-form-label">Select Project *</label>
                <select
                  className="tc-form-select"
                  value={createForm.project}
                  onChange={(e) => handleProjectSelect(e.target.value)}
                  required
                >
                  <option value="">-- Choose Project --</option>
                  {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                </select>
              </div>

              <div className="tc-form-group">
                <label className="tc-form-label">Select SDLC Phase *</label>
                <select
                  className="tc-form-select"
                  value={createForm.phase}
                  onChange={(e) => setCreateForm({ ...createForm, phase: e.target.value })}
                  disabled={!createForm.project}
                  required
                >
                  <option value="">-- Choose Phase --</option>
                  {phases.map(ph => <option key={ph._id} value={ph._id}>{ph.name}</option>)}
                </select>
              </div>
            </div>

            <div className="tc-form-group" style={{ marginBottom: '16px' }}>
              <label className="tc-form-label">Task Title *</label>
              <input
                type="text"
                className="tc-form-input"
                placeholder="Enter a descriptive title for this task"
                value={createForm.title}
                onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                required
              />
            </div>

            <div className="tc-form-group" style={{ marginBottom: '10px' }}>
              <label className="tc-form-label">Description</label>
              <textarea
                className="tc-form-textarea"
                placeholder="Detail the scope and context of this task"
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="tc-form-group" style={{ marginBottom: '16px' }}>
              <label className="tc-form-label">Acceptance Criteria</label>
              <textarea
                className="tc-form-textarea"
                placeholder="What determines if this task is successfully finished?"
                value={createForm.acceptanceCriteria}
                onChange={(e) => setCreateForm({ ...createForm, acceptanceCriteria: e.target.value })}
                rows={3}
              />
            </div>

            <div className="tc-grid-3" style={{ marginBottom: '24px' }}>
              <div className="tc-form-group">
                <label className="tc-form-label">Priority</label>
                <select
                  className="tc-form-select"
                  value={createForm.priority}
                  onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value })}
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>

              <div className="tc-form-group">
                <label className="tc-form-label">Start Date *</label>
                <input
                  type="date"
                  className="tc-form-input"
                  value={createForm.targetStartDate}
                  onChange={(e) => setCreateForm({ ...createForm, targetStartDate: e.target.value })}
                  required
                />
              </div>

              <div className="tc-form-group">
                <label className="tc-form-label">Target End Date *</label>
                <input
                  type="date"
                  className="tc-form-input"
                  value={createForm.targetEndDate}
                  onChange={(e) => setCreateForm({ ...createForm, targetEndDate: e.target.value })}
                  required
                />
              </div>
            </div>

            {(user?.role === 'SUPER_ADMIN' || user?.role === 'TEAM_LEAD') && (
              <div className="tc-form-group" style={{ marginBottom: '24px' }}>
                <label className="tc-form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  Assign Contributors
                  <button
                    type="button"
                    className="tc-btn tc-btn-primary tc-btn-xs"
                    onClick={() => {
                      setPickerMode('create');
                      setSearchQuery('');
                      setSelectedDept('');
                      setPickerOpen(true);
                    }}
                  >
                    + Add Contributor
                  </button>
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                  {createForm.assignedContributors.map(id => {
                    const match = availableUsers.find(u => u._id === id);
                    return match ? (
                      <span key={id} className="tc-badge tc-badge-blue" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        {match.name}
                        <button
                          type="button"
                          style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 'bold' }}
                          onClick={() => {
                            setCreateForm({ ...createForm, assignedContributors: createForm.assignedContributors.filter(x => x !== id) });
                          }}
                        >
                          ×
                        </button>
                      </span>
                    ) : null;
                  })}
                  {createForm.assignedContributors.length === 0 && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                      No contributors selected. Click "+ Add Contributor" to search and add.
                    </span>
                  )}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--color-border)', paddingTop: '20px' }}>
              <button type="button" className="tc-btn tc-btn-secondary" onClick={() => navigate('/tasks')}>
                Cancel
              </button>
              <button type="submit" className="tc-btn tc-btn-primary">
                Create Task
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ color: 'var(--color-danger)', marginBottom: 16 }}>Task not found.</div>
        <button className="tc-btn tc-btn-secondary" onClick={() => navigate('/tasks')}>Back to Tasks</button>
      </div>
    );
  }

  // ──── TASK DETAILS OVERHAUL VIEW ────
  return (
    <div className="tc-fade-in" style={{ padding: '10px' }}>
      <style>{`
        .tc-task-card-container {
          max-width: 1000px;
          margin: 0 auto;
          background: var(--color-bg-paper);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow-card-hover);
          overflow: hidden;
        }
        .tc-task-header-bar {
          padding: 16px 24px;
          border-bottom: 1px solid var(--color-border);
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: linear-gradient(to right, #ffffff, var(--color-bg-subtle));
        }
        .tc-task-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
        }
        .tc-task-col-left {
          display: flex;
          flex-direction: column;
          border-right: 1px solid var(--color-border);
        }
        .tc-task-col-right {
          display: flex;
          flex-direction: column;
        }
        .tc-task-box {
          padding: 20px 24px;
          display: flex;
          flex-direction: column;
        }
        .tc-task-box-top {
          min-height: auto;
        }
        .tc-task-box-bottom {
          min-height: auto;
        }
        .tc-task-q-scroll {
          max-height: 190px;
          overflow-y: auto;
          padding-right: 8px;
          flex: 1;
        }
        .tc-task-q-scroll::-webkit-scrollbar {
          width: 5px;
        }
        .tc-task-q-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .tc-task-q-scroll::-webkit-scrollbar-thumb {
          background: var(--color-border-strong);
          border-radius: 999px;
        }
        .tc-task-q-title {
          font-size: 0.9rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 10px;
          color: var(--color-text-primary);
          margin-bottom: 12px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        @media (max-width: 900px) {
          .tc-task-grid {
            grid-template-columns: 1fr;
          }
          .tc-task-col-left {
            border-right: none;
            border-bottom: 1px solid var(--color-border);
          }
          .tc-task-box {
            padding: 16px 20px;
            min-height: auto;
          }
          .tc-task-q-scroll {
            max-height: none;
            overflow-y: visible;
            padding-right: 0;
          }
        }
      `}</style>

      {/* Main Container */}
      <div className="tc-task-card-container">
        {/* Header bar */}
        <div className="tc-task-header-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              className="tc-btn tc-btn-secondary tc-btn-sm"
              onClick={() => navigate('/tasks')}
              style={{ display: 'inline-flex', alignItems: 'center' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="bold" style={{ fontSize: '1.1rem', color: 'var(--color-text-primary)' }}>{task.taskId}</span>
                <span style={{ color: 'var(--color-border-strong)' }}>|</span>
                <span className={`tc-badge ${getStatusColorClass(status)}`}>{status.replace('_', ' ')}</span>
              </div>
              <h1 className="tc-heading-lg" style={{ marginTop: '2px', fontWeight: 600, fontSize: '1.15rem' }}>{task.title}</h1>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {(user?.role === 'TEAM_LEAD' || user?.role === 'SUPER_ADMIN') && (
              <>
                <button className="tc-btn tc-btn-secondary tc-btn-sm" onClick={handleEditClick}>
                  Edit Task
                </button>
                <button className="tc-btn tc-btn-danger tc-btn-sm" onClick={handleDeleteTask}>
                  Delete
                </button>
              </>
            )}
          </div>
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="tc-task-grid">

          {/* Left Column: Description (top) & Acceptance Criteria (bottom) */}
          <div className="tc-task-col-left">
            {/* Top: Description */}
            <div className="tc-task-box tc-task-box-top">
              <h3 className="tc-task-q-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
                Description
              </h3>
              <div className="tc-task-q-scroll tc-body" style={{ color: 'var(--color-text-primary)', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
                {task.description || 'No description provided.'}
              </div>
            </div>

            <div className="tc-divider" style={{ margin: 0 }} />

            {/* Bottom: Acceptance Criteria */}
            <div className="tc-task-box tc-task-box-bottom">
              <h3 className="tc-task-q-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 11 12 14 22 4" />
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
                Acceptance Criteria
              </h3>
              <div className="tc-task-q-scroll" style={{
                padding: '10px 12px',
                background: 'var(--color-bg-subtle)',
                borderRadius: 'var(--radius-md)',
                border: '1px dashed var(--color-border)',
                whiteSpace: 'pre-wrap',
                lineHeight: '1.4',
                color: 'var(--color-text-primary)',
                fontSize: '0.85rem'
              }}>
                {task.acceptanceCriteria || 'No acceptance criteria specified.'}
              </div>
            </div>
          </div>

          {/* Right Column: Task Details (top) */}
          <div className="tc-task-col-right">
            <div className="tc-task-box" style={{ justifyContent: 'space-between' }}>
              <div>
                <h3 className="tc-task-q-title" style={{ marginBottom: '10px' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-warning)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  Task Details
                </h3>

                {/* Blocker Alert if Blocked */}
                {task.status === 'BLOCKED' && task.blockerDetails && (
                  <div style={{
                    background: 'var(--color-danger-bg)',
                    color: '#dc2626',
                    border: '1px solid rgba(220, 38, 38, 0.2)',
                    borderRadius: 'var(--radius-md)',
                    padding: '8px 10px',
                    marginBottom: '10px'
                  }}>
                    <div style={{ fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}>
                      🚨 Blocker Flagged
                    </div>
                    <div style={{ fontSize: '0.78rem', marginTop: '2px' }}>
                      <strong>Reason:</strong> {task.blockerDetails.reason}
                    </div>
                    <div style={{ fontSize: '0.78rem', marginTop: '2px' }}>
                      <strong>Type:</strong> {task.blockerDetails.dependencyType} | <strong>Exp. Fix:</strong> {new Date(task.blockerDetails.expectedResolutionDate).toLocaleDateString()}
                    </div>
                  </div>
                )}

                {/* Status Change Selector */}
                <div style={{ marginBottom: '10px' }}>
                  <label className="tc-form-label" style={{ marginBottom: '2px', display: 'block' }}>Task Status</label>
                  <select
                    className="tc-form-select"
                    value={status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    style={{ padding: '6px 8px', fontSize: '0.85rem' }}
                  >
                    <option value="PENDING">Pending</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    {user?.role !== 'CONTRIBUTOR' && <option value="BLOCKED">Blocked</option>}
                    <option value="COMPLETE">Complete</option>
                    <option value="DELAYED">Delayed</option>
                  </select>
                </div>
              </div>

              {/* Bottom Info Section */}
              <div>
                <div className="tc-divider" style={{ margin: '6px 0' }} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginTop: '6px' }}>
                  <div>
                    <div className="tc-caption" style={{ fontWeight: '600', fontSize: '0.68rem', marginBottom: '2px' }}>PRIORITY</div>
                    <span className={`tc-badge ${getPriorityColorClass(task.priority)}`} style={{ padding: '2px 6px', fontSize: '0.68rem' }}>
                      {task.priority}
                    </span>
                  </div>
                  <div>
                    <div className="tc-caption" style={{ fontWeight: '600', fontSize: '0.68rem' }}>START DATE</div>
                    <div style={{ fontWeight: '600', fontSize: '0.78rem', marginTop: '2px', color: 'var(--color-text-primary)' }}>
                      {new Date(task.targetStartDate).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <div className="tc-caption" style={{ fontWeight: '600', fontSize: '0.68rem' }}>TARGET END</div>
                    <div style={{
                      fontWeight: '600',
                      fontSize: '0.78rem',
                      marginTop: '2px',
                      color: task.status === 'DELAYED' ? 'var(--color-danger)' : 'var(--color-text-primary)'
                    }}>
                      {new Date(task.targetEndDate).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <div className="tc-caption" style={{ fontWeight: '600', fontSize: '0.68rem' }}>ACTUAL COMPLETION</div>
                    <div style={{
                      fontWeight: '600',
                      fontSize: '0.78rem',
                      marginTop: '2px',
                      color: 'var(--color-success)'
                    }}>
                      {task.actualCompletionDate ? new Date(task.actualCompletionDate).toLocaleDateString() : 'Not set'}
                    </div>
                  </div>
                </div>

                {(user?.role === 'CONTRIBUTOR' || user?.role === 'TEAM_LEAD' || user?.role === 'SUPER_ADMIN') && (
                  <div className="tc-form-group" style={{ marginTop: '10px' }}>
                    <label className="tc-form-label" style={{ fontSize: '0.68rem', fontWeight: '600' }}>UPDATE ACTUAL COMPLETION DATE</label>
                    <input
                      type="date"
                      className="tc-form-input"
                      value={actualDate}
                      onChange={handleActualDateChange}
                      style={{ padding: '4px 8px', fontSize: '0.82rem', marginTop: '2px' }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 2-Column Layout below for Blockers and Assignees */}
      <div style={{ display: 'grid', gridTemplateColumns: (user?.role === 'SUPER_ADMIN' || user?.role === 'TEAM_LEAD') ? '1fr 1fr' : '1fr', gap: '12px', marginTop: '12px', maxWidth: '1000px', margin: '12px auto 0' }}>

        {/* Critical Blockers Box */}
        <div className="tc-card">
          <div className="tc-card-body" style={{ padding: '14px 18px' }}>
            <h3 className="tc-task-q-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-danger)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Critical Blockers List ({task.blockers?.length || 0})
            </h3>

            {/* List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
              {!task.blockers || task.blockers.length === 0 ? (
                <div style={{ color: 'var(--color-text-secondary)', fontStyle: 'italic', fontSize: '0.8rem' }}>
                  No critical blockers reported.
                </div>
              ) : (
                task.blockers.map((b) => (
                  <div
                    key={b._id}
                    style={{
                      padding: '8px 12px',
                      background: 'var(--color-danger-bg)',
                      border: '1px solid rgba(220, 38, 38, 0.15)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px'
                    }}
                  >
                    <div style={{ fontWeight: '600', color: '#dc2626', fontSize: '0.82rem' }}>{b.reason}</div>
                    <div className="tc-caption" style={{ fontSize: '0.7rem' }}>
                      Added by {b.addedBy?.name || 'Unknown'} ({b.addedBy?.designation || 'N/A'}) on {new Date(b.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Add Blocker Input Box */}
            {(user?.role === 'CONTRIBUTOR' || user?.role === 'TEAM_LEAD' || user?.role === 'SUPER_ADMIN') && (
              <div style={{ position: 'relative' }}>
                {/* Mentioned users chips */}
                {mentionedUsers.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
                    {mentionedUsers.map(uid => {
                      const u = allMentionableUsers.find(x => x._id === uid);
                      return u ? (
                        <span key={uid} className="tc-badge tc-badge-blue" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.72rem' }}>
                          @{u.name}
                          <button type="button" style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 'bold', padding: 0, lineHeight: 1 }}
                            onClick={() => setMentionedUsers(prev => prev.filter(x => x !== uid))}>×</button>
                        </span>
                      ) : null;
                    })}
                  </div>
                )}
                <form onSubmit={handleAddBlockerSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ position: 'relative' }}>
                    <textarea
                      className="tc-form-textarea"
                      placeholder="Describe blocker... (type @ to mention someone, Shift+Enter for new line, Enter to submit)"
                      value={newBlockerReason}
                      onChange={handleBlockerInputChange}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          if (newBlockerReason.trim()) {
                            handleAddBlockerSubmit(e);
                          }
                        }
                        if (e.key === 'Escape') closeMentionPicker();
                      }}
                      rows={3}
                      required
                      style={{ width: '100%', resize: 'vertical', padding: '8px 10px', fontSize: '0.82rem', fontFamily: 'inherit', boxSizing: 'border-box' }}
                    />
                    {/* Mention Picker Dropdown - appears above the textarea */}
                    {mentionPickerOpen && (
                      <div style={{
                        position: 'absolute', bottom: '100%', left: 0, right: 0,
                        background: 'var(--color-bg-paper)',
                        border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
                        boxShadow: 'var(--shadow-card-hover)',
                        zIndex: 600, marginBottom: 4,
                        overflow: 'hidden'
                      }}>
                        {/* Picker Header */}
                        <div style={{
                          padding: '8px 10px', borderBottom: '1px solid var(--color-border)',
                          display: 'flex', flexDirection: 'column', gap: 6,
                          background: 'var(--color-bg-subtle)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>@ Mention a User</span>
                            <button
                              type="button"
                              onClick={closeMentionPicker}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', fontSize: '1rem', lineHeight: 1, padding: '0 2px' }}
                            >✕</button>
                          </div>
                          <input
                            type="text"
                            className="tc-form-input"
                            placeholder="Search by name..."
                            value={mentionQuery}
                            onChange={e => setMentionQuery(e.target.value)}
                            onKeyDown={e => e.stopPropagation()}
                            style={{ fontSize: '0.8rem', padding: '5px 8px' }}
                            autoFocus
                          />
                          <select
                            className="tc-form-select"
                            value={mentionDeptFilter}
                            onChange={e => setMentionDeptFilter(e.target.value)}
                            style={{ fontSize: '0.75rem', padding: '4px 6px' }}
                          >
                            <option value="">All Departments</option>
                            {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                          </select>
                        </div>
                        {/* User list */}
                        <div style={{ maxHeight: 180, overflowY: 'auto' }}>
                          {allMentionableUsers
                            .filter(u => !mentionQuery || u.name.toLowerCase().includes(mentionQuery.toLowerCase()))
                            .filter(u => !mentionDeptFilter || (u.department?._id || u.department) === mentionDeptFilter)
                            .slice(0, 10)
                            .map(u => (
                              <div
                                key={u._id}
                                onClick={() => handleSelectMention(u)}
                                style={{
                                  padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                                  background: mentionedUsers.includes(u._id) ? 'rgba(59,130,246,0.08)' : 'transparent',
                                  transition: 'background 0.15s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg-subtle)'}
                                onMouseLeave={e => e.currentTarget.style.background = mentionedUsers.includes(u._id) ? 'rgba(59,130,246,0.08)' : 'transparent'}
                              >
                                <div style={{
                                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                                  background: 'var(--color-brand-primary)', color: 'white',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontWeight: 700, fontSize: '0.75rem'
                                }}>
                                  {u.name[0].toUpperCase()}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontWeight: 600, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    {u.name}
                                    {mentionedUsers.includes(u._id) && <span style={{ color: 'var(--color-success)', fontSize: '0.7rem' }}>✓ added</span>}
                                  </div>
                                  <div style={{ fontSize: '0.68rem', color: 'var(--color-text-secondary)' }}>{u.designation} · {u.department?.name || 'N/A'}</div>
                                </div>
                              </div>
                            ))
                          }
                          {allMentionableUsers.filter(u =>
                            (!mentionQuery || u.name.toLowerCase().includes(mentionQuery.toLowerCase())) &&
                            (!mentionDeptFilter || (u.department?._id || u.department) === mentionDeptFilter)
                          ).length === 0 && (
                              <div style={{ padding: '16px', color: 'var(--color-text-secondary)', fontSize: '0.8rem', textAlign: 'center' }}>No users found</div>
                            )}
                        </div>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="submit" className="tc-btn tc-btn-danger tc-btn-sm" style={{ padding: '6px 14px' }}>
                      Add Blocker
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Assigned Contributors Box (only for SUPER_ADMIN or TEAM_LEAD) */}
        {(user?.role === 'SUPER_ADMIN' || user?.role === 'TEAM_LEAD') && (
          <div className="tc-card">
            <div className="tc-card-body" style={{ padding: '14px 18px' }}>
              <h3 className="tc-task-q-title" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand-secondary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  Assignees ({task.assignedContributors?.length || 0})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setPickerMode('direct');
                    setSearchQuery('');
                    setSelectedDept('');
                    setPickerOpen(true);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-brand-primary)',
                    cursor: 'pointer',
                    fontSize: '1.2rem',
                    fontWeight: 'bold',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: 1,
                    padding: '2px 8px'
                  }}
                  title="Assign Contributors"
                >
                  +
                </button>
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
                {task.assignedContributors?.length === 0 ? (
                  <div style={{ color: 'var(--color-text-secondary)', fontStyle: 'italic', fontSize: '0.8rem' }}>
                    No assignees assigned.
                  </div>
                ) : (
                  task.assignedContributors.map(c => (
                    <div
                      key={c._id}
                      onClick={() => navigate(`/users/${c._id}`)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '6px 10px',
                        background: 'var(--color-bg-subtle)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-border)',
                        cursor: 'pointer'
                      }}
                    >
                      <div className="tc-avatar-sm" style={{ background: 'var(--color-brand-primary)', color: 'white', fontWeight: '600' }}>
                        {c.name[0].toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: '600', color: 'var(--color-text-primary)' }}>{c.name}</div>
                        <div className="tc-caption" style={{ fontSize: '0.7rem' }}>{c.designation}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Day Status Box */}
        <div className="tc-card">
          <div className="tc-card-body" style={{ padding: '14px 18px' }}>
            <h3 className="tc-task-q-title" style={{ marginBottom: '10px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-warning)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              Daily Status Updates ({task.dayStatuses?.length || 0})
            </h3>

            {/* Add New Day Status */}
            {(user?.role === 'TEAM_LEAD' || user?.role === 'CONTRIBUTOR') && (
              <form onSubmit={handleAddDayStatusSubmit} style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input
                    type="date"
                    className="tc-form-input"
                    style={{ flex: '0 0 auto', width: '150px' }}
                    value={newDayStatusDate}
                    onChange={(e) => setNewDayStatusDate(e.target.value)}
                  />
                  <input
                    type="text"
                    className="tc-form-input"
                    style={{ flex: 1 }}
                    placeholder="What did you accomplish today?"
                    value={newDayStatus}
                    onChange={(e) => setNewDayStatus(e.target.value)}
                    required
                  />
                  <button type="submit" className="tc-btn tc-btn-primary tc-btn-sm">
                    Add
                  </button>
                </div>
              </form>
            )}

            {/* Day Status List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' }}>
              {!task.dayStatuses || task.dayStatuses.length === 0 ? (
                <div style={{ color: 'var(--color-text-secondary)', fontStyle: 'italic', fontSize: '0.8rem' }}>
                  No daily status updates yet.
                </div>
              ) : (
                [...task.dayStatuses].sort((a, b) => new Date(b.date) - new Date(a.date)).map((ds) => (
                  <div
                    key={ds._id}
                    style={{
                      padding: '10px 12px',
                      background: 'var(--color-bg-subtle)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)',
                      position: 'relative'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--color-text-primary)' }}>
                          {new Date(ds.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)' }}>
                          by {ds.addedBy?.name || 'Unknown'} at {new Date(ds.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                      {(user?.role === 'SUPER_ADMIN' || user?.role === 'MANAGEMENT' || (ds.addedBy?._id || ds.addedBy) === (user?._id || user?.id)) && (
                        <button
                          type="button"
                          onClick={() => handleDeleteDayStatus(ds._id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--color-danger)',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            padding: '2px 6px',
                            fontWeight: 'bold'
                          }}
                          title="Delete"
                        >
                          ×
                        </button>
                      )}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-primary)', whiteSpace: 'pre-wrap' }}>
                      {ds.status}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Blocker Modal */}
      {blockerOpen && (
        <div className="tc-modal-overlay">
          <div className="tc-modal" style={{ maxWidth: '500px' }}>
            <div className="tc-modal-header">
              <h2 className="tc-heading-lg" style={{ color: 'var(--color-danger)' }}>Report Critical Blocker</h2>
            </div>
            <form onSubmit={handleBlockerSubmit}>
              <p className="tc-body" style={{ marginBottom: '20px' }}>This will flag the task as blocked for the team lead.</p>
              <div className="tc-form-group" style={{ marginBottom: '16px' }}>
                <label className="tc-form-label">Reason for Blocker *</label>
                <input
                  type="text"
                  className="tc-form-input"
                  value={blockerForm.reason}
                  onChange={(e) => setBlockerForm({ ...blockerForm, reason: e.target.value })}
                  required
                  autoFocus
                />
              </div>
              <div className="tc-form-group" style={{ marginBottom: '16px' }}>
                <label className="tc-form-label">Dependency Type</label>
                <select
                  className="tc-form-select"
                  value={blockerForm.dependencyType}
                  onChange={(e) => setBlockerForm({ ...blockerForm, dependencyType: e.target.value })}
                >
                  <option value="Technical">Technical Issue</option>
                  <option value="Deployment Access">Missing Credentials / Access</option>
                  <option value="Third Party API">Third Party Dependency</option>
                  <option value="Design Assets">Pending Design Assets</option>
                </select>
              </div>
              <div className="tc-form-group" style={{ marginBottom: '16px' }}>
                <label className="tc-form-label">Expected Resolution Date *</label>
                <input
                  type="date"
                  className="tc-form-input"
                  value={blockerForm.expectedResolutionDate}
                  onChange={(e) => setBlockerForm({ ...blockerForm, expectedResolutionDate: e.target.value })}
                  required
                />
              </div>
              <div className="tc-modal-footer">
                <button type="button" className="tc-btn tc-btn-secondary" onClick={() => setBlockerOpen(false)}>Cancel</button>
                <button type="submit" className="tc-btn tc-btn-danger">Block Task</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {editTaskOpen && (
        <div className="tc-modal-overlay">
          <div className="tc-modal" style={{ maxWidth: '600px' }}>
            <div className="tc-modal-header">
              <h2 className="tc-heading-lg">Edit Task Details</h2>
            </div>
            <form onSubmit={handleEditTaskSubmit}>
              <div className="tc-form-group" style={{ marginBottom: '16px' }}>
                <label className="tc-form-label">Task Title</label>
                <input
                  type="text"
                  className="tc-form-input"
                  name="title"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  required
                  autoFocus
                />
              </div>
              <div className="tc-form-group" style={{ marginBottom: '16px' }}>
                <label className="tc-form-label">Description</label>
                <textarea
                  className="tc-form-textarea"
                  name="description"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="tc-form-group" style={{ marginBottom: '16px' }}>
                <label className="tc-form-label">Acceptance Criteria</label>
                <textarea
                  className="tc-form-textarea"
                  name="acceptanceCriteria"
                  value={editForm.acceptanceCriteria}
                  onChange={(e) => setEditForm({ ...editForm, acceptanceCriteria: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="tc-grid-2" style={{ marginBottom: '16px' }}>
                <div className="tc-form-group">
                  <label className="tc-form-label">Select SDLC Phase</label>
                  <select
                    className="tc-form-select"
                    name="phase"
                    value={editForm.phase}
                    onChange={(e) => setEditForm({ ...editForm, phase: e.target.value })}
                    required
                  >
                    {projectPhases.map(ph => <option key={ph._id} value={ph._id}>{ph.name}</option>)}
                  </select>
                </div>
                <div className="tc-form-group">
                  <label className="tc-form-label">Priority</label>
                  <select
                    className="tc-form-select"
                    name="priority"
                    value={editForm.priority}
                    onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>
              {(user?.role === 'SUPER_ADMIN' || user?.role === 'TEAM_LEAD') && (
                <div className="tc-form-group" style={{ marginBottom: '16px' }}>
                  <label className="tc-form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    Assign Contributors
                    <button
                      type="button"
                      className="tc-btn tc-btn-primary tc-btn-xs"
                      onClick={() => {
                        setPickerMode('edit');
                        setSearchQuery('');
                        setSelectedDept('');
                        setPickerOpen(true);
                      }}
                    >
                      + Add Contributor
                    </button>
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                    {editForm.assignedContributors.map(id => {
                      const match = availableUsers.find(u => u._id === id);
                      return match ? (
                        <span key={id} className="tc-badge tc-badge-blue" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          {match.name}
                          <button
                            type="button"
                            style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 'bold' }}
                            onClick={() => {
                              setEditForm({ ...editForm, assignedContributors: editForm.assignedContributors.filter(x => x !== id) });
                            }}
                          >
                            ×
                          </button>
                        </span>
                      ) : null;
                    })}
                    {editForm.assignedContributors.length === 0 && (
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                        No contributors selected. Click "+ Add Contributor" to search and add.
                      </span>
                    )}
                  </div>
                </div>
              )}
              <div className="tc-grid-2" style={{ marginBottom: '16px' }}>
                <div className="tc-form-group">
                  <label className="tc-form-label">Start Date</label>
                  <input
                    type="date"
                    className="tc-form-input"
                    name="targetStartDate"
                    value={editForm.targetStartDate}
                    onChange={(e) => setEditForm({ ...editForm, targetStartDate: e.target.value })}
                    required
                  />
                </div>
                <div className="tc-form-group">
                  <label className="tc-form-label">Target End Date</label>
                  <input
                    type="date"
                    className="tc-form-input"
                    name="targetEndDate"
                    value={editForm.targetEndDate}
                    onChange={(e) => setEditForm({ ...editForm, targetEndDate: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="tc-modal-footer">
                <button type="button" className="tc-btn tc-btn-secondary" onClick={() => setEditTaskOpen(false)}>Cancel</button>
                <button type="submit" className="tc-btn tc-btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contributor Picker Modal */}
      {pickerOpen && (
        <div className="tc-modal-overlay" style={{ zIndex: 400 }}>
          <div className="tc-modal" style={{ maxWidth: '480px' }}>
            <div className="tc-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 className="tc-heading-md" style={{ margin: 0 }}>Select Employee</h2>
              <button
                type="button"
                className="tc-btn tc-btn-secondary tc-btn-xs"
                onClick={() => setPickerOpen(false)}
                style={{ minWidth: 'auto', padding: '4px 8px' }}
              >
                ✕
              </button>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
              <input
                type="text"
                className="tc-form-input"
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
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
            <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
              {availableUsers
                .filter(u => u.role === 'CONTRIBUTOR' || u.role === 'TEAM_LEAD')
                .filter(u => !searchQuery || u.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .filter(u => !selectedDept || (u.department?._id || u.department) === selectedDept)
                .map(u => {
                  let isSelected = false;
                  if (pickerMode === 'create') {
                    isSelected = createForm.assignedContributors.includes(u._id);
                  } else if (pickerMode === 'edit') {
                    isSelected = editForm.assignedContributors.includes(u._id);
                  } else if (pickerMode === 'direct') {
                    isSelected = task.assignedContributors?.some(c => (c._id || c) === u._id);
                  }

                  const handleSelect = async () => {
                    if (pickerMode === 'create') {
                      const updated = isSelected
                        ? createForm.assignedContributors.filter(id => id !== u._id)
                        : [...createForm.assignedContributors, u._id];
                      setCreateForm({ ...createForm, assignedContributors: updated });
                      setPickerOpen(false);
                    } else if (pickerMode === 'edit') {
                      const updated = isSelected
                        ? editForm.assignedContributors.filter(id => id !== u._id)
                        : [...editForm.assignedContributors, u._id];
                      setEditForm({ ...editForm, assignedContributors: updated });
                      setPickerOpen(false);
                    } else if (pickerMode === 'direct') {
                      if (isSelected) {
                        alert(`${u.name} is already assigned to this task.`);
                        return;
                      }
                      const currentIds = task.assignedContributors.map(c => c._id || c);
                      const newIds = [...currentIds, u._id];
                      try {
                        await apiService(`/tasks/${id}/assign`, {
                          method: 'POST',
                          body: JSON.stringify({ contributorIds: newIds })
                        });
                        alert(`Assigned ${u.name} successfully!`);
                        setPickerOpen(false);
                        loadData();
                      } catch (err) {
                        alert(err.message || 'Failed to assign contributor');
                      }
                    }
                  };

                  return (
                    <div
                      key={u._id}
                      onClick={handleSelect}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '8px 12px',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        background: isSelected ? 'var(--color-info-bg)' : 'var(--color-bg-paper)',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--color-brand-primary)'; }}
                      onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
                    >
                      <div className="tc-avatar-sm" style={{ background: 'var(--color-brand-primary)', color: 'white', fontWeight: '600' }}>
                        {u.name[0].toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: '600', color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {u.name} {isSelected && <span style={{ color: 'var(--color-brand-primary)' }}>✓</span>}
                        </div>
                        <div className="tc-caption" style={{ fontSize: '0.72rem' }}>
                          {u.designation} | {u.department?.name || 'No Department'} | {u.role.replace('_', ' ')}
                        </div>
                      </div>
                    </div>
                  );
                })}
              {availableUsers
                .filter(u => u.role === 'CONTRIBUTOR' || u.role === 'TEAM_LEAD')
                .filter(u => !searchQuery || u.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .filter(u => !selectedDept || (u.department?._id || u.department) === selectedDept).length === 0 && (
                  <div style={{ textAlign: 'center', padding: '16px', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                    No matching employees found.
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskDetails;
