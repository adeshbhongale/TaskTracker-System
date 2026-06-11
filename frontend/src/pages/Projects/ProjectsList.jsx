import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import apiService from '../../services/api';

const ProjectsList = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const [projects, setProjects] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [department, setDepartment] = useState('');
  const [search, setSearch] = useState('');

  // Create Project Modal
  const [projOpen, setProjOpen] = useState(false);
  const [projForm, setProjForm] = useState({ name: '', description: '', priority: 'MEDIUM', department: '', startDate: '', targetEndDate: '', documentationUrl: '' });

  const loadData = async () => {
    setLoading(true);
    try {
      const qParams = [];
      if (status) qParams.push(`status=${status}`);
      if (priority) qParams.push(`priority=${priority}`);
      if (department) qParams.push(`department=${department}`);
      if (search) qParams.push(`search=${search}`);
      const qString = qParams.length > 0 ? `?${qParams.join('&')}` : '';

      const list = await apiService(`/projects${qString}`);
      setProjects(list);

      const depts = await apiService('/departments?status=ACTIVE');
      setDepartments(depts);
    } catch (err) { console.error('Error fetching projects:', err); } 
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [status, priority, department]);

  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter') loadData();
  };

  const handleProjSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiService('/projects', { method: 'POST', body: JSON.stringify(projForm) });
      setProjOpen(false);
      setProjForm({ name: '', description: '', priority: 'MEDIUM', department: '', startDate: '', targetEndDate: '', documentationUrl: '' });
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to create project');
    }
  };

  return (
    <div className="tc-fade-in">
      <div className="tc-page-header">
        <div>
          <h1 className="tc-heading-xl">Enterprise Projects</h1>
          <p className="tc-body" style={{ marginTop: 4 }}>Monitor project pipelines, SDLC milestones, and check weighted delivery efficiencies.</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="tc-btn tc-btn-secondary" onClick={loadData}>
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            Refresh
          </button>
          {user?.role === 'TEAM_LEAD' && (
            <button className="tc-btn tc-btn-primary" onClick={() => setProjOpen(true)}>
              + Create Project
            </button>
          )}
        </div>
      </div>

      {/* Filter Card */}
      <div className="tc-card" style={{ marginBottom: 24 }}>
        <div className="tc-card-body">
          <div className="tc-grid-4">
            <div className="tc-form-group">
              <label className="tc-form-label">Search Code or Name</label>
              <input type="text" className="tc-form-input" value={search} onChange={e => setSearch(e.target.value)} onKeyPress={handleSearchKeyPress} placeholder="Press Enter to search" />
            </div>
            <div className="tc-form-group">
              <label className="tc-form-label">Status</label>
              <select className="tc-form-select" value={status} onChange={e => setStatus(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="NOT_STARTED">Not Started</option><option value="IN_PROGRESS">In Progress</option>
                <option value="BLOCKED">Blocked</option><option value="COMPLETED">Completed</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
            <div className="tc-form-group">
              <label className="tc-form-label">Priority</label>
              <select className="tc-form-select" value={priority} onChange={e => setPriority(e.target.value)}>
                <option value="">All Priorities</option>
                <option value="LOW">Low</option><option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option><option value="CRITICAL">Critical</option>
              </select>
            </div>
            <div className="tc-form-group">
              <label className="tc-form-label">Department</label>
              <select className="tc-form-select" value={department} onChange={e => setDepartment(e.target.value)}>
                <option value="">All Departments</option>
                {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Projects List Card */}
      <div className="tc-card">
        <div className="tc-card-body" style={{ padding: '0 0 4px' }}>
          {loading ? (
            <div className="tc-loading-page" style={{ minHeight: '40vh' }}><div className="tc-spinner" /></div>
          ) : (
            <div className="tc-table-wrap" style={{ border: 'none', borderRadius: 0 }}>
              <table className="tc-table">
                <thead>
                  <tr>
                    <th>Project Code</th>
                    <th>Project Name</th>
                    <th>Team Lead</th>
                    <th>Department</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Efficiency %</th>
                    <th className="right">Due Date</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((proj) => {
                    let priorityColor = 'tc-badge-gray';
                    if (proj.priority === 'CRITICAL') priorityColor = 'tc-badge-red';
                    else if (proj.priority === 'HIGH') priorityColor = 'tc-badge-amber';
                    else if (proj.priority === 'MEDIUM') priorityColor = 'tc-badge-blue';
                    else if (proj.priority === 'LOW') priorityColor = 'tc-badge-gray';

                    let statusColor = 'tc-badge-gray';
                    if (proj.status === 'COMPLETE' || proj.status === 'COMPLETED') statusColor = 'tc-badge-green';
                    else if (proj.status === 'IN_PROGRESS' || proj.status === 'ACTIVE') statusColor = 'tc-badge-blue';
                    else if (proj.status === 'BLOCKED' || proj.status === 'DELAYED') statusColor = 'tc-badge-red';

                    return (
                      <tr key={proj._id} onClick={() => navigate(`/projects/${proj._id}`)}>
                        <td className="bold">{proj.projectCode}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{proj.name}</div>
                          <div className="tc-caption" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {proj.description || 'No description'}
                          </div>
                        </td>
                        <td>{proj.createdBy?.name || 'N/A'}</td>
                        <td>{proj.department ? proj.department.name : 'N/A'}</td>
                        <td><span className={`tc-badge ${priorityColor}`}>{proj.priority}</span></td>
                        <td><span className={`tc-badge ${statusColor}`}>{proj.status}</span></td>
                        <td style={{ width: 140 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div className="tc-progress-bg" style={{ flex: 1 }}>
                              <div className="tc-progress-fill green" style={{ width: `${proj.efficiency || 0}%` }} />
                            </div>
                            <div style={{ fontWeight: 700, color: 'var(--color-success)', fontSize: '0.8rem', minWidth: 35 }}>
                              {proj.efficiency || 0}%
                            </div>
                          </div>
                        </td>
                        <td className="right">{new Date(proj.targetEndDate).toLocaleDateString()}</td>
                      </tr>
                    );
                  })}
                  {projects.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-secondary)' }}>No projects found matching filter selections.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>


      {/* Create Project Modal */}
      {projOpen && (
        <div className="tc-modal-overlay">
          <div className="tc-modal" style={{ maxWidth: 600 }}>
            <div className="tc-modal-header border-b border-[var(--color-border)] pb-4 mb-5">
              <h2 className="tc-heading-lg text-[var(--color-brand-primary)] flex items-center gap-2">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
                  <line x1="12" y1="8" x2="12" y2="16"/>
                  <line x1="8" y1="12" x2="16" y2="12"/>
                </svg>
                Create New Project
              </h2>
              <p className="tc-caption mt-1">Initialize a new SDLC tracking pipeline & milestones</p>
            </div>
            <form onSubmit={handleProjSubmit} className="flex flex-col gap-4">
              <div className="tc-form-group">
                <label className="tc-form-label">Project Name *</label>
                <input type="text" className="tc-form-input" name="name" value={projForm.name} onChange={e => setProjForm({ ...projForm, name: e.target.value })} required autoFocus placeholder="e.g. Database Scaling Phase 2" />
              </div>
              <div className="tc-form-group">
                <label className="tc-form-label">Description</label>
                <textarea className="tc-form-textarea" name="description" rows="3" value={projForm.description} onChange={e => setProjForm({ ...projForm, description: e.target.value })} placeholder="Provide a high-level overview of the project objectives..." />
              </div>
              <div className="tc-form-group">
                <label className="tc-form-label">Documentation URL</label>
                <input type="url" className="tc-form-input" name="documentationUrl" value={projForm.documentationUrl} onChange={e => setProjForm({ ...projForm, documentationUrl: e.target.value })} placeholder="https://confluence.company.com/project" />
              </div>
              <div className="tc-grid-2">
                <div className="tc-form-group">
                  <label className="tc-form-label">Department *</label>
                  <select className="tc-form-select" name="department" value={projForm.department} onChange={e => setProjForm({ ...projForm, department: e.target.value })} required>
                    <option value="" disabled>Select Department</option>
                    {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="tc-form-group">
                  <label className="tc-form-label">Priority</label>
                  <select className="tc-form-select" name="priority" value={projForm.priority} onChange={e => setProjForm({ ...projForm, priority: e.target.value })}>
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>
              <div className="tc-grid-2">
                <div className="tc-form-group">
                  <label className="tc-form-label">Start Date *</label>
                  <input type="date" className="tc-form-input" name="startDate" value={projForm.startDate} onChange={e => setProjForm({ ...projForm, startDate: e.target.value })} required />
                </div>
                <div className="tc-form-group">
                  <label className="tc-form-label">Target End *</label>
                  <input type="date" className="tc-form-input" name="targetEndDate" value={projForm.targetEndDate} onChange={e => setProjForm({ ...projForm, targetEndDate: e.target.value })} required />
                </div>
              </div>
              <div className="tc-modal-footer border-t border-[var(--color-border)] pt-4 mt-2">
                <button type="button" className="tc-btn tc-btn-secondary" onClick={() => setProjOpen(false)}>Cancel</button>
                <button type="submit" className="tc-btn tc-btn-primary px-6">Create Project</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectsList;
