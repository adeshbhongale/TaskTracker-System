const User = require('../models/User');
const Department = require('../models/Department');
const Project = require('../models/Project');
const Task = require('../models/Task');
const Phase = require('../models/Phase');
const {
  calculateContributorEfficiency,
  calculateProjectEfficiency,
  calculateTeamLeadEfficiency
} = require('../services/efficiency');

const getProjectPerformanceReport = async (req, res) => {
  try {
    const { departmentId, status, priority } = req.query;
    const filter = {};
    if (departmentId) filter.department = departmentId;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    const projects = await Project.find(filter)
      .populate('department')
      .populate('createdBy', 'name email');

    const reportData = [];
    for (const proj of projects) {
      const efficiency = await calculateProjectEfficiency(proj._id);
      
      const totalTasks = await Task.countDocuments({ project: proj._id });
      const completedTasks = await Task.countDocuments({ project: proj._id, status: { $in: ['COMPLETE', 'COMPLETED', 'CLOSED'] } });
      const blockedTasks = await Task.countDocuments({ project: proj._id, status: 'BLOCKED' });

      reportData.push({
        projectId: proj._id,
        projectCode: proj.projectCode,
        name: proj.name,
        department: proj.department ? proj.department.name : 'N/A',
        priority: proj.priority,
        status: proj.status,
        startDate: proj.startDate,
        targetEndDate: proj.targetEndDate,
        createdBy: proj.createdBy ? proj.createdBy.name : 'System',
        totalTasks,
        completedTasks,
        blockedTasks,
        efficiency
      });
    }

    return res.json(reportData);
  } catch (err) {
    return res.status(500).json({ message: 'Server error generating project performance report', error: err.message });
  }
};

const getContributorEfficiencyReport = async (req, res) => {
  try {
    const { departmentId } = req.query;
    const filter = { role: 'CONTRIBUTOR', approvalStatus: 'APPROVED' };
    if (departmentId) filter.department = departmentId;

    const users = await User.find(filter).populate('department');
    const reportData = [];

    for (const user of users) {
      const efficiency = await calculateContributorEfficiency(user._id);
      const totalTasks = await Task.countDocuments({ assignedContributors: user._id });
      const completedTasks = await Task.countDocuments({
        assignedContributors: user._id,
        status: { $in: ['COMPLETE', 'COMPLETED', 'CLOSED'] }
      });
      const blockedTasks = await Task.countDocuments({ assignedContributors: user._id, status: 'BLOCKED' });
      
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const delayedTasks = await Task.countDocuments({
        assignedContributors: user._id,
        status: { $nin: ['COMPLETE', 'COMPLETED', 'CLOSED'] },
        targetEndDate: { $lt: todayStart }
      });

      reportData.push({
        employeeId: user.employeeId,
        name: user.name,
        email: user.email,
        department: user.department ? user.department.name : 'N/A',
        designation: user.designation,
        totalTasks,
        completedTasks,
        blockedTasks,
        delayedTasks,
        efficiency
      });
    }

    return res.json(reportData);
  } catch (err) {
    return res.status(500).json({ message: 'Server error generating contributor efficiency report', error: err.message });
  }
};

const getTeamLeadEfficiencyReport = async (req, res) => {
  try {
    const { departmentId } = req.query;
    const filter = { role: 'TEAM_LEAD', approvalStatus: 'APPROVED' };
    if (departmentId) filter.department = departmentId;

    const users = await User.find(filter).populate('department');
    const reportData = [];

    for (const user of users) {
      const efficiency = await calculateTeamLeadEfficiency(user._id);
      const projectCount = await Project.countDocuments({ createdBy: user._id });
      
      const projects = await Project.find({ createdBy: user._id });
      const projectIds = projects.map(p => p._id);
      const totalTasks = await Task.countDocuments({ project: { $in: projectIds } });
      const completedTasks = await Task.countDocuments({
        project: { $in: projectIds },
        status: { $in: ['COMPLETE', 'COMPLETED', 'CLOSED'] }
      });
      const blockedTasks = await Task.countDocuments({
        project: { $in: projectIds },
        status: 'BLOCKED'
      });

      reportData.push({
        employeeId: user.employeeId,
        name: user.name,
        email: user.email,
        department: user.department ? user.department.name : 'N/A',
        projectCount,
        totalTasks,
        completedTasks,
        blockedTasks,
        efficiency
      });
    }

    return res.json(reportData);
  } catch (err) {
    return res.status(500).json({ message: 'Server error generating team lead efficiency report', error: err.message });
  }
};

