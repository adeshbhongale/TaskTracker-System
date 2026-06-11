import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import apiService from '../../services/api';

const TasksList = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedProj, setSelectedProj] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');

  // Report dropdown
  const [reportDropdownOpen, setReportDropdownOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const qParams = [];
      if (selectedProj) qParams.push(`project=${selectedProj}`);
      if (selectedStatus) qParams.push(`status=${selectedStatus}`);
      if (selectedPriority) qParams.push(`priority=${selectedPriority}`);
      const qString = qParams.length > 0 ? `?${qParams.join('&')}` : '';

      const list = await apiService(`/tasks${qString}`);
      setTasks(list);

      const projs = await apiService('/projects');
      setProjects(projs);
    } catch (err) { console.error('Error fetching tasks', err); }
    finally { setLoading(false); }
  };

  const getDateRange = (period) => {
    const now = new Date();
    let startDate, endDate;

    switch (period) {
      case 'daily':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        break;
      case 'weekly':
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday as first day
        startDate = new Date(now.setDate(diff));
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        break;
      default:
        return { startDate: null, endDate: null };
    }
    return { startDate, endDate };
  };

  const handlePrintReport = async (period) => {
    setReportDropdownOpen(false);
    const { startDate, endDate } = getDateRange(period);

    // Fetch task details with day statuses
    const tasksWithDetails = [];
    for (const task of tasks) {
      try {
        const taskDetails = await apiService(`/tasks/${task._id}`);
        tasksWithDetails.push(taskDetails);
      } catch (err) {
        tasksWithDetails.push(task);
      }
    }

    // Filter tasks and day statuses by date range
    const filteredTasks = tasksWithDetails.map(task => {
      const filteredDayStatuses = (task.dayStatuses || []).filter(ds => {
        const dsDate = new Date(ds.date);
        if (!startDate || !endDate) return true;
        return dsDate >= startDate && dsDate <= endDate;
      });
      return { ...task, dayStatuses: filteredDayStatuses };
    }).filter(task => {
      // Include task if it has day statuses in range, or if no range selected
      if (!startDate || !endDate) return true;
      return task.dayStatuses.length > 0;
    });

    const periodLabel = {
      daily: 'Daily Report - ' + startDate.toLocaleDateString(),
      weekly: 'Weekly Report - ' + startDate.toLocaleDateString() + ' to ' + endDate.toLocaleDateString(),
      monthly: 'Monthly Report - ' + startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    }[period];

    // Generate PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const marginLeft = 14;
    const marginRight = 14;
    const marginTop = 20;
    let currentY = marginTop;

    // Helper function to add text with wrapping
    const addWrappedText = (text, x, y, maxWidth, fontSize = 12, font = 'helvetica', style = 'normal') => {
      doc.setFont(font, style);
      doc.setFontSize(fontSize);
      const lines = doc.splitTextToSize(text, maxWidth);
      doc.text(lines, x, y);
      return y + (lines.length * (fontSize * 0.6));
    };

    // Title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(periodLabel, pageWidth / 2, currentY, { align: 'center' });
    currentY += 12;

    // Tasks Overview Section
    doc.setFontSize(16);
    doc.text('Tasks Overview', marginLeft, currentY);
    currentY += 10;

    // Table Header
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Task ID', marginLeft, currentY);
    doc.text('Title', marginLeft + 30, currentY);
    doc.text('Project', marginLeft + 90, currentY);
    doc.text('Priority', marginLeft + 130, currentY);
    doc.text('Status', marginLeft + 155, currentY);
    doc.text('Start Date', marginLeft + 180, currentY);
    doc.text('Target End', marginLeft + 210, currentY);
    doc.text('Actual', marginLeft + 240, currentY);
    currentY += 6;

    // Table Content
    doc.setFont('helvetica', 'normal');
    filteredTasks.forEach(task => {
      if (currentY > pageHeight - 30) {
        doc.addPage();
        currentY = marginTop;
      }
      doc.text(task.taskId, marginLeft, currentY);
      const title = task.title.length > 25 ? task.title.substring(0, 22) + '...' : task.title;
      doc.text(title, marginLeft + 30, currentY);
      const projName = task.project?.name?.length > 20 ? task.project.name.substring(0, 17) + '...' : task.project?.name || 'N/A';
      doc.text(projName, marginLeft + 90, currentY);
      doc.text(task.priority, marginLeft + 130, currentY);
      doc.text(task.status, marginLeft + 155, currentY);
      doc.text(task.targetStartDate ? new Date(task.targetStartDate).toLocaleDateString() : 'N/A', marginLeft + 180, currentY);
      doc.text(task.targetEndDate ? new Date(task.targetEndDate).toLocaleDateString() : 'N/A', marginLeft + 210, currentY);
      doc.text(task.actualCompletionDate ? new Date(task.actualCompletionDate).toLocaleDateString() : 'N/A', marginLeft + 240, currentY);
      currentY += 6;
    });

    // Daily Status Updates Section
    currentY += 10;
    if (currentY > pageHeight - 30) {
      doc.addPage();
      currentY = marginTop;
    }
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Daily Status Updates', marginLeft, currentY);
    currentY += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    filteredTasks.filter(task => task.dayStatuses && task.dayStatuses.length > 0).forEach(task => {
      // Task header
      if (currentY > pageHeight - 40) {
        doc.addPage();
        currentY = marginTop;
      }
      doc.setFont('helvetica', 'bold');
      doc.text(task.taskId + ' - ' + task.title, marginLeft, currentY);
      doc.setFont('helvetica', 'normal');
      currentY += 6;

      // Day statuses
      [...task.dayStatuses].sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(ds => {
        if (currentY > pageHeight - 40) {
          doc.addPage();
          currentY = marginTop;
        }
        doc.setFillColor(240, 248, 255);
        doc.rect(marginLeft - 1, currentY - 4, pageWidth - marginLeft - marginRight + 2, 16, 'F');
        const dateStr = new Date(ds.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        doc.setFont('helvetica', 'bold');
        doc.text(dateStr + ' - ' + (ds.addedBy?.name || 'Unknown'), marginLeft, currentY);
        doc.setFont('helvetica', 'normal');
        currentY += 5;
        const statusLines = doc.splitTextToSize(ds.status, pageWidth - marginLeft - marginRight);
        doc.text(statusLines, marginLeft, currentY);
        currentY += (statusLines.length * 4) + 4;
      });
    });

    const noStatuses = filteredTasks.filter(task => task.dayStatuses && task.dayStatuses.length > 0).length === 0;
    if (noStatuses) {
      doc.text('No daily status updates found for this period.', marginLeft, currentY);
    }

    // Save the PDF
    doc.save(`${periodLabel.replace(/\s+/g, '_')}.pdf`);
  };

  useEffect(() => { loadData(); }, [selectedProj, selectedStatus, selectedPriority]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (reportDropdownOpen && !event.target.closest('.tc-btn')) {
        setReportDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [reportDropdownOpen]);

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

  const ownTasks = user?.role === 'TEAM_LEAD'
    ? tasks.filter(t => t.assignedContributors?.some(c => (c._id || c) === (user.id || user._id)))
    : [];
  const contributorTasks = user?.role === 'TEAM_LEAD'
    ? tasks.filter(t => !t.assignedContributors?.some(c => (c._id || c) === (user.id || user._id)))
    : [];

  return (
    <div className="tc-fade-in">
      <div className="tc-page-header">
        <div>
          <h1 className="tc-heading-xl">Sprint Tasks</h1>
          <p className="tc-body" style={{ marginTop: 4 }}>Review detailed modules descriptions, track daily progress logs, and resolve blockers.</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <button
              className="tc-btn tc-btn-secondary"
              onClick={() => setReportDropdownOpen(!reportDropdownOpen)}
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              Report
            </button>
            {reportDropdownOpen && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                background: 'var(--color-bg-paper)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-md)',
                minWidth: '180px',
                zIndex: 100,
                marginTop: '4px'
              }}>
                <button
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    width: '100%',
                    padding: '10px 16px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px'
                  }}
                  onClick={() => handlePrintReport('daily')}
                >
                  Daily Report
                </button>
                <button
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    width: '100%',
                    padding: '10px 16px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px'
                  }}
                  onClick={() => handlePrintReport('weekly')}
                >
                  Weekly Report
                </button>
                <button
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    width: '100%',
                    padding: '10px 16px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px'
                  }}
                  onClick={() => handlePrintReport('monthly')}
                >
                  Monthly Report
                </button>
              </div>
            )}
          </div>
          <button className="tc-btn tc-btn-secondary" onClick={loadData}>
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6M1 20v-6h6" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
            Refresh
          </button>
          {user?.role === 'TEAM_LEAD' && (
            <button className="tc-btn tc-btn-primary" onClick={() => navigate('/tasks/new')}>
              + Create Task
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="tc-card" style={{ marginBottom: 24 }}>
        <div className="tc-card-body">
          <div className="tc-grid-3">
            <div className="tc-form-group">
              <label className="tc-form-label">Filter by Project</label>
              <select className="tc-form-select" value={selectedProj} onChange={e => setSelectedProj(e.target.value)}>
                <option value="">All Projects</option>
                {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
            </div>
            <div className="tc-form-group">
              <label className="tc-form-label">Status</label>
              <select className="tc-form-select" value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="BLOCKED">Blocked</option>
                <option value="COMPLETE">Complete</option>
                <option value="DELAYED">Delayed</option>
              </select>
            </div>
            <div className="tc-form-group">
              <label className="tc-form-label">Priority</label>
              <select className="tc-form-select" value={selectedPriority} onChange={e => setSelectedPriority(e.target.value)}>
                <option value="">All Priorities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Tasks Tables */}
      {loading ? (
        <div className="tc-loading-page" style={{ minHeight: '40vh' }}><div className="tc-spinner" /></div>
      ) : user?.role === 'TEAM_LEAD' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Section 1: My Assigned Tasks */}
          <div>
            <h2 className="tc-heading-lg" style={{ marginBottom: 12 }}>My Assigned Tasks ({ownTasks.length})</h2>
            <div className="tc-card">
              <div className="tc-card-body" style={{ padding: '0 0 4px' }}>
                <div className="tc-table-wrap" style={{ border: 'none', borderRadius: 0 }}>
                  <table className="tc-table">
                    <thead>
                      <tr>
                        <th>Task ID</th>
                        <th>Title</th>
                        <th>Project</th>
                        <th>Priority</th>
                        <th>Status</th>
                        <th>Progress</th>
                        <th>Start Date</th>
                        <th>Target Date</th>
                        <th className="right">Actual Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ownTasks.map((task) => (
                        <tr key={task._id} onClick={() => navigate(`/tasks/${task._id}`)}>
                          <td className="bold">{task.taskId}</td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{task.title}</div>
                            <div className="tc-caption">{task.phase?.name}</div>
                          </td>
                          <td>{task.project?.name}</td>
                          <td><span className={`tc-badge ${getPriorityColor(task.priority)}`}>{task.priority}</span></td>
                          <td><span className={`tc-badge ${getStatusColor(task.status)}`}>{task.status}</span></td>
                          <td>{task.completionPercentage}%</td>
                          <td>{task.targetStartDate ? new Date(task.targetStartDate).toLocaleDateString() : '—'}</td>
                          <td>{task.targetEndDate ? new Date(task.targetEndDate).toLocaleDateString() : '—'}</td>
                          <td className="right">{task.actualCompletionDate ? new Date(task.actualCompletionDate).toLocaleDateString() : '—'}</td>
                        </tr>
                      ))}
                      {ownTasks.length === 0 && (
                        <tr>
                          <td colSpan={9} style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-secondary)' }}>No tasks assigned to you.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Contributors' Tasks */}
          <div>
            <h2 className="tc-heading-lg" style={{ marginBottom: 12 }}>Contributors' Tasks ({contributorTasks.length})</h2>
            <div className="tc-card">
              <div className="tc-card-body" style={{ padding: '0 0 4px' }}>
                <div className="tc-table-wrap" style={{ border: 'none', borderRadius: 0 }}>
                  <table className="tc-table">
                    <thead>
                      <tr>
                        <th>Task ID</th>
                        <th>Title</th>
                        <th>Project</th>
                        <th>Priority</th>
                        <th>Status</th>
                        <th>Progress</th>
                        <th>Start Date</th>
                        <th>Target Date</th>
                        <th className="right">Actual Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contributorTasks.map((task) => (
                        <tr key={task._id} onClick={() => navigate(`/tasks/${task._id}`)}>
                          <td className="bold">{task.taskId}</td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{task.title}</div>
                            <div className="tc-caption">{task.phase?.name}</div>
                          </td>
                          <td>{task.project?.name}</td>
                          <td><span className={`tc-badge ${getPriorityColor(task.priority)}`}>{task.priority}</span></td>
                          <td><span className={`tc-badge ${getStatusColor(task.status)}`}>{task.status}</span></td>
                          <td>{task.completionPercentage}%</td>
                          <td>{task.targetStartDate ? new Date(task.targetStartDate).toLocaleDateString() : '—'}</td>
                          <td>{task.targetEndDate ? new Date(task.targetEndDate).toLocaleDateString() : '—'}</td>
                          <td className="right">{task.actualCompletionDate ? new Date(task.actualCompletionDate).toLocaleDateString() : '—'}</td>
                        </tr>
                      ))}
                      {contributorTasks.length === 0 && (
                        <tr>
                          <td colSpan={9} style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-secondary)' }}>No contributor tasks found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Regular single table for other roles */
        <div className="tc-card">
          <div className="tc-card-body" style={{ padding: '0 0 4px' }}>
            <div className="tc-table-wrap" style={{ border: 'none', borderRadius: 0 }}>
              <table className="tc-table">
                <thead>
                  <tr>
                    <th>Task ID</th>
                    <th>Title</th>
                    <th>Project</th>
                    <th>Priority</th>
                    <th>Status</th>
                    {user?.role !== 'CONTRIBUTOR' && <th>Progress</th>}
                    <th>Start Date</th>
                    <th>Target Date</th>
                    <th className="right">Actual Date</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task) => (
                    <tr key={task._id} onClick={() => navigate(`/tasks/${task._id}`)}>
                      <td className="bold">{task.taskId}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{task.title}</div>
                        <div className="tc-caption">{task.phase?.name}</div>
                      </td>
                      <td>{task.project?.name}</td>
                      <td><span className={`tc-badge ${getPriorityColor(task.priority)}`}>{task.priority}</span></td>
                      <td><span className={`tc-badge ${getStatusColor(task.status)}`}>{task.status}</span></td>
                      {user?.role !== 'CONTRIBUTOR' && <td>{task.completionPercentage}%</td>}
                      <td>{task.targetStartDate ? new Date(task.targetStartDate).toLocaleDateString() : '—'}</td>
                      <td>{task.targetEndDate ? new Date(task.targetEndDate).toLocaleDateString() : '—'}</td>
                      <td className="right">{task.actualCompletionDate ? new Date(task.actualCompletionDate).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                  {tasks.length === 0 && (
                    <tr>
                      <td colSpan={user?.role === 'CONTRIBUTOR' ? 8 : 9} style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-secondary)' }}>No tasks found matching filter selections.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TasksList;
