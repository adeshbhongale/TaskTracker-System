import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import apiService from '../../services/api';

const UsersList = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [editOpen, setEditOpen] = useState(false);
  const [passOpen, setPassOpen] = useState(false);
  const [editPersonalOpen, setEditPersonalOpen] = useState(false);

  // Modal Data
  const [targetUser, setTargetUser] = useState(null);
  const [role, setRole] = useState('');
  const [dept, setDept] = useState('');
  const [newPass, setNewPass] = useState('');
  const [personalForm, setPersonalForm] = useState({ name: '', email: '', designation: '', phone: '' });
  const [userEfficiencies, setUserEfficiencies] = useState({});

  const loadData = async () => {
    setLoading(true);
    try {
      const qParams = [];
      if (filterRole) qParams.push(`role=${filterRole}`);
      if (filterStatus) qParams.push(`status=${filterStatus}`);
      if (filterDepartment) qParams.push(`department=${filterDepartment}`);

      const qString = qParams.length > 0 ? `?${qParams.join('&')}` : '';

      const uList = await apiService(`/users${qString}`);

      // Filter by search query if provided
      const filteredUsers = searchQuery
        ? uList.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()))
        : uList;

      setUsers(filteredUsers);

      const dList = await apiService('/departments');
      setDepartments(dList);

      // Load efficiencies for all users
      const efficiencies = {};
      for (const u of filteredUsers) {
        try {
          const effData = await apiService(`/users/${u._id}/efficiency`);
          efficiencies[u._id] = effData.efficiency;
        } catch (e) {
          efficiencies[u._id] = 0;
        }
      }
      setUserEfficiencies(efficiencies);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [filterRole, filterStatus, filterDepartment, searchQuery]);

  const handleEditClick = (u) => {
    setTargetUser(u); setRole(u.role); setDept(u.department?._id || ''); setEditOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiService('/assign-role', { method: 'PATCH', body: JSON.stringify({ userId: targetUser._id, role }) });
      if (role === 'CONTRIBUTOR' || role === 'TEAM_LEAD') {
        await apiService('/assign-department', { method: 'PATCH', body: JSON.stringify({ userId: targetUser._id, departmentId: dept || null }) });
      }
      setEditOpen(false); setTargetUser(null); loadData();
    } catch (err) { alert(err.message || 'Failed to update user assignments'); }
  };

  const handleEditPersonalClick = (u) => {
    setTargetUser(u);
    setPersonalForm({
      name: u.name,
      email: u.email,
      designation: u.designation,
      phone: u.phone
    });
    setEditPersonalOpen(true);
  };

  const handleEditPersonalSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiService(`/users/${targetUser._id}`, { method: 'PATCH', body: JSON.stringify(personalForm) });
      setEditPersonalOpen(false); setTargetUser(null); loadData();
    } catch (err) { alert(err.message || 'Failed to update user info'); }
  };

  const handleDeactivate = async (userId) => {
    if (!window.confirm('Are you sure you want to deactivate this employee account?')) return;
    try {
      await apiService(`/users/${userId}`, { method: 'DELETE' });
      loadData();
    } catch (err) { alert(err.message || 'Deactivation failed'); }
  };

  const handlePassClick = (u) => {
    setTargetUser(u); setNewPass(''); setPassOpen(true);
  };

  const handlePassSubmit = async (e) => {
    e.preventDefault();
    if (newPass.length < 8) return alert('Password must be at least 8 characters long.');
    try {
      await apiService('/users/reset-password', { method: 'POST', body: JSON.stringify({ userId: targetUser._id, newPassword: newPass }) });
      setPassOpen(false); setTargetUser(null); alert('Password reset successfully.');
    } catch (err) { alert(err.message || 'Password reset failed'); }
  };

  const handleApproveClick = async (u) => {
    if (!window.confirm(`Are you sure you want to approve ${u.name}?`)) return;
    try {
      // Assign a default role (CONTRIBUTOR) when approving
      await apiService('/assign-role', {
        method: 'PATCH',
        body: JSON.stringify({ userId: u._id, role: 'CONTRIBUTOR' })
      });
      loadData();
    } catch (err) { alert(err.message || 'Failed to approve user'); }
  };

  return (
    <div className="tc-fade-in">
      <div className="tc-page-header">
        <div>
          <h1 className="tc-heading-xl">Employee Directory</h1>
          <p className="tc-body" style={{ marginTop: 4 }}>Review onboarding registrations, update organizational roles, and audit access permissions.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="tc-btn tc-btn-secondary tc-btn-sm" onClick={loadData}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6M1 20v-6h6" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Filter Card */}
      <div className="tc-card" style={{ marginBottom: 24 }}>
        <div className="tc-card-body">
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div className="tc-form-group" style={{ flex: 1, minWidth: '200px', marginBottom: 0 }}>
              <label className="tc-form-label">Search by Name</label>
              <input
                type="text"
                className="tc-form-input"
                placeholder="Search employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="tc-form-group" style={{ minWidth: '200px', marginBottom: 0 }}>
              <label className="tc-form-label">Filter by Role</label>
              <select className="tc-form-select" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
                <option value="">All Roles</option>
                <option value="NORMAL_USER">User (Pending)</option>
                <option value="CONTRIBUTOR">Contributor</option>
                <option value="TEAM_LEAD">Team Lead</option>
                <option value="MANAGEMENT">Management</option>
              </select>
            </div>
            <div className="tc-form-group" style={{ minWidth: '200px', marginBottom: 0 }}>
              <label className="tc-form-label">Filter by Department</label>
              <select className="tc-form-select" value={filterDepartment} onChange={e => setFilterDepartment(e.target.value)}>
                <option value="">All Departments</option>
                {departments.map(d => (
                  <option key={d._id} value={d._id}>{d.name}</option>
                ))}
              </select>
            </div>
            {user?.role === 'SUPER_ADMIN' && (
              <div className="tc-form-group" style={{ minWidth: '200px', marginBottom: 0 }}>
                <label className="tc-form-label">Filter by Status</label>
                <select className="tc-form-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                  <option value="">All Statuses</option>
                  <option value="PENDING">Pending Approval</option>
                  <option value="APPROVED">Approved / Active</option>
                  <option value="DEACTIVATED">Deactivated</option>
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="tc-card">
        <div className="tc-card-body" style={{ padding: '0 0 4px' }}>
          {loading ? (
            <div className="tc-loading-page" style={{ minHeight: '40vh' }}><div className="tc-spinner" /></div>
          ) : (
            <div className="tc-table-wrap" style={{ border: 'none', borderRadius: 0 }}>
              <table className="tc-table">
                <thead>
                  <tr>
                    <th>Employee ID</th>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Department</th>
                    <th>Status</th>
                    <th>Efficiency</th>
                    {user?.role === 'SUPER_ADMIN' && <th className="right">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    let statusColor = 'tc-badge-gray';
                    if (u.approvalStatus === 'APPROVED') statusColor = 'tc-badge-green';
                    else if (u.approvalStatus === 'PENDING') statusColor = 'tc-badge-amber';
                    else if (u.approvalStatus === 'DEACTIVATED') statusColor = 'tc-badge-red';

                    const efficiency = userEfficiencies[u._id] ?? 0;
                    const efficiencyColor = efficiency >= 80 ? 'var(--color-success)' : efficiency >= 50 ? 'var(--color-warning)' : 'var(--color-danger)';

                    return (
                      <tr
                        key={u._id}
                        onClick={(e) => {
                          if (e.target.closest('.tc-icon-btn') || e.target.closest('.tc-btn')) return;
                          if (u.role === 'CONTRIBUTOR' || u.role === 'TEAM_LEAD') {
                            navigate(`/users/${u._id}`);
                          }
                        }}
                        style={{ cursor: (u.role === 'CONTRIBUTOR' || u.role === 'TEAM_LEAD') ? 'pointer' : 'default' }}
                      >
                        <td className="bold">{u.employeeId}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{u.name}</div>
                          <div className="tc-caption">{u.email}</div>
                        </td>
                        <td>{u.role.replace('_', ' ')}</td>
                        <td>{u.department ? u.department.name : 'N/A'}</td>
                        <td><span className={`tc-badge ${statusColor}`}>{u.approvalStatus}</span></td>
                        <td>
                          <span style={{ fontWeight: 700, color: efficiencyColor }}>{efficiency}%</span>
                        </td>
                        {user?.role === 'SUPER_ADMIN' && (
                          <td className="right" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            {u.approvalStatus === 'PENDING' && (
                              <button
                                className="tc-btn tc-btn-primary tc-btn-sm"
                                onClick={(e) => { e.stopPropagation(); handleApproveClick(u); }}
                              >
                                Approve
                              </button>
                            )}
                            <button className="tc-icon-btn" onClick={(e) => { e.stopPropagation(); handleEditPersonalClick(u); }} title="Edit Personal Info" style={{ display: 'inline-flex', width: 32, height: 32 }}>
                              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--color-brand-primary)" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                            </button>
                            <button className="tc-icon-btn" onClick={(e) => { e.stopPropagation(); handleEditClick(u); }} title="Edit Role/Dept" style={{ display: 'inline-flex', width: 32, height: 32 }}>
                              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--color-brand-primary)" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                            </button>
                            <button className="tc-icon-btn" onClick={(e) => { e.stopPropagation(); handlePassClick(u); }} title="Reset Password" style={{ display: 'inline-flex', width: 32, height: 32 }}>
                              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--color-warning)" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                            </button>
                            {u.approvalStatus !== 'DEACTIVATED' && u.role !== 'SUPER_ADMIN' && (
                              <button className="tc-icon-btn" onClick={(e) => { e.stopPropagation(); handleDeactivate(u._id); }} title="Deactivate User" style={{ display: 'inline-flex', width: 32, height: 32 }}>
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--color-danger)" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg>
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  {users.length === 0 && (
                    <tr><td colSpan={user?.role === 'SUPER_ADMIN' ? 7 : 6} style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-secondary)' }}>No users found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Edit Personal Info Modal */}
      {editPersonalOpen && (
        <div className="tc-modal-overlay">
          <div className="tc-modal" style={{ maxWidth: 400 }}>
            <div className="tc-modal-header">
              <h2 className="tc-heading-lg">Edit Personal Info</h2>
            </div>
            <form onSubmit={handleEditPersonalSubmit}>
              <div className="tc-form-group" style={{ marginBottom: 16 }}>
                <label className="tc-form-label">Name</label>
                <input type="text" className="tc-form-input" value={personalForm.name} onChange={e => setPersonalForm({ ...personalForm, name: e.target.value })} required autoFocus />
              </div>
              <div className="tc-form-group" style={{ marginBottom: 16 }}>
                <label className="tc-form-label">Email</label>
                <input type="email" className="tc-form-input" value={personalForm.email} onChange={e => setPersonalForm({ ...personalForm, email: e.target.value })} required />
              </div>
              <div className="tc-form-group" style={{ marginBottom: 16 }}>
                <label className="tc-form-label">Designation</label>
                <input type="text" className="tc-form-input" value={personalForm.designation} onChange={e => setPersonalForm({ ...personalForm, designation: e.target.value })} required />
              </div>
              <div className="tc-form-group" style={{ marginBottom: 16 }}>
                <label className="tc-form-label">Phone</label>
                <input type="text" className="tc-form-input" value={personalForm.phone} onChange={e => setPersonalForm({ ...personalForm, phone: e.target.value })} required />
              </div>
              <div className="tc-modal-footer">
                <button type="button" className="tc-btn tc-btn-secondary" onClick={() => setEditPersonalOpen(false)}>Cancel</button>
                <button type="submit" className="tc-btn tc-btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Role/Dept Modal */}
      {editOpen && (
        <div className="tc-modal-overlay">
          <div className="tc-modal" style={{ maxWidth: 400 }}>
            <div className="tc-modal-header">
              <h2 className="tc-heading-lg">Edit Employee Assignment</h2>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="tc-form-group" style={{ marginBottom: 16 }}>
                <label className="tc-form-label">Assign Role</label>
                <select className="tc-form-select" value={role} onChange={e => setRole(e.target.value)} required autoFocus>
                  <option value="CONTRIBUTOR">Contributor</option>
                  <option value="TEAM_LEAD">Team Lead</option>
                  <option value="MANAGEMENT">Management (Read Only)</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                </select>
              </div>

              {(role === 'CONTRIBUTOR' || role === 'TEAM_LEAD') && (
                <div className="tc-form-group">
                  <label className="tc-form-label">Assign Department</label>
                  <select className="tc-form-select" value={dept} onChange={e => setDept(e.target.value)}>
                    <option value="">None</option>
                    {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                  </select>
                </div>
              )}

              <div className="tc-modal-footer">
                <button type="button" className="tc-btn tc-btn-secondary" onClick={() => setEditOpen(false)}>Cancel</button>
                <button type="submit" className="tc-btn tc-btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {passOpen && (
        <div className="tc-modal-overlay">
          <div className="tc-modal" style={{ maxWidth: 400 }}>
            <div className="tc-modal-header">
              <h2 className="tc-heading-lg">Force Reset Password</h2>
            </div>
            <form onSubmit={handlePassSubmit}>
              <p className="tc-body" style={{ marginBottom: 20 }}>
                Set a new password for employee <strong>{targetUser?.name}</strong>.
              </p>
              <div className="tc-form-group" style={{ marginBottom: 16 }}>
                <label className="tc-form-label">New Password</label>
                <input type="password" required className="tc-form-input" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="Minimum 8 characters" autoFocus />
              </div>
              <div className="tc-modal-footer">
                <button type="button" className="tc-btn tc-btn-secondary" onClick={() => setPassOpen(false)}>Cancel</button>
                <button type="submit" className="tc-btn tc-btn-danger">Reset Password</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersList;