const getBlockerReport = async (req, res) => {
  try {
    const { projectId, departmentId } = req.query;
    
    // Find all tasks with status 'BLOCKED'
    const query = { status: 'BLOCKED' };
    if (projectId) query.project = projectId;

    let tasks = await Task.find(query)
      .populate('project')
      .populate('phase')
      .populate('assignedContributors', 'name email department')
      .populate('createdBy', 'name');

    if (departmentId) {
      tasks = tasks.filter(t => t.project.department && t.project.department.toString() === departmentId);
    }

    const reportData = tasks.map(t => ({
      projectId: t.project._id,
      taskId: t.taskId,
      title: t.title,
      project: t.project.name,
      phase: t.phase.name,
      priority: t.priority,
      blockerReason: t.blockerDetails ? t.blockerDetails.reason : 'N/A',
      dependencyType: t.blockerDetails ? t.blockerDetails.dependencyType : 'N/A',
      expectedResolutionDate: t.blockerDetails ? t.blockerDetails.expectedResolutionDate : null,
      blockedDate: t.blockerDetails ? t.blockerDetails.markedAt : null,
      assignedContributors: t.assignedContributors.map(c => c.name).join(', '),
      createdBy: t.createdBy ? t.createdBy.name : 'System'
    }));

    return res.json(reportData);
  } catch (err) {
    return res.status(500).json({ message: 'Server error generating blocker report', error: err.message });
  }
};

const getDelayReport = async (req, res) => {
  try {
    const { projectId, departmentId } = req.query;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const query = {
      status: { $nin: ['COMPLETE', 'COMPLETED', 'CLOSED'] },
      targetEndDate: { $lt: todayStart }
    };
    if (projectId) query.project = projectId;

    let tasks = await Task.find(query)
      .populate('project')
      .populate('phase')
      .populate('assignedContributors', 'name email department')
      .populate('createdBy', 'name');

    if (departmentId) {
      tasks = tasks.filter(t => t.project.department && t.project.department.toString() === departmentId);
    }

    const today = new Date();
    const reportData = tasks.map(t => {
      const daysOverdue = Math.ceil((today - new Date(t.targetEndDate)) / (1000 * 60 * 60 * 24));
      return {
        projectId: t.project._id,
        taskId: t.taskId,
        title: t.title,
        project: t.project.name,
        phase: t.phase.name,
        priority: t.priority,
        targetEndDate: t.targetEndDate,
        daysOverdue,
        assignedContributors: t.assignedContributors.map(c => c.name).join(', '),
        createdBy: t.createdBy ? t.createdBy.name : 'System'
      };
    });

    return res.json(reportData);
  } catch (err) {
    return res.status(500).json({ message: 'Server error generating delay report', error: err.message });
  }
};

const getTaskCompletionReport = async (req, res) => {
  try {
    const { projectId } = req.query;
    const query = { status: { $in: ['COMPLETE', 'COMPLETED', 'CLOSED'] } };
    if (projectId) query.project = projectId;

    const tasks = await Task.find(query)
      .populate('project')
      .populate('phase')
      .populate('assignedContributors', 'name')
      .populate('createdBy', 'name');

    const reportData = tasks.map(t => {
      const onTime = new Date(t.actualCompletionDate) <= new Date(t.targetEndDate);
      return {
        projectId: t.project._id,
        taskId: t.taskId,
        title: t.title,
        project: t.project.name,
        phase: t.phase.name,
        priority: t.priority,
        targetEndDate: t.targetEndDate,
        actualCompletionDate: t.actualCompletionDate,
        onTime: onTime ? 'Yes' : 'No',
        loggedHours: t.loggedHours,
        assignedContributors: t.assignedContributors.map(c => c.name).join(', ')
      };
    });

    return res.json(reportData);
  } catch (err) {
    return res.status(500).json({ message: 'Server error generating task completion report', error: err.message });
  }
};

const getTaskAgingReport = async (req, res) => {
  try {
    const { projectId } = req.query;
    const query = { status: { $nin: ['COMPLETE', 'COMPLETED', 'CLOSED'] } };
    if (projectId) query.project = projectId;

    const tasks = await Task.find(query)
      .populate('project')
      .populate('phase')
      .populate('assignedContributors', 'name')
      .populate('createdBy', 'name');

    const today = new Date();
    const reportData = tasks.map(t => {
      const daysOpen = Math.ceil((today - new Date(t.createdAt)) / (1000 * 60 * 60 * 24));
      return {
        projectId: t.project._id,
        taskId: t.taskId,
        title: t.title,
        project: t.project.name,
        phase: t.phase.name,
        status: t.status,
        createdAt: t.createdAt,
        daysOpen,
        assignedContributors: t.assignedContributors.map(c => c.name).join(', ')
      };
    });

    return res.json(reportData);
  } catch (err) {
    return res.status(500).json({ message: 'Server error generating task aging report', error: err.message });
  }
};

module.exports = {
  getProjectPerformanceReport,
  getContributorEfficiencyReport,
  getTeamLeadEfficiencyReport,
  getBlockerReport,
  getDelayReport,
  getTaskCompletionReport,
  getTaskAgingReport
};
