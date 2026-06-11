import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import apiService from '../../services/api';

const ContributorDetails = () => {
  const { userId } = useParams();
  const navigate = useNavigate();

  const [contributor, setContributor] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [efficiency, setEfficiency] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch user details
      const userData = await apiService(`/users/${userId}`);
      setContributor(userData);

      // Fetch user efficiency
      const effData = await apiService(`/users/${userId}/efficiency`);
      setEfficiency(effData.efficiency);

      // Fetch user's tasks
      const tasksData = await apiService(`/tasks?contributor=${userId}`);
      if (userData.role === 'CONTRIBUTOR') {
        const filteredTasks = tasksData.filter(t => 
          !t.assignedContributors?.some(c => c.role === 'TEAM_LEAD')
        );
        setTasks(filteredTasks);
      } else {
        setTasks(tasksData);
      }
    } catch (err) {
      console.error('Error fetching contributor details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userId]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING': return 'tc-badge-gray';
      case 'IN_PROGRESS': return 'tc-badge-blue';
      case 'COMPLETE':
      case 'COMPLETED': return 'tc-badge-green';
      case 'BLOCKED': return 'tc-badge-red';
      case 'DELAYED': return 'tc-badge-red';
      default: return 'tc-badge-gray';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'CRITICAL': return 'tc-badge-red';
      case 'HIGH': return 'tc-badge-amber';
      case 'MEDIUM': return 'tc-badge-blue';
      case 'LOW': return 'tc-badge-gray';
      default: return 'tc-badge-gray';
    }
  };

  if (loading) return <div className="tc-loading-page"><div className="tc-spinner" /></div>;

  if (!contributor) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ color: 'var(--color-danger)', marginBottom: 16 }}>Contributor not found.</div>
        <button className="tc-btn tc-btn-secondary" onClick={() => navigate('/users')}>Back to Directory</button>
      </div>
    );
  }

  // Group tasks by project
  const tasksByProject = {};
  tasks.forEach(task => {
    const projName = task.project?.name || 'Unassigned Project';
    const projId = task.project?._id || 'unassigned';
    if (!tasksByProject[projId]) {
      tasksByProject[projId] = {
        name: projName,
        code: task.project?.projectCode || '',
        tasks: []
      };
    }
    tasksByProject[projId].tasks.push(task);
  });

  const efficiencyColor = efficiency >= 80 ? 'var(--color-success)' : efficiency >= 50 ? 'var(--color-warning)' : 'var(--color-danger)';

  return (
    <div className="tc-fade-in">
      {/* Header */}
      <div className="tc-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button className="tc-btn tc-btn-secondary" onClick={() => navigate(-1)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back
          </button>
          <div>
            <h1 className="tc-heading-xl">{contributor.name}</h1>
            <p className="tc-body">{contributor.designation} | {contributor.department?.name || 'No Department'}</p>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="tc-grid-cols-70-30" style={{ alignItems: 'stretch' }}>
        {/* Left Column: Projects & Tasks */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="tc-card">
            <div className="tc-card-header">
              <h2 className="tc-heading-md">Assigned Projects & Tasks</h2>
            </div>
            <div className="tc-card-body" style={{ padding: '0 24px 24px' }}>
              {Object.keys(tasksByProject).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-secondary)' }}>
                  No tasks assigned to this employee.
                </div>
              ) : (
                Object.keys(tasksByProject).map(projId => {
                  const proj = tasksByProject[projId];
                  return (
                    <div key={projId} style={{ marginBottom: 24 }}>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="tc-badge tc-badge-blue" style={{ fontSize: '0.75rem' }}>{proj.code || 'PROJ'}</span>
                        {proj.name}
                      </h3>
                      <div className="tc-table-wrap">
                        <table className="tc-table">
                          <thead>
                            <tr>
                              <th>Task ID</th>
                              <th>Title</th>
                              <th>Priority</th>
                              <th>Status</th>
                              <th className="right">Target End Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {proj.tasks.map(task => (
                              <tr key={task._id} onClick={() => navigate(`/tasks/${task._id}`)}>
                                <td className="bold">{task.taskId}</td>
                                <td>
                                  <div style={{ fontWeight: 600 }}>{task.title}</div>
                                  <div className="tc-caption">{task.phase?.name}</div>
                                </td>
                                <td>
                                  <span className={`tc-badge ${getPriorityColor(task.priority)}`}>
                                    {task.priority}
                                  </span>
                                </td>
                                <td>
                                  <span className={`tc-badge ${getStatusColor(task.status)}`}>
                                    {task.status}
                                  </span>
                                </td>
                                <td className="right">{new Date(task.targetEndDate).toLocaleDateString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Profile & Efficiency Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Efficiency Card */}
          <div className="tc-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '24px' }}>
            <div className="tc-card-body" style={{ width: '100%' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 12 }}>
                Employee Efficiency Score
              </div>
              <div style={{ position: 'relative', width: 100, height: 100, margin: '0 auto 12px' }}>
                <svg width="100" height="100" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                  <circle cx="50" cy="50" r="42" fill="none" stroke={efficiencyColor} strokeWidth="8"
                    strokeDasharray={2 * Math.PI * 42}
                    strokeDashoffset={2 * Math.PI * 42 - (efficiency / 100) * 2 * Math.PI * 42}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                  />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 800, color: efficiencyColor }}>
                  {efficiency}%
                </div>
              </div>
              <div className="tc-caption">Calculated dynamically based on task completion</div>
            </div>
          </div>

          {/* Profile Card */}
          <div className="tc-card">
            <div className="tc-card-header">
              <h2 className="tc-heading-md">Employee Info</h2>
            </div>
            <div className="tc-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <div className="tc-caption">Employee ID</div>
                <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{contributor.employeeId}</div>
              </div>
              <div className="tc-divider" style={{ margin: 0 }} />
              <div>
                <div className="tc-caption">Email Address</div>
                <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{contributor.email}</div>
              </div>
              <div className="tc-divider" style={{ margin: 0 }} />
              <div>
                <div className="tc-caption">Role</div>
                <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{contributor.role.replace('_', ' ')}</div>
              </div>
              <div className="tc-divider" style={{ margin: 0 }} />
              <div>
                <div className="tc-caption">Department</div>
                <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{contributor.department?.name || 'N/A'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContributorDetails;
