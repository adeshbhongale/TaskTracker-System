import { jsPDF } from 'jspdf';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import apiService from '../../services/api';

const ReportsPage = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [reportType, setReportType] = useState('projects');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);

  // Filters
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState('');

  const loadFilters = async () => {
    try {
      const depts = await apiService('/departments');
      setDepartments(depts);
    } catch (err) { }
  };

  const loadReportData = async () => {
    setLoading(true);
    try {
      const qString = selectedDept ? `?departmentId=${selectedDept}` : '';
      let endpoint = '/reports/projects';

      if (reportType === 'contributors') endpoint = '/reports/contributors';
      else if (reportType === 'leads') endpoint = '/reports/team-leads';
      else if (reportType === 'blockers') endpoint = '/reports/blockers';
      else if (reportType === 'delays') endpoint = '/reports/delays';
      else if (reportType === 'completions') endpoint = '/reports/completions';
      else if (reportType === 'aging') endpoint = '/reports/aging';

      const res = await apiService(`${endpoint}${qString}`);
      setData(res);
    } catch (err) { console.error('Error generating report:', err); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadFilters(); }, []);
  useEffect(() => { loadReportData(); }, [reportType, selectedDept]);

  // Exporters
  const exportToCSV = () => {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row =>
      Object.values(row).map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')
    );
    const csvContent = `data:text/csv;charset=utf-8,${headers}\n${rows.join('\n')}`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${reportType}_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToExcel = () => {
    if (data.length === 0) return;
    const cleanedData = data.map(({ projectId, ...rest }) => rest);
    const ws = XLSX.utils.json_to_sheet(cleanedData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report Data');
    XLSX.writeFile(wb, `${reportType}_report_${Date.now()}.xlsx`);
  };

  const exportToPDF = () => {
    if (data.length === 0) return;
    const doc = new jsPDF('l', 'mm', 'a4'); // Use landscape for table
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(`Trucode Operational Performance Report - ${reportType.toUpperCase()}`, 14, 15);
    doc.setFontSize(9);
    doc.setFont('Helvetica', 'normal');
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 21);

    const cols = getTableColumns();
    const startX = 14;
    let yPos = 30;

    // Calculate column widths
    const colWidth = 269 / cols.length;

    // Draw table headers
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    cols.forEach((col, i) => {
      const x = startX + (i * colWidth);
      doc.text(col.label.substring(0, 25), x, yPos);
    });

    // Draw line under headers
    doc.line(startX, yPos + 2, startX + 269, yPos + 2);
    yPos += 7;

    // Draw rows
    doc.setFont('Helvetica', 'normal');
    data.forEach((row) => {
      if (yPos > 190) {
        doc.addPage();
        yPos = 20;
        // Re-draw headers
        doc.setFont('Helvetica', 'bold');
        cols.forEach((col, i) => {
          const x = startX + (i * colWidth);
          doc.text(col.label.substring(0, 25), x, yPos);
        });
        doc.line(startX, yPos + 2, startX + 269, yPos + 2);
        yPos += 7;
        doc.setFont('Helvetica', 'normal');
      }

      cols.forEach((col, i) => {
        const x = startX + (i * colWidth);
        let val = row[col.id];
        if (typeof val === 'boolean') val = val ? 'Yes' : 'No';
        else if (val instanceof Date || (typeof val === 'string' && val.includes('T') && !isNaN(Date.parse(val)))) {
          val = new Date(val).toLocaleDateString();
        }
        const strVal = String(val !== null && val !== undefined ? val : 'N/A');

        // Truncate to fit column
        const maxChars = Math.floor(colWidth / 2.2);
        doc.text(strVal.substring(0, maxChars), x, yPos);
      });
      yPos += 6;
    });

    doc.save(`${reportType}_report_${Date.now()}.pdf`);
  };

  const getTableColumns = () => {
    if (data.length === 0) return [];
    return Object.keys(data[0])
      .filter(key => key !== 'projectId' && key !== 'id' && key !== '_id')
      .map(key => ({
        id: key,
        label: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
      }));
  };

  const columns = getTableColumns();

  return (
    <div className="tc-fade-in">
      <div className="tc-page-header">
        <div>
          <h1 className="tc-heading-xl">Reports & Audits</h1>
          <p className="tc-body" style={{ marginTop: 4 }}>Audit organizational tasks completions, contributor KPIs, blockers logs, and SLAs.</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="tc-btn tc-btn-secondary" onClick={loadReportData}>
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6M1 20v-6h6" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
            Reload
          </button>
          {(user?.role === 'SUPER_ADMIN' || user?.role === 'MANAGEMENT') && (
            <>
              <button className="tc-btn tc-btn-success" onClick={exportToExcel}>Export Excel</button>
              <button className="tc-btn tc-btn-danger" onClick={exportToPDF}>Export PDF</button>
            </>
          )}
        </div>
      </div>

      {/* Configuration Cards */}
      <div className="tc-card" style={{ marginBottom: 24 }}>
        <div className="tc-card-body">
          <div className="tc-grid-2">
            <div className="tc-form-group">
              <label className="tc-form-label">Select Report Pipeline</label>
              <select className="tc-form-select" value={reportType} onChange={e => setReportType(e.target.value)}>
                <option value="projects">Project Performance Report</option>
                <option value="contributors">Contributor Efficiency Report</option>
                <option value="leads">Team Lead Efficiency Report</option>
                <option value="blockers">Active Critical Blockers</option>
                <option value="delays">Delayed Tasks Analysis</option>
                <option value="completions">Task Completion Report</option>
                <option value="aging">Task Aging Report</option>
              </select>
            </div>
            <div className="tc-form-group">
              <label className="tc-form-label">Department Filter</label>
              <select className="tc-form-select" value={selectedDept} onChange={e => setSelectedDept(e.target.value)}>
                <option value="">All Departments</option>
                {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Output Table */}
      <div className="tc-card">
        <div className="tc-card-body" style={{ padding: '0 0 4px', overflowX: 'auto' }}>
          {loading ? (
            <div className="tc-loading-page" style={{ minHeight: '40vh' }}><div className="tc-spinner" /></div>
          ) : (
            <div className="tc-table-wrap" style={{ border: 'none', borderRadius: 0 }}>
              <table className="tc-table">
                <thead>
                  <tr>
                    {columns.map(col => (
                      <th key={col.id}>{col.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, index) => (
                    <tr key={index}>
                      {columns.map(col => {
                        let val = row[col.id];
                        if (typeof val === 'boolean') val = val ? 'Yes' : 'No';
                        else if (val instanceof Date || (typeof val === 'string' && val.includes('T') && !isNaN(Date.parse(val)))) {
                          val = new Date(val).toLocaleDateString();
                        }

                        const isProjectLink = row.projectId && (col.id === 'name' || col.id === 'project' || col.id === 'projectCode');

                        return (
                          <td
                            key={col.id}
                            onClick={() => {
                              if (isProjectLink) {
                                navigate(`/projects/${row.projectId}`);
                              }
                            }}
                            style={{
                              cursor: isProjectLink ? 'pointer' : 'default',
                              color: isProjectLink ? 'var(--color-brand-primary)' : 'inherit',
                              textDecoration: isProjectLink ? 'underline' : 'none',
                              fontWeight: isProjectLink ? '600' : 'normal'
                            }}
                          >
                            {String(val !== null && val !== undefined ? val : 'N/A')}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {data.length === 0 && (
                    <tr>
                      <td colSpan={columns.length || 1} style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-secondary)' }}>
                        No report records generated for current criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
