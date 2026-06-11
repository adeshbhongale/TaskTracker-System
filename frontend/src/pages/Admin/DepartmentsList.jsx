import React, { useEffect, useState } from 'react';
import apiService from '../../services/api';

const DepartmentsList = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Dialog open
  const [open, setOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [name, setName] = useState('');
  const [status, setStatus] = useState('ACTIVE');

  const loadData = async () => {
    setLoading(true);
    try {
      const depts = await apiService('/departments');
      setDepartments(depts);
    } catch (err) {
      console.error('Error fetching departments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleOpenCreate = () => {
    setEditingDept(null); setName(''); setStatus('ACTIVE'); setOpen(true);
  };

  const handleOpenEdit = (dept) => {
    setEditingDept(dept); setName(dept.name); setStatus(dept.status); setOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      if (editingDept) {
        await apiService(`/departments/${editingDept._id}`, { method: 'PUT', body: JSON.stringify({ name, status }) });
      } else {
        await apiService('/departments', { method: 'POST', body: JSON.stringify({ name }) });
      }
      setOpen(false); loadData();
    } catch (err) { alert(err.message || 'Failed to save department'); }
  };

  const handleDelete = async (deptId) => {
    if (!window.confirm('Are you sure you want to delete this department?')) return;
    try {
      await apiService(`/departments/${deptId}`, { method: 'DELETE' });
      loadData();
    } catch (err) { alert(err.message || 'Failed to delete department'); }
  };

  return (
    <div className="tc-fade-in">
      <div className="tc-page-header">
        <div>
          <h1 className="tc-heading-xl">Department Settings</h1>
          <p className="tc-body" style={{ marginTop: 4 }}>Manage organization departments to partition Contributors and Team Leads.</p>
        </div>
        <button className="tc-btn tc-btn-primary" onClick={handleOpenCreate}>
          + Create Department
        </button>
      </div>

      <div className="tc-card">
        <div className="tc-card-body" style={{ padding: '0 0 4px' }}>
          {loading ? (
            <div className="tc-loading-page" style={{ minHeight: '40vh' }}><div className="tc-spinner" /></div>
          ) : (
            <div className="tc-table-wrap" style={{ border: 'none', borderRadius: 0 }}>
              <table className="tc-table">
                <thead>
                  <tr>
                    <th>Department Name</th>
                    <th>Status</th>
                    <th>Created Date</th>
                    <th className="right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {departments.map((dept) => (
                    <tr key={dept._id}>
                      <td className="bold">{dept.name}</td>
                      <td>
                        <span className={`tc-badge ${dept.status === 'ACTIVE' ? 'tc-badge-green' : 'tc-badge-gray'}`}>
                          {dept.status}
                        </span>
                      </td>
                      <td>{new Date(dept.createdAt).toLocaleDateString()}</td>
                      <td className="right">
                        <button className="tc-icon-btn" onClick={() => handleOpenEdit(dept)} title="Edit Department" style={{ display: 'inline-flex', width: 32, height: 32 }}>
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--color-brand-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button className="tc-icon-btn" onClick={() => handleDelete(dept._id)} title="Delete Department" style={{ display: 'inline-flex', width: 32, height: 32, marginLeft: 4 }}>
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--color-danger)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {departments.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-secondary)' }}>No departments created yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Edit/Create Modal */}
      {open && (
        <div className="tc-modal-overlay">
          <div className="tc-modal" style={{ maxWidth: 400 }}>
            <div className="tc-modal-header">
              <h2 className="tc-heading-lg">{editingDept ? 'Edit Department' : 'Create New Department'}</h2>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="tc-form-group" style={{ marginBottom: 16 }}>
                <label className="tc-form-label">Department Name</label>
                <input autoFocus type="text" className="tc-form-input" value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. MERN, QA, DevOps" />
              </div>

              {editingDept && (
                <div className="tc-form-group">
                  <label className="tc-form-label">Status</label>
                  <select className="tc-form-select" value={status} onChange={e => setStatus(e.target.value)}>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              )}

              <div className="tc-modal-footer">
                <button type="button" className="tc-btn tc-btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
                <button type="submit" className="tc-btn tc-btn-primary">{editingDept ? 'Save Changes' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentsList;
